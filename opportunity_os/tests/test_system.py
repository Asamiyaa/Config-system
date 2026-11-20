"""Offline, deterministic API and business-logic acceptance tests."""
import json
import pytest
from fastapi.testclient import TestClient
from app import db, main, collectors, config
from app.scoring import score_item, economics, categorize

@pytest.fixture()
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DB_PATH',tmp_path/'opps.sqlite3')
    monkeypatch.setattr(config,'AUTO_SCAN',False)
    monkeypatch.setattr(config,'X_ENABLED',False)
    with TestClient(main.app) as c:yield c

def test_empty_and_config(client):
    health=client.get('/api/health').json()
    assert health['ok'] and health['total']==0
    d=client.get('/api/overview').json()
    assert d['total']==0 and d['booked_revenue']==0
    assert client.get('/api/report').status_code==200
    assert '暂无真实机会' in client.get('/api/report').text

def test_manual_item_dedup_and_pipeline(client):
    body={'title':'MCP for Java Test','source_url':'https://example.com/project?a=1','summary':'Agent workflow automation for java'}
    res=client.post('/api/opportunities',json=body).json();assert res['inserted']
    assert client.post('/api/opportunities',json=body).json()['inserted'] is False
    oid=res['id'];opp=client.get(f'/api/opportunities/{oid}').json()
    assert opp['source_url']==body['source_url'] and opp['score']>0
    assert '需求' in opp['evidence_notes'] and opp['risk']
    assert client.patch(f'/api/opportunities/{oid}',json={'stage':'验证中','estimated_price':599,'estimated_cost':150,'estimated_hours':3}).status_code==200
    opp=client.get(f'/api/opportunities/{oid}').json()
    assert opp['stage']=='验证中' and opp['economics']['gross_profit']==449
    assert client.post(f'/api/opportunities/{oid}/rescore').status_code==200
    assert client.get('/api/opportunities?stage=验证中').json()['total']==1
    assert client.patch(f'/api/opportunities/{oid}',json={'stage':'INVALID'}).status_code==422
    assert client.post('/api/opportunities',json={**body,'source_url':'javascript:alert(1)'}).status_code==422

def test_experiment_flow(client):
    res=client.post('/api/opportunities',json={'title':'AI automation service','source_url':'https://example.com/a'}).json()
    eid=client.post('/api/experiments',json={'opportunity_id':res['id'],'hypothesis':'客户愿意付费','action':'采访十名客户','due_date':'2026-11-17'}).json()['id']
    assert client.patch(f'/api/experiments/{eid}',json={'status':'已完成','contacts':10,'replies':5,'orders':2,'revenue':598,'cost':40}).status_code==200
    e=client.get('/api/experiments').json()[0]
    assert e['orders']==2 and e['contacts']==10
    d=client.get('/api/overview').json()
    assert d['orders']==2 and d['booked_revenue']==598 and d['experiment_cost']==40

def test_demo_is_explicit_and_excluded(client):
    d=client.post('/api/demo/load').json();assert d['inserted']==3
    assert client.get('/api/overview').json()['total']==0
    assert client.get('/api/overview').json()['demo']==3
    assert client.get('/api/opportunities').json()['total']==3
    assert client.delete('/api/demo').json()['deleted']==3
    assert client.get('/api/opportunities').json()['total']==0

def test_watchlist_edit_export_and_ai_unconfigured(client):
    assert len(client.get('/api/watchlist').json())==4
    w=client.post('/api/watchlist',json={'term':'new python tool'});assert w.status_code==200
    assert client.post('/api/watchlist',json={'term':'new python tool'}).status_code==409
    selected=next(x for x in client.get('/api/watchlist').json() if x['term']=='new python tool')
    assert client.patch(f'/api/watchlist/{selected["id"]}',json={'enabled':False}).status_code==200
    assert client.delete(f'/api/watchlist/{selected["id"]}').status_code==200
    oid=client.post('/api/opportunities',json={'title':'=cmd|script','source_url':'https://example.com/injected'}).json()['id']
    csv_text=client.get('/api/export.csv').text
    assert "'=cmd|script" in csv_text
    assert client.post(f'/api/opportunities/{oid}/analyze').status_code==400


