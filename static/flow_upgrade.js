/* Account-backed daily checklist, reporting and whiteboards. */
function checklistDay(date){
 state.flowChecklist ||= {};
 if(!state.flowChecklist[date]){const d=new Date(date+'T12:00:00'),kind=[0,6].includes(d.getDay())?'restday':'weekday';state.flowChecklist[date]=(state.dailyFlows[kind]||[]).map(f=>({id:String(f.id),title:f.title,category:f.category||'日常',start:f.start,end:f.end,done:false}));}
 return state.flowChecklist[date];
}
function flowChecklistRows(kind){
 const date=ui.checklistDate||todayKey();state.flowChecklist ||= {};const records=state.flowChecklist[date] ||= [];
 return [...(state.dailyFlows[kind]||[])].sort((a,b)=>n(a.start)-n(b.start)).map(f=>{let record=records.find(x=>x.id===String(f.id)&&(x.kind===kind||!x.kind));if(!record){record={id:String(f.id),kind,done:false};records.push(record);}Object.assign(record,{kind,title:f.title,start:f.start,end:f.end,category:f.category||'日常',destination:f.destination||''});return record;});
}
function renderFlowChecklist(kind=ui.flowKind||flowDateKind(),controls=''){const date=ui.checklistDate||todayKey(),rows=flowChecklistRows(kind);return `${controls}<section class="card flow-checklist"><div class="flow-check-toolbar"><h3>${kind==='weekday'?'工作日清单':'休息日清单'}</h3><input type="date" aria-label="打卡日期" id="checklistDate" value="${esc(date)}"></div>${rows.map(x=>`<div class="flow-check-row ${x.done?'done':''}" data-flow-id="${esc(x.id)}" data-flow-kind="${kind}" title="双击编辑并调整时间" tabindex="0"><input type="checkbox" aria-label="${esc(x.title)}" data-checklist-id="${esc(x.id)}" data-checklist-kind="${kind}" ${x.done?'checked':''}><span><small class="checklist-time">${flowClock(x.start)}–${flowClock(x.end)}</small><strong>${esc(x.title)}</strong></span><button type="button" data-flow-go="${esc(x.id)}" data-kind="${kind}">去执行 ›</button></div>`).join('')||'<div class="execution-empty"><p>还没有安排，先从一件小事开始。</p><button class="btn btn-primary" data-action="flow-new" data-kind="'+kind+'">安排第一项</button></div>'}</section>`;}

