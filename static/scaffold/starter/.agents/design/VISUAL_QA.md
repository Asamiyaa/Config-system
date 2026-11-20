# Visual & UX QA — Evidence, Not Self-Praise

## Required browser checks
1. Start the actual app and verify the exact address/port, build and API dependencies.
2. Take desktop (1440×900) and mobile (390×844) screenshots of **static first paint**; verify nothing enters, breathes or loops automatically.
3. Capture at least one user-activated primary interaction, its completion and its reverse/close state. The same origin element should visibly return.
4. Test the **top 3 tasks** from natural entry points. Record clicks/taps to the primary action, target outcome and whether unnecessary navigation occurred. Aim for 2–3 interactions for frequent tasks where safe and reasonable; do not remove confirmation for risky actions.
5. Exercise click/tap, keyboard focus/Enter/Escape, touch, scroll where relevant, rapid repeat, mid-flight reverse, and browser Back.
6. Validate immediate press feedback (within approximately 100ms), toggle/selection state, real loading/confirmation, validation errors, retry/undo and no fabricated success.
7. Inspect console/page errors, failed fonts/media, layout overflow, clipped text, hidden controls and contrast. Compare at least 3 screens for consistent design tokens.
8. Verify `prefers-reduced-motion: reduce` (same functionality, nonessential travel removed).
9. Compare actual screenshots with references and revise the **three highest-impact issues** first: task flow → information hierarchy → styling → motion polish.
10. Run the motion acceptance cases below and record real evidence. Never claim success when no browser/device test occurred.

## Motion acceptance: the six laws
- **Continuity**: expanding card/modal shares visible origin with trigger; closing returns to that anchor; not unrelated fade-out/fade-in.
- **Physical easing**: no linear constant-speed movement or exaggerated spring bounce; test start, midpoint and settle behavior.
- **Layered timing**: container/primary begins first, subordinate info follows. No uniform all-elements fade-up.
- **User initiation**: idle page has no animated entrance, decorative particles, breathing or auto-carousel; user can deliberately press Play to run a bounded sequence.
- **Symmetric reverse**: forward/reverse share exact anchor, geometry path, duration and easing token. Capture both and inspect interruption at ~50%.
- **Micro feedback**: press/toggle/validation response is subtle and prompt, accompanied by meaningful text/semantic state when necessary.

## Joint UI/UX critique
- Does the first viewport have one deliberate primary action and reading path, or a supermarket shelf of functions?
- Can new users find and complete the top task without drilling through unrelated menus?
- Are dense screens organized by decisions rather than simply removing useful data?
- Are buttons, icons, status colors, spacing and motion patterns consistent across views?
- Does each action confirm result, progress or failure honestly and allow recovery?
- Is essential information usable without motion or pointer hover?
- Is the experience stable on narrow screens, keyboard and reduced-motion modes?

## Optional CLI capture
Install Playwright **in the target project or disposable environment** and run:
```
npm install -D playwright
npx playwright install chromium
node tools/visual_audit.mjs --url http://localhost:5173 --output visual-audit
```
The script captures desktop/mobile and baseline interactions but **does not automatically prove** click depth, reversal fidelity, motion quality or design quality. Complete manual task and visual review as well.

## Deliverable report format
```
UI/UX + Motion QA Report
- Environment / actual command:
- Top 3 user tasks, steps to key action, and justifications for extra steps:
- Desktop screenshot (static):
- Mobile screenshot (static):
- After explicit interaction screenshot:
- Reverse/interruption screenshot and matching path/timing evidence:
- Idle animation check:
- Press / loading / success / failure / retry evidence:
- Screen-to-screen UI consistency:
- Keyboard / touch / reduced motion:
- Console / page errors:
- Top 3 issues fixed:
- Remaining limitations / untested items:
```

## Additional scenario acceptance (v1.2)

Use the detailed matrix in `../scenarios/01_SHARED_ELEMENT_ROUTE.md`, `02_SCROLL_LINKED_NAV.md`, `03_PRESS_FEEDBACK.md`. Required extra evidence:

- **Shared route:** selected cover/title unique active names; list→detail and Back use one 400ms token, meaningful mid-transition continuity, scroll/focus restore; check API unavailable and loading image.
- **Scroll nav:** at scrollY **0/25/50/75/100px**, computed heights should be approximately **80/74/68/62/56px**, logo scale 1/.95/.9/.85/.8; verify return values and stable document content.
- **Press:** pointer hold reaches 0.96 at ~80ms; pointer release returns to 1 by ~120ms (with only selected subtle overshoot), pointercancel and disabled states work; hover has no enlargement/glow; keyboard and reduced-motion succeed.
- **Only claim tested behavior.** A test file and a runnable demo do not prove browser tests were executed. Record browser version and screenshots when tests actually ran.

## v2.0 场景级自动验收协议

任何匹配 `.agents/scenarios/` 的实现，在完成后需提交：场景编号、真实触发操作、0/50/100%（或起始/完成）几何/状态证据、同路径逆向（可逆时）、40%中断、重复10次、失败/取消、无障碍、窄屏、reduced-motion 的实测记录。

- 对直接输入拖拽：检查进度映射误差和手指/指针偏离，不应让真实滚动出现跟手滞后。
- 对图表：抽样比较原始时间戳/数据点与图形坐标；真实 API 错误不会变成演示数据。
- 对三维：实际记录相机起止 position/target/fov 和模型矩阵；有意性与可逆性可通过状态值验证。
- 对浮层：检查 ESC/Tab/焦点返回/背景不可互动、动画取消后无多余覆盖层。
- 仅有单元测试或静态截图不构成视觉验收；若运行浏览器受限，明确标注未测。
