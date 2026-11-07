/* Spatial interactions: DOM-only enhancement, no business state. */
(() => {
  'use strict';
  document.body.classList.add('spatial-ui');
  const root = document.querySelector('#viewRoot');
  const shell = document.querySelector('#appShell');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dock = document.createElement('nav');
  dock.className = 'spatial-dock';
  dock.setAttribute('aria-label', '底部主导航');
  const destinations = [['newconfig','成长','compass'],['dashboard','资产','shield'],['health','健康','heart'],['settings','设置','sun'],['archive','归档','archive']];
  dock.innerHTML = destinations.map(([page,label,icon]) => `<button type="button" data-spatial-page="${page}" aria-label="${label}"><svg aria-hidden="true"><use href="#i-${icon}"></use></svg><span>${label}</span></button>`).join('');
  shell.append(dock);
  dock.addEventListener('click', e => {
    const button = e.target.closest('[data-spatial-page]');
    if (!button) return;
    document.querySelector(`#mainNav [data-page="${button.dataset.spatialPage}"]`)?.click();
    window.scrollTo({top:0, behavior:reduced.matches?'instant':'smooth'});
  });
  let previousPage;
  function sync() {
    const page = root.dataset.hub || root.dataset.page || 'home';
    dock.querySelectorAll('button').forEach(button => {
      const active = button.dataset.spatialPage === page;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    if (previousPage !== root.dataset.page) {
      previousPage = root.dataset.page;
      if (!reduced.matches && !document.startViewTransition) root.animate([{opacity:.4,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
  }
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-page','data-hub']});
  sync();
  const visibleObjects = new IntersectionObserver(entries => {
    entries.forEach(entry=>entry.target.classList.toggle('motion-paused', !entry.isIntersecting));
  });
  function observeObjects() {
    visibleObjects.disconnect();
    root.querySelectorAll('.spatial-object').forEach(el=>visibleObjects.observe(el));
  }
  new MutationObserver(observeObjects).observe(root,{childList:true});
  observeObjects();
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('motion-paused',document.hidden));
  let card, frame;
  function reset() {
    if (card) {card.style.removeProperty('--spatial-x');card.style.removeProperty('--spatial-y');}
    card = null;
  }
  document.addEventListener('pointermove', e => {
    if (reduced.matches || e.pointerType !== 'mouse') return;
    const next = e.target.closest('.spatial-hero, .home-kpi, .home-reco-card');
    if (next !== card) reset();
    card = next;
    cancelAnimationFrame(frame);
    if (!card) return;
    const target = card, x = e.clientX, y = e.clientY;
    frame = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--spatial-x', `${((.5-(y-rect.top)/rect.height)*4).toFixed(2)}deg`);
      target.style.setProperty('--spatial-y', `${(((x-rect.left)/rect.width-.5)*4).toFixed(2)}deg`);
    });
  },{passive:true});
  document.documentElement.addEventListener('pointerleave', reset);
  reduced.addEventListener('change', () => {cancelAnimationFrame(frame);reset();});
})();
