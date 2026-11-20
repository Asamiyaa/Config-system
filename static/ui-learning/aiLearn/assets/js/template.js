/* ============================================================
 * template.js — 提示词模板管理逻辑
 * ============================================================ */
(function () {
  'use strict';

  var bundle = null;
  var editingId = null;

  function setLabels() {
    document.getElementById('tplListTitle').textContent = '模板列表';
    document.getElementById('btnNewTpl').innerHTML = UI.icon('plus') + '新增';
    document.getElementById('editTitle').textContent = '编辑模板';
    document.getElementById('btnSetActive').innerHTML = UI.icon('check') + '设为激活';
    document.getElementById('btnDeleteTpl').innerHTML = UI.icon('trash') + '删除';
    document.getElementById('nameLabel').textContent = '模板名称';
    document.getElementById('typeLabel').textContent = '类型';
    document.getElementById('descLabel').textContent = '说明';
    document.getElementById('systemLabel').textContent = 'System Prompt（AI 解析提示词）';
    document.getElementById('userLabel').textContent = 'User Prompt';
    document.getElementById('btnSaveTpl').innerHTML = UI.icon('save') + '保存模板';
  }

  async function init() {
    setLabels();
    await Store.init();
    UI.renderSidebar('template');
    bundle = await Store.loadTemplates();
    renderList();
    var first = (bundle.templates || [])[0];
    if (first) selectTpl(first.id);
    bindEvents();
  }

  function renderList() {
    var box = document.getElementById('tplList');
    document.getElementById('activeTplName').textContent =
      '当前激活：' + ((bundle.templates || []).find(function (t) { return t.id === bundle.active_template_id; }) || {}).name || '—';
    box.innerHTML = (bundle.templates || []).map(function (t) {
      var active = t.id === bundle.active_template_id;
      return '<button class="w-full text-left px-3 py-2 rounded-lg border transition ' +
        (t.id === editingId ? 'border-brand-500 bg-brand-50' : 'border-[var(--line)] hover:bg-brand-50') +
        '" data-select="' + t.id + '"><div class="flex items-center justify-between gap-2">' +
        '<span class="font-semibold text-[13px] text-ink-900">' + UI.escapeHtml(t.name) + '</span>' +
        '<span class="text-[11px] text-ink-400">' + t.type + '端</span></div>' +
        (active ? '<div class="text-[11px] text-brand-600 mt-0.5">激活中</div>' : '') + '</button>';
    }).join('');
    box.querySelectorAll('[data-select]').forEach(function (b) {
      b.addEventListener('click', function () { selectTpl(b.dataset.select); });
    });
  }

  function selectTpl(id) {
    editingId = id;
    var t = (bundle.templates || []).find(function (x) { return x.id === id; });
    if (!t) return;
    document.getElementById('editName').value = t.name || '';
    document.getElementById('editType').value = t.type || 'B';
    document.getElementById('editDesc').value = t.description || '';
    document.getElementById('editSystem').value = t.system_prompt || '';
    document.getElementById('editUser').value = t.user_prompt || '';
    renderList();
  }

  function bindEvents() {
    document.getElementById('btnNewTpl').addEventListener('click', function () {
      var t = {
        id: Store.uid('tpl'), name: '新模板', type: 'B', is_default: false,
        description: '', system_prompt: '', user_prompt: '',
        created_at: Store.nowISO(), updated_at: Store.nowISO()
      };
      bundle.templates = bundle.templates || [];
      bundle.templates.push(t);
      Store.saveTemplates(bundle);
      renderList(); selectTpl(t.id);
      UI.toast('已新增模板，请编辑后保存');
    });

    document.getElementById('btnSaveTpl').addEventListener('click', function () {
      var t = bundle.templates.find(function (x) { return x.id === editingId; });
      if (!t) { UI.toast('请先选择模板', 'error'); return; }
      t.name = document.getElementById('editName').value.trim() || '未命名模板';
      t.type = document.getElementById('editType').value;
      t.description = document.getElementById('editDesc').value.trim();
      t.system_prompt = document.getElementById('editSystem').value;
      t.user_prompt = document.getElementById('editUser').value;
      t.updated_at = Store.nowISO();
      Store.saveTemplates(bundle);
      renderList();
      UI.toast('模板已保存', 'success');
    });

    document.getElementById('btnDeleteTpl').addEventListener('click', async function () {
      if (bundle.templates.length <= 1) { UI.toast('至少保留一个模板', 'error'); return; }
      var ok = await UI.modal({ title: '删除模板', text: '确认删除当前模板？此操作不可撤销。', okText: '删除' });
      if (!ok) return;
      bundle.templates = bundle.templates.filter(function (x) { return x.id !== editingId; });
      if (bundle.active_template_id === editingId) {
        bundle.active_template_id = bundle.templates[0].id;
      }
      Store.saveTemplates(bundle);
      editingId = bundle.templates[0].id;
      renderList(); selectTpl(editingId);
      UI.toast('已删除模板');
    });

    document.getElementById('btnSetActive').addEventListener('click', function () {
      bundle.active_template_id = editingId;
      Store.saveTemplates(bundle);
      renderList();
      UI.toast('已设为激活模板', 'success');
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
