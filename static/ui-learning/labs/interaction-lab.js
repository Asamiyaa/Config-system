(() => {
  'use strict';
  const nav = document.getElementById('nav');
  const metric = document.getElementById('nav-metric');
  const button = document.getElementById('press');
  const intense = document.getElementById('intense');
  const feedback = document.getElementById('feedback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pending = 0;
  function updateNav() {
    pending = 0;
    const p = Math.min(1, Math.max(0, window.scrollY / 100));
    nav.style.setProperty('--nav-progress', String(p));
    metric.value = `${Math.round(p * 100)}%`;
  }
  function onScroll() { if (!pending) pending = requestAnimationFrame(updateNav); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('pageshow', updateNav);
  updateNav();

  // Single WAAPI owner for the transform; newly requested motion starts from current visual scale.
  const normal = { duration: 80, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' };
  let anim = null;
  let holding = false;
  let keyboardHolding = false;
  function actualScale() {
    const t = getComputedStyle(button).transform;
    if (!t || t === 'none') return 1;
    const m = new DOMMatrixReadOnly(t);
    return Math.hypot(m.a, m.b);
  }
  function play(frames, options) {
    const from = actualScale();
    anim?.cancel();
    if (reduced.matches) { button.style.transform = 'none'; return; }
    frames[0].transform = `scale(${from})`;
    anim = button.animate(frames, options);
    anim.finished.then(() => {
      if (anim?.playState === 'finished') {
        // Keep final visual at rest after WAAPI animation; no phantom lingering effect.
        button.style.transform = frames.at(-1).transform;
        anim.cancel(); anim = null;
      }
    }).catch(() => {});
  }
  function press() {
    if (holding || button.disabled) return;
    holding = true;
    feedback.textContent = '按下 · 80ms / 0.96×';
    play([{ transform: 'scale(1)' }, { transform: 'scale(.96)' }], normal);
  }
  function release(cancelled = false) {
    if (!holding) return;
    holding = false;
    const peak = intense.checked ? 1.05 : 1.008;
    feedback.textContent = cancelled ? '已取消 · 恢复原状态' : `松开 · 120ms / 回弹峰值 ${peak.toFixed(3)}×`;
    play([{ transform: 'scale(.96)' }, { transform: `scale(${peak})`, offset: .74 }, { transform: 'scale(1)' }], { duration: 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
  }
  button.addEventListener('pointerdown', e => { if (e.button === 0) press(); });
  button.addEventListener('pointerup', () => release());
  button.addEventListener('pointercancel', () => release(true));
  button.addEventListener('pointerleave', () => { if (holding && !keyboardHolding) release(true); });
  button.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { keyboardHolding = true; press(); }
  });
  button.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === 'Enter') { keyboardHolding = false; release(); }
  });
  button.addEventListener('blur', () => { keyboardHolding = false; release(true); });
  button.addEventListener('click', () => { if (!holding) feedback.textContent = '操作已触发 · 反馈不代表远程操作已成功'; });
  // No idling animation, intervals or autoplay.
})();
