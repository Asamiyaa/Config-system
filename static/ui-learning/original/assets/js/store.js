/* ============================================================
 * store.js — 本地持久化层
 * 纯静态(file://)方案：
 *   - 案例 JSON：localStorage（运行时主存储）
 *   - 上传图片 Blob：IndexedDB（避免 base64 撑爆 localStorage）
 *   - data/cases.json：初始种子 / 导入导出标准格式
 *   - seed.js：内联种子，file:// 下 fetch 失败时兜底
 * 对外暴露 window.Store
 * ============================================================ */
(function () {
  'use strict';

  var LS_CASES = 'uilearn_cases_v1';
  var LS_TPL = 'uilearn_templates_v1';
  var LS_CFG = 'uilearn_ai_config_v1';
  var LS_GROUPS = 'uilearn_groups_v1';
  var DEFAULT_GROUP_ID = 'grp_default';
  var DB_NAME = 'uilearn_db';
  var DB_STORE = 'images';
  var DB_VERSION = 1;

  var cases = [];
  var db = null;
  var urlCache = {};

  /* ---------- 基础工具 ---------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function nowISO() { return new Date().toISOString(); }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbPut(key, blob) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  function idbGet(key) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readonly');
      var r = tx.objectStore(DB_STORE).get(key);
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function idbDel(key) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE)['delete'](key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  /* ---------- 初始化与种子 ---------- */
  async function init() {
    try { db = await openDB(); } catch (e) { console.warn('IndexedDB 不可用，上传图片将仅在本次会话有效', e); }

    var raw = null;
    try { raw = localStorage.getItem(LS_CASES); } catch (e) { /* 隐私模式等 */ }

    if (raw) {
      try { cases = JSON.parse(raw).cases || []; }
      catch (e) { cases = []; }
    } else {
      // 优先尝试外部文件（http 或允许 file fetch 的环境）
      var seeded = false;
      try {
        var resp = await fetch('data/cases.json', { cache: 'no-store' });
        if (resp.ok) {
          var json = await resp.json();
          if (json && json.cases) { cases = json.cases; seeded = true; }
        }
      } catch (e) { /* file:// 下 fetch 被拦截，走内联种子 */ }
      // 兜底：内联种子
      if (!seeded && window.SEED_DATA && window.SEED_DATA.cases) {
        cases = clone(window.SEED_DATA.cases);
      }
      persist();
    }
    migrateGroups();
    return cases;
  }

  /* ---------- 分组（group） ---------- */
  function migrateGroups() {
    var changed = false;
    cases.forEach(function (c) {
      if (!c.group_id) { c.group_id = DEFAULT_GROUP_ID; changed = true; }
    });
    var raw = null;
    try { raw = localStorage.getItem(LS_GROUPS); } catch (e) {}
    if (!raw) persistGroups([{ id: DEFAULT_GROUP_ID, name: '默认分组' }]);
    if (changed) persist();
  }

  function getGroups() {
    var list = [];
    var raw = null;
    try { raw = localStorage.getItem(LS_GROUPS); } catch (e) {}
    if (raw) { try { list = JSON.parse(raw); } catch (e) {} }
    if (!list.length) list = [{ id: DEFAULT_GROUP_ID, name: '默认分组' }];
    if (!list.some(function (g) { return g.id === DEFAULT_GROUP_ID; })) {
      list.unshift({ id: DEFAULT_GROUP_ID, name: '默认分组' });
    }
    return list;
  }

  function persistGroups(list) {
    try { localStorage.setItem(LS_GROUPS, JSON.stringify(list)); }
    catch (e) { console.error('写入分组失败', e); throw e; }
  }

  function addGroup(name) {
    var list = getGroups();
    var g = { id: uid('grp'), name: (name || '').trim() || ('新分组 ' + (list.length + 1)) };
    list.push(g); persistGroups(list); return g;
  }

  function renameGroup(id, name) {
    var list = getGroups();
    var g = list.find(function (x) { return x.id === id; });
    if (g && name) { g.name = name.trim(); persistGroups(list); }
    return g;
  }

  function deleteGroup(id) {
    if (id === DEFAULT_GROUP_ID) throw new Error('默认分组不可删除');
    var list = getGroups();
    if (!list.some(function (g) { return g.id === id; })) return;
    cases.forEach(function (c) { if (c.group_id === id) c.group_id = DEFAULT_GROUP_ID; });
    persistGroups(list.filter(function (g) { return g.id !== id; }));
    persist();
  }

  // 把案例移动到目标分组，放在 beforeCaseId 之前；beforeCaseId 为空表示放到该组末尾
  function moveCaseTo(caseId, targetGroupId, beforeCaseId) {
    var moving = getCase(caseId);
    if (!moving) return;
    moving.group_id = targetGroupId;
    var oldIdx = cases.findIndex(function (c) { return c.id === caseId; });
    cases.splice(oldIdx, 1);
    var insertAt;
    if (beforeCaseId) {
      insertAt = cases.findIndex(function (c) { return c.id === beforeCaseId; });
      if (insertAt < 0) insertAt = cases.length;
    } else {
      var last = -1;
      for (var i = 0; i < cases.length; i++) {
        if (cases[i].group_id === targetGroupId) last = i;
      }
      insertAt = last >= 0 ? last + 1 : cases.length;
    }
    cases.splice(insertAt, 0, moving);
    persist();
  }

  function persist() {
    try { localStorage.setItem(LS_CASES, JSON.stringify({ meta: { exported_at: nowISO() }, cases: cases })); }
    catch (e) { console.error('写入 localStorage 失败', e); throw e; }
  }

  /* ---------- 案例 CRUD ---------- */
  function getCases() { return cases; }
  function getCase(id) { return cases.find(function (c) { return c.id === id; }) || null; }

  function saveCase(item) {
    item.updated_at = nowISO();
    var idx = cases.findIndex(function (c) { return c.id === item.id; });
    var previous = cases.slice();
    if (idx >= 0) cases[idx] = item; else cases.push(item);
    try { persist(); } catch (e) { cases = previous; throw e; }
    return item;
  }

  function recordVersion(item, note) {
    var ver = (item.versions && item.versions.length ? item.versions.length : 0) + 1;
    item.versions = item.versions || [];
    item.versions.push({ version: ver, saved_at: nowISO(), note: note || '', snapshot: Object.assign(clone(item), { versions: [] }) });
    return item;
  }

  function deleteCase(id) {
    var item = getCase(id);
    if (item && item.images) {
      item.images.forEach(function (im) {
        if (!im.is_seed && im.blob_id) { idbDel(im.blob_id)['catch'](function () {}); }
      });
    }
    cases = cases.filter(function (c) { return c.id !== id; });
    persist();
  }

  function toggleFavorite(id) {
    var item = getCase(id);
    if (item) { item.favorite = !item.favorite; persist(); }
    return item;
  }

  /* ---------- 图片 ---------- */
  async function addImageFile(item, file) {
    var imageId = uid('img');
    var image = { id: imageId, name: file.name, is_seed: false, blob_id: imageId, annotations: [] };
    if (db) {
      await idbPut(imageId, file);
    } else {
      // 无 IndexedDB 时退化为 data url（本次会话）
      image.data_url = await fileToDataURL(file);
    }
    item.images = item.images || [];
    item.images.push(image);
    if (!item.cover_image_id) item.cover_image_id = imageId;
    return image;
  }

  async function resolveImageURL(image) {
    if (!image) return '';
    if (image.is_seed || image.src) return image.src;
    if (image.data_url) return image.data_url;
    if (urlCache[image.blob_id]) return urlCache[image.blob_id];
    var blob = await idbGet(image.blob_id);
    if (!blob) return '';
    var u = URL.createObjectURL(blob);
    urlCache[image.blob_id] = u;
    return u;
  }

  function fileToDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  async function fileToDataURLPublic(file) { return fileToDataURL(file); }

  function removeImage(item, imageId) {
    var im = (item.images || []).find(function (x) { return x.id === imageId; });
    if (im && !im.is_seed && im.blob_id && db) { idbDel(im.blob_id)['catch'](function () {}); }
    item.images = item.images.filter(function (x) { return x.id !== imageId; });
    if (item.cover_image_id === imageId) {
      item.cover_image_id = item.images.length ? item.images[0].id : null;
    }
  }

  /* ---------- 空结构工厂 ---------- */
  function emptyBlock() { return { content: '', source: 'human', updated_at: nowISO() }; }

  function newCase() {
    var c = {
      id: uid('case'),
      title: '未命名案例',
      cover_image_id: null,
      images: [],
      style_tags: [],
      business_tags: [],
      favorite: false,
      group_id: DEFAULT_GROUP_ID,
      analysis: {
        layout_structure: emptyBlock(),
        visual_style: emptyBlock(),
        interaction: emptyBlock(),
        color_mood: emptyBlock(),
        layout_strengths: emptyBlock()
      },
      use_cases: emptyBlock(),
      pitfalls: { avoid_pitfalls: emptyBlock(), forbidden_scenarios: emptyBlock() },
      ai_raw_result: '',
      ai_meta: null,
      versions: [],
      created_at: nowISO(),
      updated_at: nowISO()
    };
    return c;
  }

  /* ---------- 模板 ---------- */
  async function loadTemplates() {
    var raw = null;
    try { raw = localStorage.getItem(LS_TPL); } catch (e) {}
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    try {
      var resp = await fetch('data/promptTemplates.json', { cache: 'no-store' });
      if (resp.ok) {
        var t = await resp.json();
        saveTemplates(t);
        return t;
      }
    } catch (e) {}
    if (window.SEED_TEMPLATES) {
      saveTemplates(window.SEED_TEMPLATES);
      return clone(window.SEED_TEMPLATES);
    }
    return { templates: [], active_template_id: null, ai_config: {} };
  }
  function saveTemplates(tpl) {
    try { localStorage.setItem(LS_TPL, JSON.stringify(tpl)); } catch (e) { console.error(e); }
  }
  function getAIConfig() {
    try {
      var raw = localStorage.getItem(LS_CFG);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }
  function saveAIConfig(cfg) {
    try { localStorage.setItem(LS_CFG, JSON.stringify(cfg)); } catch (e) { console.error(e); }
  }

  /* ---------- 导入 / 导出 ---------- */
  function exportAllJSON() {
    var payload = { meta: { version: '1.0', exported_at: nowISO() }, cases: cases };
    downloadText('cases.json', JSON.stringify(payload, null, 2), 'application/json');
  }
  function exportFile(name, text, mime) { downloadText(name, text, mime); }

  function importJSONFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          var list = data.cases || (Array.isArray(data) ? data : []);
          var added = 0;
          list.forEach(function (inc) {
            if (!inc.id) inc.id = uid('case');
            var idx = cases.findIndex(function (c) { return c.id === inc.id; });
            if (idx >= 0) { inc.id = uid('case'); cases.push(inc); } else { cases.push(inc); }
            added++;
          });
          persist();
          resolve(added);
        } catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsText(file, 'utf-8');
    });
  }

  function downloadText(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 200);
  }

  /* ---------- 标签聚合 ---------- */
  function allTags(kind) {
    var map = {};
    cases.forEach(function (c) {
      (c[kind] || []).forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).sort();
  }

  window.Store = {
    init: init,
    uid: uid,
    nowISO: nowISO,
    clone: clone,
    getCases: getCases,
    getCase: getCase,
    saveCase: saveCase,
    recordVersion: recordVersion,
    deleteCase: deleteCase,
    toggleFavorite: toggleFavorite,
    newCase: newCase,
    emptyBlock: emptyBlock,
    addImageFile: addImageFile,
    removeImage: removeImage,
    resolveImageURL: resolveImageURL,
    fileToDataURL: fileToDataURLPublic,
    loadTemplates: loadTemplates,
    saveTemplates: saveTemplates,
    getAIConfig: getAIConfig,
    saveAIConfig: saveAIConfig,
    exportAllJSON: exportAllJSON,
    exportFile: exportFile,
    importJSONFile: importJSONFile,
    downloadText: downloadText,
    allTags: allTags,
    DEFAULT_GROUP_ID: DEFAULT_GROUP_ID,
    getGroups: getGroups,
    addGroup: addGroup,
    renameGroup: renameGroup,
    deleteGroup: deleteGroup,
    moveCaseTo: moveCaseTo
  };
})();
