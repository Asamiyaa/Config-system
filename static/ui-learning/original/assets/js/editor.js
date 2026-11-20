/* ============================================================
 * editor.js — 三栏编辑页逻辑
 * ============================================================ */
(function () {
  'use strict';

  var item = null;
  var tplBundle = null;
  var currentImageId = null;
  var baseline = '', aiUndo = null, aiBusy = false;
  function dirty() { return item && JSON.stringify(item) !== baseline; }
  function updateStatus() {
    document.getElementById('saveStatus').textContent = aiBusy ? 'AI 解析中，请稍候…' : dirty() ? '有未保存的修改' : '已保存 / 无待保存修改';
  }
  async function runAI(key) {
    if (aiBusy) return;
    if (!currentImage()) { UI.toast('请先上传截图', 'error'); return; }
    if ((key ? item.analysis[key].content : AIParser.FIELD_KEYS.some(function(k) { return item.analysis[k].content; })) && !confirm('将替换已有分析内容，可在保存前撤销本次 AI 修改。继续？')) return;
    aiBusy = true; updateStatus();
    document.getElementById('btnParseHere').disabled = true;
    document.getElementById('btnSave').disabled = true;
    document.getElementById('aiFields').inert = true;
    document.getElementById('btnUndoAI').disabled = true;
    try {
      var data = await getCurrentDataURL();
      var previous = Store.clone({ analysis: item.analysis, ai_raw_result: item.ai_raw_result, ai_meta: item.ai_meta });
      var result = key ? await AIParser.regenerate(data, key, tplBundle.active_template_id, item.analysis[key].content) : await AIParser.parse(data, tplBundle.active_template_id);
      (key ? [key] : AIParser.FIELD_KEYS).forEach(function(k) {
        item.analysis[k] = {content: key ? result.content : result.parsed[k] || '', source: 'ai_generated', updated_at: Store.nowISO()};
      });
      item.ai_raw_result = result.raw || '';
      item.ai_meta = {model: result.model, template_id: result.template_id || tplBundle.active_template_id, parsed_at: result.parsed_at};
      aiUndo = previous; renderAIFields();
      UI.toast(result.is_mock ? '演示解析完成，请校对后保存' : '解析完成，请校对后保存', 'success');
    } catch (e) { UI.toast('解析失败：' + e.message, 'error'); }
    finally {
      aiBusy = false;
      document.getElementById('btnParseHere').disabled = false;
      document.getElementById('btnSave').disabled = false;
      document.getElementById('aiFields').inert = false;
      document.getElementById('btnUndoAI').disabled = !aiUndo;
      updateStatus();
    }
  }


  /* ---------- 侧边栏在 init 中渲染 ---------- */

  /* ---------- 静态文案 ---------- */
  function setLabels() {
    document.getElementById('uploadTitle').textContent = '截图上传';
    document.getElementById('uploadIcon').innerHTML = UI.icon('upload');
    document.getElementById('uploadMain').textContent = '点击 / 拖拽 / 粘贴上传截图';
    document.getElementById('uploadSub').textContent = '支持多图，建议上传完整界面截图';
    document.getElementById('pasteHint').textContent = '提示：复制截图后可直接 Ctrl+V 粘贴到本页。';
    document.getElementById('albumTitle').textContent = '图片相册';
    document.getElementById('annotateTitle').textContent = '图片标注';
    document.getElementById('btnAddAnnotation').innerHTML = UI.icon('pin') + '添加标注';
    document.getElementById('aiCollapseBadge').innerHTML = UI.icon('sparkles') + 'AI';
    document.getElementById('humanBadge').innerHTML = UI.icon('edit') + '人工填写区';
    document.getElementById('humanHint').textContent = '以下内容 AI 不会自动生成，需人工校对补充。';
    document.getElementById('useCasesLabel').textContent = '适用场景';
    document.getElementById('pitfallsLabel').textContent = '避坑清单 · 需要避开的坑';
    document.getElementById('forbiddenLabel').textContent = '不适合使用的场景（禁用场景）';
    document.getElementById('versionTitle').textContent = '版本记录';
    document.getElementById('btnSave').innerHTML = UI.icon('save') + '保存归档';
    document.getElementById('btnBack').innerHTML = UI.icon('home') + '返回';
    document.getElementById('tagCardTitle').innerHTML = UI.icon('tag') + '标签';
    document.getElementById('styleTagLabel').textContent = '样式标签';
    document.getElementById('businessTagLabel').textContent = '业务标签';
  }

  /* ---------- 初始化 ---------- */
  async function init() {
    setLabels();
    await Store.init();
    tplBundle = await Store.loadTemplates();

    var id = UI.getParam('id');
    item = Store.clone((id && Store.getCase(id)) || Store.newCase());
    var groupParam = UI.getParam('group');
    if (!id && groupParam) item.group_id = groupParam;
    currentImageId = item.cover_image_id || (item.images[0] && item.images[0].id) || null;

    UI.renderSidebar('editor', item.id);
    renderTitle();
    renderAlbum();
    renderAnnotate();
    renderAIFields();
    renderRight();
    renderVersions();
    bindTagInputs();
    renderTagOptions();
    bindEvents();
    baseline = JSON.stringify(item);
    setInterval(updateStatus, 500);
    window.addEventListener('beforeunload', function(e) { if (dirty() || aiBusy) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('click', function(e) {
      if (e.target.closest('a[href]') && (dirty() || aiBusy) && !confirm('尚有未保存修改或进行中的解析，确定离开？')) e.preventDefault();
    });
    document.getElementById('btnParseHere').onclick = function() { runAI(); };
    document.getElementById('btnUndoAI').onclick = function() {
      if (!aiUndo || !confirm('撤销会恢复解析前的分析内容，包含此后对分析的编辑。继续？')) return;
      Object.assign(item, aiUndo); aiUndo = null; renderAIFields(); this.disabled = true; updateStatus();
    };
  }

  /* ---------- 标签编辑 ---------- */
  function bindTagInputs() {
    UI.bindTagInput(
      document.getElementById('styleTagInput'),
      function () { return item.style_tags; },
      function (t) { item.style_tags = t; renderTagOptions(); }
    );
    UI.bindTagInput(
      document.getElementById('businessTagInput'),
      function () { return item.business_tags; },
      function (t) { item.business_tags = t; renderTagOptions(); }
    );
  }

  /* ---------- 已有标签候选（点选多选 / 取消） ---------- */
  function renderTagOptions() {
    buildOptionGroup('styleTagOptions', 'style_tags');
    buildOptionGroup('businessTagOptions', 'business_tags');
  }

  function buildOptionGroup(containerId, kind) {
    var box = document.getElementById(containerId);
    var known = Store.allTags(kind).slice();
    (item[kind] || []).forEach(function (t) { if (known.indexOf(t) < 0) known.push(t); });
    known.sort();
    if (!known.length) { box.innerHTML = ''; return; }
    box.innerHTML = known.map(function (t) {
      var isSel = (item[kind] || []).indexOf(t) >= 0;
      return '<button type="button" class="tag-option ' + (isSel ? 'selected' : '') +
        '" data-tag-option="' + UI.escapeHtml(t) + '">' + UI.escapeHtml(t) + '</button>';
    }).join('');
    box.querySelectorAll('[data-tag-option]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.tagOption;
        var list = (item[kind] || []).slice();
        var pos = list.indexOf(t);
        if (pos >= 0) list.splice(pos, 1); else list.push(t);
        item[kind] = list;
        syncTagInput(kind);
        renderTagOptions();
      });
    });
  }

  /* 同步 tag-input 内已选 chip（x 删除仍由 bindTagInput 委托处理） */
  function syncTagInput(kind) {
    var container = document.getElementById(kind === 'style_tags' ? 'styleTagInput' : 'businessTagInput');
    container.querySelectorAll('.tag-chip').forEach(function (n) { n.remove(); });
    (item[kind] || []).forEach(function (t) {
      var chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = UI.escapeHtml(t) + '<button type="button" data-tag="' + UI.escapeHtml(t) + '">' + UI.icon('x') + '</button>';
      container.insertBefore(chip, container.querySelector('input'));
    });
  }

  function currentImage() {
    return (item.images || []).find(function (im) { return im.id === currentImageId; }) ||
      item.images[0] || null;
  }

  function renderTitle() { document.getElementById('caseTitle').value = item.title; }

  /* ---------- 相册 ---------- */
  async function renderAlbum() {
    var box = document.getElementById('album');
    if (!item.images.length) {
      box.innerHTML = '<div class="col-span-3 empty-state !p-6">暂无图片</div>';
      return;
    }
    var cards = await Promise.all(item.images.map(async function (im) {
      var url = await Store.resolveImageURL(im);
      return '<div class="thumb ' + (im.id === currentImageId ? 'selected' : '') + '" data-pick="' + im.id + '">' +
        '<img src="' + url + '" alt="' + UI.escapeHtml(im.name) + '" /></div>';
    }));
    box.innerHTML = cards.join('');
    box.querySelectorAll('[data-pick]').forEach(function (el) {
      el.addEventListener('click', function () {
        currentImageId = el.dataset.pick;
        renderAlbum(); renderAnnotate();
      });
    });
  }

  /* ---------- 标注 ---------- */
  async function renderAnnotate() {
    var im = currentImage();
    var img = document.getElementById('annotateImg');
    var layer = document.getElementById('annotationLayer');
    if (!im) {
      img.style.display = 'none';
      layer.innerHTML = '<div class="empty-state">上传图片后即可标注</div>';
      document.getElementById('annotationList').innerHTML = '';
      return;
    }
    img.style.display = 'block';
    img.src = await Store.resolveImageURL(im);
    var markers = (im.annotations || []).map(function (a, i) {
      return '<div class="annotation-marker" style="left:' + a.x + '%;top:' + a.y + '%;background:' +
        (a.color || '#3b6ea5') + '" data-label="' + UI.escapeHtml(a.text) + '" data-ann-idx="' + i + '"></div>';
    }).join('');
    layer.innerHTML = markers;
    renderAnnotationList(im);
  }

  function renderAnnotationList(im) {
    var box = document.getElementById('annotationList');
    if (!im.annotations || !im.annotations.length) { box.innerHTML = '<div class="text-ink-400 text-[12px]">暂无标注</div>'; return; }
    box.innerHTML = im.annotations.map(function (a, i) {
      return '<div class="flex items-center justify-between gap-2"><span class="flex items-center gap-2 text-ink-700">' +
        '<span class="w-2.5 h-2.5 rounded-full" style="background:' + (a.color || '#3b6ea5') + '"></span>' +
        UI.escapeHtml(a.text) + '</span><button class="btn btn-ghost btn-sm" data-del-ann="' + i + '">' +
        UI.icon('trash') + '</button></div>';
    }).join('');
    box.querySelectorAll('[data-del-ann]').forEach(function (b) {
      b.addEventListener('click', function () {
        im.annotations.splice(Number(b.dataset.delAnn), 1);
        renderAnnotate();
      });
    });
  }

  /* ---------- AI 五块 ---------- */
  function sourceBadge(source) {
    if (source === 'ai_generated') return '<span class="ai-badge">' + UI.icon('sparkles') + 'AI预生成</span>';
    if (source === 'human_modified') return '<span class="ai-badge" style="color:#a07a35">' + UI.icon('edit') + '人工修改</span>';
    return '<span class="ai-badge" style="color:var(--ink-500)">' + UI.icon('edit') + '人工</span>';
  }

  function renderAIFields() {
    var box = document.getElementById('aiFields');
    box.innerHTML = AIParser.FIELD_KEYS.map(function (k) {
      var b = item.analysis[k];
      var wrapCls = b.source === 'ai_generated' ? 'ai-block'
        : b.source === 'human_modified' ? 'ai-block source-modified' : 'ai-block source-human';
      return '<div class="' + wrapCls + '">' +
        '<div class="flex items-center justify-between gap-2 mb-2 flex-wrap">' +
        '<div class="flex items-center gap-2"><span class="font-bold text-[13px]">' + AIParser.FIELD_LABELS[k] + '</span>' +
        sourceBadge(b.source) + '</div>' +
        '<button class="btn btn-quiet btn-sm" data-regen="' + k + '">' + UI.icon('refresh') + '局部重生成</button>' +
        '</div>' +
        '<textarea data-field="' + k + '" class="textarea !bg-white/70">' + UI.escapeHtml(b.content) + '</textarea>' +
        '</div>';
    }).join('');

    box.querySelectorAll('[data-field]').forEach(function (ta) {
      ta.addEventListener('input', function () {
        var b = item.analysis[ta.dataset.field];
        b.content = ta.value;
        if (b.source === 'ai_generated') b.source = 'human_modified';
        b.updated_at = Store.nowISO();
      });
    });
    box.querySelectorAll('[data-regen]').forEach(function (btn) {
      btn.addEventListener('click', function () { doRegenerate(btn.dataset.regen); });
    });
  }

  /* ---------- 右栏人工 ---------- */
  function renderRight() {
    document.getElementById('useCases').value = item.use_cases.content || '';
    document.getElementById('avoidPitfalls').value = item.pitfalls.avoid_pitfalls.content || '';
    document.getElementById('forbiddenScenarios').value = item.pitfalls.forbidden_scenarios.content || '';
  }

  function renderVersions() {
    var box = document.getElementById('versionList');
    if (!item.versions.length) { box.innerHTML = '<div class="text-ink-400">暂无版本，点击“保存归档”生成。</div>'; return; }
    box.innerHTML = item.versions.map(function (v) {
      return '<div class="flex items-center justify-between"><span>v' + v.version + ' · ' + UI.fmtDate(v.saved_at) +
        (v.note ? ' · ' + UI.escapeHtml(v.note) : '') + '</span></div>';
    }).join('');
  }

  /* ---------- 图片上传 ---------- */
  async function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!files.length) return;
    for (var i = 0; i < files.length; i++) {
      var im = await Store.addImageFile(item, files[i]);
      if (i === 0) currentImageId = im.id;
    }
    renderAlbum(); renderAnnotate();
    UI.toast('已添加 ' + files.length + ' 张图片', 'success');
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  async function getCurrentDataURL() {
    var im = currentImage();
    if (!im) return null;
    if (im.data_url) return im.data_url;
    if (im.blob_id) {
      var blob = await idbBlob(im.blob_id);
      if (blob) return blobToDataURL(blob);
    }
    if (im.src) {
      try {
        var resp = await fetch(im.src);
        var b = await resp.blob();
        return blobToDataURL(b);
      } catch (e) {
        throw new Error('示例图无法转换，请先上传真实截图');
      }
    }
    return null;
  }
  function idbBlob(key) {
    return new Promise(function (resolve) {
      var req = indexedDB.open('uilearn_db');
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction('images', 'readonly');
        var g = tx.objectStore('images').get(key);
        g.onsuccess = function () { resolve(g.result); };
        g.onerror = function () { resolve(null); };
      };
      req.onerror = function () { resolve(null); };
    });
  }

  /* ---------- 局部重生成 ---------- */
  async function doRegenerate(key) { return runAI(key); }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    var zone = document.getElementById('uploadZone');
    var input = document.getElementById('fileInput');
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
    input.addEventListener('change', function () { handleFiles(input.files); input.value = ''; });

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('dragging'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('dragging'); });
    });
    zone.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    });

    document.addEventListener('paste', function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      var files = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) files.push(items[i].getAsFile());
      }
      if (files.length) handleFiles(files);
    });

    document.getElementById('btnAddAnnotation').addEventListener('click', function () {
      UI.toast('请在图片上点击要标注的位置', 'info');
      document.getElementById('annotationLayer').classList.add('armed');
    });

    document.getElementById('annotationLayer').addEventListener('click', function (e) {
      var im = currentImage();
      if (!im) return;
      var rect = e.currentTarget.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width * 100;
      var y = (e.clientY - rect.top) / rect.height * 100;
      UI.modal({
        title: '添加图片标注',
        html: '<input id="__annText" class="input" placeholder="标注内容，如：顶部筛选区" />',
        okText: '添加'
      }).then(function (ok) {
        if (!ok) return;
        var text = document.getElementById('__annText').value.trim();
        if (!text) return;
        im.annotations = im.annotations || [];
        im.annotations.push({
          id: Store.uid('ann'), x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10, text: text, color: '#3b6ea5'
        });
        renderAnnotate();
      });
    });

    document.getElementById('caseTitle').addEventListener('input', function (e) { item.title = e.target.value; });

    document.getElementById('useCases').addEventListener('input', function (e) {
      item.use_cases.content = e.target.value; item.use_cases.source = 'human';
    });
    document.getElementById('avoidPitfalls').addEventListener('input', function (e) {
      item.pitfalls.avoid_pitfalls.content = e.target.value; item.pitfalls.avoid_pitfalls.source = 'human';
    });
    document.getElementById('forbiddenScenarios').addEventListener('input', function (e) {
      item.pitfalls.forbidden_scenarios.content = e.target.value; item.pitfalls.forbidden_scenarios.source = 'human';
    });

    document.getElementById('btnBack').addEventListener('click', function () {
      if ((dirty() || aiBusy) && !confirm('修改尚未保存，确定返回？')) return;
      if (item.id && Store.getCase(item.id)) location.href = 'view.html?id=' + item.id;
      else location.href = 'index.html';
    });
    document.getElementById('btnSave').addEventListener('click', function () {
      var saved = Store.clone(item);
      try { Store.recordVersion(saved, '手动保存归档'); Store.saveCase(Store.clone(saved)); }
      catch (e) { UI.toast('保存失败：' + e.message, 'error'); return; }
      item = saved; baseline = JSON.stringify(item); aiUndo = null;
      document.getElementById('btnUndoAI').disabled = true; updateStatus();
      renderVersions();
      UI.renderSidebar('editor', item.id);
      UI.toast('已保存归档', 'success');
    });

    /* 图片双击灯箱 */
    document.getElementById('annotateImg').addEventListener('dblclick', function () {
      if (this.src) UI.openLightbox(this.src);
    });
    document.getElementById('album').addEventListener('dblclick', function (e) {
      var t = e.target.closest('[data-pick]');
      if (!t) return;
      var im = (item.images || []).find(function (x) { return x.id === t.dataset.pick; });
      if (im) Store.resolveImageURL(im).then(function (u) { if (u) UI.openLightbox(u); });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
