"""A-share ETF daily-bar backup adapter for Wealth OS.

Implements the Tencent K-line path recommended by simonlin1212/a-stock-data.
Upstream project: https://github.com/simonlin1212/a-stock-data
This is a narrow integration for this app's ETF-price/technical-indicator needs,
not a vendored copy of every upstream endpoint.
"""
from __future__ import annotations
import json
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from typing import Any

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36"
BASES = (
    "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get",
    "https://ifzq.gtimg.cn/appstock/app/fqkline/get",
)


def _market_code(code: str) -> str:
    code = str(code).strip()
    if len(code) != 6 or not code.isdigit():
        raise ValueError(f"非法 ETF 代码: {code!r}")
    return ("sh" if code.startswith(("5", "6")) else "sz") + code


def _request_json(url: str, timeout: float = 8.0) -> dict[str, Any]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Referer": "https://gu.qq.com/"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read(8 * 1024 * 1024)
    data = json.loads(raw.decode("utf-8", errors="replace"))
    if not isinstance(data, dict) or not isinstance(data.get("data"), dict):
        raise ValueError("腾讯 K 线响应结构不符合预期")
    return data


def fetch_etf_daily(code: str, limit: int = 600, timeout: float = 8.0) -> dict[str, Any]:
    """Return validated unadjusted daily bars for an ETF from Tencent.

    Fields in Tencent bars: date, open, close, high, low, volume, amount.
    Unadjusted ETF daily bars are used; missing/short/invalid series are rejected.
    """
    market_code = _market_code(code)
    errors: list[str] = []
    payload = None
    for base in BASES:
        params = urllib.parse.urlencode({"param": f"{market_code},day,,,{int(limit)},none"})
        try:
            payload = _request_json(f"{base}?{params}", timeout=timeout)
            break
        except Exception as exc:
            errors.append(f"{base.split('/')[2]}: {type(exc).__name__}: {str(exc)[:100]}")
    if payload is None:
        raise RuntimeError("腾讯备用源全部失败；" + " | ".join(errors))
    symbol_data = payload["data"].get(market_code) or payload["data"].get(market_code.lower())
    if not isinstance(symbol_data, dict):
        raise ValueError(f"腾讯备用源没有返回标的 {market_code}")
    bars = symbol_data.get("day") or symbol_data.get("qfqday") or symbol_data.get("hfqday")
    if not isinstance(bars, list) or not bars:
        raise ValueError("腾讯备用源 K 线为空")
    parsed = []
    for row in bars:
        if not isinstance(row, (list, tuple)) or len(row) < 6:
            continue
        try:
            d = date.fromisoformat(str(row[0])[:10])
            op, close, high, low = (float(row[1]), float(row[2]), float(row[3]), float(row[4]))
            volume = float(row[5])
            amount = float(row[6]) if len(row) > 6 and row[6] not in (None, "") else None
            if not all(v > 0 for v in (op, close, high, low)) or low > min(op, close) or high < max(op, close) or volume < 0:
                continue
            parsed.append({"date": d.isoformat(), "open": op, "close": close, "high": high, "low": low, "volume": volume, "amount": amount})
        except (ValueError, TypeError, OverflowError):
            continue
    # Deduplicate by date and sort ascending; reject suspiciously incomplete series.
    by_date = {x["date"]: x for x in parsed}
    rows = [by_date[k] for k in sorted(by_date)]
    if len(rows) < 65:
        raise ValueError(f"腾讯备用源有效日线不足65条（实际{len(rows)}条），不能可靠计算MA60")
    last_date = date.fromisoformat(rows[-1]["date"])
    age_days = (date.today() - last_date).days
    if age_days > 10:
        raise ValueError(f"腾讯备用源行情过旧：最后日期 {last_date.isoformat()}，已滞后{age_days}天")
    closes = [r["close"] for r in rows]
    last = closes[-1]
    prev = closes[-2] if len(closes) > 1 else None
    recent60 = closes[-60:]
    return {
        "code": code, "price": last,
        "changePct": (last / prev - 1) * 100 if prev else None,
        "ma20": sum(closes[-20:]) / 20 if len(closes) >= 20 else None,
        "ma60": sum(recent60) / 60 if len(recent60) >= 60 else None,
        "return20dPct": (last / closes[-21] - 1) * 100 if len(closes) >= 21 else None,
        "return60dPct": (last / closes[-61] - 1) * 100 if len(closes) >= 61 else None,
        "drawdown60dPct": (last / max(recent60) - 1) * 100 if recent60 else None,
        "date": rows[-1]["date"], "source": "a-stock-data 备用适配器 / 腾讯财经 K线",
        "sourceTier": "backup", "rows": len(rows), "qualityStatus": "valid" if age_days <= 4 else "stale-warning",
        "ageDays": age_days, "sourceErrors": errors,
    }
