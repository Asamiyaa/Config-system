# Tech Playbook — Choose the Smallest Reliable Engine

## Stack selection matrix
| Requirement | Prefer | Avoid |
|---|---|---|
| Simple feedback / reveal | CSS transitions + transforms | New global animation engine |
| React layout / shared element | Motion for React if appropriate | Direct DOM mutation competing with React |
| Complex timelines / scroll | GSAP / ScrollTrigger if project approves | 30 unrelated setTimeout calls |
| Spatial reconstruction | Three.js / React Three Fiber (React) | Fake perspective for true spatial tasks |
| Dense linked financial charts | Existing chart lib, SVG/Canvas, D3/ECharts | R3F added for novelty |
| Graph editor / workflow | Existing graph framework / React Flow when suitable | DIY canvas graph without need |

## Existing projects
1. Detect package/framework/entrypoint and read active design style.
2. If Java/Spring or Python/FastAPI serves the UI, identify where the **frontend** actually lives before editing.
3. Use current library and app architecture before suggesting replacements.
4. Check version compatibility before installing new dependencies. No silent package additions.
5. Validate the API integration and request/error paths after animation changes.

## New projects
Start with the simplest stack matching the requested functionality. Don't start Three.js for a landing page that needs only scroll reveals. Create one polished vertical slice, then expand.

## Performance / accessibility checklist
- Stable keys and component identity.
- `prefers-reduced-motion` and `focus-visible`.
- Keyboard & touch parity; ARIA live regions only for genuinely changing status.
- Resize and tab visibility handling.
- Dispose RAF, ResizeObservers, GSAP contexts, WebGL resources when unmounting.
- Detect WebGL capability before initializing heavy experiences.
- Chart updates interpolate only when data provenance and timestamps remain clear.

## Suggested project layer
```
src/
  design/tokens.*        # colors, spacing, type, motion
  components/            # accessible UI primitives
  interactions/          # reusable interaction state & controllers
  scenes/                # optional 3D/cinematic scenes
  features/              # business modules
  tests/                 # interaction, mobile, regression
```
Adapt to the repository; **do not** force this folder structure into established projects.

## UX + reversible interaction engineering guidelines
- Establish the shortest honest task path before selecting an animation library. Navigational semantics, browser Back, focus and selection persistence are more important than visual spectacle.
- Prefer `View Transitions API`, native dialog + FLIP, or an already installed shared-layout tool for **origin-anchored expand/collapse**. Verify actual browser support and use a non-animated functional fallback.
- Use one reversible progress signal for both directions, the **same duration/easing token** and current-position interruption; avoid two unrelated entrance/exit keyframes.
- Do not autoplay hero entrances or motion timelines on initialization. User-pressed Play can start a bounded scene; stop at its end.
- Apply small, non-linear active transforms to controls and timely error/status updates; text and ARIA are required for errors beyond any motion.
- Avoid excessive nesting and modal cascades in task-critical tools. Check mobile thumb reach, keyboard path, persistent selection and error recovery.

## Scenario engine decision tree (v1.2)

1. **Shared list/detail route:** Start with feature-tested same-document `document.startViewTransition` when the framework can safely commit the route inside the transition. Use *unique* image/title `view-transition-name` for the selected ID only. Avoid duplicate shared IDs, orphan snapshots or playing native and Motion on the same DOM simultaneously. React fallback may use Motion `LayoutGroup` + `layoutId` + `AnimatePresence` where both views share a lifetime; non-React fallback can use FLIP/WAAPI or a fully functional instant route. See `../scenarios/01_SHARED_ELEMENT_ROUTE.md`.
2. **Scroll-coupled navigation:** Use actual `scrollY` as the progress source, `passive: true` + one RAF batch; do not add a binary class on crossing 100px. A fixed header plus stable 80px content reservation can prevent scroll-induced feedback loops. See `../scenarios/02_SCROLL_LINKED_NAV.md`.
3. **Press micro-feedback:** Prefer CSS `:active` and `:focus-visible` for simple components; use WAAPI only when a distinct release overshoot needs deterministic timing. Avoid CSS and JS racing over the same `transform`. Handle pointercancel, keyboard, disabled, touch and real async status. See `../scenarios/03_PRESS_FEEDBACK.md`.

**Browser feature caveat:** View Transitions API capabilities and cross-document behavior vary by browser/version. Do feature detection and test actual target browsers rather than promising universal coverage. Do not claim native View Transitions are implemented if a demo only uses WAAPI/FLIP.

## v2.0 动效引擎自动选配

先按需求选择 `.agents/scenarios/AUTO_SELECTION.md` 中的精确场景，再决定技术，不允许先选择 Three.js/GSAP 再为其编造用途。

- 同文档共享路由：原生 View Transitions / 框架自带路由机制优先，Motion layoutId 在 React 且生命周期可控时可用。
- 手势拖拽：dnd-kit / SortableJS 等专用库适合复杂重排；直接操纵必须跟手，复杂跨列不要错误套用简单 `Reorder.Group`。
- 图表：保持现有 ECharts/D3/uPlot 坐标域和数据流，动画不能改写真实数值。
- 媒体/时间轴：进度是当前真实媒体时间或显式用户操作；滚动联动避免二次缓动延迟。
- 真实三维：Three.js/R3F + 明确相机 pose / 世界坐标 / 资源回收；非必要三维用 CSS/Canvas 即可。
- 浮层/命令：原生语义、焦点和键盘规范优先，Motion/WAAPI 仅控制视觉形变。

同一节点的 `transform`、`opacity`、`height`、`left/top` 不可被多个引擎同时覆盖；必要时以嵌套层拆分职责。更多参阅 `.agents/scenarios/COMPOSITION_RULES.md`。
