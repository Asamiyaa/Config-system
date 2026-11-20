"""Network collection with source-level failure isolation. No proxy/scraped X access.

Each item stores its original URL/metadata. Failed sources never produce synthetic data.
"""
import json, html, re, time, threading, ipaddress, socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import httpx
from xml.etree import ElementTree as ET
from urllib.parse import urlsplit
from bs4 import BeautifulSoup
from . import config, db
from .scoring import categorize

UA='OpportunityOS/1.0 (+local personal research tool)'
SCAN_LOCK=threading.Lock()
RSS_ERRORS=[]
RUNNING={'running':False, 'scan_id':None}

def clean(t):
    return html.unescape(re.sub(r'<[^>]+>', ' ', t or '')).strip()

def request_json(client,url,**kwargs):
    r=client.get(url,**kwargs)
    if r.status_code in (403,429):
        remaining=r.headers.get('x-ratelimit-remaining','?')
        retry=r.headers.get('retry-after','?')
        raise RuntimeError(f'API 限流/权限 HTTP {r.status_code}; remaining={remaining}; retry-after={retry}')
    r.raise_for_status()
    return r.json()

def github(client):
    headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    if config.GITHUB_TOKEN: headers['Authorization']='Bearer '+config.GITHUB_TOKEN
    with db.connect() as c:
        terms=[r['term'] for r in c.execute('SELECT term FROM watch_keywords WHERE enabled=1 ORDER BY id LIMIT 8')]
    cutoff=(datetime.now(timezone.utc)-timedelta(days=config.SCAN_DAYS)).date().isoformat()
    items=[]
    for term in terms:
        query=f'{term} created:>={cutoff}'
        data=request_json(client,'https://api.github.com/search/repositories',headers=headers,
            params={'q':query,'sort':'stars','order':'desc','per_page':12})
        for r in data.get('items',[]):
            summary=r.get('description') or ''
            items.append({'source':'github','source_id':str(r['id']), 'source_url':r['html_url'],
                'title':r['full_name'],'summary':summary,'author':r.get('owner',{}).get('login',''),
                'published_at':r.get('created_at'),'stars':r.get('stargazers_count',0),
                'comments':0,'license':(r.get('license') or {}).get('spdx_id') or 'UNKNOWN',
                'raw':{'language':r.get('language'),'topics':r.get('topics',[]),'forks':r.get('forks_count'),
                       'archived':r.get('archived'),'is_template':r.get('is_template'),'created_at':r.get('created_at'),
                       'updated_at':r.get('updated_at'),'homepage':r.get('homepage'),'github_query':query}})
        time.sleep(0.28) # conservative GitHub Search pacing
    return items

def parse_trending_html(body):
    """Parse github.com/trending page (not a GitHub REST API endpoint).

    Do not infer licenses, payment willingness or a repository creation time from the page.
    """
    soup=BeautifulSoup(body,'html.parser')
    results=[]
    seen=set()
    for card in soup.select('article.Box-row'):
        anchor=None
        for link in card.select('h2 a[href]'):
            href=link.get('href','').strip()
            if re.fullmatch(r'/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',href):
                anchor=href;break
        if not anchor or anchor.lower() in seen:continue
        seen.add(anchor.lower())
        title=anchor.strip('/')
        desc=card.select_one('p')
        lang=card.select_one('[itemprop="programmingLanguage"]')
        stars_tag=card.select_one('a[href$="/stargazers"]')
        trend_text=card.get_text(' ',strip=True)
        match=re.search(r'([\d,]+)\s+stars?\s+(?:today|this week|this month)',trend_text,re.I)
        def to_int(t):
            try:return int(re.sub('[^0-9]','',t))
            except ValueError:return 0
        star_total=to_int(stars_tag.get_text(' ',strip=True)) if stars_tag else 0
        description=desc.get_text(' ',strip=True) if desc else ''
        results.append({'source':'github_trending','source_id':title.lower(),
          'source_url':'https://github.com/'+title,'title':title,
          'summary':description,'author':title.split('/')[0], 'published_at':None,
          'stars':star_total,'comments':0,'license':'UNKNOWN',
          'raw':{'trending_url':'https://github.com/trending','stars_in_period':to_int(match.group(1)) if match else None,
                 'language':lang.get_text(' ',strip=True) if lang else '', 'observation':'榜单被采集时入库；非项目发布时间'}})
    return results

