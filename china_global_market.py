"""China-accessible public market data adapters for WEALTH OS.

No Yahoo/yfinance dependency. Sources are routed through AKShare to domestic-facing
providers: Sina Finance, Eastmoney and Jin10. Public interfaces can still change;
callers must retain the last good snapshot when validation fails.
"""
from __future__ import annotations
from datetime import datetime, timedelta
import math
from typing import Any


def _metrics(dates, closes, source: str, symbol: str, min_rows: int = 20) -> dict[str, Any]:
    pairs=[]
    for d,c in zip(dates, closes):
        try:
            v=float(c)
            if math.isfinite(v) and v>0:
                ds=str(getattr(d, 'date', lambda: d)()) if hasattr(d,'date') else str(d)[:10]
                pairs.append((ds[:10],v))
        except Exception:
            pass
    # de-duplicate and sort, important for several public providers
    pairs=sorted(dict(pairs).items())
    if len(pairs)<min_rows:
        return {"symbol":symbol,"error":f"有效日线不足{min_rows}条（实际{len(pairs)}条）","source":source,"qualityStatus":"invalid"}
    ds=[x[0] for x in pairs]; close=[x[1] for x in pairs]
    latest=ds[-1]
    try: age=(datetime.now().date()-datetime.fromisoformat(latest).date()).days
    except Exception: age=99
    if age>10:
        return {"symbol":symbol,"error":f"行情过旧：最后日期 {latest}，已滞后{age}天","source":source,"qualityStatus":"invalid"}
    last=close[-1]; prev=close[-2] if len(close)>1 else None
    high=max(close)
    return {"symbol":symbol,"price":last,"changePct":((last/prev-1)*100 if prev else None),
        "athWindowHigh":high,"drawdownFromWindowHighPct":((last/high-1)*100 if high else None),
        "ma20":sum(close[-20:])/20 if len(close)>=20 else None,
        "ma50":sum(close[-50:])/50 if len(close)>=50 else None,
        "ma200":sum(close[-200:])/200 if len(close)>=200 else None,
        "return20dPct":((last/close[-21]-1)*100 if len(close)>=21 else None),
        "return60dPct":((last/close[-61]-1)*100 if len(close)>=61 else None),
        "date":latest,"source":source,"rows":len(close),"ageDays":age,
        "qualityStatus":"valid" if age<=4 else "stale-warning","sourceTier":"primary"}


def _sina_us_stock(symbol: str) -> dict[str, Any]:
    import akshare as ak  # type: ignore
    start=(datetime.now()-timedelta(days=900)).strftime('%Y%m%d'); end=datetime.now().strftime('%Y%m%d')
    df=ak.stock_us_daily(symbol=symbol,start_date=start,end_date=end,adjust="")
    if df is None or df.empty: raise ValueError('新浪美股日线返回空表')
    date_col='date' if 'date' in df.columns else ('日期' if '日期' in df.columns else df.columns[0])
    close_col='close' if 'close' in df.columns else ('收盘' if '收盘' in df.columns else None)
    if close_col is None: raise ValueError(f'新浪美股日线缺少收盘字段: {list(df.columns)}')
    return _metrics(df[date_col],df[close_col],"新浪财经 / AKShare stock_us_daily",symbol)


def _ndx() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    df=ak.index_us_stock_sina(symbol='.NDX')
    if df is None or df.empty: raise ValueError('新浪纳斯达克100指数返回空表')
    return _metrics(df['date'],df['close'],"新浪财经 / AKShare index_us_stock_sina",'.NDX')


def _us10y() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    start=(datetime.now()-timedelta(days=900)).strftime('%Y%m%d')
    try: df=ak.bond_zh_us_rate(start_date=start)
    except TypeError: df=ak.bond_zh_us_rate()
    col='美国国债收益率10年'
    if df is None or df.empty or col not in df.columns: raise ValueError('东方财富中美国债收益率缺少10Y字段')
    frame=df[['日期',col]].dropna()
    return _metrics(frame['日期'],frame[col],"东方财富 / AKShare bond_zh_us_rate","US10Y")