function renderChecklistStats(){
 const end=ui.checklistStatsDate||todayKey(),period=ui.checklistPeriod||'week',start=period==='day'?end:shiftDateKey(end,-6),days=[];
 for(let d=start;d<=end;d=shiftDateKey(d,1))days.push(d);
 const records=days.flatMap(d=>(state.flowChecklist?.[d]||[]).map(x=>({...x,date:d}))),done=records.filter(x=>x.done).length,cats={};records.forEach(x=>{cats[x.category]||={all:0,done:0};cats[x.category].all++;if(x.done)cats[x.category].done++;});
 return `<section class="card"><div class="flow-check-toolbar"><h3>每日打卡统计</h3><select id="checklistPeriod" aria-label="统计周期"><option value="day" ${period==='day'?'selected':''}>日统计</option><option value="week" ${period==='week'?'selected':''}>近7天统计</option></select><input type="date" id="checklistStatsDate" aria-label="统计截止日期" value="${esc(end)}"></div><p>${start} 至 ${end} · 已完成 ${done} / 已生成清单任务 ${records.length} · 完成率 ${records.length?Math.round(done/records.length*100):0}%</p><p class="micro-copy">仅统计已生成的每日清单；未生成日期不计入任务数。历史清单保留当时的任务内容。</p><div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>任务</th><th>完成</th><th>完成率</th></tr></thead><tbody>${days.map(d=>{const r=state.flowChecklist?.[d]||[],n=r.filter(x=>x.done).length;return `<tr><td>${d}</td><td>${r.length}</td><td>${n}</td><td>${r.length?Math.round(n/r.length*100)+'%':'未生成'}</td></tr>`}).join('')}</tbody></table></div><h3>分类完成情况</h3>${Object.entries(cats).map(([c,v])=>`<p>${esc(c)}：${v.done}/${v.all}</p>`).join('')||'<p>暂无打卡记录</p>'}<details><summary>任务细分明细</summary>${records.map(x=>`<p>${x.date} · ${esc(x.title)} · ${x.done?'已完成':'未完成'}</p>`).join('')}</details></section>`;
}
function renderLegacyWhiteboard(){state.whiteboards ||= [];const board=state.whiteboards.find(x=>x.id===ui.whiteboardId);return `${sectionHead('WHITE CANVAS','白布画板','用画笔记录思路；画板随账户保存，可再次打开。')}<div class="board-tools"><button class="btn btn-primary" data-board="new">新建画板</button>${board?'<button class="btn" data-board="undo">撤销一笔</button><button class="btn" data-board="save">保存画板</button><input id="boardColor" type="color" value="#214d40" aria-label="画笔颜色">':''}</div><div class="board-list">${state.whiteboards.map(b=>`<button class="btn" data-board="open" data-id="${esc(b.id)}">打开 · ${esc(b.title)}</button>`).join('')}</div>${board?`<label>画板名称 <input id="boardTitle" value="${esc(board.title)}" maxlength="80"></label><canvas class="white-canvas" id="whiteCanvas" width="1200" height="800" aria-label="可绘制画板"></canvas>`:'<p>新建画板或打开已有画板开始绘制。</p>'}`;}
function paintBoard(){const c=document.querySelector('#whiteCanvas'),b=state?.whiteboards?.find(x=>x.id===ui.whiteboardId);if(!c||!b)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);for(const stroke of b.strokes){ctx.strokeStyle=stroke.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();stroke.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}}
document.addEventListener('dblclick',e=>{const checklistRow=e.target.closest('.flow-check-row[data-flow-id]');if(checklistRow&&!e.target.closest('button,input,a')){e.preventDefault();openFlowEditor(checklistRow.dataset.flowKind||ui.flowKind||flowDateKind(),checklistRow.dataset.flowId);return;}const block=e.target.closest('.flow-block');if(block&&!e.target.closest('button')){openFlowEditor(ui.flowKind||flowDateKind(),block.dataset.flowId);return;}const timeline=e.target.closest('#flowTimeline');if(timeline&&!block){const rect=timeline.getBoundingClientRect(),start=Math.max(0,Math.min(1435,Math.floor((timeline.flowScale?.minute(e.clientY-rect.top) ?? (e.clientY-rect.top)/rect.height*1440)/5)*5));openFlowEditor(ui.flowKind||flowDateKind());document.querySelector('#flowEditForm [name=start]').value=flowClock(start);document.querySelector('#flowEditForm [name=end]').value=flowClock(Math.min(1440,start+30));return;}const cell=e.target.closest('[data-calendar-date]');if(currentPage==='calendar'&&cell&&!e.target.closest('button,[data-calendar-event]')){ui.calendarSelectedDate=cell.dataset.calendarDate;ui.showCalendarComposer=true;renderPage('calendar');setTimeout(()=>document.querySelector('#calendarTaskTitle')?.focus(),0);}});
document.addEventListener('keydown',e=>{const b=e.target.closest('.flow-block');if(b&&e.key==='Enter')openFlowEditor(ui.flowKind||flowDateKind(),b.dataset.flowId);});
document.addEventListener('change',e=>{
 if(e.target.id==='flowViewMode'){ui.flowViewMode=e.target.value;renderPage('dailyflow');if(ui.flowViewMode==='checklist')persist({quiet:true});}
 if(e.target.id==='checklistDate'){ui.checklistDate=e.target.value;renderPage('dailyflow');persist({quiet:true});}
 if(e.target.matches('[data-checklist-id]')){const row=flowChecklistRows(e.target.dataset.checklistKind).find(x=>x.id===e.target.dataset.checklistId);if(row){row.done=e.target.checked;row.completedAt=row.done?new Date().toISOString():null;
  // Keep the checkbox, scroll position and keyboard focus in place.
  e.target.closest('.flow-check-row')?.classList.toggle('done',row.done);
  persist({quiet:true});}}
 if(['checklistPeriod','checklistStatsDate'].includes(e.target.id)){ui[e.target.id]=e.target.value;renderPage('dailyflow');}
 if(e.target.id==='boardTitle'){const b=state.whiteboards.find(x=>x.id===ui.whiteboardId);b.title=e.target.value.trim()||'未命名画板';persist({quiet:true});}
});
document.addEventListener('click',async e=>{
 if(e.target.closest('#flowViewToggle')){ui.flowViewMode=ui.flowViewMode==='checklist'?'timeline':'checklist';renderPage('dailyflow');if(ui.flowViewMode==='checklist')persist({quiet:true});return;}
 if(e.target.closest('[data-action="checklist-sync"]')){const date=ui.checklistDate||todayKey(),rows=checklistDay(date),kind=[0,6].includes(new Date(date+'T12:00:00').getDay())?'restday':'weekday';for(const f of state.dailyFlows[kind]||[])if(!rows.some(x=>x.id===String(f.id)))rows.push({id:String(f.id),title:f.title,category:f.category||'日常',start:f.start,end:f.end,done:false});saveAndRender('已补入新增流程');}
 const btn=e.target.closest('[data-board]');if(!btn)return;state.whiteboards ||= [];const action=btn.dataset.board;
 if(action==='new'){const b={id:crypto.randomUUID(),title:'画板 '+(state.whiteboards.length+1),strokes:[]};state.whiteboards.push(b);ui.whiteboardId=b.id;await saveAndRender();}
 if(action==='open'){ui.whiteboardId=btn.dataset.id;renderPage('whiteboard');}
 if(action==='undo'){state.whiteboards.find(x=>x.id===ui.whiteboardId)?.strokes.pop();paintBoard();await persist({quiet:true});}
 if(action==='save')await persist();
});
let boardStroke=null;
document.addEventListener('pointerdown',e=>{if(e.target.id!=='whiteCanvas')return;const b=state.whiteboards.find(x=>x.id===ui.whiteboardId);boardStroke={color:document.querySelector('#boardColor').value,points:[]};b.strokes.push(boardStroke);e.target.setPointerCapture(e.pointerId);addBoardPoint(e);});
function addBoardPoint(e){const c=document.querySelector('#whiteCanvas');if(!boardStroke||!c)return;const r=c.getBoundingClientRect();boardStroke.points.push([(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]);paintBoard();}
document.addEventListener('pointermove',e=>{if(boardStroke)addBoardPoint(e);});
for(const name of ['pointerup','pointercancel'])document.addEventListener(name,()=>{if(boardStroke){boardStroke=null;persist({quiet:true});}});
new MutationObserver(()=>{paintBoard();}).observe(document.querySelector('#viewRoot'),{childList:true});

function renderWhiteboard(){

 return `${sectionHead('EXCALIDRAW','白布画板','Excalidraw 编辑器 · 自动保存到账户 · 历史版本可重新打开')}<div class="board-tools"><button class="btn btn-primary" data-xboard="new">新建 Excalidraw 画板</button><a class="btn" href="https://excalidraw.com/" target="_blank" rel="noopener noreferrer">Excalidraw 官网 ↗</a></div><div id="xBoardList">正在读取历史画板…</div>${ui.xBoardId?`<iframe title="Excalidraw 账户画板" class="excal-frame" src="/static/whiteboard/index.html?id=${encodeURIComponent(ui.xBoardId)}"></iframe>`:''}`;
}
async function loadBoardList(){const el=document.querySelector('#xBoardList');if(!el)return;try{const d=await api('/api/boards');if(!el.isConnected)return;el.innerHTML=d.boards.map(b=>`<button class="btn" data-xboard="open" data-id="${esc(b.id)}">${esc(b.title)} · ${esc(new Date(b.updated_at).toLocaleString())} · v${b.version}</button>`).join('')||'<p>暂无历史画板，新建后会自动保存到你的账户。</p>';}catch(e){el.textContent='读取历史失败：'+e.message;}}
new MutationObserver(loadBoardList).observe(document.querySelector('#viewRoot'),{childList:true});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-xboard]');if(!b)return;try{if(b.dataset.xboard==='new'){const r=await api('/api/boards',{method:'POST'});ui.xBoardId=r.id;}if(b.dataset.xboard==='open')ui.xBoardId=b.dataset.id;if(b.dataset.xboard==='legacy-close')ui.whiteboardId=null;renderPage('whiteboard');}catch(e){toast(e.message,true);}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==document.querySelector('.excal-frame')?.contentWindow)return;if(e.data?.type==='board-save-state')window.boardEditorDirty=e.data.dirty;});

