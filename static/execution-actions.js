/* Account-backed execution actions and reminder schedules. */
(() => {
 const routes={skin:'护肤',diet:'饮食',fitness:'健身',sleep:'睡眠',checkin:'健康打卡',inbox:'待办',calendar:'周历',dailyflow:'流程'};
 const destination=x=>x.destination||(/护肤|护理|洗脸/.test(x.title)?'skin':/饭|餐|饮食|喝水/.test(x.title)?'diet':/健身|运动|训练/.test(x.title)?'fitness':/睡眠|睡觉/.test(x.title)?'sleep':'inbox');
 function open(page){if(!routes[page])page='dailyflow';if(['skin','diet'].includes(page))sessionStorage.setItem('wealthos-tab-'+page,'today');renderPage(page,{transition:false});scrollTo(0,0);}
 window.openExecutionRoute=open;
 function sheet(title,html){document.querySelector('#executionSheet')?.remove();const d=document.createElement('dialog');d.id='executionSheet';d.innerHTML=`<header><h2>${title}</h2><button data-dismiss aria-label="关闭">×</button></header>${html}`;document.body.append(d);d.querySelector('[data-dismiss]').onclick=()=>d.remove();d.addEventListener('cancel',()=>d.remove());d.showModal();return d;}
 function shortcuts(){
  const selected=state.executionShortcuts||['diet','skin','checkin'];
  const d=sheet('快捷打开',`<div class="execution-links">${selected.map(x=>`<button data-route="${x}">${routes[x]||x}</button>`).join('')}</div><details><summary>配置快捷方式</summary><form>${Object.entries(routes).map(([v,t])=>`<label><input type="checkbox" name="route" value="${v}" ${selected.includes(v)?'checked':''}>${t}</label>`).join('')}<button>保存配置</button></form></details>`);
  d.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{d.remove();open(b.dataset.route);});
  d.querySelector('form').onsubmit=async e=>{e.preventDefault();state.executionShortcuts=new FormData(e.target).getAll('route');await persist({quiet:true});d.remove();};
 }
 let press,held=false;
 const dock=document.querySelector('.spatial-dock');
 dock?.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))return;held=false;press=setTimeout(()=>{held=true;shortcuts();},550);});
 ['pointerup','pointercancel','pointermove'].forEach(t=>dock?.addEventListener(t,()=>clearTimeout(press)));
 dock?.addEventListener('click',e=>{if(held){e.stopImmediatePropagation();e.preventDefault();held=false;}},true);
 dock?.addEventListener('contextmenu',e=>e.preventDefault());
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-flow-go]');if(b){const item=(state.dailyFlows[b.dataset.kind]||[]).find(x=>String(x.id)===b.dataset.flowGo);if(item)open(destination(item));}
  const gym=e.target.closest('[data-quick-workout]');if(gym)workout(gym.dataset.quickWorkout);
 });
 async function workout(id){
  try{
   const ex=await gymRequest('/api/gym/exercises/'+encodeURIComponent(id));
   state.quickWorkout ||= {id:crypto.randomUUID(),exerciseId:id,exercise:ex.name,zone:ex.bodyPartZh||'全身',startedAt:Date.now(),sets:0,reps:10,weight:0};
   if(state.quickWorkout.exerciseId!==id){toast('请先完成当前训练：'+state.quickWorkout.exercise);return;}
   await persist({quiet:true});const w=state.quickWorkout;
   const d=sheet(esc(w.exercise),`<p>训练计时 <strong data-clock></strong> · 已完成 <b data-sets>${w.sets}</b> 组</p><label>每组次数<input type="number" data-reps min="1" max="500" value="${w.reps}"></label><label>重量 kg<input type="number" data-weight min="0" max="1000" step="0.5" value="${w.weight}"></label><button data-set>完成一组</button><button data-finish>结束并打卡</button><p>关闭后计时继续，再点此动作可恢复。</p>`);
   const tick=setInterval(()=>{if(!d.isConnected){clearInterval(tick);return;}d.querySelector('[data-clock]').textContent=Math.floor((Date.now()-w.startedAt)/60000)+':'+String(Math.floor((Date.now()-w.startedAt)/1000)%60).padStart(2,'0');},500);
   d.querySelector('[data-set]').onclick=async()=>{const reps=Number(d.querySelector('[data-reps]').value),weight=Number(d.querySelector('[data-weight]').value);if(reps<1||reps>500||weight<0||weight>1000)return;w.reps=reps;w.weight=weight;w.entries ||= [];w.entries.push({reps,weight,completedAt:new Date().toISOString()});w.sets++;d.querySelector('[data-sets]').textContent=w.sets;await persist({quiet:true});};
   d.querySelector('[data-finish]').onclick=async e=>{if(!w.sets){toast('先完成至少一组');return;}e.target.disabled=true;state.trainingSessions ||= [];state.trainingSessions.unshift({...w,date:todayKey(),duration:Math.round((Date.now()-w.startedAt)/6000)/10,createdAt:new Date().toISOString()});state.healthChecks ||= {};state.healthChecks[todayKey()] ||= {};state.healthChecks[todayKey()].workout=true;state.quickWorkout=null;await persist({quiet:true});d.remove();toast('训练已记录');};
  }catch(e){toast('无法开始训练：'+e.message,true);}
 }
 let lastSchedule='',lastShortcuts='',seen=new Set();
 function schedule(){
  if(typeof state==='undefined'||!state){if(lastSchedule&&window.AndroidApp?.syncReminders){AndroidApp.syncReminders('[]');lastSchedule='';}return;}
  const route=window.AndroidApp?.consumeExecutionRoute?.();if(route)open(route);
  const shortcuts=JSON.stringify((state.executionShortcuts||['diet','skin','checkin']).filter(x=>routes[x]).map(page=>({page,label:routes[page]})));if(shortcuts!==lastShortcuts&&window.AndroidApp?.configureShortcuts){AndroidApp.configureShortcuts(shortcuts);lastShortcuts=shortcuts;}
  const enabled=state.executionReminders===true,entries=[];
  if(enabled){
   for(let day=0;day<7;day++){
    const date=new Date();date.setDate(date.getDate()+day);const kind=[0,6].includes(date.getDay())?'restday':'weekday';
    for(const x of state.dailyFlows?.[kind]||[]){const at=new Date(date);at.setHours(0,0,0,0);at.setMinutes(Number(x.start));if(at.getTime()<Date.now()-60000)at.setDate(at.getDate()+7);entries.push({id:'flow-'+kind+'-'+x.id+'-'+date.getDay(),title:x.title,at:at.getTime(),page:destination(x),weekly:true});}
   }
   for(const x of focusTasks())if(!x.done&&x.startDate&&x.time){const at=new Date(x.startDate+'T'+x.time).getTime();if(at>Date.now()-60000)entries.push({id:'todo-'+x.id,title:x.title,at,page:'inbox',weekly:false});}
  }
  const json=JSON.stringify(entries);if(window.AndroidApp?.syncReminders&&json!==lastSchedule){AndroidApp.syncReminders(json);lastSchedule=json;}
  if(enabled&&!document.hidden)for(const x of entries){if(x.at>Date.now()||Date.now()-x.at>60000||seen.has(x.id+x.at))continue;seen.add(x.id+x.at);if(document.querySelector('dialog[open],.flow-modal'))continue;const d=sheet('到时间了',`<p>${esc(x.title)}</p><button data-start>去执行</button>`);d.querySelector('[data-start]').onclick=()=>{d.remove();open(x.page);};}
 }
 function settings(){
  if(matchMedia('(max-width:860px)').matches&&currentPage==='dailyflow'&&!ui.flowViewMode){ui.flowViewMode='checklist';renderPage('dailyflow',{transition:false});return;}
  if(!state||document.querySelector('#executionSettings')||!['schedules','dailyflow'].includes(currentPage))return;
  const div=document.createElement('div');div.id='executionSettings';div.className='execution-settings';div.innerHTML='<button data-shortcuts>快捷入口</button><button data-reminders>提醒设置</button>';(document.querySelector('.flow-check-toolbar')||document.querySelector('#viewRoot')).append(div);
  div.querySelector('[data-shortcuts]').onclick=shortcuts;
  div.querySelector('[data-reminders]').onclick=()=>{const d=sheet('流程与待办提醒',`<label><input type="checkbox" data-enabled ${state.executionReminders?'checked':''}>启用到点提醒</label><p>流程按工作日/休息日重复，带日期和时间的待办单次提醒。</p><p>Android 需允许通知与精确闹钟；强行停止 App 后需重新打开。</p><button data-permission>允许系统通知</button><button data-alarm>允许准时提醒</button><p data-status></p>`);d.querySelector('[data-enabled]').onchange=async e=>{state.executionReminders=e.target.checked;await persist({quiet:true});schedule();};d.querySelector('[data-permission]').onclick=()=>window.AndroidApp?.requestReminderPermission?AndroidApp.requestReminderPermission():d.querySelector('[data-status]').textContent='当前浏览器仅支持页面打开时提醒；后台提醒请安装新版 Android App。';d.querySelector('[data-alarm]').onclick=()=>window.AndroidApp?.requestAlarmPermission?.();};
 }
 new MutationObserver(()=>{if(typeof state!=='undefined'&&state)settings();}).observe(document.querySelector('#viewRoot'),{childList:true});
 document.addEventListener('click',e=>{if(e.target.closest('[data-action=logout]')){window.AndroidApp?.syncReminders?.('[]');lastSchedule='';}},true);
 let scheduleTimer;for(const event of ['click','change'])document.addEventListener(event,()=>{clearTimeout(scheduleTimer);scheduleTimer=setTimeout(schedule,700);});
 setInterval(schedule,10000);document.addEventListener('visibilitychange',schedule);window.addEventListener('xindeng-resume',schedule);setTimeout(schedule,1500);
 setInterval(()=>{if(typeof state!=='undefined'&&state){const route=window.AndroidApp?.consumeExecutionRoute?.();if(route)open(route);}},1000);
})();
