import csv, io, json, threading
import contextvars
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit
import ipaddress
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, field_validator
from . import config, db, collectors, ai, backup
from .scoring import CATEGORIES, score_item, economics

STAGES=['待评估','待验证','验证中','开发中','销售中','已成交','已归档']
EXPERIMENT_STAGES=['计划中','进行中','已完成','已取消']

class ManualInput(BaseModel):
    title:str=Field(min_length=3,max_length=350)
    source_url:str=Field(min_length=8,max_length=1200)
    summary:str=Field(default='',max_length=3000)
    source:str='manual'
    @field_validator('source_url')
    @classmethod
    def http_only(cls,v):
        if not v.startswith(('http://','https://')):raise ValueError('仅允许 http(s) 链接')
        return v

class PatchOpportunity(BaseModel):
    stage:Literal['待评估','待验证','验证中','开发中','销售中','已成交','已归档']|None=None
    target_customer:str|None=Field(default=None,max_length=1200)
    offer:str|None=Field(default=None,max_length=2000)
    notes:str|None=Field(default=None,max_length=8000)
    next_test:str|None=Field(default=None,max_length=1500)
    estimated_price:float|None=Field(default=None,ge=0,le=100000000)
    estimated_cost:float|None=Field(default=None,ge=0,le=100000000)
    estimated_hours:float|None=Field(default=None,ge=0,le=1000000)
    realized_revenue:float|None=Field(default=None,ge=0,le=100000000)

class ExperimentInput(BaseModel):
    opportunity_id:int
    hypothesis:str=Field(min_length=3,max_length=1500)
    action:str=Field(min_length=3,max_length=1500)
    due_date:str=Field(default='',max_length=30)

class PatchExperiment(BaseModel):
    status:Literal['计划中','进行中','已完成','已取消']|None=None
    contacts:int|None=Field(default=None,ge=0,le=10000000)
    replies:int|None=Field(default=None,ge=0,le=10000000)
    orders:int|None=Field(default=None,ge=0,le=10000000)
    revenue:float|None=Field(default=None,ge=0,le=100000000)
    cost:float|None=Field(default=None,ge=0,le=100000000)
    notes:str|None=Field(default=None,max_length=5000)
    due_date:str|None=Field(default=None,max_length=30)

class WatchInput(BaseModel):
    term:str=Field(min_length=2,max_length=120)

class PatchWatch(BaseModel):
    enabled:bool

class SourcePatch(BaseModel):
    enabled:bool|None=None
    interval_minutes:int|None=Field(default=None,ge=60,le=10080)
    feed_url:str|None=Field(default=None,max_length=1000)

    @field_validator('feed_url')
    @classmethod
    def valid_feed_url(cls,v):
        if v is not None and v.strip() and not collectors.valid_external_url(v.strip()):
            raise ValueError('授权数据源必须为公网 HTTPS URL')
        return v

class PlatformImport(BaseModel):
    source:Literal['xianyu','xiaohongshu','1688']
    format:Literal['csv','json']='csv'
    data:str=Field(min_length=1,max_length=500_000)

class ScanParams(BaseModel):
    mode:Literal['due','force']='due'
    source:str|None=None

class FeedInput(BaseModel):
    name:str=Field(min_length=2,max_length=80)
    url:str=Field(min_length=8,max_length=1000)
    @field_validator('url')
    @classmethod
    def https_only(cls,v):
        if not v.startswith('https://'):raise ValueError('RSS 地址必须以 https:// 开头')
        hostname=urlsplit(v).hostname
        if not hostname or hostname.lower()=='localhost' or hostname.lower().endswith(('.local','.localhost')):
            raise ValueError('不得订阅本机或内网 RSS 地址')
        try:
            if not ipaddress.ip_address(hostname).is_global:
                raise ValueError('不得订阅内网 IP 的 RSS 地址')
        except ValueError as e:
            if '不得订阅内网 IP' in str(e):raise
        return v


shutdown_event=threading.Event()
scheduler_thread=None

def scheduled_loop():
    """Scheduling checks once per minute, but no network access unless a source is due."""
    while not shutdown_event.wait(60):
        if not config.AUTO_SCAN:continue
        try:
            if not any(r['due'] for r in collectors.source_configs()):continue
            collectors.scan_once(force=False)
        except Exception:
            # Avoid killing the scheduler on transient filesystem/database errors.
            continue

