/* Creative Interaction Studio · no libraries, no network, no unsolicited animation */
(() => {
  const $ = (sel) => document.querySelector(sel);
  const root = $('.shell');
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.22,1,.36,1)';
  const timing = (ms) => reduce() ? 1 : ms;

  // Sidebar: same layout/width transition for each reversible click.
  const sidebarButton = $('#toggleSidebar');
  sidebarButton.addEventListener('click', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    sidebarButton.setAttribute('aria-expanded', String(!collapsed));
    sidebarButton.textContent = collapsed ? '⇥ 展开侧栏' : '⇤ 侧栏';
  });

  // Morphing native modal dialog: real target geometry and source geometry.
  const dialog = $('#morphDialog'), openMorph = $('#openMorph'), closeMorph = $('#closeMorph');
  let modalAnim = null;
  let modalState = 'closed';
  const primaryRect = () => openMorph.getBoundingClientRect();
  const finalRect = () => {
    const width = Math.min(490, innerWidth - 28);
    const height = Math.min(440, innerHeight - 36);
    return { left:(innerWidth-width)/2, top:(innerHeight-height)/2,width,height };
  };
  let savedStart, savedEnd;
  function poses() {
    const source=savedStart || primaryRect(), target=savedEnd || finalRect();
    return [{left:source.left+'px',top:source.top+'px',width:source.width+'px',height:source.height+'px',borderRadius:'10px'},
      {left:target.left+'px',top:target.top+'px',width:target.width+'px',height:target.height+'px',borderRadius:'17px'}];
  }
  function completeClose() {
    if (dialog.open) dialog.close();
    dialog.style.removeProperty('left'); dialog.style.removeProperty('top');
    dialog.style.removeProperty('width'); dialog.style.removeProperty('height');
    modalState='closed'; modalAnim?.cancel(); modalAnim=null;
    openMorph.focus({preventScroll:true});
  }
  function control(direction) {
    if (reduce()) {
      if (direction<0) completeClose(); else { modalState='open'; closeMorph.focus({preventScroll:true}); }
      return;
    }
    if (!modalAnim) {
      modalAnim = dialog.animate(poses(), {duration:timing(340),easing:EASE,fill:'both'});
      modalAnim.pause();modalAnim.currentTime=direction > 0 ? 0 : timing(340);
    }
    modalAnim.playbackRate=direction;
    modalAnim.play();
    modalState=direction>0?'opening':'closing';
    modalAnim.onfinish=() => {
      if (modalAnim.playbackRate<0) completeClose();
      else {modalState='open';closeMorph.focus({preventScroll:true});}
    };
  }
  openMorph.addEventListener('click', () => {
    if (!dialog.open) {savedStart=primaryRect();savedEnd=finalRect();dialog.showModal();control(1);}
    else if (modalState==='closing') control(1);
  });
  const askClose = () => {if(dialog.open){control(-1)}};
  closeMorph.addEventListener('click',askClose);
  dialog.addEventListener('cancel',e=>{e.preventDefault();askClose()});
  dialog.addEventListener('click',(e)=>{if(e.target===dialog) askClose()});
  window.addEventListener('resize',()=>{if(dialog.open && !modalAnim?.playState?.includes('running')){savedEnd=finalRect();}});

  // Stable ID reorder with FLIP movement and explicit keyboard button alternative.
  const list=$('#sortList'), status=$('#sortStatus');
  const capture = () => new Map([...list.children].map(el=>[el.dataset.id,el.getBoundingClientRect()]));
  function reorder(item,target) {
    if (!target || item===target) return;
    const before=capture();
    const siblings=[...list.children];
    const from=siblings.indexOf(item), to=siblings.indexOf(target);
    if (from<to) list.insertBefore(item,target.nextSibling);
    else list.insertBefore(item,target);
    for(const el of list.children) {
      const old=before.get(el.dataset.id), now=el.getBoundingClientRect();
      const d=old.top-now.top;
      if(Math.abs(d)>1 && !reduce()) el.animate([{transform:`translateY(${d}px)`},{transform:'translateY(0)'}],{duration:timing(210),easing:EASE});
    }
    const order=[...list.children].map(el=>el.dataset.id).join(' → ');
    status.textContent='当前顺序：'+order;
  }
  let dragging=null;
  list.addEventListener('dragstart',e=>{const li=e.target.closest('li[data-id]');if(!li)return;dragging=li;li.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',li.dataset.id)});
  list.addEventListener('dragover',e=>{const target=e.target.closest('li[data-id]');if(!target||!dragging)return;e.preventDefault();target.classList.add('drop-target')});
  list.addEventListener('dragleave',e=>e.target.closest('li[data-id]')?.classList.remove('drop-target'));
  list.addEventListener('drop',e=>{e.preventDefault();const target=e.target.closest('li[data-id]');if(dragging && target)reorder(dragging,target);[...list.children].forEach(el=>el.classList.remove('drop-target'))});
  list.addEventListener('dragend',()=>{dragging?.classList.remove('dragging');dragging=null;[...list.children].forEach(el=>el.classList.remove('drop-target'))});
  list.addEventListener('click',e=>{const button=e.target.closest('[data-dir]');if(!button)return;const li=button.closest('li'); const sib=Number(button.dataset.dir)<0?li.previousElementSibling:li.nextElementSibling;reorder(li,sib);button.focus()});

  // Chart values are explicitly static demonstration data, never market quotes.
  const values={A:[72,83,77,94,90,106,100,115,109,131],B:[104,88,112,78,122,89,116,91,125,100]};
  const chartPath=$('#chartPath'),fillPath=$('#fillPath'),chartState=$('#chartState');
  const chartBtns={A:$('#chartA'),B:$('#chartB')};
  let series=[...values.A], chartAnim=0;
  function path(points, area=false) {
    const coords=points.map((v,i)=>[12+(456*i/(points.length-1)),140-(v-60)/80*113]);
    return coords.map(([x,y],i)=>(i?' L ':'M ')+x.toFixed(2)+' '+y.toFixed(2)).join('') + (area?' L 468 144 L 12 144 Z':'');
  }
  function draw(points){chartPath.setAttribute('d',path(points));fillPath.setAttribute('d',path(points,true));}
  function setChart(name){
    cancelAnimationFrame(chartAnim);
    const start=[...series], target=values[name], startTime=performance.now(), duration=timing(320);
    chartBtns.A.setAttribute('aria-pressed',String(name==='A'));chartBtns.B.setAttribute('aria-pressed',String(name==='B'));
    chartState.textContent='演示数据 '+name;
    function frame(time){const p=Math.min(1,(time-startTime)/duration),q=1-Math.pow(1-p,3);series=start.map((v,i)=>v+(target[i]-v)*q);draw(series);if(p<1)chartAnim=requestAnimationFrame(frame)}
    chartAnim=requestAnimationFrame(frame);
  }
  chartBtns.A.addEventListener('click',()=>setChart('A')); chartBtns.B.addEventListener('click',()=>setChart('B'));draw(series);

  // Pure user-scrubbed timeline. No timer or autoplay.
  const slider=$('#timelineRange'),square=$('#timelineSquare');
  function paintTimeline(){const p=Number(slider.value)/100;square.style.transform=`translateX(${-60+120*p}px) rotate(${90*p}deg) scale(${1+0.22*p})`;square.style.borderRadius=`${12+16*p}px`;square.style.backgroundColor=`rgb(${Math.round(57+33*p)},${Math.round(139-22*p)},${Math.round(113+54*p)})`;$('#timelineValue').value=Math.round(p*100)+'%';$('#timelineStep').textContent=p<.34?'INITIAL STATE':p<.67?'GEOMETRY TRANSFORM':'FINAL STATE'}
  slider.addEventListener('input',paintTimeline);paintTimeline();

  // Camera pose demonstration uses CSS perspective, clearly labeled illustrative.
  const cameraSlider=$('#cameraRange'),camera=$('#roomCamera');
  function paintCamera(){const p=Number(cameraSlider.value)/100;camera.style.transform=`translateX(-50%) translateY(${5+30*p}px) rotateX(${55-27*p}deg) rotateZ(${-30+24*p}deg) scale(${1.1+1.1*p})`;$('#cameraValue').value=Math.round(p*100)+'%'}
  cameraSlider.addEventListener('input',paintCamera);paintCamera();

  // Keyboard-first command palette. No hidden navigation or network.
  const cmdDialog=$('#commandDialog'),cmdInput=$('#commandInput'),cmdResults=$('#commandResults');
  const commands=[['查看 Morphing 弹窗','#morph'],['拖拽排序实验','#reorder'],['图表连续性','#chart'],['时间轴拖动','#timeline'],['3D 镜头示意','#camera'],['按钮微交互','#press'],['展开侧栏','#none']];
  let choices=[],active=0,prevFocus=null;
  function renderResults(){
    const search=cmdInput.value.trim().toLowerCase();choices=commands.filter(x=>x[0].toLowerCase().includes(search));active=0;
    cmdResults.replaceChildren();
    if (!choices.length){const empty=document.createElement('p');empty.textContent='没有匹配命令';empty.style.padding='12px';cmdResults.append(empty);return}
    choices.forEach((entry,i)=>{const button=document.createElement('button');button.type='button';button.className='cmd-option';button.role='option';button.id='cmd-opt-'+i;button.setAttribute('aria-selected',String(i===active));button.textContent=entry[0];button.addEventListener('click',()=>runCommand(i));cmdResults.append(button)});setActive(0);
  }
  function setActive(i){if(!choices.length)return;active=(i+choices.length)%choices.length;[...cmdResults.children].forEach((el,j)=>el.setAttribute('aria-selected',String(j===active)));cmdInput.setAttribute('aria-activedescendant','cmd-opt-'+active)}
  function showCommand(){if(cmdDialog.open){cmdInput.focus();return}prevFocus=document.activeElement;cmdDialog.showModal();cmdInput.value='';renderResults();cmdInput.focus()}
  function hideCommand(){if(!cmdDialog.open)return;cmdDialog.close();prevFocus?.focus?.({preventScroll:true})}
  function runCommand(i){const selected=choices[i];if(!selected)return;hideCommand();if(selected[1]==='#none'){root.classList.remove('is-collapsed');sidebarButton.setAttribute('aria-expanded','true');sidebarButton.textContent='⇤ 侧栏'}else $(selected[1])?.scrollIntoView({behavior:reduce()?'instant':'smooth',block:'start'});$('#commandStatus').textContent='已执行：'+selected[0]}
  $('#openCommand').addEventListener('click',showCommand);
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();showCommand()}
    if(!cmdDialog.open)return;
    if(e.key==='ArrowDown'){e.preventDefault();setActive(active+1)}
    if(e.key==='ArrowUp'){e.preventDefault();setActive(active-1)}
    if(e.key==='Enter'){e.preventDefault();runCommand(active)}
  });
  cmdDialog.addEventListener('cancel',e=>{e.preventDefault();hideCommand()});
  cmdInput.addEventListener('input',renderResults);

  // Press state: pointer capture should not keep button pressed on cancel/outside.
  const press=$('#pressButton'),pressStatus=$('#pressStatus');
  const setPress=(b)=>{press.classList.toggle('pressed',b&&!reduce());pressStatus.textContent=b?'PRESSED':'IDLE'};
  press.addEventListener('pointerdown',()=>setPress(true));
  ['pointerup','pointercancel','pointerleave','blur'].forEach(type=>press.addEventListener(type,()=>setPress(false)));
  press.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter')setPress(true)});
  press.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')setPress(false)});
})();
