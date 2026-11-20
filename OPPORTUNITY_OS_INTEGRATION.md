# 信息差变现集成说明

“信息差变现”节点集成 Opportunity OS V1.1，作为新登登录后的独立工作台嵌入。包含机会总览、公开信号雷达、转化流水线、实验验证、情报源配置、导入导出与 SQLite 备份能力。

## 安全与数据

- 所有页面、静态资源和 API 都校验新登 `wealth_os_session` 登录态。
- SQLite 按新登账户隔离，位于 `data/opportunity-os/<user-id>/opportunities.sqlite3`；部署脚本覆盖应用代码时保留该目录。
- 原始项目 `Opportunity_OS_V1.1_20261108/opportunity-os` 保持不变；集成副本位于 `opportunity_os/`。
- 原项目的 `.env`、`data/`（含 SQLite 业务数据）和 `.venv/` 不复制到集成副本或发布包。需要用户配置的外部授权凭据没有自动导入。
- 自动后台扫描默认关闭，用户可在工作台手动发起扫描；未配置授权的 X、闲鱼、小红书、1688 不会伪装成已接入。

## 路由

- 新登导航：`信息差变现`
- 页面：`/opportunity-os/`
- API：`/opportunity-os/api/...`
- 静态资源：`/opportunity-os/static/...`
