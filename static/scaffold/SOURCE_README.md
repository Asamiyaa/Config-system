# Codex AI Learn Studio · Creative Frontend v3.0

**把 `aiLearn.rar` 的案例学习站，与 Creative Frontend v1.2 的 UI/UX/Motion 规则和 v2.0 的 104 个交互配方结合，交付独立学习网站 + 3 个可调用 Codex Skills + 安全安装器。**

## 解包与资料来源（据用户上传的 aiLearn.rar 实际抽取）

| 来源 | 实际结构 | 在本项目的落点 |
|---|---|---|
| aiLearn 原站 | `index/view/editor/compare/template/settings.html` 6 页面 | `source-aiLearn/` 和自包含 `learn-studio/original/`，保留运行入口 |
| aiLearn 案例 | `data/cases.json` 中 2 个 B/C 案例 | `learn-studio/assets/seed-data.js`，保留原参考 SVG |
| aiLearn 模板 | `data/promptTemplates.json` 中 2 个五维 AI 视觉拆解 Prompt | 变为可搜索、可复制的 2 条学习模板 |
| aiLearn UI 规范 | `UI_DESIGN_GUIDELINES.md` | `.agents/design/AI_LEARN_KNOWLEDGE_ARCHITECTURE.md` & 旧站参考 |
| Impeccable | 上传包内 `.codex/skills/impeccable/SKILL.md`、参考文档 | `references/impeccable-extracted/`（仅文本参考，排除原二进制引擎），映射见 `.agents/design/IMPECCABLE_REFERENCE_MAPPING.md` |
| Creative Frontend v1.2 | `UX_FOUNDATIONS / DESIGN_SYSTEM / MOTION_SPEC / INTERACTION_BLUEPRINT / VISUAL_QA` | `template/.agents/design/` |
| Creative Frontend v2.0 | 104 份场景 Markdown / `catalog.json`、检索工具 | `template/.agents/scenarios/` / `template/tools/pick_scenario.py`，嵌入网站后共 108 条知识 |

**重要**：104 个场景均有完整配方，但并非 104 个全功能动态组件。新网站内置 10 种类型的交互示意（共享元素、Morph、滚动导航、按钮反馈、拖拽、图表、时间轴、CSS 3D、命令面板、侧栏）。完整 3D/React/路由实现需由 Codex 在目标项目继续开发并验证。

## 目录说明

```
.
├── learn-studio/                   # 独立学习网站，支持添加模块/子模块/知识、上传图、搜索、编辑、备份
│   ├── index.html                  # 主入口：左侧预览 + 右侧完整 Prompt
│   ├── guide.html                  # 网站使用说明
│   ├── assets/seed-data.js         # 104+2+2 原生可离线读取的知识数据
│   ├── original/                   # aiLearn 原站自包含副本
│   └── labs/                       # 原 v2 交互实验室
├── source-aiLearn/                 # 从用户上传档案提取的原站代码/种子资源（精简归档）
├── references/impeccable-extracted # 用户上传档案里的设计 Skill 文本参考，未复制运行器和 exe
├── template/
│   ├── AGENTS.md
│   ├── .agents/design/             # UI + UX + Motion + Learning Architecture
│   ├── .agents/scenarios/          # 104 场景及自动选配索引
│   ├── .agents/skills/             # 3 个直接调用的 Codex Skills
│   └── tools/                     # 场景检索与知识同步到 Skill
├── tools/sync_knowledge.py        # 将网站导出的自建知识批量制作为独立 Skill
├── demo/                          # 原 v2 单独交互 Demo
├── install.py                     # 既有项目安全安装/升级器
├── install_windows.bat
├── tests/
└── browser-qa/                    # Chromium 部分体验验证报告与截图
```

## 打开学习网站

Windows：双击 `learn-studio/start_windows.bat`（需要 Python），浏览器打开 `http://127.0.0.1:8768/`。也可以直接打开 `learn-studio/index.html`，但更推荐本地 HTTP，以保证不同浏览器的持久化行为稳定。macOS/Linux：

```bash
cd learn-studio
python3 -m http.server 8768 --bind 127.0.0.1
# 打开 http://127.0.0.1:8768/
```

