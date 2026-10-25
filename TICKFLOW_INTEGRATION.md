# TickFlow / ticktick-clone 整合说明

上游项目：<https://github.com/SSSkevin1110/ticktick-clone>（项目 README 标注 MIT）。

本次将其任务工作流理念（今日任务、收集箱、未来任务、周历/日程、四象限、执行统计、重要标记、快速添加/编辑、优先级、搜索、习惯和番茄专注）整合进 WEALTH OS 首页，并以当前深绿/荧光绿设计、FastAPI 登录和 SQLite 用户工作区统一保存。资产配置、纳指、A股 ETF、新登 90 天、黄色B筛选、涛动周期研究等旧模块保留。

为避免双认证、Supabase 凭据与双数据库，本次没有直接把上游 React/Supabase 代码整包复制进运行时；它是与原项目架构匹配的原生集成实现。源项目链接保留供你对照和后续按 MIT 许可继续移植。任务记录保存在当前登录用户的 SQLite 状态 JSON 中，不会同步到 TickTick 官方账号或 Supabase。

## 新登配置能力金字塔与 TypeWords 英语入口

“新登配置 / 90天”页面顶部展示六层能力金字塔，按依赖关系由下而上组织：

1. **现金流、应急金与执行底盘**：收入/必要支出/高息债、6–12个月应急金、健康与稳定执行节奏。
2. **核心资产与风险管理**：现金与短债、全球宽基、VOO/QQQ倾斜、黄金，及BTC/稳定币的风险与法域核验；制定IPS和再平衡规则。
3. **生产力与收入引擎**：英语、AI/编程、内容/产品交付；AI订阅按ROI核算，机器人/算力/数据作为单独的高波动主题研究。
4. **全球金融基础设施**：多币种银行、海外券商、全球保险、资金路径与税务记录。
5. **身份与跨境流动性**：多国签证、长期居留/永居、国籍与护照规划，需区分其法律及税务影响。
6. **全球所有权与复杂资产**：全球/离岸公司和海外房产，只有真实经营或生活需求、专业法税评估和退出计划成立时再进入。

侧边栏路径为“新登配置 / 90天 → 英语能力 → TypeWords 单词练习 / 文章练习”。两个入口均打开 <https://typewords.cc/> 新窗口。TypeWords 官方项目文档列有跟写、听写、自测、默写和文章练习等能力；本集成不抓取其数据、不共用登录，英语分钟数由用户在本工作区每周记录。

## 首页关注点
- 全球配置：真实持仓、现金目标、应急金、债务与目标偏离。
- 纳指 AI：配置分、泡沫分、2000 相似度、回撤梯队、Core/Swing/Crisis 及杠杆闸门。
- A股 ETF：评分、生命周期、MA20/MA60、数据质量、主题风险和黄色 B 信号。
- 新登配置：90 天里程碑、跨境合规、账户/保险/身份用途、AI 订阅 ROI。
- 工作系统：英语输出、训练/睡眠、AI/编程交付、内容转化和周复盘。

## 更新既有本地目录
如果你已有 `data/wealth_os.sqlite3`，先停服务并备份该文件，然后可使用覆盖补丁包 `Wealth_OS_TickFlow_Overlay.zip`；它包含 `static/index.html`、`static/app.js`、`static/styles.css`、README、部署/覆盖说明和可选上游同步脚本。已有账号如果尚无 `focusTasks` 字段，页面会自动初始化一组起始任务；不会覆盖已有资产/策略字段。


## 同步上游 React 源码（可选）

在 Windows PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync_tickflow_upstream.ps1
```

脚本会将原仓库克隆/快进更新到 `integrations\ticktick-clone-upstream`，不会覆盖当前 WEALTH OS 页面或数据库。上游 React 应用需要 Node.js、npm 和独立 Supabase 配置；当前集成首页仍使用 WEALTH OS 本地账号与 SQLite。
