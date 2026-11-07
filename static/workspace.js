/* Shared workspace navigation. No changes to user records. */
(() => {
 const root=document.querySelector('#viewRoot');
 const bar=document.createElement('div');
 bar.className='workspace-bar';
 bar.innerHTML='<div class="workspace-location"><span>私人工作区</span><span aria-hidden="true">/</span><strong id="workspaceLocation">今日</strong></div><div class="workspace-tools"><button type="button" data-growth="quick">＋ 快速记录</button><label class="workspace-jump"><span class="sr-only">跳转到本页章节</span><select aria-label="跳转到本页章节"><option value="">本页章节</option></select></label><button type="button" data-workspace="search">搜索 <kbd>Ctrl K</kbd></button><button type="button" data-workspace="theme" aria-label="切换深浅主题">切换外观</button></div>';
 root.before(bar);
 const names={home:'今日',today:'执行',dashboard:'资产',health:'健康',newconfig:'成长',agents:'平衡',settings:'设置',archive:'归档'};
 let headings=[];
 function update(){
  const hub=root.dataset.hub;
  const title=root.querySelector('h1')?.textContent || names[root.dataset.page] || '工作台';
  bar.querySelector('strong').textContent=(names[hub]&&names[hub]!==title?names[hub]+' / ':'')+title;
  const select=bar.querySelector('select');
  headings=[...root.querySelectorAll('h2,h3')].filter(h=>h.getClientRects().length&&h.textContent.trim()).slice(0,35);
  select.replaceChildren(new Option('跳转到章节',''));
  headings.forEach((h,i)=>select.add(new Option(h.textContent.trim(),String(i))));
  select.disabled=!headings.length;
 }
 bar.addEventListener('click',e=>{
  const action=e.target.closest('[data-workspace]')?.dataset.workspace;
  if(action==='search') document.querySelector('#tasteSearch')?.click();
  if(action==='theme'){
   const theme=document.body.dataset.theme==='dark'?'light':'dark';
   const button=document.createElement('button');button.dataset.action='theme-'+theme;button.hidden=true;document.body.append(button);button.click();button.remove();
  }
 });
 bar.querySelector('select').addEventListener('change',e=>{
  if(e.target.value==='')return;
  const h=headings[Number(e.target.value)];
  h?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  if(h){h.tabIndex=-1;h.focus({preventScroll:true});}
 });
 let queued=false;
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update();});}}).observe(root,{childList:true,subtree:true});
 root.addEventListener('click',()=>setTimeout(update,50));
 update();
})();