@asynccontextmanager
async def lifespan(app):
    global scheduler_thread
    db.init_db()
    shutdown_event.clear()
    if config.AUTO_SCAN:
        scheduler_thread=threading.Thread(target=scheduled_loop,daemon=True,name='opportunity-scheduler')
        scheduler_thread.start()
    yield
    shutdown_event.set()
    if scheduler_thread and scheduler_thread.is_alive():scheduler_thread.join(timeout=2)

app=FastAPI(title='Opportunity OS',version='1.1.0')
STATIC=Path(__file__).parent/'static'

@app.get('/')
def home():return FileResponse(STATIC/'index.html')

@app.get('/static/{filename}')
def static(filename:str):
    if filename not in ('app.js','style.css','favicon.svg'):raise HTTPException(404)
    return FileResponse(STATIC/filename)

@app.get('/api/health')
def health():
    with db.connect() as c:
        total=c.execute('SELECT COUNT(*) FROM opportunities').fetchone()[0]
    return {'ok':True,'version':'1.1.0','total':total, 'running':collectors.RUNNING['running'],
        'data_path':str(db.current_db_path()),'timezone':config.TIMEZONE,'auto_scan':config.AUTO_SCAN,
        'scan_time':'不使用全局固定时间；按数据源独立刷新周期','github_token':bool(config.GITHUB_TOKEN),'x_enabled':bool(config.X_ENABLED and config.X_BEARER_TOKEN),
        'llm_configured':ai.configured(),'sources':list(collectors.SOURCES),
        'note':'所有商业评分是启发式假设，非真实付费证据'}

@app.get('/api/overview')
def overview():
    with db.connect() as c:
        total=c.execute('SELECT COUNT(*) FROM opportunities WHERE is_demo=0').fetchone()[0]
        demo=c.execute('SELECT COUNT(*) FROM opportunities WHERE is_demo=1').fetchone()[0]
        high=c.execute("SELECT COUNT(*) FROM opportunities WHERE score>=80 AND stage!='已归档' AND is_demo=0").fetchone()[0]
        validate=c.execute("SELECT COUNT(*) FROM opportunities WHERE stage IN ('待验证','验证中') AND is_demo=0").fetchone()[0]
        sold=c.execute("SELECT COUNT(*) FROM opportunities WHERE stage='已成交' AND is_demo=0").fetchone()[0]
        real_revenue=c.execute('SELECT COALESCE(SUM(realized_revenue),0) FROM opportunities WHERE is_demo=0').fetchone()[0]
        exp=c.execute('''SELECT COALESCE(SUM(e.revenue),0) AS revenue,COALESCE(SUM(e.cost),0) AS cost,
           COALESCE(SUM(e.contacts),0) AS contacts,COALESCE(SUM(e.replies),0) AS replies,
           COALESCE(SUM(e.orders),0) AS orders FROM experiments e
           JOIN opportunities o ON e.opportunity_id=o.id WHERE o.is_demo=0''').fetchone()
        trends=[dict(x) for x in c.execute("SELECT substr(first_seen,1,10) AS date,COUNT(*) AS count FROM opportunities WHERE is_demo=0 GROUP BY 1 ORDER BY 1 DESC LIMIT 14")][::-1]
        stages=[dict(x) for x in c.execute('SELECT stage,COUNT(*) AS count FROM opportunities WHERE is_demo=0 GROUP BY stage')]
        sources=[dict(x) for x in c.execute('SELECT source,COUNT(*) AS count FROM opportunities WHERE is_demo=0 GROUP BY source ORDER BY count DESC')]
        last=c.execute('SELECT * FROM scans ORDER BY id DESC LIMIT 1').fetchone()
        top=[db.item_dict(x) for x in c.execute('SELECT * FROM opportunities WHERE is_demo=0 AND stage!=? ORDER BY score DESC,id DESC LIMIT 5',('已归档',))]
    return {'total':total,'demo':demo,'high':high,'validating':validate,'sold':sold,
       'booked_revenue':round(real_revenue+exp['revenue'],2),'experiment_cost':exp['cost'],
       'contacts':exp['contacts'],'replies':exp['replies'],'orders':exp['orders'],
       'trends':trends,'stages':stages,'sources':sources,'top':top,'last_scan':parse_scan(last) if last else None}

