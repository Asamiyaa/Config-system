import os,sys,tempfile,sqlite3,gc
from pathlib import Path
from contextlib import closing
from unittest.mock import patch
from fastapi.testclient import TestClient
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp);data=root/'data';data.mkdir();sqlite3.connect(data/'wealth_os.sqlite3').close()
 with patch.dict(os.environ,{'WEALTH_OS_DATA_DIR':str(data),'WEALTH_OS_ARCHIVE_DIR':str(root/'vault'),'DISABLE_DEMO_ACCOUNT':'0','DISABLE_REGISTRATION':'0'}):
  with patch('threading.Thread.start'):
   import server
  with TestClient(server.app) as c:
   assert c.get('/api/ui-learning').status_code==401
   assert c.post('/api/login',json={'username':'demo','password':'Demo1234!'}).status_code==200
   initial=c.get('/api/ui-learning').json()
   doc={'customItems':[{'id':'qa','title':'test','prompt':'test'}],'modules':[],'favorites':['recipe-13'],'progress':{'recipe-13':'practiced'},'images':{'qa':'data:image/png;base64,dGVzdA=='}}
   body={'userId':initial['userId'],'version':0,'document':doc}
   assert c.put('/api/ui-learning',json=body).json()['version']==1
   assert c.put('/api/ui-learning',json=body).status_code==409
   server.init_db()
   assert c.get('/api/ui-learning').json()['document']==doc
   with TestClient(server.app) as other:
    assert other.post('/api/register',json={'username':'audit-other','password':'Independent123!'}).status_code==200
    assert other.get('/api/ui-learning').json()['document']=={}
    assert other.put('/api/ui-learning',json=body).status_code==409
   with closing(sqlite3.connect(data/'backups/latest.sqlite3')) as backup:
    assert backup.execute('SELECT version FROM ui_learning').fetchone()[0]==1
   assert c.put('/api/ui-learning',json={**body,'version':1,'document':{'modules':'bad'}}).status_code==422
   with patch.object(server,'backup_database',side_effect=OSError('full')):
    assert c.put('/api/ui-learning',json={**body,'version':1}).json()['storageWarning']
 gc.collect()
print('PASS UI learning: auth, account isolation, conflict, restart, images, SQLite backup, validation and backup failure signal')
