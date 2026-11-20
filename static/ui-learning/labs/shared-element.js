/** Reversible, user-triggered shared surface; no autoplay, timers or third-party libs. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const anchor = $('anchor');
  const surface = $('surface');
  const trigger = $('trigger');
  const detail = $('details');
  const close = $('close');
  const scrim = $('scrim');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const timing = {duration: 380, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both'};
  let expanded = false;
  let moving = null;
  let content = null;

  function box(rect, radius) {
    return {left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: radius};
  }
  function destination() {
    const w = Math.min(630, window.innerWidth - 28);
    const h = Math.min(520, window.innerHeight - 28);
    return {left: (window.innerWidth-w)/2, top: (window.innerHeight-h)/2, width: w, height: h};
  }
  function settleClosed() {
    moving?.cancel();
    content?.cancel();
    moving = null;
    content = null;
    surface.removeAttribute('style');
    document.body.classList.remove('lock-scroll');
    surface.style.zIndex = '';
    detail.setAttribute('aria-hidden','true');
    trigger.setAttribute('aria-expanded','false');
    surface.classList.remove('is-open');
    scrim.classList.remove('is-open');
    trigger.focus({preventScroll:true});
  }
  function openSurface() {
    if (expanded) return;
    expanded = true;
    detail.setAttribute('aria-hidden','false');
    trigger.setAttribute('aria-expanded','true');
    surface.classList.add('is-open');
    scrim.classList.add('is-open');
    document.body.classList.add('lock-scroll');
    if (moving) {
      moving.playbackRate = 1;
      moving.play();
      return;
    }
    if (reduced.matches) {
      const d=destination();
      Object.assign(surface.style, {position:'fixed', left:`${d.left}px`, top:`${d.top}px`, width:`${d.width}px`, height:`${d.height}px`, borderRadius:'22px', zIndex:'6'});
      detail.style.opacity = '1';
      detail.style.transform = 'none';
      close.focus({preventScroll:true});
      return;
    }
    const from = anchor.getBoundingClientRect();
    const to = destination();
    Object.assign(surface.style, {position:'fixed', left:`${from.left}px`, top:`${from.top}px`, width:`${from.width}px`, height:`${from.height}px`, zIndex:'6'});
    moving = surface.animate([box(from,'18px'), box(to,'22px')], timing);
    content = detail.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0px)'}], {...timing, duration:260, delay:60});
    moving.onfinish = () => {
      if (expanded) close.focus({preventScroll:true});
      else settleClosed();
    };
  }
  function closeSurface() {
    if (!expanded) return;
    expanded = false;
    trigger.setAttribute('aria-expanded','false');
    scrim.classList.remove('is-open');
    // Reverse the SAME animations from their current positions; no independent exit keyframes.
    if (moving) {
      moving.reverse();
      content?.reverse();
    } else {
      settleClosed();
    }
  }
  trigger.addEventListener('click', openSurface);
  close.addEventListener('click', closeSurface);
  scrim.addEventListener('click', closeSurface);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) {event.preventDefault(); closeSurface();}
    if (event.key === 'Tab' && expanded) {
      // Prototype has one focusable control inside the dialog.
      event.preventDefault(); close.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (!expanded) return;
    // On resize rebase geometry; this is a documented spatial-path exception.
    moving?.cancel(); content?.cancel(); moving = null; content = null;
    const d=destination();
    Object.assign(surface.style, {position:'fixed', left:`${d.left}px`, top:`${d.top}px`, width:`${d.width}px`, height:`${d.height}px`, borderRadius:'22px', zIndex:'6'});
    detail.style.opacity = '1'; detail.style.transform = 'none';
  });
})();
