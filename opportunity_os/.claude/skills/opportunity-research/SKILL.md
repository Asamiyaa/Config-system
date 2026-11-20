---
name: opportunity-research
description: Run a source-cited opportunity analysis and a seven-day monetization experiment inside Opportunity OS.
---

# Opportunity Research Skill

1. 先查看 `README.md`、`CLAUDE.md` 和 `app/scoring.py`，确认证据规则与当前数据源状态。
2. 从本地 `GET /api/opportunities` / 原始来源获取线索；不得捏造无法访问的事实。
3. 检查目标客户、业务场景、开源协议、API 服务条款及能否在7天内交付；不合规则淘汰。
4. 调用 `GET /api/opportunities/{id}` 取得完整证据、快照、阶段与实验记录。
5. 输出中文短报告：是什么、什么变了、谁付费、为什么、替代方案、建议报价（仅为测试价）、7天可证伪实验、最坏成本、证据缺口。
6. 用户同意后才调用写 API 更新阶段或实验。更不能擅自自动营销、发帖、购买 Token 或支付。
7. 对已经有试单的机会，优先沉淀可复制安装器、模板、FAQ 和验收报告。
