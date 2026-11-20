from __future__ import annotations

import copy
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import zipfile
import posixpath
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from data_store import prepare_data_dir, backup_database

from astock_data_backup import fetch_etf_daily as _astock_backup_etf_daily
import gym_catalogue as gymlib

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")
STATIC = BASE / "static"
DATA = prepare_data_dir(BASE)
DB_PATH = DATA / "wealth_os.sqlite3"
SEED_PATH = BASE / "data" / "seed_state.json"
MARKET_LOG_PATH = DATA / "market_refresh_logs.jsonl"
MARKET_PROGRESS_LOCK = __import__("threading").Lock()
MARKET_PROGRESS: dict[str, dict[str, Any]] = {}
DATA.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Wealth OS / 全球资产与执行系统", version="0.1.0")
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "dev-only-change-this-secret-before-deploying"),
    session_cookie="wealth_os_session",
    max_age=60 * 60 * 24 * 7,
    same_site="lax",
    https_only=os.getenv("COOKIE_HTTPS_ONLY", "0") == "1",
)
app.mount("/static", StaticFiles(directory=STATIC), name="static")
app.mount("/materials", StaticFiles(directory=BASE / "reference_materials"), name="materials")

PBKDF2_ITERATIONS = 310_000


def db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, rounds, salt_hex, expected = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def default_state() -> dict[str, Any]:
    with SEED_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def init_db() -> None:
    if DB_PATH.is_file():
        backup_database(DB_PATH)
    with db() as con:
        con.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")
        con.execute("""CREATE TABLE IF NOT EXISTS user_state (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            state_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        con.execute("CREATE TABLE IF NOT EXISTS ui_learning (user_id INTEGER PRIMARY KEY, document TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)")
        con.execute("CREATE TABLE IF NOT EXISTS boards (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, title TEXT NOT NULL, scene TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL)")
        con.execute("CREATE TABLE IF NOT EXISTS board_revisions (board_id TEXT NOT NULL, version INTEGER NOT NULL, scene TEXT NOT NULL, saved_at TEXT NOT NULL, PRIMARY KEY(board_id,version))")
        if os.getenv("DISABLE_DEMO_ACCOUNT", "0") != "1":
            exists = con.execute("SELECT id FROM users WHERE username='demo'").fetchone()
            if not exists:
                cur = con.execute(
                    "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
                    ("demo", hash_password("Demo1234!"), datetime.now(timezone.utc).isoformat()),
                )
                con.execute(
                    "INSERT INTO user_state(user_id,state_json,updated_at) VALUES(?,?,?)",
                    (cur.lastrowid, json.dumps(default_state(), ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
                )


init_db()


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=256)


class StatePayload(BaseModel):
    state: dict[str, Any]


class GymPlanPayload(BaseModel):
    """周训练计划生成参数（与前端 camelCase 字段一致）。"""

    goal: str = Field(default="hypertrophy", max_length=32)
    daysPerWeek: int = Field(default=3, ge=1, le=7)
    equipment: list[str] = Field(default_factory=list)
    sessionMinutes: int = Field(default=60, ge=20, le=150)


def current_user(request: Request) -> sqlite3.Row:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="请先登录")
    with db() as con:
        user = con.execute("SELECT id, username FROM users WHERE id=?", (int(user_id),)).fetchone()
    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="登录状态失效，请重新登录")
    return user


def user_state(user_id: int) -> dict[str, Any]:
    with db() as con:
        row = con.execute("SELECT state_json FROM user_state WHERE user_id=?", (user_id,)).fetchone()
        if row:
            try:
                return json.loads(row["state_json"])
            except json.JSONDecodeError:
                pass
        username_row = con.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
        restored = _restore_personal_vault(str(username_row["username"])) if username_row else None
        state = restored or default_state()
        con.execute(
            "INSERT OR REPLACE INTO user_state(user_id,state_json,updated_at) VALUES(?,?,?)",
            (user_id, json.dumps(state, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
        )
        return state



# ---- External personal-data vault (survives program-folder upgrades) -------
def _archive_pointer_path() -> Path:
    root = Path(os.getenv("APPDATA") or (Path.home() / ".wealth_os")) / "WealthOS"
    return root / "archive_path.txt"


def _external_archive_root() -> Path:
    env = os.getenv("WEALTH_OS_ARCHIVE_DIR", "").strip()
    if env:
        return Path(env).expanduser()
    pointer = _archive_pointer_path()
    if pointer.is_file():
        try:
            saved = pointer.read_text(encoding="utf-8").strip()
            if saved:
                return Path(saved).expanduser()
        except Exception:
            pass
    default = r"D:\WEALTH_OS_DAILY_ARCHIVE" if os.name == "nt" else str(Path.home() / ".local/share/xindeng/archive")
    return Path(env or default).expanduser()


def _remember_archive_root(raw: str) -> None:
    pointer = _archive_pointer_path()
    pointer.parent.mkdir(parents=True, exist_ok=True)
    tmp = pointer.with_suffix(".tmp")
    tmp.write_text(raw, encoding="utf-8")
    tmp.replace(pointer)


def _safe_user_filename(username: str) -> str:
    safe = re.sub(r"[^0-9A-Za-z._-]+", "_", username).strip("._") or "user"
    return safe[:80]


def _personal_vault_path(username: str) -> Path:
    return _external_archive_root() / "PERSONAL_DATA" / f"WEALTH_OS_PERSONAL_DATA_{_safe_user_filename(username)}.xlsx"


VAULT_LOCK = __import__("threading").RLock()

def _write_personal_vault(username: str, state: dict[str, Any], scheduler_jobs: list[dict[str, Any]] | None = None) -> Path:
    with VAULT_LOCK:
        return _write_personal_vault_locked(username, state, scheduler_jobs)

def _write_personal_vault_locked(username: str, state: dict[str, Any], scheduler_jobs: list[dict[str, Any]] | None = None) -> Path:
    """Mirror all user-owned state to an external Excel vault.

    The workbook lives outside the application folder, so replacing/upgrading the
    program cannot erase tasks, health/fitness records, daily logs, allocations,
    notes, mistakes, check-ins, or other state. Full_State_JSON is the canonical
    lossless restore payload; the other sheets are readable summaries.
    """
    try:
        from openpyxl import Workbook, load_workbook
        from openpyxl.styles import Font, PatternFill
    except Exception as exc:
        raise RuntimeError(f"缺少 openpyxl，无法写入个人 Excel 保险库：{exc}")
    path = _personal_vault_path(username)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        wb = load_workbook(path)
        for name in list(wb.sheetnames):
            del wb[name]
    else:
        wb = Workbook()
        del wb[wb.sheetnames[0]]
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    ws = wb.create_sheet("Overview")
    ws.append(["WEALTH OS 个人数据保险库", username])
    ws.append(["最后同步", now])
    ws.append(["用途", "程序升级/覆盖后恢复个人配置；不保存密码。Full_State_JSON 为无损恢复源。"])
    ws.append(["外部目录", str(path.parent)])
    ws.column_dimensions["A"].width=24; ws.column_dimensions["B"].width=90
    for c in ws[1]: c.font=Font(bold=True, color="FFFFFF"); c.fill=PatternFill("solid", fgColor="183A32")

    # Human-readable top-level inventory. Values remain JSON so nested data is not flattened/lost.
    inv = wb.create_sheet("Personal_Data_Index")
    inv.append(["数据域", "记录数/类型", "完整内容(JSON)"])
    for key, value in state.items():
        count = len(value) if isinstance(value, (list, dict)) else type(value).__name__
        inv.append([key, count, json.dumps(value, ensure_ascii=False, allow_nan=False)])
    inv.column_dimensions["A"].width=28; inv.column_dimensions["B"].width=16; inv.column_dimensions["C"].width=110
    for c in inv[1]: c.font=Font(bold=True, color="FFFFFF"); c.fill=PatternFill("solid", fgColor="183A32")

    full = wb.create_sheet("Full_State_JSON")
    payload = json.dumps(state, ensure_ascii=False, allow_nan=False)
    # Excel cell max is 32767 chars: chunk losslessly.
    chunk=30000
    full.append(["part", "json_chunk"])
    for i in range(0, len(payload), chunk): full.append([i//chunk+1, payload[i:i+chunk]])
    full.column_dimensions["A"].width=10; full.column_dimensions["B"].width=120
    for c in full[1]: c.font=Font(bold=True, color="FFFFFF"); c.fill=PatternFill("solid", fgColor="183A32")

    jobs = scheduler_jobs
    if jobs is None:
        try:
            sp = DATA / "scheduled_jobs.json"
            jobs = json.loads(sp.read_text(encoding="utf-8")) if sp.exists() else []
        except Exception: jobs=[]
    sj = wb.create_sheet("Scheduled_Tasks")
    sj.append(["id","name","description","taskType","frequency","time","enabled","lastRun","lastStatus","lastMessage"])
    for j in jobs or []:
        sj.append([j.get(k,"") for k in ["id","name","description","taskType","frequency","time","enabled","lastRun","lastStatus","lastMessage"]])
    for c in sj[1]: c.font=Font(bold=True, color="FFFFFF"); c.fill=PatternFill("solid", fgColor="183A32")
    for col,w in zip("ABCDEFGHIJ",[22,38,60,20,16,12,12,25,16,70]): sj.column_dimensions[col].width=w

    tmp=path.with_name(path.stem+".tmp.xlsx")
    wb.save(tmp); tmp.replace(path)
    # Keep one automatic baseline per day; scheduled/manual archive runs create additional dated copies.
    hist = path.parent / "History" / datetime.now().strftime("%Y-%m-%d")
    hist.mkdir(parents=True, exist_ok=True)
    baseline = hist / f"{path.stem}_baseline.xlsx"
    if not baseline.exists():
        import shutil as _shutil
        _shutil.copy2(path, baseline)
    return path


def _restore_personal_vault(username: str) -> dict[str, Any] | None:
    path=_personal_vault_path(username)
    if not path.is_file(): return None
    try:
        from openpyxl import load_workbook
        wb=load_workbook(path, read_only=True, data_only=True)
        if "Full_State_JSON" not in wb.sheetnames: return None
        ws=wb["Full_State_JSON"]
        chunks=[]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row and len(row)>1 and row[1] is not None: chunks.append((int(row[0] or 0), str(row[1])))
        chunks.sort(key=lambda x:x[0])
        value=json.loads("".join(x[1] for x in chunks))
        return value if isinstance(value, dict) else None
    except Exception:
        return None

STORAGE_WARNINGS: dict[int, str] = {}

def save_user_state(user_id: int, state: dict[str, Any]) -> None:
    # Avoid storing unexpectedly huge or executable payloads in the single JSON state document.
    serialized = json.dumps(state, ensure_ascii=False, allow_nan=False)
    if len(serialized) > 5_000_000:
        raise HTTPException(status_code=413, detail="状态数据过大，未保存")
    with db() as con:
        con.execute(
            "INSERT OR REPLACE INTO user_state(user_id,state_json,updated_at) VALUES(?,?,?)",
            (user_id, serialized, datetime.now(timezone.utc).isoformat()),
        )
    STORAGE_WARNINGS.pop(user_id, None)
    try:
        backup_database(DB_PATH)
    except Exception:
        STORAGE_WARNINGS[user_id] = "数据库已保存，但数据库备份失败，请检查数据目录权限和空间。"
    with db() as con:
        u = con.execute("SELECT username FROM users WHERE id=?", (user_id,)).fetchone()
    if u:
        try:
            _write_personal_vault(str(u["username"]), state)
        except Exception as exc:
            # SQLite save remains authoritative for the current run; surface archive health via API later.
            STORAGE_WARNINGS[user_id] = "数据库已保存，但外部归档失败，请在设置中检查归档目录。"
            print(f"[personal-vault] mirror failed: {type(exc).__name__}: {exc}")


@app.get("/")
def index() -> HTMLResponse:
    html = (STATIC / "index.html").read_text(encoding="utf-8")
    # Bind the checker to this document, never to a later API response.
    html = html.replace("<head>", '<head><meta name="app-version" content="' + APP_VERSION + '">', 1)
    html = re.sub(r'(/static/[^"\s?]+\.(?:js|css))(?:\?[^"\s]*)?', lambda m: m[1] + '?v=' + APP_VERSION, html)
    return HTMLResponse(html, headers={"Cache-Control": "no-store"})


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "service": "wealth-os", "version": app.version, "now": datetime.now(timezone.utc).isoformat()}


@app.get("/api/config")
def public_config() -> dict[str, bool]:
    """Expose only browser-safe switches; never return secrets or environment values."""
    return {
        "demoEnabled": os.getenv("DISABLE_DEMO_ACCOUNT", "0") != "1",
        "registrationEnabled": os.getenv("DISABLE_REGISTRATION", "0") != "1",
    }


@app.get("/api/session")
def session_info(request: Request) -> dict[str, Any]:
    user_id = request.session.get("user_id")
    if not user_id:
        return {"authenticated": False}
    with db() as con:
        user = con.execute("SELECT username FROM users WHERE id=?", (int(user_id),)).fetchone()
    if not user:
        request.session.clear()
        return {"authenticated": False}
    return {"authenticated": True, "username": user["username"]}


@app.post("/api/register")
def register(payload: Credentials, request: Request) -> dict[str, Any]:
    if os.getenv("DISABLE_REGISTRATION", "0") == "1":
        raise HTTPException(status_code=403, detail="注册已关闭，请联系管理员")
    username = payload.username.strip()
    if len(username) < 3 or any(ch.isspace() for ch in username):
        raise HTTPException(status_code=400, detail="用户名至少3位且不能包含空格")
    if payload.password.lower() == username.lower() or len(payload.password) < 10:
        raise HTTPException(status_code=400, detail="密码请至少10位，并避免与用户名相同")
    with db() as con:
        try:
            cur = con.execute(
                "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
                (username, hash_password(payload.password), datetime.now(timezone.utc).isoformat()),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="用户名已存在")
        uid = cur.lastrowid
        restored = _restore_personal_vault(username)
        initial_state = restored or default_state()
        con.execute(
            "INSERT INTO user_state(user_id,state_json,updated_at) VALUES(?,?,?)",
            (uid, json.dumps(initial_state, ensure_ascii=False), datetime.now(timezone.utc).isoformat()),
        )
    request.session.clear()
    request.session["user_id"] = uid
    return {"ok": True, "username": username}


@app.post("/api/login")
def login(payload: Credentials, request: Request) -> dict[str, Any]:
    with db() as con:
        user = con.execute("SELECT id, username, password_hash FROM users WHERE username=?", (payload.username.strip(),)).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码不正确")
    request.session.clear()
    request.session["user_id"] = user["id"]
    return {"ok": True, "username": user["username"]}


@app.post("/api/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@app.get("/api/state")
def get_state(request: Request) -> dict[str, Any]:
    user = current_user(request)
    return {"state": user_state(int(user["id"]))}


@app.put("/api/state")
def put_state(payload: StatePayload, request: Request) -> dict[str, Any]:
    user = current_user(request)
    save_user_state(int(user["id"]), payload.state)
    return {"ok": True, "saved_at": datetime.now(timezone.utc).isoformat(), "storageWarning": STORAGE_WARNINGS.get(int(user["id"]))}


# ---- openGym 动作库原生接入 -------------------------------------------------
# 不启动 openGym、不需要 Node/Docker：直接读取其 catalogue 目录，由本进程提供
# 检索、详情、动作媒体与周计划生成。目录不可用时返回可解释状态，不影响健康管理其余功能。

@app.get("/api/gym/status")
def gym_status(request: Request, refresh: bool = False) -> dict[str, Any]:
    current_user(request)
    cat = gymlib.get_catalogue(force=bool(refresh))
    if cat is None:
        return gymlib.unavailable_status()
    return cat.status()


@app.get("/api/gym/facets")
def gym_facets(request: Request) -> dict[str, Any]:
    current_user(request)
    cat = gymlib.get_catalogue()
    if cat is None:
        return {"available": False, "reason": gymlib.unavailable_status()["reason"]}
    data = cat.facets()
    data["available"] = True
    return data


@app.get("/api/gym/exercises")
def gym_exercises(
    request: Request,
    q: str = "",
    bodyPart: str = "",
    equipment: str = "",
    target: str = "",
    category: str = "",
    zone: str = "",
    ids: str = "",
    limit: int = 48,
    offset: int = 0,
) -> dict[str, Any]:
    current_user(request)
    cat = gymlib.get_catalogue()
    if cat is None:
        status = gymlib.unavailable_status()
        return {"available": False, "total": 0, "offset": 0, "limit": 0, "items": [], "reason": status["reason"]}
    result = cat.search(
        q=q,
        body_part=bodyPart,
        equipment=equipment,
        target=target,
        category=category,
        zone=zone,
        ids=ids,
        limit=limit,
        offset=offset,
    )
    result["available"] = True
    return result


@app.get("/api/gym/exercises/{exercise_id}")
def gym_exercise_detail(exercise_id: str, request: Request) -> dict[str, Any]:
    current_user(request)
    cat = gymlib.get_catalogue()
    if cat is None:
        raise HTTPException(status_code=503, detail="openGym 动作库目录不可用")
    item = cat.detail(exercise_id)
    if item is None:
        raise HTTPException(status_code=404, detail="动作不存在")
    return item


@app.get("/api/gym/media/{exercise_id}/{kind}")
def gym_exercise_media(exercise_id: str, kind: str, request: Request) -> FileResponse:
    current_user(request)
    cat = gymlib.get_catalogue()
    if cat is None:
        raise HTTPException(status_code=503, detail="openGym 动作库目录不可用")
    found = cat.media(exercise_id, kind)
    if found is None:
        raise HTTPException(status_code=404, detail="动作媒体不存在")
    path, media_type = found
    return FileResponse(
        path,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=2592000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.post("/api/gym/plan/generate")
def gym_generate_plan(payload: GymPlanPayload, request: Request) -> dict[str, Any]:
    current_user(request)
    cat = gymlib.get_catalogue()
    if cat is None:
        raise HTTPException(status_code=503, detail="openGym 动作库目录不可用，无法生成计划")
    plan, meta = cat.generate_plan(
        goal=payload.goal,
        days_per_week=payload.daysPerWeek,
        equipment=payload.equipment,
        session_minutes=payload.sessionMinutes,
    )
    return {"ok": True, "plan": plan, "meta": meta}


MATERIAL_WORKBOOKS: dict[str, dict[str, str]] = {
    "global-multi-asset-cn": {"filename": "global_multi_asset_allocation_tracker_cn.xlsx", "title": "全球资产配置工作簿（最新中文）", "topic": "全球资产配置"},
    "nasdaq-v3": {"filename": "nasdaq_ai_daily_tracker_v3_leverage_2.xlsx", "title": "纳斯达克 AI + 杠杆跟踪器 V3", "topic": "纳斯达克资产配置"},
    "ashare-latest": {"filename": "A股板块轮动_ETF跟踪_20261009网页核验快照.xlsx", "title": "A股 ETF 跟踪网页核验快照（最新）", "topic": "A股 ETF 轮动"},
    "newconfig-90d": {"filename": "新登配置_90天落地与持续跟踪.xlsx", "title": "新登配置 90 天落地与持续跟踪", "topic": "新登配置 / 90天"},
    "ashare-tracker": {"filename": "A股板块轮动_ETF自动跟踪.xlsx", "title": "A股板块轮动 ETF 自动跟踪（原始版）", "topic": "A股 ETF 轮动"},
    "global-multi-asset-original": {"filename": "global_multi_asset_allocation_tracker.xlsx", "title": "全球多资产配置工作簿（原始版）", "topic": "全球资产配置"},
    "nasdaq-v2": {"filename": "nasdaq_ai_daily_tracker_v2.xlsx", "title": "纳斯达克 AI 跟踪器 V2", "topic": "纳斯达克资产配置"},
}


def _xlsx_col_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref or "")
    if not letters:
        return 0
    value = 0
    for char in letters.group(0):
        value = value * 26 + ord(char) - 64
    return value - 1


def _xlsx_text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    return "".join((child.text or "") for child in node.iter() if child.tag.endswith("}t") or child.tag == "t")


def _read_xlsx_preview(path: Path) -> dict[str, Any]:
    """Read cached/displayable cell values using only Python's standard library.

    The original XLSX remains intact for formulas, formatting and charts; this
    endpoint is a browser-friendly read-only preview of saved cell values.
    """
    if not path.is_file() or not zipfile.is_zipfile(path):
        raise HTTPException(status_code=404, detail="工作簿文件不存在或不是有效的 XLSX")
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
          "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          "rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
    try:
        with zipfile.ZipFile(path) as archive:
            names = set(archive.namelist())
            shared: list[str] = []
            if "xl/sharedStrings.xml" in names:
                root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
                shared = [_xlsx_text(si) for si in root.findall("m:si", ns)]
            workbook = ET.fromstring(archive.read("xl/workbook.xml"))
            rel_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            targets = {rel.attrib.get("Id"): rel.attrib.get("Target", "") for rel in rel_root.findall("rel:Relationship", ns)}
            date_style_ids: set[int] = set()
            if "xl/styles.xml" in names:
                style_root = ET.fromstring(archive.read("xl/styles.xml"))
                custom_formats = {}
                num_formats = style_root.find("m:numFmts", ns)
                if num_formats is not None:
                    for fmt_node in num_formats.findall("m:numFmt", ns):
                        try: custom_formats[int(fmt_node.attrib.get("numFmtId", "0"))] = fmt_node.attrib.get("formatCode", "")
                        except ValueError: pass
                xfs_node = style_root.find("m:cellXfs", ns)
                if xfs_node is not None:
                    built_in_dates = set(range(14, 23)) | {45, 46, 47}
                    for style_idx, xf in enumerate(xfs_node.findall("m:xf", ns)):
                        try: fmt_id = int(xf.attrib.get("numFmtId", "0"))
                        except ValueError: fmt_id = 0
                        fmt_code = custom_formats.get(fmt_id, "")
                        if fmt_id in built_in_dates or re.search(r"(?i)(yyyy|yy).{0,4}(mm|m|dd|d)|(dd|d).{0,4}(mm|m).{0,4}(yy|yyyy)", fmt_code):
                            date_style_ids.add(style_idx)
            sheets: list[dict[str, Any]] = []
            for sh in workbook.findall("m:sheets/m:sheet", ns):
                name = sh.attrib.get("name", "Sheet")
                rid = sh.attrib.get(f"{{{ns['r']}}}id", "")
                target = targets.get(rid, "")
                if not target:
                    continue
                if target.startswith("/"):
                    sheet_path = target.lstrip("/")
                else:
                    sheet_path = posixpath.normpath(posixpath.join("xl", target))
                if sheet_path not in names:
                    continue
                sheet_root = ET.fromstring(archive.read(sheet_path))
                data = sheet_root.find("m:sheetData", ns)
                rows: list[dict[str, Any]] = []
                last_row = 0
                if data is not None:
                    for row in data.findall("m:row", ns):
                        row_num = int(row.attrib.get("r", len(rows) + 1))
                        last_row = max(last_row, row_num)
                        if len(rows) >= 500:
                            break
                        cells: dict[int, str] = {}
                        for cell in row.findall("m:c", ns):
                            col = _xlsx_col_index(cell.attrib.get("r", ""))
                            if col < 0 or col >= 80:
                                continue
                            cell_type = cell.attrib.get("t", "")
                            value_node = cell.find("m:v", ns)
                            formula_node = cell.find("m:f", ns)
                            if cell_type == "s" and value_node is not None:
                                try: value = shared[int(value_node.text or "0")]
                                except (ValueError, IndexError): value = value_node.text or ""
                            elif cell_type == "inlineStr":
                                value = _xlsx_text(cell.find("m:is", ns))
                            elif cell_type == "b" and value_node is not None:
                                value = "TRUE" if value_node.text == "1" else "FALSE"
                            elif value_node is not None:
                                value = value_node.text or ""
                                try:
                                    style_idx = int(cell.attrib.get("s", "0"))
                                    if style_idx in date_style_ids and value:
                                        serial = float(value)
                                        dt = datetime(1899, 12, 30, tzinfo=timezone.utc) + timedelta(days=serial)
                                        value = dt.strftime("%Y-%m-%d %H:%M" if serial % 1 else "%Y-%m-%d")
                                except (ValueError, OverflowError, OSError):
                                    pass
                            elif formula_node is not None:
                                value = "=" + (formula_node.text or "")
                            else:
                                value = ""
                            cells[col] = str(value)
                        max_col = max(cells.keys(), default=-1)
                        if max_col < 0:
                            continue
                        values = [cells.get(i, "") for i in range(max_col + 1)]
                        # Excel trackers often preallocate blank rows; omit rows with no saved values.
                        if not any(str(v).strip() for v in values):
                            continue
                        rows.append({"number": row_num, "cells": values})
                sheets.append({"name": name, "rows": rows, "rowCount": len(rows), "lastRow": last_row, "truncated": last_row > 500})
            return {"filename": path.name, "sheets": sheets, "previewOnly": True,
                    "notice": "显示 XLSX 内可读取的已保存单元格值；公式计算结果、图表、合并/样式等请下载原始文件核对。"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"解析工作簿失败：{type(exc).__name__}: {str(exc)[:180]}")


@app.get("/api/materials")
def list_materials(request: Request) -> dict[str, Any]:
    current_user(request)
    items = []
    for key, item in MATERIAL_WORKBOOKS.items():
        path = BASE / "reference_materials" / item["filename"]
        items.append({"id": key, **item, "available": path.is_file(), "bytes": path.stat().st_size if path.is_file() else None})
    return {"items": items}


@app.get("/api/materials/{workbook_id}/preview")
def preview_material(workbook_id: str, request: Request) -> dict[str, Any]:
    current_user(request)
    item = MATERIAL_WORKBOOKS.get(workbook_id)
    if item is None:
        raise HTTPException(status_code=404, detail="未知的工作簿 ID")
    data = _read_xlsx_preview(BASE / "reference_materials" / item["filename"])
    data.update({"id": workbook_id, "title": item["title"], "topic": item["topic"]})
    return data


def _latest_ohlcv(key: str, period: str = "1y") -> dict[str, Any] | None:
    # Global assets no longer use Yahoo/yfinance. Route to China-accessible public providers.
    from china_global_market import latest_global_asset
    return latest_global_asset(key)


def _a_share_etf(symbol: str) -> dict[str, Any] | None:
    """Primary: AKShare/Eastmoney. Fallback: a-stock-data Tencent K-line adapter.

    Never promote an empty, too-short, invalid, or stale response to a valid update.
    """
    primary_error = None
    try:
        import akshare as ak  # type: ignore
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=700)).strftime("%Y%m%d")
        df = ak.fund_etf_hist_em(symbol=symbol, period="daily", start_date=start_date, end_date=end_date, adjust="")
        if df is None or df.empty or "收盘" not in df.columns or "日期" not in df.columns:
            raise ValueError("AKShare返回空表或缺少日期/收盘字段")
        frame = df[["日期", "收盘"]].copy()
        frame["收盘"] = __import__("pandas").to_numeric(frame["收盘"], errors="coerce")
        frame = frame.dropna().drop_duplicates(subset=["日期"]).sort_values("日期")
        frame = frame[frame["收盘"] > 0]
        if len(frame) < 65:
            raise ValueError(f"AKShare有效日线不足65条（实际{len(frame)}条）")
        close = frame["收盘"].astype(float).tolist()
        last = close[-1]
        prev = close[-2] if len(close) > 1 else None
        ma20 = sum(close[-20:]) / 20
        ma60 = sum(close[-60:]) / 60
        latest_date = str(frame["日期"].iloc[-1])[:10]
        age_days = (datetime.now().date() - datetime.fromisoformat(latest_date[:10]).date()).days
        if age_days > 10:
            raise ValueError(f"AKShare行情过旧：最后日期 {latest_date}，已滞后{age_days}天")
        recent60 = close[-60:]
        return {"code": symbol, "price": last, "changePct": (last / prev - 1) * 100 if prev else None,
                "ma20": ma20, "ma60": ma60,
                "return20dPct": (last / close[-21] - 1) * 100 if len(close) >= 21 else None,
                "return60dPct": (last / close[-61] - 1) * 100 if len(close) >= 61 else None,
                "drawdown60dPct": (last / max(recent60) - 1) * 100 if recent60 else None,
                "date": latest_date, "source": "AKShare / 东方财富历史日线", "sourceTier": "primary",
                "rows": len(frame), "ageDays": age_days,
                "qualityStatus": "valid" if age_days <= 4 else "stale-warning"}
    except Exception as exc:
        primary_error = f"{type(exc).__name__}: {str(exc)[:160]}"
    try:
        backup = _astock_backup_etf_daily(symbol, limit=600, timeout=8.0)
        backup["primaryError"] = primary_error
        backup["sourceSwitchReason"] = "主源失败或未通过完整性/新鲜度校验，自动切换备用源"
        return backup
    except Exception as backup_exc:
        return {"code": symbol, "error": f"主源 AKShare 失败：{primary_error}；备用源 a-stock-data/Tencent 失败：{type(backup_exc).__name__}: {str(backup_exc)[:160]}",
                "source": "AKShare / a-stock-data Tencent fallback", "qualityStatus": "invalid"}


def _a_share_etf_bounded(symbol: str) -> dict[str, Any] | None:
    """Bound the primary-source wait so a hung AKShare call cannot block fallback."""
    primary_pool = ThreadPoolExecutor(max_workers=1, thread_name_prefix="akshare-primary")
    future = primary_pool.submit(_a_share_etf, symbol)
    try:
        return future.result(timeout=15)
    except Exception as exc:
        future.cancel()
        try:
            backup = _astock_backup_etf_daily(symbol, limit=600, timeout=8.0)
            backup["primaryError"] = f"AKShare请求等待超时/异常：{type(exc).__name__}: {str(exc)[:120]}"
            backup["sourceSwitchReason"] = "主源在15秒内未返回，启用有独立超时的备用源"
            return backup
        except Exception as backup_exc:
            return {"code": symbol, "error": f"AKShare主源超时/异常：{type(exc).__name__}: {str(exc)[:120]}；a-stock-data备用源失败：{type(backup_exc).__name__}: {str(backup_exc)[:140]}", "qualityStatus": "invalid"}
    finally:
        primary_pool.shutdown(wait=False, cancel_futures=True)


def _append_market_refresh_log(entry: dict[str, Any]) -> None:
    """Append a persistent JSONL record for every market refresh attempt."""
    try:
        with MARKET_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")
    except OSError:
        pass


@app.get("/api/market/logs")
def market_refresh_logs(request: Request, limit: int = 30) -> dict[str, Any]:
    user = current_user(request)
    limit = max(1, min(int(limit), 100))
    if not MARKET_LOG_PATH.exists():
        return {"logs": []}
    try:
        lines = MARKET_LOG_PATH.read_text(encoding="utf-8").splitlines()
        records = [json.loads(line) for line in lines[-limit * 10:] if line.strip()]
        records = [x for x in records if x.get("username") == user["username"]]
        return {"logs": list(reversed(records[-limit:]))}
    except (OSError, json.JSONDecodeError):
        return {"logs": [], "warning": "行情日志文件暂时无法解析"}


@app.get("/api/market/progress")
def market_refresh_progress(request: Request) -> dict[str, Any]:
    user = current_user(request)
    with MARKET_PROGRESS_LOCK:
        progress = dict(MARKET_PROGRESS.get(user["username"], {}))
    return progress or {"running": False, "completed": 0, "total": 26, "percent": 0, "message": "尚未开始"}


@app.post("/api/market/refresh")
def refresh_market(request: Request) -> dict[str, Any]:
    user = current_user(request)
    username = user["username"]
    symbols = {"NDX": (".NDX", "sina"), "VIX": ("VIX", "sina/jin10"), "US10Y": ("US10Y", "eastmoney"),
               "QQQ": ("QQQ", "sina"), "VOO": ("VOO", "sina"), "GOLD": ("GLD", "sina"),
               "BTC": ("BTCUSD", "jin10"), "GLOBAL_STOCKS": ("ACWI", "sina")}
    codes = ["510300", "510500", "159915", "588000", "512880", "510880", "512480", "512760", "159819", "515050", "512660", "515030", "515790", "512400", "562800", "562500", "512010", "512800"]
    pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="market")
    futures = {}
    for key, (symbol, period) in symbols.items():
        futures[pool.submit(_latest_ohlcv, key, period)] = ("asset", key)
    for code in codes:
        futures[pool.submit(_a_share_etf_bounded, code)] = ("etf", code)
    total_tasks = len(futures)
    started_at = _time.monotonic() if "_time" in globals() else __import__("time").monotonic()
    with MARKET_PROGRESS_LOCK:
        MARKET_PROGRESS[username] = {"running": True, "completed": 0, "total": total_tasks, "percent": 0,
            "message": f"已提交 {total_tasks} 个行情请求，等待数据源返回", "startedAt": datetime.now(timezone.utc).isoformat()}
    assets: dict[str, Any] = {}
    etfs_by_code: dict[str, Any] = {}
    pending = set(futures)
    deadline = started_at + 60
    completed_count = 0
    while pending:
        remaining = deadline - (__import__("time").monotonic())
        if remaining <= 0:
            break
        done, pending = wait(pending, timeout=min(1.0, remaining), return_when=FIRST_COMPLETED)
        for future in done:
            kind, key = futures[future]
            try:
                value = future.result()
            except Exception as exc:
                value = {"error": f"{type(exc).__name__}: {str(exc)[:150]}"}
            value = value or {"error": "供应商没有返回数据"}
            if kind == "asset":
                assets[key] = value
            else:
                etfs_by_code[key] = value
            completed_count += 1
        with MARKET_PROGRESS_LOCK:
            MARKET_PROGRESS[username] = {"running": True, "completed": completed_count, "total": total_tasks,
                "percent": round(completed_count / max(total_tasks, 1) * 100),
                "message": f"已完成 {completed_count}/{total_tasks} 项，等待剩余数据源", "elapsedSeconds": round(__import__("time").monotonic()-started_at, 1)}
    for future in pending:
        kind, key = futures[future]
        if kind == "asset":
            assets[key] = {"symbol": symbols[key][0], "error": "抓取超时（60秒），保留上次快照"}
        else:
            etfs_by_code[key] = {"code": key, "error": "抓取超时（60秒），保留上次快照"}
        future.cancel()
    pool.shutdown(wait=False, cancel_futures=True)
    with MARKET_PROGRESS_LOCK:
        MARKET_PROGRESS[username] = {"running": False, "completed": total_tasks, "total": total_tasks, "percent": 100,
            "message": f"拉取结束：已处理 {total_tasks} 项", "elapsedSeconds": round(__import__("time").monotonic()-started_at, 1)}
    etfs = [etfs_by_code[c] for c in codes]
    success_assets = sum(1 for x in assets.values() if x and "price" in x)
    success_etfs = sum(1 for x in etfs if x and "price" in x)
    refreshed_at = datetime.now(timezone.utc).isoformat()
    success_total = success_assets + success_etfs
    failures = []
    for key, value in assets.items():
        if not value or value.get("error") or value.get("price") is None:
            failures.append({"type": "asset", "key": key, "symbol": symbols.get(key, ("", ""))[0], "error": (value or {}).get("error", "供应商无有效价格"), "source": (value or {}).get("source", "国内多源：新浪财经 / 东方财富 / 金十数据")})
    for value in etfs:
        if not value or value.get("error") or value.get("price") is None:
            failures.append({"type": "etf", "key": (value or {}).get("code", "?"), "symbol": (value or {}).get("code", ""), "error": (value or {}).get("error", "供应商无有效价格"), "source": (value or {}).get("source", "AKShare / 东方财富")})
    quality_warnings = [
        {"type": "asset" if key in assets else "etf", "key": key, "date": value.get("date"), "ageDays": value.get("ageDays"), "source": value.get("source")}
        for key, value in list(assets.items()) + [(str(x.get("code", "?")), x) for x in etfs]
        if value and value.get("qualityStatus") == "stale-warning"
    ]
    refresh_status = "SUCCESS" if success_total == len(assets)+len(etfs) and not quality_warnings else ("PARTIAL" if success_total > 0 else "FAILED")

    # Decision-grade data confidence: market score and data confidence are intentionally separate.
    # Missing values are never treated as zero. Critical factors directly gate leverage/aggressive actions.
    global_total = len(symbols)
    global_valid = {k for k, v in assets.items() if v and v.get("price") is not None and not v.get("error")}
    global_fresh = {k for k in global_valid if (assets[k].get("ageDays") is None or assets[k].get("ageDays", 99) <= 4)}
    critical_checks = {
        "NDX": "NDX" in global_valid,
        # A clearly-labelled realized-vol proxy may keep the risk factor usable, but cannot unlock leverage.
        "RISK_VOL": "VIX" in global_valid,
        "US10Y": "US10Y" in global_valid,
        "US_EQUITY": bool({"QQQ", "VOO"} & global_valid),
    }
    exact_critical_checks = {
        "NDX": critical_checks["NDX"] and not assets["NDX"].get("isProxy"),
        "RISK_VOL": critical_checks["RISK_VOL"] and not assets["VIX"].get("isProxy"),
        "US10Y": critical_checks["US10Y"] and not assets["US10Y"].get("isProxy"),
        "US_EQUITY": any(k in global_valid and not assets[k].get("isProxy") for k in ("QQQ","VOO")),
    }
    critical_ok = sum(1 for ok in critical_checks.values() if ok)
    completeness = success_assets / max(global_total, 1) * 100
    freshness = len(global_fresh) / max(global_total, 1) * 100
    critical_score = critical_ok / len(critical_checks) * 100
    # Source-quality component rewards independently validated rows; stale-warning rows lose credit.
    # Exact primary/backup rows get full source-quality credit; honest factor proxies get 55% credit.
    source_points = sum((0.55 if assets[k].get("isProxy") else 1.0) for k in global_valid if assets[k].get("qualityStatus") != "stale-warning")
    source_quality = source_points / max(global_total, 1) * 100
    data_confidence = round(completeness * .40 + freshness * .25 + source_quality * .15 + critical_score * .20)
    if data_confidence >= 90 and critical_ok == len(critical_checks):
        confidence_level, action_mode = "GREEN", "NORMAL"
    elif data_confidence >= 70:
        confidence_level, action_mode = "YELLOW", "CAUTION"
    elif data_confidence >= 50:
        confidence_level, action_mode = "ORANGE", "DEFENSIVE"
    else:
        confidence_level, action_mode = "RED", "REFERENCE_ONLY"
    exact_critical_ok = sum(1 for ok in exact_critical_checks.values() if ok)
    leverage_allowed_by_data = data_confidence >= 90 and exact_critical_ok == len(exact_critical_checks) and not quality_warnings
    decision_gate = {
        "confidence": data_confidence, "level": confidence_level, "actionMode": action_mode,
        "globalValid": success_assets, "globalTotal": global_total, "fresh": len(global_fresh),
        "criticalPassed": critical_ok, "criticalTotal": len(critical_checks), "critical": critical_checks,
        "exactCriticalPassed": exact_critical_ok, "exactCriticalTotal": len(exact_critical_checks), "exactCritical": exact_critical_checks,
        "proxyAssets": [k for k in global_valid if assets[k].get("isProxy")],
        "leverageAllowed": leverage_allowed_by_data,
        "aggressiveActionAllowed": data_confidence >= 70 and critical_ok >= 3,
        "message": ("数据质量允许执行策略" if action_mode == "NORMAL" else
                    "数据不完整：仅谨慎执行，禁止依赖缺失因子放大仓位" if action_mode == "CAUTION" else
                    "数据质量不足：降低战术仓位，禁止新增杠杆" if action_mode == "DEFENSIVE" else
                    "数据可信度过低：投资建议仅供参考，暂停新增风险与杠杆"),
    }
    log_entry = {"timestamp": refreshed_at, "username": username, "ok": refresh_status == "SUCCESS", "status": refresh_status,
        "success": success_total, "total": len(assets)+len(etfs), "successAssets": success_assets, "totalAssets": len(assets),
        "successEtfs": success_etfs, "totalEtfs": len(etfs), "failures": failures,
        "sources": sorted({str(x.get("source")) for x in list(assets.values())+etfs if x and x.get("source")}), "qualityWarnings": quality_warnings,
        "durationNote": "公开日线接口，可能延迟；不保证交易级实时性", "decisionGate": decision_gate}
    _append_market_refresh_log(log_entry)
    return {"ok": success_total > 0, "status": refresh_status, "refreshedAt": refreshed_at,
        "providerStatus": {"globalAssets": f"{success_assets}/{len(assets)}", "aShareEtfs": f"{success_etfs}/{len(etfs)}"},
        "assets": assets, "etfs": etfs, "failures": failures, "log": log_entry,
        "quality": {"success": success_total, "total": len(assets)+len(etfs), "complete": success_total == len(assets)+len(etfs) and not quality_warnings, "status": refresh_status, "warnings": quality_warnings, "dataConfidence": data_confidence},
        "decisionGate": decision_gate,
        "notice": "抓取值是公开行情接口可得的最近日线/可能延迟数据；不保证实时、不保证完整。部分接口可能失败/超时。宏观、估值、AI变现/融资等人工字段不会自动伪造。",
        "elapsedSeconds": round(__import__("time").monotonic()-started_at, 1)}

# ---- Persistent local scheduler and daily Excel snapshots -----------------
import threading
import time as _time
import shutil
from copy import copy as _copy

SCHEDULER_PATH = DATA / "scheduled_jobs.json"
SCHEDULER_SETTINGS_PATH = DATA / "scheduler_settings.json"
SCHEDULER_LOCK = threading.Lock()
DEFAULT_ARCHIVE_DIR = str(_external_archive_root())
DEFAULT_JOBS = [{
    "id": "daily-investment-prewarm", "name": "全球配置 + 纳斯达克 + A股数据预热与 Excel 归档",
    "description": "拉取可用公开行情、计算基础技术指标并将所有跟踪工作簿按日归档",
    "taskType": "refresh_archive", "frequency": "daily", "time": "07:30", "enabled": True,
    "lastRun": "", "lastStatus": "等待首次执行", "lastMessage": ""
}]


def _read_json_file(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return copy.deepcopy(default)


def _write_json_file(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def _scheduler_jobs() -> list[dict[str, Any]]:
    jobs = _read_json_file(SCHEDULER_PATH, DEFAULT_JOBS)
    if not isinstance(jobs, list):
        jobs = copy.deepcopy(DEFAULT_JOBS)
    if not jobs:
        jobs = copy.deepcopy(DEFAULT_JOBS)
    return jobs


def _scheduler_settings() -> dict[str, Any]:
    return _read_json_file(SCHEDULER_SETTINGS_PATH, {"archiveDir": DEFAULT_ARCHIVE_DIR})


def _collect_market_snapshot() -> dict[str, Any]:
    symbols = {"NDX": ".NDX", "VIX": "VIX", "US10Y": "US10Y", "QQQ": "QQQ", "VOO": "VOO", "GOLD": "GLD", "BTC": "BTCUSD", "GLOBAL_STOCKS": "ACWI"}
    etf_codes = ["510300", "510500", "159915", "588000", "512880", "510880", "512480", "512760", "159819", "515050", "512660", "515030", "515790", "512400", "562800", "562500", "512010", "512800"]
    data: list[dict[str, Any]] = []
    pool = ThreadPoolExecutor(max_workers=12, thread_name_prefix="daily-snapshot")
    futures = {pool.submit(_latest_ohlcv, key, "2y"): ("asset", key, sym) for key, sym in symbols.items()}
    futures.update({pool.submit(_a_share_etf, code): ("etf", code, code) for code in etf_codes})
    done, pending = wait(futures, timeout=55)
    for fut in done:
        kind, key, symbol = futures[fut]
        try:
            row = fut.result() or {}
        except Exception as exc:
            row = {"error": f"{type(exc).__name__}: {str(exc)[:120]}"}
        data.append({"category": kind, "key": key, "symbol": symbol, **row})
    for fut in pending:
        kind, key, symbol = futures[fut]
        data.append({"category": kind, "key": key, "symbol": symbol, "error": "抓取超时；保持空白"})
        fut.cancel()
    pool.shutdown(wait=False, cancel_futures=True)
    return {"capturedAt": datetime.now().astimezone().isoformat(timespec="seconds"), "rows": data,
            "success": sum(1 for x in data if x.get("price") is not None), "total": len(data),
            "note": "仅保存来源返回的有效数据；失败字段留空。行情可能延迟，不构成交易指令。"}


def _write_snapshot_sheet(workbook_path: Path, snapshot: dict[str, Any]) -> None:
    try:
        from openpyxl import load_workbook
        from openpyxl.styles import Font, PatternFill, Alignment
        wb = load_workbook(workbook_path)
        name = "Market_Snapshot"
        if name in wb.sheetnames:
            del wb[name]
        ws = wb.create_sheet(name)
        ws.append(["WEALTH OS 每日行情快照", "抓取时间", snapshot.get("capturedAt", "")])
        ws.append(["说明", snapshot.get("note", "")])
        ws.append(["类别", "标识", "代码", "最新行情日期", "最新价", "涨跌幅%", "MA20", "MA50/60", "MA200", "20日收益%", "60日收益%", "区间高点", "距区间高点%", "数据源", "状态"])
        for r in snapshot.get("rows", []):
            ws.append([r.get("category", ""), r.get("key", ""), r.get("symbol", ""), r.get("date", ""),
                       r.get("price"), r.get("changePct"), r.get("ma20"), r.get("ma50", r.get("ma60")), r.get("ma200"),
                       r.get("return20dPct"), r.get("return60dPct"), r.get("athWindowHigh"),
                       r.get("drawdownFromWindowHighPct", r.get("drawdown60dPct")), r.get("source", ""), "成功" if r.get("price") is not None else r.get("error", "无数据")])
        ws.freeze_panes = "A4"
        ws.auto_filter.ref = f"A3:O{ws.max_row}"
        for cell in ws[3]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="183A32")
            cell.alignment = Alignment(wrap_text=True, vertical="center")
        widths = [13, 18, 16, 16, 14, 14, 14, 14, 14, 14, 14, 14, 16, 40, 30]
        for idx, width in enumerate(widths, 1):
            ws.column_dimensions[chr(64 + idx)].width = width
        ws.sheet_view.showGridLines = False
        if getattr(wb, "calculation", None) is not None:
            wb.calculation.fullCalcOnLoad = True
            wb.calculation.forceFullCalc = True
            wb.calculation.calcMode = "auto"
        wb.save(workbook_path)
    except Exception as exc:
        raise RuntimeError(f"写入行情快照失败 {workbook_path.name}: {type(exc).__name__}: {str(exc)[:140]}")


def _run_scheduled_job(job: dict[str, Any]) -> dict[str, Any]:
    started = datetime.now().astimezone()
    snapshot = _collect_market_snapshot() if job.get("taskType", "refresh_archive") == "refresh_archive" else {
        "capturedAt": started.isoformat(timespec="seconds"), "rows": [], "success": 0, "total": 0,
        "note": "仅归档工作簿，未重新抓取行情。"}
    settings = _scheduler_settings()
    root = Path(str(settings.get("archiveDir") or DEFAULT_ARCHIVE_DIR)).expanduser()
    date_dir = root / started.strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)
    copied, errors = [], []
    for item in MATERIAL_WORKBOOKS.values():
        src = BASE / "reference_materials" / item["filename"]
        if not src.exists():
            errors.append(f"缺少源文件：{src.name}")
            continue
        dst = date_dir / src.name
        # Keep a same-day previous run; version suffix prevents overwrite.
        if dst.exists():
            dst = date_dir / f"{src.stem}_{started.strftime('%H%M%S')}{src.suffix}"
        try:
            shutil.copy2(src, dst)
            if snapshot.get("rows"):
                _write_snapshot_sheet(dst, snapshot)
            copied.append(str(dst))
        except Exception as exc:
            errors.append(f"{src.name}: {str(exc)[:160]}")
    # Personal vaults are external canonical user data. Refresh them and copy into this dated run.
    try:
        with db() as con:
            users = con.execute("SELECT id, username FROM users").fetchall()
        for u in users:
            vault = _write_personal_vault(str(u["username"]), user_state(int(u["id"])), _scheduler_jobs())
            dst = date_dir / vault.name
            if dst.exists(): dst = date_dir / f"{vault.stem}_{started.strftime('%H%M%S')}{vault.suffix}"
            shutil.copy2(vault, dst); copied.append(str(dst))
    except Exception as exc:
        errors.append(f"个人数据保险库: {type(exc).__name__}: {str(exc)[:160]}")
    manifest = {"job": job.get("name", ""), "executedAt": started.isoformat(timespec="seconds"),
                "archiveDirectory": str(date_dir), "snapshot": snapshot, "files": copied, "errors": errors}
    _write_json_file(date_dir / "run_manifest.json", manifest)
    if not copied:
        raise RuntimeError("没有任何工作簿成功归档；" + "; ".join(errors[:3]))
    return {"files": len(copied), "dataSuccess": snapshot.get("success", 0), "dataTotal": snapshot.get("total", 0),
            "directory": str(date_dir), "errors": errors, "capturedAt": snapshot.get("capturedAt")}


@app.get("/api/scheduler/jobs")
def scheduler_get_jobs(request: Request) -> dict[str, Any]:
    current_user(request)
    with SCHEDULER_LOCK:
        return {"jobs": _scheduler_jobs(), "settings": _scheduler_settings()}


class SchedulerJobsPayload(BaseModel):
    jobs: list[dict[str, Any]]


class SchedulerSettingsPayload(BaseModel):
    archiveDir: str = Field(min_length=1, max_length=1000)


@app.put("/api/scheduler/jobs")
def scheduler_put_jobs(payload: SchedulerJobsPayload, request: Request) -> dict[str, Any]:
    user = current_user(request)
    clean = []
    for job in payload.jobs[:30]:
        if not isinstance(job, dict) or not str(job.get("name", "")).strip():
            continue
        t = str(job.get("time", "07:30"))
        if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", t):
            raise HTTPException(status_code=400, detail=f"无效时间：{t}")
        clean.append({"id": str(job.get("id") or secrets.token_hex(6)), "name": str(job["name"]).strip()[:120],
                      "description": str(job.get("description", ""))[:500],
                      "taskType": job.get("taskType") if job.get("taskType") in {"refresh_archive", "archive_only"} else "refresh_archive",
                      "frequency": job.get("frequency") if job.get("frequency") in {"daily", "weekdays"} else "daily",
                      "time": t, "enabled": bool(job.get("enabled", True)), "lastRun": str(job.get("lastRun", "")),
                      "lastStatus": str(job.get("lastStatus", "")), "lastMessage": str(job.get("lastMessage", "")),
                      "lastRunDate": str(job.get("lastRunDate", ""))})
    with SCHEDULER_LOCK:
        _write_json_file(SCHEDULER_PATH, clean or copy.deepcopy(DEFAULT_JOBS))
    try:
        _write_personal_vault(str(user["username"]), user_state(int(user["id"])), _scheduler_jobs())
    except Exception as exc:
        print(f"[personal-vault] scheduler mirror failed: {exc}")
    return {"ok": True, "jobs": _scheduler_jobs()}


@app.put("/api/scheduler/settings")
def scheduler_put_settings(payload: SchedulerSettingsPayload, request: Request) -> dict[str, Any]:
    user = current_user(request)
    raw = payload.archiveDir.strip()
    if "\x00" in raw:
        raise HTTPException(status_code=400, detail="路径无效")
    with SCHEDULER_LOCK:
        _write_json_file(SCHEDULER_SETTINGS_PATH, {"archiveDir": raw})
        _remember_archive_root(raw)
    try:
        _write_personal_vault(str(user["username"]), user_state(int(user["id"])), _scheduler_jobs())
    except Exception as exc:
        print(f"[personal-vault] settings mirror failed: {exc}")
    return {"ok": True, "settings": _scheduler_settings()}


class SchedulerRunPayload(BaseModel):
    id: str | None = None


@app.post("/api/scheduler/run")
def scheduler_run(payload: SchedulerRunPayload, request: Request) -> dict[str, Any]:
    current_user(request)
    jobs = _scheduler_jobs()
    targets = [j for j in jobs if payload.id is None or str(j.get("id")) == str(payload.id)]
    if not targets:
        raise HTTPException(status_code=404, detail="找不到指定定时任务")
    results = []
    for job in targets:
        try:
            result = _run_scheduled_job(job)
            job.update({"lastRun": datetime.now().astimezone().isoformat(timespec="seconds"), "lastStatus": "成功", "lastMessage": f"归档 {result['files']} 个工作簿；行情成功 {result['dataSuccess']}/{result['dataTotal']}；目录 {result['directory']}", "lastRunDate": datetime.now().astimezone().strftime("%Y-%m-%d")})
            results.append({"id": job["id"], "ok": True, **result})
        except Exception as exc:
            job.update({"lastRun": datetime.now().astimezone().isoformat(timespec="seconds"), "lastStatus": "失败", "lastMessage": f"{type(exc).__name__}: {str(exc)[:250]}", "lastRunDate": datetime.now().astimezone().strftime("%Y-%m-%d")})
            results.append({"id": job["id"], "ok": False, "error": job["lastMessage"]})
    with SCHEDULER_LOCK:
        _write_json_file(SCHEDULER_PATH, jobs)
    return {"ok": all(r["ok"] for r in results), "results": results,
            "message": "；".join((f"成功归档 {r.get('files')} 个工作簿到 {r.get('directory')}" if r["ok"] else r.get("error", "失败")) for r in results)}


@app.get("/api/personal-vault/status")
def personal_vault_status(request: Request) -> dict[str, Any]:
    user=current_user(request)
    path=_personal_vault_path(str(user["username"]))
    return {"ok": path.is_file(), "databasePath": str(DB_PATH), "backupPath": str(DATA / "backups"), "warning": STORAGE_WARNINGS.get(int(user["id"])), "path": str(path), "archiveRoot": str(_external_archive_root()),
            "updatedAt": datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat(timespec="seconds") if path.is_file() else None}


@app.post("/api/personal-vault/sync")
def personal_vault_sync(request: Request) -> dict[str, Any]:
    user=current_user(request)
    path=_write_personal_vault(str(user["username"]), user_state(int(user["id"])), _scheduler_jobs())
    return {"ok": True, "path": str(path), "message": "个人数据已同步到 Windows Excel 历史归档"}


def _scheduler_loop() -> None:
    while True:
        try:
            now = datetime.now().astimezone()
            date_key = now.strftime("%Y-%m-%d")
            clock = now.strftime("%H:%M")
            with SCHEDULER_LOCK:
                jobs = _scheduler_jobs()
            due = [j for j in jobs if j.get("enabled") and j.get("time") == clock and j.get("lastRunDate") != date_key and (j.get("frequency") != "weekdays" or now.weekday() < 5)]
            for job in due:
                try:
                    result = _run_scheduled_job(job)
                    job.update({"lastRun": datetime.now().astimezone().isoformat(timespec="seconds"), "lastStatus": "成功", "lastMessage": f"归档 {result['files']} 个工作簿；行情成功 {result['dataSuccess']}/{result['dataTotal']}", "lastRunDate": date_key})
                except Exception as exc:
                    job.update({"lastRun": datetime.now().astimezone().isoformat(timespec="seconds"), "lastStatus": "失败", "lastMessage": f"{type(exc).__name__}: {str(exc)[:250]}", "lastRunDate": date_key})
            if due:
                with SCHEDULER_LOCK:
                    _write_json_file(SCHEDULER_PATH, jobs)
        except Exception:
            pass
        _time.sleep(20)


if not SCHEDULER_PATH.exists():
    _write_json_file(SCHEDULER_PATH, copy.deepcopy(DEFAULT_JOBS))
if not SCHEDULER_SETTINGS_PATH.exists():
    _write_json_file(SCHEDULER_SETTINGS_PATH, {"archiveDir": DEFAULT_ARCHIVE_DIR})
threading.Thread(target=_scheduler_loop, name="wealth-os-scheduler", daemon=True).start()
# 预热 openGym 动作库索引（首次约 2-3 秒），避免用户第一次打开“动作库”等待。
threading.Thread(target=gymlib.get_catalogue, name="wealth-os-opengym-warmup", daemon=True).start()

def _frontend_version() -> str:
    digest = hashlib.sha256()
    for path in sorted(STATIC.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".js", ".css"} and "models" not in path.parts and "vendor" not in path.parts:
            digest.update(path.relative_to(STATIC).as_posix().encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()[:20]


# A deployment restarts this process; calculate once rather than reading all bundles per poll.
APP_VERSION = _frontend_version()


@app.middleware("http")
async def frontend_cache_policy(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/static/") and Path(path).suffix in {".html", ".js", ".css"}:
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


@app.get("/api/app-version")
def app_version():
    return JSONResponse({"version": APP_VERSION}, headers={"Cache-Control": "no-store"})

class BoardPayload(BaseModel):
    title: str = Field(default="未命名画板", max_length=100)
    scene: dict[str, Any] = Field(default_factory=dict)
    version: int = 0

@app.get("/api/boards")
def list_boards(request: Request):
    user = current_user(request)
    with db() as con:
        rows = con.execute("SELECT id,title,version,updated_at FROM boards WHERE user_id=? ORDER BY updated_at DESC", (user["id"],)).fetchall()
    return {"boards": [dict(r) for r in rows]}

@app.post("/api/boards")
def create_board(request: Request):
    user = current_user(request)
    board_id = secrets.token_hex(16)
    now = datetime.now(timezone.utc).isoformat()
    with db() as con:
        con.execute("INSERT INTO boards VALUES(?,?,?,?,?,?)", (board_id,user["id"],"未命名画板","{}",0,now))
    backup_database(DB_PATH)
    return {"id":board_id}

@app.get("/api/boards/{board_id}")
def get_board(board_id: str, request: Request):
    user = current_user(request)
    with db() as con:
        row = con.execute("SELECT * FROM boards WHERE id=? AND user_id=?", (board_id,user["id"])).fetchone()
        if not row: raise HTTPException(404,"画板不存在")
        revisions = con.execute("SELECT version,saved_at FROM board_revisions WHERE board_id=? ORDER BY version DESC",(board_id,)).fetchall()
    return {"id":board_id,"title":row["title"],"scene":json.loads(row["scene"]),"version":row["version"],"revisions":[dict(r) for r in revisions]}

@app.get("/api/boards/{board_id}/revisions/{version}")
def get_board_revision(board_id: str, version: int, request: Request):
    get_board(board_id,request)
    with db() as con:
        row = con.execute("SELECT scene FROM board_revisions WHERE board_id=? AND version=?",(board_id,version)).fetchone()
    if not row: raise HTTPException(404,"历史版本不存在")
    return {"scene":json.loads(row["scene"])}

@app.put("/api/boards/{board_id}")
def save_board(board_id: str, payload: BoardPayload, request: Request):
    user = current_user(request)
    scene = json.dumps(payload.scene,ensure_ascii=False,allow_nan=False)
    if len(scene.encode("utf-8"))>20_000_000: raise HTTPException(413,"画板超过20MB，请导出备份后拆分画板")
    now = datetime.now(timezone.utc).isoformat()
    with db() as con:
        con.execute("BEGIN IMMEDIATE")
        row=con.execute("SELECT version FROM boards WHERE id=? AND user_id=?",(board_id,user["id"])).fetchone()
        if not row: raise HTTPException(404,"画板不存在")
        if row["version"]!=payload.version: raise HTTPException(409,"其他窗口已更新此画板，请先导出当前画布，再重新打开")
        version=payload.version+1
        con.execute("UPDATE boards SET scene=?,title=?,version=?,updated_at=? WHERE id=?",(scene,payload.title,version,now,board_id))
        con.execute("INSERT INTO board_revisions VALUES(?,?,?,?)",(board_id,version,scene,now))
    warning=None
    try: backup_database(DB_PATH)
    except Exception: warning="画板已保存，数据库快照失败，请检查存储空间"
    return {"ok":True,"version":version,"storageWarning":warning}


class LearningPayload(BaseModel):
    userId: int
    document: dict[str, Any] = Field(default_factory=dict)
    version: int = Field(default=0, ge=0)

@app.get("/api/ui-learning")
def get_ui_learning(request: Request):
    user = current_user(request)
    with db() as con:
        row = con.execute("SELECT document,version FROM ui_learning WHERE user_id=?", (user["id"],)).fetchone()
    return JSONResponse({"userId":user["id"], "document":json.loads(row["document"]) if row else {}, "version":row["version"] if row else 0},headers={"Cache-Control":"no-store"})

@app.put("/api/ui-learning")
def put_ui_learning(payload: LearningPayload, request: Request):
    user = current_user(request)
    if payload.userId != user["id"]: raise HTTPException(409,"登录账户已改变，请先备份当前资料后重新打开")
    document = json.dumps(payload.document, ensure_ascii=False, allow_nan=False)
    if len(document.encode("utf-8"))>20_000_000:
        raise HTTPException(413,"学习资料超过20MB，请先导出备份并拆分图片")
    for key in ("customItems","modules","favorites"):
        if not isinstance(payload.document.get(key,[]),list): raise HTTPException(422,"学习资料格式不正确")
    for key in ("progress","images"):
        if not isinstance(payload.document.get(key,{}),dict): raise HTTPException(422,"学习资料格式不正确")
    with db() as con:
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT version FROM ui_learning WHERE user_id=?",(user["id"],)).fetchone()
        if (row["version"] if row else 0)!=payload.version:
            raise HTTPException(409,"另一个窗口已更新学习资料，请先备份当前资料，再重新打开并导入合并")
        version=payload.version+1
        con.execute("INSERT INTO ui_learning VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET document=excluded.document,version=excluded.version,updated_at=excluded.updated_at",(user["id"],document,version,datetime.now(timezone.utc).isoformat()))
    warning=None
    try: backup_database(DB_PATH)
    except Exception: warning="已保存到账户，数据库备份失败，请检查磁盘空间"
    return {"ok":True,"version":version,"storageWarning":warning}
