# WEALTH OS — 全球资产与执行工作台

这是一个可本地运行、可登录、可修改配置、可导出/导入状态的 Web Demo，将当前项目中可访问的资产配置表、A股 ETF 跟踪工具、纳斯达克 AI 风险/仓位/杠杆规则和“新登配置”90 天执行表整合到同一个工作台。

## 功能

- **今日工作台（TickFlow 风格）**：作为登录首页；今日/收集箱/未来7天/周历/四象限/执行统计/重要/全部任务，快速添加、编辑、完成/恢复、删除、优先级、截止日期、所属模块、备注、重要标记、搜索，状态保存在当前用户 SQLite 工作区。另含每日习惯打卡与25分钟专注计时。将任务管理与资产配置工作流整合，不依赖额外 Supabase 账号。
- **首页项目关注点**：快捷看全球资产配置、纳指 AI 风险与杠杆闸门、A股ETF评分与数据质量、新登90天、黄色B筛选、跨境合规和 AI 订阅ROI。

- **账号与持久化**：注册/登录；密码用 PBKDF2-HMAC-SHA256 加盐存储；用户状态保存在 SQLite；每个账户拥有独立配置。
- **总览 Dashboard**：关键评分、配置、ETF 观察池、90 天任务完成度、每日执行节奏和当前数据状态。
- **全球资产配置**：原全球多资产策略与“新登配置”核心策略并存；可修改战略权重、评分、实际权重、组合规模、现金/风险覆盖；动态目标与差额可视化。
- **纳斯达克 AI 策略**：AI 泡沫分、2000 年相似度、入场分、输入字段、25/25/50 建仓框架、V1/V3 回撤梯队、Core/Swing/Crisis、L0–L5 杠杆闸门、风险提示。分数支持重算。
- **A股 ETF 轮动**：18 只 ETF 观察池、价格/变动/20 日收益、八维评分和风险扣分、生命周期状态、实际/目标仓位输入、分数维度编辑、数据质量备注、主题风控参数。
- **新登配置能力金字塔 + 90 天路线图**：从现金流/应急金/健康执行底盘，到核心资产与风险管理、技能和收入引擎、全球金融基础设施、跨境身份，再到公司/离岸结构/海外房产等复杂资产，按层级给出解锁条件；另有个人现金流、核心比例、90天任务、资产账户台账、AI订阅 ROI、每周执行与内容现金流。
- **英语二级菜单 / TypeWords**：在“新登配置 / 90天 → 英语能力”下接入 TypeWords 单词和文章练习链接，外部新窗口打开，不读取其账户或训练数据；每周英语目标和记录仍在当前工作区维护。
- **每日执行日志**：记日期、动作、触发条件、状态；删除误录；固定日/周/月/季度执行节奏。
- **黄色 B 筛选器**：实现可确认的“近 N 个交易日内，黄色 B 及以上出现次数达到阈值”规则；可改窗口、阈值、评级覆盖，交互式模拟测试。
- **周期研究 / 涛动周期论**：预测登记、目标/期限/失效条件、盲测状态与历史内容缺口。不会虚构当前无法读取到的原始预测。
- **聊天归档与参考文件**：项目主题索引、原工作簿/源码包下载、数据来源注册表、导出/导入 JSON。
- **行情刷新**：用户点击后，尝试从 Yahoo Finance (`yfinance`) 抓取 NDX/VIX/10年收益率/QQQ/VOO/GLD/BTC/ACWI，尝试通过 AKShare 获取 18 只 ETF 历史日线；部分请求超时会保留旧值并显示成功/失败计数，不会把失败响应显示成成功。
- **健康管理 / 健身管理（openGym 原生接入）**：在“健康管理 → 健身管理”内新增动作库、周计划与引导训练。直接读取本机 openGym `catalogue` 的 5,600+ 动作、中文名称/步骤与本地动作动画，**不需要单独启动 openGym**（不需要 Node、Docker 或额外端口）。支持关键词/部位/器械/分类检索、动作详情、收藏、加入周计划、按目标与可用器械自动生成整周计划；训练记录继续写入健康管理现有数据，参与热力图、PR、恢复与疲劳分析。
- **Taste redesign · data-terminal**：按 `Leonxlnx/taste-skill` 的 app-screen 规则重构 UI：Public Sans + DM Mono、`#0d0f0c` 近黑中性色、1px 边框、单一 `#b7f36a` 选择线、dividable KPI strip、ledger 式关注点/四象限、命令面板 `⌘K`、可折叠 labelled sidebar；登录页与移动端同步重做。详见 `TASTE_REDESIGN.md`。
- **UI Dashboard 规范落地**：按 `ui-dashboard` 169 条规范选择「图片卡片流 + 极简数据 + 杂志排版 + 悬浮岛式分组侧栏 + 主区/窄栏 + 吸顶指标 + 顶部筛选 + App 底栏/动效」组合；资产总览改为 5 个页签，长页统一折叠，页面头与 KPI 使用本地 SVG 封面；包含按钮生长弹层、按压回弹、关注索引拖拽排序与 View Transition 页面转场。深色近黑/浅色柔和灰绿、亮绿只作关键强调，详见 [DASHBOARD_SPEC.md](DASHBOARD_SPEC.md)。
- **Product reel · code video**：[10 秒产品片](video/out/wealth-os-reel.mp4) 与可复现管线 `video/`。`cues.json` 统一时间轴，`scene.html` 的 `renderAt(frame)` 逐帧渲染，Playwright 抓帧，ffmpeg 编码；报告见 [video/out/report.json](video/out/report.json)。规格 1920×1080 / 30fps / 300 帧 / 10.000s，AAC 48k，−14.4 LUFS，−1.3 dBTP。
- **健康管理 / 皮肤护理（Skin OS）**：按肤质、敏感度、经验与诉求生成 AM/PM 流程；视黄醇/水杨酸/果酸按周排程并检查同晚冲突；逐步骤打卡、皮肤评分、28 天日历、产品耐受观察与成分速查。详见 `UPDATE_HEALTH_SKIN_DIET_SLEEP_V14.md`。
- **Agent 分身 · 3D 平衡轨道**：六个分身使用 Microsoft Fluent Emoji 3D 形象（MIT）绕中心旋转，中心平衡秤代表主控 OS；每个分身有明确能力含义、失衡信号与入口，支持状态切换、暂停旋转、平衡指数与移动端适配。详见 `UPDATE_AGENT_3D_BALANCE_V15.md`。
- **每日流程 · 编排/统计双页签**：侧边栏只保留一个「每日流程」入口，页面内用左右页签切换「流程编排」与「流程统计」；编排支持工作日/休息日时间轴、拖动/缩放、开始记录与编辑删除，统计展示打开/完成次数、近 14 天趋势、分类与单项明细。详见 `UPDATE_DAILY_FLOW_TABS_V16.md`。
- **英语 / 阅读工作台**：英语分「概览 / 学习记录 / 复盘」，阅读分「书架 / 打卡 / 笔记 / 复盘」；新增与编辑全部走弹层，列表卡片化并支持编辑删除；英语提供输出率、技能分布与 CSV 导出，阅读提供书籍进度、打卡、感想/Notebook 与笔记/打卡比。详见 `UPDATE_ENGLISH_READING_WORKSPACE_V17.md`。
- **健康管理 / 饮食饮水（Nutrition OS）**：70 种常见食物参考库，按份量自动换算热量、蛋白质、碳水、脂肪、纤维、糖和钠；四餐与饮水记录、BMR/TDEE 目标、餐盘结构、一键餐盘模板、按剩余目标推荐一餐、7/30 天趋势与饮食评分。
- **健康管理 / 睡眠与恢复（Sleep OS）**：记录上床、入睡、夜醒、午睡、咖啡因、酒精、屏幕与压力；计算睡眠时长、效率、睡眠债、作息规律性与恢复准备度，显示 14/30 晚睡眠带、睡前时间线、睡眠卫生清单、咖啡因截止与睡眠周期倒推。