def _vix() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    errors=[]
    # Sina global-index history first: enough daily bars for trend metrics when name is available.
    for name in ('VIX恐慌指数','VIX波动率指数','VIX指数'):
        try:
            df=ak.index_global_hist_sina(symbol=name)
            if df is not None and not df.empty and 'close' in df.columns:
                out=_metrics(df['date'],df['close'],"新浪财经 / AKShare index_global_hist_sina",'VIX')
                if out.get('price') is not None: return out
                errors.append(out.get('error','invalid'))
        except Exception as e: errors.append(f'{type(e).__name__}: {e}')
    # Jin10 domestic data-center fallback. Minute data are collapsed to daily last values.
    try:
        start=(datetime.now()-timedelta(days=28)).strftime('%Y%m%d'); end=datetime.now().strftime('%Y%m%d')
        df=ak.index_vix(start_date=start,end_date=end)
        if df is None or df.empty: raise ValueError('金十VIX返回空表')
        dt='日期时间'; px='当前价'
        frame=df[[dt,px]].copy(); frame['_d']=frame[dt].astype(str).str[:10]
        daily=frame.groupby('_d',as_index=False).tail(1)
        out=_metrics(daily['_d'],daily[px],"金十数据 / AKShare index_vix",'VIX',min_rows=5)
        if out.get('price') is not None: return out
        errors.append(out.get('error','invalid'))
    except Exception as e: errors.append(f'{type(e).__name__}: {e}')
    try: return _vix_proxy()
    except Exception as e: errors.append(f'代理失败: {type(e).__name__}: {e}')
    raise RuntimeError('；'.join(errors[-4:]) or 'VIX国内数据源无有效返回')



def _tencent_us_stock(symbol: str) -> dict[str, Any]:
    """Tencent Finance domestic fallback for US listed ETFs/stocks.

    Uses the public US forward-adjusted daily-kline endpoint. The parser is deliberately
    defensive because Tencent occasionally changes day/qfqday field placement.
    """
    import json, urllib.parse, urllib.request
    code = f"us{symbol.upper()}"
    param = f"{code},day,,,320,qfq"
    url = "https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get?" + urllib.parse.urlencode({"param": param})
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0","Referer":"https://gu.qq.com/"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        payload=json.loads(resp.read().decode('utf-8','ignore'))
    node=(payload.get('data') or {}).get(code) or {}
    rows=node.get('qfqday') or node.get('day') or []
    if not rows: raise ValueError(f"腾讯财经未返回{symbol}日线")
    dates=[]; closes=[]
    for row in rows:
        if isinstance(row,(list,tuple)) and len(row)>=3:
            dates.append(row[0]); closes.append(row[2])
    out=_metrics(dates,closes,f"腾讯财经 / 国内直连美股日线（{symbol}）",symbol)
    out['sourceTier']='backup'
    return out

def _us_etf_multisource(symbol: str) -> dict[str, Any]:
    errors=[]
    for fn in (_sina_us_stock, _tencent_us_stock):
        try:
            out=fn(symbol)
            if out.get('price') is not None: return out
            errors.append(out.get('error','invalid'))
        except Exception as e: errors.append(f"{type(e).__name__}: {e}")
    raise RuntimeError('；'.join(errors[-4:]))

def _spx() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    for sym in ('.INX','.SPX'):
        try:
            df=ak.index_us_stock_sina(symbol=sym)
            if df is not None and not df.empty:
                out=_metrics(df['date'],df['close'],"新浪财经 / AKShare 标普500指数",sym)
                if out.get('price') is not None: return out
        except Exception:
            pass
    raise ValueError('标普500国内指数源无有效返回')

def _vix_proxy() -> dict[str, Any]:
    """Fallback risk-volatility factor; never labels the proxy as real VIX."""
    import akshare as ak  # type: ignore
    df=ak.index_us_stock_sina(symbol='.NDX')
    if df is None or df.empty: raise ValueError('NDX代理波动率数据为空')
    vals=[]
    for x in df['close']:
        try:
            v=float(x)
            if math.isfinite(v) and v>0: vals.append(v)
        except Exception: pass
    if len(vals)<22: raise ValueError('NDX代理波动率样本不足')
    import statistics
    rets=[math.log(vals[i]/vals[i-1]) for i in range(max(1,len(vals)-21),len(vals))]
    rv=statistics.stdev(rets)*math.sqrt(252)*100
    date=str(df['date'].iloc[-1])[:10]
    age=(datetime.now().date()-datetime.fromisoformat(date).date()).days
    return {"symbol":"VIX_PROXY","price":rv,"changePct":None,"date":date,"ageDays":age,
        "source":"新浪财经 NDX 20日实现波动率代理（非真实VIX）","qualityStatus":"valid" if age<=4 else "stale-warning",
        "sourceTier":"proxy","isProxy":True,"proxyFor":"VIX","rows":len(vals),
        "ma20":None,"ma50":None,"ma200":None,"return20dPct":None,"return60dPct":None}

