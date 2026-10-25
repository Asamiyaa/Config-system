# 全球行情国内数据源修复

## 目的
移除全球 8 个节点对 Yahoo Finance / yfinance 的运行时依赖，避免 `YFRateLimitError: Too Many Requests` 导致整批全球行情失败。

## 新路由
- NDX：新浪财经 `index_us_stock_sina(.NDX)`，通过 AKShare。
- QQQ / VOO / GLD / ACWI：新浪财经美股历史日线 `stock_us_daily`，通过 AKShare。
- US10Y：东方财富中美国债收益率 `bond_zh_us_rate`，通过 AKShare。
- VIX：优先新浪财经全球指数历史；失败后回退金十数据 `index_vix`。
- BTC：金十数据 `crypto_js_spot`，BTCUSD 多交易所报价取中位数。该源是现货快照，因此 BTC 的 MA20/MA50/MA200 等历史技术指标不伪造，返回空值。
- A股 ETF：保持原 AKShare/东方财富 + 腾讯备用源，不变。

## 数据质量
仍执行价格正数、有效日线数量、最新日期、过旧拒绝覆盖等校验。任一新源失败时，前端继续保留上次有效快照并显示具体失败源和原因。

## 说明
这些是公开网页/数据中心接口，不是交易所授权的交易级行情；国内可达性通常比 Yahoo 更合适，但任何公开接口都不能承诺永久稳定。系统采用多源、校验、失败保留旧快照，而不是把失败值写进数据库。