## 快速运行

要求：Python 3.11 或 3.12，联网仅在需要获取行情时使用。

### Windows

1. 解压 ZIP。
2. 双击 `start_windows.bat`，或打开 PowerShell 运行：

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

3. 浏览器打开 <http://127.0.0.1:8765>。
4. Demo 账号：`demo` / `Demo1234!`。建议演示调试时创建自己的账号。账户与状态保存在 `data/wealth_os.sqlite3`。

### macOS / Linux

```bash
chmod +x start_macos_linux.sh
./start_macos_linux.sh
```

或者手动执行：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn server:app --host 127.0.0.1 --port 8765
```

### 修改与调试

- 页面与交互：`static/index.html`、`static/styles.css`、`static/app.js`
- 健康工作台：`static/health_core.js`（共享状态/图表）、`static/skin_os.js`、`static/diet_os.js`、`static/sleep_os.js`
- 健身 openGym 接入：`gym_catalogue.py`、`server.py` 中的 `/api/gym/*`
- TickFlow 整合说明：`TICKFLOW_INTEGRATION.md`
- 服务端、登录、SQLite、行情 API：`server.py`
- 初始数据和规则：`data/seed_state.json`
- 保留的原始文件：`reference_materials/`
- API 健康检查：`GET /api/health`
- 登录状态：`GET /api/session`
- 当前用户工作区：`GET/PUT /api/state`（要求登录）
- 请求公开行情更新：`POST /api/market/refresh`（要求登录；最长约 27 秒返回部分可用结果）
- openGym 动作库状态：`GET /api/gym/status`；检索：`GET /api/gym/exercises`；详情：`GET /api/gym/exercises/{id}`；媒体：`GET /api/gym/media/{id}/still|clip`；生成周计划：`POST /api/gym/plan/generate`（均要求登录）

### openGym 动作库目录

默认自动查找与本项目同级的 `health/openGym`（例如项目在 `E:\configSystem`、动作库在 `E:\health\openGym`）。也可以复制 `.env.example` 中的 `OPEN_GYM_DIR` 到 `.env` 显式指定 openGym 根目录或它的 `catalogue` 目录。

- 只读接入：不会修改 openGym 目录，也不会启动它的 Node/Docker 服务。
- 动作图片/动画保留在原目录按需读取，不复制进本项目仓库；媒体许可约束仍以 openGym 的 `catalogue/media/NOTICE.md` 为准。
- 目录不可用时，“动作库”会显示可解释状态；健康管理其余功能不受影响。

修改 `seed_state.json` 仅影响新注册账户和数据库中尚未保存状态的账户；已经存在的账户以 SQLite 中已存状态为准。开发时如需重置 Demo，可先停止程序、备份并删除 `data/wealth_os.sqlite3` 后重启。**删除数据库会清除现有本地用户及他们的数据，必须先备份。**

## TickFlow 上游说明

首页任务工作流参考 <https://github.com/SSSkevin1110/ticktick-clone> 的产品理念，但基于 WEALTH OS 的 FastAPI + SQLite 架构进行原生实现，以共用现有本地账号，不要求额外 Supabase 配置。任务不与滴答清单/TickTick 云账号同步。详情见 `TICKFLOW_INTEGRATION.md`。若开发时需要同步上游完整源码，可运行 `powershell -ExecutionPolicy Bypass -File .\scripts\sync_tickflow_upstream.ps1`，会将源码克隆至 `integrations\ticktick-clone-upstream`；该源码需要单独配置 Supabase 才能独立运行。

## 数据和策略边界

1. 初始化行情/评分是项目已有工作簿中的历史参考快照（A股网页参考约为 2026-10-09，纳指研究输入约为 2026-10-07），不是当前实时行情；请手动点“刷新公开行情”。
2. 公共行情接口不保证实时、稳定或完整，也不是交易执行行情。手动/第三方字段（如 AI 变现/融资、预期 PE、盈利修正、新闻政策、涨跌停梯队、龙虎榜等）不能仅凭一次刷新得出，必须持续核验。
3. 策略输出是研究/风险预算器，**不连接券商、不自动下单、不承诺收益**。杠杆模型保留为可调研究规则：Core 不加杠杆，杠杆上限等风险阈值必须先在自己的历史数据上测试。
4. 资产配置数值是示例起始假设，不是个性化投资建议。境内虚拟货币、跨境资金路径、境外券商/税务居民、美国资产遗产税等问题可能产生实质法律/税务风险；执行前应根据个人事实向银行、持牌机构或专业顾问核实。
5. “黄色 B”原对话确认的核心筛选条件已做成交互式规则，但完整平台公式、黄色标记源数据没有出现在可读取上下文中。涛动周期论页面目前是可验证预测框架和缺口登记，不会编造历史预测文本或图示。需补原始对话导出后才可实现逐字无损归档。

## 使用建议

先注册本地账号 → 录入真实现金流、负债、应急金和资产台账 → 核验跨境合规渠道 → 刷新公开行情 → 查看各模块的数据质量和评分解释 → 按计划记录操作日志 → 每周复盘任务、月末更新估值/汇率/配置偏离。不要因单日行情波动临时重写长期配置。

## 定时任务与 Excel 每日归档

本版本新增「定时任务」页面和默认每日行情预热任务。详情、数据来源限制与 Windows 部署说明见 `UPDATE_SCHEDULER_EXCEL_ARCHIVE.md`。
