"""SQLite storage; local-only single instance; raw evidence retained for audit."""
import sqlite3, json, hashlib, re
from contextvars import ContextVar
from datetime import datetime, timezone
from contextlib import contextmanager
from .config import DB_PATH
from .scoring import score_item

_ACTIVE_DB_PATH = ContextVar('opportunity_db_path', default=None)

def use_database(path):return _ACTIVE_DB_PATH.set(path)
def reset_database(token):_ACTIVE_DB_PATH.reset(token)
def current_db_path():return _ACTIVE_DB_PATH.get() or DB_PATH

def now():return datetime.now(timezone.utc).isoformat(timespec='seconds')

def connection():
    path=current_db_path()
    path.parent.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(str(path),timeout=20)
    c.row_factory=sqlite3.Row
    c.execute('PRAGMA busy_timeout=20000')
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA foreign_keys=ON')
    return c

@contextmanager
def connect():
    c=connection()
    try:
        yield c
        c.commit()
    except:
        c.rollback()
        raise
    finally:c.close()

def init_db():
    with connect() as c:
        existing={r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        c.executescript('''
        CREATE TABLE IF NOT EXISTS opportunities (
          id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT NOT NULL UNIQUE,
          source TEXT NOT NULL, source_id TEXT, source_url TEXT NOT NULL,
          title TEXT NOT NULL, summary TEXT DEFAULT '', category TEXT DEFAULT '其他',
          author TEXT DEFAULT '', published_at TEXT, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL,
          stars INTEGER DEFAULT 0, comments INTEGER DEFAULT 0, license TEXT DEFAULT 'UNKNOWN',
          raw_json TEXT NOT NULL DEFAULT '{}', score INTEGER DEFAULT 0, scores_json TEXT DEFAULT '{}',
          evidence_notes TEXT DEFAULT '', risk TEXT DEFAULT '', target_customer TEXT DEFAULT '',
          offer TEXT DEFAULT '', next_test TEXT DEFAULT '', stage TEXT NOT NULL DEFAULT '待评估',
          notes TEXT DEFAULT '', estimated_price REAL DEFAULT 0, estimated_cost REAL DEFAULT 0,
          estimated_hours REAL DEFAULT 0, realized_revenue REAL DEFAULT 0, ai_report TEXT DEFAULT '',
          is_demo INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_opp_score ON opportunities(score DESC);
        CREATE INDEX IF NOT EXISTS idx_opp_stage ON opportunities(stage);
        CREATE TABLE IF NOT EXISTS experiments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
          hypothesis TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL DEFAULT '计划中',
          contacts INTEGER DEFAULT 0, replies INTEGER DEFAULT 0, orders INTEGER DEFAULT 0,
          revenue REAL DEFAULT 0, cost REAL DEFAULT 0, notes TEXT DEFAULT '',
          due_date TEXT DEFAULT '', created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS popularity_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
          observed_day TEXT NOT NULL, stars INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
          UNIQUE(opportunity_id,observed_day)
        );
        CREATE INDEX IF NOT EXISTS idx_history_opp ON popularity_history(opportunity_id,observed_day);
        CREATE TABLE IF NOT EXISTS scans (
          id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, finished_at TEXT,
          status TEXT DEFAULT 'running', found INTEGER DEFAULT 0,
          inserted INTEGER DEFAULT 0, updated INTEGER DEFAULT 0,
          detail_json TEXT DEFAULT '{}'
        );
        CREATE TABLE IF NOT EXISTS rss_feeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE, url TEXT NOT NULL UNIQUE, enabled INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS watch_keywords (
          id INTEGER PRIMARY KEY AUTOINCREMENT, term TEXT NOT NULL UNIQUE, enabled INTEGER DEFAULT 1
        );
        ''')
        # V1.1: source-specific, persistent schedules. Existing opportunities remain intact.
        c.executescript('''
        CREATE TABLE IF NOT EXISTS source_configs (
          source TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1,
          interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK(interval_minutes BETWEEN 60 AND 10080),
          feed_url TEXT NOT NULL DEFAULT '',
          last_attempt_at TEXT, last_success_at TEXT,
          last_status TEXT NOT NULL DEFAULT 'never', last_message TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_sources_attempt ON source_configs(last_attempt_at);
        ''')
        from . import config
        defaults=[('github',1,1440),('github_trending',1,720),('hn',1,720),('rss',1,360),
                  ('x',int(config.X_ENABLED),1440),('xianyu',0,1440),('xiaohongshu',0,1440),('1688',0,1440)]
        c.executemany('''INSERT OR IGNORE INTO source_configs(source,enabled,interval_minutes)
                        VALUES(?,?,?)''',defaults)
        if 'watch_keywords' not in existing:
            c.executemany('INSERT INTO watch_keywords(term) VALUES(?)',[(k,) for k in ['mcp','claude code','ai agent','automation workflow']])
        if 'rss_feeds' not in existing:
            c.executemany('INSERT INTO rss_feeds(name,url) VALUES(?,?)',[
                ('GitHub Changelog','https://github.blog/changelog/feed/'),
                ('Cloudflare Blog','https://blog.cloudflare.com/rss/')])

def fingerprint(item):
    if item.get('source_id'):
        basis=item['source']+':'+str(item['source_id'])
    else:
        basis=item['source']+':'+re.sub(r'[/?#]+$','',item['source_url']).lower()
    return hashlib.sha256(basis.encode()).hexdigest()

def snapshot(c,oid,item):
    day=now()[:10]
    c.execute('''INSERT INTO popularity_history(opportunity_id,observed_day,stars,comments)
      VALUES(?,?,?,?) ON CONFLICT(opportunity_id,observed_day) DO UPDATE SET
      stars=excluded.stars,comments=excluded.comments''',
      (oid,day,item.get('stars',0),item.get('comments',0)))

def insert_item(c,item):
    f=fingerprint(item)
    found=c.execute('SELECT id FROM opportunities WHERE fingerprint=?',(f,)).fetchone()
    if found:
        rule=score_item(item)
        c.execute('''UPDATE opportunities SET last_seen=?, stars=?, comments=?, title=?, summary=?,
          published_at=?, license=?, raw_json=?, score=?, scores_json=?, evidence_notes=?, risk=? WHERE id=?''',
          (now(),item.get('stars',0),item.get('comments',0),item['title'][:350],
           (item.get('summary') or '')[:3000],item.get('published_at'),item.get('license','UNKNOWN'),
           json.dumps(item.get('raw',{}),ensure_ascii=False)[:30000],rule['score'],json.dumps(rule['scores']),
           rule['evidence_notes'],rule['risk'],found['id']))
        snapshot(c,found['id'],item)
        return False
    rule=score_item(item)
    c.execute('''INSERT INTO opportunities (fingerprint,source,source_id,source_url,title,summary,category,author,
      published_at,first_seen,last_seen,stars,comments,license,raw_json,score,scores_json,evidence_notes,risk,
      target_customer,offer,next_test,estimated_price,estimated_cost,estimated_hours,is_demo)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(
        f,item['source'],str(item.get('source_id','')),item['source_url'],item['title'][:350],
        (item.get('summary') or '')[:3000],rule['category'],item.get('author',''),item.get('published_at'),
        now(),now(),item.get('stars',0),item.get('comments',0),item.get('license','UNKNOWN'),
        json.dumps(item.get('raw',{}),ensure_ascii=False)[:30000],rule['score'],json.dumps(rule['scores']),
        rule['evidence_notes'],rule['risk'],rule['target_customer'],rule['offer'],rule['next_test'],
        rule['estimated_price'],rule['estimated_cost'],rule['estimated_hours'],int(item.get('is_demo',0))))
    oid=c.execute('SELECT last_insert_rowid()').fetchone()[0]
    snapshot(c,oid,item)
    return True

def item_dict(row):
    r=dict(row)
    r['scores']=json.loads(r.pop('scores_json') or '{}')
    r.pop('raw_json',None)
    return r
