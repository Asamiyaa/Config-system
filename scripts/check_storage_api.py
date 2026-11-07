import os,sys,tempfile,sqlite3
from contextlib import closing
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);data=root/'data';data.mkdir()
 sqlite3.connect(data/'wealth_os.sqlite3').close()
 with patch.dict(os.environ,{'WEALTH_OS_DATA_DIR':str(data),'WEALTH_OS_ARCHIVE_DIR':str(root/'vault'),'DISABLE_DEMO_ACCOUNT':'0'}):
  with patch('threading.Thread.start'):
   import server
  with TestClient(server.app) as client:
   version=client.get('/api/app-version')
   assert version.headers['cache-control']=='no-store'
   html=client.get('/')
   assert html.headers['cache-control']=='no-store'
   assert f'content="{version.json()["version"]}"' in html.text
   assert '/static/app-update.js?v='+version.json()['version'] in html.text
   assert 'must-revalidate' in client.get('/static/app-update.js').headers['cache-control']
   assert client.post('/api/login',json={'username':'demo','password':'Demo1234!'}).status_code==200
   board=client.post('/api/boards').json()['id']
   payload={'title':'历史保存测试','version':0,'scene':{'elements':[{'id':'test'}],'files':{}}}
   assert client.put('/api/boards/'+board,json=payload).status_code==200
   assert client.put('/api/boards/'+board,json=payload).status_code==409
   saved=client.get('/api/boards/'+board).json()
   assert saved['version']==1 and len(saved['revisions'])==1
   assert client.get('/api/boards/'+board+'/revisions/1').json()['scene']==payload['scene']
   server.init_db()
   assert client.get('/api/boards/'+board).json()['scene']==payload['scene']
   assert client.get('/api/boards').json()['boards'][0]['id']==board
   with TestClient(server.app) as stranger:
    assert stranger.get('/api/boards/'+board).status_code==401
   state=client.get('/api/state').json()['state']
   state['subscriptions']=[{'name':'AI test','fee':99}];state['agentStatuses']={'work':'busy'};state['notebookEntries']=[{'text':'个人记录持久化测试'}]
   result=client.put('/api/state',json={'state':state})
   assert result.status_code==200,result.text
   assert not result.json().get('storageWarning'),result.text
   assert client.get('/api/state').json()['state']==state
   server.init_db()
   assert client.get('/api/state').json()['state']==state
   status=client.get('/api/personal-vault/status').json();assert status['ok'],status
   assert server._restore_personal_vault('demo')==state
   with closing(sqlite3.connect(data/'backups/latest.sqlite3')) as db:
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
   with patch.object(server,'_write_personal_vault',side_effect=OSError('simulated archive failure')):
    result=client.put('/api/state',json={'state':state})
    assert result.status_code==200 and result.json()['storageWarning']
   assert client.get('/api/state').json()['state']==state
 # Existing server db() contexts are transaction contexts, so explicitly collect test-only handles on Windows.
 import gc;gc.collect()
print('PASS: authenticated API save, restart, SQLite snapshot, external vault roundtrip and truthful backup warning')
