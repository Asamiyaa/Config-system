# Prompt 06 — 从 104 个精准场景中自动选配

你正在一个已安装 Creative Frontend Starter v2.0 的项目中工作。请执行，不要只做口头建议。

用户当前任务：[粘贴业务需求]

1. 先读取项目根目录 `AGENTS.md`、`.agents/PROJECT_ADAPTATION.md`、`.agents/scenarios/AUTO_SELECTION.md`、`.agents/scenarios/COMPOSITION_RULES.md`。
2. 检查当前项目真实 UI、路由、交互数据和依赖（包括 Java/Python 后端和前端分离情况）；不要猜。
3. 运行 `python tools/pick_scenario.py "任务的核心交互" --top 5`，然后核对 `INDEX.md`。这只是关键词候选排序，需要你结合业务判断。
4. 选**一个主场景和最多两个辅助场景**，把匹配文件逐份读完；明确为何放弃无关场景。
5. 按 `SCENARIO_PROMPT_SCHEMA.md` 输出**可验收交互合同**：触发、stable id、起止状态、主/次时序、时长、缓动、反向、取消、焦点/URL、降级。
6. 实际修改代码，实现真实核心工作流，不得覆盖老项目业务、伪造数据、擅自替换框架。
7. 启动项目并做桌面/移动端浏览器 QA，测试反向、中断、键盘、触摸、reduced motion 和业务失败。记录实际运行命令、截图与控制台错误。
8. 输出修改清单、实测/未测项，必要时更新规范与场景选配索引。

禁止自动入场、无意义粒子和夸张动画；用户可操作性、状态真实性和焦点管理优先于动态效果。