def parse_scan(row):
    r=dict(row);r['detail']=json.loads(r.pop('detail_json') or '{}');return r

@app.get('/api/opportunities')
def opportunities(search:str='',source:str='',stage:str='',category:str='',min_score:int=0,
                  sort:str='score',limit:int=Query(100,ge=1,le=2000),include_demo:bool=True):
    where=[];args=[]
    if search:where.append('(title LIKE ? OR summary LIKE ? OR notes LIKE ?)');args.extend([f'%{search}%']*3)
    if source:where.append('source=?');args.append(source)
    if stage:where.append('stage=?');args.append(stage)
    if category:where.append('category=?');args.append(category)
    if min_score:where.append('score>=?');args.append(min_score)
    if not include_demo:where.append('is_demo=0')
    clause=' WHERE '+' AND '.join(where) if where else ''
    order={'score':'score DESC,id DESC','new':'id DESC','old':'id ASC','stars':'stars DESC','revenue':'realized_revenue DESC'}.get(sort,'score DESC,id DESC')
    with db.connect() as c:
        total=c.execute('SELECT COUNT(*) FROM opportunities'+clause,args).fetchone()[0]
        items=[db.item_dict(r) for r in c.execute('SELECT * FROM opportunities'+clause+f' ORDER BY {order} LIMIT ?',args+[limit])]
    return {'total':total,'items':items}

@app.get('/api/opportunities/{oid}')
def opportunity(oid:int):
    with db.connect() as c:
        r=c.execute('SELECT * FROM opportunities WHERE id=?',(oid,)).fetchone()
        if not r:raise HTTPException(404,'机会不存在')
        item=db.item_dict(r);item['raw']=json.loads(r['raw_json'] or '{}')
        item['economics']=economics(r['estimated_price'],r['estimated_cost'],r['estimated_hours'])
        item['experiments']=[dict(x) for x in c.execute('SELECT * FROM experiments WHERE opportunity_id=? ORDER BY id DESC',(oid,))]
        item['snapshots']=[dict(x) for x in c.execute('SELECT observed_day,stars,comments FROM popularity_history WHERE opportunity_id=? ORDER BY observed_day DESC LIMIT 14',(oid,))]
        manual_orders=sum(e['orders'] for e in item['experiments'])
        manual_replies=sum(e['replies'] for e in item['experiments'])
        item['evidence_level']='已记录成交（人工录入，未经审计）' if manual_orders>0 or r['realized_revenue']>0 else ('已记录客户反馈（人工录入）' if manual_replies>0 else '待验证')
    return item

@app.post('/api/opportunities')
def add_manual(body:ManualInput):
    item={'source':'manual','source_id':'','source_url':body.source_url,'title':body.title,
          'summary':body.summary,'author':'手动添加','published_at':db.now(),'license':'UNKNOWN',
          'raw':{'method':'manual','claim':'未经独立核实'}}
    with db.connect() as c:
        inserted=db.insert_item(c,item)
        oid=c.execute('SELECT id FROM opportunities WHERE fingerprint=?',(db.fingerprint(item),)).fetchone()['id']
    return {'ok':True,'inserted':inserted,'id':oid}

@app.patch('/api/opportunities/{oid}')
def patch_opportunity(oid:int,body:PatchOpportunity):
    patch=body.model_dump(exclude_unset=True,exclude_none=True)
    if not patch:return {'ok':True}
    with db.connect() as c:
        found=c.execute('SELECT id FROM opportunities WHERE id=?',(oid,)).fetchone()
        if not found:raise HTTPException(404,'机会不存在')
        c.execute('UPDATE opportunities SET '+','.join(k+'=?' for k in patch)+' WHERE id=?',list(patch.values())+[oid])
    return {'ok':True}

