# Taste Skill 重构说明

## 来源

- Skill 仓库：<https://github.com/Leonxlnx/taste-skill>
- 已安装到本机 DSH skills：`C:\Users\Administrator\.dsh\skills\taste-skill`
- 本地开发临时镜像已清理，不再依赖 `.tmp_taste/`

## 方向

`draw.mjs --app` 给出的原始方向：

- Style：**Data terminal**（dark）
- Seed：`1661905713`
- 产品 brief：Wealth OS，个人资产、健康、流程与学习操作系统

按 `app-screens.md` 的规则做了一次有理由的 redraw：

- 原方向给的是 50px 图标 rail；
- 本项目有 11 个一级目的地，中文标签需要可读；
- 因此保留 **232px labelled sidebar**，仍保持 data-terminal 的 1px accent selection line、dark neutral ground、mono figures 与 density。

## 视觉系统

| 项目 | 选择 |
|---|---|
| 字体 | **Public Sans**（本地 woff2，中文回退 Noto Sans SC / PingFang / 微软雅黑） |
| 数字 | **DM Mono**，tabular-nums |
| 底色 | `#171719` |
| 面板 | `#131217` |
| 边框 | `#222224`，1px |
| 主文本 | `#ffffff` |
| 次文本 | `#b4b6ba` |
| 弱文本 | `#8a8c92` |
| Accent | `#4a8ad6`，只用于选择线、数据图和状态点 |
| 圆角 | 6px（不再 12–20px 大圆角） |
| 间距 | 24px 单一 gutter，32px canvas padding |
| 控件 | 32–36px 高，主按钮白底黑字，次按钮透明描边 |
| 动效 | 只有 press/hover/focus/sheet 反馈；无入场动画 |

已移除：

- 绿色/柠檬色主色与 glow；
- 卡片、按钮、背景的渐变；
- 玻璃模糊；
- 彩色图标方块；
- 大面积 uppercase eyebrow；
- 装饰性圆角、发光边框、仪表盘深蓝底；
- 每个 KPI 上的图标。

## 壳层与交互

### Sidebar

- 11 个目的地按「日常 / 系统 / 积累」分组；
- 统一 16px 线性 SVG 图标；
- active 状态是中性灰 pill + 1px 蓝色下划线；
- 去掉 `90D / OS / NEW / 02` 等装饰性 badge；
- 桌面可折叠为 56px icon rail，状态保存在 localStorage；
- 移动端全屏抽屉，标签保留。

### Command palette

- `Ctrl/Cmd + K` 或点侧栏「搜索页面」打开；
- 搜索页面、方向键选择、Enter 跳转、Esc 关闭；
- 替代“点很多层侧栏”的交互；
- 移动端同样可用。

### Auth

- 去掉营销式大标题、轨道和渐变装饰；
- 只保留品牌 + 一个安静的登录面板；
- 登录页不再显示汉堡菜单或侧栏。

### 页面

- 标题改为名词：工作台 / 待办 / 流程 / 切记 / 风控 / 健康 / 外语 / 书单 / 归档 / 分身 / 新登；
- 列表页与详情页统一 `page-head` 左边缘；
- 关注点从 5 张图标卡改为 **一张 divided ledger**；
- 四象限改为 **单卡四行 ledger**，避免空卡片被拉高；
- KPI 改为 divided strip（4 格 / 2 格移动端）；
- 表格使用 13px 正文、12px 表头、右对齐 tabular figures；
- Tab 全部改为 underline + 1px accent，不再使用 pill；
- 面板描述统一隐藏，把信息让给数据和操作；
- 认证页、空状态、错误态、弹层、toast 统一 surface/border/radius。

### 字体与数字

- Public Sans 通过本地 `static/fonts/public-sans.woff2` 加载，不依赖 Google Fonts；
- DM Mono 通过本地 `static/fonts/dm-mono-400.woff2` / `dm-mono-500.woff2` 加载，用于金额、分数、日期与表格数字；
- `#appShell` 全部 figures 使用 `font-variant-numeric: tabular-nums`；
- 金额、分数、日期、表格数字保持等宽。

## 文件

- `static/taste.css`：tokens、shell、导航、卡片、表格、表单、tabs、auth、移动端、palette
- `static/taste.js`：command palette、sidebar collapse、active nav、标签本地化
- `static/fonts/public-sans.woff2`
- `static/favicon.svg`：红黑斜线 favicon
- `static/index.html`：新 shell、SVG 图标、导航分组、palette
- `static/app.js`：页面标题、home 结构、market panel 顺序、关注点语义
- `static/english_os.js` / `reading_os.js` / `newconfig_os.js`：标题名词化

## 验证

### Taste inspector

对登录后的首页做 clean snapshot（移除 auth 屏）后：

```text
RESULT: 0 FAIL, 2 WARN — measurements pass.
```

剩余 WARN：

- `tiny-text`：80% 文本在 13px 以下。属于 data-terminal 的密集标签策略；正文 13px、标签 11–12px、标题 26px，未继续放大以保持信息密度。
- `no-data-hue`：首页本身没有可绘制的数据图表，7 个 timeline 是日历/任务骨架；数据色出现在各模块图表与矩阵计数（蓝色）。

`lint.mjs`：**0 FAIL, 44 WARN**。WARN 主要是 `box-shadow:none`、`backdrop-filter:none` 的字面匹配和刻意保留的数字 mono。

### 浏览器

- 1440 / 768 / 390 三个宽度检查；
- home、health、newconfig、english、reading、agents、dailyflow、dashboard；
- 以及 schedules、mistakes、allocation、nasdaq、ashare、execution、archive、checkin、diet、fitness、skin、sleep、style；
- 所有页面 `scrollWidth === innerWidth`，无横向溢出；
- 登录、palette、主题切换、侧栏折叠、English tabs、Reading tabs、sheet 打开均可用；
- 无 pageerror / console error。

截图目录（本地验证，不提交）：`_ui_taste_after/`。