def github_trending(client):
    r=client.get('https://github.com/trending',params={'since':'daily'},headers={'Accept':'text/html'})
    r.raise_for_status()
    results=parse_trending_html(r.text)
    if not results:raise RuntimeError('GitHub Trending 页面未发现项目条目，可能是页面改版或访问受限')
    return results

def hn(client):
    root='https://hacker-news.firebaseio.com/v0'
    ids=[]
    for feed in ('showstories','askstories'):
        ids.extend(request_json(client,f'{root}/{feed}.json')[:18])
    ids=list(dict.fromkeys(ids))[:36]
    results=[]
    # HN public API supports concurrency; cap at 4 workers to reduce load.
    def fetch(n):return request_json(client,f'{root}/item/{n}.json')
    with ThreadPoolExecutor(max_workers=4) as pool:
        futs={pool.submit(fetch,n):n for n in ids}
        for f in as_completed(futs):
            try:r=f.result()
            except Exception:continue
            if not r or r.get('deleted') or not r.get('title'):continue
            summary=clean(r.get('text') or '')
            if categorize(r['title'],summary)=='其他':continue
            source_url=f'https://news.ycombinator.com/item?id={r["id"]}'
            results.append({'source':'hn','source_id':str(r['id']), 'source_url':source_url,
                'title':r['title'], 'summary':summary[:1800] or ('原始项目：'+r.get('url','')),
                'author':r.get('by',''), 'published_at':datetime.fromtimestamp(r.get('time',0),timezone.utc).isoformat(),
                'comments':r.get('descendants',0),'license':'UNKNOWN',
                'raw':{'discussion_url':source_url,'external_url':r.get('url'),'score':r.get('score',0)}})
    return results

def parse_feed(content):
    """Minimal stdlib RSS 2.0 / Atom parser; tolerate partially missing metadata."""
    root=ET.fromstring(content)
    entries=[]
    for node in root.findall('./channel/item'):
        get=lambda k: node.findtext(k) or ''
        entries.append({'title':get('title'),'summary':get('description'),
                        'published':get('pubDate'),'link':get('link')})
    if not entries:
        ns={'a':'http://www.w3.org/2005/Atom'}
        for node in root.findall('./a:entry',ns):
            link=node.find('a:link',ns)
            entries.append({'title':node.findtext('a:title',default='',namespaces=ns),
              'summary':node.findtext('a:summary',default='',namespaces=ns) or node.findtext('a:content',default='',namespaces=ns),
              'published':node.findtext('a:published',default='',namespaces=ns) or node.findtext('a:updated',default='',namespaces=ns),
              'link':link.get('href','') if link is not None else ''})
    return entries

def rss(client):
    global RSS_ERRORS
    RSS_ERRORS=[]
    with db.connect() as c:
        feeds=[(r['name'],r['url']) for r in c.execute('SELECT name,url FROM rss_feeds WHERE enabled=1 LIMIT 12')]
    out=[];errors=[]
    for name,url in feeds:
        try:
            resp=client.get(url)
            resp.raise_for_status()
            entries=parse_feed(resp.content[:5_000_000])
            if not entries:raise ValueError('Feed 无有效条目')
            for e in entries[:16]:
                title=clean(e.get('title',''));summary=clean(e.get('summary',''))[:1400]
                if categorize(title,summary)=='其他':continue
                link=e.get('link','')
                if not link.startswith(('https://','http://')):continue
                out.append({'source':'rss','source_id':link,'source_url':link,'title':title,'summary':summary,
                  'author':name,'published_at':e.get('published',''),'license':'UNKNOWN',
                  'raw':{'feed':name,'feed_url':url}})
        except Exception as ex: errors.append(f'{name}: {str(ex)[:160]}')
    RSS_ERRORS=errors
    if errors and not out:raise RuntimeError(' / '.join(errors))
    return out