@app.post('/api/opportunities/{oid}/rescore')
def rescore(oid:int):
    with db.connect() as c:
        r=c.execute('SELECT * FROM opportunities WHERE id=?',(oid,)).fetchone()
        if not r:raise HTTPException(404,'机会不存在')
        result=score_item(dict(r))
        c.execute('UPDATE opportunities SET score=?, scores_json=?, evidence_notes=?, risk=? WHERE id=?',
            (result['score'],json.dumps(result['scores']),result['evidence_notes'],result['risk'],oid))
    return {'ok':True,'score':result['score']}

@app.post('/api/opportunities/{oid}/analyze')
def analyze_opportunity(oid:int):
    with db.connect() as c:
        r=c.execute('SELECT * FROM opportunities WHERE id=?',(oid,)).fetchone()
        if not r:raise HTTPException(404,'机会不存在')
    try:report=ai.analyze(dict(r))
    except Exception as e:raise HTTPException(400,f'AI 分析未完成: {str(e)[:350]}')
    with db.connect() as c:c.execute('UPDATE opportunities SET ai_report=? WHERE id=?',(json.dumps(report,ensure_ascii=False),oid))
    return {'ok':True,'report':report}

@app.get('/api/experiments')
def experiments():
    with db.connect() as c:
        rows=c.execute('''SELECT e.*, o.title AS opportunity_title,o.category,o.is_demo FROM experiments e
            JOIN opportunities o ON o.id=e.opportunity_id ORDER BY e.id DESC''')
        return [dict(x) for x in rows]

@app.post('/api/experiments')
def create_experiment(body:ExperimentInput):
    with db.connect() as c:
        if not c.execute('SELECT 1 FROM opportunities WHERE id=?',(body.opportunity_id,)).fetchone():raise HTTPException(404,'机会不存在')
        eid=c.execute('''INSERT INTO experiments(opportunity_id,hypothesis,action,due_date,created_at)
                  VALUES(?,?,?,?,?)''',(body.opportunity_id,body.hypothesis,body.action,body.due_date,db.now())).lastrowid
    return {'ok':True,'id':eid}

@app.patch('/api/experiments/{eid}')
def patch_experiment(eid:int,body:PatchExperiment):
    data=body.model_dump(exclude_unset=True,exclude_none=True)
    with db.connect() as c:
        if not c.execute('SELECT 1 FROM experiments WHERE id=?',(eid,)).fetchone():raise HTTPException(404,'实验不存在')
        if data:c.execute('UPDATE experiments SET '+','.join(k+'=?' for k in data)+' WHERE id=?',list(data.values())+[eid])
    return {'ok':True}

@app.get('/api/watchlist')
def watchlist():
    with db.connect() as c:return [dict(x) for x in c.execute('SELECT * FROM watch_keywords ORDER BY id')]

@app.post('/api/watchlist')
def add_watch(body:WatchInput):
    with db.connect() as c:
        try:c.execute('INSERT INTO watch_keywords(term) VALUES(?)',(body.term.strip(),))
        except Exception:raise HTTPException(409,'关键词已存在')
    return {'ok':True}

@app.patch('/api/watchlist/{wid}')
def patch_watch(wid:int,body:PatchWatch):
    with db.connect() as c:
        cur=c.execute('UPDATE watch_keywords SET enabled=? WHERE id=?',(int(body.enabled),wid))
        if not cur.rowcount:raise HTTPException(404,'关键词不存在')
    return {'ok':True}

@app.delete('/api/watchlist/{wid}')
def delete_watch(wid:int):
    with db.connect() as c:
        c.execute('DELETE FROM watch_keywords WHERE id=?',(wid,))
    return {'ok':True}

@app.get('/api/rss-feeds')
def rss_feeds():
    with db.connect() as c:return [dict(x) for x in c.execute('SELECT * FROM rss_feeds ORDER BY id')]

@app.post('/api/rss-feeds')
def add_feed(body:FeedInput):
    with db.connect() as c:
        try:c.execute('INSERT INTO rss_feeds(name,url) VALUES(?,?)',(body.name.strip(),body.url.strip()))
        except Exception:raise HTTPException(409,'RSS 名称或地址已存在')
    return {'ok':True}

@app.patch('/api/rss-feeds/{fid}')
def patch_feed(fid:int,body:PatchWatch):
    with db.connect() as c:
        cur=c.execute('UPDATE rss_feeds SET enabled=? WHERE id=?',(int(body.enabled),fid))
        if not cur.rowcount:raise HTTPException(404,'RSS 源不存在')
    return {'ok':True}

