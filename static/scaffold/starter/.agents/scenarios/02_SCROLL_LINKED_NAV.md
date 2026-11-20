# Scenario 02 — 滚动联动的渐进式导航栏（80px → 56px）

**目标：** 导航尺寸由用户真实滚动距离控制，而非越过 100px 才突然切换两组 class。滚动属于**用户驱动的连续交互**，不违反「不自动入场」原则。

## Codex 详细执行指令

```text
在当前项目内实现滚动联动导航，不新增无关动画依赖。

状态 1：scrollY=0 时导航实际视觉高度 80px、Logo 100%、背景透明、无下边框。
状态 2：scrollY>=100px 时导航视觉高度 56px、Logo 缩放为 80%、
背景为半透明白色带轻微 backdrop-filter blur、出现 1px 底边框。

0–100px 内：进度 p = clamp(scrollY / 100, 0, 1)，用同一 p 连续插值：
height = 80-24*p (px)，logoScale = 1-.2*p，
backgroundAlpha = 0.88*p，borderAlpha = 0.15*p。
严禁使用 scrollY>100 时才突然赋予缩小 class、离散 2 档、页面抖动。

优化：监听 passive scroll 并在 requestAnimationFrame 合并写入。
导航 fixed/sticky 时必须给内容预留稳定空间，防止导航缩小时主内容
被顶上去反复触发 scroll feedback loop；不要在 scroll 事件里每次读写布局。

惯性：保留浏览器原生触摸 / 触控板滚动惯性；直接跟随真实滚动位置。
不要叠加人为“惯性滚动”或强制吸附来改变用户滚动距离。
若设计需要滚动停止后的非几何细节（阴影 / 边线）收束，可 150ms 非线性 ease，
但高度和 logo 必须持续跟随滚动，不得在停止时突然跳级。

向上滚动完整逆向连续展开，窗口 resize / 页面跳转 / 回到顶部必须同步。
键盘、触摸、低端设备需工作；reduced-motion 保留信息可用，可移除
非必要的视觉渐变/滤镜，仍按滚动位置正确呈现。

在 0/25/50/75/100/150px 位置录制尺寸值并截图；允许小量渲染误差。
```

## Implementation reference: framework-agnostic

Use this technique unless existing Motion/GSAP code already owns scroll. One source of truth is the **real scroll position**.

```css
:root { --nav-progress: 0; }
.site-nav {
  position: fixed; inset: 0 0 auto; z-index: 40;
  height: calc(80px - 24px * var(--nav-progress));
  background: rgb(255 255 255 / calc(.88 * var(--nav-progress)));
  border-bottom: 1px solid rgb(24 44 40 / calc(.15 * var(--nav-progress)));
  backdrop-filter: blur(calc(12px * var(--nav-progress)));
  /* Height is scroll-driven; don't also add a height transition. */
}
.site-nav__logo { transform: scale(calc(1 - .2 * var(--nav-progress))); transform-origin: left center; }
.page-under-nav { padding-top: 80px; } /* fixed header reservation does not change */
@media (prefers-reduced-motion: reduce) { .site-nav { backdrop-filter: none; } }
```

```js
const nav = document.querySelector('.site-nav');
let pending = false;
function paint() {
  pending = false;
  const progress = Math.min(1, Math.max(0, window.scrollY / 100));
  nav.style.setProperty('--nav-progress', String(progress));
}
function onScroll() {
  if (!pending) { pending = true; requestAnimationFrame(paint); }
}
window.addEventListener('scroll', onScroll, { passive: true });
paint(); // sync existing position on reload / Back; no autoplay
// On component teardown, remove listener and cancel any pending RAF.
```

If CSS arithmetic support varies in target browsers, instead set pixel/alpha variables directly in `paint()` (`--nav-height`, `--logo-scale`, etc.). A fixed header with persistent 80px content reservation is one robust pattern; avoid blindly copying into sticky/embedded headers. Choose 1 strategy and ensure no `scroll-padding`/anchor jump regressions.

## Continuous values to verify

| scrollY | p | height | Logo scale | background alpha |
|---:|---:|---:|---:|---:|
| 0 | 0 | 80px | 1.00 | 0.000 |
| 25 | .25 | 74px | .95 | .220 |
| 50 | .50 | 68px | .90 | .440 |
| 75 | .75 | 62px | .85 | .660 |
| 100+ | 1 | 56px | .80 | .880 |

## QA

- Inspect intermediate 25/50/75 values: not only 0 and 100. Navigation must not snap at threshold.
- Reverse 100→50→0 matches the exact function (no hysteresis unless deliberately justified).
- Fast trackpad scroll, touchscreen fling, browser back restoring previous scroll, resize, and route transitions do not cause jitter.
- Main content doesn't slide unexpectedly when nav changes height; anchor navigation isn't obscured.
- No perpetual RAF loop, listener leak, scroll handler forced reflow or gratuitous CSS transition.
- Test in reduced-motion and low-support environments; blur can be removed, readability still works.
