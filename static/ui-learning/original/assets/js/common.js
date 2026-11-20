/* ============================================================
 * common.js — 公共工具：图标 / Toast / 确认框 / 标签输入 / 工具
 * 暴露 window.UI
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 分组折叠状态（localStorage） ---------- */
  var TREE_KEY = 'uilearn_tree_state_v1';
  function getTreeState() {
    try {
      var raw = localStorage.getItem(TREE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function setTreeState(st) {
    try { localStorage.setItem(TREE_KEY, JSON.stringify(st || {})); }
    catch (e) {}
  }

  /* ---------- 转义与格式化 ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function getParam(key) {
    return new URLSearchParams(location.search).get(key);
  }

  /* ---------- 线性图标（stroke=currentColor） ---------- */
  var PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
    compare: '<rect x="3" y="4" width="13" height="13" rx="2"/><path d="M8 20h13V7"/>',
    template: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.6l1-5.8L3.5 9.7l5.9-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',
    tag: '<path d="M3 11V4h7l11 11-7 7L3 11z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    warning: '<path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17.5v.1"/>',
    sparkles: '<path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    folder: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="6" rx="1"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
    folder_open: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2"/><path d="M4 9h16l-2 9a2 2 0 0 1-2 1.6H6a2 2 0 0 1-2-1.6z"/>',
    grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>'
  };
  function icon(name, cls) {
    var body = PATHS[name] || '';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ui-icon ' + (cls || '') + '">' + body + '</svg>';
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, type) {
    var box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.className = 'toast-box';
      box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    box.innerHTML = (type === 'error' ? icon('warning') : type === 'success' ? icon('check') : icon('sparkles')) +
      '<span>' + escapeHtml(msg) + '</span>';
    box.className = 'toast-box show ' + (type || 'info');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.className = 'toast-box'; }, 2800);
  }

  /* ---------- 确认 / 提示 Modal ---------- */
  function modal(options) {
    return new Promise(function (resolve) {
      var mask = document.createElement('div');
      mask.className = 'modal-mask';
      mask.innerHTML =
        '<div class="modal-card" role="dialog" aria-modal="true">' +
        '<div class="modal-head"><h3>' + escapeHtml(options.title || '请确认') + '</h3>' +
        '<button class="modal-close" data-act="cancel">' + icon('x') + '</button></div>' +
        '<div class="modal-body">' + (options.html || escapeHtml(options.text || '')) + '</div>' +
        '<div class="modal-foot">' +
        (options.cancelText !== false ? '<button class="btn btn-ghost" data-act="cancel">' + escapeHtml(options.cancelText || '取消') + '</button>' : '') +
        '<button class="btn btn-primary" data-act="ok">' + escapeHtml(options.okText || '确定') + '</button>' +
        '</div></div>';
      document.body.appendChild(mask);
      var restore = focusOverlay(mask);
      mask.setAttribute('aria-label', options.title || '确认操作');
      function escape(e) { if (e.key === 'Escape') close(false); }
      mask.addEventListener('keydown', escape);
      function close(val) {
        restore();
        mask.removeEventListener('keydown', escape);
        document.body.removeChild(mask);
        resolve(val);
      }
      mask.addEventListener('click', function (e) {
        var act = e.target.closest('[data-act]');
        if (e.target === mask) close(false);
        else if (act && act.dataset.act === 'ok') close(true);
        else if (act && act.dataset.act === 'cancel') close(false);
      });
    });
  }

  function focusOverlay(panel, close) {
    var previous = document.activeElement, overflow = document.body.style.overflow;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '图片预览');
    document.body.style.overflow = 'hidden';
    function key(e) {
      if (e.key !== 'Tab') return;
      var nodes = panel.querySelectorAll('button, a[href], input, textarea, select, [tabindex="0"]');
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    panel.addEventListener('keydown', key);
    var first = panel.querySelector('button'); if (first) first.focus();
    return function() { document.body.style.overflow = overflow; panel.removeEventListener('keydown', key); if (previous) previous.focus(); };
  }

  /* ---------- 灯箱（双击图片放大） ---------- */
  function openLightbox(src) {
    closeLightbox();
    var box = document.createElement('div');
    box.className = 'lightbox';
    box.id = 'lightboxBox';
    box.innerHTML =
      '<button class="lightbox-close" type="button">' + icon('x') + '</button>' +
      '<img src="' + escapeHtml(src) + '" alt="放大查看" />' +
      '<div class="lightbox-hint">点击空白处或按 ESC 关闭</div>';
    document.body.appendChild(box);
    var restoreFocus = focusOverlay(box);
    box.querySelector('button').setAttribute('aria-label', '关闭图片预览');
    box._close = close;
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() {
      restoreFocus();
      if (box.parentNode) box.parentNode.removeChild(box);
      document.removeEventListener('keydown', onKey);
    }
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.lightbox-close')) close();
    });
    document.addEventListener('keydown', onKey);
  }
  function closeLightbox() {
    var old = document.getElementById('lightboxBox');
    if (old && old._close) old._close();
  }

  /* ---------- 标签输入（回车/逗号添加） ---------- */
  function bindTagInput(container, getTags, setTags) {
    function render() {
      var tags = getTags() || [];
      container.querySelectorAll('.tag-chip').forEach(function (n) { n.remove(); });
      tags.forEach(function (t) {
        var chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = escapeHtml(t) + '<button type="button" data-tag="' + escapeHtml(t) + '">' + icon('x') + '</button>';
        container.insertBefore(chip, container.querySelector('input'));
      });
    }
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tag]');
      if (btn) {
        var tags = (getTags() || []).filter(function (x) { return x !== btn.dataset.tag; });
        setTags(tags); render();
      }
    });
    var input = container.querySelector('input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        var v = input.value.trim().replace(/,$/, '');
        if (v && (getTags() || []).indexOf(v) < 0) {
          setTags((getTags() || []).concat(v)); render();
        }
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value && (getTags() || []).length) {
        var tags = getTags().slice(0, -1);
        setTags(tags); render();
      }
    });
    render();
  }

  /* ---------- 顶部导航高亮（旧接口，保留兼容） ---------- */
  function highlightNav(page) {
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.nav === page);
    });
  }

  /* ---------- 左侧树形侧边栏（统一渲染） ---------- */
  function renderSidebar(activePage, activeCaseId) {
    var allCases = (window.Store && Store.getCases()) || [];
    var groups = (window.Store && Store.getGroups()) || [];
    var aside = document.getElementById('appSidebar');
    if (!aside) return;

    var navItems = [
      ['gallery', '案例画廊', 'home', 'index.html'],
      ['compare', '案例对比', 'compare', 'compare.html'],
      ['template', '提示词模板', 'template', 'template.html'],
      ['settings', '设置', 'gear', 'settings.html']
    ];
    var navHtml = navItems.map(function (n) {
      return '<a class="tree-item ' + (activePage === n[0] ? 'active' : '') +
        '" data-nav="' + n[0] + '" href="' + n[3] + '">' +
        icon(n[2]) + '<span class="item-text">' + n[1] + '</span></a>';
    }).join('');

    /* 当前案例：显式传入优先，否则取 URL 的 id */
    var currentId = activeCaseId || getParam('id');
    var saved = getTreeState();

    var groupsHtml = groups.map(function (g) {
      var members = allCases.filter(function (c) { return c.group_id === g.id; });
      var isCollapsed = saved['grp_' + g.id];
      var canDelete = g.id !== Store.DEFAULT_GROUP_ID;
      var children = members.map(function (c) {
        return '<div class="tree-child ' + (currentId === c.id ? 'active' : '') +
          '" draggable="true" data-case="' + c.id + '">' +
          '<a class="tree-child-main" href="view.html?id=' + c.id + '">' +
          '<span class="drag-handle" title="拖动排序 / 分组">' + icon('grip') + '</span>' +
          '<span class="tree-child-title">' + escapeHtml(c.title) + '</span>' +
          (c.favorite ? '<span class="fav-mark">' + icon('star') + '</span>' : '') + '</a>' +
          '<button type="button" class="tree-edit-btn" data-edit="' + c.id + '" title="编辑案例">' + icon('edit') + '</button>' +
          '</div>';
      }).join('') || '<div class="tree-empty">暂无案例</div>';

      return '<div class="tree-group ' + (isCollapsed ? 'collapsed' : '') + '" data-group="' + g.id + '">' +
        '<div class="tree-parent-row">' +
        '<button type="button" class="tree-parent" data-parent="' + g.id + '">' +
        icon('folder') + '<span class="parent-text">' + escapeHtml(g.name) + '</span>' +
        '<span class="tree-count">' + members.length + '</span>' +
        '<span class="chev">' + icon('chevron') + '</span></button>' +
        '<div class="group-tools">' +
        '<button type="button" class="group-tool" data-addcase="' + g.id + '" title="在此分组新建案例">' + icon('plus') + '</button>' +
        '<button type="button" class="group-tool" data-rename="' + g.id + '" title="重命名分组">' + icon('edit') + '</button>' +
        (canDelete ? '<button type="button" class="group-tool" data-delgroup="' + g.id + '" title="删除分组">' + icon('trash') + '</button>' : '') +
        '</div></div>' +
        '<div class="tree-children" data-dropzone="' + g.id + '">' + children + '</div>' +
        '</div>';
    }).join('');

    aside.innerHTML =
      '<div class="sidebar-brand">' +
      '<span class="brand-logo">u.</span>' +
      '<span class="brand-text">界面研究室<small>UI STUDY LIBRARY</small></span></div>' +
      '<nav class="sidebar-nav">' + navHtml + '</nav>' +
      '<div class="library-label">我的案例库</div><div class="sidebar-tree">' + groupsHtml + '</div>' +
      '<div class="sidebar-foot">' +
      '<button type="button" id="btnNewGroup" class="btn btn-ghost btn-sm">' +
      icon('plus') + '<span class="item-text">新建分组</span></button>' +
      '</div>';

    bindSidebarEvents(aside, activePage, currentId);
    mountMainActions(activePage, currentId);
    ensureDrawer(aside);
    initRailHover(aside);
  }

  /* 侧边栏事件：折叠、分组管理、案例编辑、拖拽 */
  function bindSidebarEvents(aside, activePage, currentId) {
    function refresh() { renderSidebar(activePage, currentId); }

    aside.querySelectorAll('.tree-parent').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var groupEl = btn.closest('.tree-group');
        groupEl.classList.toggle('collapsed');
        var st = getTreeState();
        if (groupEl.classList.contains('collapsed')) st['grp_' + groupEl.dataset.group] = 1;
        else delete st['grp_' + groupEl.dataset.group];
        setTreeState(st);
      });
    });

    aside.querySelectorAll('.tree-edit-btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        location.href = 'editor.html?id=' + b.dataset.edit;
      });
    });

    aside.querySelectorAll('[data-addcase]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        location.href = 'editor.html?group=' + b.dataset.addcase;
      });
    });

    aside.querySelectorAll('[data-rename]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.rename;
        var g = Store.getGroups().find(function (x) { return x.id === id; });
        var name = window.prompt('请输入分组名称', g ? g.name : '');
        if (name && name.trim()) { Store.renameGroup(id, name.trim()); refresh(); }
      });
    });

    aside.querySelectorAll('[data-delgroup]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.dataset.delgroup;
        UI.modal({ title: '删除分组', text: '删除后该分组内案例将移回「默认分组」，确认删除？', okText: '删除' })
          .then(function (ok) {
            if (!ok) return;
            try { Store.deleteGroup(id); refresh(); }
            catch (err) { UI.toast(err.message, 'error'); }
          });
      });
    });

    var newGroupBtn = document.getElementById('btnNewGroup');
    if (newGroupBtn) newGroupBtn.addEventListener('click', function () {
      var name = window.prompt('请输入新分组名称', '');
      if (name && name.trim()) { Store.addGroup(name.trim()); refresh(); }
    });

    bindDragAndDrop(aside, refresh);
  }

  /* HTML5 拖拽：组内排序 + 跨组归类 */
  function bindDragAndDrop(aside, refresh) {
    var dragCaseId = null;

    function clearMarkers() {
      aside.querySelectorAll('.drop-before,.drop-after').forEach(function (el) {
        el.classList.remove('drop-before', 'drop-after');
        el.dataset.dropPos = '';
      });
      aside.querySelectorAll('.drop-zone').forEach(function (el) { el.classList.remove('drop-zone'); });
    }

    function nextCaseId(child) {
      var next = child.nextElementSibling;
      while (next && !next.dataset.case) next = next.nextElementSibling;
      return next ? next.dataset.case : null;
    }

    aside.querySelectorAll('.tree-child[draggable]').forEach(function (el) {
      el.addEventListener('dragstart', function (e) {
        dragCaseId = el.dataset.case;
        window._caseDragging = true;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragCaseId); } catch (err) {}
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', function () {
        el.classList.remove('dragging'); clearMarkers(); dragCaseId = null;
        window._caseDragging = false;
      });
    });

    aside.querySelectorAll('.tree-child').forEach(function (child) {
      child.addEventListener('dragover', function (e) {
        if (!dragCaseId) return;
        e.preventDefault(); e.stopPropagation();
        var rect = child.getBoundingClientRect();
        var before = (e.clientY - rect.top) < rect.height / 2;
        clearMarkers();
        child.classList.add(before ? 'drop-before' : 'drop-after');
        child.dataset.dropPos = before ? 'before' : 'after';
      });
      child.addEventListener('drop', function (e) {
        if (!dragCaseId) return;
        e.preventDefault(); e.stopPropagation();
        var targetId = child.dataset.case;
        var before = child.dataset.dropPos !== 'after';
        var groupEl = child.closest('.tree-group');
        var groupId = groupEl ? groupEl.dataset.group : Store.DEFAULT_GROUP_ID;
        var beforeId = before ? targetId : nextCaseId(child);
        Store.moveCaseTo(dragCaseId, groupId, beforeId);
        clearMarkers(); refresh();
      });
    });

    aside.querySelectorAll('.tree-children').forEach(function (zone) {
      zone.addEventListener('dragover', function (e) {
        if (!dragCaseId) return;
        e.preventDefault();
        zone.classList.add('drop-zone');
      });
      zone.addEventListener('dragleave', function () { zone.classList.remove('drop-zone'); });
      zone.addEventListener('drop', function (e) {
        if (!dragCaseId) return;
        e.preventDefault();
        zone.classList.remove('drop-zone');
        Store.moveCaseTo(dragCaseId, zone.dataset.dropzone, null);
        refresh();
      });
    });
  }

  /* 主区右上角操作按钮 */
  function mountMainActions(activePage, currentId) {
    var box = document.getElementById('mainActions');
    if (!box) return;
    var html = '<button type="button" class="btn btn-ghost btn-sm" data-act-newcase>' +
      icon('plus') + '新建案例</button>';
    if (currentId) {
      if (activePage !== 'editor') {
        html += '<button type="button" class="btn btn-ghost btn-sm" data-act-edit>' +
          icon('edit') + '编辑案例</button>';
      }
      html += '<button type="button" class="btn btn-primary btn-sm" data-act-md>' +
        icon('download') + '导出Markdown</button>';
    }
    box.innerHTML = html;

    box.querySelector('[data-act-newcase]').addEventListener('click', function () {
      location.href = 'editor.html';
    });
    var editBtn = box.querySelector('[data-act-edit]');
    if (editBtn) editBtn.addEventListener('click', function () {
      location.href = 'editor.html?id=' + currentId;
    });
    var mdBtn = box.querySelector('[data-act-md]');
    if (mdBtn) mdBtn.addEventListener('click', function () {
      if (window.Markdown) Markdown.exportCase(Store.getCase(currentId));
      else UI.toast('Markdown 模块未加载', 'error');
    });
  }

  /* 默认图标栏（rail）+ 悬停展开 */
  function initRailHover(aside) {
    var shell = document.querySelector('.app-shell');
    if (shell) shell.classList.remove('rail', 'rail-open');
  }

  /* 窄屏抽屉：汉堡按钮 + 遮罩 */
  function ensureDrawer(aside) {
    if (!document.getElementById('sidebarToggle')) {
      var btn = document.createElement('button');
      btn.id = 'sidebarToggle'; btn.type = 'button';
      btn.setAttribute('aria-label', '展开导航'); btn.setAttribute('aria-expanded', 'false');
      btn.className = 'sidebar-toggle'; btn.innerHTML = icon('menu');
      document.body.appendChild(btn);

      var bd = document.createElement('div');
      bd.id = 'sidebarBackdrop'; bd.className = 'sidebar-backdrop';
      document.body.appendChild(bd);

      var restoreDrawer = null;
      var open = function () { aside.classList.add('open'); bd.classList.add('show'); btn.setAttribute('aria-expanded', 'true'); restoreDrawer = focusOverlay(aside); aside.setAttribute('aria-label', '导航'); var first = aside.querySelector('a, button'); if (first) first.focus(); };
      var close = function () { aside.classList.remove('open'); bd.classList.remove('show'); btn.setAttribute('aria-expanded', 'false'); if (restoreDrawer) restoreDrawer(); restoreDrawer = null; aside.removeAttribute('role'); aside.removeAttribute('aria-modal'); };
      window.addEventListener('resize', function() { if (window.innerWidth > 900 && restoreDrawer) close(); });
      document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && aside.classList.contains('open')) { close(); btn.focus(); } });
      btn.addEventListener('click', function() { if (aside.classList.contains('open')) close(); else open(); });
      bd.addEventListener('click', close);
      aside.addEventListener('click', function (e) {
        if (e.target.closest('a') && window.innerWidth <= 900) close();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var picture = document.getElementById('annotateImg') || document.getElementById('mainImg');
    if (!picture) return;
    var zoom = document.createElement('button');
    zoom.type = 'button'; zoom.className = 'btn btn-ghost btn-sm'; zoom.textContent = '放大查看原图';
    var container = document.getElementById('annotateStage') || picture;
    container.insertAdjacentElement('afterend', zoom);
    zoom.addEventListener('click', function() { if (picture.getAttribute('src')) openLightbox(picture.src); else toast('请先选择图片', 'info'); });
  });

  window.UI = {
    escapeHtml: escapeHtml,
    fmtDate: fmtDate,
    getParam: getParam,
    icon: icon,
    toast: toast,
    modal: modal,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    bindTagInput: bindTagInput,
    highlightNav: highlightNav,
    renderSidebar: renderSidebar
  };
})();