def x_recent(client):
    if not (config.X_ENABLED and config.X_BEARER_TOKEN):return []
    data=request_json(client,'https://api.x.com/2/tweets/search/recent',
        headers={'Authorization':'Bearer '+config.X_BEARER_TOKEN},
        params={'query':config.X_QUERY,'max_results':25,'tweet.fields':'created_at,public_metrics,author_id'})
    out=[]
    for r in data.get('data',[]):
        msg=r.get('text','').replace('\n',' ')
        if categorize(msg,'')=='其他':continue
        out.append({'source':'x','source_id':r['id'],'source_url':f'https://x.com/i/web/status/{r["id"]}',
            'title':msg[:150],'summary':msg[:1000], 'author':str(r.get('author_id','')),
            'published_at':r.get('created_at'), 'comments':(r.get('public_metrics') or {}).get('reply_count',0),
            'license':'UNKNOWN', 'raw':{'public_metrics':r.get('public_metrics',{})}})
    return out

# Do not fetch login-gated marketplace pages or try to bypass access controls.
PLATFORM_DOMAINS={
    'xianyu':('goofish.com','2.taobao.com'),
    'xiaohongshu':('xiaohongshu.com','xhslink.com'),
    '1688':('1688.com',),
}
SOURCE_LABELS={'github':'GitHub 仓库搜索','github_trending':'GitHub Trending','hn':'Hacker News',
               'rss':'资讯 RSS','x':'X 近期搜索','xianyu':'闲鱼','xiaohongshu':'小红书','1688':'1688'}

class MissingIntegration(RuntimeError): pass

def valid_external_url(url, domains=None):
    try:u=urlsplit(url)
    except ValueError:return False
    if u.scheme!='https' or not u.hostname or u.username or u.password:return False
    if re.search(r'(?i)(?:^|[&;])(?:access_?token|api_?key|token|secret|password|signature|auth)=',u.query):return False
    hostname=u.hostname.lower().rstrip('.')
    if domains and not any(hostname==d or hostname.endswith('.'+d) for d in domains):return False
    if hostname=='localhost' or hostname.endswith(('.localhost','.local')):return False
    try:
        if not ipaddress.ip_address(hostname).is_global:return False
    except ValueError:pass
    return True

def validate_feed_target(url):
    """Reject obvious SSRF targets. Do not follow redirects when loading integrations."""
    if not valid_external_url(url):raise ValueError('订阅地址仅允许公网 HTTPS URL')
    host=urlsplit(url).hostname
    try:
        addresses=socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)
    except OSError as e:raise RuntimeError('订阅域名 DNS 解析失败') from e
    if not addresses or any(not ipaddress.ip_address(x[4][0]).is_global for x in addresses):
        raise ValueError('订阅域名解析到内网地址，已拒绝访问')

def normalize_platform_rows(source, rows):
    if not isinstance(rows,list):raise ValueError('数据源应为列表')
    out=[]
    for row in rows[:200]:
        if not isinstance(row,dict):continue
        url=str(row.get('url') or row.get('source_url') or '').strip()
        if not valid_external_url(url,PLATFORM_DOMAINS[source]):continue
        title=str(row.get('title') or '').strip()
        if not title:continue
        # Keep only allowlisted market attributes; never write a provider credential to raw_json.
        data={k:row[k] for k in ('price','sales','shop','currency','sku','category','observed_at') if k in row}
        for k,v in list(data.items()):
            if not isinstance(v,(str,int,float,bool)) or len(str(v))>500:data.pop(k,None)
        out.append({'source':source,'source_id':str(row.get('id') or row.get('item_id') or url)[:256],
          'source_url':url,'title':title[:350], 'summary':str(row.get('summary') or row.get('description') or '')[:2400],
          'author':str(row.get('author') or row.get('shop') or '')[:120],
          'published_at':str(row.get('published_at') or '')[:40], 'license':'UNKNOWN',
          'raw':{'import_kind':'authorized_feed_or_manual','platform_metadata':data}})
    return out

