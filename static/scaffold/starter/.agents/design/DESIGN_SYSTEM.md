# Design System — Visual Direction and Quality Bar

## 1. Aesthetic principle
Good visual experience = **clear information architecture + disciplined typography + intentional, user-triggered motion**. Avoid aesthetic-by-adjective instructions like "cool", "high-tech", "Apple-like". Convert intent into observable decisions and explicit anti-patterns.

## 2. Choose one primary profile
The installer sets a suggested profile in `creative.config.json`, but validate against actual product needs:

| Profile | Visual identity | Layout rule | Motion focus | Exclude |
|---|---|---|---|---|
| `editorial` | Swiss editorial, confident type, generous whitespace | Typographic grid, large negative space | Shared-element reveal, restrained scroll rhythm | Excessive glassmorphism, noisy backgrounds |
| `data` | Precision instruments, readable dense information | Stable panels, aligned numbers, explicit statuses | Data interpolation, visual continuity, focus cues | Always-running particles, 3D charts without purpose |
| `cinematic` | Architectural composition, lighting and depth | Scene-led storytelling, carefully controlled focal points | Camera/timeline, semantic scroll, spatial morph | Spinning demo objects, gratuitous bloom |

## 3. Visual foundations
- **Hierarchy**: 1 primary focal point and primary task per viewport; secondary actions follow a clear reading and decision order.
- **Typography**: choose an intentional display/body/mono pairing; use `font-variant-numeric: tabular-nums` for time-series, prices, counters. Design 3–4 type scales, not 12 accidental sizes.
- **Grid**: for content/editorial use 12-column desktop / 4-column narrow; for data use flexible resizable panels with fixed minimum chart dimensions. Respect existing layout architecture.
- **Spacing**: begin with a 4px/8px scale; choose consistent density by task. In a professional terminal, reduce spacing before hiding needed data.
- **Color**: distinguish semantic meaning (risk, success, current selection) from decoration; never rely on hue alone.
- **Material**: subtle borders and layered surfaces before shadows and blur. Depth should clarify priority and interactivity.
- **Images**: use only licensed/project-provided images; preserve aspect ratios; add meaningful alt text or mark decorative.
- **States**: planned static default, hover, focus-visible, active, loading (only when real), empty, error, disabled, success and undo; every action has feedback.

## 4. Anti-template rejection test
Reject and revise if the design has 3 or more of these:
1. Hero centered on top of generic gradient with 3 identical metric cards.
2. Identical border-radius/padding on every information unit.
3. All sections fade up by the same 20px (or any unsolicited entrance animation).
4. Unexplained background glow, floating decorative spheres or particle loops.
5. Brand differentiation depends only on swapping accent colors.
6. Every screen uses the same information density despite different tasks.
7. Legibility falls below acceptable contrast to make it "premium".

## 5. UI/UX joint design gate
See `UX_FOUNDATIONS.md` for the full rules. Before design:
- Identify 3 top user tasks and make the one primary screen action visually obvious. Do not turn the homepage into a feature shelf.
- Preserve useful information density but eliminate unrelated entry points and duplicate controls.
- Plan 2–3 taps/clicks to frequent core actions where appropriate; justify extra steps for safety or complexity.
- Apply a consistent icon, typography, control, spacing and semantic-color vocabulary across all pages.
- Specify press, waiting, success, failure and recovery feedback; no silent actions and no false success toast.
- Do not use time-based autoplay, unsolicited scroll fade-ups or ambient motion to compensate for poor static composition.

## 6. Design brief template
Record this before implementation:
- User's immediate goal and top 3 tasks:
- Primary visual idea (one sentence):
- Primary CTA, focus and eye path:
- Grid and density:
- Type / color roles:
- 3 positive reference traits:
- 3 forbidden traits:
- One interaction signature (a single memorable moment):
- 2–3 click/tap core-task path or justified exception:
- Feedback and recovery states:
- Accessibility and device constraints:

## 7. Review rubric (0–10, evidence-backed)
Composition, typography, task discoverability, clarity, UI consistency, action feedback, interaction continuity, user-triggered motion, stability/performance, accessibility, responsive behavior. Record problems and fixes; scores alone prove nothing.