打开后可以：
- 按模块和子模块浏览 108 条内置知识、按关键词搜索、仅看可交互 Demo、收藏、记录学习进度。
- **左侧效果预览、右侧完整 Prompt**。内置内容只读；点击“复制为新知识”可修改自己的版本。
- 新建知识点，填写完整 Prompt、适用场景、标签、演示类型、参考图片；编辑、删除自己创建的知识。
- 新建、重命名、删除自建模块/子模块；删除模块时知识不会被删除，会迁移至其上级。
- `备份数据` 导出 JSON，包括新增知识、模块、状态、上传的图片；`导入知识` 可恢复。同样可导入原 `aiLearn` 的 `cases.json` 的文本部分。
- 从详情页复制 Prompt，导出单项 Skill Markdown，或打开独立交互实验室。

本网站使用浏览器 localStorage（文本与设置）+ IndexedDB（新增图片），**不是云同步**。请定期导出 JSON 并将备份放入自己的版本管理/备份目录。导入的原案例 JSON 如不包含实际图片字节，无法恢复原 IndexedDB 图片。

## 安装到新旧项目（Codex）

先预览老项目将增加哪些文件：

```bat
install_windows.bat --target "D:\\existing-project" --mode existing --upgrade-managed --with-learning-site --dry-run
```

正式安装：

```bat
install_windows.bat --target "D:\\existing-project" --mode existing --upgrade-managed --with-learning-site
```

新项目：

```bat
install_windows.bat --target "D:\\new-project" --mode new --profile editorial --with-learning-site --scaffold-demo
```

原项目的业务文件不覆盖，重复安装安全；仅 `--upgrade-managed` 可覆盖 **字节完全一致** 的旧版本受管规范，改动过的用户规范会跳过。新的学习站默认安装到 `ai-learn-studio/`，与业务页面隔离。安装器检测常见 React/Vue/Next/Java/Python 项目，但不自动重写业务框架。

安装后，Codex 可以直接调用：

```text
$creative-frontend-director 请分析当前页面的 UI/UX，按既有架构完成视觉升级，最后提供浏览器验收报告。

$interaction-recipe-executor 点击列表卡片后实现共享元素过渡，返回时完全反向，键盘和减少动态效果模式可用。

$ailearn-knowledge-curator 把本次设计和交互复盘归档成可复用知识，给出场景 Prompt 和验收检查清单。
```

对应文件分别位于 `.agents/skills/creative-frontend-director/SKILL.md`、`.agents/skills/interaction-recipe-executor/SKILL.md`、`.agents/skills/ailearn-knowledge-curator/SKILL.md`。使用前应保证 Codex 会扫描目标工作区的项目 Skills 路径；若未自动识别，也可明确让 Codex 读取对应 SKILL.md。

## 让网站自建知识变成更多 Skill

1. 在网站中添加知识，点击“备份数据”，得到 `ai-learn-knowledge-backup-YYYY-MM-DD.json`。
2. 从脚手架根目录运行：

```bash
python tools/sync_knowledge.py --input ai-learn-knowledge-backup-2026-11-20.json --output "D:/existing-project" --dry-run
python tools/sync_knowledge.py --input ai-learn-knowledge-backup-2026-11-20.json --output "D:/existing-project"
```

3. 新增的每个知识都将成为目标项目 `.agents/skills/knowledge-<id>/SKILL.md`，**同名已存在则跳过**。这是单向导出草稿，不会自动把项目变更写回网站。建议把验收截图、测试经验和变更记录手工补回知识库。

## 验收与限制

- Python 单元测试：`python -m unittest discover -s tests -v`。
- JavaScript 静态语法：`node --check learn-studio/assets/app.js`。
- 浏览器交互回归：`python browser-qa/ailearn_qa.py`。**本环境阻止访问 file:// 与 localhost，所以该测试通过 Chromium 注入真实 HTML/CSS/JS，并模拟 localStorage**；不等同于实际部署后的整站网络、文件权限和 IndexedDB 图片读写验收。
- 结果和截图见 `browser-qa/ailearn-qa-report.json`、`browser-qa/ailearn-studio-desktop.png`、`browser-qa/ailearn-studio-mobile.png`。
- 原 aiLearn 的视觉 AI 演示模式是 Mock；没有接入用户密钥，不会声称模拟结果来自真实模型。若部署互联网，真实模型密钥应由后端安全保管，不能依赖浏览器本地存密钥。
- 第三方 Impeccable 的启动器/可执行文件不在新 ZIP 里。使用其参考文档时应检查上游授权；这份脚手架不宣称自带第三方运行器。
