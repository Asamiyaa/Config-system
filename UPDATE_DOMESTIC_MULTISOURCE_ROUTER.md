# 国内多源全球行情 Router 修复

## 为什么 Data Confidence 只有 30
此前 8 个全球资产仅 NDX、US10Y 成功，完整度 2/8，关键因子 2/4。Confidence 不是“算法坏了”，而是数据层确实不完整。

## 本次改动
- QQQ / VOO / GLD / ACWI：新浪美股日线失败后，增加腾讯财经国内直连美股日线备用源。
- VIX：真实 VIX 国内源失败时，使用 NDX 20 日年化实现波动率作为风险波动代理；明确标记 `isProxy=true`，绝不冒充真实 VIX。
- GOLD：GLD 两个国内源都失败时，尝试上海黄金交易所 Au99.99 / Au(T+D) 作为黄金因子代理。
- GLOBAL_STOCKS：ACWI 两源失败时，使用标普500宽基风险因子代理，并明确标记代理。
- BTC：继续使用金十 BTCUSD 多交易所报价；不伪造历史均线。
- NDX：新浪财经；US10Y：东方财富，保持不变。

## Confidence / 杠杆规则
代理因子可以恢复“因子可用性”，但 source-quality 只计 55% 权重。代理因子可以帮助基础仓位/风险判断，不允许冒充原始资产。
杠杆闸门更严格：即使 Data Confidence >= 90，只要关键因子中仍使用代理，仍不因数据层自动放行杠杆。

## 部署
覆盖本包文件，重启 FastAPI，浏览器 Ctrl+F5，再点击“刷新市场数据”。
公开数据接口仍可能临时变化；系统保留最后有效快照并显示真实 source/sourceTier/isProxy。
