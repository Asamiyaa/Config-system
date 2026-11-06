/* ============================================================================
   Wealth OS — UI interaction layer
   设计原则：只做"壳"的行为，不改 app.js 的业务逻辑；一切通过 DOM 观察生效。
   覆盖：
     1. 层栈管理（focus / flow / workbook / interaction / sidebar）与统一 z-index 阶梯
     2. Esc 关闭最上层、背景滚动锁、初始焦点、Tab 焦点陷阱、关闭后焦点回收
     3. 移动端抽屉遮罩（.mobile-backdrop）与点遮罩关闭
     4. 宽表横向滚动容器注入（.table-scroll）
     5. 提示可访问性（aria-live）与快捷键防护
   ========================================================================== */
(function () {
  'use strict';

  /* ── 0. 层阶：统一 z-index，避免 9999 互压 ─────────────────────────────── */
  const Z = {
    sidebar: 900,
    backdrop: 940,
    focus: 1000,
    flow: 1010,
    workbook: 1020,
    interaction: 1030,
    toast: 1100,
    progress: 1090,
  };

  const style = document.createElement('style');
  style.id = 'ui-layer-style';
  style.textContent = `
    .focus-modal-wrap{z-index:${Z.focus} !important}
    .flow-modal-backdrop{z-index:${Z.flow - 1} !important}
    .flow-modal{z-index:${Z.flow} !important}
    .interaction-modal-backdrop{z-index:${Z.interaction - 1} !important}
    .interaction-modal,.interaction-modal-panel{z-index:${Z.interaction} !important}
    .workbook-backdrop{z-index:${Z.workbook - 1} !important}
    .workbook-modal-wrap{z-index:${Z.workbook} !important}
    .toast{z-index:${Z.toast} !important}
    .market-progress-toast{z-index:${Z.progress} !important}
    .mobile-backdrop{z-index:${Z.backdrop} !important}
    body.ui-scroll-lock{overflow:hidden !important}
    .ui-layer{outline:none}
  `;
  document.head.appendChild(style);

  /* ── 1. 层定义 ───────────────────────────────────────────────────────── */
  const LAYERS = [
    { name: 'sidebar', root: '#sidebar', openClass: 'open', close: 'close-sidebar', panel: '#sidebar' },
    { name: 'focus', root: '#focusTaskModal', panel: '.focus-modal', close: 'close-focus-modal' },
    { name: 'flow', root: '#flowModalMount', panel: '.flow-modal', close: 'flow-modal-close' },
    { name: 'workbook', root: '#workbookViewer', panel: '.workbook-modal', close: 'close-workbook' },
    { name: 'interaction', root: '#interactionModal', panel: '.interaction-modal-panel', close: 'close-interaction-modal' },
    { name: 'palette', root: '#tastePalette', panel: '.taste-palette-panel', customClose: 'palette' },
    { name: 'sheet', root: '#uiSheet', panel: '.ui-sheet-panel', customClose: 'sheet' },
  ];

  const MOBILE = () => window.matchMedia('(max-width: 860px)').matches;
  let scrollLocked = false;
  const focusMemory = new Map();

  const isShown = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.classList.contains('hidden')) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  };

  function openLayers() {
    const out = [];
    for (const def of LAYERS) {
      const root = document.querySelector(def.root);
      if (!root) continue;
      if (def.name === 'sidebar') {
        if (!MOBILE()) continue;
        if (!root.classList.contains('open')) continue;
      } else if (!isShown(root.querySelector(def.panel) || root)) continue;
      out.push({ ...def, el: root, panelEl: root.querySelector(def.panel) || root });
    }
    return out;
  }

  function activeLayer() {
    const list = openLayers();
    return list.length ? list[list.length - 1] : null;
  }

  /* ── 2. 滚动锁 ───────────────────────────────────────────────────────── */
  function syncScrollLock() {
    const need = openLayers().length > 0;
    if (need && !scrollLocked) {
      const gap = window.innerWidth - document.documentElement.clientWidth;
      document.body.classList.add('ui-scroll-lock');
      if (gap > 0) document.body.style.paddingRight = gap + 'px';
      scrollLocked = true;
    } else if (!need && scrollLocked) {
      document.body.classList.remove('ui-scroll-lock');
      document.body.style.paddingRight = '';
      scrollLocked = false;
    }
  }

  /* ── 3. 焦点 ─────────────────────────────────────────────────────────── */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(panel) {
    return Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => isShown(el) && el.tabIndex >= 0);
  }

  function onLayerOpened(layer) {
    if (focusMemory.has(layer.name)) return;
    focusMemory.set(layer.name, document.activeElement);
    const panel = layer.panelEl;
    if (!panel) return;
    panel.classList.add('ui-layer');
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    if (!panel.hasAttribute('role')) panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    if (!panel.hasAttribute('aria-label') && !panel.hasAttribute('aria-labelledby')) {
      const head = panel.querySelector('h1, h2, h3, h4, .card-head, .focus-modal-head, .workbook-modal-head');
      if (head) {
        if (!head.id) head.id = 'ui-layer-title-' + layer.name;
        panel.setAttribute('aria-labelledby', head.id);
      } else {
        panel.setAttribute('aria-label', layer.name);
      }
    }
    panel.querySelectorAll('button[aria-label]').forEach(() => {});
    setTimeout(() => {
      const first = focusables(panel)[0];
      if (first) first.focus({ preventScroll: true });
      else panel.focus({ preventScroll: true });
    }, 30);
  }

  function onLayerClosed(layer) {
    const prev = focusMemory.get(layer.name);
    focusMemory.delete(layer.name);
    if (prev && prev.isConnected) {
      try {
        prev.focus({ preventScroll: true });
        return;
      } catch (_) {}
    }
    const fallback = document.querySelector('.nav-item.active');
    if (fallback) fallback.focus({ preventScroll: true });
  }

  /* ── 4. 同步层状态（rAF 去抖） ───────────────────────────────────────── */
  let prevNames = '';
  let syncQueued = false;

  function syncLayers() {
    syncQueued = false;
    const list = openLayers();
    const names = list.map((l) => l.name).join('|');
    if (names === prevNames) {
      syncScrollLock();
      return;
    }
    const before = prevNames ? prevNames.split('|') : [];
    const after = names ? names.split('|') : [];
    after.filter((n) => !before.includes(n)).forEach((n) => {
      const layer = list.find((l) => l.name === n);
      if (layer) onLayerOpened(layer);
    });
    before.filter((n) => !after.includes(n)).forEach((n) => {
      const layer = LAYERS.find((l) => l.name === n);
      if (layer) onLayerClosed(layer);
    });
    prevNames = names;
    syncScrollLock();
    document.documentElement.classList.toggle('ui-layer-open', after.length > 0);
  }

  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncLayers);
  }

  /* ── 5. 关闭 ─────────────────────────────────────────────────────────── */
  function closeLayer(layer) {
    if (layer.customClose === 'palette') { layer.el.querySelector('[data-palette-close]').click(); return true; }
    if (layer.customClose === 'sheet') { closeSheet(); return true; }
    const btn = layer.el.querySelector('[data-action="' + layer.close + '"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function closeTop() {
    const layer = activeLayer();
    if (!layer) return false;
    return closeLayer(layer);
  }

  /* ── 6. 键盘：Esc 关层、Tab 陷阱、快捷键防护 ───────────────────────────── */
  document.addEventListener(
    'keydown',
    (e) => {
      const layer = activeLayer();
      if (!layer) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeTop();
        return;
      }
      if (e.key === 'Tab') {
        const panel = layer.panelEl;
        const items = focusables(panel);
        if (!items.length) { e.preventDefault(); panel.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (!panel.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      /* 弹层打开时屏蔽 app.js 的 n / 快捷键，防止换页把弹层抹掉 */
      if (e.key === 'n' || e.key === 'N' || e.key === '/') {
        e.stopPropagation();
      }
    },
    true
  );

  /* ── 7. 移动端抽屉遮罩 ───────────────────────────────────────────────── */
  function syncBackdrop() {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;
    const need = MOBILE() && sidebar.classList.contains('open');
    let bd = document.querySelector('.ui-mobile-backdrop');
    if (need && !bd) {
      bd = document.createElement('div');
      bd.className = 'ui-mobile-backdrop mobile-backdrop show';
      bd.setAttribute('aria-hidden', 'true');
      bd.addEventListener('click', () => {
        const btn = document.querySelector('[data-action="close-sidebar"]');
        if (btn) btn.click();
      });
      document.body.appendChild(bd);
    } else if (!need && bd) {
      bd.remove();
    }
  }

  /* ── 8. 宽表滚动容器 ────────────────────────────────────────────────── */
  function wrapTables(root) {
    const targets = [];
    if (root.matches && root.matches('.data-table')) targets.push(root);
    if (root.querySelectorAll) targets.push(...root.querySelectorAll('.data-table'));
    targets.forEach((table) => {
      if (table.closest('.table-scroll')) return;
      const box = document.createElement('div');
      box.className = 'table-scroll';
      box.tabIndex = 0;
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', '数据表格，可左右滚动查看完整内容');
      table.parentNode.insertBefore(box, table);
      box.appendChild(table);
    });
  }

  /* ── 9. 提示可访问性 ────────────────────────────────────────────────── */
  function patchToast() {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
  }

  /* ── 9.5 通用弹层（UISheet）────────────────────────────────────────── */
  let sheetNode = null;

  function closeSheet() {
    if (!sheetNode) return;
    sheetNode.classList.remove('is-open');
    const node = sheetNode;
    sheetNode = null;
    setTimeout(() => node.remove(), 140);
  }

  function openSheet(opts) {
    closeSheet();
    const el = document.createElement('div');
    el.className = 'ui-sheet';
    el.id = 'uiSheet';
    el.innerHTML =
      '<div class="ui-sheet-backdrop" data-ui-sheet-close></div>' +
      '<section class="ui-sheet-panel" role="dialog" aria-modal="true">' +
      '<header><div><h3>' + (opts.title || '') + '</h3>' + (opts.sub ? '<p>' + opts.sub + '</p>' : '') + '</div>' +
      '<button type="button" class="ui-sheet-x" data-ui-sheet-close aria-label="关闭">×</button></header>' +
      '<div class="ui-sheet-body"></div></section>';
    el.querySelector('.ui-sheet-body').innerHTML = opts.body || '';
    document.body.appendChild(el);
    sheetNode = el;
    requestAnimationFrame(() => el.classList.add('is-open'));

    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-ui-sheet-close]')) closeSheet();
    });

    el.querySelectorAll('[data-sheet-exec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = el.querySelector('form');
        if (form && !form.reportValidity()) return;
        if (btn.getAttribute('data-sheet-exec') === 'add-training-session') {
          try { sessionStorage.setItem(FIT_TAB_KEY, 'today'); } catch (_) {}
        }
        const proxy = document.createElement('button');
        proxy.type = 'button';
        proxy.setAttribute('data-action', btn.getAttribute('data-sheet-exec'));
        proxy.style.display = 'none';
        document.body.appendChild(proxy);
        proxy.click();
        proxy.remove();
        setTimeout(closeSheet, 80);
      });
    });

    const first = el.querySelector('.ui-sheet-body input, .ui-sheet-body select, .ui-sheet-body textarea');
    if (first) first.focus({ preventScroll: true });
    scheduleSync();
  }

  window.UISheet = { open: openSheet, close: closeSheet };

  /* ── 9.6 通用 Tab 工作区 ───────────────────────────────────────────── */
  const FIT_TAB_KEY = 'wealthos-fit-tab';

  function tabScopeOf(el) {
    return el.closest('[data-tab-shell]') || el.closest('[data-fit-shell]') || el.closest('.fit-shell') || document;
  }

  function tabStorageKey(scope) {
    if (!scope || scope === document) return 'wealthos-tab-default';
    if (scope.classList && scope.classList.contains('fit-shell')) return FIT_TAB_KEY;
    const key = scope.dataset ? scope.dataset.tabKey : '';
    return 'wealthos-tab-' + (key || 'default');
  }

  function activateTab(scope, name, remember) {
    // Resolve a valid destination before hiding anything. Ignore nested workspaces.
    const panels = [...scope.querySelectorAll('[data-tab-panel]')].filter(p => tabScopeOf(p) === scope);
    if (!panels.length) return;
    const requested = name;
    if(scope.classList?.contains('fit-shell') && name==='tools')name='library';
    const exists = value => panels.some(p => p.getAttribute('data-tab-panel') === value);
    if (!exists(name)) {
      const fallback = scope.dataset?.defaultTab;
      name = exists(fallback) ? fallback :
        (panels.find(p => p.classList.contains('active')) || panels[0]).getAttribute('data-tab-panel');
    }
    panels.forEach(p => p.classList.toggle('active', p.getAttribute('data-tab-panel') === name));
    [...scope.querySelectorAll('[data-tab]')].filter(b => tabScopeOf(b) === scope).forEach(b => {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      if (b.getAttribute('data-tab') === 'plan' && !b.closest('[role="tablist"]')) b.removeAttribute('aria-selected');
      else b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (remember || requested !== name) {
      try { sessionStorage.setItem(tabStorageKey(scope), name); } catch (_) {}
    }
  }

  function restoreTab() {
    const scopes = [...document.querySelectorAll('[data-tab-shell], .fit-shell')];
    scopes.forEach((scope) => {
      if (scope.dataset.tabReady === '1') return;
      scope.dataset.tabReady = '1';
      let name = scope.dataset.defaultTab || 'today';
      try { name = sessionStorage.getItem(tabStorageKey(scope)) || name; } catch (_) {}
      activateTab(scope, name, false);
    });
  }

  /* 9.7 记录弹层里的步进器与常用动作 chips */
  document.addEventListener('click', (e) => {
    const stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      const box = stepBtn.closest('.fit-step');
      const input = box && box.querySelector('input');
      if (input) {
        const delta = Number(stepBtn.getAttribute('data-delta') || 1) * Number(stepBtn.getAttribute('data-step') || 1);
        const min = input.min !== '' ? Number(input.min) : 0;
        const next = Math.max(min, Math.round((Number(input.value || 0) + delta) * 100) / 100);
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }
    const chip = e.target.closest('[data-fill-exercise]');
    if (chip) {
      const form = chip.closest('form');
      const input = form && form.querySelector('[name="exercise"]');
      if (input) {
        input.value = chip.getAttribute('data-fill-exercise');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      }
    }
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    const scope = tabScopeOf(btn);
    activateTab(scope, btn.getAttribute('data-tab'), true);
  });
  /* ── 10. 观察 ───────────────────────────────────────────────────────── */
  const observer = new MutationObserver((records) => {
    let needTableScan = false;
    for (const r of records) {
      if (r.type === 'childList') {
        if (r.addedNodes.length) needTableScan = true;
      }
    }
    if (needTableScan) wrapTables(document.querySelector('#viewRoot') || document.body);
    restoreTab();
    syncBackdrop();
    scheduleSync();
  });

  function mountMobileMenu() {
    if (document.querySelector('.ui-mobile-menu')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ui-mobile-menu';
    btn.setAttribute('data-action', 'open-sidebar');
    btn.setAttribute('aria-label', '打开导航菜单');
    btn.textContent = '\u2261';
    document.body.appendChild(btn);
    document.body.classList.add('ui-has-menu');
  }

  function boot() {
    patchToast();
    mountMobileMenu();
    restoreTab();
    wrapTables(document.querySelector('#viewRoot') || document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    syncLayers();
    syncBackdrop();

    /* 导航切换前先关掉所有层，避免旧弹层悬空 */
    document.addEventListener(
      'click',
      (e) => {
        const nav = e.target.closest && e.target.closest('.nav-item[data-page], [data-action="go-page"]');
        if (!nav) return;
        const list = openLayers();
        list.reverse().forEach((l) => closeLayer(l));
      },
      true
    );

    window.addEventListener('resize', () => {
      syncBackdrop();
      scheduleSync();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
