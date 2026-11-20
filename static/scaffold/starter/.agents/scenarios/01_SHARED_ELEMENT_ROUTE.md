# Scenario 01 — 列表 → 详情的共享元素路由过渡

**目标：** 用户点击列表卡片时，封面和标题保持身份，从列表位置形变 / 迁移到详情位置；返回时沿同一路线退回，而非全屏简单淡入淡出。**这是可直接粘贴给 Codex 的工程任务，不是设计灵感。**

## Codex 详细执行指令

```text
在当前项目中实现「列表项 → 详情」共享元素过渡。必须先读 AGENTS.md、
.agents/design/MOTION_SPEC.md、TECH_PLAYBOOK.md、INTERACTION_BLUEPRINT.md。

1. 检查当前前端框架、路由模式、DOM 结构、已有动画依赖与浏览器支持策略。
   不修改真实业务数据模型和已有 URL 语义。
2. 点击任何列表卡片（点击、Enter/Space 均能激活），以业务稳定 id 作为
   共享身份。封面与标题分别分配该 id 派生的唯一共享元素名称。
   同时存在于文档中的同名 view-transition-name 不得超过一个。
3. 起始态：卡片封面矩形、标题字号/位置；结束态：详情页头图和标题布局。
   共享封面从起始矩形连续变换到目标矩形；标题跟随位置和尺度变化。
   非共享列表元素可轻微淡出，详情的次要内容在主元素移动后分层呈现。
4. 时间轴总时长 400ms：0–400ms 封面/标题共享形变，0–140ms 旧页面辅助
   元素退场，140–400ms 新详情次要元素进入。容器/核心先动，内容后动。
   统一使用同一个非线性 ease token，禁止弹跳和全体同步淡入。
5. 点击返回、Esc（仅适用明确的覆盖层）、浏览器 Back：同一业务 id 回到
   原卡片锚点，同一时间和缓动，方向反向；恢复原滚动位置与键盘焦点。
   所有请求失败/详情不存在时仍能通过无动画跳转并恢复操作。
6. 首选 document.startViewTransition 用于同文档 DOM/路由更新；在 React 项目
   且已有 Motion 时可用 LayoutGroup + layoutId 做降级；其他框架使用 FLIP/WAAPI
   或直接切换的功能降级。不得为了降级强行安装不匹配框架的新库。
7. 支持 prefers-reduced-motion（瞬间完成且焦点可用）、快速双击/连续返回、
   目标图异步加载、路由更新失败、列表卡片卸载、视口尺寸变化。
8. 提供操作截图与实际 Playwright 断言；记录未支持的浏览器。
```

## Native View Transitions API: mechanics and real constraints

This describes **same-document** transitions. Cross-document transitions require a separate browser/navigation capability and are **not** implied by these instructions.

- Feature detect: `if (typeof document.startViewTransition === 'function')`.
- Before starting, assign `view-transition-name` **only to the active card's image/title**; on the next view assign the same two names to destination elements. Use stable identity from your data layer: e.g. `cover-${safeId}`, `title-${safeId}`, not array position; sanitize CSS name characters or map IDs to safe tokens.
- Ensure **each name is unique among concurrently rendered elements**. A list with all cards sharing `cover` or an old and new route both visibly mounted with the same name will invalidate shared transitions.
- Call `document.startViewTransition(() => commitRouteOrViewState())` where the callback completes the actual DOM update (for async frameworks, await the stable DOM commit). React routing integration differs by version: integrate with its supported route/view-transition mechanism rather than mutating DOM behind React.
- Set matching animation tokens on `::view-transition-old(name)` and `::view-transition-new(name)` or group pseudo-elements. The browser owns geometric interpolation; avoid additionally animating the same element's transform with Motion.
- Manage scrolling/focus outside snapshots deliberately. After `finished` (or a functional fallback), focus the detail heading/appropriate target; on back restore selected card focus and list scroll, provided it still exists.
- `ViewTransition.ready`, `.updateCallbackDone`, `.finished` have different meanings; catch rejection from aborted transitions and **do not block navigation** when animation fails.
- In reduced motion, disable pseudo-element animation; do not skip navigation/state update. When needed, overlay content can use `aria-busy` during real loading, but don't fake success.

### CSS token example (adapt names through project styling)

```css
:root { --shared-duration: 400ms; --shared-ease: cubic-bezier(.22, 1, .36, 1); }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 140ms; }
::view-transition-group(cover-active), ::view-transition-group(title-active),
::view-transition-old(cover-active), ::view-transition-new(cover-active),
::view-transition-old(title-active), ::view-transition-new(title-active) {
  animation-duration: var(--shared-duration);
  animation-timing-function: var(--shared-ease);
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*), ::view-transition-new(*), ::view-transition-group(*) {
    animation-duration: 0.01ms !important;
  }
}
```

`cover-active`/`title-active` in this example are **unique names for the selected route transition**, and must not be assigned to every card simultaneously. Explicitly verify support for selectors and the needed view-transition behavior in the target browsers. CSS duration on the root alone is insufficient for all named groups.

### React fallback (only for React with Motion installed/approved)

```jsx
<LayoutGroup id="catalog-route">
  <AnimatePresence mode="popLayout">
    {page === 'list' ? (
      <motion.article key={`card-${item.id}`} layoutId={`article-${item.id}`}>
        <motion.img layoutId={`cover-${item.id}`} src={item.image} alt={item.alt} />
        <motion.h2 layoutId={`title-${item.id}`}>{item.title}</motion.h2>
      </motion.article>
    ) : (
      <motion.section key={`detail-${item.id}`} layoutId={`article-${item.id}`}>
        <motion.img layoutId={`cover-${item.id}`} src={item.image} alt={item.alt} />
        <motion.h1 layoutId={`title-${item.id}`}>{item.title}</motion.h1>
      </motion.section>
    )}
  </AnimatePresence>
</LayoutGroup>
```

Above is **illustrative JSX only**, not a drop-in router: preserve LayoutGroup scope, route mounting/lifetimes, scroll restoration, focus, and a single `transition` token `{ duration: .4, ease: [.22,1,.36,1] }`. Do **not** simultaneously enable native snapshots + Motion layout animation for the same elements. Cross-route layoutId matching may require keeping the tree/layout group alive between route updates. If this is not feasible, use simple, correct navigation instead of a broken effect.

## Acceptance tests (must run, not just describe)

| Case | Input | Expected observable result |
|---|---|---|
| Normal | click card `id=...` | URL/state goes to matching detail; cover/title identity stays visually continuous |
| Reverse | Back / in-page return | reaches same card, scroll and focus return; 400ms reverse token |
| Rapid | double click; Back during 200ms | at most one active transition; no blank/ghost layer |
| Mobile | 390×844 | geometry valid and no horizontal overflow |
| Image loading | slow/failed image | stable placeholder/size and usable detail, no broken route |
| Reduced motion | OS reduce | route still works, no long motion |
| Unsupported | API disabled | React Motion (when available) or FLIP/instant fallback works |

**Implementation evidence:** baseline screenshot, mid-transition capture (if automation supports it), detail, return, console warnings, chosen engine + reason, screenshot paths, tests passing/failing.
