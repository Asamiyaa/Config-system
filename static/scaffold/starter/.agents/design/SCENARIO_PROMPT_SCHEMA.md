# Scene Prompt Schema — From adjectives to testable interaction contracts

> Every new interaction request should be a **specific design contract**, not an aesthetic slogan. Do not blindly copy a template: first inspect the component tree, routing model, CSS tokens and accessibility constraints.

## Copy-and-fill universal brief (paste into Codex)

```text
你是 Art Director + UX Designer + Motion Engineer + Visual QA。请直接修改当前仓库并验收，不要只提供静态效果图。

【目标与业务】
- 场景/页面：[填写]
- 谁操作、要解决什么问题：[填写]
- 入口与预期结果：[填写]
- 所属项目与技术栈：[先实际探测，勿猜测]

【交互触发】
- 用户触发：[点击/按下/滚动/键盘/触摸；明确事件]
- 起始状态：[元素 id、位置、尺寸、可见内容、焦点]
- 结束状态：[元素 id、位置、尺寸、可见内容、焦点]
- 共享元素和唯一身份：[稳定 key/id；无则写无]
- 其他元素：[保留/重排/淡出但不替代共享身份]

【运动编排】
- 0–Xms 主元素如何变化：[填写]
- X–Yms 次元素如何跟随：[填写]
- 总时长、曲线、初始速度、结束速度：[填写]
- 反向：[同锚点、同路径、同时间及缓动或说明例外]
- 中断：[连续点击/反向/尺寸变化/路由取消]
- 初始状态静止：不允许页面初始化自动入场或无意义循环

【视觉边界】
- 字体、网格、颜色、密度：[填写]
- 禁止的装饰和动效：[填写]
- 2–3 次操作可达的主任务：[填写或合理例外]

【工程交付】
- 先检查现有依赖、路由及组件；优先原生或已安装库。
- 保持现有数据真实、API、业务逻辑、Back、键盘和焦点。
- 支持 prefers-reduced-motion、触摸/键盘、无动画降级。
- 列出更改文件、状态机、可复用组件及安装/测试命令。

【客观验收】
- 初始 / 过渡中 / 完成 / 反向 / 中断各截一帧（浏览器工具可用时）。
- 桌面 1440×900 和手机 390×844；点击、滚动、Esc、Back、快速重复。
- 记录组件位置和视觉问题；不得仅凭代码编译通过宣称动效已验收。
```

## Implementation sequence Codex must follow

1. **Repo reconnaissance:** detect frontend root, framework, router, existing button/card/nav, motion library, scripts and current tests. Explicitly mention contradictions in the brief or environment.
2. **UX task map:** state 1 user goal, primary CTA, 2–3 click path if feasible, necessary success/loading/error feedback. Preserve professional information density.
3. **Motion contract:** fill the table below; choose one source of truth for route/state and one for animation progress.
4. **Vertical slice:** implement just one full forward/reverse interaction in a real page/component, then expand safely.
5. **Verification:** capture before/after/reverse and mobile snapshots, test rapid input, keyboard, back, reduced motion, performance symptoms; fix defects.
6. **Handoff:** modified files, exact entry URL/run commands, tested vs untested items, risks and suggested next iteration.

| Field | Example | Failure to reject |
|---|---|---|
| Trigger | Card click / `Enter` / user scroll | `setInterval()` rotates scene without user action |
| Identity | Stable `article.id` | Duplicated `view-transition-name` or index reused as key |
| Geometry | List image rectangle → detail hero rectangle | Unrelated new image snaps in place |
| Timeline | 0–400ms shared; 100–300ms secondary | Everything fades in simultaneously |
| Reverse | Same origin, 400ms token, recover focus | Back simply cuts to list |
| Interruption | Cancel/reverse from live progress | Stale overlay, lost focus, double submit |
| Fallback | Native/React Motion/FLIP/instant | Unsupported browser silently breaks navigation |
| Evidence | Screenshot, locator result, console state | “Looks perfect” without actual run |

## Scenario library

- `../scenarios/01_SHARED_ELEMENT_ROUTE.md` — list → detail, 400ms, View Transitions API + React Motion/FLIP fallback.
- `../scenarios/02_SCROLL_LINKED_NAV.md` — 80→56px nav over 0–100px scroll, logo 100→80%, native scroll inertia.
- `../scenarios/03_PRESS_FEEDBACK.md` — press 0.96 @ 80ms, release with configurable overshoot @ 120ms.

Read **only the scenario relevant to the task**, together with `UX_FOUNDATIONS.md`, `MOTION_SPEC.md`, `TECH_PLAYBOOK.md`, and `VISUAL_QA.md`.

## v2.0 全量场景库入口

本模板的实例不止原先 3 个：当前版本的 104 个交互契约、分类索引、冲突合并与自动选配均在 `../scenarios/`：

- `INDEX.md` — 全量场景目录。
- `AUTO_SELECTION.md` — 从真实业务任务选 1 主 + 最多 2 辅。
- `COMPOSITION_RULES.md` — 多配方控制同一动画属性时的冲突处理。
- `BUNDLES.md` — 金融终端、Agent 工作台、3D 沙盘等业务推荐组合。
- `catalog.json` — 供 `tools/pick_scenario.py` 搜索的结构化目录。

任何缺失的场景都可沿本文格式新增专属契约；不应强行套现有场景。
