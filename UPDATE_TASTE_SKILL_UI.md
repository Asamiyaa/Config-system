# WEALTH OS · Taste Skill UI Refactor

本次仅重构交互视觉层，保留 FastAPI、SQLite、行情源、评分、刷新、保存、任务和健康模块原有业务逻辑。

## 设计依据
参考 Leonxlnx/taste-skill 的 redesign-existing-projects 与默认 taste-skill 思路：先扫描现有项目，再做定向升级，不重写业务；减少通用 AI 卡片墙；加强排版层级、数据数字等宽、状态反馈、焦点状态、响应式和 reduced-motion。

## 本轮主要变化
- 左侧导航从 248px 收窄至 226px，减少视觉重量，激活态使用左侧状态线而不是大面积高亮。
- 页面标题改成更明显的 editorial hierarchy，减少密集小标题造成的噪音。
- 卡片半径、阴影和边框统一收敛，避免“每一块都是独立卡片”的 AI dashboard 感。
- 投资页面把“数据是否新鲜”提升为第一视觉层：最近尝试、最近全量成功、最新行情日期和刷新状态仍使用现有业务字段，但视觉优先级更高。
- ETF / 资产表格改成更接近专业终端的密度与 hover 反馈；表头 sticky；数字继续使用 tabular figures。
- 首页 KPI 使用非均分布局，任务区主次比例更明确。
- 登录页减少装饰噪音，保留品牌和原登录逻辑。
- 增加 prefers-reduced-motion 兼容；保留 focus-visible。
- 移动端重新整理标题、数据状态、来源网格与主内容布局。

## Taste 参数
- DESIGN_VARIANCE: 6/10
- MOTION_INTENSITY: 3/10
- VISUAL_DENSITY: 8/10

投资工作台属于高密度决策系统，因此没有照搬营销站的巨幅留白、AIDA、强 GSAP 或大图 Hero。这里采用 Taste Skill 的“先理解 brief，再选择设计语言”的原则，而不是机械套模板。

## 覆盖部署
覆盖 `static/styles.css` 和 `static/app.js` 后重启服务，并在浏览器 Ctrl+F5 强制刷新。

本补丁不包含也不应覆盖 `data/wealth_os.sqlite3`。
