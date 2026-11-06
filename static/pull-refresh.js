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

  const threshold = 64;
  const maxPull = 112;
  let startY = null;
  let distance = 0;
  let active = false;
  let refreshing = false;

  const atTop = () => (window.scrollY || document.scrollingElement?.scrollTop || 0) <= 0;
  const isControl = target => !!target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],.table-scroll,.calendar-board,.flow-timeline-scroll');
  const reset = () => {
    active = false;
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
    if (refreshing || event.touches.length !== 1 || !atTop() || isControl(event.target) || document.body.classList.contains('ui-scroll-lock')) return;
    startY = event.touches[0].clientY;
    distance = 0;
    active = true;
  }, {passive: true});

  document.addEventListener('touchmove', event => {
    if (!active || refreshing) return;
    if (!atTop()) { reset(); return; }
    const dy = event.touches[0].clientY - startY;
    if (dy <= 0) { reset(); return; }
    if (dy < 6) return;
    event.preventDefault();
    distance = Math.min(maxPull, dy * .55);
    indicator.style.setProperty('--pull', `${distance}px`);
    indicator.classList.add('visible');
    indicator.classList.toggle('ready', distance >= threshold);
    indicator.textContent = distance >= threshold ? '松开刷新' : '下拉刷新';
  }, {passive: false});

  document.addEventListener('touchend', async () => {
    if (!active || refreshing) return;
    active = false;
    if (distance < threshold) { reset(); return; }
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
  }, {passive: true});

  document.addEventListener('touchcancel', reset, {passive: true});
})();
