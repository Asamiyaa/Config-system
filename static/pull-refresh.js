/* Pull-to-refresh, only when the page is already at the top. */
(() => {
  if (!('ontouchstart' in window)) return;
  const indicator = document.createElement('div');
  indicator.id = 'pullRefresh';
  indicator.className = 'pull-refresh';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-live', 'polite');
  indicator.textContent = '下拉刷新';
  document.body.append(indicator);

  const threshold = 88;
  const maxPull = 112;
  let startY = null;
  let distance = 0;
  let active = false;
  let canRefresh = false;
  let refreshing = false;

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
  const atTop = target => rootTop() && scrollTopFor(target) <= 0;
  const inOverlay = target => !!target?.closest?.('.ui-sheet-panel,.interaction-modal-panel,.workbook-modal,.taste-palette,[role="dialog"]');
  const isControl = target => !!target?.closest?.('input,textarea,select,[contenteditable="true"],.table-scroll,.calendar-board,.flow-timeline-scroll');
  const reset = () => {
    active = false;
    canRefresh = false;
    distance = 0;
    indicator.classList.remove('visible', 'ready', 'refreshing');
    indicator.style.removeProperty('--pull');
    indicator.textContent = '下拉刷新';
  };
  const fail = message => {
    indicator.textContent = message;
    indicator.classList.remove('refreshing');
    setTimeout(reset, 1200);
  };

  document.addEventListener('touchstart', event => {
    if (refreshing || event.touches.length !== 1) return;
    if (!atTop(event.target)) return;
    startY = event.touches[0].clientY;
    distance = 0;
    canRefresh = !inOverlay(event.target) && !isControl(event.target) && !document.body.classList.contains('ui-scroll-lock');
    active = true;
  }, {passive: true, capture: true});

  document.addEventListener('touchmove', event => {
    if (!active || refreshing) return;
    if (!rootTop() || scrollTopFor(event.target) > 0) { reset(); return; }
    const dy = event.touches[0].clientY - startY;
    if (dy <= 0) { reset(); return; }
    if (dy < 6) return;
    // Stop native pull-to-refresh even inside panels, but only refresh the page from the root.
    event.preventDefault();
    if (!canRefresh) return;
    distance = Math.min(maxPull, dy * .55);
    indicator.style.setProperty('--pull', `${distance}px`);
    indicator.classList.add('visible');
    indicator.classList.toggle('ready', distance >= threshold);
    indicator.textContent = distance >= threshold ? '松开刷新' : '下拉刷新';
  }, {passive: false, capture: true});

  document.addEventListener('touchend', async () => {
    if (!active || refreshing) return;
    active = false;
    if (!canRefresh || distance < threshold) { reset(); return; }
    refreshing = true;
    indicator.classList.add('refreshing');
    indicator.textContent = '正在刷新…';
    try {
      if (typeof persist === 'function' && typeof state !== 'undefined' && state) {
        const saved = await persist({quiet: true});
        if (saved === false) { refreshing = false; fail('保存失败，未刷新'); return; }
      }
      location.reload();
    } catch (_) {
      refreshing = false;
      fail('刷新失败');
    }
  }, {passive: true, capture: true});

  document.addEventListener('touchcancel', reset, {passive: true});
})();
