# Creative Frontend v1.1 Release Checklist — UI + UX + Motion

## UI / UX / information architecture
- [ ] Top 3 user tasks mapped (entry → operation → result → undo/recovery)
- [ ] Primary action visually obvious and not buried beneath competing features
- [ ] Frequent core actions reachable in about 2–3 taps/clicks where appropriate, exceptions justified
- [ ] Information grouped by decision; high-density professional workflows retain necessary data
- [ ] Typography, color meaning, icons, spacing and controls consistent across screens
- [ ] Hover/focus/press/selection has prompt, subtle, accessible feedback
- [ ] Real loading, success, empty, validation error, API error, retry and undo handled

## Motion (six laws)
- [ ] No load entrance, decorative idle movement, autoplay scene/carousel, or scrolling fade-up
- [ ] User-initiated transition retains identifiable shared element and spatial anchor
- [ ] Physical non-linear easing; no mechanical constant speed or exaggerated spring
- [ ] Primary container moves first and subordinate content follows in layered timing
- [ ] Expand/collapse or enter/exit reverses along same path, duration and easing
- [ ] Micro feedback is immediate, small and not visually distracting
- [ ] Reverse mid-flight and repeat 10× do not corrupt state or focus
- [ ] All content usable in reduced motion, keyboard and touch scenarios

## Engineering and evidence
- [ ] Existing routes, APIs, business logic, real data provenance and error behavior preserved
- [ ] RAF, event listeners, timers, animation and graphics resources cleaned up
- [ ] Layout overflow, contrast, clipping and responsive breakpoints checked
- [ ] Actual desktop/mobile static, interaction and reverse screenshots inspected
- [ ] Actual working app run, console/page errors and untested limitations recorded
- [ ] Final report contains task steps, visual defects, motion evidence and unresolved risks

## Scene precision tests — pick only the applicable scenarios
- [ ] **Shared route:** unique ID to cover/title, 400ms forward/reverse, list scroll + focus restored, fallback if View Transitions unavailable
- [ ] **Scroll nav:** 80/74/68/62/56px at 0/25/50/75/100px scroll, logo scales accordingly, no threshold snap or content jump
- [ ] **Micro press:** 0.96 @ 80ms, settle @ 120ms; keyboard, pointercancel and disabled safe; no hover zoom/glow
- [ ] No double animation from simultaneously using native View Transitions and Motion for the same element
- [ ] Test screen captures / computed measurements stored with actual commands and browser version, or explicitly mark untested

## v2.0 全量交互库（按实际选配）
- [ ] 使用 `tools/pick_scenario.py` 或 INDEX 选出一个主场景，理由可信
- [ ] 选择最多两个辅助场景，已阅读所有实际匹配 Markdown
- [ ] 同一动画属性只有一套引擎/进度控制器，业务状态和视觉状态分离
- [ ] 对当前场景执行专属验收断言（见对应 Markdown），并记录实测结果
- [ ] 中断反向与真实异步请求的业务正确性分别经过测试
- [ ] 如浏览器不能执行，报告“未验证”而非自评通过