def test_source_failure_is_not_synthetic(client,monkeypatch):
    item={'source':'github','source_id':'123','source_url':'https://github.com/example/a','title':'agent repo','summary':'mcp tool','stars':100,
      'license':'MIT','published_at':'2026-11-01','raw':{}}
    def fail(_):raise RuntimeError('HTTP 429 sample rate limit')
    monkeypatch.setattr(collectors,'SOURCES',{'github':lambda _:[item], 'hn':fail, 'x':lambda _:[]})
    result=collectors.scan_once()
    assert result['status']=='partial' and result['inserted']==1
    assert result['sources']['hn']['state']=='error'
    assert result['sources']['x']['state']=='disabled'
    second=collectors.scan_once(force=True)
    assert second['inserted']==0 and second['updated']==1
    rows=client.get('/api/opportunities?include_demo=false').json()
    assert rows['total']==1 and rows['items'][0]['license']=='MIT'
    scans=client.get('/api/scans').json()
    assert scans[0]['detail']['hn']['state']=='error'


def test_scoring_and_license_guardrails():
    base={'title':'my mcp agent','summary':'developer tool','source':'github','stars':1000}
    s=score_item({**base,'license':'UNKNOWN'})
    assert s['scores']['safety']==1 and s['category']=='AI Agent'
    commercial=score_item({**base,'license':'MIT'})
    assert commercial['score']>s['score']
    econ=economics(0,20,5)
    assert econ['gross_profit']==-20 and econ['gross_margin']==0
    assert categorize('unknown title','nothing interesting')=='其他'


def test_minimal_rss_parser():
    raw=b'<rss><channel><item><title>AI agents</title><description>MCP test</description><link>https://example.com</link></item></channel></rss>'
    rows=collectors.parse_feed(raw)
    assert rows[0]['title']=='AI agents' and rows[0]['link']=='https://example.com'
    atom=b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Code</title><link href="https://example.com/a" /></entry></feed>'
    assert collectors.parse_feed(atom)[0]['title']=='Code'


def test_home_and_static_assets(client):
    assert '机会雷达' in client.get('/').text
    assert 'opportunity-list' in client.get('/').text
    assert client.get('/static/app.js').status_code==200
    assert client.get('/static/../../.env').status_code in (404,422)

def test_rss_feed_management_and_validation(client):
    current=client.get('/api/rss-feeds').json()
    assert len(current)==2
    assert client.post('/api/rss-feeds',json={'name':'local','url':'https://localhost/feed'}).status_code==422
    assert client.post('/api/rss-feeds',json={'name':'private','url':'https://127.0.0.1/rss'}).status_code==422
    assert client.post('/api/rss-feeds',json={'name':'external','url':'https://example.com/news.xml'}).status_code==200
    f=next(x for x in client.get('/api/rss-feeds').json() if x['name']=='external')
    assert client.patch(f'/api/rss-feeds/{f["id"]}',json={'enabled':False}).status_code==200
    assert client.delete(f'/api/rss-feeds/{f["id"]}').status_code==200
    with db.connect() as c:
        c.execute('DELETE FROM watch_keywords')
    db.init_db() # user cleared the list: should not silently restore defaults
    assert client.get('/api/watchlist').json()==[]

def test_history_incremental_and_backup(client):
    from app.backup import backup_database
    item={'source':'github','source_id':'955','source_url':'https://github.com/example/tool','title':'mcp tool',
          'summary':'agent integrations','stars':10,'license':'MIT','raw':{}}
    with db.connect() as c:
        assert db.insert_item(c,item)
        changed={**item,'stars':1000}
        assert not db.insert_item(c,changed)
    opp=client.get('/api/opportunities').json()['items'][0]
    detail=client.get(f'/api/opportunities/{opp["id"]}').json()
    assert detail['stars']==1000 and detail['snapshots'][0]['stars']==1000
    assert len(detail['snapshots'])==1 # 1 snapshot per UTC day, latest overwrites
    b=backup_database()
    assert b.exists() and b.stat().st_size>0
    import sqlite3
    with sqlite3.connect(b) as backup:
        assert backup.execute('PRAGMA integrity_check').fetchone()[0]=='ok'


