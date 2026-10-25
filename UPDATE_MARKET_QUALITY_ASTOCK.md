# WEALTH OS 行情质量与 a-stock-data 备用源接入

## 本次接入范围

- 全球资产：继续使用 Yahoo Finance / yfinance；校验有效日线数量、价格正数/有限值、最后行情日期，超过 10 个自然日不接受为新更新。
- A 股 ETF：主源仍为 AKShare / 东方财富；主源报错、缺少日期/收盘列、有效行少于 65、收盘价无效或行情滞后超过 10 天时，自动切换腾讯财经日 K 线。
- 备用适配器：`astock_data_backup.py`，按 `a-stock-data` 项目当前公开文档中腾讯 K 线优先、避免依赖已失效 mootdx 行情命令的思路接入。上游项目： https://github.com/simonlin1212/a-stock-data 。本文件是本项目对 ETF 日线所需字段的独立适配器，不是复制上游全部 87 个数据端点。

## 状态语义

- `SUCCESS`：26/26 标的都返回数据且通过基础质量检查。
- `PARTIAL`：部分标的有效，其余标的保留旧快照，并在日志和页面标明失败。
- `FAILED`：没有任何标的取得有效数据；旧快照保留。
- `lastRefreshAttemptAt` / `lastRefresh` 是最近一次尝试；`lastSuccessfulMarketRefreshAt` 仅在全量 SUCCESS 时更新。
- 每个 ETF 显示行情日期、成功拉取时间、主源/备用源标记、有效日线行数和新鲜度提示。更新时间不等于行情日期：收盘日线在休市期间不会因为刷新按钮而变成当天行情。

## 校验规则

- ETF 至少 65 条有效日线，以支持 MA60 和收益计算。
- 日线日期去重并升序；OHLC 必须为正数且高低价覆盖开收盘；成交量不可为负。
- 最后行情日期超过 10 个自然日视为无效，不覆盖旧快照；滞后 5–10 天时仅作为警告数据。
- 任何数据源成功都不代表交易所官方确认；公开接口可能延迟、调整字段或临时不可用。用于交易前需核对交易所/基金公司/券商行情。

## 验证

```bash
python -m py_compile server.py astock_data_backup.py
python -m unittest discover -s tests -v
node --check static/app.js
```

自动测试使用模拟数据，不代表当前网络环境已通过真实行情端到端验证。首次部署后，请在 A 股交易日点击“刷新日线行情”，核对 `data/market_refresh_logs.jsonl` 中 SUCCESS/PARTIAL、各代码日期与来源。

## 部署注意

覆盖代码前先备份整个项目；不要删除或替换 `data/wealth_os.sqlite3`、`data/seed_state.json` 或用户的历史数据。更新后重启服务并硬刷新浏览器。
