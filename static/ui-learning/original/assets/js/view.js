/* ============================================================
 * view.js — 只读查看页：左图右详细内容（内容铺开）
 * ============================================================ */
(function () {
  'use strict';

  var item = null;
  var currentImgId = null;

  var AI = [
    ['layout_structure', '布局结构'],
    ['visual_style', 'UI视觉风格'],
    ['interaction', '交互特征'],
    ['color_mood', '色调与氛围'],
    ['layout_strengths', '布局优点']
  ];

  function setLabels() {
    document.getElementById('annTitle').textContent = '图片标注';
    document.getElementById('rawSummary').textContent = 'AI 原始返回（ai_raw_result，点击展开）';
  }

  function sourceBadge(src) {
    if (src === 'ai_generated') return '<span class="ai-badge">' + UI.icon('sparkles') + 'AI预生成</span>';
    if (src === 'human_modified') return '<span class="ai-badge" style="color:#a07a35">' + UI.icon('edit') + '人工修改</span>';
    return '<span class="ai-badge" style="color:var(--ink-500)">' + UI.icon('edit') + '人工</span>';
  }

  async function init() {
    setLabels();
    await Store.init();
    var id = UI.getParam('id');
    item = Store.getCase(id);
    if (!item) { UI.toast('未找到该案例', 'error'); setTimeout(function () { location.href = 'index.html'; }, 900); return; }

    currentImgId = item.cover_image_id || (item.images[0] && item.images[0].id) || null;
    UI.renderSidebar(null, item.id);

    renderHead();
    renderImage();
    renderAISections();
    renderManualBlocks();
    renderRaw();
    bindEvents();
  }

  function renderHead() {
    document.getElementById('viewTitle').textContent = item.title || '未命名案例';
    document.getElementById('viewTags').innerHTML =
      item.style_tags.concat(item.business_tags).map(function (t) {
        return '<span class="text-[11px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">' + UI.escapeHtml(t) + '</span>';
      }).join('');
    document.getElementById('viewMeta').innerHTML =
      '创建：' + UI.fmtDate(item.created_at) + ' · 更新：' + UI.fmtDate(item.updated_at) +
      ' · 版本：' + (item.versions || []).length + ' 个';
    var fav = document.getElementById('btnFav');
    fav.innerHTML = UI.icon('star'); fav.classList.toggle('on', !!item.favorite);
    fav.title = item.favorite ? '取消收藏' : '收藏';
  }

  async function renderImage() {
    var im = currentImageObject();
    var main = document.getElementById('mainImg');
    if (im) { main.style.display = ''; main.src = await Store.resolveImageURL(im); }
    else { main.removeAttribute('src'); main.style.display = 'none'; }

    var mini = document.getElementById('miniAlbum');
    mini.innerHTML = (await Promise.all(item.images.map(async function (x) {
      var url = await Store.resolveImageURL(x);
      return '<div class="thumb ' + (x.id === currentImgId ? 'selected' : '') + '" data-pick="' + x.id + '">' +
        '<img src="' + url + '" alt="' + UI.escapeHtml(x.name) + '" /></div>';
    }))).join('');
    mini.querySelectorAll('[data-pick]').forEach(function (el) {
      el.addEventListener('click', function () { currentImgId = el.dataset.pick; renderImage(); renderAnnotations(); });
    });
    mini.style.display = item.images.length <= 1 ? 'none' : '';
    renderAnnotations();
  }

  function currentImageObject() {
    return item.images.find(function (im) { return im.id === currentImgId; }) || item.images[0] || null;
  }

  function renderAnnotations() {
    var im = currentImageObject();
    var card = document.getElementById('annCard');
    var box = document.getElementById('annList');
    var anns = (im && im.annotations) || [];
    if (!anns.length) { card.style.display = 'none'; return; }
    card.style.display = '';
    box.innerHTML = anns.map(function (a) {
      return '<div class="ann-row">' + UI.icon('pin') + '<span>' + UI.escapeHtml(a.text) + '</span></div>';
    }).join('');
  }

  function contentBox(block, isAi) {
    return '<div class="view-content ' + (isAi ? 'is-ai' : '') + '">' +
      UI.escapeHtml(block.content) + '</div>';
  }

  function renderAISections() {
    document.getElementById('aiSections').innerHTML = AI.map(function (pair) {
      var b = item.analysis[pair[0]];
      if (!b || !b.content) return '';
      return '<div class="view-section"><div class="vs-head"><span class="vs-title">' + pair[1] + '</span>' +
        sourceBadge(b.source) + '</div>' + contentBox(b, true) + '</div>';
    }).join('');
  }

  function renderManualBlocks() {
    var defs = [
      ['适用场景', item.use_cases],
      ['需要避开的坑', item.pitfalls.avoid_pitfalls],
      ['禁用场景', item.pitfalls.forbidden_scenarios]
    ];
    document.getElementById('manualSections').innerHTML = defs.map(function (d) {
      var block = d[1];
      if (!block || !block.content) return '';
      return '<div class="view-section"><div class="vs-head"><span class="vs-title">' + d[0] + '</span></div>' +
        contentBox(block, false) + '</div>';
    }).join('');
  }

  function renderRaw() {
    var details = document.getElementById('rawDetails');
    var raw = item.ai_raw_result;
    if (!raw) { details.style.display = 'none'; return; }
    details.style.display = '';
    document.getElementById('rawContent').textContent = raw;
  }

  function bindEvents() {
    document.getElementById('btnFav').addEventListener('click', function () {
      Store.toggleFavorite(item.id);
      item = Store.getCase(item.id);
      renderHead(); UI.renderSidebar(null, item.id);
    });

    /* 图片双击灯箱：主图 + 缩略图 */
    document.getElementById('mainImg').addEventListener('dblclick', function () {
      if (this.src) UI.openLightbox(this.src);
    });
    document.getElementById('miniAlbum').addEventListener('dblclick', function (e) {
      var t = e.target.closest('[data-pick]');
      if (!t) return;
      var im = item.images.find(function (x) { return x.id === t.dataset.pick; });
      if (im) Store.resolveImageURL(im).then(function (u) { if (u) UI.openLightbox(u); });
    });

    /* 键盘上下键切换上/下案例（输入框聚焦时不触发） */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;
      var cases = Store.getCases();
      var idx = -1;
      for (var i = 0; i < cases.length; i++) { if (cases[i].id === item.id) { idx = i; break; } }
      if (idx < 0) return;
      var next = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
      if (next < 0 || next >= cases.length) return;
      e.preventDefault();
      location.href = 'view.html?id=' + cases[next].id;
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