// Stretch only the intervals that need room for a readable task title.
function flowScale(tasks, availableHeight) {
  const ends = new Map();
  const times = new Set(Array.from({length: 25}, (_, hour) => hour * 60));
  for (const {start, end} of tasks) {
    times.add(start);
    times.add(end);
    if (!ends.has(end)) ends.set(end, []);
    ends.get(end).push(start);
  }
  const minutes = [...times].sort((a,b) => a-b);
  const positions = new Map([[0, 0]]);
  for (let i = 1; i < minutes.length; i++) {
    const previous = minutes[i-1], minute = minutes[i];
    let y = positions.get(previous) + (minute-previous)*availableHeight/1440;
    for (const start of ends.get(minute) || []) y = Math.max(y, positions.get(start)+24);
    positions.set(minute, y);
  }
  const pixels = minutes.map(minute => positions.get(minute));
  function interpolate(value, from, to) {
    if (value <= from[0]) return to[0];
    const i = from.findIndex(point => point >= value);
    if (i < 0) return to[to.length-1];
    return to[i-1]+(to[i]-to[i-1])*(value-from[i-1])/(from[i]-from[i-1]);
  }
  return {height:pixels[pixels.length-1], y:m=>interpolate(m,minutes,pixels), minute:y=>interpolate(y,pixels,minutes)};
}
function fitFlowTimeline(){
  const timeline = document.querySelector('#flowTimeline');
  if (!timeline || !timeline.getClientRects().length) return;
  const viewport = window.visualViewport?.height || innerHeight;
  const available = viewport - timeline.getBoundingClientRect().top - scrollY - (innerWidth<=760 ? 88 : 28);
  const tasks = [...timeline.querySelectorAll('.flow-block')].map(block => ({
    block, start:Number(block.dataset.flowStart), end:Number(block.dataset.flowEnd)
  }));
  const scale = flowScale(tasks, Math.max(240,available));
  timeline.flowScale = scale;
  timeline.style.setProperty('--flow-height', scale.height+'px');
  timeline.querySelectorAll('.flow-hour').forEach((row,hour)=>row.style.top=scale.y(hour*60)+'px');
  for (const {block,start,end} of tasks) {
    block.style.top = scale.y(start)+'px';
    block.style.height = (scale.y(end)-scale.y(start))+'px';
  }
}
let flowFitFrame;
function queueFlowFit(){cancelAnimationFrame(flowFitFrame);flowFitFrame=requestAnimationFrame(fitFlowTimeline);}
new MutationObserver(queueFlowFit).observe(document.querySelector('#viewRoot'),{childList:true,subtree:true});
window.addEventListener('resize',queueFlowFit);
window.visualViewport?.addEventListener('resize',queueFlowFit);
document.addEventListener('click',queueFlowFit);
queueFlowFit();
