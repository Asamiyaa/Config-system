/* ============================================================
 * settings.js — 设置页：AI 接入 + AI 解析触发 + 保存路径
 * ============================================================ */
(function () {
  'use strict';

  var tplBundle = null;

  function setLabels() {
    document.getElementById('cfgTitle').textContent = 'AI 视觉接入配置';
    document.getElementById('cfgHint').textContent = 'AI 解析读取这里的配置调用多模态模型；密钥仅存本机浏览器，不会写入文件。';
    document.getElementById('endpointLabel').textContent = '接口地址（OpenAI 兼容 chat/completions）';
    document.getElementById('modelLabel').textContent = '模型 ID';
    document.getElementById('keyLabel').textContent = 'API Key';
    document.getElementById('mockText').textContent = '演示模式（不发真实请求，返回模拟解析）';
    document.getElementById('btnSaveConfig').innerHTML = UI.icon('save') + '保存接入配置';

    document.getElementById('runTitle').textContent = '对案例执行 AI 解析';
    document.getElementById('runHint').textContent = '编辑页不再显示解析按钮，统一在此触发；AI 只生成 5 个字段，场景与避坑仍需人工补充。';
    document.getElementById('runCaseLabel').textContent = '选择案例';
    document.getElementById('runModeLabel').textContent = '写入方式';
    document.getElementById('btnRunParse').innerHTML = UI.icon('sparkles') + '执行 AI 解析';

    document.getElementById('pathTitle').textContent = '内容保存路径（目录授权直写）';
    document.getElementById('pathHint').textContent = '授权一个本地文件夹后，可把案例 JSON 与图片直接写入该目录（需 Chrome/Edge）。';
    document.getElementById('btnPickDir').innerHTML = UI.icon('folder_open') + '选择并授权目录';
    document.getElementById('btnExportAllToDir').innerHTML = UI.icon('save') + '导出全部案例到目录';
    document.getElementById('btnTestWrite').innerHTML = UI.icon('edit') + '写入测试文件';
    document.getElementById('btnClearDir').innerHTML = UI.icon('trash') + '清除目录';
  }

  async function init() {
    setLabels();
    await Store.init();
    UI.renderSidebar('settings');
    tplBundle = await Store.loadTemplates();
    renderConfig();
    renderCaseSelect();
    renderPathSupport();
    await refreshPathStatus();
    bindEvents();
  }

  function effectiveConfig() {
    var local = Store.getAIConfig();
    return local ? Object.assign({}, tplBundle.ai_config || {}, local) : Object.assign({}, tplBundle.ai_config || {});
  }

  function renderConfig() {
    var cfg = effectiveConfig();
    document.getElementById('aiEndpoint').value = cfg.endpoint || '';
    document.getElementById('aiModel').value = cfg.model || '';
    document.getElementById('aiKey').value = cfg.api_key || '';
    document.getElementById('mockMode').checked = cfg.mock_mode !== false;
  }

  function renderCaseSelect() {
    var sel = document.getElementById('runCase');
    var cases = Store.getCases();
    sel.innerHTML = cases.map(function (c) {
      return '<option value="' + c.id + '">' + UI.escapeHtml(c.title || c.id) + '</option>';
    }).join('') || '<option value="">（暂无案例）</option>';
  }

  /* ---------- AI 解析 ---------- */
  async function getImageDataURL(item) {
    var im = (item.images || []).find(function (x) { return x.id === item.cover_image_id; }) || (item.images || [])[0];
    if (!im) return null;
    var url = await Store.resolveImageURL(im);
    if (!url) return null;
    var resp = await fetch(url);
    var blob = await resp.blob();
    return await Store.fileToDataURL(new File([blob], im.name || 'shot.png'));
  }

  async function runParse() {
    var caseId = document.getElementById('runCase').value;
    var item = caseId && Store.getCase(caseId);
    if (!item) { UI.toast('请先选择案例', 'error'); return; }
    if (!(item.images || []).length) { UI.toast('该案例还没有截图，请先上传', 'error'); return; }

    var btn = document.getElementById('btnRunParse');
    btn.disabled = true;
    var old = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>解析中…';
    try {
      var tpl = (tplBundle.templates || []).find(function (t) { return t.id === tplBundle.active_template_id; }) ||
        (tplBundle.templates || [])[0];
      var dataURL = await getImageDataURL(item);
      if (!dataURL) { UI.toast('图片读取失败，请确认是真实上传的截图', 'error'); return; }

      var result = await AIParser.parse(dataURL, tpl.id);
      var mode = document.getElementById('runMode').value;
      AIParser.FIELD_KEYS.forEach(function (key) {
        var newText = result.parsed[key] || '';
        var block = item.analysis[key];
        block.content = (mode === 'append' && block.content) ? block.content + '\n' + newText : newText;
        block.source = 'ai_generated';
        block.updated_at = Store.nowISO();
      });
      item.ai_raw_result = result.raw;
      item.ai_meta = {
        model: result.model,
        template_id: result.template_id,
        parsed_at: result.parsed_at,
        static_note: result.static_note
      };
      Store.saveCase(item);
      UI.toast('AI 解析完成，已写入 5 个字段', 'success');
    } catch (e) {
      UI.toast('解析失败：' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  }

  /* ---------- 保存路径 ---------- */
  function renderPathSupport() {
    var box = document.getElementById('pathSupport');
    if (SavePath.supported()) {
      box.innerHTML = '<span style="color:var(--good)">当前浏览器支持目录直写。</span>';
    } else {
      box.innerHTML = '<span style="color:var(--bad)">当前浏览器不支持目录直写，请改用 Chrome/Edge；其余功能不受影响。</span>';
    }
  }

  async function refreshPathStatus() {
    var box = document.getElementById('pathStatus');
    var handle = await SavePath.getStoredHandle();
    if (!handle) { box.textContent = '尚未授权目录。'; return; }
    var perm = await SavePath.ensurePermission(handle, false);
    box.innerHTML = '已授权目录：<b>' + UI.escapeHtml(handle.name) + '</b> · 权限状态：' +
      (perm === 'granted' ? '已授权' : '需重新授权（点“选择并授权目录”）');
  }

  async function pickDir() {
    try {
      await SavePath.pickDirectory();
      await refreshPathStatus();
      UI.toast('目录授权成功', 'success');
    } catch (e) {
      if (e.name === 'AbortError') return;
      UI.toast(e.message, 'error');
    }
  }

  async function testWrite() {
    var handle = await SavePath.getStoredHandle();
    if (!handle) { UI.toast('请先选择并授权目录', 'error'); return; }
    try {
      var ts = new Date().toLocaleString();
      var p = await SavePath.writeAtPath(handle, ['uilearn_test.txt'],
        new Blob(['UI案例学习 写入测试 ' + ts], { type: 'text/plain' }));
      UI.toast('测试文件已写入：' + p, 'success');
    } catch (e) { UI.toast('写入失败：' + e.message, 'error'); }
  }

  async function clearDir() {
    await SavePath.clearDirectory();
    await refreshPathStatus();
    UI.toast('已清除目录授权');
  }

  async function exportAllToDir() {
    var handle = await SavePath.getStoredHandle();
    if (!handle) { UI.toast('请先选择并授权目录', 'error'); return; }
    var perm = await SavePath.ensurePermission(handle, true);
    if (perm !== 'granted') { UI.toast('目录未授权，请重新选择', 'error'); return; }
    var btn = document.getElementById('btnExportAllToDir');
    btn.disabled = true;
    var total = 0;
    try {
      var list = Store.getCases();
      for (var i = 0; i < list.length; i++) {
        var written = await SavePath.saveCaseToDirectory(handle, list[i], Store.resolveImageURL);
        total += written.length;
      }
      UI.toast('已写入 ' + list.length + ' 个案例，共 ' + total + ' 个文件', 'success');
    } catch (e) {
      UI.toast('导出失败：' + e.message, 'error');
    } finally { btn.disabled = false; }
  }

  function bindEvents() {
    document.getElementById('btnSaveConfig').addEventListener('click', function () {
      Store.saveAIConfig({
        endpoint: document.getElementById('aiEndpoint').value.trim(),
        model: document.getElementById('aiModel').value.trim(),
        api_key: document.getElementById('aiKey').value.trim(),
        mock_mode: document.getElementById('mockMode').checked
      });
      UI.toast('接入配置已保存（仅本机）', 'success');
    });
    document.getElementById('btnRunParse').addEventListener('click', runParse);
    document.getElementById('btnPickDir').addEventListener('click', pickDir);
    document.getElementById('btnTestWrite').addEventListener('click', testWrite);
    document.getElementById('btnClearDir').addEventListener('click', clearDir);
    document.getElementById('btnExportAllToDir').addEventListener('click', exportAllToDir);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
