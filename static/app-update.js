/* Shared by Android WebView and browsers. Never refresh an unsaved editor. */
(() => {
  let loaded = document.querySelector('meta[name="app-version"]')?.content;
  let checking = false, pending = false, reloading = false;
  const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  function busy() {
    return document.hidden || window.boardEditorDirty ||
      (typeof unsavedChanges !== 'undefined' && unsavedChanges) ||
      (typeof boardStroke !== 'undefined' && boardStroke) ||
      [...document.querySelectorAll('input:focus,textarea:focus,[contenteditable="true"]:focus,[role="dialog"],.flow-modal')].some(visible) ||
      document.activeElement?.tagName === 'IFRAME';
  }
  function apply() {
    if (!pending || reloading || busy()) return;
    reloading = true;
    const url = new URL(location.href);
    url.searchParams.set('_release', pending);
    location.replace(url.href);
  }
  async function check() {
    if (checking || document.hidden || reloading) return;
    checking = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('/api/app-version', {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('Version unavailable');
      const {version} = await response.json();
      if (typeof version !== 'string' || !version) return;
      // Static preview pages have no server-injected version; production always does.
      if (!loaded) loaded = version;
      if (version !== loaded) pending = version;
      apply();
    } catch (_) { /* Offline/startup failure is retried on the next event or timer. */ }
    finally { clearTimeout(timeout); checking = false; }
  }
  window.XindengUpdate = {check};
  setInterval(check, 60000);
  setInterval(apply, 3000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  window.addEventListener('xindeng-resume', check);
  check();
})();
