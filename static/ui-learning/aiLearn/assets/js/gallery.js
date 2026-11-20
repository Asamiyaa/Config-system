/* ============================================================
 * gallery.js — 案例画廊首页逻辑
 * ============================================================ */
(function () {
  'use strict';

  var state = {
    query: '',
    style: new Set(),
    business: new Set(),
    onlyFav: false
  };

  function setLabels() {
    document.getElementById('pageSub').textContent = '你的界面灵感与设计判断，在这里持续积累。';
    document.getElementById('btnImport').innerHTML = UI.icon('upload') + '导入JSON';
    document.getElementById('searchIcon').innerHTML = UI.icon('search');
    document.getElementById('favOnlyText').textContent = '只看收藏';
    document.getElementById('styleTagLabel').textContent = '样式标签';
    document.getElementById('businessTagLabel').textContent = '业务标签';
    document.getElementById('btnClearFilter').innerHTML = UI.icon('x') + '清空筛选';
  }

  async function init() {
    setLabels();
    await Store.init();
    UI.renderSidebar('gallery');
    renderTagFilters();
    bindEvents();
    renderGrid();
  }

  function renderTagFilters() {
    renderPillGroup('styleTagFilters', Store.allTags('style_tags'), state.style);
    renderPillGroup('businessTagFilters', Store.allTags('business_tags'), state.business);
  }

  function renderPillGroup(containerId, tags, selected) {
    var box = document.getElementById(containerId);
    var all = '<button class="filter-pill ' + (selected.size ? '' : 'selected') + '" data-all="1">全部</button>';
    box.innerHTML = all + tags.map(function (t) {
      return '<button class="filter-pill ' + (selected.has(t) ? 'selected' : '') + '" data-tag="' +
        UI.escapeHtml(t) + '">' + UI.escapeHtml(t) + '</button>';
    }).join('');
    box.querySelectorAll('[data-tag]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.tag;
        if (selected.has(t)) selected['delete'](t); else selected.add(t);
        renderTagFilters(); renderGrid();
      });
    });
    box.querySelector('[data-all]').addEventListener('click', function () {
      selected.clear(); renderTagFilters(); renderGrid();
    });
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    return Store.getCases().filter(function (c) {
      if (state.onlyFav && !c.favorite) return false;
      if (state.style.size) {
        var okS = Array.from(state.style).every(function (t) { return c.style_tags.indexOf(t) >= 0; });
        if (!okS) return false;
      }
      if (state.business.size) {
        var okB = Array.from(state.business).every(function (t) { return c.business_tags.indexOf(t) >= 0; });
        if (!okB) return false;
      }
      if (q) {
        var hay = (c.title + ' ' + c.style_tags.join(' ') + ' ' + c.business_tags.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  async function renderGrid() {
    var list = filtered();
    document.getElementById('totalStat').textContent = Store.getCases().length;
    document.getElementById('favoriteStat').textContent = Store.getCases().filter(function(c) { return c.favorite; }).length;
    document.getElementById('groupStat').textContent = Store.getGroups().length;
    document.getElementById('caseCount').textContent = '共 ' + list.length + ' / ' + Store.getCases().length + ' 个案例';
    var grid = document.getElementById('caseGrid');
    if (!list.length) {
      grid.innerHTML = '<div class="empty-state col-span-full">' + UI.icon('image') +
        '<div>没有符合条件的案例，请调整搜索或清空筛选。</div></div>';
      return;
    }
    var cards = await Promise.all(list.map(async function (c) {
      var cover = (c.images || []).find(function (im) { return im.id === c.cover_image_id; }) || c.images[0];
      var url = cover ? await Store.resolveImageURL(cover) : '';
      var tags = c.style_tags.concat(c.business_tags).slice(0, 4);
      return '<div class="card case-card">' +
        '<div class="relative case-visual"><a class="case-preview-link" href="view.html?id=' + encodeURIComponent(c.id) + '">' +
        (url ? '<img class="case-thumb" src="' + url + '" alt="' + UI.escapeHtml(c.title) + '" />' :
          '<div class="case-thumb flex items-center justify-center text-ink-400">无图</div>') +
        '</a><button class="fav-btn ' + (c.favorite ? 'on' : '') + '" data-fav="' + c.id + '" title="收藏">' +
        UI.icon('star') + '</button></div>' +
        '<a class="p-3 flex-1 flex flex-col" href="view.html?id=' + c.id + '">' +
        '<span class="case-category">' + UI.escapeHtml((c.business_tags || [])[0] || '设计案例') + '</span><h3 class="font-bold text-[14px] text-ink-900 mb-1.5">' + UI.escapeHtml(c.title) + '</h3>' +
        '<div class="flex flex-wrap gap-1 mb-2">' +
        tags.map(function (t) { return '<span class="text-[11px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">' + UI.escapeHtml(t) + '</span>'; }).join('') +
        '</div><span class="case-note">' + UI.escapeHtml((c.analysis && c.analysis.layout_strengths && c.analysis.layout_strengths.content || '打开案例，记录你的观察与设计判断。').replace('【演示】', '')) + '</span><span class="case-footer">阅读拆解 <span>↗</span></span></a></div>';
    }));
    grid.innerHTML = cards.join('');

    grid.querySelectorAll('[data-fav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        Store.toggleFavorite(b.dataset.fav);
        renderGrid(); UI.renderSidebar('gallery');
      });
    });
  }

  function bindEvents() {
    document.getElementById('searchInput').addEventListener('input', function (e) {
      state.query = e.target.value; renderGrid();
    });
    document.getElementById('onlyFav').addEventListener('change', function (e) {
      state.onlyFav = e.target.checked; renderGrid();
    });
    document.getElementById('btnImport').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (!f) return;
      Store.importJSONFile(f).then(function (n) {
        UI.toast('已导入 ' + n + ' 个案例', 'success');
        renderTagFilters(); renderGrid(); UI.renderSidebar('gallery');
      })['catch'](function (err) { UI.toast('导入失败：' + err.message, 'error'); });
      e.target.value = '';
    });
    document.getElementById('btnClearFilter').addEventListener('click', function () {
      state.query = ''; state.style.clear(); state.business.clear(); state.onlyFav = false;
      document.getElementById('searchInput').value = '';
      document.getElementById('onlyFav').checked = false;
      renderTagFilters(); renderGrid();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
