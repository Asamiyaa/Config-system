# UX Foundations — Attention, Information Architecture, and Reliable Feedback

> **Priority: users must find and complete the primary task before we make it beautiful.** Read alongside `DESIGN_SYSTEM.md` and `MOTION_SPEC.md`. UI (what users see) creates comprehension and confidence; UX (how the task works) makes the experience usable. Neither excuses deficiencies in the other.

## 1. Avoid three common APP design failures

| Failure | Observable symptom | Required design action | Acceptance evidence |
|---|---|---|---|
| **Feature pile-up** | Every feature, banner and shortcut competes on the home screen | Identify the **one primary task/CTA per screen**; group related secondary actions; use progressive disclosure rather than deleting important capabilities | Tester can identify the primary action within ~5 seconds; no more than one equally prominent CTA per task zone |
| **Information overload** | Disconnected panels, promotions, repeated labels, excessive density | Order information by the user's decision sequence; use hierarchy, whitespace, grouping, filters and contextual detail; protect essential data | A user can answer “Where am I, what changed, what do I do next?” without scanning unrelated content |
| **Inconsistent design language** | Contradictory card, button, icon, spacing, color and feedback conventions | Reuse one component vocabulary and centralized tokens for type, spacing, semantic color, state and motion | Compare at least 3 representative pages; identical controls behave and look the same |

**Important exception for professional tools:** Low density is not a virtue if it hides required data. For finance, analytics, developer tools or monitoring, aim for *high information density with low cognitive friction*—alignment, grouping, progressive detail, keyboard shortcuts, stable data positions, no unnecessary click-through.

## 2. UI and UX must be designed together

- **UI / appearance**: typographic rhythm, color, iconography, visual salience, perceptual grouping, affordances.
- **UX / journey**: information architecture, intent recognition, discoverability, reachable core actions, feedback, error recovery, accessibility and return paths.
- **One joint acceptance test**: an interface must look composed **and** allow a user to complete the central task with clear next steps.

## 3. Primary flows should be short, not artificially compressed

For each target persona, name the **top 3 tasks** and map: entry → key decision(s) → result → reverse/recovery. For routine tasks (search, place order, save/favorite, select a stock, view details), **aim for the core operation reachable in 2–3 clicks/taps from the natural entry point**. This is a heuristic, **not a hard universal rule**: checkout confirmation, destructive actions, authorization and complex expert workflows may require additional, clearly justified steps. Never remove necessary confirmation to chase a click-count target.

- Prefer clear navigation and discoverable search over nested “More” menus for the primary task.
- Prioritize bottom navigation **where it fits mobile usage and information architecture**; never add bottom tabs blindly to desktop/expert interfaces.
- Reduce redundant transitions, duplicate confirmations and dead-end detail screens.
- Support meaningful back navigation and return to prior context (selection, filters, scroll position) when appropriate.
- Avoid turning every single data detail into a modal; keep the primary workflow uninterrupted.

## 4. Action feedback contract (no silent taps)

Every actionable control needs a clear and timely response. The response can be **visual, semantic, textual, haptic (where supported), or navigation**; avoid stacking many mechanisms for one event.

| User action/state | Required feedback | Recovery / accessibility |
|---|---|---|
| Press / click | Immediate subtle pressed state, ideally in the next frame; generally perceptible within ~100ms | Native button semantics; `:focus-visible` for keyboard |
| Toggle / selection | Control state visibly changes; confirmation remains identifiable | `aria-checked`/`aria-pressed` as appropriate; toggling back is easy |
| Waiting (network, calculation) | Loading indicator, skeleton or progress **when there is actual waiting**; avoid fake progress | Prevent accidental duplicate submissions without locking unrelated UI |
| Success | Reflect the new persisted state; optional brief confirmation when not already obvious | Do not claim success before confirmation from backend |
| Validation error | Explain what failed, where, why and how to fix it; preserve valid user input | Link error to field; don't rely only on red color or a shake |
| Network / API error | Explicitly report failure, offer retry or fallback and timestamp/status when data-driven | Keep previous valid state where safe; never silently manufacture data |
| Undo / close | Return to recognizable previous state and restore focus/context | Reversible action where feasible; destructive actions need appropriate safeguards |

Micro-interaction motion is governed by `MOTION_SPEC.md`: no decorative, unsolicited animation.

## 5. Deliverable: UX Task Map

Before implementing a feature, write a small task table:

| Persona/task | Entry | Steps to first value | Primary CTA | Success signal | Error/undo | Current friction | Proposed change |
|---|---|---|---|---|---|---|---|
| Example: reader saves article | Article view | 1 tap | Save | Saved state + accessible label | Undo save | Icon not understandable | Label action, keep location stable |

**UX pass criteria:** the central task is discoverable, the click/tap path is defensible, every meaningful action gives feedback, failures are recoverable, and visual semantics remain consistent across screens. If the app requires many steps, explain why rather than hiding that fact.

## v2.0 — UX 信息架构必须驱动场景选配

选择互动效果之前，先用真实业务任务定义：触发入口、核心结果、是否可撤销、键盘/触摸与错误恢复。不同视觉技术只是完成该任务的工具。使用 `../scenarios/AUTO_SELECTION.md` 和 `../scenarios/INDEX.md` 选主场景与最多 2 个辅助场景；不要因为配方很多，就把所有交互塞到首页。
