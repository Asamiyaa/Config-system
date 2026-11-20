import os
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / '.env', override=False)

def envbool(key, default=False):
    return os.getenv(key, '1' if default else '0').strip().lower() in ('1', 'true', 'yes', 'on')

HOST = os.getenv('HOST','127.0.0.1')
PORT = int(os.getenv('PORT','8767'))
DATA_DIR = Path(os.getenv('DATA_DIR','./data'))
if not DATA_DIR.is_absolute(): DATA_DIR = ROOT / DATA_DIR
DB_PATH = DATA_DIR / 'opportunities.sqlite3'
TIMEZONE = os.getenv('TIMEZONE','Asia/Shanghai')
try: TZ = ZoneInfo(TIMEZONE)
except Exception: TZ = ZoneInfo('UTC')
AUTO_SCAN = envbool('AUTO_SCAN', True)
SCAN_TIME = os.getenv('SCAN_TIME','09:00')
SCAN_DAYS = max(1,min(60,int(os.getenv('SCAN_DAYS','14'))))
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN','').strip()
X_ENABLED = envbool('X_ENABLED')
X_BEARER_TOKEN = os.getenv('X_BEARER_TOKEN','').strip()
X_QUERY = os.getenv('X_QUERY','("AI agent" OR "MCP") -is:retweet lang:en')
LLM_BASE_URL = os.getenv('LLM_BASE_URL','').strip().rstrip('/')
LLM_API_KEY = os.getenv('LLM_API_KEY','').strip()
LLM_MODEL = os.getenv('LLM_MODEL','').strip()
