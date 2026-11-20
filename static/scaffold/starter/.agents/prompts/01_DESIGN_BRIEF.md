# Prompt 01 — 设计审美/交互简报

进入 Art Director + UX Director + Information Architect 模式。先检查实际项目，再执行设计，不要立即写大量代码。遵循 AGENTS.md 和 `.agents/design/*`。

项目：[填写项目名]
目标用户：[填写]
用户最重要的操作：[填写]
视觉参考：[截图或链接，未提供时列出 2–3 种候选方向并选最合理的一种]

先产出：
1. 顶部 3 个用户任务的 UX Task Map：入口 → 点击/操作步骤 → 完成 → 撤销/错误恢复；高频核心操作争取 2～3 次点击可达，不适用时解释原因。
2. 一句话的视觉主张、唯一核心焦点，明确避免功能堆砌、信息过载与风格不统一。
3. 视觉焦点、阅读路径、网格、字体、色彩、密度、设计 Token。
4. 最重要的 3 个交互、每个交互的状态转换和撤销方式。
5. 动效清单（时长、缓动、触发、用户信息收益）。
6. 只选一种最值得实现的标志性交互并说明原因。
7. 对现有代码/设计的兼容方案和风险。

必须规定触发后反馈、加载/成功/错误/撤销；默认首屏静止，禁止自动入场；可逆形变保持同一路径/时长/缓动，并按主容器先于子元素的层次编排。

不要用“高级感”“很丝滑”替代具体设计决策。随后实现最小高保真切片。

**Reusable precise scenarios:** Read `.agents/design/SCENARIO_PROMPT_SCHEMA.md` and use `.agents/scenarios/AUTO_SELECTION.md` and `python tools/pick_scenario.py "需求"` to select a primary recipe from all 104, optionally up to two aids. State exact IDs, sizes, timing, trigger, reverse, fallback and test proof, not just “丝滑”.
