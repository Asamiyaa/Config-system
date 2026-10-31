/* WEALTH OS · taste layer interactions
   - command palette (⌘K / Ctrl-K)
   - collapsible labelled sidebar
   - consistent nav labels / titles
*/
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const PAGES = [
    { page: 'home', label: '首页', hint: '今天' },
    { page: 'schedules', label: '待办', hint: '任务' },
    { page: 'dailyflow', label: '流程', hint: '编排与统计' },
    { page: 'mistakes', label: '切记', hint: '错过与过错' },
    { page: 'dashboard', label: '资产总览', hint: '风控' },
    { page: 'allocation', label: '全球资产配置', hint: '风控' },
    { page: 'nasdaq', label: '纳斯达克 AI 策略', hint: '风控' },
    { page: 'ashare', label: 'A股 ETF 轮动', hint: '风控' },
    { page: 'alpharadar', label: 'Alpha Radar', hint: '风控' },
    { page: 'execution', label: '每日执行与日志', hint: '风控' },
    { page: 'health', label: '健康总览', hint: '健康' },
    { page: 'checkin', label: '打卡与统计', hint: '健康' },
    { page: 'diet', label: '饮食饮水', hint: '健康' },
    { page: 'fitness', label: '健身管理', hint: '健康' },
    { page: 'skin', label: '皮肤护理', hint: '健康' },
    { page: 'sleep', label: '睡眠与恢复', hint: '健康' },
    { page: 'style', label: '发型与穿搭', hint: '健康' },
    { page: 'agents', label: '分身', hint: '精力与平衡' },
    { page: 'newconfig', label: '新登', hint: '90 天执行' },
    { page: 'english', label: '外语', hint: '输入与输出' },
    { page: 'reading', label: '书单', hint: '阅读与笔记' },
    { page: 'archive', label: '归档', hint: '聊天与源文件' }
  ];

  const palette = $('#tastePalette');
  const input = $('#tastePaletteInput');
  const results = $('#tastePaletteResults');
  let filtered = PAGES.slice();
  let active = 0;
  let returnFocus = null;

  function openPalette() {
    if (!palette) return;
    returnFocus = document.activeElement;
    palette.classList.remove('hidden');
    document.body.classList.add('ui-scroll-lock');
    input.value = '';
    filtered = PAGES.slice();
    active = 0;
    renderResults();
    requestAnimationFrame(() => input.focus());
  }

  function closePalette() {
    if (!palette) return;
    palette.classList.add('hidden');
    document.body.classList.remove('ui-scroll-lock');
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }

  function renderResults() {
    if (!results) return;
    results.innerHTML = filtered.length
      ? filtered.map((item, i) => `<button type="button" class="taste-palette-item ${i === active ? 'active' : ''}" data-palette-page="${item.page}"><span>${item.label}</span><kbd>${item.hint}</kbd></button>`).join('')
      : '<div class="taste-palette-empty">没有匹配的页面</div>';
    const el = results.querySelector('.taste-palette-item.active');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function go(page) {
    closePalette();
    if (typeof window.renderPage === 'function') window.renderPage(page);
    const sidebar = $('#sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  function filterPalette(q) {
    const needle = q.trim().toLowerCase();
    filtered = !needle ? PAGES.slice() : PAGES.filter((item) =>
      (item.label + ' ' + item.hint + ' ' + item.page).toLowerCase().includes(needle)
    );
    active = 0;
    renderResults();
  }

  if (palette) {
    $('#tasteSearch')?.addEventListener('click', openPalette);
    palette.addEventListener('click', (e) => {
      if (e.target.closest('[data-palette-close]')) return closePalette();
      const item = e.target.closest('[data-palette-page]');
      if (item) go(item.dataset.palettePage);
    });
    input?.addEventListener('input', () => filterPalette(input.value));
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); renderResults(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); renderResults(); }
      if (e.key === 'Enter') { e.preventDefault(); const item = filtered[active]; if (item) go(item.page); }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        palette.classList.contains('hidden') ? openPalette() : closePalette();
      }
      if (e.key === 'Escape' && !palette.classList.contains('hidden')) closePalette();
    });
  }

  // consistent accessible names for every destination
  $$('#mainNav .nav-item, .investing-subnav .nav-item, .capability-subnav .nav-item').forEach((item) => {
    const label = item.querySelector('.nav-label')?.textContent?.trim() || item.textContent.trim();
    if (label) {
      item.setAttribute('aria-label', label);
      item.setAttribute('title', label);
    }
  });

  // desktop sidebar collapse
  const collapse = $('#tasteCollapse');
  const COLLAPSE_KEY = 'wealth-os-sidebar-collapsed';
  function applyCollapse(value, persist) {
    document.body.classList.toggle('taste-collapsed', value);
    if (collapse) {
      collapse.setAttribute('aria-expanded', String(!value));
      collapse.setAttribute('title', value ? '展开侧栏' : '收起侧栏');
    }
    if (persist) try { localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0'); } catch (_) {}
  }
  let collapsed = false;
  try { collapsed = localStorage.getItem(COLLAPSE_KEY) === '1'; } catch (_) {}
  applyCollapse(collapsed, false);
  collapse?.addEventListener('click', () => {
    collapsed = !document.body.classList.contains('taste-collapsed');
    applyCollapse(collapsed, true);
  });

  // keep the active nav marker in sync with SPA rendering
  const LABEL_MAP = {
    'DATA CONFIDENCE': '数据可信度',
    'REFERENCE_ONLY': '仅参考',
    'ILLUSTRATIVE': '示意'
  };
  function localizeLabels(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      const key = node.nodeValue.trim();
      if (LABEL_MAP[key]) nodes.push(node);
    }
    nodes.forEach((n) => { n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), LABEL_MAP[n.nodeValue.trim()]); });
  }
  const HUB_OF = {
    home:'home', today:'today', inbox:'today', schedules:'today', dailyflow:'today', mistakes:'today',
    calendar:'today', matrix:'today', stats:'today', important:'today', alltasks:'today', flowstats:'today',
    dashboard:'dashboard', allocation:'dashboard', nasdaq:'dashboard', ashare:'dashboard', execution:'dashboard', alpharadar:'dashboard',
    health:'health', checkin:'health', diet:'health', fitness:'health', skin:'health', sleep:'health', style:'health',
    agents:'agents', newconfig:'newconfig', english:'newconfig', reading:'newconfig', archive:'archive'
  };
  function syncActive() {
    const page = (typeof currentPage !== 'undefined' ? currentPage : '') || '';
    const hub = HUB_OF[page] || page;
    localizeLabels($('#viewRoot') || document);
    restoreBento();
    $$('#mainNav .nav-item').forEach((item) => {
      const on = item.dataset.page === hub;
      item.classList.toggle('active', on);
      if (on) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    $$('.mobile-tab[data-page]').forEach((item) => {
      const on = item.dataset.page === hub;
      item.classList.toggle('active', on);
      if (on) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }
  const root = $('#viewRoot');
  if (root && 'MutationObserver' in window) {
    new MutationObserver(() => requestAnimationFrame(() => { syncActive(); syncTabs(); syncMenuIcon(); })).observe(root, { childList: true, subtree: false });
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-page]')) setTimeout(() => { syncActive(); syncTabs(); syncMenuIcon(); }, 0);
  });
  setTimeout(syncActive, 300);

  /* ---------- app shell: bottom tab bar + hamburger morph ---------- */
  const MOBILE_TABS = [
    { page: 'home', label: '今日', icon: 'i-home' },
    { page: 'today', label: '执行', icon: 'i-check' },
    { page: 'dashboard', label: '资产', icon: 'i-shield' },
    { page: 'health', label: '健康', icon: 'i-heart' }
  ];
  function icon(id) {
    return `<svg viewBox="0 0 16 16" aria-hidden="true"><use href="#${id}"></use></svg>`;
  }
  function mountMobileTabbar() {
    if ($('#mobileTabbar')) return;
    const nav = document.createElement('nav');
    nav.id = 'mobileTabbar';
    nav.className = 'mobile-tabbar';
    nav.setAttribute('aria-label', '移动端主导航');
    nav.innerHTML = MOBILE_TABS.map((item) => `<button type="button" class="mobile-tab" data-page="${item.page}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`).join('')
      + `<button type="button" class="mobile-tab mobile-tab-more" data-action="open-sidebar" aria-label="更多页面">${icon('i-more')}<span>更多</span></button>`;
    nav.addEventListener('click', (e) => {
      const tab = e.target.closest('.mobile-tab[data-page]');
      if (tab) {
        if (typeof window.renderPage === 'function') window.renderPage(tab.dataset.page);
        const sidebar = $('#sidebar');
        sidebar?.classList.remove('open');
      }
    });
    document.body.appendChild(nav);
  }
  function syncMenuIcon() {
    const menu = $('.ui-mobile-menu');
    if (!menu) return;
    if (!menu.querySelector('.mobile-menu-bars')) {
      menu.innerHTML = '<span class="mobile-menu-bars"><i></i><i></i><i></i></span>';
    }
    const open = !!$('#sidebar')?.classList.contains('open');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  }
  const sidebar = $('#sidebar');
  if (sidebar && 'MutationObserver' in window) {
    new MutationObserver(syncMenuIcon).observe(sidebar, { attributes: true, attributeFilter: ['class'] });
  }
  setTimeout(() => { mountMobileTabbar(); syncMenuIcon(); }, 0);

  /* ---------- moving tab indicator (1px, shared across tab groups) ---------- */
  const TAB_GROUPS = ['.fit-tabs', '.flow-page-tabs', '.ncfg-tabs', '.theme-switch', '.watch-filter'];
  function syncTabs() {
    TAB_GROUPS.forEach((selector) => {
      $$(selector).forEach((box) => {
        let indicator = box.querySelector(':scope > .tab-indicator');
        if (!indicator) {
          indicator = document.createElement('i');
          indicator.className = 'tab-indicator';
          box.appendChild(indicator);
          box.classList.add('tab-indicator-host');
        }
        const active = box.querySelector('.active, .selected, [aria-selected="true"], [aria-pressed="true"]');
        if (!active || !active.offsetWidth) {
          indicator.style.opacity = '0';
          return;
        }
        const left = active.offsetLeft;
        indicator.style.opacity = '1';
        indicator.style.width = `${active.offsetWidth}px`;
        indicator.style.transform = `translate3d(${left}px, 0, 0)`;
      });
    });
  }
  window.addEventListener('resize', () => requestAnimationFrame(syncTabs), { passive: true });
  document.addEventListener('click', () => setTimeout(syncTabs, 0));
  setTimeout(syncTabs, 350);

  /* ---------- button-origin card growth + watchlist drag sort ---------- */
  let lastPointer = null;
  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    lastPointer = { x: e.clientX, y: e.clientY };
  }, { passive: true, capture: true });

  function animateDialogFromPoint(point) {
    if (!point || !Element.prototype.animate) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setTimeout(() => {
      const dialogs = $$('[role="dialog"]').filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 80 && r.height > 80 && s.display !== 'none' && s.visibility !== 'hidden';
      });
      const panel = dialogs[dialogs.length - 1];
      if (!panel || panel.dataset.popAnimated === '1') return;
      panel.dataset.popAnimated = '1';
      const rect = panel.getBoundingClientRect();
      const ox = Math.max(0, Math.min(rect.width, point.x - rect.left));
      const oy = Math.max(0, Math.min(rect.height, point.y - rect.top));
      const anim = panel.animate([
        { transformOrigin: `${ox}px ${oy}px`, transform: 'scale(.3)', opacity: 0 },
        { transformOrigin: `${ox}px ${oy}px`, transform: 'scale(1.018)', opacity: 1, offset: 0.78 },
        { transformOrigin: `${ox}px ${oy}px`, transform: 'scale(1)', opacity: 1 }
      ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      anim.onfinish = () => { delete panel.dataset.popAnimated; };
    }, 90);
  }
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    const point = lastPointer || (() => {
      const r = action.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })();
    animateDialogFromPoint(point);
  }, { capture: true });

  let watchDrag = null;
  let watchHoldTimer = null;
  let watchSuppressClick = false;
  function beginWatchDrag(row, pointerId) {
    if (!watchDrag) return;
    watchDrag.active = true;
    row.classList.add('is-dragging');
    document.body.classList.add('watch-sorting');
    try { row.setPointerCapture(pointerId); } catch (_) {}
  }
  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const row = e.target.closest('.home-watch .watch-row');
    if (!row) return;
    watchDrag = { row, pointerId: e.pointerId, x: e.clientX, y: e.clientY, active: false };
    const start = () => beginWatchDrag(row, e.pointerId);
    watchHoldTimer = setTimeout(start, e.pointerType === 'touch' ? 220 : 140);
  });
  document.addEventListener('pointermove', (e) => {
    if (!watchDrag) return;
    const dx = Math.abs(e.clientX - watchDrag.x);
    const dy = Math.abs(e.clientY - watchDrag.y);
    if (!watchDrag.active) {
      if (e.pointerType === 'mouse' && Math.hypot(dx, dy) > 6) {
        clearTimeout(watchHoldTimer);
        beginWatchDrag(watchDrag.row, e.pointerId);
      } else if (Math.hypot(dx, dy) > 10) {
        clearTimeout(watchHoldTimer);
        watchDrag = null;
        return;
      }
      if (!watchDrag || !watchDrag.active) return;
    }
    e.preventDefault();
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.home-watch .watch-row');
    if (over && over !== watchDrag.row) {
      const r = over.getBoundingClientRect();
      if (e.clientY > r.top + r.height / 2) over.after(watchDrag.row);
      else over.before(watchDrag.row);
    }
  }, { passive: false });
  function endWatchDrag() {
    clearTimeout(watchHoldTimer);
    if (!watchDrag) return;
    const active = watchDrag.active;
    const row = watchDrag.row;
    watchDrag = null;
    if (!active) return;
    row.classList.remove('is-dragging');
    document.body.classList.remove('watch-sorting');
    watchSuppressClick = true;
    setTimeout(() => { watchSuppressClick = false; }, 420);
    const order = $$('.home-watch .watch-row').map((el) => el.dataset.watchKey).filter(Boolean);
    try { localStorage.setItem('wealth-os-watch-order', JSON.stringify(order)); } catch (_) {}
    if (typeof window.renderPage === 'function') {
      const y = window.scrollY;
      window.renderPage('home', { transition: false, animate: false });
      window.scrollTo(0, y);
    }
  }
  document.addEventListener('pointerup', endWatchDrag);
  document.addEventListener('pointercancel', endWatchDrag);
  document.addEventListener('click', (e) => {
    if (watchSuppressClick && e.target.closest('.home-watch .watch-row')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* ---------- right utility rail ---------- */
  function mountRightRail() {
    if ($('#rightRail')) return;
    const rail=document.createElement('nav');
    rail.id='rightRail';
    rail.className='right-rail';
    rail.setAttribute('aria-label','快捷操作');
    rail.innerHTML=`
      <button type="button" data-rail="search" data-label="搜索页面" aria-label="搜索页面">${icon('i-search')}</button>
      <button type="button" data-rail="theme" data-label="切换主题" aria-label="切换主题">${icon('i-spark')}</button>
      <button type="button" data-rail="top" data-label="回到顶部" aria-label="回到顶部">${icon('i-up')}</button>
      <button type="button" data-rail="menu" data-label="打开菜单" aria-label="打开菜单">${icon('i-more')}</button>`;
    rail.addEventListener('click', (e) => {
      const btn=e.target.closest('[data-rail]');
      if (!btn) return;
      const kind=btn.dataset.rail;
      if (kind==='search') openPalette();
      if (kind==='theme') {
        const next=document.body.dataset.theme==='light'?'dark':'light';
        document.documentElement.dataset.theme=next;
        document.body.dataset.theme=next;
        try { localStorage.setItem('wealth-os-theme-v2',next); } catch (_) {}
        $$('.theme-option').forEach((el) => {
          const on=el.dataset.action===`theme-${next}`;
          el.classList.toggle('selected',on);
          el.setAttribute('aria-pressed',on?'true':'false');
        });
      }
      if (kind==='top') window.scrollTo({ top: 0, behavior: 'smooth' });
      if (kind==='menu') $('#tasteCollapse')?.click();
    });
    document.body.appendChild(rail);
  }
  mountRightRail();

  /* ---------- full-screen image lightbox ---------- */
  let lightbox=null;
  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox=document.createElement('div');
    lightbox.id='imageLightbox';
    lightbox.className='image-lightbox';
    lightbox.innerHTML='<button type="button" class="image-lightbox-close" aria-label="关闭大图">×</button><img alt="">';
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('.image-lightbox-close')) closeLightbox();
    });
    document.body.appendChild(lightbox);
    return lightbox;
  }
  function openLightbox(src, alt='') {
    const box=ensureLightbox();
    const img=box.querySelector('img');
    img.src=src; img.alt=alt;
    box.classList.add('is-open');
    document.body.classList.add('ui-scroll-lock');
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.classList.remove('ui-scroll-lock');
  }
  document.addEventListener('click', (e) => {
    const img=e.target.closest('.metric-cover img, .agent-node-card img');
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    openLightbox(img.currentSrc || img.src, img.alt || '');
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  /* ---------- 3D tilt ---------- */
  let tiltCard=null;
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || document.body.classList.contains('watch-sorting') || document.body.classList.contains('bento-sorting')) return;
    const card=e.target.closest('.home-feature, .metric-card.has-cover, .agent-node-card, #viewRoot > .page-head');
    if (!card) {
      if (tiltCard) resetTilt(tiltCard);
      return;
    }
    if (tiltCard && tiltCard !== card) resetTilt(tiltCard);
    tiltCard=card;
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/Math.max(1,r.width)-.5;
    const y=(e.clientY-r.top)/Math.max(1,r.height)-.5;
    card.style.setProperty('--tilt-x', `${(-y*2.4).toFixed(2)}deg`);
    card.style.setProperty('--tilt-y', `${(x*2.8).toFixed(2)}deg`);
    card.classList.add('is-tilting');
  }, { passive: true });
  function resetTilt(card) {
    if (!card) return;
    card.style.setProperty('--tilt-x','0deg');
    card.style.setProperty('--tilt-y','0deg');
    card.classList.remove('is-tilting');
    if (tiltCard === card) tiltCard=null;
  }
  document.addEventListener('pointerleave', () => { if (tiltCard) resetTilt(tiltCard); });

  /* ---------- Bento KPI reorder ---------- */
  const BENTO_KEY='wealth-os-bento-order';
  function bentoCards() { return $$('.dashboard-kpis > .metric-card'); }
  function bentoKey(card) {
    if (!card.dataset.bentoKey) card.dataset.bentoKey=(card.querySelector('.metric-label span')?.textContent||'').trim();
    return card.dataset.bentoKey;
  }
  function restoreBento() {
    const host=$('.dashboard-kpis');
    if (!host || host.dataset.bentoReady === '1') return;
    host.dataset.bentoReady='1';
    const cards=bentoCards();
    cards.forEach(bentoKey);
    cards.forEach((card)=>{ card.draggable=true; card.setAttribute('draggable','true'); });
    let order=[]; try { order=JSON.parse(localStorage.getItem(BENTO_KEY)||'[]'); } catch (_) {}
    if (!order.length) return;
    cards.sort((a,b)=>{ const ia=order.indexOf(bentoKey(a)), ib=order.indexOf(bentoKey(b)); return (ia<0?99:ia)-(ib<0?99:ib); }).forEach((card)=>host.appendChild(card));
  }
  let bentoDrag=null, bentoHold=null, bentoSuppress=false;
  let nativeBento=null;
  document.addEventListener('dragstart', (e) => {
    const card=e.target.closest('.dashboard-kpis > .metric-card');
    if (!card) return;
    nativeBento=card;
    card.classList.add('is-dragging');
    try { e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', bentoKey(card)); } catch (_) {}
  });
  document.addEventListener('dragover', (e) => {
    if (!nativeBento) return;
    const target=e.target.closest('.dashboard-kpis > .metric-card');
    if (target && target !== nativeBento) e.preventDefault();
  });
  document.addEventListener('drop', (e) => {
    if (!nativeBento) return;
    const target=e.target.closest('.dashboard-kpis > .metric-card');
    if (target && target !== nativeBento) {
      e.preventDefault();
      const r=target.getBoundingClientRect();
      if (e.clientX > r.left + r.width/2) target.after(nativeBento);
      else target.before(nativeBento);
    }
    const order=bentoCards().map(bentoKey).filter(Boolean);
    try { localStorage.setItem(BENTO_KEY, JSON.stringify(order)); } catch (_) {}
    nativeBento.classList.remove('is-dragging');
    nativeBento=null;
  });
  document.addEventListener('dragend', () => {
    if (!nativeBento) return;
    nativeBento.classList.remove('is-dragging');
    nativeBento=null;
  });
  function beginBento(card, pointerId) {
    if (!bentoDrag) return;
    bentoDrag.active=true;
    card.classList.add('is-dragging');
    document.body.classList.add('bento-sorting');
    try { card.setPointerCapture(pointerId); } catch (_) {}
  }
  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const card=e.target.closest('.dashboard-kpis > .metric-card');
    if (!card) return;
    bentoDrag={card, x:e.clientX, y:e.clientY, pointerId:e.pointerId, active:false};
    bentoHold=setTimeout(()=>beginBento(card,e.pointerId),150);
  });
  document.addEventListener('pointermove', (e) => {
    if (!bentoDrag) return;
    const dx=Math.abs(e.clientX-bentoDrag.x), dy=Math.abs(e.clientY-bentoDrag.y);
    if (!bentoDrag.active) {
      if (e.pointerType==='mouse' && Math.hypot(dx,dy)>7) { clearTimeout(bentoHold); beginBento(bentoDrag.card,e.pointerId); }
      else if (Math.hypot(dx,dy)>12) { clearTimeout(bentoHold); bentoDrag=null; return; }
      if (!bentoDrag?.active) return;
    }
    e.preventDefault();
    const host=$('.dashboard-kpis');
    if (!host) return;
    const target=[...host.children].find((el) => {
      const r=el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (target && target !== bentoDrag.card) {
      const r=target.getBoundingClientRect();
      if (e.clientX > r.left + r.width/2) target.after(bentoDrag.card);
      else target.before(bentoDrag.card);
    }
  }, { passive: false });
  function endBento() {
    clearTimeout(bentoHold);
    if (!bentoDrag) return;
    const active=bentoDrag.active, card=bentoDrag.card;
    bentoDrag=null;
    if (!active) return;
    card.classList.remove('is-dragging');
    document.body.classList.remove('bento-sorting');
    const order=bentoCards().map(bentoKey).filter(Boolean);
    try { localStorage.setItem(BENTO_KEY, JSON.stringify(order)); } catch (_) {}
    bentoSuppress=true;
    setTimeout(()=>{bentoSuppress=false;},350);
  }
  document.addEventListener('pointerup', endBento);
  document.addEventListener('pointercancel', endBento);
  document.addEventListener('click', (e) => {
    if (bentoSuppress && e.target.closest('.dashboard-kpis > .metric-card')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  /* ---------- long-press lift ---------- */
  let peekEl=null, peekTimer=null, peekStart=null;
  function clearPeek() {
    clearTimeout(peekTimer); peekTimer=null; peekStart=null;
    if (peekEl) peekEl.classList.remove('is-peek');
    peekEl=null;
  }
  document.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.pointerType==='mouse' && e.button!==0) return;
    const el=e.target.closest('.matrix-task, .agent-node-card, .reading-book-card, .health-check');
    if (!el || e.target.closest('.watch-row')) return;
    peekEl=el; peekStart={x:e.clientX,y:e.clientY};
    peekTimer=setTimeout(()=>{ if (peekEl) peekEl.classList.add('is-peek'); }, 340);
  });
  document.addEventListener('pointermove', (e) => {
    if (!peekStart) return;
    if (Math.hypot(e.clientX-peekStart.x,e.clientY-peekStart.y) > 8) clearPeek();
  }, { passive: true });
  document.addEventListener('pointerup', clearPeek);
  document.addEventListener('pointercancel', clearPeek);

  document.body.dataset.taste = 'data-terminal';
})();
