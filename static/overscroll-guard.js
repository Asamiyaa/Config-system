/* Disable browser pull-to-refresh without adding a page refresh gesture. */
(() => {
  if (!('ontouchstart' in window)) return;
  let startY = null;
  let active = false;

  const rootTop = () => (window.scrollY || document.scrollingElement?.scrollTop || 0) <= 0;
  const scrollTopFor = target => {
    let node = target;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node.scrollTop;
      node = node.parentElement;
    }
    return 0;
  };

  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || !rootTop() || scrollTopFor(event.target) > 0) return;
    startY = event.touches[0].clientY;
    active = true;
  }, {passive: true, capture: true});

  document.addEventListener('touchmove', event => {
    if (!active) return;
    if (!rootTop() || scrollTopFor(event.target) > 0) { active = false; return; }
    const dy = event.touches[0].clientY - startY;
    if (dy <= 0) { active = false; return; }
    if (dy > 4) event.preventDefault();
  }, {passive: false, capture: true});

  document.addEventListener('touchend', () => { active = false; }, {passive: true, capture: true});
  document.addEventListener('touchcancel', () => { active = false; }, {passive: true, capture: true});
})();
