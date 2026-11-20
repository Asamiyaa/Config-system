/* ============================================================
 * savePath.js — 目录授权直写（File System Access API）
 * 仅在 Chromium 系（Chrome/Edge）且为安全上下文时可用。
 * 目录句柄持久化到独立 IndexedDB，刷新后可重新请求授权。
 * 暴露 window.SavePath
 * ============================================================ */
(function () {
  'use strict';

  var SYS_DB = 'uilearn_sys_db';
  var HANDLE_STORE = 'handles';
  var DIR_KEY = 'root_directory';
  var SYS_VERSION = 1;
  var sysDB = null;

  function supported() {
    return typeof window.showDirectoryPicker === 'function' &&
      typeof window.FileSystemHandle === 'function';
  }

  function openSys() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(SYS_DB, SYS_VERSION);
      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains(HANDLE_STORE)) d.createObjectStore(HANDLE_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  async function db() {
    if (!sysDB) sysDB = await openSys();
    return sysDB;
  }
  function idbPut(val, key) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE).put(val, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbGet(key) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(HANDLE_STORE, 'readonly');
        var r = tx.objectStore(HANDLE_STORE).get(key);
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbDel(key) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var tx = d.transaction(HANDLE_STORE, 'readwrite');
        tx.objectStore(HANDLE_STORE)['delete'](key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* 选择并授权目录 */
  async function pickDirectory() {
    if (!supported()) throw new Error('当前浏览器不支持目录直写，请用 Chrome/Edge 或改用下载方式');
    var handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    var perm = await ensurePermission(handle, true);
    if (perm !== 'granted') throw new Error('未获得目录写入授权');
    await idbPut(handle, DIR_KEY);
    return handle;
  }

  async function getStoredHandle() {
    try { return await idbGet(DIR_KEY); } catch (e) { return null; }
  }
  async function clearDirectory() {
    try { await idbDel(DIR_KEY); } catch (e) {}
  }

  /* 权限校验/申请 */
  async function ensurePermission(handle, write) {
    if (!handle) return 'missing';
    var opts = { mode: write ? 'readwrite' : 'read' };
    if (handle.queryPermission) {
      var q = await handle.queryPermission(opts);
      if (q === 'granted') return q;
    }
    if (handle.requestPermission) {
      return await handle.requestPermission(opts);
    }
    return 'unknown';
  }

  /* 按路径写入（pathParts 为目录/文件名数组，最后一项为文件名） */
  async function writeAtPath(root, pathParts, blob) {
    var perm = await ensurePermission(root, true);
    if (perm !== 'granted') throw new Error('目录未授权，请重新选择');
    var dir = root;
    for (var i = 0; i < pathParts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(pathParts[i], { create: true });
    }
    var fh = await dir.getFileHandle(pathParts[pathParts.length - 1], { create: true });
    var writable = await fh.createWritable();
    await writable.write(blob);
    await writable.close();
    return pathParts.join('/');
  }

  /* 写入一个完整案例：cases/<id>.json + images/<id>/<文件名> */
  async function saveCaseToDirectory(root, item, resolveURL) {
    var safe = function (s) {
      return String(s || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
    };
    var written = [];
    await writeAtPath(root, ['cases', safe(item.id) + '.json'],
      new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' }));
    written.push('cases/' + safe(item.id) + '.json');

    if (resolveURL && item.images && item.images.length) {
      for (var i = 0; i < item.images.length; i++) {
        var im = item.images[i];
        if (im.is_seed || im.src) continue; // 内置示例图不重复落盘
        var url = await resolveURL(im);
        if (!url) continue;
        var resp = await fetch(url);
        var blob = await resp.blob();
        var ext = (im.name && im.name.split('.').pop()) || 'png';
        var p = await writeAtPath(root, ['images', safe(item.id), safe(im.name) || (im.id + '.' + ext)], blob);
        written.push(p);
      }
    }
    return written;
  }

  window.SavePath = {
    supported: supported,
    pickDirectory: pickDirectory,
    getStoredHandle: getStoredHandle,
    clearDirectory: clearDirectory,
    ensurePermission: ensurePermission,
    writeAtPath: writeAtPath,
    saveCaseToDirectory: saveCaseToDirectory
  };
})();
