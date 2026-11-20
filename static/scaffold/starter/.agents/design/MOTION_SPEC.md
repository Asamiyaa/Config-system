# Motion Specification — Six Laws of Intentional Interaction

**Product default: motion only when the user has explicitly interacted.** Do not autoplay entrance sequences, floating/breathing decoration, background particles, scrolling reveals or automatic carousel loops. Initial content is fully present and legible. User-initiated presses, selections, drags, scroll scrubbing (when scroll intentionally controls content), open/close and explicit Play buttons are valid triggers. Asynchronous completion may update a status immediately; animate that state only when it is a direct, user-initiated flow and a transition improves understanding.

## Six non-negotiable motion principles

1. **State continuity, no unexplained cuts.** Prefer moving, transforming and reorganizing the *same recognizable element*, rather than destroying the old node and fading in unrelated content. A detail surface grows from its activating card/button (shared-element/FLIP), and collapses to that anchor on close. Use a cut only when continuity would be misleading or inaccessible, then document why.
2. **Physical easing, not mechanical motion.** Use purposeful acceleration/deceleration and mild inertia; never linear constant-speed travel. Spring may settle short micro feedback, but no exaggerated bounce, overshoot, wobble or perpetual float. Pointer tracking can map input directly; on release use controlled non-linear settling.
3. **Layered timing, not synchronized animation.** Parent container or primary object begins first; subordinate labels/content follow with small, purposeful offsets (e.g. 30–70ms). Keep combined duration restrained; don't make every item animate separately. Reverse choreography should preserve visual hierarchy and spatial meaning.
4. **Interaction-driven only.** No auto-entrance on load, scroll-triggered ornamental fade-ups, ambient breathing, unattended rotation, idle particles, or auto-advancing scenes. Motion must clearly result from explicit user intent, including pressing Play for a bounded cinematic demo. Static states must remain attractive. Loading feedback should exist only while actual loading is happening, not as an idle decoration.
5. **Forward/reverse symmetry.** For each reversible interaction, preserve **the exact same anchor, spatial path, duration, and easing token** when reversing. Expand/close and enter/exit must belong to one reversible timeline or shared-element controller rather than separately authored mismatched animations. If the user interrupts mid-flight, reverse from the *current interpolated state*, not a reset. Any safety/accessibility exception must be documented.
6. **Precise micro feedback.** Buttons, toggles, validation errors and focus cues respond within the frame or normally within ~100ms. Use subtle millisecond-scale transform, scale (e.g. 0.98–0.995), border, color or small shifts. Error feedback must also include text and accessible state; never make a shake the only signal.

## Default motion tokens (starting points; customize by interface)

| Interaction | Duration | Easing/behavior | Notes |
|---|---|---|---|
| Button press/release | 90–160ms | non-linear ease-out; matched reverse token | Subtle, press-origin feedback |
| Toggle / choice | 140–240ms | non-linear ease-in-out | State remains unambiguous |
| Shared element / panel | 260–420ms | `cubic-bezier(.22, 1, .36, 1)` | Both directions use same path, duration, curve |
| Parent → detail reveal | within main 260–420ms | child begins after ~30–70ms | Parent leads; avoid delayed task completion |
| Deliberate scene step (only after explicit trigger) | 500–1000ms | designed camera curve | Do not autoplay on page load |

Declare tokens once, e.g. `--motion-panel-duration: 340ms`, `--motion-panel-ease: cubic-bezier(.22, 1, .36, 1)`; use those same exact tokens for forward and reverse. Respect `prefers-reduced-motion` by eliminating nonessential travel and using an immediate, accessible state update.

## Recommended choreography

`Idle static → user input → immediate press/focus feedback → primary container/subject transform → secondary information reveal → resting state → explicit reverse gesture → symmetric return`.

Example **button → detail**:
- On click, store the actual trigger's bounding box and last focused control.
- Animate a single visual surface from trigger bounds to detail bounds using FLIP/shared-layout transition; retain continuity of shape, location and identity.
- Start detail typography/controls slightly after container movement starts. Do not trap content until dialog and focus behavior are ready.
- On close/back/Escape, use the same path/duration/easing to return to the original anchor; return keyboard focus to the trigger.
- If layout changed or anchor disappeared, choose the nearest semantically valid return destination and document that exception.

## State machine and interruption

Separate semantic UI state (`closed | opening | open | closing`) from timeline progress `0..1`. Do **not** build unrelated `enter()` and `exit()` animations. On a new action, stop/cancel the previous animation safely, use its current visual state, and move to the requested target. Handle tab switches, resize, route changes, and rapid clicking without duplicated overlays, stale listeners or focus leaks.

## Performance and verification

- Animate compositor-friendly transform/opacity where possible; use measurement + FLIP rather than unbounded layout reads per frame.
- Remove RAF, observers, timers, GSAP contexts and GPU resources when disposed; invisible views shouldn't consume resources.
- Test on realistic viewport/content/performance conditions. Target ~60fps when feasible, but do not claim it without measurement.
- Test: opening/closing 10×, double click/interruption mid-transition, switching tabs rapidly, reverse path overlay, keyboard focus, narrow viewport and reduced-motion.
- **Detect unsolicited motion**: on idle load with no interaction, the scene must stay still; after Play completes, no unintended loop may continue.

## Per-interaction motion record

| Trigger | Shared anchor | Start/end geometry | Easing token + duration | Parent/child timing | Reverse route | Cancel/interruption | Reduced-motion |
|---|---|---|---|---|---|---|---|

Any motion without a filled-in record should be treated as suspect and removed unless explicitly justified.

## Scenario-level overrides and precision

- When the brief specifies exact motion values, apply them **locally**, not to every component. The original three precision contracts and the v2.0 expanded catalog are in `../scenarios/INDEX.md`.
- Scenario 01: shared cover + title use a unique stable ID, 400ms total, coherent forward/reverse; supporting content may fade only if shared identity remains continuous.
- Scenario 02: scroll 0–100px maps nav height 80→56px and logo 100→80% **continuously**. This is user-directed scrubbing, not autoplay. The browser already supplies native scroll inertia; never add an unrelated 150ms lag to real scroll position.
- Scenario 03: the requested `.96` press at 80ms / release at 120ms is a **deliberate component variant**. A 1.05 release peak is a noticeable 5% overshoot; reserve it for an explicit demo. Use subtler 1.005–1.015 in professional data tools unless directed otherwise.
- If exact global symmetry and reliable focus conflict with a browser lifecycle/route unmount, maintain correct navigation/focus and describe the exception honestly; do not fake an unsupported reverse effect.

## v2.0 约束分级

原有三种精确参数只对其对应场景有效。104 个独立场景的参数以该场景文件为准：

- **直接操纵**（拖拽/时间轴/滚动/镜头拖动）必须与用户输入精确同步，不能施加人为滞后；结束吸附才允许缓动。
- **真实外部事件**（网络状态/行情推送/保存完成）可以引发语义状态更新，但不等于允许装饰性自动持续动效。
- **不可逆业务**（已发送邮件、已提交交易、服务端删除）绝不可为了动画对称而假装可以反向；视觉可逆与业务撤销分开。
- **场景组合**时由主场景持有单一进度源；辅助场景不得在同一 DOM transform/opacity 属性叠加第二动画引擎。
- **浏览器/用户设备低能力**时，首要是稳定可用的静态降级；性能和焦点正确性比炫技更重要。