def platform_feed(client,source):
    with db.connect() as c:row=c.execute('SELECT feed_url FROM source_configs WHERE source=?',(source,)).fetchone()
    url=(row['feed_url'] if row else '').strip()
    if not url:raise MissingIntegration('尚未配置获授权的 RSS/JSON 数据源；也可手动导入平台记录。')
    validate_feed_target(url)
    # Separate transport with redirects disabled so a feed cannot redirect to localhost.
    with httpx.Client(timeout=httpx.Timeout(12.0),headers={'User-Agent':UA},follow_redirects=False,
                      trust_env=False) as safe_client:
        r=safe_client.get(url)
    if 300<=r.status_code<400:raise RuntimeError('订阅源发生重定向，出于安全原因未继续访问')
    r.raise_for_status()
    if len(r.content)>3_000_000:raise RuntimeError('订阅响应超出 3MB 限额')
    content_type=r.headers.get('content-type','')
    if 'json' in content_type or r.text.lstrip().startswith(('{','[')):
        parsed=r.json()
        rows=parsed.get('items',[]) if isinstance(parsed,dict) else parsed
    else:
        entries=parse_feed(r.content)
        rows=[{'title':e['title'],'summary':clean(e['summary']),'url':e['link'],
               'published_at':e['published']} for e in entries]
    if not isinstance(rows,list):raise ValueError('订阅源缺少 items 列表')
    results=normalize_platform_rows(source,rows)
    if rows and not results:raise RuntimeError('返回数据均未通过平台网址和字段校验')
    return results

def xianyu(client):return platform_feed(client,'xianyu')
def xiaohongshu(client):return platform_feed(client,'xiaohongshu')
def alibaba_1688(client):return platform_feed(client,'1688')

SOURCES={'github':github,'github_trending':github_trending,'hn':hn,'rss':rss,
         'x':x_recent,'xianyu':xianyu,'xiaohongshu':xiaohongshu,'1688':alibaba_1688}

def source_configs():
    moment=datetime.now(timezone.utc)
    with db.connect() as c:rows=[dict(r) for r in c.execute('SELECT * FROM source_configs ORDER BY rowid')]
    for r in rows:
        pending=r['source'] in PLATFORM_DOMAINS and not r['feed_url']
        if r['source']=='x' and not (config.X_ENABLED and config.X_BEARER_TOKEN):pending=True
        due_at=None
        if r['last_attempt_at']:
            try:due_at=datetime.fromisoformat(r['last_attempt_at'])+timedelta(minutes=r['interval_minutes'])
            except ValueError:pass
        r['next_due_at']=due_at.isoformat() if due_at else None
        r['ready']=not pending
        r['due']=bool(r['enabled'] and not pending and (not due_at or due_at<=moment))
        r['label']=SOURCE_LABELS.get(r['source'],r['source'])
        r['integration']=('authorized_feed' if r['source'] in PLATFORM_DOMAINS else
                          'official_api' if r['source'] in ('github','x') else
                          'public_page' if r['source']=='github_trending' else 'public_feed')
    return rows

def claim_source(source,force=False):
    """Atomic due claim across app and Windows scheduled task processes."""
    with db.connect() as c:
        r=c.execute('SELECT * FROM source_configs WHERE source=?',(source,)).fetchone()
        if not r or not r['enabled']:return False
        if source in PLATFORM_DOMAINS and not r['feed_url']:return False
        if source=='x' and not (config.X_ENABLED and config.X_BEARER_TOKEN):return False
        # Claim only when no recent attempt unless force is explicitly requested.
        date_limit=(datetime.now(timezone.utc)-timedelta(minutes=r['interval_minutes'])).isoformat()
        now_at=db.now()
        if force:
            cur=c.execute('UPDATE source_configs SET last_attempt_at=?,last_status=? WHERE source=? AND enabled=1',
                          (now_at,'running',source))
        else:
            cur=c.execute('UPDATE source_configs SET last_attempt_at=?,last_status=? '
                  'WHERE source=? AND enabled=1 AND (last_attempt_at IS NULL OR last_attempt_at<=?)',
                  (now_at,'running',source,date_limit))
        return cur.rowcount>0