@app.delete('/api/rss-feeds/{fid}')
def delete_feed(fid:int):
    with db.connect() as c:c.execute('DELETE FROM rss_feeds WHERE id=?',(fid,))
    return {'ok':True}

@app.get('/api/sources')
def source_settings():
    return collectors.source_configs()

@app.patch('/api/sources/{source}')
def patch_source(source:str,body:SourcePatch):
    if source not in collectors.SOURCES:raise HTTPException(404,'数据源不存在')
    d={k:v for k,v in body.model_dump(exclude_unset=True).items() if v is not None or k=='feed_url'}
    if 'feed_url' in d and source not in collectors.PLATFORM_DOMAINS:
        raise HTTPException(422,'只有平台授权数据源支持该地址')
    if 'feed_url' in d and d['feed_url'] is None:d['feed_url']=''
    if 'feed_url' in d:d['feed_url']=d['feed_url'].strip()
    if not d:raise HTTPException(422,'没有可更新的参数')
    with db.connect() as c:
        cols=', '.join(f'{k}=?' for k in d)
        args=[int(v) if isinstance(v,bool) else v for v in d.values()]
        c.execute(f'UPDATE source_configs SET {cols} WHERE source=?',args+[source])
    return {'ok':True,'source':next(r for r in collectors.source_configs() if r['source']==source)}

@app.post('/api/platform/import')
def import_platform(body:PlatformImport):
    try:
        if body.format=='csv':
            rows=list(csv.DictReader(io.StringIO(body.data.lstrip('\ufeff'))))
        else:
            parsed=json.loads(body.data)
            rows=parsed.get('items',[]) if isinstance(parsed,dict) else parsed
    except (csv.Error,ValueError,TypeError) as e:
        raise HTTPException(422,'导入文本不是有效的 CSV/JSON') from e
    if not isinstance(rows,list) or len(rows)>200:raise HTTPException(422,'最多导入 200 条记录')
    normalized=collectors.normalize_platform_rows(body.source,rows)
    if not normalized:raise HTTPException(422,'没有有效记录；请确认 title 和平台官方商品/笔记 HTTPS 链接')
    with db.connect() as c:
        added=sum(1 for row in normalized if db.insert_item(c,row))
    return {'ok':True,'source':body.source,'total':len(rows),'accepted':len(normalized),
            'inserted':added,'updated':len(normalized)-added,'rejected':len(rows)-len(normalized)}

@app.get('/api/scans')
def scans(limit:int=20):
    with db.connect() as c:return [parse_scan(x) for x in c.execute('SELECT * FROM scans ORDER BY id DESC LIMIT ?', (min(100,max(1,limit)),))]

@app.post('/api/scan')
def start_scan(body:ScanParams|None=None):
    body=body or ScanParams()
    if body.source is not None and body.source not in collectors.SOURCES:
        raise HTTPException(404,'数据源不存在')
    if collectors.RUNNING['running'] or collectors.SCAN_LOCK.locked():
        return {'ok':False,'message':'已有扫描进行中'}
    selected=[body.source] if body.source else None
    context=contextvars.copy_context()
    thread=threading.Thread(target=lambda:context.run(collectors.scan_once,sources=selected,force=body.mode=='force'),
                            daemon=True,name='opportunity-scan')
    thread.start()
    return {'ok':True,'message':('强制刷新任务已启动' if body.mode=='force' else '已检查到期数据源；未到周期的来源会跳过')}

@app.post('/api/demo/load')
def demo_load():
    """Explicit demo, never mixed into real statistics."""
    samples=[
        ('AI 开发脚手架一键交付','https://example.org/demo/ai-dev-starter','面向 Java/Python 团队提供 MCP/Skills/规范初始化和验收。仅供界面体验，不是实时商机。'),
        ('商品素材自动化工作流','https://example.org/demo/media-workflow','多模态批处理和商品视频生产的假设方案。演示数据，不存在已验证的客户。'),
        ('行业信息雷达订阅','https://example.org/demo/research-radar','公开信息采集、归档和每日结构化报告。演示数据，非真实市场成交。'),
    ]
    with db.connect() as c:
        count=0
        for i,(title,url,summary) in enumerate(samples):
            item={'source':'demo','source_id':f'demo-{i}', 'source_url':url,'title':title,
                'summary':summary,'author':'体验数据','published_at':db.now(),
                'raw':{'demo':True},'license':'UNKNOWN','is_demo':1}
            count+=db.insert_item(c,item)
    return {'ok':True,'inserted':count,'warning':'演示条目全部带有 DEMO 标签，不参与真实统计'}

