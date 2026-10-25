# 数据可信度 + 投资决策闸门升级

## 本次执行
- 市场评分与 Data Confidence 分离；缺失行情不再按 0 分伪装成完整输入。
- 全球 8 节点计算完整度、新鲜度、源质量和关键因子覆盖，输出 0–100 数据可信度。
- Critical：NDX、VIX/波动风险、US10Y、US Equity（QQQ/VOO 至少一个）。
- Confidence <50：建议降级为 REFERENCE_ONLY，暂停新增风险。
- Confidence 50–69：DEFENSIVE，降低战术风险，禁止新增杠杆。
- Confidence 70–89：CAUTION；仍不允许数据闸门放行杠杆。
- Confidence >=90 且 4/4 Critical 完整且无 stale warning：数据层才允许杠杆继续接受策略闸门检查。
- UI 在所有投资页顶部显示 Data Confidence、全球资产完整度、关键因子和杠杆数据闸门。
- 行情失败仍保留旧快照，但本轮失败不会被误认为本轮有效数据。

## 注意
这是“决策资格”控制，不会把代理指标伪装成真实 VIX/QQQ/VOO。数据不足时系统明确降级，而不是制造精确建议。
