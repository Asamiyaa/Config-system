# Interaction Blueprint — Task Flow, States, and Spatial Choreography

Read `UX_FOUNDATIONS.md` first. Define a useful task path **before** designing visual theatrics. Every flow needs a reachable action, visible confirmation, recoverable failure and explicit return path.

## Task-led interaction storyboard

For **each** important interaction, create a compact table before coding:

| Beat | Trigger | What changes visually | Information conveyed | State after beat | Reverse/skip |
|---|---|---|---|---|---|
| Establish | **No trigger; static initial layout** | Nothing moves automatically; focus and CTA are already clear | Where to begin | resting | n/a |
| Invite | Pointer hover / keyboard focus | Subtle, immediate affordance; no idle animation | What is clickable | preview | pointer leave / blur |
| Commit | Click/tap/keyboard activate | Shared object transforms toward destination; pressed feedback | What was selected | transitioning | user may interrupt |
| Reveal | Same user-initiated transition progresses | Container first, detail content follows by ~30–70ms | What changed, what next | detail | close/back/Escape |
| Return | Close/back/Escape | Same object follows exact inverse spatial path with same duration/easing | Where user returned | resting | repeat possible |

## Spatial continuity pattern

**Modal/drawer/card:** choose a concrete origin (the clicked button/card), a concrete destination (expanded surface), one shared identity and a reversible animation progress value. Prefer View Transitions/shared-element layout animation/FLIP where supported, preserving keyboard focus and reading order. Do not artificially stretch a button into a full page when it would be confusing; a restrained clipped-surface reveal can keep the same origin more clearly.

**Page/route transitions:** preserve identifiable common objects (title, artwork, selection, active filter) rather than replacing the entire screen with a blank frame. Preserve search, scroll or selection state when returning.

**Feedback:** a control is not finished until its pressed, loading (when real), success, error, retry and reverse behavior is specified. Reference `UX_FOUNDATIONS.md` for the feedback contract.

## Cinematic / 3D reference storyboard (opt-in only)

When the user explicitly presses Transform/Play: `2D plan → walls rise → material/lighting → camera enters → free exploration`. Use a reversible stateful timeline; no autoplay on load or background loop. Preserve camera target and object identity, allow pause, scrub, reverse and interruption. This is not a substitute for direct navigation in everyday utility interfaces.

## Architecture pattern

- `UXTaskMap`: persona, entry point, primary steps, completion, undo/retry.
- `InteractionState`: observable semantic state + accessible status.
- `SharedElementController`: original anchor, geometry, one reversible timeline and focus return.
- `SceneController` / `CameraController`: only if the task requires spatial exploration; user-controlled.
- `MotionTokens`: one duration and easing contract reused by the two directions.
- `MediaFallback`: `prefers-reduced-motion`, unsupported animation/WebGL and narrow devices.

## Decision gate: does this need 3D?

Only when spatial form, perspective, navigation or physical relationships are core to understanding. Otherwise use CSS/SVG/Canvas. Data terminals generally benefit more from clear, precise 2D transitions than 3D decoration.

## Verification matrix

- Task is findable in ~2–3 interactions when suitable; justified exceptions are documented.
- Static first paint is visually complete, no unsolicited entrance animation.
- Focus-visible, touch targets, pressed feedback, toggle status and ARIA semantics work.
- Full forward/reverse shared-element journey has matching duration, anchor, path and easing.
- Parent/primary precedes child/secondary (not all elements simultaneously moving).
- Fast repeated input, mid-flight reversal and viewport resize do not leave orphan layers.
- Loading/error/empty/confirmation are meaningful and recoverable.
- Reduced motion, narrow layout, keyboard and touch can complete the same task.

## Executable scenario blueprints (v1.2)

For reusable detailed scene specs, do not rewrite requirements from scratch. Read `SCENARIO_PROMPT_SCHEMA.md` then select the specific scenario:

| Interaction | Scenario document | Exact contract |
|---|---|---|
| Shared image + title, list → detail | `../scenarios/01_SHARED_ELEMENT_ROUTE.md` | stable ID, native View Transitions API, 400ms paired reverse, React Motion/FLIP fallback |
| Shrinking nav tied to user scroll | `../scenarios/02_SCROLL_LINKED_NAV.md` | scroll 0→100px drives nav 80→56px and logo 1→0.8 continuously |
| Pressable buttons | `../scenarios/03_PRESS_FEEDBACK.md` | press 0.96 in 80ms, release in 120ms; conservative overshoot by default |

**Conflict resolution:** scroll-driven height is not an unsolicited entrance animation: it is a directly controlled response to scrolling. Treat user scroll as the source of truth, not a threshold event that launches a separate timeline. Non-shared supplementary text may fade, but shared identity must morph continuously. The 5% release overshoot in the user example is a deliberate option, not a global default for every button.

## v2.0 场景建模的三层状态

- **Business state:** 数据/路由/权限/已保存版本，唯一真实性来源。
- **Interaction state:** idle/pressed/dragging/loading/open/error，描述可感知的任务进程。
- **Animation progress:** `0..1`，只是相应几何过渡的表现参数；必须可取消、反向、清理，**不能代表真实请求成功**。

为每个具体场景选 `.agents/scenarios/INDEX.md` 中的专属交互剧本并填 1 张契约表。对复杂多个场景组合，只允许一个主控制器修改某个 DOM/3D 属性。异步业务不可逆时仅控制视觉层，不能假装网络数据倒回去。
