/* ============================================================
 * compare.js — 案例对比页逻辑
 * ============================================================ */
(function () {
  'use strict';

  var AI_LABELS = [
    ['layout_structure', '布局结构'],
    ['visual_style', 'UI视觉风格'],
    ['interaction', '交互特征'],
    ['color_mood', '色调与氛围'],
    ['layout_strengths', '布局优点']
  ];
  var syncing = false;

  function setLabels() {
    document.getElementById('pageTitle').textContent = '案例并排对比';
    document.getElementById('labelA').textContent = '案例 A';
    document.getElementById('labelB').textContent = '案例 B';
    document.getElementById('syncText').textContent = '两列同步滚动';
  }

  async function init() {
    setLabels();
    await Store.init();
    UI.renderSidebar('compare');
    var all = Store.getCases();
    fillSelect('selectA', all);
    fillSelect('selectB', all);

    var qa = UI.getParam('a'), qb = UI.getParam('b');
    if (qa) document.getElementById('selectA').value = qa;
    if (qb) document.getElementById('selectB').value = qb;
    if (all.length >= 2 && !qa && !qb) {
      document.getElementById('selectA').value = all[0].id;
      document.getElementById('selectB').value = all[1].id;
    }

    document.getElementById('selectA').addEventListener('change', render);
    document.getElementById('selectB').addEventListener('change', render);
    document.getElementById('syncScroll').addEventListener('change', render);
    render();
  }

  function fillSelect(id, all) {
    var sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— 请选择 —</option>' + all.map(function (c) {
      return '<option value="' + c.id + '">' + UI.escapeHtml(c.title) + '</option>';
    }).join('');
  }

  function textOrDash(v) { return v && v.content ? UI.escapeHtml(v.content).replace(/\n/g, '<br>') : '—'; }

  async function buildColumn(c) {
    var images = await Promise.all((c.images || []).map(async function (im) {
      var url = await Store.resolveImageURL(im);
      var ann = (im.annotations || []).map(function (a) {
        return '<li class="text-[11.5px] text-ink-500">· ' + UI.escapeHtml(a.text) + '</li>';
      }).join('');
      return '<figure class="mb-3"><img class="w-full rounded-lg border border-[var(--line)]" src="' + url +
        '" alt="' + UI.escapeHtml(im.name) + '" />' + (ann ? '<ul class="mt-1.5">' + ann + '</ul>' : '') + '</figure>';
    }));

    var aiBlocks = AI_LABELS.map(function (pair) {
      var b = c.analysis[pair[0]];
      return '<div data-section="' + pair[0] + '" class="mb-3"><div class="font-semibold text-[12.5px] text-ink-700 mb-1">' + pair[1] + '</div>' +
        '<div class="text-[13px] text-ink-700">' + textOrDash(b) + '</div></div>';
    }).join('');

    return '<div class="card card-pad">' +
      '<div class="flex items-start justify-between gap-2 mb-2">' +
      '<h2 class="font-bold text-[15px] text-ink-900">' + UI.escapeHtml(c.title) + '</h2>' +
      (c.favorite ? '<span class="fav-btn on !relative !top-0 !right-0">' + UI.icon('star') + '</span>' : '') +
      '</div>' +
      '<div class="flex flex-wrap gap-1 mb-3">' +
      c.style_tags.concat(c.business_tags).map(function (t) {
        return '<span class="text-[11px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">' + UI.escapeHtml(t) + '</span>';
      }).join('') + '</div>' +
      '<div class="col-scroll overflow-y-auto pr-1" style="max-height:calc(100vh - 230px)">' +
      images.join('') +
      '<div class="border-t border-[var(--line)] my-3"></div>' +
      aiBlocks +
      '<div class="border-t border-[var(--line)] my-3"></div>' +
      '<div class="mb-3"><div class="font-semibold text-[12.5px] mb-1">适用场景</div><div class="text-[13px] text-ink-700">' +
      textOrDash(c.use_cases) + '</div></div>' +
      '<div class="mb-3"><div class="font-semibold text-[12.5px] mb-1">需要避开的坑</div><div class="text-[13px] text-ink-700">' +
      textOrDash(c.pitfalls.avoid_pitfalls) + '</div></div>' +
      '<div class="mb-1"><div class="font-semibold text-[12.5px] mb-1">禁用场景</div><div class="text-[13px] text-ink-700">' +
      textOrDash(c.pitfalls.forbidden_scenarios) + '</div></div>' +
      '</div>' +
      '<a class="btn btn-ghost btn-sm mt-3 w-full" href="editor.html?id=' + c.id + '">' + UI.icon('edit') + '打开编辑</a>' +
      '</div>';
  }

  async function render() {
    var a = Store.getCase(document.getElementById('selectA').value);
    var b = Store.getCase(document.getElementById('selectB').value);
    var grid = document.getElementById('compareGrid');
    if (!a || !b) {
      grid.innerHTML = '<div class="empty-state col-span-full">' + UI.icon('compare') +
        '<div>请在上方各选择一个案例（共 2 个）进行对比。</div></div>';
      return;
    }
    grid.innerHTML =
      '<div class="compare-col" data-col="a">' + (await buildColumn(a)) + '</div>' +
      '<div class="compare-col" data-col="b">' + (await buildColumn(b)) + '</div>';

    var on = document.getElementById('syncScroll').checked;
    if (on) bindSync();
  }

  function bindSync() {
    var cols = document.querySelectorAll('.col-scroll');
    if (cols.length !== 2) return;
    var c0 = cols[0], c1 = cols[1];
    function link(src, dst) {
      src.addEventListener('scroll', function () {
        if (syncing) return;
        syncing = true;
        var sections = Array.from(src.querySelectorAll('[data-section]'));
        var top = src.getBoundingClientRect().top;
        var current = sections.filter(function(el) { return el.getBoundingClientRect().top <= top + 20; }).pop();
        var target = current && dst.querySelector('[data-section="' + current.dataset.section + '"]');
        if (target) {
          dst.scrollTop += target.getBoundingClientRect().top - dst.getBoundingClientRect().top - (current.getBoundingClientRect().top - top);
        } else {
          var range = src.scrollHeight - src.clientHeight;
          dst.scrollTop = range > 0 ? src.scrollTop / range * (dst.scrollHeight - dst.clientHeight) : 0;
        }
        requestAnimationFrame(function () { syncing = false; });
      });
    }
    link(c0, c1); link(c1, c0);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