def record_source(source,state,message=''):
    with db.connect() as c:
        if state in ('ok','partial'):
            c.execute('UPDATE source_configs SET last_status=?,last_message=?,last_success_at=? WHERE source=?',
                      (state,message[:350],db.now(),source))
        else:
            c.execute('UPDATE source_configs SET last_status=?,last_message=? WHERE source=?',
                      (state,message[:350],source))

def scan_once(sources=None,force=False):
    if not SCAN_LOCK.acquire(blocking=False):return {'ok':False,'reason':'扫描已在运行'}
    RUNNING['running']=True;RUNNING['scan_id']=None
    sid=None
    try:
        chosen=[s for s in (sources if sources is not None else SOURCES.keys()) if s in SOURCES]
        ready=[];skipped={}
        for source in chosen:
            cfg=next((r for r in source_configs() if r['source']==source),None)
            if not cfg or not cfg['enabled']:
                skipped[source]={'state':'disabled','message':'数据源已停用'}
            elif not cfg['ready']:
                skipped[source]={'state':'unconfigured','message':'需要配置授权数据源或 API 凭据'}
            elif claim_source(source,force=force):ready.append(source)
            else:skipped[source]={'state':'not_due','message':'距离上次执行未达到独立刷新周期'}
        if not ready:return {'ok':True,'status':'skipped','sources':skipped,'inserted':0,'updated':0,'found':0}
        with db.connect() as c:
            sid=c.execute('INSERT INTO scans(started_at) VALUES(?)',(db.now(),)).lastrowid
        RUNNING['scan_id']=sid
        detail=dict(skipped);found=added=updated=good=0
        with httpx.Client(headers={'User-Agent':UA},timeout=httpx.Timeout(12.0),follow_redirects=True) as client:
            for source in ready:
                handler=SOURCES[source]
                try:
                    records=handler(client)
                    unique={db.fingerprint(x):x for x in records}
                    with db.connect() as c:
                        count=sum(1 for item in unique.values() if db.insert_item(c,item))
                    found+=len(unique);added+=count;updated+=len(unique)-count;good+=1
                    state='partial' if source=='rss' and RSS_ERRORS else 'ok'
                    info={'state':state,'found':len(unique),'inserted':count,'updated':len(unique)-count}
                    if state=='partial':info['feed_errors']=RSS_ERRORS[:]
                    detail[source]=info
                    record_source(source,state,' / '.join(RSS_ERRORS[:4]) if state=='partial' else '')
                except Exception as e:
                    detail[source]={'state':'error','message':str(e)[:350]}
                    record_source(source,'error',str(e))
        error_or_partial=any(v['state'] in ('error','partial') for k,v in detail.items() if k in ready)
        status='completed' if good and not error_or_partial else ('partial' if good else 'failed')
        with db.connect() as c:
            c.execute('UPDATE scans SET finished_at=?,status=?,found=?,inserted=?,updated=?,detail_json=? WHERE id=?',
              (db.now(),status,found,added,updated,json.dumps(detail,ensure_ascii=False),sid))
        return {'ok':good>0,'status':status,'found':found,'inserted':added,'updated':updated,'sources':detail,'scan_id':sid}
    except Exception as e:
        if sid:
            with db.connect() as c:
                c.execute('UPDATE scans SET status=?,finished_at=?,detail_json=? WHERE id=?',
                  ('failed',db.now(),json.dumps({'system_error':str(e)},ensure_ascii=False),sid))
        return {'ok':False,'reason':str(e)}
    finally:
        RUNNING['running']=False;RUNNING['scan_id']=None;SCAN_LOCK.release()

if __name__=='__main__':
    import sys
    db.init_db()
    # --due is intended for hourly Windows scheduling; --force is opt-in manual override.
    print(json.dumps(scan_once(force='--force' in sys.argv),ensure_ascii=False,indent=2))
