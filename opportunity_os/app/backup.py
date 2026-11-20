"""Online-consistent SQLite backup; safe with WAL in use."""
from pathlib import Path
from datetime import datetime
import sqlite3
from . import config, db

def backup_database(retain=30):
    source_path=db.current_db_path()
    if not source_path.exists():raise FileNotFoundError('数据库不存在；请先启动应用')
    target_dir=source_path.parent/'backups';target_dir.mkdir(parents=True,exist_ok=True)
    filename='opportunity_os_'+datetime.now(config.TZ).strftime('%Y%m%d_%H%M%S')+'.sqlite3'
    path=target_dir/filename
    with sqlite3.connect(str(source_path)) as source,sqlite3.connect(str(path)) as dest:
        source.backup(dest)
    files=sorted(target_dir.glob('opportunity_os_*.sqlite3'),reverse=True)
    for extra in files[retain:]:extra.unlink()
    return path

if __name__=='__main__':
    db.init_db()
    print('Backup created:',backup_database())