def _gold_domestic_proxy() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    errors=[]
    for sym in ('Au99.99','Au(T+D)'):
        try:
            df=ak.spot_hist_sge(symbol=sym)
            if df is None or df.empty: continue
            cols={str(c).lower():c for c in df.columns}
            dc=cols.get('date') or next((c for c in df.columns if '日期' in str(c)),None)
            cc=cols.get('close') or next((c for c in df.columns if '收盘' in str(c)),None)
            if dc is None or cc is None: continue
            out=_metrics(df[dc],df[cc],f"上海黄金交易所 {sym} / AKShare（GLD黄金因子代理）",'GOLD_PROXY')
            if out.get('price') is not None:
                out.update({'sourceTier':'proxy','isProxy':True,'proxyFor':'GOLD'}); return out
        except Exception as e: errors.append(str(e))
    raise RuntimeError('；'.join(errors[-2:]) or '上海黄金交易所代理源无有效返回')

def _global_equity_proxy() -> dict[str, Any]:
    # ACWI failure fallback: broad US market proxy. Explicitly marked as proxy and discounted by confidence logic.
    out=_spx(); out=dict(out)
    out.update({'symbol':'GLOBAL_EQUITY_PROXY','source':str(out.get('source'))+'（ACWI全球权益代理，非ACWI本身）',
                'sourceTier':'proxy','isProxy':True,'proxyFor':'GLOBAL_STOCKS'})
    return out

def _btc() -> dict[str, Any]:
    import akshare as ak  # type: ignore
    df=ak.crypto_js_spot()
    if df is None or df.empty: raise ValueError('金十加密货币行情返回空表')
    pair_col='交易品种'; price_col='最近报价'; time_col='更新时间'
    rows=df[df[pair_col].astype(str).str.upper().eq('BTCUSD')].copy()
    if rows.empty: rows=df[df[pair_col].astype(str).str.upper().str.contains('BTCUSD',na=False)].copy()
    if rows.empty: raise ValueError('金十行情未返回BTCUSD')
    rows[price_col]=__import__('pandas').to_numeric(rows[price_col],errors='coerce'); rows=rows.dropna(subset=[price_col])
    if rows.empty: raise ValueError('BTCUSD价格无有效数值')
    # Median across available venues is more robust than trusting one exchange quote.
    price=float(rows[price_col].median()); ts=str(rows.iloc[-1].get(time_col,'')); date=ts[:10] if len(ts)>=10 else datetime.now().strftime('%Y-%m-%d')
    age=(datetime.now().date()-datetime.fromisoformat(date).date()).days if date else 99
    if age>10: raise ValueError(f'BTC行情过旧：{date}')
    return {"symbol":"BTCUSD","price":price,"changePct":None,"athWindowHigh":None,"drawdownFromWindowHighPct":None,
        "ma20":None,"ma50":None,"ma200":None,"return20dPct":None,"return60dPct":None,"date":date,
        "source":"金十数据 / AKShare crypto_js_spot（BTCUSD多交易所中位数）","rows":len(rows),"ageDays":age,
        "qualityStatus":"valid" if age<=1 else "stale-warning","sourceTier":"primary"}


def latest_global_asset(key: str) -> dict[str, Any]:
    try:
        if key=='NDX': return _ndx()
        if key=='VIX': return _vix()
        if key=='US10Y': return _us10y()
        if key=='BTC': return _btc()
        if key=='QQQ': return _us_etf_multisource('QQQ')
        if key=='VOO': return _us_etf_multisource('VOO')
        if key=='GOLD':
            try: return _us_etf_multisource('GLD')
            except Exception: return _gold_domestic_proxy()
        if key=='GLOBAL_STOCKS':
            try: return _us_etf_multisource('ACWI')
            except Exception: return _global_equity_proxy()
        return {"symbol":key,"error":"未知全球资产标识","source":"国内多源适配器","qualityStatus":"invalid"}
    except Exception as exc:
        return {"symbol":key,"error":f"{type(exc).__name__}: {str(exc)[:220]}","source":"国内多源：新浪财经 / 东方财富 / 金十数据（AKShare）","qualityStatus":"invalid"}
