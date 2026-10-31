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
  function syncActive() {
    const page = (typeof currentPage !== 'undefined' ? currentPage : '') || '';
    localizeLabels($('#viewRoot') || document);
    $$('#mainNav .nav-item').forEach((item) => {
      const on = item.dataset.page === page;
      item.classList.toggle('active', on);
      if (on) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const healthPages = new Set(['health','checkin','diet','fitness','skin','sleep','style']);
    $$('.mobile-tab[data-page]').forEach((item) => {
      const on = item.dataset.page === page || (item.dataset.page === 'health' && healthPages.has(page));
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
    { page: 'home', label: '首页', icon: 'i-home' },
    { page: 'schedules', label: '待办', icon: 'i-check' },
    { page: 'dailyflow', label: '流程', icon: 'i-clock' },
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

  document.body.dataset.taste = 'data-terminal';
})();
