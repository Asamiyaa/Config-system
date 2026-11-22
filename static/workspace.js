/* Shared workspace navigation. No changes to user records. */
(() => {
 const root=document.querySelector('#viewRoot');
 const bar=document.createElement('div');
 bar.className='workspace-bar';
 bar.innerHTML='<div class="workspace-location"><span>私人工作区</span><span aria-hidden="true">/</span><strong id="workspaceLocation">今日</strong></div>';
 root.before(bar);
 const names={home:'今日',today:'执行',dashboard:'资产',health:'健康',newconfig:'成长',cycle:'结构与周期',agents:'平衡',settings:'设置',archive:'归档'};
 let headings=[];
 function update(){
  const hub=root.dataset.hub;
  const title=root.querySelector('h1')?.textContent || names[root.dataset.page] || '工作台';
  bar.querySelector('strong').textContent=(names[hub]&&names[hub]!==title?names[hub]+' / ':'')+title;

 }
 let queued=false;
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update();});}}).observe(root,{childList:true,subtree:true});
 root.addEventListener('click',()=>setTimeout(update,50));
 update();
})();
