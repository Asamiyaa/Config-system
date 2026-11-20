# Scenario 03 — 精准按钮按压（80ms ↓ / 120ms ↑）

**目标：** 让用户一按就有轻微、可靠的触感，而非 hover 放大/发光/不停运动。按压反馈不意味着成功：任务状态必须独立更新。

## Codex 详细执行指令

```text
实现符合项目组件系统的按钮按压微交互，不修改按钮业务行为。
- 触发：pointerdown（鼠标左键/触摸）、键盘 Space 或 Enter 的激活流程。
- 按下：按钮围绕中心缩放到 scale(0.96)，背景略深，80ms 非线性缓动。
- 释放：回到 scale(1)，允许一次极轻过冲，整个返回动作 120ms。
- 用户所给 5% 过冲可作为演示极限选项（峰值 scale(1.05)），
  默认专业产品应更克制：建议峰值 1.005–1.015；具体值根据设计系统选择。
- 禁止 hover 放大、发光或夸张变色；hover 最多提示光标/轻边框变化。
- 同一个控件支持点击后 pending/disabled/success/error 的准确反馈；
  禁止以按压动画冒充 API 成功；不得产生双提交。
- pointercancel、pointerleave、mouseup、touch 取消、禁用态、快速重复
  均可释放当前变换，不能永远停在 scale(0.96)。
- 关键视口：桌面和移动；reduced-motion 可禁用缩放，仅保留颜色 / 边框 / focus。
- 若实际项目含现成 Button 组件，应改造组件或其 motion token，不要在每页复制逻辑。
```

## Engineering choice

For simple buttons prefer CSS `:active` with 80ms press and 120ms return; CSS cannot precisely enforce a peak overshoot following *every possible* pointer/key release. For a deliberate one-time overshoot, prefer the Web Animations API, preserve a **single** animation object and cancel/finish safely. Never install GSAP just for one button.

```css
.press-button {
  --press-ease: cubic-bezier(.22,1,.36,1);
  transform: scale(1);
  transition: transform 120ms var(--press-ease), background-color 120ms var(--press-ease);
  touch-action: manipulation;
}
.press-button:active {
  transform: scale(.96);
  transition-duration: 80ms;
  background-color: var(--press-color, #d9e4de);
}
.press-button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .press-button { transition: none; transform: none !important; }
}
```

**One-time overshoot for an explicit demo** (not a generic global default):

```js
const button = document.querySelector('.press-button');
let activeAnimation;
button.addEventListener('pointerup', () => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  activeAnimation?.cancel();
  // For a truly interruption-proof component, sample current computed transform,
  // keep pointer/keyboard input state, and do not trigger on pointercancel.
  activeAnimation = button.animate([
    { transform: 'scale(.96)', offset: 0 },
    { transform: 'scale(1.008)', offset: .74 },
    { transform: 'scale(1)', offset: 1 },
  ], { duration: 120, easing: 'cubic-bezier(.22,1,.36,1)' });
});
```

The CSS and JS snippets are **alternative conceptual starting points**, not instructions to run both independently (doing so can fight over the same `transform`). For production choose one state controller: e.g. `idle → pressed → released`, and on every new input start from the *current computed transform*, not from hardcoded `.96`. Override `scale(1.008)` with `scale(1.05)` only if that visibly stronger demonstration was intentionally requested and approved; excessive spring contradicts the global motion restraint rule.

## QA

- Hold mouse down: press visual state completes in ~80ms and remains stable until released.
- Release: settles to 1 within ~120ms; no long spring wobble or double pulse.
- Repeat 10 times; interrupt halfway; pointercancel and outside release never leave a stuck compressed button.
- Keyboard and touch activation yield equivalent actionable feedback; focus-visible remains visible.
- Disabled buttons do not respond or submit; pending feedback reflects actual work.
- Reduced motion works without scaling, while interaction and result remain available.
- No hover zoom/glow/rotation, no idle animation.
