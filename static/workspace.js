/* Shared workspace navigation. No changes to user records. */
(() => {
 const root=document.querySelector('#viewRoot');
 const bar=document.createElement('div');
 bar.className='workspace-bar';
 bar.innerHTML='<div class="workspace-location"><span>私人工作区</span><span aria-hidden="true">/</span><strong id="workspaceLocation">今日</strong></div><div class="workspace-tools"><button type="button" class="workspace-voice-task" data-action="voice-task-open" title="Ctrl+K · 语音录入待办，识别后保存到今天的周历" aria-label="待办：开始语音录入并保存到今天的周历">🎙 <span>待办</span><kbd>Ctrl K</kbd></button><button type="button" data-growth="quick">＋ 快速记录</button><button type="button" data-workspace="search">搜索 <kbd>Ctrl Alt K</kbd></button><button type="button" data-workspace="theme" aria-label="切换深浅主题">切换外观</button></div>';
 root.before(bar);
 const names={home:'今日',today:'执行',dashboard:'资产',health:'健康',newconfig:'成长',cycle:'结构与周期',agents:'平衡',settings:'设置',archive:'归档'};
 let headings=[];
 function update(){
  const hub=root.dataset.hub;
  const title=root.querySelector('h1')?.textContent || names[root.dataset.page] || '工作台';
  bar.querySelector('strong').textContent=(names[hub]&&names[hub]!==title?names[hub]+' / ':'')+title;

 }
 bar.addEventListener('click',e=>{
  const action=e.target.closest('[data-workspace]')?.dataset.workspace;
  if(action==='search') document.querySelector('#tasteSearch')?.click();
  if(action==='theme'){
   const theme=document.body.dataset.theme==='dark'?'light':'dark';
   const button=document.createElement('button');button.dataset.action='theme-'+theme;button.hidden=true;document.body.append(button);button.click();button.remove();
  }
 });
 let queued=false;
 new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;update();});}}).observe(root,{childList:true,subtree:true});
 root.addEventListener('click',()=>setTimeout(update,50));
 update();
})();
