from contextlib import closing
import os
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from data_store import prepare_data_dir, backup_database

class DurableStorageTests(unittest.TestCase):
 def test_migration_keeps_accounts_state_and_jobs_across_updates(self):
  with tempfile.TemporaryDirectory() as tmp:
   base=Path(tmp)/'release';legacy=base/'data';legacy.mkdir(parents=True)
   payload={'subscriptions':[{'name':'AI','fee':99}],'growth':{'outputs':[{'text':'个人记录'}]},'agentStatuses':{'work':'busy'}}
   with closing(sqlite3.connect(legacy/'wealth_os.sqlite3')) as db:
    db.execute('CREATE TABLE user_state (user_id INTEGER PRIMARY KEY, state_json TEXT)')
    db.execute('INSERT INTO user_state VALUES (1,?)',(json.dumps(payload),));db.commit()
   (legacy/'scheduled_jobs.json').write_text('[{"id":"mine"}]')
   durable=Path(tmp)/'durable'
   with patch.dict(os.environ,{'WEALTH_OS_DATA_DIR':str(durable)}):
    self.assertEqual(prepare_data_dir(base),durable)
    latest=backup_database(durable/'wealth_os.sqlite3')
    with closing(sqlite3.connect(latest)) as db:
     self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0],'ok')
     self.assertEqual(json.loads(db.execute('SELECT state_json FROM user_state').fetchone()[0]),payload)
    new_release=Path(tmp)/'release-v2';new_release.mkdir()
    prepare_data_dir(new_release)
    self.assertEqual((durable/'scheduled_jobs.json').read_text(),'[{"id":"mine"}]')
    with closing(sqlite3.connect(durable/'wealth_os.sqlite3')) as db:
     self.assertEqual(json.loads(db.execute('SELECT state_json FROM user_state').fetchone()[0]),payload)
    self.assertTrue((legacy/'wealth_os.sqlite3').is_file())
 def test_relative_data_directory_is_rejected(self):
  with patch.dict(os.environ,{'WEALTH_OS_DATA_DIR':'relative'}):
   with self.assertRaises(RuntimeError):prepare_data_dir(Path.cwd())

if __name__=='__main__':unittest.main()