@app.delete('/api/demo')
def clear_demo():
    with db.connect() as c:
        rows=c.execute('DELETE FROM opportunities WHERE is_demo=1').rowcount
    return {'ok':True,'deleted':rows}

@app.get('/api/export.csv')
def export_csv():
    with db.connect() as c:
        rows=[dict(x) for x in c.execute('''SELECT id,source,title,source_url,category,score,stage,published_at,
        first_seen,license,evidence_notes,risk,target_customer,offer,next_test,estimated_price,
        estimated_cost,estimated_hours,realized_revenue,notes,is_demo FROM opportunities ORDER BY score DESC''')]
    out=io.StringIO();columns=list(rows[0]) if rows else ['id','source','title','score','stage']
    out.write('\ufeff');writer=csv.DictWriter(out,fieldnames=columns);writer.writeheader()
    # Avoid spreadsheet formula injection for attacker-controlled public text.
    for row in rows:
        safe={k:("'"+v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@')) else v) for k,v in row.items()}
        writer.writerow(safe)
    out.seek(0)
    return StreamingResponse(iter([out.getvalue()]),media_type='text/csv; charset=utf-8',
      headers={'Content-Disposition':'attachment; filename="opportunity_os_export.csv"'})

@app.get('/api/backup')
def download_backup():
    try:path=backup.backup_database()
    except Exception as e:raise HTTPException(500,f'备份生成失败: {str(e)[:200]}') from e
    return FileResponse(path,media_type='application/vnd.sqlite3',filename=path.name)

@app.get('/api/report')
def daily_report():
    from datetime import timedelta
    cutoff=(datetime.now(timezone.utc)-timedelta(days=2)).isoformat(timespec='seconds')
    with db.connect() as c:
        items=[db.item_dict(x) for x in c.execute("SELECT * FROM opportunities WHERE is_demo=0 AND stage!='已归档' AND first_seen>=? ORDER BY score DESC,id DESC LIMIT 5",(cutoff,))]
        if not items:
            items=[db.item_dict(x) for x in c.execute("SELECT * FROM opportunities WHERE is_demo=0 AND stage!='已归档' ORDER BY score DESC,id DESC LIMIT 5")]
        last=c.execute('SELECT * FROM scans ORDER BY id DESC LIMIT 1').fetchone()
    lines=['# Opportunity OS · 机会日报',f'生成时间：{db.now()}','',
           '优先展示过去48小时新入库机会；若无新机会则展示历史待处理候选。',
           '说明：分数为启发式假设；stars/评论不是付费证据。','']
    if not items:lines.append('暂无真实机会，请先运行采集。')
    for idx,o in enumerate(items,1):
        lines.extend([f'## {idx}. {o["title"]} · {o["score"]}/100',f'- 来源：{o["source"]} / {o["source_url"]}',
          f'- 观察：{o["evidence_notes"]}',f'- 目标客户：{o["target_customer"]}',
          f'- 建议产品：{o["offer"]}',f'- 测试报价：¥{o["estimated_price"]:g}（未验证）',
          f'- 下一步：{o["next_test"]}',f'- 风险：{o["risk"]}',''])
    if last:lines.extend(['## 最新采集状态',f'{last["status"]}；新增 {last["inserted"]}，更新 {last["updated"]}。'])
    return StreamingResponse(iter(['\n'.join(lines)]),media_type='text/markdown; charset=utf-8',
      headers={'Content-Disposition':'attachment; filename="daily_opportunity_report.md"'})

if __name__=='__main__':
    import uvicorn
    uvicorn.run('app.main:app',host=config.HOST,port=config.PORT,workers=1,reload=False)
