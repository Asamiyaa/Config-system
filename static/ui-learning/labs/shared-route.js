/** Native View Transitions API: selected image + title, real History API, functional fallback. */
(() => {
  'use strict';
  const articles = [
    { id: 'verdant', title: 'Verdant forms', kind: 'art-forest', code: 'FIELD / 001', summary: 'Organic structure in a considered frame.', description: '由一个稳定业务 ID 连接列表封面与详情主视觉。视觉连续性不要求页面自动播放任何内容。' },
    { id: 'earthen', title: 'Earth in form', kind: 'art-clay', code: 'FIELD / 002', summary: 'Material, tactility and rhythm.', description: '封面尺寸改变时仍然是同一个视觉对象，标题同步改变尺度与位置。' },
    { id: 'nocturne', title: 'Quiet nocturne', kind: 'art-night', code: 'FIELD / 003', summary: 'A study in light and absence.', description: '返回保持同一过渡曲线与 400ms 参数，且恢复原来的列表滚动与焦点。' }
  ];
  const view = document.getElementById('view');
  const engine = document.getElementById('engine');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = null;
  let listScrollY = 0;
  let transition = null;
  const urlFor = id => id ? `?item=${encodeURIComponent(id)}` : location.pathname;
  const validId = id => articles.some(a => a.id === id) ? id : null;
  function cover(a, active) {
    return `<span class="card-art ${a.kind}" role="img" aria-label="${a.title} abstract artwork" ${active ? 'style="view-transition-name:cover-active"' : ''}></span>`;
  }
  function title(a, active, heading) {
    return `<${heading} class="shared-title ${heading==='h1' ? 'detail-title' : ''}" ${active ? 'style="view-transition-name:title-active"' : ''}>${a.title}</${heading}>`;
  }
  function render(id, selectedId = id) {
    if (id) {
      const a = articles.find(item => item.id === id);
      view.innerHTML = `<section class="detail" aria-label="${a.title}"><div class="detail-visual">${cover(a,true)}</div><div class="detail-body"><button class="back" id="back" type="button">← 返回作品列表</button><div class="subhead">${a.code} / SELECTED WORK</div>${title(a,true,'h1')}<p class="detail-description">${a.description}</p><div class="detail-facts"><span>SHARED COVER</span><span>SHARED TITLE</span><span>400MS REVERSE</span></div></div></section>`;
      document.getElementById('back').addEventListener('click', () => {
        if (history.state?.creativeDetail) history.back(); else navigate(null);
      });
    } else {
      view.innerHTML = `<div class="view-header"><h1>One identity.<br><em>Two compositions.</em></h1><p>点击任意卡片，观看同一个封面和标题迁移到详情。视觉元素保持身份；非共享内容才允许淡出。</p></div><section class="cards" aria-label="作品列表">${articles.map(a => `<button class="card" type="button" data-item="${a.id}"><span class="cover">${cover(a,selectedId === a.id)}</span><span class="card-text"><span class="card-code">${a.code}</span>${title(a,selectedId === a.id,'h2')}<span class="card-sub">${a.summary}</span></span></button>`).join('')}</section>`;
      for (const button of view.querySelectorAll('[data-item]')) {
        button.addEventListener('click', () => navigate(button.dataset.item));
      }
    }
  }
  function move(to, addHistory = false) {
    if (to === current) return;
    const from = current;
    const returnId = from;
    // Current native transition may be skipped if a new navigation occurs. App state remains correct.
    // Native snapshots cannot guarantee perfect mid-flight reverse in every supported browser.
    if (transition) transition.skipTransition();
    if (!from && to) listScrollY = window.scrollY;
    if (from && !to && addHistory) addHistory = false;
    // Ensure selected cover/title unique in old snapshot.
    if (!from && to) {
      const chosen = view.querySelector(`[data-item="${to}"]`);
      if (chosen) {
        chosen.querySelector('.card-art').style.viewTransitionName = 'cover-active';
        chosen.querySelector('.shared-title').style.viewTransitionName = 'title-active';
      }
    }
    if (addHistory) history.pushState({ creativeDetail: !!to, item: to }, '', urlFor(to));
    const commit = () => {
      current = to;
      render(to, returnId);
      window.scrollTo({ top: to ? 0 : listScrollY, behavior: 'instant' });
    };
    if (!reduce.matches && typeof document.startViewTransition === 'function') {
      transition = document.startViewTransition(commit);
      const captured = transition;
      captured.finished.catch(() => {}).finally(() => {
        if (transition === captured) transition = null;
        finishFocus(to, returnId);
      });
      engine.textContent = '当前引擎：原生 View Transitions API（共享封面 + 标题，400ms）';
    } else {
      commit();
      finishFocus(to, returnId);
      engine.textContent = reduce.matches ? '当前引擎：减少动态效果（即时切换）' : '当前引擎：功能降级（浏览器不支持 View Transitions）';
    }
  }
  function finishFocus(to, returnId) {
    if (current !== to) return; // stale completion from an interrupted transition
    if (to) document.querySelector('.detail-title')?.setAttribute('tabindex', '-1');
    if (to) document.querySelector('.detail-title')?.focus({ preventScroll: true });
    else if (returnId) view.querySelector(`[data-item="${returnId}"]`)?.focus({ preventScroll: true });
  }
  function navigate(to) { move(validId(to), true); }
  const initialId = validId(new URLSearchParams(location.search).get('item'));
  current = initialId;
  if (!history.state) history.replaceState({ creativeDetail: !!initialId, item: initialId }, '', location.href);
  render(initialId);
  engine.textContent = typeof document.startViewTransition === 'function' ? '当前引擎：原生 View Transitions API（就绪）' : '当前引擎：无动画功能降级（就绪）';
  addEventListener('popstate', () => move(validId(new URLSearchParams(location.search).get('item')), false));
})();
