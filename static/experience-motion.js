/* Presentation only: no storage writes, no parallel animation engine. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const root=document.querySelector('#viewRoot');
  const active=new Set();
  function animate(el,frames,options){
    if(reduced.matches || !el?.animate) return;
    el.getAnimations().forEach(a=>a.cancel());
    const animation=el.animate(frames,{duration:320,easing:'cubic-bezier(.16,1,.3,1)',...options});
    active.add(animation);
    animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  }
  window.experienceMotion={openDetail(wrap,opener){
    const panel=wrap.querySelector('.gym-modal');
    const video=panel.querySelector('video');
    if(video){
      if(reduced.matches){video.autoplay=false;video.pause();}
      const failed=()=>{
        if(panel.querySelector('.media-recovery'))return;
        video.hidden=true;
        const recovery=document.createElement('div');recovery.className='media-recovery';
        recovery.innerHTML='<p role="status">动作视频暂时不可用，仍可查看文字步骤。</p><button type="button">重试视频</button>';
        recovery.querySelector('button').onclick=()=>{recovery.remove();video.hidden=false;video.load();};
        video.after(recovery);
      };
      video.addEventListener('error',failed);
      if(video.error)failed();
    }
    const source=opener?.closest('.gym-card') || opener;
    const from=source?.getBoundingClientRect(),to=panel.getBoundingClientRect();
    const x=from?Math.max(-120,Math.min(120,from.x+from.width/2-to.x-to.width/2)):0;
    const y=from?Math.max(-80,Math.min(80,from.y+from.height/2-to.y-to.height/2)):16;
    animate(panel,[{opacity:0,transform:`translate(${x}px,${y}px) scale(.96)`},{opacity:1,transform:'none'}]);
  }};
  const progress=document.createElement('div');
  progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  let frame=0;
  function update(){frame=0;const range=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${range>1?Math.max(0,Math.min(1,scrollY/range)):0})`;}
  function schedule(){if(!frame)frame=requestAnimationFrame(update);}
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  new ResizeObserver(schedule).observe(root);
  new MutationObserver(()=>{for(const a of active)if(!a.effect?.target?.isConnected)a.cancel();schedule();}).observe(root,{childList:true});
  document.addEventListener('keydown',e=>{
    const modal=document.querySelector('#gymModal .gym-modal');
    if(!modal || e.key!=='Tab')return;
    const items=[...modal.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(e.shiftKey && (document.activeElement===first || !modal.contains(document.activeElement))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey && (document.activeElement===last || !modal.contains(document.activeElement))){e.preventDefault();first?.focus();}
  });
  const toast=document.querySelector('#toast');
  if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');}
  reduced.addEventListener('change',()=>{if(reduced.matches){active.forEach(a=>a.cancel());window.activePageTransition?.skipTransition();}});
  addEventListener('pagehide',()=>{active.forEach(a=>a.cancel());cancelAnimationFrame(frame);frame=0;});
  addEventListener('pageshow',schedule);
  schedule();
})();