def test_source_configs_persist_and_cooldown(client,monkeypatch):
    configs=client.get('/api/sources').json()
    names={s['source'] for s in configs}
    assert 'github_trending' in names and 'github_issue' not in names
    assert {'xianyu','xiaohongshu','1688'}<=names
    assert next(s for s in configs if s['source']=='github')['interval_minutes']==1440
    assert client.patch('/api/sources/github',json={'interval_minutes':360,'enabled':True}).status_code==200
    after=client.get('/api/sources').json()
    assert next(s for s in after if s['source']=='github')['interval_minutes']==360
    assert client.patch('/api/sources/github',json={'interval_minutes':10}).status_code==422
    assert client.patch('/api/sources/github_issue',json={'enabled':True}).status_code==404
    monkeypatch.setattr(collectors,'SOURCES',{'github':lambda client:[{'source':'github','source_id':'t1',
       'source_url':'https://github.com/example/repo','title':'AI agent repo','summary':'mcp','license':'MIT'}]})
    one=collectors.scan_once()
    assert one['inserted']==1
    # A second scheduler check must not make a new network call or scan record.
    two=collectors.scan_once()
    assert two['status']=='skipped' and two['inserted']==0 and two['sources']['github']['state']=='not_due'
    three=collectors.scan_once(force=True)
    assert three['updated']==1
    assert len(client.get('/api/scans').json())==2


def test_github_trending_parser():
    html="""<article class="Box-row"><h2><a href="/team/agent-pro">agent-pro</a></h2>
      <p>Agent workflow toolkit</p><span itemprop="programmingLanguage">Python</span>
      <a href="/team/agent-pro/stargazers">1,234</a><span>218 stars today</span>
      </article><article class="Box-row"><h2><a href="/team/agent-pro">dupe</a></h2></article>
      <article class="Box-row"><a href="/signin">sign in</a></article>"""
    rows=collectors.parse_trending_html(html)
    assert len(rows)==1 and rows[0]['source']=='github_trending'
    assert rows[0]['stars']==1234 and rows[0]['raw']['stars_in_period']==218
    assert rows[0]['license']=='UNKNOWN' and rows[0]['published_at'] is None
    assert 'github_issue' not in collectors.SOURCES


def test_platform_import_and_source_policy(client):
    entries='title,url,summary,price\nAI tool,https://www.goofish.com/item?id=1,MCP installer,199\n'
    d=client.post('/api/platform/import',json={'source':'xianyu','format':'csv','data':entries}).json()
    assert d['inserted']==1 and d['accepted']==1
    assert client.post('/api/platform/import',json={'source':'xianyu','format':'csv','data':entries}).json()['updated']==1
    result=client.get('/api/opportunities?source=xianyu').json()
    assert result['total']==1 and result['items'][0]['source_url'].startswith('https://www.goofish.com/')
    rejected=client.post('/api/platform/import',json={'source':'xianyu','format':'json','data':'[{"title":"Bad","url":"https://example.com/item"}]'})
    assert rejected.status_code==422
    assert client.patch('/api/sources/1688',json={'feed_url':'http://localhost/feed'}).status_code==422
    assert client.patch('/api/sources/1688',json={'feed_url':'https://example.org/authorized.json','interval_minutes':2880,'enabled':True}).status_code==200
    changed=next(s for s in client.get('/api/sources').json() if s['source']=='1688')
    assert changed['ready'] and changed['interval_minutes']==2880 and changed['due']
    assert next(s for s in client.get('/api/sources').json() if s['source']=='xianyu')['ready'] is False
    assert client.post('/api/platform/import',json={'source':'xianyu','format':'csv','data':'title,url\nfoo,https://169.254.169.254/' }).status_code==422


def test_v10_migration_retains_rows(tmp_path,monkeypatch):
    import sqlite3
    path=tmp_path/'original.sqlite3'
    with sqlite3.connect(path) as c:
        c.execute("CREATE TABLE opportunities (id INTEGER PRIMARY KEY, title TEXT, source TEXT, score INTEGER DEFAULT 0, stage TEXT DEFAULT '待评估')")
        c.execute("INSERT INTO opportunities(id,title,source) VALUES(1,'old opportunity','github_issue')")
    monkeypatch.setattr(db,'DB_PATH',path)
    db.init_db()
    with db.connect() as c:
        assert c.execute('SELECT title FROM opportunities WHERE id=1').fetchone()[0]=='old opportunity'
        assert c.execute('SELECT COUNT(*) FROM source_configs').fetchone()[0]==8
