/** A framework-free interaction study. No network requests, dependencies or fabricated live data. */
(() => {
  'use strict';
  const scenes = [
    { title: 'Structure<br><em>in space.</em>', desc: 'An exploration of dimension and restraint. Move your pointer to shift perspective; the geometry responds without losing its center.' },
    { title: 'Rhythm<br><em>and response.</em>', desc: 'One action changes the composition. Layers offset and reassemble in a deliberate sequence, keeping their identity through every transition.' },
    { title: 'Balance<br><em>in motion.</em>', desc: 'Form settles into a new equilibrium. The scene stays responsive, calm and continuous—even when you reverse or interrupt the timeline.' },
  ];
  const $ = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[data-demo-scene]')];
  const stage = $('stage-visual');
  const orbit = $('orbit-container');
  const range = $('timeline');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let progress = 0;
  let playing = false;
  let lastFrame = null;
  let rafId = null;
  let visible = true;
  let pointerDown = false;

  function syncPlayback() {
    $('play-icon').textContent = playing ? 'Ⅱ' : '▶';
    $('play-text').textContent = playing ? 'PAUSE' : 'PLAY';
    $('play-control').setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
  }
  function updateProgress(next) {
    progress = Math.max(0, Math.min(100, next));
    range.value = String(Math.round(progress));
    range.style.setProperty('--track-progress', `${progress}%`);
    stage.style.setProperty('--progress', String(progress));
    stage.style.setProperty('--orbit-scale', (0.91 + progress * .0008).toFixed(3));
    $('progress-label').textContent = `${String(Math.round(progress)).padStart(3, '0')}%`;
  }
  function setScene(n) {
    playing = false;
    cancel();
    syncPlayback();
    index = (n + scenes.length) % scenes.length;
    document.body.dataset.scene = String(index);
    $('scene-title').innerHTML = scenes[index].title; // Trusted, authored strings only.
    $('scene-description').textContent = scenes[index].desc;
    $('scene-index').textContent = `0${index + 1} / 03`;
    $('frame-number').textContent = `0${index + 1}`;
    $('visual-figure').textContent = `00${index + 1}`;
    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-pressed', String(i === index));
    });
    updateProgress(0);
  }
  function step(timestamp) {
    rafId = null;
    if (!playing || !visible || reduced.matches) return;
    if (lastFrame === null) lastFrame = timestamp;
    const dt = Math.min(timestamp - lastFrame, 50);
    lastFrame = timestamp;
    const next = progress + dt / 75; // 7.5-second timeline
    if (next >= 100) {
      updateProgress(100);
      playing = false; // Explicit play affects only this scene; no automatic progression/loop.
      syncPlayback();
      return;
    }
    updateProgress(next);
    rafId = requestAnimationFrame(step);
  }
  function schedule() {
    if (rafId === null && playing && visible && !reduced.matches) {
      lastFrame = null;
      rafId = requestAnimationFrame(step);
    }
  }
  function cancel() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    lastFrame = null;
  }
  tabs.forEach((tab) => tab.addEventListener('click', () => setScene(Number(tab.dataset.demoScene))));
  $('next-control').addEventListener('click', () => setScene(index + 1));
  $('play-control').addEventListener('click', () => {
    if (!playing && progress >= 100) updateProgress(0);
    playing = !playing;
    syncPlayback();
    if (playing) schedule(); else cancel();
  });
  range.addEventListener('input', () => {
    playing = false;
    cancel();
    syncPlayback();
    updateProgress(Number(range.value));
  });
  function pointerMove(event) {
    if (reduced.matches) return;
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    stage.style.setProperty('--pointer-x', `${(x * 11).toFixed(2)}deg`);
    stage.style.setProperty('--pointer-y', `${(-y * 9).toFixed(2)}deg`);
  }
  stage.addEventListener('pointermove', pointerMove);
  stage.addEventListener('pointerdown', (e) => { pointerDown = true; if (e.pointerType !== 'mouse') stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointerup', () => { pointerDown = false; });
  stage.addEventListener('pointercancel', () => { pointerDown = false; });
  stage.addEventListener('pointerleave', () => {
    if (pointerDown) return;
    stage.style.setProperty('--pointer-x', '0deg');
    stage.style.setProperty('--pointer-y', '0deg');
  });
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (!visible) cancel(); else schedule();
  });
  reduced.addEventListener?.('change', (event) => {
    if (event.matches) { playing = false; cancel(); }
    syncPlayback();
    if (!event.matches) schedule();
  });
  syncPlayback();
  updateProgress(progress); // No unsolicited animation on page load.
})();
