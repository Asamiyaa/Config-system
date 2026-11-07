"""Durable data directory and transaction-consistent SQLite snapshots."""
from contextlib import closing
import os
import shutil
import sqlite3
import threading
from datetime import datetime
from pathlib import Path

BACKUP_LOCK = threading.Lock()

def prepare_data_dir(base: Path) -> Path:
    legacy = base / 'data'
    raw = os.getenv('WEALTH_OS_DATA_DIR', '').strip()
    target = Path(raw).expanduser() if raw else legacy
    if not target.is_absolute():
        raise RuntimeError('WEALTH_OS_DATA_DIR must be an absolute persistent directory')
    target.mkdir(parents=True, exist_ok=True)
    if target.resolve() != legacy.resolve():
        # Never overwrite an existing installation; keep the original as a rollback copy.
        source, dest = legacy / 'wealth_os.sqlite3', target / 'wealth_os.sqlite3'
        if source.exists() and not dest.exists():
            snapshot(source, dest)
        for name in ('scheduled_jobs.json', 'scheduler_settings.json'):
            if (legacy / name).exists() and not (target / name).exists():
                shutil.copy2(legacy / name, target / name)
    return target

def snapshot(source: Path, dest: Path) -> None:
    with BACKUP_LOCK:
        dest.parent.mkdir(parents=True, exist_ok=True)
        temp = dest.with_suffix('.tmp')
        try:
            with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(temp)) as out:
                src.backup(out)
                if out.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('SQLite backup integrity check failed')
            temp.replace(dest)
        finally:
            if temp.exists():
                temp.unlink()

def backup_database(source: Path) -> Path:
    root = source.parent / 'backups'
    baseline = root / (datetime.now().strftime('%Y-%m-%d') + '.sqlite3')
    if not baseline.exists():
        snapshot(source, baseline)
    latest = root / 'latest.sqlite3'
    snapshot(source, latest)
    return latest
