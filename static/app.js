const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (v, d=0) => { const x=Number(v); return Number.isFinite(x) ? x : d; };
const clamp = (v, lo=0, hi=100) => Math.max(lo, Math.min(hi, n(v)));
const pct = (v, d=1) => `${n(v).toFixed(d)}%`;
const money = (v, currency='CNY') => new Intl.NumberFormat('zh-CN', {style:'currency',currency,maximumFractionDigits:0}).format(n(v));
const fmt = (v, d=2) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(d);
const stateUrl = '/api/state';
let state = null;
const savedTheme = (()=>{try{return localStorage.getItem('wealth-os-theme-v3')==='dark'?'dark':'light'}catch(_){return 'light'}})();
document.documentElement.dataset.theme=savedTheme;document.body.dataset.theme=savedTheme;
const syncThemeColor=()=>{const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=document.body.dataset.theme==='dark'?'#14211f':'#f4f2eb';};syncThemeColor();
let currentPage = 'dailyflow';
let authMode = 'login';
let saveTimer = null;
let marketBusy = false;
let ui = { allocationMode:'global', expandedETF:null, showSourceDetails:false, cycleTab:'research', focusQuery:'', homeRange:'7', calendarWeekOffset:0, showCalendarComposer:false, calendarSelectedDate:'', workbookSheetIndex:0, workbookData:null, calendarDrag:null, calendarResize:null, bodyZone:'', bodyMuscle:'', bodyMode:'muscle', bodySearch:'', bodyView:{x:0,y:0,rx:0,ry:0,scale:1}, bodyDragMoved:false, checkinDate:'', guidedSummaryId:null };
let guidedTimerInterval=null;
let focusClock = { remaining:1500, endsAt:null, interval:null, running:false };

const WORKBOOKS = [
  {id:'global-multi-asset-cn',title:'全球资产配置工作簿（最新中文）',filename:'global_multi_asset_allocation_tracker_cn.xlsx',topic:'全球资产配置',detail:'全球多资产 Dashboard、七维评分、动态目标、DailyLog、境内产品映射与风控规则'},
  {id:'nasdaq-v3',title:'纳斯达克 AI + 杠杆跟踪器 V3',filename:'nasdaq_ai_daily_tracker_v3_leverage_2.xlsx',topic:'纳斯达克资产配置',detail:'AI泡沫、2000相似度、Core/Swing/Crisis、回撤梯队、Kelly与杠杆规则'},
  {id:'ashare-latest',title:'A股 ETF 跟踪网页核验快照（最新）',filename:'A股板块轮动_ETF跟踪_20261009网页核验快照.xlsx',topic:'A股 ETF 轮动',detail:'ETF评分、监控状态、历史快照、数据质量与行情来源'},
  {id:'newconfig-90d',title:'新登配置 90 天落地与持续跟踪',filename:'新登配置_90天落地与持续跟踪.xlsx',topic:'新登配置 / 90天',detail:'资产台账、配置与目标、90天路线图、每周跟踪、跨境账户身份与 AI订阅ROI'},
  {id:'ashare-tracker',title:'A股板块轮动 ETF 自动跟踪（原始版）',filename:'A股板块轮动_ETF自动跟踪.xlsx',topic:'A股 ETF 轮动',detail:'观察池、参数设置、数据字典和每日执行节奏'},
  {id:'global-multi-asset-original',title:'全球多资产配置工作簿（原始版）',filename:'global_multi_asset_allocation_tracker.xlsx',topic:'全球资产配置',detail:'原始多资产框架与历史版本'},
  {id:'nasdaq-v2',title:'纳斯达克 AI 跟踪器 V2',filename:'nasdaq_ai_daily_tracker_v2.xlsx',topic:'纳斯达克资产配置',detail:'早期评分与仓位版本'}
];
function shiftDateKey(key, days) { if(!key) return ''; const d=new Date(`${key}T12:00:00`); d.setDate(d.getDate()+days); return todayKey(d); }
function dayDiff(start,end) { if(!start||!end) return 0; return Math.round((new Date(`${end}T12:00:00`)-new Date(`${start}T12:00:00`))/86400000); }
const PAGE_NAMES = {schedules:'自动化',agents:'平衡',settings:'设置',mistakes:'避坑',home:'工作台',inbox:'今日任务',upcoming:'未来 7 天',calendar:'周历 / 日程',matrix:'任务四象限',stats:'执行统计',important:'重要事项',alltasks:'全部任务',dashboard:'资产总览',allocation:'全球资产配置',nasdaq:'纳斯达克 AI 策略',ashare:'A股 ETF 轮动',xindeng:'新登',newconfig:'成长总览',health:'健康',checkin:'打卡与统计',diet:'饮食饮水',fitness:'健身管理',skin:'皮肤护理',sleep:'睡眠与恢复',style:'发型与穿搭',english:'英语',reading:'阅读',execution:'每日执行与日志',archive:'归档',dailyflow:'流程',flowstats:'流程统计',alpharadar:'Alpha Radar'};

async function api(path, options={}) {
  const res = await fetch(path, {credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options});
  const data = await res.json().catch(()=>({detail:res.statusText}));
  if (!res.ok) throw new Error(data.detail || `请求失败 (${res.status})`);
  return data;
}

function toast(message, isError=false) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', !!isError);
  el.classList.remove('hidden');
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(window.__toastTimeout);
  clearTimeout(window.__toastHideTimeout);
  window.__toastTimeout = setTimeout(()=>{
    el.classList.remove('show');
    window.__toastHideTimeout = setTimeout(()=>el.classList.add('hidden'), 200);
  }, 3100);
}

function setAuthMessage(msg, error=true) {
  const el = $('#authMessage');
  el.textContent = msg || '';
  el.style.color = error ? 'var(--bad)' : 'var(--good)';
}

function showAuth() {
  undoEntries.length=0;$('#undoNotice')?.remove();
  $('#authScreen').classList.remove('hidden');
  $('#appShell').classList.add('hidden');
}
function showApp(username) {
  $('#authScreen').classList.add('hidden');
  $('#appShell').classList.remove('hidden');
  $('#sidebarUser').textContent = username;
  const initial = (username || 'U').slice(0,1).toUpperCase();
  $('#userAvatar').textContent = initial;
  const topAvatarEl = $('#topAvatar');
  if (topAvatarEl) topAvatarEl.textContent = initial;
  renderPage(currentPage);
  if(currentPage==='fitness')setTimeout(startGuidedTimer,0);
}

function updateAuthMode() {
  const register = authMode === 'register';
  $('#authEyebrow').textContent = register ? 'CREATE YOUR WORKSPACE' : 'WELCOME BACK';
  $('#authTitle').textContent = register ? '创建新登账户' : '登录新登';
  $('#authSubtitle').textContent = register ? '建立属于你的成长、健康与资产工作区。' : '成长、记录与订阅，随账户持续保存。';
  $('#authSubmit').innerHTML = register ? '创建账户并进入 <span>↗</span>' : '登录工作台 <span>↗</span>';
  $('#authModeText').textContent = register ? '已经有账户？' : '还没有账户？';
  $('#authModeToggle').textContent = register ? '返回登录' : '创建本地账户';
  $('#authPassword').autocomplete = register ? 'new-password' : 'current-password';
  $('#fillDemo').classList.toggle('hidden', register);
  setAuthMessage('');
}

$('#authModeToggle').addEventListener('click', ()=>{ authMode = authMode === 'login' ? 'register' : 'login'; updateAuthMode(); });
$('#fillDemo').addEventListener('click', ()=>{ $('#authUsername').value='demo'; $('#authPassword').value='Demo1234!'; setAuthMessage('演示账户已填入；首次试用请修改并使用自己的账户保存长期数据。', false); });
$('#authForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); setAuthMessage('正在验证…', false);
  const username = $('#authUsername').value.trim();
  const password = $('#authPassword').value;
  try {
    const result = await api(authMode === 'register' ? '/api/register' : '/api/login', {method:'POST', body:JSON.stringify({username,password})});
    await loadState();
    showApp(result.username || username);
  } catch(err) { setAuthMessage(err.message); }
});

async function boot() {
  try {
    const cfg = await api('/api/config');
    if (!cfg.registrationEnabled) {
      $('.auth-mode')?.classList.add('hidden');
      if (authMode === 'register') { authMode = 'login'; updateAuthMode(); }
    }
    if (!cfg.demoEnabled) {
      $('#demoLogin')?.classList.add('hidden');
      $('#authUsername').value = '';
      $('#authPassword').value = '';
      $('#authUsername').placeholder = '请输入用户名';
      $('#authPassword').placeholder = '请输入密码';
    }
  } catch {}
  try {
    const s = await api('/api/session');
    if (s.authenticated) { await loadState(); showApp(s.username); }
    else showAuth();
  } catch { showAuth(); }
}

async function loadState() {
  const result = await api(stateUrl);
  state = result.state;
  ensureStateDefaults();
  if (!state.agentStatuses) state.agentStatuses={};
}

function ensureStateDefaults() {
  if (!state.profile) state.profile={};
  if (!state.meta) state.meta={mode:'demo'};
  if (!state.globalAllocation) state.globalAllocation=[];
  if (!state.starterAllocation) state.starterAllocation=[];
  if (!state.nasdaq) state.nasdaq={};
  if (!state.etfs) state.etfs=[];
  if (!state.tasks) state.tasks=[];
  if (!Array.isArray(state.focusTasks)) state.focusTasks = starterFocusTasks();
  state.focusTasks.forEach((t,i)=>{ if(t.startDate===undefined) t.startDate=t.dueDate||''; if(t.sortOrder===undefined) t.sortOrder=t.startDate?dayDiff('2000-01-01',t.startDate)*1000+i:999999000+i; });
  if (!state.habitChecks || typeof state.habitChecks !== 'object') state.habitChecks = {};
  if (!state.infrastructure) state.infrastructure=[];
  if (!state.dailyLog) state.dailyLog=[];
  if (!state.chatArchive) state.chatArchive=[];
  if (!state.cadence) state.cadence=[];
  if (!state.cycleNotes) state.cycleNotes=[];
  if (!state.subscriptions) state.subscriptions=[];
  if (!state.predictions) state.predictions=[];
  if (!state.assetLedger) state.assetLedger=[];
  if (!state.weeklyLog) state.weeklyLog=[];
  if (!state.contentLog) state.contentLog=[];
  if (!state.healthLogs) state.healthLogs=[];
  if (!state.dailyFlows || typeof state.dailyFlows !== 'object') state.dailyFlows={weekday:[],restday:[]};
  if (!Array.isArray(state.dailyFlowRuns)) state.dailyFlowRuns=[];
  ['weekday','restday'].forEach(k=>{if(!Array.isArray(state.dailyFlows[k]))state.dailyFlows[k]=[];});
  if (!state.healthChecks || typeof state.healthChecks !== 'object') state.healthChecks={};
  if (!state.trainingSessions) state.trainingSessions=[];
  if (!Array.isArray(state.guidedWorkoutHistory)) state.guidedWorkoutHistory=[];
  if (!state.fitnessRoutines || typeof state.fitnessRoutines!=='object') state.fitnessRoutines={};
  if (!state.progressiveOverload || typeof state.progressiveOverload!=='object') state.progressiveOverload={};
  if (!state.activeGuidedWorkout || typeof state.activeGuidedWorkout!=='object') state.activeGuidedWorkout=null;
  if (!state.bodyMeasurements) state.bodyMeasurements=[];
  if (!state.gym || typeof state.gym!=='object') state.gym={favorites:[],lastPlanAt:null,planMeta:null};
  if (!Array.isArray(state.gym.favorites)) state.gym.favorites=[];
  if (!state.englishLogs) state.englishLogs=[];
  if (!state.readingBooks) state.readingBooks=[];
  if (!state.readingNotes) state.readingNotes=[];
  if (!state.readingSessions) state.readingSessions=[];
  if (!state.notebookEntries) state.notebookEntries=[];
  if (!Array.isArray(state.dailyMustReads)) state.dailyMustReads=[];
  if (!Array.isArray(state.alphaRadarSignals)) state.alphaRadarSignals=[];
  if (!state.alphaRadarConfig || typeof state.alphaRadarConfig!=='object') state.alphaRadarConfig={topN:5,minScore:45};
  if (!state.profile.riskOverlay) state.profile.riskOverlay='Caution';
  if (!state.profile.portfolioRiskCap) state.profile.portfolioRiskCap=65;
  if (!state.screenRule) state.screenRule={windowDays:7,yellowBMin:2,includeHigherGrades:true,gradeUniverse:'A+, A, B+, B'};
  state.etfs.forEach(e=>{ if (!e.parts) e.parts={macro:0,policy:0,life:0,technical:0,activity:0,sentiment:0,ladder:0,earnings:0}; if (e.riskPenalty===undefined) e.riskPenalty=Math.max(0, Object.values(e.parts).reduce((a,b)=>a+n(b),0)-n(e.score)); });
  if (typeof ensureHealthOSState === 'function') ensureHealthOSState();
}

let saveQueue = Promise.resolve();
let unsavedChanges = false;
function setSaveState(kind, text) {
  const status = $('#saveStatus');
  status.textContent = text;
  status.dataset.state = kind;
  const banner = $('#saveRecovery');
  if (banner) banner.classList.toggle('hidden', kind !== 'error');
}
function persist({quiet=false}={}) {
  unsavedChanges = true;
  const run = async () => {
    if (!state) return false;
    setSaveState('saving', '保存中…');
    const payload = JSON.stringify({state});
    const saveStarted=performance.now();
    try {
      const saved=await api(stateUrl, {method:'PUT', body:payload});
      window.lastWorkspaceSaveMs=Math.round(performance.now()-saveStarted);
      unsavedChanges = JSON.stringify({state}) !== payload;
      setSaveState(unsavedChanges?'pending':'saved', unsavedChanges?'还有更改待保存…':'已保存 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));
      if(saved.storageWarning){setSaveState('warning','已保存 · 备份待检查');toast(saved.storageWarning,true);}else if (!quiet) toast('更改已保存');
      return true;
    } catch(err) {
      unsavedChanges = true;
      setSaveState('error', '保存失败 · 更改仍保留在当前页面');
      toast('保存失败：'+err.message, true);
      return false;
    }
  };
  saveQueue = saveQueue.then(run, run);
  return saveQueue;
}
function scheduleSave() { clearTimeout(saveTimer); unsavedChanges=true; setSaveState('pending','待保存…'); saveTimer=setTimeout(()=>persist({quiet:true}),500); }
function saveAndRender(message) { const y=window.scrollY; const active=document.activeElement; const id=active?.id; const selection=active?.selectionStart; renderPage(currentPage,{transition:false,animate:false});window.scrollTo(0,y);if(id){const field=document.getElementById(id);field?.focus({preventScroll:true});try{field?.setSelectionRange(selection,selection)}catch(_){}} return persist({quiet:true}).then(ok=>{if(ok&&message)toast(message);return ok;}); }
window.addEventListener('beforeunload', e=>{if(unsavedChanges){e.preventDefault();e.returnValue='';}});
const undoEntries = [];
function deleteWithUndo(arr, index, label) {
  if(index<0 || !arr[index]) return;
  const [item]=arr.splice(index,1);
  undoEntries.push({arr,index,item,label});
  renderUndoNotice();
  saveAndRender();
}
function renderUndoNotice() {
  let el=$('#undoNotice');
  if(!el){el=document.createElement('div');el.id='undoNotice';el.setAttribute('role','status');$('#appShell').append(el);}
  const last=undoEntries.at(-1);
  el.classList.toggle('hidden',!last);
  if(last) el.innerHTML=`<span>${esc(last.label)}已移除（${undoEntries.length} 项可恢复）</span><button class="btn btn-small" data-action="undo-delete">撤销最近删除</button>`;
}

function tag(text, type='neutral') { return `<span class="tag ${type}">${esc(text)}</span>`; }
function sectionHead(kicker, title, desc, actions='', level='h1') { return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><${level}>${esc(title)}</${level}><p>${esc(desc)}</p></div><div class="page-actions">${actions}</div></div>`; }
function cardHead(title, desc='', right='') { return `<div class="card-head"><div><h3>${title}</h3>${desc?`<p>${desc}</p>`:''}</div>${right}</div>`; }
function metricCard(label, value, foot, icon='◦', footType='', cover='') { return `<div class="card metric-card ${cover?'has-cover':''}">${cover?`<div class="metric-cover"><img src="${cover}" alt="" loading="lazy"></div>`:''}<div class="metric-label"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot ${footType}">${foot}</div></div>`; }
function scoreType(score, inverse=false) { const x=n(score); if (inverse) return x>=70?'bad':x>=55?'warn':'good'; return x>=70?'good':x>=55?'warn':'neutral'; }
function formatDelta(v) { const x=n(v); const cls=x>0?'market-gain':x<0?'market-loss':'market-flat'; const color=x>0?'var(--market-up)':x<0?'var(--market-down)':'inherit'; return `<span class="${cls}" style="color:${color}!important;font-weight:700">${x>0?'+':''}${fmt(x,2)}%</span>`; }
function cleanPageSections(page, root) {
  const foldExtras=(extras,label,parent=root)=>{
    if(!extras.length) return;
    const fold=document.createElement('details');
    fold.className='page-fold';
    fold.innerHTML=`<summary><span>${label}</span><small>${extras.length} 个区块</small></summary><div class="page-fold-body"></div>`;
    const body=fold.querySelector('.page-fold-body');
    extras.forEach((el)=>body.appendChild(el));
    parent.appendChild(fold);
  };
  if (page === 'home') {
    const calendarHead=[...root.children].find((el)=>el.classList.contains('page-head') && /周历/.test(el.textContent));
    if (calendarHead) {
      const extras=[];
      let node=calendarHead;
      while(node){ extras.push(node); node=node.nextElementSibling; }
      foldExtras(extras,'展开周历与专注');
    }
    return;
  }
  if (page==='diet'||page==='skin') {
    const panel=root.querySelector('.hos-shell .fit-panel.active');
    if (panel) {
      const panelChildren=[...panel.children];
      foldExtras(panelChildren.slice(3),'展开其余记录',panel);
    }
    return;
  }
  const keep = {allocation:4,nasdaq:4,ashare:4,execution:4,archive:2,health:3,checkin:3,diet:3,fitness:3,skin:3,sleep:3,style:3,agents:2,schedules:2,mistakes:2}[page];
  if (!keep) return;
  const children=[...root.children].filter((el)=>!el.classList.contains('page-head')&&!el.classList.contains('home-welcome')&&!el.classList.contains('hub-tabs'));
  if (children.length <= keep) return;
  foldExtras(children.slice(keep),'展开其余内容');
}
function setHeader(page) {
  // Seven hubs own the sidebar; subpages keep the same parent selected.
  const hub=HUB_OF[page]||page;
  $$('.nav-item[data-page]').forEach(el=>el.classList.toggle('active',el.dataset.page===hub));
}

const HUB_OF={
  whiteboard:'newconfig',home:'newconfig',today:'newconfig',xindeng:'newconfig',growthplan:'newconfig',review:'newconfig',
  inbox:'newconfig',schedules:'settings',settings:'settings',dailyflow:'newconfig',mistakes:'newconfig',calendar:'newconfig',matrix:'newconfig',stats:'newconfig',important:'newconfig',alltasks:'newconfig',flowstats:'newconfig',
  dashboard:'dashboard',allocation:'dashboard',nasdaq:'dashboard',ashare:'dashboard',execution:'dashboard',alpharadar:'dashboard',
  health:'health',checkin:'health',diet:'health',fitness:'health',skin:'health',sleep:'health',style:'health',
  agents:'newconfig',newconfig:'newconfig',english:'newconfig',reading:'newconfig',archive:'archive'
};
const HUB_TABS={
  settings:{label:'设置',items:[['schedules','自动化']]},
  dashboard:{label:'资产',items:[['http://39.106.118.186/','市场引擎 ↗'],['dashboard','总览'],['allocation','配置'],['nasdaq','纳指'],['ashare','A股'],['execution','执行'],['alpharadar','实验']]},
  newconfig:{label:'成长',items:[['dailyflow','流程'],['calendar','周历'],['growthplan','90天计划'],['xindeng','新登'],['agents','平衡'],['newconfig','成长总览'],['mistakes','避坑'],['review','每周复盘'],['whiteboard','白布画板']]},
  health:{label:'健康',items:[['health','总览'],['checkin','打卡'],['diet','饮食'],['fitness','健身'],['skin','皮肤'],['sleep','睡眠'],['style','穿搭']]}
};
function renderHubTabs(page){
  const hub=HUB_OF[page];
  if(!hub) return '';
  const def=HUB_TABS[hub];
  if(!def) return '';

  return `<div class="hub-tabs" role="navigation" aria-label="${esc(def.label)}导航">${def.items.map(([key,label])=>key.startsWith('http')?`<a class="hub-tab" href="${esc(key)}" target="_blank" rel="noopener noreferrer">${label}</a>`:`<button class="hub-tab ${key===page?'active':''}" data-action="go-page" data-page="${key}" aria-current="${key===page?'page':'false'}">${label}</button>`).join('')}</div>`;
}

const PAGE_COVER_MEDIA={
  home:['/static/img/desk.jpg','窗边工作台与植物'],
  today:['/static/img/desk.jpg','窗边工作台'],
  dashboard:['/static/img/architecture.jpg','仰视的现代建筑与玻璃幕墙'],
  allocation:['/static/img/architecture.jpg','城市建筑立面'],
  nasdaq:['/static/img/city.jpg','城市街道与天际线'],
  ashare:['/static/img/finance.jpg','屏幕上的行情图表'],
  execution:['/static/img/architecture.jpg','现代建筑结构'],
  alpharadar:['/static/img/city.jpg','城市天际线'],
  health:['/static/img/health.jpg','室内训练与伸展'],
  checkin:['/static/img/health.jpg','室内训练与伸展'],
  diet:['/static/img/health.jpg','训练后的恢复'],
  fitness:['/static/img/health.jpg','室内训练'],
  skin:['/static/img/health.jpg','身体护理'],
  sleep:['/static/img/health.jpg','休息与恢复'],
  style:['/static/img/health.jpg','身体与形象'],
  agents:['/static/img/desk.jpg','窗边工作台'],
  newconfig:['/static/img/travel.jpg','公路与山野'],
  english:['/static/img/library.jpg','书架'],
  reading:['/static/img/library.jpg','图书馆书架'],
  archive:['/static/img/library.jpg','图书馆书架'],
  schedules:['/static/img/desk.jpg','工作台与自动化'],
  dailyflow:['/static/img/desk.jpg','工作台日常'],
  mistakes:['/static/img/architecture.jpg','建筑结构'],
  calendar:['/static/img/desk.jpg','工作台日历'],
  stats:['/static/img/architecture.jpg','建筑立面'],
  matrix:['/static/img/desk.jpg','工作台'],
  important:['/static/img/desk.jpg','工作台'],
  alltasks:['/static/img/desk.jpg','工作台'],
  flowstats:['/static/img/desk.jpg','工作台']
};
function labelControls(root=document){
  const fields=[...root.querySelectorAll('input,select,textarea')];
  fields.forEach((el)=>{
    if(el.type==='hidden'||el.closest('[aria-hidden="true"]')) return;
    if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.closest('label')) return;
    if(el.id&&root.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return;
    let label='';
    const table=el.closest('table');
    if(table){
      const td=el.closest('td'), tr=el.closest('tr');
      const ths=[...table.querySelectorAll('thead th')];
      const idx=tr&&td?[...tr.children].indexOf(td):-1;
      const col=idx>=0?ths[idx]?.innerText.trim():'';
      const row=tr?.querySelector('.table-main,.table-sub')?.innerText.trim()||'';
      label=[row,col].filter(Boolean).join(' · ');
    }
    if(!label){
      const card=el.closest('.card,.fit-panel,.ncfg-panel,.health-form');
      label=card?.querySelector('h2,h3,.card-head')?.innerText.split('\n')[0].trim()||'';
    }
    el.setAttribute('aria-label',label||el.getAttribute('placeholder')||'编辑字段');
  });
  root.querySelectorAll('[role="progressbar"], progress').forEach((el)=>{
    if(!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')) el.setAttribute('aria-label','进度');
  });
  root.querySelectorAll('[data-tab][aria-selected]').forEach((el)=>{
    if(el.getAttribute('data-tab')==='plan') { el.removeAttribute('aria-selected'); el.removeAttribute('role'); return; }
    if(!el.getAttribute('role')) el.setAttribute('role','tab');
    const parent=el.parentElement;
    if(parent && !parent.getAttribute('role')) parent.setAttribute('role','tablist');
  });
  root.querySelectorAll('.flow-timeline-scroll,.table-wrap,.calendar-board,.task-list-body').forEach((el)=>{
    if(el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2){
      el.setAttribute('tabindex','0');
      if(!el.getAttribute('aria-label')) el.setAttribute('aria-label','可滚动内容区');
    }
  });
}
function renderPage(page, {autoRefresh=false, transition=true, animate=true}={}) {  if (!state) return;
  if(page==='settings')page='schedules';
  if(page==='home'||page==='today')page='dailyflow';
  const renderStarted=performance.now();
  currentPage=page;
  setHeader(page);
  const root=$('#viewRoot');
  root.dataset.page=page;
  root.dataset.hub=HUB_OF[page]||page;
  const map={whiteboard:renderWhiteboard,xindeng:renderXinDeng,growthplan:renderGrowthPlan,review:renderGrowthReview,today:()=>renderTaskWorkspace('home'),schedules:renderSchedules,agents:renderAgents,mistakes:renderMistakes,home:renderHome,inbox:renderInbox,upcoming:renderUpcoming,calendar:renderCalendar,matrix:renderMatrix,stats:renderFocusStats,important:renderImportant,alltasks:renderAllFocusTasks,dashboard:renderDashboard,allocation:renderAllocation,nasdaq:renderNasdaq,ashare:renderAshare,newconfig:()=> (typeof renderNewConfigV2==='function'?renderNewConfigV2():renderNewConfig()),health:renderHealth,checkin:renderHealthCheckin,diet:()=>renderHealthSection('diet'),fitness:()=>renderHealthSection('fitness'),skin:()=>renderHealthSection('skin'),sleep:()=>renderHealthSection('sleep'),style:()=>renderHealthSection('style'),english:()=> (typeof renderEnglishV2==='function'?renderEnglishV2():renderEnglish()),reading:()=> (typeof renderReadingV2==='function'?renderReadingV2():renderReading()),execution:renderExecution,archive:renderArchive,dailyflow:renderDailyFlow,flowstats:renderFlowStats,alpharadar:renderAlphaRadar};
  const investingPages=['dashboard','allocation','nasdaq','ashare','execution'];
  const body=(map[page]||renderHome)();
  const commit = () => {
    root.innerHTML=body;
    if (['dashboard','allocation','nasdaq','ashare','alpharadar'].includes(page)) {
      const refreshed=state.meta?.lastRefresh;
      const stamp=refreshed?new Date(refreshed):null;
      const valid=stamp&&!Number.isNaN(stamp.getTime());
      const stale=!valid||Date.now()-stamp.getTime()>24*60*60*1000;
      root.insertAdjacentHTML('afterbegin',`<div class="data-provenance ${stale?'is-stale':''}" role="note"><strong>${state.meta?.mode==='demo'?'演示工作区':'当前工作区'}</strong><span>行情刷新：${valid?esc(stamp.toLocaleString('zh-CN')):'尚无有效刷新时间'}</span><span>${stale?'数据待核验，请检查各标的日期与来源':'刷新时间不代表全部标的数据均为最新'}</span></div>`);
    }
    if (investingPages.includes(page) && page !== 'dashboard') {
      const marketPanel=renderMarketActionPanel(page);
      const head=root.querySelector('.page-head');
      const panel=`<details class="page-fold market-fold"><summary><span>展开数据可信度与市场建议</span><small>REFRESH / CONFIDENCE</small></summary><div class="page-fold-body">${marketPanel}</div></details>`;
      if (head) head.insertAdjacentHTML('afterend', panel);
      else root.insertAdjacentHTML('afterbegin', panel);
    }
    const hubTabs=renderHubTabs(page);
    if (hubTabs) {
      const head=root.querySelector('.page-head');
      if (head) head.insertAdjacentHTML('afterend',hubTabs);
      else root.insertAdjacentHTML('afterbegin',hubTabs);
    }
    const pageHead=root.querySelector('.page-head');
    if (pageHead && pageHead.querySelector('h1') && !pageHead.querySelector('.page-cover-media')) {
      const [src,alt]=PAGE_COVER_MEDIA[page]||['/static/img/architecture.jpg','现代建筑封面'];
      pageHead.insertAdjacentHTML('beforeend',`<div class="page-cover-media"><img src="${src}" alt="${esc(alt)}" loading="eager" decoding="async"></div>`);
    }
    updateFocusCounts();
    labelControls(root);
    closeSidebar();
    window.workspacePerformance=window.workspacePerformance||[];window.workspacePerformance.push({page,renderMs:Math.round(performance.now()-renderStarted),at:Date.now()});if(window.workspacePerformance.length>100)window.workspacePerformance.shift();
    // Keep module content visible; the shared chapter navigator handles long pages.
  };
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduceMotion && transition) {
    root.classList.remove('page-enter');
    try {
      const vt=document.startViewTransition(commit);
      vt.finished?.catch(()=>{});
      vt.ready?.catch(()=>{});
      vt.updateCallbackDone?.catch(()=>{});
    } catch (_) {
      commit();
      root.classList.add('page-enter');
    }
  } else {
    commit();
    if (animate) {
      root.classList.remove('page-enter');
      void root.offsetWidth;
      root.classList.add('page-enter');
    }
  }
  if(page==='schedules') loadSchedules().then(()=>{if(currentPage==='schedules'){const r=$('#viewRoot');if(r){r.innerHTML=renderSchedules();r.insertAdjacentHTML('afterbegin',renderHubTabs('schedules'));labelControls(r);}}});
  if(page==='archive') {loadMarketRefreshLogs();api('/api/personal-vault/status').then(d=>{vaultStatus=d;}).catch(()=>{});}
  if(page==='fitness') hydrateGymLibrary();
  if(autoRefresh && investingPages.includes(page) && !marketBusy) refreshMarket();
}

function marketDecisionGate(){
  const g=state.meta?.marketDecisionGate;
  if(g&&Number.isFinite(Number(g.confidence))) return g;
  return {confidence:0,level:'RED',actionMode:'REFERENCE_ONLY',globalValid:0,globalTotal:8,criticalPassed:0,criticalTotal:4,leverageAllowed:false,aggressiveActionAllowed:false,message:'尚未完成数据可信度评估：投资建议仅供参考'};
}
function confidenceTone(level){return level==='GREEN'?'good':level==='YELLOW'?'warn':level==='ORANGE'?'warn':'bad';}

function etfTodayAction(e, gate=marketDecisionGate()){
  const score=n(e.score), r20=e.r20==null?null:n(e.r20), ch=e.change==null?null:n(e.change);
  const target=n(e.target), current=n(e.current), gap=target-current;
  const stale=!e.marketDate;
  let action='观察', tone='neutral', size='0%';
  let reason=`总分 ${fmt(score,1)}；20日收益 ${r20==null?'缺失':formatPlainPct(r20)}；日涨跌 ${ch==null?'缺失':formatPlainPct(ch)}；目标/当前 ${fmt(target,1)}%/${fmt(current,1)}%。`;
  if(stale || n(gate.confidence)<50){
    action='暂停新增'; tone='bad';
    reason+=stale?' 行情日期缺失，先恢复数据。':' Data Confidence < 50，信号只作参考。';
    if(gap<0){action='核验后降至上限'; size=`减 ${fmt(Math.min(Math.abs(gap),2),1)}% 起`;}
  }else if(score>=70 && (r20==null || r20>=0) && gap>0){
    action='分批加仓'; tone='good'; size=`加 ${fmt(Math.min(gap,2),1)}%`;
    reason+=' 高分且中期趋势未转负；单日只补部分目标缺口，避免追涨。';
  }else if(score<55){
    action=current>0?'减仓/退出观察':'继续观察'; tone='warn'; size=current>0?`减 ${fmt(Math.min(current,2),1)}% 起`:'0%';
    reason+=' 低于55分，优先控制风险；若趋势/数据质量未改善，不新增。';
  }else if(gap<0){
    action='回到目标仓位'; tone='warn'; size=`减 ${fmt(Math.min(Math.abs(gap),2),1)}%`;
    reason+=' 当前仓位高于目标，优先纠偏。';
  }else{
    action='持有/等待确认'; tone='neutral'; size='0%';
    reason+=' 分数或趋势尚不足以触发新增仓位。';
  }
  if(ch!=null && ch>3 && action==='分批加仓'){action='不追涨，等回踩'; tone='warn'; size='0%'; reason+=' 当日涨幅超过3%，取消追价。';}
  return {action,tone,size,reason};
}
function formatPlainPct(v){const x=n(v);return `${x>0?'+':''}${fmt(x,2)}%`;}
function etfOpportunityRank(e, gate=marketDecisionGate()){
  const score=n(e.score), r20=e.r20==null?null:n(e.r20), ch=e.change==null?null:n(e.change), gap=n(e.target)-n(e.current);
  let points=score;
  if(r20!=null) points += r20>0?Math.min(r20,10)*1.2:Math.max(r20,-10)*1.5;
  if(gap>0) points+=Math.min(gap,5)*2;
  if(ch!=null&&ch>3) points-=8; // 避免把单日急涨误判成追涨机会
  if(ch!=null&&ch<-3) points-=4;
  if(!e.marketDate) points-=30;
  if(n(gate.confidence)<50) points-=25;
  return points;
}
function renderDetailedEtfActions(){
  const gate=marketDecisionGate(), rows=[...(state.etfs||[])].sort((a,b)=>n(b.score)-n(a.score));
  if(!rows.length) return '<div class="table-note">ETF观察池为空，暂无逐标的建议。</div>';
  const ranked=[...rows].sort((a,b)=>etfOpportunityRank(b,gate)-etfOpportunityRank(a,gate));
  const opportunities=ranked.filter(e=>e.marketDate&&n(e.score)>=55).slice(0,5);
  const oppHtml=opportunities.length?opportunities.map((e,i)=>{const a=etfTodayAction(e,gate),r20=e.r20==null?'20日缺失':formatPlainPct(e.r20),ch=e.change==null?'日涨跌缺失':formatPlainPct(e.change),gap=n(e.target)-n(e.current);return `<div class="opportunity-item"><span class="opportunity-rank">${i+1}</span><div><strong>${esc(e.code)} · ${esc(e.name)}</strong><p>总分 ${fmt(e.score,1)} · 20日 ${esc(r20)} · 今日 ${esc(ch)} · 目标缺口 ${fmt(gap,1)}%。<b>${esc(a.action)}</b>：${esc(a.reason)}</p></div></div>`}).join(''):'<div class="table-note">当前没有满足数据与评分门槛的ETF机会，优先等待行情/评分改善。</div>';
  return `<section class="card opportunity-card"><div class="card-head"><div><h3>今日机会优先级 · 具体标的</h3><p>直接指出当前观察池中更值得先看的 ETF；按总分、20日趋势、仓位缺口、单日追涨风险和 Data Confidence 综合排序。</p></div>${tag(`${opportunities.length} 个候选`,opportunities.length?'good':'warn')}</div><div class="opportunity-list">${oppHtml}</div><div class="table-note">机会 ≠ 自动买入。Data Confidence &lt; 50 时即使进入候选榜，也只作为观察名单，不执行新增风险。个股模块尚未接入真实股票池，因此不会虚构个股名称。</div></section><section class="card detailed-action-card"><div class="card-head"><div><h3>今日逐 ETF 操作清单</h3><p>逐只给出动作、仓位变化和原因；日涨跌/20日收益严格使用 A 股惯例：涨红、跌绿。</p></div>${tag(gate.actionMode||'REFERENCE_ONLY',confidenceTone(gate.level))}</div><div class="table-wrap"><table class="data-table action-table"><thead><tr><th>ETF / 标的</th><th>日涨跌</th><th>20日收益</th><th>总分</th><th>目标 / 当前</th><th>今日动作</th><th>建议变化</th><th>执行依据</th></tr></thead><tbody>${rows.map(e=>{const a=etfTodayAction(e,gate);return `<tr><td><div class="table-main">${esc(e.code)} · ${esc(e.name)}</div><div class="table-sub">${esc(e.marketDate||'无有效行情日期')} · ${esc(e.life||'待确认')}</div></td><td>${e.change==null?'—':formatDelta(e.change)}</td><td>${e.r20==null?'—':formatDelta(e.r20)}</td><td>${tag(fmt(e.score,1),scoreType(e.score))}</td><td class="table-number">${fmt(n(e.target),1)}% / ${fmt(n(e.current),1)}%</td><td>${tag(a.action,a.tone)}</td><td><strong>${esc(a.size)}</strong></td><td><div class="action-reason">${esc(a.reason)}</div></td></tr>`}).join('')}</tbody></table></div></section>`;
}

function renderMarketActionPanel(page) {
  const d=state.nasdaq||{}, etfs=state.etfs||[];
  const gate=marketDecisionGate();
  const low=etfs.filter(x=>n(x.score)<55).length;
  const top=[...etfs].sort((a,b)=>n(b.score)-n(a.score))[0];
  const content={
    dashboard:['先核对真实持仓、现金缓冲与数据质量，再考虑增加风险预算。','当前净值与持仓尚非券商自动同步；行情刷新只更新公开市场字段，不会自动补齐人工风险指标。'],
    allocation:['先检查实际权重与动态目标的偏差，优先补足应急金和高质量短债缓冲。','VOO/QQQ与全球宽基存在成分重叠，调仓前核对账户、税务、费用、汇率与产品状态。'],
    nasdaq:[n(d.bubble)>=55||n(d.similarity)>=50?'维持或降低风险预算，暂不加杠杆，等待估值/趋势/波动率闸门改善。':n(d.entry)>=70?'核对趋势、波动率、信用与数据覆盖后，再按Core/Swing规则分批；杠杆默认关闭。':'以小额分批或观望为主，等待配置分与趋势确认。',`配置分 ${fmt(d.entry,1)}；AI泡沫 ${fmt(d.bubble,1)}；2000相似度 ${fmt(d.similarity,1)}。这些评分包含人工输入假设，行情更新不会验证所有宏观/盈利指标。`],
    ashare:[low?`先复核 ${low} 只低分ETF的趋势与数据质量，避免仅凭单一评分买入。`:top?`优先复核 ${top.code} 的趋势、成交与行业集中度，不把最高分直接当作买入指令。`:'先刷新行情并检查观察池字段是否完整，再决定是否交易。','当前公开源为最近可得日线/可能延迟数据；部分八维评分依赖人工输入，必须核验日期和来源。'],
    execution:['记录今日实际动作、触发条件、仓位变化和未执行原因；先核验数据再执行。','操作日志和行情更新时间分开统计；没有有效行情更新时保留旧快照，不把刷新失败视为零变化。']
  }[page]||['先检查最新数据与风险边界，再执行操作。','仅将已验证的来源和字段用于决策。'];
  const lastAttempt=state.meta?.lastRefreshAttempt||state.meta?.lastRefresh;
  const stamp=lastAttempt?new Date(lastAttempt).toLocaleString('zh-CN',{hour12:false}):'尚未成功拉取';
  const dates=[...(state.etfs||[]).map(x=>x.marketDate),state.nasdaq?.ndxDate,state.meta?.qqq?.date,state.meta?.voo?.date,state.meta?.gold?.date,state.meta?.btc?.date,state.meta?.globalStocks?.date].filter(Boolean).sort();
  const latestDataDate=dates.length?dates[dates.length-1]:'暂无可确认的行情日期';
  const refreshStatus=state.meta?.marketRefreshStatus;
  const status=refreshStatus==='SUCCESS'?'全量更新并通过校验':refreshStatus==='PARTIAL'?'部分更新（有缺项，需核验）':refreshStatus==='FAILED'?'更新失败，保留旧数据':state.meta?.lastRefresh?'历史刷新记录/状态未知':'当前为历史/演示快照';
  const lastSuccess=state.meta?.lastSuccessfulMarketRefreshAt?new Date(state.meta.lastSuccessfulMarketRefreshAt).toLocaleString('zh-CN',{hour12:false}):'尚无全量成功记录';
  const globalItems=[
    ['纳斯达克100',d.ndxDate,d.ndxSource,d.ndxUpdatedAt],['VIX波动率',d.vixDate,d.vixSource,d.vixUpdatedAt],['美国10年期收益率',d.us10yDate,d.us10ySource,d.us10yUpdatedAt],
    ['QQQ',state.meta?.qqq?.date,state.meta?.qqq?.source,state.meta?.qqq?.updatedAt],['VOO',state.meta?.voo?.date,state.meta?.voo?.source,state.meta?.voo?.updatedAt],
    ['黄金代理 GLD',state.meta?.gold?.date,state.meta?.gold?.source,state.meta?.gold?.updatedAt],['BTC',state.meta?.btc?.date,state.meta?.btc?.source,state.meta?.btc?.updatedAt],['全球股票 ACWI',state.meta?.globalStocks?.date,state.meta?.globalStocks?.source,state.meta?.globalStocks?.updatedAt]
  ];
  const provenance=`<details class="market-provenance-details"><summary>查看全球资产逐项行情日期 / 来源 / 拉取时间</summary><div class="market-provenance-grid">${globalItems.map(([name,date,source,updated])=>`<div class="market-provenance-item"><strong>${esc(name)}</strong><span>行情日期：${esc(date||'无有效日期 / 保留旧快照')}</span><span>来源：${esc(source||'尚无来源记录')}</span><span>成功拉取：${esc(updated?new Date(updated).toLocaleString('zh-CN',{hour12:false}):'尚无成功记录')}</span></div>`).join('')}</div></details>`;
  return `<section class="market-action-panel"><div class="market-action-top"><span class="eyebrow">AUTO DATA CHECK · TODAY'S ACTION</span><span class="market-updated">最近尝试：${esc(stamp)} · 最近全量成功：${esc(lastSuccess)} · 最新行情日期：${esc(latestDataDate)} · ${esc(status)}</span></div><div class="confidence-gate ${esc(gate.level.toLowerCase())}"><div><small>DATA CONFIDENCE</small><strong>${fmt(gate.confidence,0)}/100</strong></div><div><small>全球资产完整度</small><strong>${gate.globalValid||0}/${gate.globalTotal||8}</strong></div><div><small>关键因子</small><strong>${gate.criticalPassed||0}/${gate.criticalTotal||4}</strong></div><div><small>杠杆数据闸门</small><strong>${gate.leverageAllowed?'允许':'禁止'}</strong></div><p>${esc(gate.message||'')}</p></div><div class="market-action-grid"><div><small>今日操作建议</small><strong>${gate.actionMode==='REFERENCE_ONLY'?'数据可信度不足：暂停新增风险，仅保留基础/防守动作。':gate.actionMode==='DEFENSIVE'?'降低战术风险，禁止新增杠杆；先恢复关键数据。':esc(content[0])}</strong></div><div><small>依据 / 风险边界</small><p>${esc(content[1])}</p></div></div>${provenance}<div class="market-action-footer"><span>市场评分与数据可信度分离；缺失值不按0分处理</span><button class="btn btn-small btn-outline" data-action="refresh-market">立即刷新 ↻</button></div></section>${['dashboard','ashare','execution'].includes(page)?renderDetailedEtfActions():''}`;
}

function lineChart(points, title='demo') {
  const w=720,h=190,pad=16, min=Math.min(...points), max=Math.max(...points), range=max-min||1;
  const coords=points.map((v,i)=>({x:pad+i*(w-pad*2)/(points.length-1),y:h-pad-(v-min)/range*(h-pad*2)}));
  const d=coords.map((c,i)=>`${i?'L':'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area=`${d} L${coords[coords.length-1].x},${h-pad} L${coords[0].x},${h-pad} Z`;
  const labels=['-30D','-25D','-20D','-15D','-10D','-5D','NOW'];
  return `<svg class="line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${[.15,.38,.61,.84].map(y=>`<line x1="0" y1="${h*y}" x2="${w}" y2="${h*y}" stroke="var(--grid)" stroke-dasharray="3 5"/>`).join('')}<path d="${area}" fill="url(#chartFill)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${coords.filter((c,i)=>i===coords.length-1).map(c=>`<circle cx="${c.x}" cy="${c.y}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>`).join('')}${labels.map((l,i)=>`<text x="${pad+i*(w-pad*2)/(labels.length-1)}" y="${h-1}" fill="var(--muted)" font-size="11" font-family="DM Mono, monospace" text-anchor="${i===0?'start':i===labels.length-1?'end':'middle'}">${l}</text>`).join('')}</svg>`;
}
function allocationBars(rows, valueKey='target', max=100) {
  return `<div class="allocation-bars">${rows.slice(0,8).map(r=>{const val=n(r[valueKey]); return `<div class="allocation-row"><div class="allocation-name">${esc(r.name)}</div><div class="progress-track"><div class="progress-fill" style="width:${clamp(val,0,max)/max*100}%"></div></div><div class="allocation-pct">${fmt(val,1)}%</div></div>`;}).join('')}</div>`;
}
function averageScore() { const arr=state.globalAllocation||[]; return arr.length ? arr.reduce((s,r)=>s+n(r.score),0)/arr.length : 0; }
function tacticalMultiplier(score) { const x=n(score); return x>=80?1.25:x>=70?1.15:x>=56?1.08:x>=45?1:x>=35?.85:.7; }
function globalTargets() {
  const rows=state.globalAllocation||[];
  if(!rows.length) return [];
  const cash=rows.find(r=>r.group==='Cash');
  const overlay=state.profile.riskOverlay||'Caution';
  const avg=averageScore();
  let cashTarget=n(cash?.target,12)+(overlay==='Stress'?12:overlay==='Caution'?5:0)+(avg<45?3:avg>65?-2:0);
  cashTarget=clamp(cashTarget,5,30);
  const nonCash=rows.filter(r=>r.group!=='Cash');
  const raw=nonCash.map(r=>({row:r,raw:n(r.target)*tacticalMultiplier(r.score)}));
  const total=raw.reduce((s,x)=>s+x.raw,0)||1;
  const targetMap=new Map(raw.map(x=>[x.row.name,(100-cashTarget)*x.raw/total]));
  if(cash) targetMap.set(cash.name,cashTarget);
  return rows.map(r=>({...r,dynamicTarget:targetMap.get(r.name)??n(r.target)}));
}
function weightSum(rows,key) { return (rows||[]).reduce((s,r)=>s+n(r[key]),0); }
function riskOverlayText() { return state.profile.riskOverlay==='Stress'?'压力态：现金目标额外+12个百分点，暂停杠杆和追涨。':state.profile.riskOverlay==='Caution'?'谨慎态：现金目标额外+5个百分点，新风险敞口分批。':'正常态：趋势与广度稳定时按模型目标配置执行。'; }

function todayKey(date=new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset()*60000);
  return d.toISOString().slice(0,10);
}
function addDaysKey(days) { const d=new Date(); d.setDate(d.getDate()+days); return todayKey(d); }
function starterFocusTasks() {
  const now=new Date().toISOString();
  return [
    {id:'focus-global-'+Date.now(),title:'更新全球资产台账与应急金缺口',project:'全球配置',priority:'高',dueDate:addDaysKey(0),estimate:20,note:'先核对真实市值、必要月支出、负债和现金缓冲；目标比例只是起始假设。',done:false,createdAt:now,important:true},
    {id:'focus-ndx-'+Date.now(),title:'刷新纳指数据：泡沫分、2000 相似度与杠杆闸门',project:'纳指策略',priority:'高',dueDate:addDaysKey(0),estimate:15,note:'检查配置分、VIX、10Y、趋势和数据覆盖率；闸门不通过时不加杠杆。',done:false,createdAt:now,important:true},
    {id:'focus-etf-'+Date.now(),title:'复核 A 股 ETF 评分与缺失数据',project:'A股 ETF',priority:'高',dueDate:addDaysKey(0),estimate:20,note:'关注 MA20/MA60、市场广度、风险组上限、评分变化；缺失值不当作 0。',done:false,createdAt:now,important:true},
    {id:'focus-deliver-'+Date.now(),title:'完成一个可展示的 AI / 编程 / 内容交付',project:'内容/IP',priority:'中',dueDate:addDaysKey(0),estimate:45,note:'优先可运行、可复用、可被评价的成果，不只学习工具或追踪播放量。',done:false,createdAt:now,important:false},
    {id:'focus-compliance-'+Date.now(),title:'整理跨境账户、资金路径与税务居民核验清单',project:'跨境合规',priority:'高',dueDate:addDaysKey(2),estimate:30,note:'开境外账户不自动改变税务居民身份；没有明确合规资金路径就暂停对应操作。',done:false,createdAt:now,important:true},
    {id:'focus-ai-'+Date.now(),title:'复核 AI 订阅月费与实际 ROI',project:'AI工具',priority:'中',dueDate:addDaysKey(3),estimate:15,note:'记录使用次数、节省时间和可归因收入；连续 30 天没有使用或产出就取消/降级。',done:false,createdAt:now,important:false},
    {id:'focus-weekly-'+Date.now(),title:'周复盘：资产偏离、策略错误、主题重叠与下周三件事',project:'每日复盘',priority:'中',dueDate:addDaysKey(6),estimate:30,note:'每周更新执行分、目标/实际仓位、交易成本和项目进度；不要按单日波动推翻长期配置。',done:false,createdAt:now,important:false},
    {id:'focus-health-'+Date.now(),title:'完成英语输出、力量训练与睡眠记录',project:'健康/学习',priority:'中',dueDate:addDaysKey(6),estimate:25,note:'试运行目标：英语输出 180 分钟/周、力量训练 3 次/周、平均睡眠 8 小时/天。',done:false,createdAt:now,important:false}
  ];
}
function focusTasks() { if(!Array.isArray(state.focusTasks)) state.focusTasks=[]; state.focusTasks.forEach((t,i)=>{if(t.startDate===undefined)t.startDate=t.dueDate||'';if(t.sortOrder===undefined)t.sortOrder=t.startDate?dayDiff('2000-01-01',t.startDate)*1000+i:999999000+i;}); return state.focusTasks; }
function focusTaskFilter(view) {
  const rows=focusTasks(),today=todayKey(),week=addDaysKey(7);
  if(view==='home') return rows.filter(t=>{const start=t.startDate||t.dueDate||'',end=t.dueDate||start;const active=!start||start<=today&&end>=today;const overdue=!!end&&end<today;return (active||overdue)&&(!t.done||t.dueDate===today);});
  if(view==='inbox') return rows.filter(t=>t.project==='收集箱'||!t.dueDate);
  if(view==='upcoming') return rows.filter(t=>!t.done&&t.dueDate>today&&t.dueDate<=week);
  if(view==='important') return rows.filter(t=>!t.done&&(t.important||t.priority==='高'));
  return rows;
}
function focusTaskCount(view) { return focusTaskFilter(view).filter(t=>!t.done).length; }
function updateFocusCounts() {
  const all={home:focusTaskCount('home'),inbox:focusTaskCount('inbox'),upcoming:focusTaskCount('upcoming'),important:focusTaskCount('important'),alltasks:focusTaskFilter('alltasks').filter(t=>!t.done).length,calendar:focusTasks().filter(t=>{const s=t.startDate||t.dueDate,e=t.dueDate||s;return !t.done&&s&&e&&s<=getWeekDates(ui.calendarWeekOffset||0)[6].date&&e>=getWeekDates(ui.calendarWeekOffset||0)[0].date;}).length,matrix:focusTasks().filter(t=>!t.done).length,stats:focusTasks().length};
  for(const [key,value] of Object.entries(all)){const el=$('#'+({home:'homeCount',inbox:'inboxCount',upcoming:'upcomingCount',important:'importantCount',alltasks:'allTasksCount',calendar:'calendarCount',matrix:'matrixCount',stats:'statsCount'}[key]));if(el)el.textContent=value;}
}
function taskPriorityClass(priority) { return priority==='高'?'priority-high':priority==='中'?'priority-medium':'priority-low'; }
function taskDueLabel(t) {
  if(!t.dueDate) return '未安排日期';
  const today=todayKey();
  if(t.dueDate<today&&!t.done) return `已逾期 · ${t.dueDate}`;
  if(t.startDate&&t.dueDate&&t.startDate<t.dueDate) return `${t.startDate} → ${t.dueDate}`;
  if(t.dueDate===today) return '今天';
  if(t.dueDate===addDaysKey(1)) return '明天';
  return t.dueDate;
}
function renderFocusTaskRows(view) {
  const query=(ui.focusQuery||'').trim().toLowerCase();
  const rows=focusTaskFilter(view).filter(t=>!query||[t.title,t.project,t.note,t.priority].join(' ').toLowerCase().includes(query)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||({'高':0,'中':1,'低':2}[a.priority]??3)-({'高':0,'中':1,'低':2}[b.priority]??3));
  if(!rows.length) return `<div class="task-empty"><span class="empty-spark">✳</span><strong>${query?'没有匹配的任务':'这一区域暂时没有任务'}</strong><p>${query?'试试任务名称、模块或备注。':'先添加一项任务，把想法变成下一步行动。'}</p><button class="btn btn-outline" data-action="${query?'clear-task-search':'focus-add-focus'}">${query?'清除搜索':'添加任务'}</button></div>`;
  return rows.map((t,i)=>`<article class="focus-task-row ${t.done?'is-done':''}" data-focus-task-row="${esc(t.id)}" style="--task-i:${Math.min(i,12)}">
    <button class="focus-check ${t.done?'checked':''}" data-action="toggle-focus-task" data-id="${esc(t.id)}" aria-label="${t.done?'标记未完成':'完成任务'}">${t.done?'✓':''}</button>
    <div class="focus-task-copy"><div class="focus-task-title">${esc(t.title)}</div><div class="focus-task-meta"><span class="project-chip">${esc(t.project||'收集箱')}</span><span class="task-due ${t.dueDate<todayKey()&&!t.done?'overdue':''}">${esc(taskDueLabel(t))}</span><span>◷ ${Math.max(0,n(t.estimate,0))}m</span><span class="priority-label ${taskPriorityClass(t.priority)}">${esc(t.priority||'低')}优先级</span></div>${t.note?`<p class="focus-task-note">${esc(t.note)}</p>`:''}</div>
    <button class="task-star ${t.important?'starred':''}" data-action="toggle-focus-important" data-id="${esc(t.id)}" title="${t.important?'取消重要':'标记重要'}">${t.important?'★':'☆'}</button>
    <button class="task-edit" data-action="edit-focus-task" data-id="${esc(t.id)}" title="编辑任务">↗</button>
    <button class="task-delete" data-action="delete-focus-task" data-id="${esc(t.id)}" title="删除任务">×</button>
  </article>`).join('');
}
function openFocusTaskEditor(task) {
  let root=$('#focusTaskModal');
  if(!root){root=document.createElement('div');root.id='focusTaskModal';root.className='focus-modal-wrap';document.body.appendChild(root);}
  root.innerHTML=`<div class="focus-modal-backdrop" data-action="close-focus-modal"></div><section class="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focusEditTitle"><div class="focus-modal-head"><div><div class="eyebrow">TASK DETAILS</div><h2 id="focusEditTitle">编辑任务</h2></div><button class="task-delete" data-action="close-focus-modal" aria-label="关闭">×</button></div><form id="focusTaskEditForm" data-id="${esc(task.id)}" class="focus-task-form"><label class="field-label">任务内容<input id="focusEditName" required maxlength="180" value="${esc(task.title)}" /></label><label class="field-label">所属模块<select id="focusEditProject">${['收集箱','全球配置','纳指策略','A股 ETF','新登配置','跨境合规','AI工具','内容/IP','健康/学习','每日复盘'].map(x=>`<option ${task.project===x?'selected':''}>${x}</option>`).join('')}</select></label><div class="composer-two"><label class="field-label">起始日期<input id="focusEditStart" type="date" value="${esc(task.startDate||task.dueDate||'')}" /></label><label class="field-label">截止日期<input id="focusEditDue" type="date" value="${esc(task.dueDate||task.startDate||'')}" /></label></div><div class="composer-two"><label class="field-label">优先级<select id="focusEditPriority">${['高','中','低'].map(x=>`<option ${task.priority===x?'selected':''}>${x}</option>`).join('')}</select></label></div><div class="composer-two"><label class="field-label">预计分钟<input id="focusEditEstimate" type="number" min="0" max="1440" value="${Math.max(0,n(task.estimate,25))}" /></label><label class="field-label check-inline"><input id="focusEditImportant" type="checkbox" ${task.important?'checked':''}/> 标记重要</label></div><label class="field-label">备注 / 完成标准<textarea id="focusEditNote" rows="4">${esc(task.note||'')}</textarea></label><div class="button-row"><button class="btn btn-primary" type="submit">保存修改</button><button class="btn btn-quiet" type="button" data-action="close-focus-modal">取消</button></div></form></section>`;
  setTimeout(()=>$('#focusEditName')?.focus(),0);
}
function renderTaskWorkspace(view) {
  const title={home:'今日任务',inbox:'今日任务',upcoming:'未来 7 天',important:'重要事项',alltasks:'全部任务'}[view]||'任务';
  const subtitle={home:'把投资研究、系统建设和个人成长拆成今天可以完成的动作。',inbox:'先快速收集，再分配模块、优先级和日期。',upcoming:'提前看一周任务，避免资产复盘和长期建设互相挤占。',important:'优先处理高优先级、明确风险或合规依赖的事项。',alltasks:'搜索、完成、标记重点或清理所有工作项。'}[view]||'';
  const open=focusTaskFilter(view).filter(t=>!t.done).length;
  return `${sectionHead('TICKFLOW · TASK MANAGEMENT',title,subtitle,`<button class="btn btn-outline" data-action="go-page" data-page="home">⌂ 今日</button><button class="btn btn-primary" data-action="focus-add-focus">＋ 添加任务</button>`)}
    <div class="task-toolbar"><div class="task-filter-pills">${[['home','今天'],['inbox','收集箱'],['upcoming','未来7天'],['important','重要'],['alltasks','全部']].map(([key,label])=>`<button class="filter-pill ${view===key?'selected':''}" data-action="go-page" data-page="${key}">${label}<span>${focusTaskCount(key)}</span></button>`).join('')}</div><label class="task-search"><span>⌕</span><input id="focusSearch" type="search" placeholder="搜索任务、模块或备注…" value="${esc(ui.focusQuery||'')}" /><kbd>/</kbd></label></div>
    <div class="task-content-grid"><section class="card task-list-card">${cardHead(title,`${open} 项待完成 · 完成状态自动保存到账户工作区`,tag(`${open} OPEN`,open?'good':'neutral'))}<div class="card-body task-list-body"><div id="focusTaskList">${renderFocusTaskRows(view)}</div></div></section><aside class="card task-add-card">${cardHead('快速添加','设置日期、优先级和所属模块')}<div class="card-body"><form id="focusTaskForm" class="focus-task-form"><label class="field-label">任务内容<input id="focusTaskTitle" maxlength="180" required placeholder="例如：复核 QQQ 的目标仓位" /></label><label class="field-label">所属模块<select id="focusTaskProject">${['收集箱','全球配置','纳指策略','A股 ETF','新登配置','跨境合规','AI工具','内容/IP','健康/学习','每日复盘'].map(x=>`<option ${x===(view==='inbox'?'收集箱':'每日复盘')?'selected':''}>${x}</option>`).join('')}</select></label><div class="composer-two"><label class="field-label">起始日期<input id="focusTaskStart" type="date" value="${todayKey()}" /></label><label class="field-label">截止日期<input id="focusTaskDue" type="date" value="${todayKey()}" /></label></div><div class="composer-two"><label class="field-label">优先级<select id="focusTaskPriority"><option>高</option><option selected>中</option><option>低</option></select></label></div><div class="composer-two"><label class="field-label">预计分钟<input id="focusTaskEstimate" type="number" min="0" max="1440" value="25" /></label><label class="field-label check-inline"><input id="focusTaskImportant" type="checkbox" /> 标记重要</label></div><label class="field-label">备注 / 完成标准<textarea id="focusTaskNote" rows="3" placeholder="记录触发条件、证据或退出标准…"></textarea></label><button class="btn btn-primary btn-full" type="submit">添加到工作清单 <span>↗</span></button></form></div></aside></div>`;
}
function renderPomodoro() {
  const seconds=focusClock.running&&focusClock.endsAt?Math.max(0,Math.ceil((focusClock.endsAt-Date.now())/1000)):focusClock.remaining;
  const mins=String(Math.floor(seconds/60)).padStart(2,'0'),secs=String(seconds%60).padStart(2,'0');
  return `<section class="card pomodoro-card"><div class="card-head"><div><h3>专注时间</h3><p>把一段时间留给一个明确交付</p></div><span class="pomodoro-mark">25 / 05</span></div><div class="card-body pomodoro-body"><div class="pomodoro-face"><div class="pomodoro-orbit"></div><strong id="pomodoroDisplay">${mins}:${secs}</strong><span>${focusClock.running?'专注进行中':'25 分钟专注'}</span></div><div class="pomodoro-actions"><button class="btn btn-primary" data-action="pomodoro-toggle">${focusClock.running?'Ⅱ 暂停':'▶ 开始专注'}</button><button class="btn btn-quiet" data-action="pomodoro-reset">↺ 重置</button></div><p class="pomodoro-tip">建议用一轮时间处理深度研究/代码交付，休息 5 分钟后再决定是否继续。</p></div></section>`;
}
function renderHabits() {
  const key=todayKey(), checks=state.habitChecks[key]||{};
  const habits=[['english','英语输出','每周目标 180 分钟','文'],['training','力量训练','每周目标 3 次','练'],['delivery','AI / 编程交付','今天至少一个可展示产出','作'],['sleep','睡眠与恢复','记录睡眠，保护主线节奏','眠']];
  const done=habits.filter(h=>checks[h[0]]).length;
  return `<section class="card">${cardHead('习惯与系统打卡','连续可重复，比一次性冲刺更重要',tag(`${done}/${habits.length}`))}<div class="card-body habit-list">${habits.map(h=>`<button class="habit-row ${checks[h[0]]?'habit-checked':''}" data-action="toggle-habit" data-habit="${h[0]}"><span class="habit-icon">${h[3]}</span><span class="habit-copy"><strong>${h[1]}</strong><small>${h[2]}</small></span><span class="habit-check">${checks[h[0]]?'✓':''}</span></button>`).join('')}<div class="habit-progress"><span style="width:${done/habits.length*100}%"></span></div><p class="micro-copy">按本地日期记录，刷新后仍保存在当前用户工作区。</p></div></section>`;
}
function getWeekDates(offset=0) {
  const base=new Date();base.setHours(12,0,0,0);const mondayShift=(base.getDay()+6)%7;base.setDate(base.getDate()-mondayShift+offset*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return {date:todayKey(d),day:d.getDate(),weekday:['一','二','三','四','五','六','日'][i],isToday:todayKey(d)===todayKey(),month:d.getMonth()+1};});
}
function renderCalendar() {
  const days=getWeekDates(ui.calendarWeekOffset||0),start=days[0].date,end=days[6].date;
  const dated=focusTasks().filter(t=>{const s=t.startDate||t.dueDate,e=t.dueDate||s;return s&&e&&s<=end&&e>=start;});
  const sorted=[...dated].sort((a,b)=>n(a.sortOrder,999999999)-n(b.sortOrder,999999999)||(a.startDate||a.dueDate).localeCompare(b.startDate||b.dueDate)||({'高':0,'中':1,'低':2}[a.priority]??3)-({'高':0,'中':1,'低':2}[b.priority]??3));
  const lanes=[];
  const events=sorted.map(t=>{
    const st=t.startDate||t.dueDate, en=t.dueDate||st;
    const visStart=st<start?start:st, visEnd=en>end?end:en;
    const si=Math.max(0,dayDiff(start,visStart)), ei=Math.min(6,dayDiff(start,visEnd));
    let lane=0; while(lanes[lane]!==undefined && lanes[lane]>=si) lane++;
    lanes[lane]=ei;
    return {task:t,lane,si,ei,st,en,span:Math.max(1,ei-si+1),starts:st>=start,ends:en<=end};
  });
  const lanesCount=Math.max(1,lanes.length);
  const done=dated.filter(t=>t.done).length;
  const picked=ui.calendarSelectedDate&&ui.calendarSelectedDate>=start&&ui.calendarSelectedDate<=end?ui.calendarSelectedDate:todayKey();
  const composer=ui.showCalendarComposer?`<section class="card calendar-composer-card" style="margin-top:14px">${cardHead('从周历添加任务','在这里创建任务，不必返回收集箱；设置起止日期即可跨多日显示')}<div class="card-body"><form id="calendarTaskForm" class="calendar-task-form"><label class="field-label">任务内容<input id="calendarTaskTitle" required maxlength="180" placeholder="例如：整理全球资产配置与跨境税务问题清单" /></label><div class="calendar-task-fields"><label class="field-label">所属模块<select id="calendarTaskProject">${['收集箱','全球配置','纳指策略','A股 ETF','新登配置','跨境合规','AI工具','内容/IP','健康/学习','每日复盘'].map(x=>`<option ${x==='收集箱'?'selected':''}>${x}</option>`).join('')}</select></label><label class="field-label">四象限<select id="calendarTaskQuadrant"><option value="do">立即处理 · 重要且紧急</option><option value="plan">计划推进 · 重要不紧急</option><option value="schedule">快速完成/协调 · 紧急低重要</option><option value="later" selected>稍后/收集箱 · 其他</option></select></label><label class="field-label">起始日期<input id="calendarTaskStart" type="date" required value="${esc(picked)}" /></label><label class="field-label">截止日期<input id="calendarTaskEnd" type="date" required value="${esc(picked)}" /></label><label class="field-label">优先级<select id="calendarTaskPriority"><option>高</option><option selected>中</option><option>低</option></select></label><label class="field-label">预计分钟<input id="calendarTaskEstimate" type="number" min="0" max="1440" value="25" /></label><label class="field-label check-inline"><input id="calendarTaskImportant" type="checkbox" /> 标记重要</label></div><label class="field-label">备注 / 完成标准<textarea id="calendarTaskNote" rows="2" placeholder="补充交付物、触发条件或风险边界…"></textarea></label><div class="button-row"><button type="submit" class="btn btn-primary">添加到周历</button><button type="button" class="btn btn-quiet" data-action="calendar-toggle-create">收起</button></div></form></div></section>`:'';
  const headers=days.map((d,i)=>`<div class="calendar-day-header ${d.isToday?'is-current-day':''}" style="grid-column:${i+1};grid-row:1" data-calendar-date="${d.date}" data-action="calendar-drop-date"><span>${d.weekday}</span><strong>${d.day}</strong><small>${d.month}月</small><button class="calendar-header-add" data-action="calendar-add-day" data-date="${d.date}" title="在这天添加任务">＋</button></div>`).join('');
  const backgrounds=days.map((d,i)=>`<div class="calendar-day-bg ${d.isToday?'is-current-day':''}" style="grid-column:${i+1};grid-row:2 / span ${lanesCount}" data-calendar-date="${d.date}" data-action="calendar-drop-date"></div>`).join('');
  const bars=events.map(({task,lane,si,ei,span,st,en,starts,ends})=>{
    const classes=`calendar-event ${task.done?'is-done':''} ${taskPriorityClass(task.priority)} ${starts?'is-start':'is-continuation'} ${ends?'is-end':'is-continuation'} ${span>1?'is-multi-day':''}`;
    const dateLabel=st===en?st:`${st} → ${en}`;
    return `<article class="${classes}" draggable="true" data-calendar-event="${esc(task.id)}" data-task-id="${esc(task.id)}" data-start="${esc(st)}" data-end="${esc(en)}" style="grid-column:${si+1} / span ${span};grid-row:${lane+2}" title="${esc(task.title)} · ${dateLabel} · 拖动任务可移动，拖动右端可调整结束日，拖放到任务上可排序"><button class="calendar-event-check" data-action="toggle-focus-task" data-id="${esc(task.id)}">${task.done?'✓':'○'}</button><button class="calendar-event-title" data-action="edit-focus-task" data-id="${esc(task.id)}">${esc(task.title)}</button><span class="calendar-event-project">${esc(task.project||'收集箱')} · ${esc(dateLabel)}</span>${ends?`<button class="calendar-event-resize" data-resize-task="${esc(task.id)}" title="拖动调整结束日期" aria-label="拖动调整结束日期"><span></span></button>`:''}</article>`;
  }).join('');
  return `${sectionHead('TICKFLOW · CALENDAR','周历 / 日程','任务以跨日时间条显示。可在日历内新增任务、编辑起止日期、拖动到其他日期、拖动右侧把手延长/缩短日期范围，并把任务拖到另一任务上调整顺序。',`<button class="btn btn-outline" data-action="calendar-prev">← 上一周</button><button class="btn btn-outline" data-action="calendar-this">本周</button><button class="btn btn-outline" data-action="calendar-next">下一周 →</button><button class="btn btn-primary" data-action="calendar-toggle-create">＋ 添加任务</button>`,'h2')}
    <div class="calendar-summary"><span><b>${start}</b> — <b>${end}</b></span><span>${dated.filter(t=>!t.done).length} 项待办 · ${done} 项已完成 · ${events.filter(x=>x.span>1).length} 个跨日实例</span><span class="calendar-legend"><i class="legend-grab">⠿</i>拖动移动/排序 <i class="legend-resize">↔</i>拖动右边缘跨日</span></div>
    <div class="calendar-board-scroll"><div class="week-calendar-board" id="weekCalendarBoard" style="--lane-count:${lanesCount};--calendar-cols:7">${headers}${backgrounds}${bars}</div></div>
    <div class="calendar-quick-dates">${days.map(d=>`<button class="calendar-date-quick ${picked===d.date?'selected':''}" data-action="calendar-pick-date" data-date="${d.date}">${d.weekday} ${d.month}/${d.day} <span>＋</span></button>`).join('')}</div>
    ${composer}
`;
}

function renderMatrix() {
  const today=todayKey(),tomorrow=addDaysKey(1),rows=focusTasks().filter(t=>!t.done);
  const buckets=[
    {id:'do',title:'立即处理',subtitle:'重要 + 紧急',tone:'matrix-red',test:t=>(t.important||t.priority==='高')&&t.dueDate&&t.dueDate<=tomorrow,action:'先处理风险、合规和关键依赖。'},
    {id:'plan',title:'计划推进',subtitle:'重要 + 不紧急',tone:'matrix-green',test:t=>(t.important||t.priority==='高')&&(!t.dueDate||t.dueDate>tomorrow),action:'安排深度工作时间，不等到截止日前才行动。'},
    {id:'schedule',title:'快速完成 / 协调',subtitle:'紧急 + 低重要性',tone:'matrix-amber',test:t=>!(t.important||t.priority==='高')&&t.dueDate&&t.dueDate<=tomorrow,action:'缩小任务范围，必要时拆分或协调。'},
    {id:'later',title:'稍后 / 收集箱',subtitle:'其他任务',tone:'matrix-muted',test:t=>!((t.important||t.priority==='高')&&t.dueDate&&t.dueDate<=tomorrow)&&!((t.important||t.priority==='高')&&(!t.dueDate||t.dueDate>tomorrow))&&!( !(t.important||t.priority==='高')&&t.dueDate&&t.dueDate<=tomorrow),action:'避免让低价值事项占据黄金时间。'}
  ];
  return `${sectionHead('TICKFLOW · EISENHOWER MATRIX','任务四象限','将优先级、重要标记和截止日组合成行动顺序；这是任务管理辅助，不代替投资风控规则。','','h2')}
    <div class="matrix-grid">${buckets.map(b=>{const items=rows.filter(t=>t.quadrant? t.quadrant===b.id : b.test(t));return `<section class="matrix-card ${b.tone}"><div class="matrix-card-head"><div><span>${b.subtitle}</span><h3>${b.title}</h3></div><strong>${items.length}</strong></div><p>${b.action}</p><div class="matrix-task-list">${items.length?items.map(t=>`<div class="matrix-task"><button data-action="toggle-focus-task" data-id="${esc(t.id)}">○</button><button class="matrix-task-title" data-action="edit-focus-task" data-id="${esc(t.id)}">${esc(t.title)}</button><small>${esc(t.project||'收集箱')} · ${esc(taskDueLabel(t))}</small></div>`).join(''):'<div class="week-empty">暂无任务</div>'}</div></section>`;}).join('')}</div>`;
}
function renderFocusStats() {
  const tasks=focusTasks(),done=tasks.filter(t=>t.done).length,open=tasks.length-done,completion=tasks.length?done/tasks.length*100:0;
  const projects=[...new Set(tasks.map(t=>t.project||'收集箱'))].map(project=>({project,all:tasks.filter(t=>(t.project||'收集箱')===project).length,done:tasks.filter(t=>(t.project||'收集箱')===project&&t.done).length})).sort((a,b)=>b.all-a.all);
  const todayDone=tasks.filter(t=>t.done&&t.completedAt&&t.completedAt.slice(0,10)===todayKey()).length;
  return `${sectionHead('TICKFLOW · STATISTICS','执行统计','查看任务完成情况和投入在哪些项目模块；此处统计的是当前工作区任务，不代表投资收益表现。',`<button class="btn btn-outline" data-action="go-page" data-page="home">返回今日工作台 →</button>`)}
    <div class="home-kpi-grid stats-kpis"><div class="home-kpi"><span>全部任务</span><strong>${tasks.length}<small> 项</small></strong><p>当前用户工作区中的任务总量</p></div><div class="home-kpi"><span>待完成</span><strong>${open}<small> 项</small></strong><p>包括后续计划与收集箱</p></div><div class="home-kpi"><span>完成率</span><strong>${fmt(completion,0)}<small>%</small></strong><p>完成数 / 总任务数</p></div><div class="home-kpi"><span>今日完成</span><strong>${todayDone}<small> 项</small></strong><p>仅统计含完成时间的任务</p></div></div>
    <div class="grid grid-2"><section class="card">${cardHead('总体进度','按当前工作区任务数量计算')}<div class="card-body"><div class="stats-big-number">${fmt(completion,1)}%</div><div class="habit-progress stats-progress"><span style="width:${completion}%"></span></div><div class="stats-legend"><span><i class="stats-dot done"></i>已完成 ${done}</span><span><i class="stats-dot open"></i>待完成 ${open}</span></div><p class="micro-copy">完成任务可以反悔恢复；删除任务会移除记录。建议每周复盘时整理过期或失效任务。</p></div></section>
    <section class="card">${cardHead('按模块分布','哪些领域占据当前任务池')}<div class="card-body">${projects.map(p=>`<div class="stats-project-row"><div><strong>${esc(p.project)}</strong><small>${p.done}/${p.all} 已完成</small></div><div class="stats-project-bar"><span style="width:${p.all? p.done/p.all*100:0}%"></span></div><b>${p.all}</b></div>`).join('')||'<p class="micro-copy">添加任务后此处会显示分布。</p>'}</div></section></div>`;
}
function renderAttentionCards() {
  const nd=state.nasdaq||{}, targets=globalTargets(), cash=targets.find(r=>r.group==='Cash')?.dynamicTarget||state.profile.cashTarget||17;
  const today=todayKey();
  const todayRows=focusTaskFilter('home').filter(t=>!t.done);
  const overdue=todayRows.filter(t=>t.dueDate&&t.dueDate<today).length;
  const dueToday=todayRows.filter(t=>t.dueDate===today).length;
  const allToday=focusTaskFilter('home'), doneToday=allToday.filter(t=>t.done).length;
  const completion=allToday.length?Math.round(doneToday/allToday.length*100):0;
  const ringDash=(completion/100*150.8).toFixed(1);
  const estimated=todayRows.reduce((sum,t)=>sum+n(t.estimate,0),0);
  const priorityRank={高:0,中:1,低:2};
  const lead=[...todayRows].sort((a,b)=>{
    const ao=a.dueDate&&a.dueDate<today?0:1, bo=b.dueDate&&b.dueDate<today?0:1;
    return ao-bo || (priorityRank[a.priority]??3)-(priorityRank[b.priority]??3) || String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')) || String(a.sortOrder||0).localeCompare(String(b.sortOrder||0));
  })[0];
  const remaining=[...todayRows].filter(t=>t!==lead).sort((a,b)=>{
    const ao=a.dueDate&&a.dueDate<today?0:1, bo=b.dueDate&&b.dueDate<today?0:1;
    return ao-bo || (priorityRank[a.priority]??3)-(priorityRank[b.priority]??3) || String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));
  }).slice(0,3);
  const done=(state.tasks||[]).filter(t=>t.status==='已完成').length, roadmap=state.tasks||[];
  const top=[...(state.etfs||[])].sort((a,b)=>n(b.score)-n(a.score)).slice(0,1)[0];
  const weak=(state.etfs||[]).filter(e=>n(e.score)<55).length;
  const p0=roadmap.filter(t=>t.priority==='P0'&&t.status!=='已完成').length;
  const leverage=['L1','L2'].includes(nd.leverageLevel)&&nd.leverageEnabled===true;
  const cards=[
    {key:'GLOBAL ALLOCATION',scope:'market',title:'全球资产配置',value:`现金目标 ${fmt(cash,1)}%`,status:state.profile.riskOverlay||'Caution',tone:(state.profile.riskOverlay||'Caution')==='Caution'?'warn':'good',desc:'先核对真实持仓、应急金与负债；比较动态目标和实际比例差额。',page:'allocation',cta:'查看配置'},
    {key:'NASDAQ / AI RISK',scope:'market',title:'纳指风险与入场',value:`配置 ${fmt(nd.entry,1)} · 泡沫 ${fmt(nd.bubble,1)}`,status:leverage?'通过部分闸门':'默认不加杠杆',tone:n(nd.bubble)>=55?'warn':'good',desc:'盯住 2000 相似度、AI CapEx/FCF、VIX、10Y、趋势与回撤触发；Core 不做波段。',page:'nasdaq',cta:'查看纳指策略'},
    {key:'A-SHARE ETF ROTATION',scope:'market',title:'A 股 ETF 轮动',value:`${state.etfs?.length||0} 只观察 · ${weak} 只低于55分`,status:top?`领先 ${top.code} / ${fmt(top.score,1)}分`:'待更新',tone:weak?'warn':'good',desc:'复核 MA20/MA60、评分质量、市场广度和风险组上限。',page:'ashare',cta:'查看 ETF 池'},
    {key:'90-DAY BUILD',scope:'exec',title:'新登 90 天项目',value:`${done}/${roadmap.length} 个里程碑完成`,status:p0?'下一里程碑待推进':'项目节奏正常',tone:p0?'warn':'good',desc:'这是项目进度，不计入“今天”的任务账；今天要做什么以左侧主卡为准。',page:'newconfig',cta:'打开项目路线'},
    {key:'GLOBAL OPTIONALITY',scope:'exec',title:'跨境 / AI 订阅 / 技能',value:`AI 月费 ${money(state.profile.aiMonthlyCost||0)}`,status:'先核验收益与合规',tone:'neutral',desc:'跟踪全球银行/券商、保险、居留/签证、公司与房产的真实用途及维护成本。',page:'newconfig',cta:'查看基础设施'}
  ];
  let watchOrder=[];
  try { watchOrder=JSON.parse(localStorage.getItem('wealth-os-watch-order')||'[]'); } catch(_) {}
  const rest=[...cards].sort((a,b)=>{
    const ia=watchOrder.indexOf(a.key), ib=watchOrder.indexOf(b.key);
    return (ia<0?999:ia)-(ib<0?999:ib);
  });
  const dueText=!lead?'':lead.dueDate?(lead.dueDate<today?`逾期 ${Math.max(1,Math.round((new Date(today)-new Date(lead.dueDate))/86400000))} 天`:lead.dueDate===today?'今天到期':`截止 ${lead.dueDate}`):'未排期';
  const leadTone=lead&&lead.dueDate&&lead.dueDate<today?'warn':'good';
  const leadBlock=lead?`
      <div class="feature-kicker"><span>今天先做</span><span>01 / ${String(todayRows.length).padStart(2,'0')}</span></div>
      <h2>${esc(lead.title)}</h2>
      <div class="feature-value">${overdue} 件逾期 · ${dueToday} 件今天到期</div>
      <div class="feature-status"><span class="attention-status ${leadTone}">${esc(lead.project||'任务')}</span><span class="feature-source">${dueText}</span></div>
      <p class="feature-desc">${esc(lead.note||'先完成这一件，再处理其余关注；不要把项目进度当成今天的任务。')}</p>
      ${remaining.length?`<div class="feature-queue"><div class="feature-queue-head"><span>接下来</span><span>${String(remaining.length).padStart(2,'0')}</span></div>${remaining.map(t=>`<div class="feature-queue-row"><span>${esc(t.title)}</span><span>${t.dueDate||'未排期'}</span></div>`).join('')}</div>`:''}
      <button class="feature-link" data-action="go-page" data-page="today">打开执行清单 <span>↗</span></button>`:`
      <div class="feature-kicker"><span>今天先做</span><span>00 / 00</span></div>
      <h2>今天还没有任务</h2>
      <div class="feature-value">从第一件开始</div>
      <div class="feature-status"><span class="attention-status good">执行 · 空清单</span><span class="feature-source">今天</span></div>
      <p class="feature-desc">先添加第一件今天要做的事；也可以从 90 天项目里挑一个最小动作。</p>
      <button class="feature-link" data-action="go-page" data-page="today">打开执行清单 <span>↗</span></button>`;
  return `<div class="home-stat-row" aria-label="今日执行概览">
    <div class="home-stat home-stat-progress"><div class="home-ring" aria-hidden="true"><svg viewBox="0 0 56 56"><circle class="home-ring-track" cx="28" cy="28" r="24"/><circle class="home-ring-progress" cx="28" cy="28" r="24" stroke-dasharray="${ringDash} 150.8"/></svg><span>${completion}%</span></div><div><small>今日完成</small><strong>${doneToday} <em>/ ${allToday.length}</em></strong></div></div>
    <div class="home-stat"><small>待完成</small><strong>${todayRows.length}</strong><span>件任务</span></div>
    <div class="home-stat"><small>逾期</small><strong class="${overdue?'is-warn':''}">${overdue}</strong><span>件</span></div>
    <div class="home-stat"><small>预计投入</small><strong>${estimated}</strong><span>分钟</span></div>
  </div>
  <div class="attention-section-head"><div><h2>今日关注</h2><p>先做一件今天的事；市场与项目状态放在右侧索引。</p></div>
  <div class="attention-tools"><button class="btn btn-quiet" data-action="go-page" data-page="today">全部任务 →</button><button class="btn btn-quiet" data-action="go-page" data-page="dashboard">资产总览 →</button></div></div>
  <div class="home-editorial">
    <article class="home-feature tone-${leadTone}">
      ${leadBlock}
    </article>
    <aside class="home-watch">
      <div class="watch-head"><span>状态索引</span><span>${String(rest.length).padStart(2,'0')}</span></div>
      ${rest.map((c,i)=>`<button class="watch-row" data-action="go-page" data-page="${c.page}" data-watch-key="${esc(c.key)}" draggable="false"><span class="watch-index">${String(i+1).padStart(2,'0')}</span><span class="watch-copy"><b>${c.title}</b><small>${c.value}</small></span><span class="watch-status"><i class="attention-light ${c.tone}"></i>${esc(c.status)}</span><span class="watch-arrow">↗</span></button>`).join('')}
    </aside>
  </div>`;
}
const AGENT_DEFS = [
 {id:'work',name:'工作角色',role:'计划 · 任务 · 项目推进',page:'home',energy:22,accent:'#8cb8ff',meaning:'推进力',balance:'把目标拆成今天可完成的动作，但不让工作吞掉恢复。',risk:'失衡信号：所有时间都被工作占满。'},
 {id:'invest',name:'投资角色',role:'行情 · 风险 · 资产配置',page:'dashboard',energy:24,accent:'#b9ef73',meaning:'风险预算',balance:'先活着，再复利；收益焦虑不能绑架生活节奏。',risk:'失衡信号：频繁看盘、追涨、加杠杆。'},
 {id:'travel',name:'旅行角色',role:'行程 · 签证 · 目的地',page:'newconfig',energy:8,accent:'#8cb7e8',meaning:'选择权',balance:'用真实移动扩展生活半径；不是逃避，是校准。',risk:'失衡信号：只收藏目的地，不核验签证与资金路径。'},
 {id:'health',name:'健康角色',role:'健身 · 饮食 · 皮肤管理',page:'health',energy:18,accent:'#f2b65f',meaning:'底盘',balance:'睡眠、训练、饮食决定其他角色的续航；所有产出的前提。',risk:'失衡信号：靠咖啡因和熬夜换短期产出。'},
 {id:'reading',name:'阅读角色',role:'书籍计划 · 知识沉淀',page:'reading',energy:13,accent:'#c9a7ff',meaning:'判断力',balance:'把信息变成判断；慢下来，避免被噪音牵着走。',risk:'失衡信号：只收藏不阅读，只输入不输出。'},
 {id:'english',name:'英语角色',role:'输入训练 · 可复用输出',page:'english',energy:15,accent:'#7fe3c8',meaning:'表达',balance:'把能力变成可复用的输出，让世界听见你。',risk:'失衡信号：连续学习但没有一次真实表达。'}
];
function hasLegacyRoles(){try{return !!localStorage.getItem('wealth-os-agent-statuses')&&!state.legacyRolesImported;}catch(_){return false;}}
function agentStatuses(){return state.agentStatuses ||= {};}
function agentBalance(){
 const avg=100/AGENT_DEFS.length, dev=AGENT_DEFS.reduce((s,a)=>s+Math.abs(a.energy-avg),0)/AGENT_DEFS.length;
 const distribution=clamp(100-dev*5,0,100);
 const statuses=agentStatuses();
 const busy=AGENT_DEFS.filter(a=>(statuses[a.id]||'idle')==='busy').length;
 const paused=AGENT_DEFS.filter(a=>(statuses[a.id]||'idle')==='paused').length;
 const availability=clamp(100-busy*7-paused*3,0,100);
 return {score:Math.round(distribution*.7+availability*.3),distribution,availability,busy,paused,unallocated:100-AGENT_DEFS.reduce((s,a)=>s+a.energy,0)};
}
function agentAvatar(a){
 const initial=(a.name||'?').replace('角色','').slice(0,1);
 return `<span class="agent-avatar agent-avatar-mono" aria-hidden="true"><b>${esc(initial)}</b></span>`;
}
function agentInsights(balance){
 const out=[];
 if(balance.busy>2) out.push({tone:'warn',title:'同时忙碌的角色过多',text:'超过 2 个角色同时忙碌，注意力会被切碎。先暂停低优先级角色，只保留 1–2 个主线。'});
 if(balance.paused>0) out.push({tone:'neutral',title:`${balance.paused} 个角色已暂停`,text:'暂停不是失败；如果暂停的是健康或睡眠，设置一个恢复日期。'});
 if(balance.unallocated>=10) out.push({tone:'neutral',title:`${balance.unallocated}% 精力未分配`,text:'未分配预算不是必须填满；它可以是缓冲、休息或应对突发。'});
 const high=[...AGENT_DEFS].sort((a,b)=>b.energy-a.energy)[0];
 const low=[...AGENT_DEFS].sort((a,b)=>a.energy-b.energy)[0];
 if(high) out.push({tone:'neutral',title:`${high.name}预算最高（${high.energy}%）`,text:`${high.balance} 检查它是否真的在服务主线，而不是占用注意力。`});
 if(low&&low.energy<10) out.push({tone:'neutral',title:`${low.name}预算最低（${low.energy}%）`,text:'低预算可以是阶段性选择；只要它是主动选择，而不是长期忽略。'});
 if(!out.length) out.push({tone:'good',title:'六个角色处于可调度状态',text:'继续保持：底盘优先、一次只忙 1–2 个、每周再平衡。'});
 return out.slice(0,4);
}
function agentConsoleBlock(){
  const statuses=agentStatuses();
  const queue=(focusTasks()||[]).filter(t=>!t.done).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))||({'高':0,'中':1,'低':2}[a.priority]??3)-({'高':0,'中':1,'低':2}[b.priority]??3)).slice(0,3);
  const finished=(focusTasks()||[]).filter(t=>t.done).slice(-3).reverse();
  const busyAgents=AGENT_DEFS.filter(a=>(statuses[a.id]||'idle')==='busy');
  return `<section class="agent-console" aria-label="角色调度台">
    <div class="agent-console-head"><div><span class="eyebrow">DELEGATION · THREE TENSES</span><h3>角色调度台</h3><p>未来、当前、过去同时可见；只读取真实任务和角色状态，不伪造运行记录。</p></div><button class="btn btn-small btn-outline" data-action="go-page" data-page="today">打开执行 →</button></div>
    <div class="agent-console-grid">
      <div class="agent-console-col"><div class="agent-console-col-head"><span>待调度</span><b>${queue.length}</b></div>${queue.length?queue.map(t=>`<div class="agent-console-row"><span>${esc(t.title)}</span><small>${esc(t.project||'收集箱')} · ${esc(t.dueDate||'未排期')}</small></div>`).join(''):'<div class="agent-console-empty">今天没有待调度任务。</div>'}</div>
      <div class="agent-console-col agent-console-live"><div class="agent-console-col-head"><span><i class="agent-live-dot"></i>当前运行</span><b>${busyAgents.length}</b></div>${busyAgents.length?busyAgents.map(a=>`<div class="agent-console-row"><span>${esc(a.name)}</span><small>忙碌中 · ${a.energy}% 精力预算</small></div>`).join(''):'<div class="agent-console-empty">当前没有忙碌的角色；都在空闲或暂停。</div>'}<button class="agent-stop" data-action="agents-stop-busy" ${busyAgents.length?'':'disabled'}>${busyAgents.length?'暂停全部忙碌角色':'没有正在运行的角色'}</button></div>
      <div class="agent-console-col"><div class="agent-console-col-head"><span>最近完成</span><b>${finished.length}</b></div>${finished.length?finished.map(t=>`<div class="agent-console-row"><span>${esc(t.title)}</span><small>${esc(t.project||'收集箱')} · ${esc(t.dueDate||'已完成')}</small></div>`).join(''):'<div class="agent-console-empty">还没有完成记录；先完成今天的一件。</div>'}</div>
    </div>
  </section>`;
}
function renderAgents(){
 const statuses=agentStatuses(), labels={idle:'空闲',busy:'忙碌',paused:'暂停'}, cls={idle:'idle',busy:'busy',paused:'paused'}, balance=agentBalance();
 const cards=AGENT_DEFS.map((a,i)=>{const st=statuses[a.id]||'idle';return `<button class="agent-node agent-node-${cls[st]}" style="--i:${i};--start:${((i*100)/AGENT_DEFS.length).toFixed(2)}%;--delay:-${((i*46)/AGENT_DEFS.length).toFixed(2)}s;--accent:${a.accent}" data-action="agent-cycle" data-agent="${a.id}" title="点击切换 空闲 / 忙碌 / 暂停" aria-label="${esc(a.name)}，${labels[st]}，精力 ${a.energy}%"><span class="agent-node-card">${agentAvatar(a)}<span class="agent-node-copy"><strong>${esc(a.name)}</strong><small>${esc(a.meaning)}</small><em><i></i>${labels[st]} · ${a.energy}%</em></span></span></button>`}).join('');
 return `${sectionHead('PERSONAL MULTI-AGENT OS · BALANCE','平衡','不是六个独立的人，而是同一个人的六类精力预算。六个角色绕中心转动，中心 OS 负责调度与平衡；点击任一角色切换 空闲 / 忙碌 / 暂停。',`<button class="btn btn-outline" data-action="agents-reset">重置状态</button><button class="btn btn-primary" data-action="go-page" data-page="home">进入流程 →</button>`)}
 ${hasLegacyRoles()?'<div class="notice-panel">发现此浏览器的旧角色状态。<button class="btn" data-action="agents-import-legacy">导入到当前账户</button></div>':''}<section class="agent-balance-hero">
  <div class="agent-balance-copy"><span class="eyebrow">BALANCE · NOT EQUALITY</span><h2>一个中心，<em>六个角色</em></h2><p>平衡不是平均分配，而是动态调度：底盘（健康与睡眠）先稳住，再让工作、投资、表达和选择权轮流占用注意力。六个角色围绕中心转动，中心 OS 负责让它们不互相挤压。</p>
   <div class="agent-summary"><div><strong>${balance.score}</strong><span>平衡指数</span></div><div><strong>${AGENT_DEFS.length}</strong><span>角色总数</span></div><div><strong>${balance.busy}</strong><span>忙碌中</span></div><div><strong>${balance.unallocated}%</strong><span>未分配缓冲</span></div></div>
   <div class="agent-balance-actions"><button class="btn btn-primary" data-action="go-page" data-page="home">回到流程</button><button class="btn btn-outline" data-action="agents-spin">${ui.agentSpinPaused?'继续旋转':'暂停旋转'}</button><button class="btn btn-outline" data-action="agents-reset">重置角色状态</button></div>
  </div>
  <div class="agent-balance-stage ${ui.agentSpinPaused?'agent-stage-paused':''}">
   <div class="agent-orbit-ring ring-a"></div><div class="agent-orbit-ring ring-b"></div><div class="agent-orbit-glow"></div>
   <div class="agent-balance-core"><span class="agent-balance-mark">OS</span><strong>${balance.score}</strong><small>平衡指数</small><i>调度 · 优先级 · 再平衡</i></div>
   <div class="agent-orbit-track">${cards}</div>
   <div class="agent-balance-caption"><span>动态平衡</span><small>中心 OS = 平衡；外围角色 = 可调度的精力预算</small></div>
  </div>
 </section>
 ${agentConsoleBlock()}
 <div class="agent-balance-grid"><section class="card agent-balance-insights"><div class="card-head"><div><span class="eyebrow">BALANCE CHECK</span><h3>现在的平衡状态</h3><p>根据精力预算与忙碌/暂停状态计算，不是绩效评分。</p></div><span class="tag ${balance.score>=70?'good':balance.score>=50?'warn':'bad'}">${balance.score}/100</span></div>${hosInsightCards(agentInsights(balance))}</section>
 <article class="card agent-playbook"><div class="card-head"><div><h3>平衡规则</h3><p>让角色协作，而不是同时争抢注意力。</p></div></div><div class="agent-rule"><b>01 · 不追求平均</b><p>不同阶段允许不同预算；关键是主动选择，而不是被最吵的角色拖走。</p></div><div class="agent-rule"><b>02 · 先保底盘</b><p>健康与睡眠是基础资源；底盘失守时，工作与投资收益都不可持续。</p></div><div class="agent-rule"><b>03 · 一次只忙 1–2 个</b><p>同时忙碌的角色越多，切换成本越高；其余角色保持空闲或暂停。</p></div><div class="agent-rule"><b>04 · 每周再平衡</b><p>按真实完成量重新分配精力；恢复一个被忽略的角色，暂停一个过度占用的角色。</p></div></article></div>
 <section class="agent-meaning-section"><div class="agent-section-head"><div><span class="eyebrow">MEANING OF EACH AGENT</span><h2>每个角色代表什么</h2><p>六个角色对应六类精力预算、一个失衡信号和一个可执行入口。</p></div><span class="tag neutral">6 个角色 · 1 个中心</span></div><div class="agent-meaning-grid">${AGENT_DEFS.map((a)=>{const st=statuses[a.id]||'idle';return `<article class="agent-meaning-card" style="--accent:${a.accent}"><header>${agentAvatar(a)}<div><strong>${esc(a.name)}</strong><small>${esc(a.meaning)}</small></div><span class="tag ${st==='busy'?'warn':st==='paused'?'bad':'neutral'}">${labels[st]}</span></header><p>${esc(a.balance)}</p><small class="agent-risk">${esc(a.risk)}</small><footer><span>${a.energy}% 精力预算</span><button class="btn btn-small btn-outline" data-action="agent-open" data-page="${a.page}">进入${esc(a.name.replace('角色',''))} →</button></footer></article>`}).join('')}</div></section>
 <section class="card agent-allocation-card"><div class="card-head"><div><h3>精力分配建议</h3><p>建议预算为起始值；可在每周复盘时调整，目标是可持续的平衡。</p></div><span class="soft-badge">100% 基准</span></div>${AGENT_DEFS.map(a=>`<div class="agent-budget-row"><span>${agentAvatar(a)} ${esc(a.name)}<small>${esc(a.meaning)}</small></span><div class="agent-budget-track"><i style="width:${a.energy}%;background:${a.accent}"></i></div><b>${a.energy}%</b><button data-action="agent-open" data-page="${a.page}">打开 →</button></div>`).join('')}</section>`;
}


function renderMistakes(){
 return `${sectionHead('REVIEW / LESSONS','避坑','独立记录曾经犯过的错误、错过的机会与复盘资料。每天回看关键条目，减少重复犯错。','')}
 <section class="card daily-mustread-card"><div class="card-head"><div><h3>每日必读 · 错误与错过清单</h3><p>把曾经犯过的错误、错过的机会和复盘资料保存为标题 + URL，每天回看，避免重复付学费。</p></div><span class="tag neutral">${(state.dailyMustReads||[]).length} 条</span></div><form id="mustReadForm" class="mustread-form"><input name="title" required placeholder="标题：例如忽视止损条件 / 错过的机会复盘"><input name="url" type="url" required placeholder="https://... 链接地址"><input name="note" placeholder="一句话提醒（可选）"><button class="btn btn-primary" type="button" data-action="add-mustread">＋ 添加必读</button></form><div class="mustread-list">${(state.dailyMustReads||[]).map((x,i)=>`<article class="mustread-item"><span class="mustread-check">◎</span><div><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a><p>${esc(x.note||'每日复盘时打开，检查是否再次出现同类风险。')}</p><small>加入于 ${esc(x.created||'')}</small></div><button class="btn btn-small btn-ghost" data-action="delete-mustread" data-index="${i}">删除</button></article>`).join('')||'<div class="empty-state">还没有必读条目。建议先添加最重要的 3 条历史错误或错过复盘。</div>'}</div></section>`;
}


let scheduleJobsCache = [];
let vaultStatus = null;
function personalVaultCard(){
  return `<section class="card" style="margin-top:14px"><div class="card-head"><div><h3>Windows Excel 历史归档 · 个人数据保险库</h3><p>所有个人配置统一镜像到程序目录之外：任务、健身/健康、每日任务、打卡、日志、投资仓位、错过和过错、新登配置等。更新程序不会依赖项目目录内的数据库才能保留这些数据。</p></div></div><div class="card-body"><form id="archiveSettingsForm" class="schedule-form"><label class="field-label">归档目录（运行服务器的 Windows 本机路径）<input name="archiveDir" value="${esc((state.schedulerSettings||{}).archiveDir||'D:\\WEALTH_OS_DAILY_ARCHIVE')}" placeholder="D:\\WEALTH_OS_DAILY_ARCHIVE" required></label><button class="btn btn-primary" type="submit">保存归档目录</button><button class="btn btn-outline" type="button" data-action="personal-vault-sync">立即同步个人数据 Excel</button><button class="btn btn-outline" type="button" data-action="schedule-run-all">立即抓取并归档所有工作簿</button></form><div class="notice-panel" style="margin-top:12px"><strong>${vaultStatus?.ok?'外部归档已建立':'请同步并核验外部归档'}</strong><p>数据库：${esc(vaultStatus?.databasePath||'正在读取')}<br>数据库快照：${esc(vaultStatus?.backupPath||'正在读取')}<br>归档状态：${esc(vaultStatus?.warning||(vaultStatus?.updatedAt?'最近同步 '+vaultStatus.updatedAt:'尚未确认成功归档'))}</p><p>主文件：PERSONAL_DATA/WEALTH_OS_PERSONAL_DATA_用户名.xlsx；Full_State_JSON 用于无损恢复，Personal_Data_Index 和 Scheduled_Tasks 便于人工查看。密码不会写入 Excel。归档路径同时记录到 Windows 用户配置目录，覆盖程序文件后仍可找到。</p></div><p class="table-note">仅当网站服务运行在你的 Windows 电脑时，才能写入 D: 等本机目录。若部署在其他机器，路径会指向服务器而非浏览器所在电脑。</p></div></section>`;
}
function renderSchedules(){
 const jobs=scheduleJobsCache;
 return `${sectionHead('AUTOMATION / DAILY DATA PIPELINE','自动化','自定义执行时间、频率、任务内容与每日 Excel 归档。默认任务会拉取公开行情、追加数据快照并保存历史副本；数据源失败时保留空值，不伪造数据。',`<button class="btn btn-outline" data-action="schedule-refresh">刷新任务状态</button>`)}
 <section class="card schedule-intro"><div class="card-head"><div><h3>第一条任务：全球配置 + 纳斯达克 + A股数据预热</h3><p>在你进入投资页面前，先尽可能准备好公开行情、计算字段和 Excel 历史文件。</p></div><span class="tag good">已预置</span></div><div class="schedule-kpis"><div><small>执行频率</small><strong>每日</strong></div><div><small>默认时间</small><strong>07:30</strong></div><div><small>数据原则</small><strong>不造数</strong></div><div><small>历史归档</small><strong>按日保存</strong></div></div><p class="schedule-note">注意：日线行情以数据源最近可得交易日为准，不保证盘中实时；宏观、估值、财报和人工评分若无可靠来源则保持空白。Excel 原始模板不会被覆盖，归档写入副本。</p></section>
 <section class="card" style="margin-top:14px"><div class="card-head"><div><h3>任务列表</h3><p>可以新增、编辑、启用/暂停或立即执行。</p></div><button class="btn btn-primary" data-action="schedule-new">＋ 新建定时任务</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>任务</th><th>频率</th><th>时间</th><th>状态</th><th>上次执行</th><th>操作</th></tr></thead><tbody>${jobs.map(j=>`<tr><td><strong>${esc(j.name)}</strong><div class="table-sub">${esc(j.description||'')}</div></td><td>${esc(j.frequency||'daily')}</td><td>${esc(j.time||'07:30')}</td><td><span class="tag ${j.enabled?'good':'neutral'}">${j.enabled?'启用':'暂停'}</span></td><td>${esc(j.lastRun||'尚未执行')}</td><td><div class="button-row"><button class="btn btn-small btn-outline" data-action="schedule-edit" data-id="${esc(j.id)}">编辑</button><button class="btn btn-small btn-outline" data-action="schedule-run" data-id="${esc(j.id)}">立即运行</button><button class="btn btn-small btn-quiet" data-action="schedule-toggle" data-id="${esc(j.id)}">${j.enabled?'暂停':'启用'}</button></div></td></tr>`).join('')||'<tr><td colspan="6">暂无定时任务</td></tr>'}</tbody></table></div></section>
 
 ${personalVaultCard()}<div id="scheduleEditMount"></div>`;
}
function scheduleEditor(job={}){const editing=!!job.id;return `<section class="card" style="margin-top:14px"><div class="card-head"><div><h3>${editing?'编辑定时任务':'新建定时任务'}</h3><p>时间使用服务器本地时区；默认 Windows 本地部署以系统时区为准。</p></div><button class="btn btn-quiet" data-action="schedule-editor-close">关闭</button></div><div class="card-body"><form id="scheduleJobForm" class="schedule-form"><input type="hidden" name="id" value="${esc(job.id||'')}"><label class="field-label">任务名称<input name="name" required value="${esc(job.name||'')}"></label><label class="field-label">任务类型<select name="taskType"><option value="refresh_archive" ${(job.taskType||'refresh_archive')==='refresh_archive'?'selected':''}>拉取行情 + 计算基础指标 + Excel 日归档</option><option value="archive_only" ${job.taskType==='archive_only'?'selected':''}>仅归档现有工作簿</option></select></label><div class="composer-two"><label class="field-label">频率<select name="frequency"><option value="daily" ${(job.frequency||'daily')==='daily'?'selected':''}>每天</option><option value="weekdays" ${job.frequency==='weekdays'?'selected':''}>工作日</option></select></label><label class="field-label">执行时间<input name="time" type="time" required value="${esc(job.time||'07:30')}"></label></div><label class="field-label">说明<input name="description" value="${esc(job.description||'全球配置、纳斯达克、A股ETF公开行情预热与历史归档')}"></label><label class="field-label check-inline"><input type="checkbox" name="enabled" ${job.enabled!==false?'checked':''}> 启用任务</label><div class="button-row"><button class="btn btn-primary" type="submit">保存任务</button><button class="btn btn-quiet" type="button" data-action="schedule-editor-close">取消</button></div></form></div></section>`}
async function loadSchedules(){try{vaultStatus=await api('/api/personal-vault/status');}catch(_){vaultStatus=null;}try{const d=await api('/api/scheduler/jobs');scheduleJobsCache=d.jobs||[];if(d.settings){state.schedulerSettings=state.schedulerSettings||{};if(!state.schedulerSettings.archiveDir)state.schedulerSettings.archiveDir=d.settings.archiveDir;}}catch(e){toast('读取定时任务失败：'+e.message,true)}}

function renderHomeSheet() {
  return `<div class="home-sheet" data-tab-shell data-tab-key="home-sheet" data-default-tab="matrix">
    <div class="fit-tabs home-sheet-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="matrix" role="tab" aria-selected="true">任务四象限</button>
      <button class="fit-tab" data-tab="calendar" role="tab" aria-selected="false">周历与专注</button>
    </div>
    <div class="fit-panel active home-sheet-panel" data-tab-panel="matrix">${renderMatrix()}</div>
    <div class="fit-panel home-sheet-panel" data-tab-panel="calendar">${renderCalendar()}<div class="home-side-by-side home-habit-row">${renderPomodoro()}</div></div>
  </div>`;
}

function homeRangeBuckets(range='7'){
  const total={7:7,30:30,90:90}[range]||7;
  const buckets=total===7?7:total===30?6:9;
  const span=total/buckets, tasks=focusTasks();
  return Array.from({length:buckets},(_,i)=>{
    const start=addDaysKey(-(total-1)+Math.floor(i*span));
    const end=addDaysKey(-(total-1)+Math.floor((i+1)*span)-1);
    const count=tasks.filter(t=>t.dueDate&&t.dueDate>=start&&t.dueDate<=end).length;
    const dd=new Date(start+'T12:00:00');
    return {count,label:`${dd.getMonth()+1}/${dd.getDate()}`,start,end};
  });
}
function homeTrendSvg(series){
  const w=760,h=174,pad=18,max=Math.max(1,...series.map(x=>x.count));
  const coords=series.map((x,i)=>({x:pad+i*(w-pad*2)/Math.max(1,series.length-1),y:h-pad-(x.count/max)*(h-pad*2)}));
  const line=coords.map((c,i)=>`${i?'L':'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area=`${line} L${coords[coords.length-1].x},${h-pad} L${coords[0].x},${h-pad} Z`;
  return `<svg class="home-trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="近期任务负载趋势">${[.18,.42,.66,.9].map(y=>`<line x1="${pad}" y1="${h*y}" x2="${w-pad}" y2="${h*y}" stroke="var(--grid)" stroke-dasharray="3 5"/>`).join('')}<path d="${area}" fill="var(--accent)" opacity=".13"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${coords.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="2.6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`).join('')}${series.map((x,i)=>`<text x="${coords[i].x}" y="${h-2}" fill="var(--muted)" font-size="11" font-family="DM Mono, monospace" text-anchor="${i===0?'start':i===series.length-1?'end':'middle'}">${x.label}</text>`).join('')}</svg>`;
}
function homeRingSvg(pct,size=52){
  const c=138.2, dash=Math.max(0,Math.min(100,pct))/100*c;
  return `<svg viewBox="0 0 56 56" width="${size}" height="${size}" aria-hidden="true"><circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="4"/><circle cx="28" cy="28" r="22" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${c}" transform="rotate(-90 28 28)"/></svg>`;
}
function homeDonutSvg(parts,total){
  const c=251.3; let offset=0;
  return `<svg class="home-donut-svg" viewBox="0 0 120 120" role="img" aria-label="今日任务优先级构成"><circle cx="60" cy="60" r="40" fill="none" stroke="var(--grid)" stroke-width="12"/>${parts.map(p=>{const len=total?p.count/total*c:0; const seg=`<circle cx="60" cy="60" r="40" fill="none" stroke="${p.color}" stroke-width="12" stroke-dasharray="${len.toFixed(1)} ${(c-len).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 60 60)"/>`; offset+=len; return seg;}).join('')}</svg>`;
}
function renderHomeDashboard(){
  const d=new Date(),theme=document.body.dataset.theme==='light'?'light':'dark';
  const all=focusTasks(), homeTasks=focusTaskFilter('home');
  const openTasks=homeTasks.filter(t=>!t.done), doneHome=homeTasks.filter(t=>t.done).length;
  const today=todayKey(), overdue=openTasks.filter(t=>t.dueDate&&t.dueDate<today).length;
  const dueToday=openTasks.filter(t=>t.dueDate===today).length;
  const completion=homeTasks.length?Math.round(doneHome/homeTasks.length*100):0;
  const balance=agentBalance(), nd=state.nasdaq||{};
  const cash=globalTargets().find(r=>r.group==='Cash')?.dynamicTarget||state.profile.cashTarget||17;
  const habits=Object.values(state.habitChecks?.[today]||{}).filter(Boolean).length;
  const priorityRank={高:0,中:1,低:2};
  const lead=[...openTasks].sort((a,b)=>{const ao=a.dueDate&&a.dueDate<today?0:1,bo=b.dueDate&&b.dueDate<today?0:1;return ao-bo||(priorityRank[a.priority]??3)-(priorityRank[b.priority]??3)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));})[0];
  const queue=[...openTasks].filter(t=>t!==lead).sort((a,b)=>String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'))).slice(0,3);
  const load=homeRangeBuckets(ui.homeRange||'7');
  const due7=all.filter(t=>t.dueDate&&t.dueDate>=addDaysKey(-6)&&t.dueDate<=today).length;
  const duePrev7=all.filter(t=>t.dueDate&&t.dueDate>=addDaysKey(-13)&&t.dueDate<=addDaysKey(-7)).length;
  const delta=duePrev7?Math.round((due7-duePrev7)/duePrev7*100):null;
  const rangeLabel={7:'近 7 天',30:'近 30 天',90:'近 90 天'}[ui.homeRange||'7']||'近 7 天';
  const parts=[['高',openTasks.filter(t=>t.priority==='高').length,'var(--accent)'],['中',openTasks.filter(t=>t.priority==='中').length,'#8A8A96'],['低',openTasks.filter(t=>t.priority==='低'||!t.priority).length,'#3C3C48']];
  const donutParts=parts.map(([label,count,color])=>({label,count,color}));
  const recs=[];
  if(overdue) recs.push({tag:'执行',title:`先处理 ${overdue} 件逾期`,impact:`${overdue} 项`,text:'逾期项会挤占今天的判断力；先清掉一件，再打开资产面板。',page:'today',cta:'打开执行'});
  if(n(nd.bubble)>=55) recs.push({tag:'风险',title:'纳指泡沫信号偏高',impact:`泡沫 ${fmt(nd.bubble,1)}`,text:'核对 2000 相似度、10Y 与 VIX，不因单日反弹提高杠杆。',page:'nasdaq',cta:'查看纳指'});
  if(!balance.busy) recs.push({tag:'精力',title:'当前没有忙碌角色',impact:`平衡 ${balance.score}`,text:'把今天的深度任务只交给一个角色；其余保持空闲或暂停。',page:'agents',cta:'查看角色'});
  while(recs.length<3) recs.push({tag:'配置',title:'核对现金目标与真实持仓',impact:`现金 ${fmt(cash,1)}%`,text:'先确认应急金、负债和真实仓位，再讨论目标比例。',page:'allocation',cta:'查看配置'});
  return `<div class="home-dash">
    <header class="home-dash-head">
      <div class="home-dash-title"><span class="home-dash-mark">W</span><div><h1>工作台</h1><p>${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日 · 今日执行与资产关注</p></div></div>
      <div class="home-dash-actions"><button class="home-search" data-action="home-search" aria-label="搜索页面">⌕</button><span class="home-live"><i></i>本地数据</span><button class="home-head-btn" data-action="home-share">分享</button><button class="home-head-btn" data-action="export-json">导出</button><button class="btn btn-primary btn-small" data-action="focus-add-focus">＋ 新任务</button><div class="theme-switch" role="group" aria-label="界面外观"><button type="button" data-action="theme-dark" class="theme-option ${theme==='dark'?'selected':''}" aria-pressed="${theme==='dark'}">深色</button><button type="button" data-action="theme-light" class="theme-option ${theme==='light'?'selected':''}" aria-pressed="${theme==='light'}">浅色</button></div></div>
    </header>
    <section class="spatial-hero" aria-label="今日行动">
      <div class="spatial-hero-copy"><span class="spatial-label">你的每日空间</span><h2>${openTasks.length?'让今天，向前一步。':'留一点空间，给新的开始。'}</h2><p>${lead?`从「${esc(lead.title)}」开始，把注意力放在一件事上。`:'记录一个小目标，从今天开始积累。'}</p><div class="spatial-hero-actions">${lead?`<button class="btn btn-primary" data-action="toggle-focus-task" data-id="${esc(lead.id)}">完成这件事</button><button class="btn btn-outline" data-action="edit-focus-task" data-id="${esc(lead.id)}">编辑 / 改期</button><button class="btn btn-outline" data-action="home-start-focus">开始专注</button>`:'<button class="btn btn-primary" data-action="focus-add-focus">添加第一件任务</button>'}</div><div class="spatial-hero-meta"><span>${openTasks.length} 件待办</span><span>${habits} 项习惯已打卡</span></div></div>
      <div class="spatial-object" aria-label="今日任务完成率 ${completion}%"><div class="spatial-orbit spatial-orbit-one"></div><div class="spatial-orbit spatial-orbit-two"></div><div class="spatial-sphere"><span>今日进度</span><strong>${completion}<small>%</small></strong><span>${doneHome} / ${homeTasks.length} 已完成</span></div><span class="spatial-satellite" aria-hidden="true"></span><span class="spatial-object-caption">每一小步，都算数。</span></div>
    </section>
    <details class="home-data-overview"><summary>数据概览 · 精力、资产与任务负载</summary><div class="home-kpi-row">
      <article class="home-kpi"><div class="home-kpi-top"><span>今日待办</span><b>01</b></div><strong>${openTasks.length}</strong><small class="${overdue?'is-down':''}">${overdue?`${overdue} 项逾期`:'没有逾期'}</small></article>
      <article class="home-kpi home-kpi-ring"><div class="home-kpi-top"><span>今日完成</span><b>02</b></div><div class="home-kpi-ring-wrap">${homeRingSvg(completion)}<strong>${doneHome}<em>/${homeTasks.length}</em></strong></div><small>完成率 ${completion}%</small></article>
      <article class="home-kpi"><div class="home-kpi-top"><span>平衡指数</span><b>03</b></div><strong>${balance.score}</strong><small>忙碌 ${balance.busy} · 暂停 ${balance.paused}</small></article>
      <article class="home-kpi"><div class="home-kpi-top"><span>纳指配置分</span><b>04</b></div><strong>${fmt(nd.entry,1)}</strong><small>泡沫 ${fmt(nd.bubble,1)}</small></article>
      <article class="home-kpi"><div class="home-kpi-top"><span>7 日负载</span><b>05</b></div><strong>${due7}</strong><small class="${delta!==null&&delta>0?'is-warn':delta!==null&&delta<0?'is-up':''}">较前 7 日 ${delta===null?'—':`${delta>0?'↑':delta<0?'↓':'·'} ${Math.abs(delta)}%`}</small></article>
    </div>
    </details><div class="home-dash-grid">
      <section class="home-panel home-trend-panel">
        <div class="home-panel-head"><div><span class="home-overline">执行节奏</span><h2>任务负载与接下来</h2><p>查看到期分布，给今天留出合理余量。</p></div><button class="btn btn-small btn-outline" data-action="go-page" data-page="today">执行清单 →</button></div>
        ${lead?`<div class="home-lead-meta"><span class="project-chip">${esc(lead.project||'收集箱')}</span><span class="${lead.dueDate&&lead.dueDate<today?'is-overdue':''}">${esc(lead.dueDate===today?'今天到期':lead.dueDate||'未排期')}</span><span>${Math.max(0,n(lead.estimate,0))} 分钟</span></div>`:''}
        <div class="home-chart-head"><span>任务负载</span><div class="home-range-tabs" role="group" aria-label="趋势时间范围">${[['7','7D'],['30','30D'],['90','90D']].map(([v,l])=>`<button class="${(ui.homeRange||'7')===v?'active':''}" data-action="home-range" data-range="${v}">${l}</button>`).join('')}</div></div>
        <div class="home-chart">${homeTrendSvg(load)}</div>
        <div class="home-chart-foot"><span>${rangeLabel}到期任务 · 共 ${load.reduce((a,b)=>a+b.count,0)} 项</span><button data-action="go-page" data-page="today">打开执行 ↗</button></div>
        ${queue.length?`<div class="home-queue"><span>接下来</span>${queue.map(t=>`<button data-action="go-page" data-page="today"><b>${esc(t.title)}</b><small>${esc(t.dueDate||'未排期')}</small></button>`).join('')}</div>`:''}
      </section>
      <div class="home-dash-side">
        <section class="home-panel home-donut-panel"><div class="home-panel-head"><div><span class="home-overline">任务构成</span><h2>优先级分布</h2></div><span class="home-count">${openTasks.length}</span></div><div class="home-donut-wrap">${homeDonutSvg(donutParts,openTasks.length)}<div class="home-donut-center"><strong>${openTasks.length}</strong><small>待办</small></div></div><div class="home-legend">${donutParts.map(p=>`<span><i style="background:${p.color}"></i>${p.label} <b>${p.count}</b></span>`).join('')}</div></section>
        <section class="home-panel home-sim-panel"><div class="home-panel-head"><div><span class="home-overline">策略模拟器</span><h2>现金目标预览</h2></div><span class="home-count">仅预览</span></div><div class="home-sim-value"><strong id="homeCashValue">${fmt(cash,1)}%</strong><span>当前目标</span></div><input id="homeCashSlider" data-home-cash type="range" min="5" max="40" step="1" value="${Math.round(cash)}" aria-label="预览现金目标比例" style="--v:${(cash-5)/35*100}%"><div class="home-sim-scale"><span>5%</span><span>40%</span></div><p id="homeCashNote">调整只影响预览，不写入配置。降低现金目标会提高风险预算。</p><button class="btn btn-small btn-outline" data-action="go-page" data-page="allocation">查看配置 →</button></section>
      </div>
    </div>
    <details class="getting-started"><summary>第一次使用？从这三步开始</summary><div><button class="btn btn-outline" data-action="focus-add-focus">1. 添加一个任务</button><button class="btn btn-outline" data-action="go-page" data-page="checkin">2. 记录健康打卡</button><button class="btn btn-outline" data-action="go-page" data-page="dashboard">3. 核验资产数据</button><p>任务、健康与资产各自记录；先从你今天需要的一个模块开始。</p></div></details>
    <section class="home-reco"><div class="home-reco-head"><div><span class="home-overline">建议</span><h2>接下来可以做什么</h2></div><span class="home-count">基于当前任务与持仓</span></div><div class="home-reco-grid">${recs.slice(0,3).map((r,i)=>`<article class="home-reco-card"><div class="home-reco-top"><span class="tag neutral">${r.tag}</span><b>0${i+1}</b></div><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p><div class="home-reco-foot"><span>影响 · ${esc(r.impact)}</span><button data-action="go-page" data-page="${r.page}">${r.cta} ↗</button></div></article>`).join('')}</div></section>
    ${renderHomeSheet()}
  </div>`;
}
function renderHome() { return (typeof renderGrowthHome==='function'?renderGrowthHome():renderHomeDashboard()) + `<section class="today-roles" aria-label="今日角色与精力"><h2>今日角色与精力</h2>${renderTodayRoles()}</section>`; }
function renderInbox() { return renderTaskWorkspace('inbox'); }
function renderUpcoming() { return renderTaskWorkspace('upcoming'); }
function renderImportant() { return renderTaskWorkspace('important'); }
function renderAllFocusTasks() { return renderTaskWorkspace('alltasks'); }
function renderFocusTaskListOnly() { const el=$('#focusTaskList'); if(el) el.innerHTML=renderFocusTaskRows(currentPage); }
function focusClockTick() {
  if(!focusClock.running||!focusClock.endsAt) return;
  focusClock.remaining=Math.max(0,Math.ceil((focusClock.endsAt-Date.now())/1000));
  const el=$('#pomodoroDisplay'); if(el) el.textContent=`${String(Math.floor(focusClock.remaining/60)).padStart(2,'0')}:${String(focusClock.remaining%60).padStart(2,'0')}`;
  if(focusClock.remaining<=0){focusClock.running=false;focusClock.endsAt=null;if(focusClock.interval)clearInterval(focusClock.interval);focusClock.interval=null;toast('专注时段完成。休息 5 分钟，再决定是否继续。');if($('#viewRoot')&&currentPage==='home')renderPage('home');}
}
function startFocusClock() { if(focusClock.running) return; focusClock.endsAt=Date.now()+focusClock.remaining*1000;focusClock.running=true;if(!focusClock.interval)focusClock.interval=setInterval(focusClockTick,1000);focusClockTick(); }
function pauseFocusClock() { if(focusClock.endsAt) focusClock.remaining=Math.max(0,Math.ceil((focusClock.endsAt-Date.now())/1000));focusClock.running=false;focusClock.endsAt=null;if(focusClock.interval)clearInterval(focusClock.interval);focusClock.interval=null; }

function flowDateKind(){const d=new Date().getDay();return (d===0||d===6)?'restday':'weekday';}
function flowClock(min){return `${String(Math.floor(min/60)).padStart(2,'0')}:${String(min%60).padStart(2,'0')}`;}
function flowEditorPanel(kind){
 const items=state.dailyFlows[kind]||[];const sorted=[...items].sort((a,b)=>n(a.start)-n(b.start)||n(a.order)-n(b.order));
 // Interval coloring: simultaneous tasks use separate horizontal lanes.
 const laneMeta=new Map(),laneEnds=[];sorted.forEach(x=>{let lane=laneEnds.findIndex(end=>end<=n(x.start));if(lane<0)lane=laneEnds.length;laneEnds[lane]=Math.max(n(x.end),n(x.start)+112);laneMeta.set(x.id,lane);});
 const laneCount=Math.max(1,laneEnds.length);
 const blocks=sorted.map(x=>{const lane=laneMeta.get(x.id)||0,st=Math.max(0,Math.min(1439,n(x.start))),en=Math.max(st+5,Math.min(1440,n(x.end)));return `<article class="flow-block" draggable="true" data-flow-id="${esc(x.id)}" data-flow-start="${st}" data-flow-end="${en}" data-flow-lane="${lane}" data-flow-lanes="${laneCount}" style="top:${st}px;height:${en-st}px;left:calc(66px + ${lane/laneCount*100}% - ${lane/laneCount*82}px);width:calc(${100/laneCount}% - ${82/laneCount+6}px);--flow-color:${esc(x.color||'#6e9c79')}" title="双击编辑；短任务扩大显示，实际时长以时间标签为准" tabindex="0"><span class="flow-time">${flowClock(st)}–${flowClock(en)}</span><strong>${esc(x.title)}</strong><small>${esc(x.category||'日常')} · ${esc(x.note||'')}</small><div class="flow-block-actions"><button data-action="flow-run" data-kind="${kind}" data-id="${esc(x.id)}">开始 / 记录</button><button data-action="flow-edit" data-kind="${kind}" data-id="${esc(x.id)}">编辑</button></div><span class="flow-resize" data-flow-resize="${esc(x.id)}" title="拖动调整结束时间"></span></article>`}).join('');
 const rows=Array.from({length:24},(_,h)=>`<div class="flow-hour" style="top:${h/24*100}%"><span>${String(h).padStart(2,'0')}:00</span><i></i></div>`).join('');
 return `<div class="flow-mode-tabs"><button class="filter-pill ${kind==='weekday'?'selected':''}" data-action="flow-kind" data-kind="weekday">工作日 <span>${state.dailyFlows.weekday.length}</span></button><button class="filter-pill ${kind==='restday'?'selected':''}" data-action="flow-kind" data-kind="restday">休息日 <span>${state.dailyFlows.restday.length}</span></button><span class="micro-copy">${kind==='weekday'?'周一至周五':'周六、周日'} · 自定义任务与时间</span></div>
 <div class="flow-editor-layout"><section class="card flow-timeline-card">${cardHead(kind==='weekday'?'工作日时间轴':'休息日时间轴','左侧为时间；并行任务以并排时间块显示。')}<div class="flow-timeline-scroll"><div class="flow-timeline" id="flowTimeline">${rows}${blocks||'<div class="flow-empty">当前没有流程块。点击右上角“新增流程块”开始编排。</div>'}</div></div></section></div>`;
}
function renderDailyFlow(){
 const kind=ui.flowKind||flowDateKind();
 const runs=state.dailyFlowRuns||[],items=[...(state.dailyFlows.weekday||[]),...(state.dailyFlows.restday||[])];
 return `${sectionHead('LIFE OS · DAILY RHYTHM','流程','流程编排与流程统计收进同一个工作台，用左右两个页签切换：编排看工作日/休息日时间轴，统计看记录、完成率、分类与趋势。电脑可拖动任务块调整时间；手机滑动浏览，点“编辑”修改时间。任务允许重叠。',`<button class="btn btn-primary" data-action="flow-new" data-kind="${kind}">＋ 新增流程块</button>`)}
 <div class="flow-page-shell" data-tab-shell data-tab-key="dailyflow" data-default-tab="edit">
  <div class="flow-page-bar"><div class="flow-page-tabs" data-tabs role="tablist"><button class="flow-page-tab active" data-tab="edit" role="tab"><span>流程编排</span><small>${items.length} 个流程块</small></button><button class="flow-page-tab" data-tab="checklist" role="tab"><span>每日清单</span></button><button class="flow-page-tab" data-tab="stats" role="tab"><span>流程统计</span><small>${runs.length} 次记录</small></button></div><div class="flow-page-meta"><span class="live-dot"></span>${kind==='weekday'?'当前：工作日':'当前：休息日'} · 本地保存</div></div>
  <div class="flow-page-panel active" data-tab-panel="edit">${flowEditorPanel(kind)}</div>
  <div class="flow-page-panel" data-tab-panel="checklist">${renderFlowChecklist()}</div><div class="flow-page-panel" data-tab-panel="stats" id="flowStatsPanel">${flowStatsBody()}</div>
  <div id="flowModalMount"></div>
 </div>`;
}
function refreshFlowTabCounts(){
 const scope=document.querySelector('[data-tab-key="dailyflow"]');if(!scope)return;
 const items=(state.dailyFlows.weekday||[]).length+(state.dailyFlows.restday||[]).length;
 const runs=(state.dailyFlowRuns||[]).length;
 const e=scope.querySelector('[data-tab="edit"] small'),s=scope.querySelector('[data-tab="stats"] small');
 if(e)e.textContent=`${items} 个流程块`;if(s)s.textContent=`${runs} 次记录`;
}
function flowStatsBody(){ const runs=state.dailyFlowRuns||[],items=[...(state.dailyFlows.weekday||[]).map(x=>({...x,kind:'weekday'})),...(state.dailyFlows.restday||[]).map(x=>({...x,kind:'restday'}))];
 const opened=runs.length,completed=runs.filter(x=>x.status==='completed').length,unique=new Set(runs.map(x=>x.flowId)).size;
 const byCat={};runs.forEach(r=>{const c=r.category||'未分类';byCat[c]=(byCat[c]||0)+1});const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
 const byDay={};runs.forEach(r=>{const d=(r.timestamp||'').slice(0,10);if(d)byDay[d]=(byDay[d]||0)+1});const days=Object.entries(byDay).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14);
 const flowCounts=items.map(f=>({...f,count:runs.filter(r=>r.flowId===f.id).length,done:runs.filter(r=>r.flowId===f.id&&r.status==='completed').length})).sort((a,b)=>b.count-a.count);
 return `${renderChecklistStats()}<div class="home-kpi-grid stats-kpis"><div class="home-kpi"><span>流程块总数</span><strong>${items.length}</strong><p>工作日与休息日全部编排</p></div><div class="home-kpi"><span>打开 / 记录次数</span><strong>${opened}</strong><p>每次点击开始/记录计一次</p></div><div class="home-kpi"><span>完成次数</span><strong>${completed}</strong><p>从记录弹窗标记完成</p></div><div class="home-kpi"><span>使用过的流程</span><strong>${unique}</strong><p>至少记录过一次的独立流程</p></div></div>
 <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('近14天流程记录趋势','按发生日期统计打开 / 记录次数')}<div class="card-body"><div class="flow-bars">${days.map(([d,v])=>`<div class="flow-bar-row"><span>${d.slice(5)}</span><div><i style="width:${Math.max(2,v/Math.max(1,...days.map(x=>x[1]))*100)}%"></i></div><b>${v}</b></div>`).join('')||'<p class="micro-copy">暂无记录；进入流程编排点击「开始 / 记录」后会生成统计数据。</p>'}</div></div></section><section class="card">${cardHead('分类维度','按流程记录时的分类统计')}<div class="card-body">${cats.map(([c,v])=>`<div class="flow-stat-chip"><span>${esc(c)}</span><strong>${v} 次</strong><small>${opened?Math.round(v/opened*100):0}%</small></div>`).join('')||'<p class="micro-copy">尚无分类统计。</p>'}</div></section></div>
 <section class="card" style="margin-top:14px">${cardHead('单项流程使用明细','可按工作日/休息日、打开次数、完成次数观察使用情况')}<div class="table-wrap"><table class="data-table"><thead><tr><th>流程</th><th>类型</th><th>时间</th><th>分类</th><th>打开次数</th><th>完成次数</th><th>操作</th></tr></thead><tbody>${flowCounts.map(f=>`<tr><td><strong>${esc(f.title)}</strong></td><td>${f.kind==='weekday'?'工作日':'休息日'}</td><td>${flowClock(f.start)}–${flowClock(f.end)}</td><td>${esc(f.category||'日常')}</td><td>${f.count}</td><td>${f.done}</td><td><button class="btn btn-small btn-outline" data-action="flow-edit" data-kind="${f.kind}" data-id="${esc(f.id)}">编辑</button></td></tr>`).join('')||'<tr><td colspan="7">暂无流程，请先到「流程编排」添加。</td></tr>'}</tbody></table></div></section>`;
}
function renderFlowStats(){
 return `${sectionHead('LIFE OS · FLOW ANALYTICS','流程统计','统计每日流程被打开/记录的次数、完成率、分类构成、近14天趋势与单项流程使用情况。',`<button class="btn btn-outline" data-action="go-page" data-page="dailyflow">← 返回每日流程</button>`)}${flowStatsBody()}`;
}
function openFlowRunModal(item,kind){let m=$('#flowModalMount');if(!m){m=document.createElement('div');m.id='flowModalMount';document.body.appendChild(m);}m.innerHTML=`<div class="flow-modal-backdrop" data-action="flow-modal-close"></div><section class="flow-modal" role="dialog" aria-modal="true"><div class="focus-modal-head"><div><div class="eyebrow">FLOW SESSION</div><h2>${esc(item.title)}</h2></div><button class="task-delete" data-action="flow-modal-close">×</button></div><p>已记录一次打开。完成后可点击下方按钮记为完成，统计页会同步更新。</p><label class="field-label">本次备注<textarea id="flowRunNote" rows=3 placeholder="记录执行情况、时长、感受或偏差"></textarea></label><div class="button-row"><button class="btn btn-primary" data-action="flow-complete" data-id="${esc(item.id)}" data-kind="${kind}">标记本次完成</button><button class="btn btn-quiet" data-action="flow-modal-close">关闭</button></div></section>`;}
function flowEditor(kind,item={}){const editing=!!item.id;return `<div class="flow-modal-backdrop" data-action="flow-modal-close"></div><section class="flow-modal" role="dialog" aria-modal="true"><div class="focus-modal-head"><div><div class="eyebrow">DAILY FLOW EDITOR</div><h2>${editing?'编辑流程块':'新增流程块'}</h2></div><button class="task-delete" data-action="flow-modal-close">×</button></div><form id="flowEditForm" data-kind="${kind}" data-id="${esc(item.id||'')}"><label class="field-label">要做的事情<input name="title" required maxlength="160" value="${esc(item.title||'')}" placeholder="例如：晨间运动、深度工作、英语输入"></label><div class="composer-two"><label class="field-label">开始时间<input name="start" type="time" required value="${flowClock(item.start??480)}"></label><label class="field-label">结束时间<input name="end" type="time" required value="${flowClock(item.end??540)}"></label></div><div class="composer-two"><label class="field-label">流程类型<select name="kind"><option value="weekday" ${kind==='weekday'?'selected':''}>工作日</option><option value="restday" ${kind==='restday'?'selected':''}>休息日</option></select></label><label class="field-label">分类<input name="category" value="${esc(item.category||'日常')}" placeholder="工作 / 健康 / 学习 / 家庭"></label></div><label class="field-label">备注<textarea name="note" rows="3">${esc(item.note||'')}</textarea></label><label class="field-label">显示颜色<input name="color" type="color" value="${esc(item.color||'#6e9c79')}"></label><div class="button-row">${editing?`<button class="btn btn-quiet" type="button" data-action="flow-delete" data-kind="${kind}" data-id="${esc(item.id)}">删除</button>`:''}<button class="btn btn-primary" type="submit">保存流程块</button><button class="btn btn-quiet" type="button" data-action="flow-modal-close">取消</button></div></form></section>`;}
function openFlowEditor(kind,id=''){const item=id?(state.dailyFlows[kind]||[]).find(x=>String(x.id)===String(id)):{};let mount=$('#flowModalMount');if(!mount){mount=document.createElement('div');mount.id='flowModalMount';document.body.appendChild(mount);}mount.innerHTML=flowEditor(kind,item||{});}
function renderDashboardRaw() {
  const nd=state.nasdaq, tasks=state.tasks||[], done=tasks.filter(t=>t.status==='已完成').length;
  const target=globalTargets();
  const sumT=weightSum(state.globalAllocation,'target');
  const marketRisk=n(state.profile.marketRisk,22);
  const highRisk=state.etfs.filter(e=>n(e.score)<55).length;
  const curve=state.dailyLog?.length>1 ? state.dailyLog.slice(-16).map((_,i)=>100 + Math.sin(i*.7)*2 + i*.18) : [43,44,46,45,42,48,50,47,51,55,53,57,55,59,58,62];
  const topEtfs=[...state.etfs].sort((a,b)=>n(b.score)-n(a.score)).slice(0,5);
  return `${sectionHead('COMMAND OVERVIEW','资产总览','从现金缓冲、全球分散、纳指风险预算、A股板块轮动到90天执行清单，把讨论过的策略统一成可跟踪系统。',`<button class="btn btn-outline" data-action="export-json">导出当前配置 ↓</button><button class="btn btn-primary" data-action="refresh-market">↻ 更新行情</button>`)}
  <section class="card obsidian-link-card"><div><div class="eyebrow">LOCAL OBSIDIAN · DOUYIN REVIEW</div><h3>抖音复盘导航台</h3><p>打开本机 Obsidian SiliconEra 库中的本地复盘导航页面。此链接只适用于 E: 盘路径存在的这台电脑。</p></div><a class="btn btn-outline" href="file:///E:/obsidian/SiliconEra/%E6%8A%95%E8%B5%84%E4%B8%8E%E4%BA%A4%E6%98%93/%E6%8A%96%E9%9F%B3%E5%A4%8D%E7%9B%98_%E5%AF%BC%E8%88%AA%E5%8F%B0.html" target="_blank" rel="noopener noreferrer">打开本地复盘导航 ↗</a></section>
  <div class="status-strip"><span class="status-chip"><span class="status-dot muted"></span><b>模式</b> ${state.meta.marketRefreshOk?'公开数据部分更新':state.meta.lastRefresh?'刷新未取得有效数据':'演示 / 历史参考'}</span><span class="status-chip"><b>执行清单</b> ${done}/${tasks.length} 完成</span><span class="status-chip"><b>风险覆盖</b> ${esc(state.profile.riskOverlay||'Caution')}</span><span class="status-chip"><b>杠杆</b> ${nd.leverageEnabled?'手动启用偏好 / 待闸门核验':'关闭'}</span><span class="status-chip"><b>自动交易</b> 关闭</span></div>
  <div class="grid grid-4 dashboard-kpis">
    ${metricCard('组合规模（示范值）',`<span>${money(state.profile.portfolioValue||100000)}</span>`,`<span class="warning">非真实账户净值 · 请录入</span>`,'◫','','/static/img/desk.jpg')}
    ${metricCard('纳指配置分',`${fmt(nd.entry,1)}<small>/100</small>`,`AI泡沫 ${fmt(nd.bubble,1)} · 2000相似度 ${fmt(nd.similarity,1)}`,'⌁',scoreType(nd.entry),'/static/covers/risk.svg')}
    ${metricCard('A股风险观察',`${highRisk}<small> / ${state.etfs.length}只</small>`,`评分低于55的观察标的数量`,'▥','warning','/static/covers/market.svg')}
    ${metricCard('90 天项目进度',`${Math.round(tasks.length?done/tasks.length*100:0)}<small>%</small>`,`已完成 ${done} 项 / 优先处理 P0`,'✓',done?'good':'','/static/covers/milestone.svg')}
  </div>
  <div class="grid grid-2" style="margin-top:14px">
    <section class="card">${cardHead('策略状态与风险预算','示范曲线仅用于验证仪表盘交互，不是历史净值曲线',tag('示意','warn'))}<div class="card-body"><div class="chart-wrap">${lineChart(curve,'示范净值曲线')}</div><div class="chart-legend"><span><i class="legend-dot" style="background:var(--accent)"></i>演示轨迹</span><span><i class="legend-dot" style="background:#607866"></i>需导入真实净值日志后启用收益统计</span></div><div class="subtle-divider"></div><div class="grid grid-3"><div class="metric-mini"><span>现金目标</span><strong>${pct(globalTargets().find(r=>r.group==='Cash')?.dynamicTarget||17,1)}</strong></div><div class="metric-mini"><span>战略权重合计</span><strong>${pct(sumT,0)}</strong></div><div class="metric-mini"><span>市场风险参考</span><strong>${fmt(marketRisk,0)}/100</strong></div></div></div></section>
    <section class="card">${cardHead('今日执行建议','根据已有的规则骨架生成；执行前先核验新鲜行情与真实持仓',tag('规则生成','good'))}<div class="card-body"><div class="recommendation"><div class="recommendation-icon">✳</div><div><div class="recommendation-label">下一步</div><strong>先补齐真实持仓、应急金和数据质量，再提高风险预算。</strong><p>全球组合优先现金/中短久期高质量债与低成本宽基；VOO/QQQ是倾斜仓而非独立分散资产。A股示范快照部分趋势字段缺失，不能把空值当成0或实时评分。</p></div></div><div class="subtle-divider"></div><div class="decision-box"><div class="eyebrow">NASDAQ LEVERAGE GATE</div><h3>${nd.leverageEnabled?'已开启手动偏好，闸门仍需重新评估':'当前默认不加杠杆（L0）'}</h3><p>需同时满足：配置分≥70、AI泡沫分&lt;55、2000相似度&lt;50、趋势向上；强主升还需考虑VIX、信用与融资成本。杠杆只作用于Swing，不用于Core。</p><div class="decision-footer"><span>当前有效敞口</span><strong>${fmt(nd.effectiveExposure||1,2)}x</strong></div></div><div class="subtle-divider"></div><div class="timeline">${(state.cadence||[]).slice(0,3).map(c=>`<div class="timeline-item"><div class="timeline-time">${esc(c.when.split(' ')[0])}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-copy"><strong>${esc(c.when)}</strong><p>${esc(c.what)}</p></div></div>`).join('')}</div></div></section>
  </div>
  <div class="grid grid-2" style="margin-top:14px">
    <section class="card">${cardHead('全球战略配置｜动态目标','当前起点来自已有工作簿，目标可修改、实际权重需本人录入',`<button class="btn btn-quiet" data-action="go-page" data-page="allocation">打开配置 →</button>`)}<div class="card-body">${allocationBars(target.map(r=>({name:r.name,target:r.dynamicTarget})).sort((a,b)=>b.target-a.target),'target',100)}<div class="subtle-divider"></div><div class="recommendation"><div class="recommendation-icon">↗</div><div><strong>${riskOverlayText()}</strong><p>动态目标是模型参考；偏离阈值达到设定值后才形成调仓候选，仍需考虑费用、税务、流动性及逻辑是否失效。</p></div></div></div></section>
    <section class="card">${cardHead('A股 ETF 候选榜','评分低于55优先观察；高分不等于自动买入',`<button class="btn btn-quiet" data-action="go-page" data-page="ashare">打开轮动 →</button>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>代码 / 名称</th><th>总分</th><th>生命周期</th><th>监控状态</th></tr></thead><tbody>${topEtfs.map(e=>`<tr><td><div class="table-main">${esc(e.code)} · ${esc(e.name)}</div><div class="table-sub">${esc(e.quality)}</div></td><td>${tag(fmt(e.score,1),scoreType(e.score))}</td><td>${esc(e.life)}</td><td>${esc(e.status)}</td></tr>`).join('')}</tbody></table></div><div class="table-note">八维评分：宏观15、政策/产业新闻15、生命周期15、量价15、成交活跃度15、情绪10、龙虎榜/梯队5、盈利/景气代理10；风险扣分单独扣除。</div></section>
  </div>
  <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('新登配置｜现金流优先','账户、技能、健康、AI工具与跨境基础设施')}<div class="card-body"><div class="metric-mini"><span>应急金目标月数</span><strong>${fmt(state.profile.emergencyMonths||6,0)} 个月</strong></div><div class="subtle-divider"></div><p class="rule-explanation">先把应急金、高息债、储蓄率及合规资金路径建立起来，再扩大投资、账户、身份或房产。身份是选择权，不是收藏指标。</p><button class="btn btn-outline" data-action="go-page" data-page="newconfig">打开90天落地 →</button></div></section><section class="card">${cardHead('内容归档与来源','聊天目录 + 原工作簿/代码工具包')}<div class="card-body"><div class="metric-mini"><span>当前可定位的项目聊天</span><strong>${state.chatArchive.length} 个</strong></div><div class="subtle-divider"></div><p class="rule-explanation">可读取的工作簿、ETF程序和策略规则已随网站源码打包。完整逐字聊天记录仍需从原始聊天导出后补齐。</p><button class="btn btn-outline" data-action="go-page" data-page="archive">检查覆盖范围 →</button></div></section></div>`;
}

function renderDashboard() {
  const source=document.createElement('div');
  source.innerHTML=renderDashboardRaw();
  const head=source.querySelector('.page-head')?.outerHTML||'';
  const kpis=source.querySelector('.dashboard-kpis')?.outerHTML||'';
  const grids=[...source.querySelectorAll(':scope > .grid.grid-2')];
  const overview=grids[0]?.outerHTML||'';
  const config=grids[1]?.outerHTML||'';
  const more=`${source.querySelector('.obsidian-link-card')?.outerHTML||''}${grids[2]?.outerHTML||''}`;
  const status=source.querySelector('.status-strip')?.outerHTML||'';
  const risk=`${status}${renderMarketActionPanel('risk')}`;
  const execution=`${renderDetailedEtfActions()}`;
  return `${head}
  ${kpis}
  <div class="dashboard-workbench" data-tab-shell data-tab-key="dashboard" data-default-tab="overview">
    <div class="fit-tabs dashboard-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="overview" role="tab" aria-selected="true">概览</button>
      <button class="fit-tab" data-tab="risk" role="tab" aria-selected="false">风险</button>
      <button class="fit-tab" data-tab="config" role="tab" aria-selected="false">配置</button>
      <button class="fit-tab" data-tab="execution" role="tab" aria-selected="false">执行</button>
      <button class="fit-tab" data-tab="more" role="tab" aria-selected="false">更多</button>
    </div>
    <div class="fit-panel active dashboard-panel" data-tab-panel="overview">${overview}</div>
    <div class="fit-panel dashboard-panel" data-tab-panel="risk">${risk}</div>
    <div class="fit-panel dashboard-panel" data-tab-panel="config">${config}</div>
    <div class="fit-panel dashboard-panel" data-tab-panel="execution">${execution}</div>
    <div class="fit-panel dashboard-panel" data-tab-panel="more">${more}</div>
  </div>`;
}
function renderAllocation() {
  const mode=ui.allocationMode;
  const rows=mode==='starter' ? state.starterAllocation : globalTargets();
  const sum=weightSum(rows, mode==='starter'?'target':'target');
  const targetSum=mode==='starter'?sum:weightSum(rows,'dynamicTarget');
  const portfolio=n(state.profile.portfolioValue,0);
  const actualSum=weightSum(rows,'current');
  const isStarter=mode==='starter';
  const riskOptions=['Normal','Caution','Stress'];
  return `${sectionHead('PORTFOLIO CONSTRUCTION','全球资产配置','保留两套历史方案：①“全球多资产动态配置”含区域股票、债券、现金、黄金、商品、REITs和数字资产；②“新登配置”核心方案：短债/现金+全球宽基，VOO/QQQ小幅倾斜、黄金分散。目标值均可改。',`<button class="btn btn-outline" data-action="open-workbook" data-workbook-id="global-multi-asset-cn">打开详细 Excel ↗</button><button class="btn btn-outline" data-action="export-json">导出配置 ↓</button>`)}
  <div class="workbook-inline-note"><strong>原始 Excel 可交互查看</strong><span>点击后可切换工作表、横向浏览全部关键字段，也可下载原始 XLSX。</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="global-multi-asset-cn">全球多资产配置 Excel ↗</button></div>
  <div class="grid grid-4">${metricCard('组合规模',money(portfolio),'示范初值；点击右侧参数修改','◫')}${metricCard('战略权重合计',pct(isStarter?sum:weightSum(state.globalAllocation,'target'),0),Math.abs((isStarter?sum:weightSum(state.globalAllocation,'target'))-100)<.1?'配置合计为100%':'⚠ 目标权重需调整至100%','◉',Math.abs((isStarter?sum:weightSum(state.globalAllocation,'target'))-100)<.1?'good':'warning')}${metricCard('动态目标合计',pct(targetSum,1),`风险覆盖：${esc(state.profile.riskOverlay||'Caution')}`,'↗')}${metricCard('已录实际权重',pct(actualSum,1),'未录入的仓位不代表真实持仓为0','▤')}</div>
  <div class="card" style="margin-top:14px">${cardHead('方案切换','切换只更换当前显示表，不会删除另一套方案',`<div class="pill-tabs"><button class="pill-tab ${!isStarter?'active':''}" data-action="allocation-mode" data-mode="global">全球多资产 Scorecard</button><button class="pill-tab ${isStarter?'active':''}" data-action="allocation-mode" data-mode="starter">新登配置核心比例</button></div>`)}
  <div class="table-wrap"><table class="data-table"><thead><tr>${isStarter?'<th>资产桶</th><th>执行纪律</th><th>目标权重%</th><th>当前市值/比例输入(%)</th><th>目标市值</th><th>偏离金额</th>':'<th>资产类别 / 组别</th><th>境内可执行工具 / 代码候选</th><th>战略权重%</th><th>综合分</th><th>动态目标%</th><th>实际权重%</th><th>目标差额(元)</th><th>硬上限</th>'}</tr></thead><tbody>${rows.map((r,i)=>{
    if(isStarter){const targetV=n(r.target),current=n(r.current),targetValue=portfolio*targetV/100,curValue=portfolio*current/100;return `<tr><td><div class="table-main">${esc(r.name)}</div></td><td><div class="table-sub">${esc(r.memo)}</div></td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="starterAllocation" data-index="${i}" data-key="target" value="${targetV}" /></td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="starterAllocation" data-index="${i}" data-key="current" value="${current}" /></td><td class="table-number">${money(targetValue)}</td><td class="table-number ${targetValue-curValue>=0?'table-positive':'table-negative'}">${money(targetValue-curValue)}</td></tr>`;}
    const dyn=n(r.dynamicTarget), curr=n(r.current), diff=(dyn-curr)/100*portfolio;
    const base=state.globalAllocation.find(x=>x.name===r.name); const idx=state.globalAllocation.indexOf(base);
    return `<tr><td><div class="table-main">${esc(r.name)}</div><div class="table-sub">${esc(r.group)}</div></td><td><div class="table-main">${esc(r.code)}</div><div class="table-sub">${esc(r.note)}</div></td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="globalAllocation" data-index="${idx}" data-key="target" value="${n(r.target)}" /></td><td><input class="table-input" type="number" min="0" max="100" step="1" data-edit="globalAllocation" data-index="${idx}" data-key="score" value="${n(r.score)}" /></td><td class="table-number">${pct(dyn,2)}</td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="globalAllocation" data-index="${idx}" data-key="current" value="${curr}" /></td><td class="table-number ${diff>=0?'table-positive':'table-negative'}">${money(diff)}</td><td>${tag(pct(r.cap||0,0),'neutral')}</td></tr>`;
  }).join('')}</tbody></table></div>
  <div class="table-note">${isStarter?'应急金独立计算；核心配置仅指投资组合比例。起始示例：25%短债/现金、50%全球宽基、10% VOO倾斜、5% QQQ倾斜、10%黄金、BTC默认0%。':'七维打分权重：趋势20%、估值15%、宏观/盈利15%、利率/流动性15%、票息/持有收益10%、分散/相关性10%、韧性/回撤15%。战术乘数：≥80分1.25；70–79.9为1.15；56–69.9为1.08；45–55.9为1；35–44.9为0.85；低于35为0.7。实际持仓和目标差额仅供复核，不是自动调仓命令。产品代码来自现有模板，购买前核验最新产品公告、成交、申购状态及QDII溢价。'}</div></div>
  <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('账户参数与风险覆盖','组合规模、调仓阈值与市场压力场景')}
    <div class="card-body"><div class="input-grid"><div class="field"><label>组合规模（人民币）</label><input type="number" min="0" step="1000" data-profile="portfolioValue" value="${n(state.profile.portfolioValue)}" /></div><div class="field"><label>调仓阈值（百分点）</label><input type="number" min="0.1" max="20" step="0.5" data-profile="rebalanceThreshold" value="${n(state.profile.rebalanceThreshold,2)}" /></div><div class="field"><label>风险覆盖模式</label><select data-profile="riskOverlay">${riskOptions.map(x=>`<option ${x===(state.profile.riskOverlay||'Caution')?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>现金战略目标（%）</label><input type="number" min="5" max="30" step="1" data-profile="cashTarget" value="${n(state.profile.cashTarget,12)}" /></div><div class="field"><label>最大权益风险仓位（%）</label><input type="number" min="0" max="100" step="1" data-profile="maxEquity" value="${n(state.profile.maxEquity,65)}" /></div><div class="field"><label>单只ETF最大目标仓位（%）</label><input type="number" min="0" max="100" step="1" data-profile="singleEtfCap" value="${n(state.profile.singleEtfCap,12)}" /></div></div><div class="subtle-divider"></div><div class="recommendation"><div class="recommendation-icon">⌁</div><div><strong>${esc(state.profile.riskOverlay||'Caution')} · ${riskOverlayText()}</strong><p>Normal：常规再平衡；Caution：油价与长端利率急升、股债相关性走高或VIX在20–30时提高现金5个百分点；Stress：VIX>30、信用利差明显走阔或组合回撤接近/超过8%，提高现金12个百分点并暂停杠杆、追涨。</p></div></div></div></section>
  <section class="card">${cardHead('目标分布可视化','按当前模式实时计算目标比例')}<div class="card-body">${allocationBars(isStarter?rows:rows.map(r=>({...r,target:r.dynamicTarget})).sort((a,b)=>n(b.target)-n(a.target)),'target',100)}<div class="subtle-divider"></div><p class="rule-explanation">所有比例均为可编辑起始样例，不代表个性化建议。全球宽基、VOO和QQQ之间存在明显成分重叠；区域ETF亦存在代理不完整、基金注册地、汇率、税务与折溢价风险。</p></div></section></div>`;
}

function computeNasdaqFromInputs() {
  const d=state.nasdaq;
  const valRisk=clamp((n(d.forwardPE,21.35)-17)/(28-17)*100);
  const earnRisk=clamp(65-n(d.epsGrowth,29.5));
  const rateRisk=clamp((n(d.tenYear,5.27)-2.5)/(6-2.5)*100);
  const vixRisk=clamp((n(d.vix,15.08)-12)/(40-12)*100);
  const capex=clamp(d.aiCapexRisk,0,100), fcf=clamp(d.fcfRoicRisk,0,100), monet=clamp(d.monetizationRisk,0,100), finance=clamp(d.financingRisk,0,100), conc=clamp(d.concentrationRisk,0,100);
  const weights={valRisk:.15,earnRisk:.15,capex:.15,fcf:.15,monet:.10,finance:.10,rateRisk:.10,conc:.05,vixRisk:.05};
  d.bubble=Object.entries({valRisk,earnRisk,capex,fcf,monet,finance,rateRisk,conc,vixRisk}).reduce((sum,[k,v])=>sum+v*weights[k],0);
  const dd= n(d.drawdown,0);
  const ddEntry=clamp(-dd*4+20);
  const valEntry=100-valRisk;
  const earnEntry=clamp(50+n(d.epsGrowth,29.5));
  const macroEntry=100-rateRisk;
  const breadthEntry=100-conc;
  d.entry=valEntry*.30+ddEntry*.25+earnEntry*.20+macroEntry*.15+breadthEntry*.10;
  const similarity=[valRisk*.45,earnRisk*.25,clamp((n(d.aiCapexRisk,80)-20)/80*100),finance,conc,100-conc];
  d.similarity=similarity.reduce((a,b)=>a+b,0)/6;
  d.coverage= n(d.coverage,62);
  d.targetPosition=clamp(25+75*d.entry/100-45*d.bubble/100,10,100);
  const ddAbs=Math.abs(dd)/100;
  d.nextTrigger = ddAbs<.05 ? `${n(d.ath)*(1-.05)}` : ddAbs<.08 ? `${n(d.ath)*(1-.08)}` : ddAbs<.12 ? `${n(d.ath)*(1-.12)}` : ddAbs<.16 ? `${n(d.ath)*(1-.16)}` : ddAbs<.20 ? `${n(d.ath)*(1-.20)}` : '切换熊市确认模式';
  const crisisGate = n(d.bubble)>=70 || n(d.similarity)>=70 || Math.abs(dd)>=20 || n(d.vix)>=30;
  const overheatGate = n(d.price20Dev)>=10 || n(d.rsi)>=75;
  const trend = !!d.trendConfirmed, coverageOK = n(d.coverage,62)>=60, creditOK = d.creditNormal===true;
  const dataGate=marketDecisionGate(), dataLeverageOK=dataGate.leverageAllowed===true;
  if (crisisGate) d.leverageLevel='L5';
  else if (overheatGate) d.leverageLevel='L3';
  else if (dataLeverageOK && n(d.entry)>=80 && n(d.bubble)<45 && n(d.similarity)<40 && n(d.vix)<22 && trend && coverageOK && creditOK) d.leverageLevel='L2';
  else if (dataLeverageOK && n(d.entry)>=70 && n(d.bubble)<55 && n(d.similarity)<50 && trend && coverageOK && creditOK) d.leverageLevel='L1';
  else d.leverageLevel='L0';
  const leverageAllowed = d.leverageEnabled===true && ['L1','L2'].includes(d.leverageLevel);
  d.effectiveExposure = leverageAllowed ? (d.leverageLevel==='L2' ? 1.2 : 1.1) : 1.0;
  return d;
}
function renderNasdaq() {
  const d=state.nasdaq;
  const pyramid = (state.meta.pyramidVersion==='v1') ? [{dd:-5,a:5},{dd:-8,a:7.5},{dd:-12,a:10},{dd:-16,a:12.5},{dd:-20,a:15}] : [{dd:-5,a:5},{dd:-8,a:7.5},{dd:-12,a:7.5},{dd:-16,a:7.5},{dd:-20,a:7.5}];
  const draw=n(d.drawdown);
  const next=pyramid.filter(x=>draw<=x.dd).sort((a,b)=>a.dd-b.dd).slice(-1)[0];
  const trendPass=!!d.trendConfirmed;
  const dataGate=marketDecisionGate();
  const leverageOk=['L1','L2'].includes(d.leverageLevel) && d.leverageEnabled===true && dataGate.leverageAllowed===true;
  const core=n(d.targetPosition)*.575,swing=n(d.targetPosition)*.225,crisis=20;
  const weights=[['估值风险', n(d.forwardPE)?clamp((n(d.forwardPE)-17)/11*100):null],['盈利风险',clamp(65-n(d.epsGrowth))],['AI CapEx / 收入剪刀差',n(d.aiCapexRisk)],['FCF / ROIC',n(d.fcfRoicRisk)],['AI终端变现',n(d.monetizationRisk)],['AI融资风险',n(d.financingRisk)],['利率/流动性',clamp((n(d.tenYear)-2.5)/3.5*100)],['宽度/集中度',n(d.concentrationRisk)],['信用/波动率',clamp((n(d.vix)-12)/28*100)]];
  return `${sectionHead('NASDAQ AI / POSITION ENGINE','纳斯达克 AI 策略','将AI泡沫风险、2000年结构相似度、配置分、回撤分层、Core/Swing/Crisis、波段规则、Kelly上限与杠杆闸门合并。分数是风险预算器，不预测明日涨跌。',`<button class="btn btn-outline" data-action="open-workbook" data-workbook-id="nasdaq-v3">打开详细 Excel ↗</button><button class="btn btn-outline" data-action="nasdaq-recalc">按当前输入重算 ↻</button>`)}
  <div class="workbook-inline-note"><strong>纳指策略原始工作簿</strong><span>包含逐日技术表、七维风险评分、历史回撤事件、Core/Swing/Crisis 和杠杆闸门细节。</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="nasdaq-v3">预览 V3 Excel ↗</button></div>
  <div class="status-strip"><span class="status-chip"><b>快照日期</b> ${esc(state.meta.nasdaqDate||'2026-10-07参考')}</span><span class="status-chip"><b>数据覆盖率</b> ${fmt(d.coverage,0)}%</span><span class="status-chip"><b>策略状态</b> ${esc(d.leverageLevel||'L0')}</span><span class="status-chip"><b>杠杆状态</b> ${leverageOk?'开关启用且通过闸门':(['L1','L2'].includes(d.leverageLevel)?'策略闸门可观察，但手动开关关闭':'否 / 条件不齐')}</span></div>
  <div class="grid grid-3"><section class="card"><div class="card-body"><div class="risk-gauge"><div class="gauge-ring" style="--gauge:${n(d.bubble)}%"><strong>${fmt(d.bubble,1)}</strong></div><div class="gauge-copy"><div class="eyebrow">RISK SCORE</div><h3>AI 泡沫分</h3><p>分数越高越危险。55以上警戒减少激进加仓，70以上禁止新增杠杆，85以上防守。</p></div></div><div class="subtle-divider"></div><div class="score-bars">${weights.slice(0,5).map(([name,val])=>`<div class="score-bar-row"><span class="score-bar-label">${name}</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${val===null?0:clamp(val)}%"></div></div><span class="score-bar-number">${val===null?'—':fmt(val,0)}</span></div>`).join('')}</div></div></section>
  <section class="card"><div class="card-body"><div class="risk-gauge"><div class="gauge-ring" style="--gauge:${n(d.similarity)}%"><strong>${fmt(d.similarity,1)}</strong></div><div class="gauge-copy"><div class="eyebrow">DOT-COM COMPARISON</div><h3>2000 相似度</h3><p>估值极端、盈利/现金流、CapEx债务化、融资、集中度、市场广度；越高越接近互联网泡沫式结构。</p></div></div><div class="subtle-divider"></div><div class="score-bars">${[['估值极端',clamp((n(d.forwardPE)-17)/11*100)],['盈利质量风险',clamp(65-n(d.epsGrowth))],['资本开支压力',n(d.aiCapexRisk)],['融资风险',n(d.financingRisk)],['集中度',n(d.concentrationRisk)]].map(([name,val])=>`<div class="score-bar-row"><span class="score-bar-label">${name}</span><div class="score-bar-track"><div class="score-bar-fill" style="width:${clamp(val)}%;background:${n(val)>=70?'var(--bad)':'#96bf66'}"></div></div><span class="score-bar-number">${fmt(val,0)}</span></div>`).join('')}</div></div></section>
  <section class="card"><div class="card-body"><div class="risk-gauge"><div class="gauge-ring" style="--gauge:${n(d.entry)}%"><strong>${fmt(d.entry,1)}</strong></div><div class="gauge-copy"><div class="eyebrow">ENTRY OPPORTUNITY</div><h3>纳指配置分</h3><p>越高越适合增加风险预算，但必须结合泡沫分、趋势、覆盖率与个人风险承受能力。</p></div></div><div class="subtle-divider"></div><div class="grid grid-2"><div class="metric-mini"><span>建议目标仓位</span><strong>${pct(d.targetPosition,1)}</strong></div><div class="metric-mini"><span>当前仓位输入</span><strong>${pct(d.actualPosition,1)}</strong></div></div><div class="subtle-divider"></div><div class="decision-box"><div class="eyebrow">ACTION ENGINE</div><h3>${d.leverageLevel==='L2'?'L2 主升观察':d.leverageLevel==='L1'?'L1 趋势确认观察':d.leverageLevel==='L3'?'L3 过热 / 降杠杆':d.leverageLevel==='L4'?'L4 趋势破坏 / 去杠杆':d.leverageLevel==='L5'?'L5 熊市 / 危机闸门':'L0 偏热/中性'}</h3><p>${n(d.bubble)>=70?'泡沫风险偏高，冻结激进资金，优先防守。':n(d.entry)>=70?'入场分达到高位；需趋势、估值和覆盖率复核后分批，而非一次性满仓。':'配置分暂未越过70分门槛，不新增杠杆，按基础仓与定投纪律执行。'}</p><div class="decision-footer"><span>杠杆执行状态</span><strong>${leverageOk?'ENABLED':(['L1','L2'].includes(d.leverageLevel)?'GATE PASS · SWITCH OFF':'NOT PASSED')}</strong></div></div></div></section></div>
  <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('行情与人工输入','自动抓取与手动字段分开；缺失数据不会被猜测为0')}
    <div class="card-body"><div class="input-grid"><div class="field"><label>NDX 当前/最近点位</label><input type="number" step=".01" data-nasdaq="ndx" value="${n(d.ndx)}" /></div><div class="field"><label>ATH / 历史高点参考</label><input type="number" step=".01" data-nasdaq="ath" value="${n(d.ath)}" /></div><div class="field"><label>距高点回撤（%）</label><input type="number" step=".01" data-nasdaq="drawdown" value="${n(d.drawdown)}" /><small>按百分比输入，如 -5 代表 -5%，不是 -0.05。</small></div><div class="field"><label>VIX</label><input type="number" step=".01" data-nasdaq="vix" value="${n(d.vix)}" /></div><div class="field"><label>美国10年收益率（%）</label><input type="number" step=".01" data-nasdaq="tenYear" value="${n(d.tenYear)}" /></div><div class="field"><label>NDXE</label><input type="number" step=".01" data-nasdaq="ndxe" value="${n(d.ndxe)}" /></div><div class="field"><label>Forward PE（人工/第三方）</label><input type="number" step=".1" data-nasdaq="forwardPE" value="${n(d.forwardPE)}" /></div><div class="field"><label>EPS Growth（%）</label><input type="number" step=".1" data-nasdaq="epsGrowth" value="${n(d.epsGrowth)}" /></div><div class="field"><label>EPS 3个月修正（%）</label><input type="number" step=".1" data-nasdaq="epsRevision3m" value="${n(d.epsRevision3m)}" /></div><div class="field"><label>AI CapEx 风险分</label><input type="number" min="0" max="100" data-nasdaq="aiCapexRisk" value="${n(d.aiCapexRisk)}" /></div><div class="field"><label>FCF / ROIC 风险分</label><input type="number" min="0" max="100" data-nasdaq="fcfRoicRisk" value="${n(d.fcfRoicRisk)}" /></div><div class="field"><label>AI终端变现风险分</label><input type="number" min="0" max="100" data-nasdaq="monetizationRisk" value="${n(d.monetizationRisk)}" /></div><div class="field"><label>AI融资风险分</label><input type="number" min="0" max="100" data-nasdaq="financingRisk" value="${n(d.financingRisk)}" /></div><div class="field"><label>集中度/市场广度风险分</label><input type="number" min="0" max="100" data-nasdaq="concentrationRisk" value="${n(d.concentrationRisk)}" /></div><div class="field"><label>人工设定数据覆盖率（%）</label><input type="number" min="0" max="100" data-nasdaq="coverage" value="${n(d.coverage)}" /></div><div class="field"><label>实际纳指仓位（%）</label><input type="number" min="0" max="100" data-nasdaq="actualPosition" value="${n(d.actualPosition)}" /></div><div class="field"><label>趋势已人工确认？</label><select data-nasdaq-bool="trendConfirmed"><option value="false" ${!d.trendConfirmed?'selected':''}>否 / 未核验</option><option value="true" ${d.trendConfirmed?'selected':''}>是 / 已核验</option></select></div><div class="field"><label>20DMA乖离（%）</label><input type="number" step=".1" data-nasdaq="price20Dev" value="${n(d.price20Dev)}" /></div><div class="field"><label>RSI（14）</label><input type="number" min="0" max="100" step=".1" data-nasdaq="rsi" value="${n(d.rsi)}" /></div><div class="field"><label>信用条件是否正常？</label><select data-nasdaq-bool="creditNormal"><option value="false" ${!d.creditNormal?'selected':''}>否 / 未核验</option><option value="true" ${d.creditNormal?'selected':''}>是 / 已核验</option></select></div><div class="field"><label>手动杠杆偏好（不覆盖风险闸门）</label><select data-nasdaq-bool="leverageEnabled"><option value="false" ${!d.leverageEnabled?'selected':''}>关闭</option><option value="true" ${d.leverageEnabled?'selected':''}>启用研究策略</option></select></div></div><div class="subtle-divider"></div><div class="field"><label>人工核验备注</label><textarea data-nasdaq="manualNote">${esc(d.manualNote||'')}</textarea></div><div style="margin-top:12px"><button class="btn btn-primary" data-action="nasdaq-recalc">重算分数、仓位和杠杆等级</button></div></div></section>
    <section class="card">${cardHead('25 / 25 / 50 建仓与回撤梯队','可切换原始V1与后续V3工作簿方案')}
      <div class="card-body"><div class="form-row"><div class="field"><label>回撤分层版本</label><select id="pyramidVersion"><option value="v3" ${state.meta.pyramidVersion!=='v1'?'selected':''}>V3：-5/-8/-12/-16/-20，各5/7.5/7.5/7.5/7.5%</option><option value="v1" ${state.meta.pyramidVersion==='v1'?'selected':''}>V1：-5/-8/-12/-16/-20，5/7.5/10/12.5/15%</option></select></div><div class="field"><label>时间定投节奏</label><input value="每周约2% · 约10周" readonly /></div></div><div class="stacked-meter"><span style="width:25%;background:var(--accent)"></span><span style="width:25%;background:#90b0a1"></span><span style="width:50%;background:#47594a"></span></div><div class="legend-row"><span><i style="background:var(--accent)"></i>25% 首笔底仓</span><span><i style="background:#90b0a1"></i>25% 时间定投</span><span><i style="background:#47594a"></i>50% 回撤储备</span></div><div class="subtle-divider"></div><div class="table-wrap"><table class="data-table" style="min-width:420px"><thead><tr><th>距ATH回撤触发</th><th>规划资金比例</th><th>当前状态</th></tr></thead><tbody>${pyramid.map(p=>`<tr><td>${p.dd}%</td><td>${p.a}%</td><td>${draw<=p.dd?tag('已触发','warn'):tag('等待','neutral')}</td></tr>`).join('')}</tbody></table></div><div class="recommendation" style="margin-top:13px"><div class="recommendation-icon">!</div><div><strong>回撤达到 -20% 以后，停止机械马丁。</strong><p>切换熊市确认模式；历史示例包含 2000–2002（约-83%）、2008（约-53.7%）、2020（约-28.6%）、2022（约-35.6%）等风险事件。历史最大跌幅/恢复周期需按可靠数据源复核。</p></div></div><div class="subtle-divider"></div><div class="grid grid-3"><div class="metric-mini"><span>Core</span><strong>55–60%</strong><span>不参与波段</span></div><div class="metric-mini"><span>Swing</span><strong>20–25%</strong><span>只做多 / 过热减仓</span></div><div class="metric-mini"><span>Crisis</span><strong>15–20%</strong><span>尾部弹药</span></div></div><p class="rule-explanation" style="margin:12px 0 0">1/4 Kelly仅在有足够历史回撤样本时作为单次加仓上限；数据不足时标低置信度。需要回测2000、2008、2020、2022、2025–2026，并评估最大回撤、年化、Sortino、Calmar、现金机会成本及境内QDII折溢价偏差。</p></div></section></div>
  <section class="card" style="margin-top:14px">${cardHead('波段与杠杆闸门｜只作用于 Swing，不用于 Core')}
    <div class="table-wrap"><table class="data-table"><thead><tr><th>状态</th><th>条件</th><th>有效敞口</th><th>允许新增杠杆</th><th>触发/退出</th></tr></thead><tbody>
      <tr><td>${tag('L0 常规/偏热','neutral')}</td><td>配置分&lt;70 或 泡沫分≥55，或趋势未确认</td><td>1.00x</td><td>${tag('否','bad')}</td><td>观望；不为了追主升借钱</td></tr>
      <tr><td>${tag('L1 强主升','good')}</td><td>配置分≥70、AI泡沫&lt;55、2000相似度&lt;50，且价格站上50DMA、均线向上</td><td>1.10x–1.20x</td><td>${tag('条件允许','warn')}</td><td>跌破50DMA连续2日去杠杆；新增≤10%</td></tr>
      <tr><td>${tag('L2 极强主升','good')}</td><td>配置分≥80、AI泡沫&lt;45、相似度&lt;40、VIX&lt;22、信用正常、20WMA&gt;40WMA且趋势上行</td><td>1.20x–1.25x</td><td>${tag('仅Swing','warn')}</td><td>跌破20DMA或动量失速；总敞口硬上限1.25x</td></tr>
      <tr><td>${tag('L3 过热','warn')}</td><td>价格高于20DMA超过10%或RSI&gt;75</td><td>1.00x–1.10x</td><td>${tag('不加','bad')}</td><td>锁利润，Swing减至10%–15%</td></tr>
      <tr><td>${tag('L4/L5 破坏/熊市','bad')}</td><td>跌破50DMA且拐头向下；回撤≤-20%或长期趋势破坏；VIX≥30</td><td>≤1.00x</td><td>${tag('禁止','bad')}</td><td>优先去杠杆、还债；启用Crisis Reserve</td></tr>
    </tbody></table></div><div class="table-note">可选杠杆方式及风险：保证金借款（融资利息、追加保证金、强平）；杠杆ETF（每日重置、路径依赖、波动损耗，不作Core）；期货/期权（保证金、Gamma、基差与流动性风险，非默认方案）。当前参考状态：AI泡沫分54.05、配置分52.15、NDX接近高点、10Y约5.27%——参考快照下不新增杠杆。</div>
  </section>`;
}


function alphaStageLabel(v){return ({1:'① 原始信息',2:'② 少数人理解',3:'③ 资金开始交易',4:'④ 大众形成共识',5:'⑤ 拥挤/反转'})[n(v)]||'—';}
function alphaScore(x){
  const fundamental=clamp(x.fundamental), catalyst=clamp(x.catalyst), capital=clamp(x.capital), attention=clamp(x.attention), crowding=clamp(x.crowding), priced=clamp(x.priced);
  const early=Math.max(0,100-(attention*.55+crowding*.45));
  return clamp(fundamental*.24+catalyst*.22+capital*.16+early*.22+(100-priced)*.16,0,100);
}
function alphaAction(x,score){
  if(n(x.stage)>=5||n(x.crowding)>=80||n(x.priced)>=85) return '反转候选 · 不追高';
  if(score>=75&&n(x.stage)<=2) return '重点研究 · 扫描二/三阶映射';
  if(score>=62) return '进入观察池 · 等价格/催化确认';
  if(score>=45) return '继续跟踪 · 暂不交易';
  return '低优先级';
}
function renderAlphaRadar(){
  const rows=(state.alphaRadarSignals||[]).map((x,i)=>({...x,_i:i,_score:alphaScore(x)})).sort((a,b)=>b._score-a._score);
  const top=rows.filter(x=>x._score>=n(state.alphaRadarConfig?.minScore,45)).slice(0,n(state.alphaRadarConfig?.topN,5));
  const radarNames=[['Narrative','黄金/白银/AI/全球泡沫','基本面变化 − 共识/拥挤'],['X / People','Musk / Huang / Altman','人物 → 技术 → 必需部件'],['Private','Pre-IPO / 暗盘','估值锚是否迁移'],['13F','顶级机构 Δ13F','新建仓/连续加仓/共识变化'],['Fed','官员讲话 / FOMC','实际发言 − 市场预期'],['Supply Chain','二阶/三阶产业链','全球供应商 → 中国/A股映射'],['Crowding','搜索/资金/杠杆/价格','是否已经被充分交易']];
  return `${sectionHead('INFORMATION EDGE · BEFORE CONSENSUS','Alpha Radar','不是汇总更多新闻，而是监控“信息出现 → 少数人理解 → 资金交易 → 大众共识”的扩散链，优先寻找尚未被价格充分反映的二阶、三阶机会。',`<button class="btn btn-primary" data-action="alpha-focus-form">＋ 记录新信号</button>`)}
  <section class="alpha-hero card"><div><div class="eyebrow">TODAY · TOP ${top.length||0}</div><h2>每天只看 3–5 条认知差</h2><p>Alpha Score = 基本面24% + 催化22% + 资金潜力16% + 低关注/低拥挤22% + 未定价16%。高分不是买入信号；仍需价格、流动性和你的交易系统确认。</p></div><div class="alpha-kpis"><div><b>${rows.length}</b><small>监控信号</small></div><div><b>${top.length}</b><small>今日候选</small></div><div><b>${rows.filter(x=>n(x.stage)<=2).length}</b><small>早期阶段</small></div></div></section>
  <section class="alpha-radar-grid">${radarNames.map(r=>`<article class="card alpha-radar-card"><span>${r[0]}</span><strong>${r[1]}</strong><small>${r[2]}</small></article>`).join('')}</section>
  <section class="card alpha-official"><div class="card-head"><div><h3>关键官方窗口</h3><p>用于提醒“什么时候应该提高雷达灵敏度”，不是预测结果。</p></div><span class="tag">OFFICIAL</span></div><div class="alpha-official-grid"><div><b>FOMC · 2026-10-27/28</b><small>会议前后重点比较市场定价与声明/发布会的预期差。</small></div><div><b>Q3 13F · 截止 2026-11-16</b><small>13F 最多滞后 45 天；重点比较 Δ13F，不做简单抄作业。</small></div></div></section>
  <section class="card"><div class="card-head"><div><h3>今日 Alpha Top 3–5</h3><p>优先显示高分且仍处于信息扩散早期的主题。</p></div><span class="tag good">${top.length} 条</span></div>${top.length?`<div class="alpha-top-list">${top.map((x,k)=>`<article><div class="alpha-rank">${String(k+1).padStart(2,'0')}</div><div class="alpha-top-main"><div><strong>${esc(x.title)}</strong><span class="tag">${esc(x.radar||'Narrative')}</span><span class="tag">${alphaStageLabel(x.stage)}</span></div><p>${esc(x.thesis||'尚未填写核心认知差。')}</p><small>映射：${esc(x.mapping||'待扫描')} · 锚/预期：${esc(x.anchor||'待建立')}</small></div><div class="alpha-score"><b>${x._score.toFixed(0)}</b><small>ALPHA</small><em>${alphaAction(x,x._score)}</em></div></article>`).join('')}</div>`:`<div class="empty-state">还没有达到阈值的信号。先记录主题，再对基本面、催化、资金潜力、关注度、拥挤度和价格透支程度评分。</div>`}</section>
  <section class="card"><div class="card-head"><div><h3>全量监控台</h3><p>每条信号都保留来源/证据、估值锚、A股/ETF映射和下一步动作。</p></div><span class="tag">${rows.length} SIGNALS</span></div><div class="table-wrap"><table class="alpha-table"><thead><tr><th>主题</th><th>雷达</th><th>阶段</th><th>基本面</th><th>催化</th><th>关注</th><th>拥挤</th><th>已定价</th><th>Alpha</th><th>映射/动作</th><th></th></tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><b>${esc(x.title)}</b><small>${esc(x.updatedAt||'')}</small></td><td>${esc(x.radar||'—')}</td><td>${alphaStageLabel(x.stage)}</td><td>${n(x.fundamental)}</td><td>${n(x.catalyst)}</td><td>${n(x.attention)}</td><td>${n(x.crowding)}</td><td>${n(x.priced)}</td><td><b>${x._score.toFixed(0)}</b></td><td><span>${esc(x.mapping||'待扫描')}</span><small>${alphaAction(x,x._score)}</small></td><td><button class="btn btn-outline btn-xs" data-action="alpha-delete" data-index="${x._i}">删除</button></td></tr>`).join(''):`<tr><td colspan="11" class="muted">暂无信号。</td></tr>`}</tbody></table></div></section>
  <section class="card" id="alphaSignalFormCard"><div class="card-head"><div><h3>记录 / 评分一个新信号</h3><p>建议先写“为什么市场可能还没充分理解”，再打分；不要为了得到高分反向修改假设。</p></div></div><form id="alphaSignalForm" class="alpha-form"><label>主题<input name="title" required placeholder="例如：飞行汽车二阶供应链" /></label><label>雷达<select name="radar"><option>Narrative</option><option>X / People</option><option>Private</option><option>13F</option><option>Fed</option><option>Supply Chain</option><option>Crowding</option></select></label><label>信息阶段<select name="stage"><option value="1">① 原始信息</option><option value="2" selected>② 少数人理解</option><option value="3">③ 资金开始交易</option><option value="4">④ 大众共识</option><option value="5">⑤ 拥挤/反转</option></select></label><label>基本面 0–100<input name="fundamental" type="number" min="0" max="100" value="60" /></label><label>催化 0–100<input name="catalyst" type="number" min="0" max="100" value="60" /></label><label>资金潜力 0–100<input name="capital" type="number" min="0" max="100" value="50" /></label><label>市场关注度 0–100<input name="attention" type="number" min="0" max="100" value="30" /></label><label>拥挤度 0–100<input name="crowding" type="number" min="0" max="100" value="30" /></label><label>价格已反映 0–100<input name="priced" type="number" min="0" max="100" value="30" /></label><label class="wide">核心认知差<textarea name="thesis" rows="2" placeholder="基本面/预期发生了什么变化，市场为什么可能尚未理解？"></textarea></label><label class="wide">估值锚 / 市场预期<textarea name="anchor" rows="2" placeholder="融资估值、ARR倍数、利率路径、市场隐含预期……"></textarea></label><label class="wide">美股 / 港股 / A股 / ETF 映射<textarea name="mapping" rows="2" placeholder="一阶标的 → 二阶部件 → 三阶供应链；写明待核验项"></textarea></label><label class="wide">来源 / 证据<textarea name="evidence" rows="2" placeholder="记录来源名称、日期、链接或原始数据；关键交易前再次核验"></textarea></label><div class="wide form-actions"><button class="btn btn-primary" type="submit">保存到 Alpha Radar</button></div></form></section>`;
}

function renderAshare() {
  const search=(ui.etfSearch||'').toLowerCase();
  const group=ui.etfGroup||'全部';
  const rows=state.etfs.filter(e=>(group==='全部'||e.riskGroup===group||e.group===group) && `${e.code} ${e.name} ${e.group} ${e.status}`.toLowerCase().includes(search));
  const avg=state.etfs.length?state.etfs.reduce((s,e)=>s+n(e.score),0)/state.etfs.length:0;
  const risk=n(state.profile.marketRisk,22);
  const dimLabels={macro:'宏观/市场',policy:'政策/产业',life:'生命周期',technical:'量价形态',activity:'资金活跃度',sentiment:'市场情绪',ladder:'龙虎榜/梯队',earnings:'盈利/景气'};
  const low=state.etfs.filter(e=>n(e.score)<55).length;
  return `${sectionHead('A-SHARE ETF ROTATION','A股 ETF 轮动','复刻已有跟踪工具：行情/均线/相对强弱、八维评分、生命周期、市场情绪、主题上限与每日快照。输入的实际仓位和分数可修改；不自动下单。',`<button class="btn btn-outline" data-action="open-workbook" data-workbook-id="ashare-latest">打开最新 Excel ↗</button><button class="btn btn-outline" data-action="export-json">导出跟踪配置 ↓</button><button class="btn btn-primary" data-action="refresh-market">刷新日线行情 ↻</button>`)}
    <div class="workbook-inline-note"><strong>详细数据与评分依据</strong><span>最新交付工作簿保留完整快照、历史行情字段、数据质量及数据字典。</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="ashare-latest">预览 A股 ETF Excel ↗</button></div>
    <div class="status-strip"><span class="status-chip"><b>数据状态</b> ${esc(state.meta.marketRefreshStatus||'历史快照')} · ${esc(state.meta.marketQuality||'未刷新')}</span><span class="status-chip"><b>最近成功</b> ${esc(state.meta.lastSuccessfulMarketRefreshAt?new Date(state.meta.lastSuccessfulMarketRefreshAt).toLocaleString('zh-CN',{hour12:false}):'暂无全量成功')}</span><span class="status-chip"><b>ETF池</b> ${state.etfs.length}只</span><span class="status-chip"><b>低于55分</b> ${low}只</span><span class="status-chip"><b>市场风险代理</b> ${fmt(risk,0)}/100</span><span class="status-chip"><b>平均分</b> ${fmt(avg,1)}</span><span class="status-chip">分数低不代表自动卖出；缺失数据降置信，不按0分处理</span></div>
    <div class="grid grid-4">${metricCard('观察池',`${state.etfs.length} <small>只 ETF</small>`,'覆盖宽基、科技、周期、防御','▥')}${metricCard('数据质量',state.meta.marketQuality||'历史样例','行情刷新后显示成功与失败统计','◉')}${metricCard('模型权益上限',pct(n(state.profile.marketEquityCap,15),0),'参考快照的风险预算示例，可编辑','⌁')}${metricCard('单只ETF仓位上限',pct(n(state.profile.singleEtfCap,12),0),'主题组上限还需合并检查','▤')}</div>
    <section class="card" style="margin-top:14px">${cardHead('ETF评分与仓位建议','本地快照日期与逐项数据质量请一起阅读。8维分数和风险扣分可展开调整。',`<div class="table-toolbar"><input class="search-input" id="etfSearch" placeholder="搜索代码/板块" value="${esc(ui.etfSearch||'')}" /><select id="etfGroup" class="table-select"><option>全部</option>${[...new Set(state.etfs.map(e=>e.riskGroup||e.group))].map(g=>`<option ${group===g?'selected':''}>${esc(g)}</option>`).join('')}</select></div>`)}
      <div class="table-wrap"><table class="data-table"><thead><tr><th>代码 / 板块</th><th>最新参考价</th><th>日涨跌</th><th>20日收益</th><th>总分</th><th>生命周期 / 监控状态</th><th>目标仓位%</th><th>实际仓位%</th><th>差额%</th><th>评分依据 / 数据质量</th><th>维度</th></tr></thead><tbody>${rows.map((e)=>{const i=state.etfs.indexOf(e),parts=e.parts||{},score=Object.values(parts).reduce((s,v)=>s+n(v),0)-n(e.riskPenalty,0);return `<tr><td><div class="table-main">${esc(e.code)} · ${esc(e.name)}</div><div class="table-sub">${esc(e.group)}</div></td><td class="table-number">${e.price==null?'—':fmt(e.price,3)}<div class="table-sub market-provenance">${esc(e.marketDate||'旧快照/无行情日期')} · ${esc(e.marketSourceTier==='backup'?'备用源':e.marketSourceTier==='primary'?'主源':'来源未知')}</div><div class="table-sub">${esc(e.marketUpdatedAt?new Date(e.marketUpdatedAt).toLocaleString('zh-CN',{hour12:false}):'未记录成功更新时间')}</div></td><td>${e.change==null?'—':formatDelta(e.change)}</td><td>${e.r20==null?'—':formatDelta(e.r20)}</td><td>${tag(fmt(e.score,1),scoreType(e.score))}<div class="table-sub">模型重算 ${fmt(score,1)}</div></td><td>${tag(e.life||'待确认',n(e.score)<40?'bad':n(e.score)<55?'warn':'neutral')}<div class="table-sub">${esc(e.status||'观察')}</div></td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="etfs" data-index="${i}" data-key="target" value="${n(e.target)}" /></td><td><input class="table-input" type="number" min="0" max="100" step="0.5" data-edit="etfs" data-index="${i}" data-key="current" value="${n(e.current)}" /></td><td class="table-number">${fmt(n(e.target)-n(e.current),1)}</td><td><div class="table-sub">${esc(e.note||'')}</div><div class="quality-note">${esc(e.quality||'未核验')}</div></td><td><button class="btn btn-small btn-outline" data-action="toggle-etf-parts" data-index="${i}">${ui.expandedETF===e.code?'收起':'编辑'}评分</button></td></tr>${ui.expandedETF===e.code?`<tr><td colspan="11"><div class="dimension-editor"><div class="dimension-grid">${Object.entries(dimLabels).map(([k,label])=>`<label>${label}<input type="number" min="0" max="15" step="0.5" data-etf-part="${k}" data-index="${i}" value="${n(parts[k])}" /></label>`).join('')}<label>风险扣分<input type="number" min="0" max="100" step="0.5" data-etf-risk="${i}" value="${n(e.riskPenalty)}" /></label></div><div class="field"><label>依据摘要 / 数据质量备注</label><textarea data-etf-note="${i}">${esc(e.note||'')}</textarea></div><div class="table-note">评分口径：宏观15、政策新闻15、生命周期15、量价15、资金活跃15、情绪10、龙虎榜/梯队5、盈利/景气10；总分 = 八维加总 - 风险扣分。当前各输入分值因项目表格缩放到0–15/10等原始分区间；请按你保存的算法口径维护。</div></div></td></tr>`:''}`}).join('')}</tbody></table></div>
      <div class="table-note">当前列表包含原快照的 18 只观察池示例：510300、510500、159915、588000、512880、510880、512480、512760、159819、515050、512660、515030、515790、512400、562800、562500、512010、512800。用户可从 JSON 编辑/补充其它ETF。行情自动刷新来源为 AKShare/东方财富日线；公共接口会限流或更改字段，抓取不成功时保留旧值并显示错误。</div>
    </section>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('市场状态与组合风控','建议阈值、主题合并上限与日常筛选可调整')}<div class="card-body"><div class="input-grid"><div class="field"><label>市场风险代理分（0–100）</label><input type="number" min="0" max="100" data-profile="marketRisk" value="${n(state.profile.marketRisk,22)}" /></div><div class="field"><label>权益ETF最大总仓位（%）</label><input type="number" min="0" max="100" data-profile="marketEquityCap" value="${n(state.profile.marketEquityCap,15)}" /></div><div class="field"><label>科技主题上限（%）</label><input type="number" min="0" max="100" data-profile="techThemeCap" value="${n(state.profile.techThemeCap,30)}" /></div><div class="field"><label>周期资源主题上限（%）</label><input type="number" min="0" max="100" data-profile="cycleThemeCap" value="${n(state.profile.cycleThemeCap,25)}" /></div><div class="field"><label>新开仓最低评分</label><input type="number" min="0" max="100" data-profile="etfMinScore" value="${n(state.profile.etfMinScore,65)}" /></div><div class="field"><label>组合回撤预警阈值（%）</label><input type="number" min="0" max="100" data-profile="portfolioDDLimit" value="${n(state.profile.portfolioDDLimit,12)}" /></div></div><div class="subtle-divider"></div><p class="rule-explanation">执行纪律：低于新开仓分数或趋势未确认时只观察；建议目标仓位需受到组合权益上限、单只ETF上限和同一主题上限约束。-5%回撤复核，-8%停止增加高波动卫星仓并检查相关性，-12%进入压力复盘；不是机械止损指令。</p></div></section><section class="card">${cardHead('固定跟踪节奏','将原表中的每日执行节奏变成可勾选、可留痕的流程')}<div class="card-body"><div class="timeline">${state.cadence.map((c,i)=>`<div class="timeline-row"><div class="timeline-time">${esc(c.when)}</div><div class="timeline-body"><strong>${esc(c.what)}</strong></div></div>`).join('')}</div></div></section></div>`;
}

function renderCapabilityPyramid() {
  const layers = [
    {level:'06',width:68,title:'全球所有权与复杂资产',subtitle:'让复杂资产真正服务于经营、居住或家庭目标',items:'全球公司 / 离岸公司 / 海外房产',gate:'准入门槛：真实用途、持续现金流、法税顾问、全成本与退出压力测试。'},
    {level:'05',width:76,title:'身份与跨境流动性',subtitle:'具备按需求选择居住地、工作地和出行路径的能力',items:'多国签证 / 长期居留 / 永居 / 国籍与护照规划',gate:'先选最可能使用的一个目的地；签证、居留、国籍与税务居民分别核验。'},
    {level:'04',width:84,title:'全球金融基础设施',subtitle:'能够合规地收付、持有、投资、保障并申报',items:'多币种银行账户 / 海外券商 / 全球保险 / 资金路径与税务记录',gate:'开户资格、入金路径、监管实体、费用、税表与保险条款逐项核实。'},
    {level:'03',width:92,title:'生产力与收入引擎',subtitle:'把工具和知识转化为可展示交付、效率或可验证收入',items:'英语 / AI 编程 / 内容与产品 / AI 月费 ROI / 机器人·算力·数据主题研究',gate:'AI 月费先按生产工具计算投入产出；机器人、算力与数据投资属于高波动主题敞口，不等于核心资产。'},
    {level:'02',width:97,title:'核心资产与风险管理',subtitle:'建立可持续投资政策书 IPS、分散配置和再平衡纪律',items:'现金与短债 / 全球宽基股票 / VOO、QQQ 倾斜 / 黄金 / BTC 与稳定币风险审查',gate:'全球宽基、VOO、QQQ 存在重叠；BTC 默认目标 0%；数字资产须先核验所在地法律和合规路径。'},
    {level:'01',width:100,title:'现金流、应急金与执行底盘',subtitle:'任何全球化计划的地基：先保证生存能力，再配置风险资产',items:'税后收入 / 必要支出 / 高息债管理 / 6–12 个月应急金 / 睡眠、训练与固定执行节奏',gate:'资产负债覆盖率先做到 ≥95%；应急金与投资资金分开；高息债未处理前暂停杠杆和大额低流动性投入。'}
  ];
  return `<section class="card capability-pyramid-card" id="capability-pyramid">
    <div class="card-head"><div><h3>新登</h3><p>目标不是“集齐资产标签”，而是按依赖顺序建立可持续的能力。由下往上逐层解锁，每层都必须有可核验的交付或条件。</p></div><span class="tag good">先底盘 · 后选择权</span></div>
    <div class="capability-pyramid-layout"><div class="capability-pyramid" role="list" aria-label="新登配置六层能力金字塔">
      ${layers.map((x,i)=>`<article class="capability-layer layer-${x.level}" style="--layer-width:${x.width}%;--layer-order:${i}" role="listitem"><div class="capability-level">L${x.level}</div><div class="capability-layer-copy"><h4>${x.title}</h4><p class="capability-subtitle">${x.subtitle}</p><div class="capability-items">${x.items}</div><p class="capability-gate"><b>解锁条件</b> · ${x.gate}</p></div></article>`).join('')}
    </div><aside class="capability-side-note"><div class="eyebrow">BUILD ORDER</div><h4>推荐落地顺序</h4><ol><li><b>稳定</b><span>现金流、负债、应急金、健康和执行节奏。</span></li><li><b>积累</b><span>合规渠道下的低成本核心资产，写好 IPS。</span></li><li><b>增产</b><span>英语、AI/编程、内容与产品，用真实交付验证技能。</span></li><li><b>扩展</b><span>在真实需求出现后，逐项开立账户、保险、签证或居留。</span></li><li><b>复杂化最后</b><span>公司、离岸结构和海外房产只在收益覆盖维护成本后考虑。</span></li></ol><div class="pyramid-principle">原则：先证明它能带来安全、收益、效率或真实选择权，再增加复杂度。</div><button class="btn btn-outline btn-full" data-action="ncfg-goto" data-sheet="roadmap">按 90 天路线执行 ↓</button></aside></div>
  </section>`;
}

function renderCapabilityQuickNav(){
  return `<section class="card capability-launch-card"><div class="card-head"><div><h3>个人能力中枢</h3><p>把投资、健康、英语与阅读作为新登配置的四条长期能力主线；记录与配置会保存到当前账户。</p></div><span class="tag good">4 个二级页面</span></div><div class="capability-launch-grid capability-launch-grid-four"><button class="capability-launch investing-launch" data-action="capability-page" data-page="dashboard"><span class="launch-icon">◈</span><strong>投资</strong><small>资产总览 · 风险预算 · 全球配置 · 策略执行</small><span class="launch-arrow">进入资产与风险 →</span></button><button class="capability-launch health-launch" data-action="capability-page" data-page="health"><span class="launch-icon">✚</span><strong>健康</strong><small>饮食 · 健身 · 皮肤 · 发型 · 打卡</small><span class="launch-arrow">进入健康管理 →</span></button><button class="capability-launch english-launch" data-action="capability-page" data-page="english"><span class="launch-icon">Aa</span><strong>英语</strong><small>输入训练 · 口语写作 · 输出作品</small><span class="launch-arrow">进入英语能力节点 →</span></button><button class="capability-launch reading-launch" data-action="capability-page" data-page="reading"><span class="launch-icon">▤</span><strong>阅读</strong><small>书单 · 阅读计划 · 感想 · Notebook</small><span class="launch-arrow">进入阅读与知识库 →</span></button></div></section>`;
}
function dateRangeKeys(days=7) { return Array.from({length:days},(_,i)=>shiftDateKey(todayKey(),i-(days-1))); }
function groupedWeekStarts(weeks=8) { const today=new Date();today.setHours(12,0,0,0);const monday=(today.getDay()+6)%7;today.setDate(today.getDate()-monday);return Array.from({length:weeks},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-(weeks-1-i)*7);return todayKey(d);}); }
function miniCurve(values, labels, title) {
  const w=560,h=132,p=18,arr=values.length?values:[0,0],min=Math.min(0,...arr),max=Math.max(1,...arr),range=max-min||1;
  const pts=arr.map((v,i)=>({x:p+i*(w-p*2)/Math.max(1,arr.length-1),y:h-p-(v-min)/range*(h-p*2)}));
  const path=pts.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  return `<div class="tracking-curve"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">${[.25,.5,.75].map(y=>`<line x1="${p}" y1="${(h*y).toFixed(1)}" x2="${w-p}" y2="${(h*y).toFixed(1)}" stroke="var(--line)" stroke-dasharray="3 4"/>`).join('')}<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((q,i)=>`<circle cx="${q.x}" cy="${q.y}" r="3" fill="var(--accent)"/>`).join('')}${pts.map((q,i)=>i===0||i===pts.length-1||arr.length<=7?`<text x="${q.x}" y="${h-2}" fill="var(--muted)" font-size="10" text-anchor="middle">${esc(labels[i]||'')}</text>`:'').join('')}</svg><div class="tracking-curve-values">${arr.map((v,i)=>`<span>${esc(labels[i]||'')} <b>${fmt(v,0)}</b></span>`).join('')}</div></div>`;
}
function renderCapabilityAnalytics({title,metric,dailyValues,dailyLabels,weeklyValues,weeklyLabels,checkinsToday=0,checkinsWeek=0}) {
  return `<section class="card capability-analytics"><div class="card-head"><div><h3>${esc(title)} · 日/周统计曲线</h3><p>基于本工作区已保存的打卡与记录自动汇总，不会把没有记录的日期伪装成完成。</p></div><span class="tag ${checkinsToday?'good':'neutral'}">今日 ${checkinsToday} 次记录</span></div><div class="tracking-chart-grid"><div><div class="tracking-chart-title"><strong>每日统计</strong><span>${esc(metric)} · 最近7天</span></div>${miniCurve(dailyValues,dailyLabels,`${title}每日统计`)}</div><div><div class="tracking-chart-title"><strong>每周统计</strong><span>${esc(metric)} · 最近8周</span></div>${miniCurve(weeklyValues,weeklyLabels,`${title}每周统计`)}</div></div><div class="tracking-checkin-strip"><span>今日记录/打卡 <b>${checkinsToday}</b></span><span>近7天记录/打卡 <b>${checkinsWeek}</b></span><span>数据来源 <b>当前账户已保存记录</b></span></div></section>`;
}
function countDaily(list, date, field) { return list.filter(x=>x.date===date && (!field || n(x[field])>0)).length; }
function sumDaily(list, date, field) { return list.filter(x=>x.date===date).reduce((a,x)=>a+n(x[field]),0); }
function weeklySums(list, starts, field, dateField='date') { return starts.map(start=>{const end=shiftDateKey(start,6);return list.filter(x=>x[dateField]>=start&&x[dateField]<=end).reduce((a,x)=>a+n(x[field]),0);}); }

const BODY_ZONES=[
  {id:'head',name:'头部',desc:'颈部稳定、姿势与头面部观察',muscles:['颈屈肌','颈伸肌','斜方肌上束','咬肌/面部（示意）']},
  {id:'upper',name:'上肢',desc:'肩、上臂、前臂与握力',muscles:['三角肌','肱二头肌','肱三头肌','前臂屈肌群','前臂伸肌群']},
  {id:'chest',name:'胸部',desc:'胸肌与肩胛控制',muscles:['胸大肌上部','胸大肌中部','胸大肌下部','前锯肌']},
  {id:'core',name:'核心',desc:'腹部前侧分区、腰背稳定',muscles:['上腹','下腹','腹斜肌','竖脊肌','臀中肌/骨盆稳定']},
  {id:'lower',name:'下肢',desc:'臀部、股四头肌、腘绳肌、小腿',muscles:['臀大肌','股四头肌','腘绳肌','内收肌','腓肠肌/比目鱼肌']},
  {id:'full',name:'全身',desc:'复合动作、全身协调与体能',muscles:['深蹲模式','髋铰链模式','推举模式','水平拉模式','有氧/全身循环']}
];
const EXERCISES={
  '头部':['颈部等长抗阻','下巴内收（chin tuck）','颈部轻柔活动度'],
  '上肢':['哑铃弯举','绳索下压','侧平举','腕屈伸'],
  '胸部':['哑铃卧推','上斜哑铃卧推','俯卧撑','绳索夹胸'],
  '核心':['死虫式','平板支撑','卷腹（上腹）','反向卷腹（下腹）','Pallof Press'],
  '下肢':['高脚杯深蹲','罗马尼亚硬拉','保加利亚分腿蹲','提踵'],
  '全身':['深蹲','硬拉模式练习','俯卧撑','划船','快走/骑行']
};
function bodyRegionButton(z){return `<button class="body-region-btn ${ui.bodyZone===z.id?'selected':''}" data-action="body-zone" data-zone="${z.id}" onmouseenter="" title="${esc(z.desc)}"><span>${({'head':'◉','upper':'↗','chest':'▰','core':'▦','lower':'⇵','full':'◎'})[z.id]}</span><b>${z.name}</b><small>${z.desc}</small></button>`}
function anatomySvg(){
 const active=ui.bodyMuscle||ui.bodyZone;
 const fill=(key,base)=>((active===key||active==='full'||(ui.bodyZone==='upper'&&['shoulders','arms'].includes(key))||(ui.bodyZone==='chest'&&key==='chest')||(ui.bodyZone==='core'&&['upperAbs','lowerAbs','obliques'].includes(key))||(ui.bodyZone==='lower'&&['thighs','calves','glutes'].includes(key))||(ui.bodyZone==='head'&&key==='head'))?'#b7f36d':base);
 const skin=ui.bodyMode==='skin', headMode=ui.bodyMode==='head', skeleton=ui.bodyMode==='skeleton';
 return `<svg class="anatomy-svg ${headMode?'head-focus':''}" id="anatomySvg" viewBox="${headMode||ui.bodyZone==='head'?'125 0 110 115':ui.bodyZone==='upper'?'55 75 250 235':ui.bodyZone==='chest'?'95 78 170 155':ui.bodyZone==='core'?'115 125 130 120':ui.bodyZone==='lower'?'110 195 140 315':'0 0 360 590'}" role="img" aria-label="可交互人体示意图，点击部位查看动作" style="transform:translate(${ui.bodyView.x}px,${ui.bodyView.y}px) rotateX(${ui.bodyView.rx}deg) rotateY(${ui.bodyView.ry}deg) scale(${ui.bodyView.scale})">
 <defs><linearGradient id="bodySkin" x1="0" x2="1"><stop stop-color="#7b4e43"/><stop offset=".38" stop-color="#e6b39b"/><stop offset=".68" stop-color="#b97865"/><stop offset="1" stop-color="#613e3a"/></linearGradient><linearGradient id="muscleTone" x1="0" x2="1"><stop stop-color="#763d3b"/><stop offset=".4" stop-color="#f0a08c"/><stop offset=".7" stop-color="#c96e62"/><stop offset="1" stop-color="#6f3938"/></linearGradient><linearGradient id="limbTone" x1="0" x2="1"><stop stop-color="#684b48"/><stop offset=".5" stop-color="#e5b7a2"/><stop offset="1" stop-color="#654643"/></linearGradient><filter id="bodyShadow"><feGaussianBlur stdDeviation="7"/></filter></defs>
 <ellipse cx="180" cy="568" rx="75" ry="10" fill="#000" opacity=".25" filter="url(#bodyShadow)"/>
 <g id="anatomyTransform" stroke="#3a2d31" stroke-width="1.4" stroke-linejoin="round">
 <path data-body-zone="head" data-body-muscle="head" fill="${fill('head',skin?'url(#bodySkin)':'url(#muscleTone)')}" d="M160 36 Q159 8 180 8 Q201 8 200 36 L197 63 Q190 79 180 79 Q169 77 163 62Z"/>
 <path fill="${skin?'url(#bodySkin)':'#b36d61'}" d="M166 70 L166 91 Q180 102 194 91 L194 70Z"/>
 <path data-body-zone="chest" data-body-muscle="chest" fill="${fill('chest',skin?'url(#bodySkin)':'url(#muscleTone)')}" d="M166 87 Q146 82 126 97 L113 133 L125 180 Q145 199 180 194 Q215 199 235 180 L247 133 L234 97 Q214 82 194 87 L180 102Z"/>
 <path data-body-zone="core" data-body-muscle="upperAbs" fill="${fill('upperAbs',skin?'#c9907b':'#d98476')}" d="M151 145 Q180 137 209 145 L205 173 Q180 185 155 173Z"/>
 <path data-body-zone="core" data-body-muscle="lowerAbs" fill="${fill('lowerAbs',skin?'#bc826f':'#c8756b')}" d="M155 174 Q180 182 205 174 L201 205 Q180 219 159 205Z"/>
 <path data-body-zone="core" data-body-muscle="obliques" fill="${fill('obliques',skin?'#b98270':'#a95d58')}" d="M132 148 L151 146 L158 202 L144 195 L132 169Z M228 148 L209 146 L202 202 L216 195 L228 169Z"/>
 <path data-body-zone="upper" data-body-muscle="shoulders" fill="${fill('shoulders',skin?'url(#bodySkin)':'url(#muscleTone)')}" d="M127 98 Q105 91 93 111 L86 145 Q92 158 108 155 L125 132Z M233 98 Q255 91 267 111 L274 145 Q268 158 252 155 L235 132Z"/>
 <path data-body-zone="upper" data-body-muscle="arms" fill="${fill('arms',skin?'url(#bodySkin)':'url(#muscleTone)')}" d="M91 117 Q77 135 74 167 L70 212 Q72 224 81 219 L96 172 L110 136Z M269 117 Q283 135 286 167 L290 212 Q288 224 279 219 L264 172 L250 136Z"/>
 <path data-body-zone="upper" data-body-muscle="arms" fill="${fill('arms',skin?'url(#bodySkin)':'url(#limbTone)')}" d="M71 211 L64 263 Q63 276 71 279 L81 271 L85 220Z M289 211 L296 263 Q297 276 289 279 L279 271 L275 220Z"/>
 <path data-body-zone="upper" data-body-muscle="arms" fill="${skin?'#c58c78':'#bd786b'}" d="M64 263 Q56 275 61 290 L73 295 L80 278Z M296 263 Q304 275 299 290 L287 295 L280 278Z"/>
 <path fill="${skin?'#5d4038':'#4b3838'}" d="M146 203 Q180 216 214 203 L208 231 Q180 244 152 231Z"/>
 <path data-body-zone="lower" data-body-muscle="thighs" fill="${fill('thighs',skin?'url(#bodySkin)':'url(#muscleTone)')}" d="M151 229 Q180 241 208 229 L207 293 Q200 323 191 346 L171 346 Q160 320 153 293Z"/>
 <path data-body-zone="lower" data-body-muscle="thighs" fill="${fill('thighs',skin?'#d4a18c':'#e28d7b')}" d="M154 241 Q165 252 166 292 L159 326 L149 298 L146 255Z M206 241 Q195 252 194 292 L201 326 L211 298 L214 255Z"/>
 <path data-body-zone="lower" data-body-muscle="calves" fill="${fill('calves',skin?'url(#bodySkin)':'url(#limbTone)')}" d="M160 344 L171 345 L169 411 L164 465 Q157 480 149 468 L151 415Z M189 345 L200 344 L209 415 L211 468 Q203 480 196 465 L191 411Z"/>
 <path data-body-zone="lower" data-body-muscle="calves" fill="${fill('calves',skin?'#d4a18c':'#c97b70')}" d="M153 366 Q163 372 166 390 L160 416 L151 415Z M207 366 Q197 372 194 390 L200 416 L209 415Z"/>
 <path fill="${skin?'#b77e6d':'#8b5551'}" d="M149 464 L164 466 L165 489 Q160 501 146 496 L135 487 Q136 477 149 464Z M196 466 L211 464 L225 487 Q224 501 210 496 L195 489Z"/>
 <path fill="none" stroke="#f3c0a9" opacity=".65" stroke-width="2" d="M180 104 L180 135 M180 183 L180 208 M164 250 Q174 260 171 291 M196 250 Q186 260 189 291 M163 354 L160 406 M197 354 L200 406"/>
 ${skeleton?`<g class="skeleton-overlay" fill="none" stroke="#e8e4d5" stroke-width="5" stroke-linecap="round" opacity=".92"><path d="M180 82 L180 205 M180 104 L145 110 L104 160 L74 267 M180 104 L215 110 L256 160 L286 267 M180 205 L158 254 L155 345 L157 461 M180 205 L202 254 L205 345 L203 461"/><path d="M151 115 Q180 132 209 115 M154 130 Q180 147 206 130 M156 145 Q180 162 204 145 M158 160 Q180 177 202 160 M160 175 Q180 192 200 175" stroke-width="3"/><path d="M162 82 Q180 96 198 82 M168 70 L168 92 M192 70 L192 92 M164 254 L196 254 M161 275 L199 275 M159 296 L201 296 M158 317 L202 317" stroke-width="3"/><circle cx="180" cy="43" r="25"/><path d="M180 18 L180 68 M157 40 L203 40" stroke-width="3"/></g>`:''}${ui.bodyMode==='head'?`<g><circle cx="180" cy="42" r="45" fill="none" stroke="#b7f36d" stroke-width="2" stroke-dasharray="4 4"/><path d="M150 40 Q180 15 210 40 M163 47 Q170 51 175 47 M185 47 Q192 51 199 47 M171 61 Q180 66 189 61" fill="none" stroke="#f4d7cb" stroke-width="2"/></g>`:''}
 </g></svg>`;
}
function trainingHistoryMarkup(){
 const sessions=state.trainingSessions||[], today=todayKey(), days=dateRangeKeys(14), totalSets=sessions.reduce((a,x)=>a+n(x.sets),0), totalVolume=sessions.reduce((a,x)=>a+n(x.sets)*n(x.reps)*n(x.weight),0), cardio=sessions.reduce((a,x)=>a+n(x.km),0), trainingDays=new Set(sessions.map(x=>x.date)).size;
 const dayVolume=days.map(d=>sessions.filter(x=>x.date===d).reduce((a,x)=>a+n(x.sets)*n(x.reps)*n(x.weight),0)); const maxVol=Math.max(1,...dayVolume);
 const bodyParts=['胸部','上肢','核心','下肢','全身']; const partSets=bodyParts.map(p=>sessions.filter(x=>x.zone===p).reduce((a,x)=>a+n(x.sets),0)); const partTotal=Math.max(1,partSets.reduce((a,b)=>a+b,0)); const colors=['#a6e66a','#42c5a4','#8c7cf7','#f2b65f','#e47d87'];
 const ring=`conic-gradient(${partSets.map((v,i)=>`${colors[i]} ${partSets.slice(0,i).reduce((a,b)=>a+b,0)/partTotal*100}% ${partSets.slice(0,i+1).reduce((a,b)=>a+b,0)/partTotal*100}%`).join(',')})`;
 const trendExercises=[...new Set(sessions.map(x=>x.exercise).filter(Boolean))].slice(0,3); const trendDays=days.slice(-7); const lines=trendExercises.map((ex,i)=>{const vals=trendDays.map(d=>Math.max(0,...sessions.filter(x=>x.date===d&&x.exercise===ex).map(x=>n(x.weight))));const max=Math.max(1,...vals);return {ex,color:colors[i],pts:vals.map((v,j)=>`${j? 'L':'M'}${18+j*37},${132-v/max*90}`).join(' ')};});
 const measures=(state.bodyMeasurements||[]).slice(0,6); const latest=measures[0]||{};
 return `<section class="card training-history-section" id="training-history"><div class="card-head"><div><h3>训练历史 · 可视化复盘</h3><p>按已保存训练组次、重量、有氧里程与身体围度汇总；无记录的日期不会自动补值。</p></div><div class="training-range-pills"><span>最近14天</span><span>按真实记录</span></div></div>
 <div class="training-kpis"><div><small>训练日</small><strong>${trainingDays}</strong><span>累计日期</span></div><div><small>总组数</small><strong>${totalSets}</strong><span>所有训练记录</span></div><div><small>吨总容量</small><strong>${(totalVolume/1000).toFixed(2)}</strong><span>吨 · 组×次×重量</span></div><div><small>有氧 km</small><strong>${cardio.toFixed(1)}</strong><span>累计里程</span></div></div>
 <div class="training-chart-grid">
 <article class="training-chart-card"><header><strong>每日训练容量</strong><small>kg · 最近14天</small></header><div class="volume-bars">${dayVolume.map((v,i)=>`<div class="volume-bar-col" title="${days[i]}：${Math.round(v)} kg"><span style="height:${Math.max(v?3:0,v/maxVol*150)}px"></span><small>${days[i].slice(8)}</small></div>`).join('')}</div><footer>总容量 = 组数 × 次数 × 单次重量</footer></article>
 <article class="training-chart-card"><header><strong>部位组数分布</strong><small>按训练部位统计</small></header><div class="muscle-donut-wrap"><div class="muscle-donut" style="background:${ring}"><div><b>${totalSets}</b><small>总组数</small></div></div><div class="muscle-legend">${bodyParts.map((p,i)=>`<span><i style="background:${colors[i]}"></i>${p}<b>${partSets[i]}</b></span>`).join('')}</div></div><footer>部位按训练记录中的目标区域归类</footer></article>
 <article class="training-chart-card"><header><strong>重点动作趋势</strong><small>工作重量 kg · 最近7天</small></header><svg class="exercise-trend-svg" viewBox="0 0 280 150" role="img" aria-label="重点动作重量趋势"><g stroke="var(--line)" stroke-dasharray="3 4">${[35,65,95,125].map(y=>`<line x1="18" y1="${y}" x2="260" y2="${y}"/>`).join('')}</g>${lines.map(l=>`<path d="${l.pts}" fill="none" stroke="${l.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}<g fill="var(--muted)" font-size="9"><text x="18" y="145">${trendDays[0]?.slice(5)||''}</text><text x="225" y="145">${trendDays.at(-1)?.slice(5)||''}</text></g></svg><div class="exercise-trend-legend">${lines.map(l=>`<span><i style="background:${l.color}"></i>${esc(l.ex)}</span>`).join('')||'<small>记录重点动作后显示趋势</small>'}</div><footer>只展示已录入动作的工作重量，不推算未记录数据</footer></article>
 <article class="training-chart-card"><header><strong>身体围度</strong><small>cm · 最新一次测量</small></header><div class="body-measure-list">${[['胸围','chest'],['腰围','waist'],['臀围','hip'],['上臂围','arm'],['大腿围','thigh'],['体重','weight']].map(([label,key])=>{const val=latest[key];return `<div><span>${label}</span><i><b style="width:${val?Math.min(100,n(val)/(key==='weight'?120:150)*100):0}%"></b></i><strong>${val?esc(val):'—'}</strong></div>`}).join('')}</div><button class="btn btn-outline" data-action="open-fitness-measure">＋ 记录围度</button><footer>${latest.date?`最近测量：${esc(latest.date)}`:'录入身体围度后会在这里显示'}</footer></article></div></section>`;
}
function exerciseGifUrl(ex){
 const known={
  '哑铃卧推':'/static/animations/pushup.gif','上斜哑铃卧推':'/static/animations/pushup.gif',
  '俯卧撑':'/static/animations/pushup.gif','哑铃弯举':'/static/animations/curl.gif',
  '侧平举':'/static/animations/lateral_raise.gif','高脚杯深蹲':'/static/animations/squat.gif',
  '深蹲':'/static/animations/squat.gif','罗马尼亚硬拉':'/static/animations/deadlift.gif',
  '平板支撑':'/static/animations/plank.gif','弓步蹲':'/static/animations/lunge.gif',
  '开合跳':'/static/animations/jumping_jack.gif'
 };return known[ex]||'';
}
function defaultFitnessRoutines(){
 return {
  1:{name:'Push · 胸肩三头',exercises:[['胸部','哑铃卧推',4,8],['上肢','侧平举',3,12],['上肢','绳索下压',3,12],['核心','平板支撑',3,45]]},
  2:{name:'Lower · 下肢',exercises:[['下肢','高脚杯深蹲',4,10],['下肢','罗马尼亚硬拉',4,8],['下肢','保加利亚分腿蹲',3,10],['核心','死虫式',3,12]]},
  3:{name:'Pull · 拉',exercises:[['全身','划船',4,10],['上肢','哑铃弯举',3,12],['核心','Pallof Press',3,12]]},
  4:{name:'Upper · 上肢',exercises:[['胸部','上斜哑铃卧推',4,8],['胸部','俯卧撑',3,12],['上肢','侧平举',3,15],['核心','反向卷腹（下腹）',3,12]]},
  5:{name:'Lower · 力量',exercises:[['下肢','深蹲',4,8],['下肢','罗马尼亚硬拉',3,10],['下肢','提踵',4,15],['核心','平板支撑',3,45]]},
  6:{name:'Full Body',exercises:[['全身','俯卧撑',3,12],['全身','划船',3,12],['全身','快走/骑行',1,30]]},
  0:{name:'Recovery',exercises:[['全身','快走/骑行',1,30],['核心','死虫式',2,12]]}
 };
}
function ensureFitnessRoutines(){
 const defs=defaultFitnessRoutines(); state.fitnessRoutines=state.fitnessRoutines||{};
 Object.keys(defs).forEach(k=>{if(!state.fitnessRoutines[k])state.fitnessRoutines[k]={name:defs[k].name,exercises:defs[k].exercises.map((x,i)=>({id:`${k}-${i}-${Date.now()}`,zone:x[0],name:x[1],targetSets:x[2],targetReps:x[3],loadStep:2.5}))};});
 return state.fitnessRoutines;
}
function guidedRoutineForToday(){
 const dow=new Date(todayKey()+'T12:00:00').getDay(), routines=ensureFitnessRoutines(), r=routines[dow]||routines[1];
 return (r.exercises||[]).map(x=>({...x,targetSets:Math.max(1,n(x.targetSets,3)),targetReps:Math.max(1,n(x.targetReps,10)),loadStep:Math.max(.5,n(x.loadStep,2.5))}));
}
function exerciseRecentSets(target,limit=3){
 const name=typeof target==='string'?target:(target?.name||''), exerciseId=typeof target==='string'?'':String(target?.exerciseId||'');
 const matches=(x)=>((exerciseId&&String(x.exerciseId||'')===exerciseId)||String(x.exercise||'')===name);
 const out=[];
 (state.guidedWorkoutHistory||[]).forEach(w=>(w.exercises||[]).forEach(ex=>{if(matches(ex)){const sets=(ex.sets||[]).filter(x=>x.done&&!x.skipped&&n(x.reps)>0);if(sets.length)out.push({date:w.date,sets});}}));
 if(!out.length)(state.trainingSessions||[]).filter(x=>matches(x)&&Array.isArray(x.setDetails)).forEach(x=>out.push({date:x.date,sets:x.setDetails}));
 return out.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,limit);
}
function trainingFatigueAnalysis(){
 const today=todayKey(), sessions=state.trainingSessions||[], routines=ensureFitnessRoutines();
 const dateMs=d=>new Date(String(d)+'T12:00:00').getTime(), now=dateMs(today), DAY=86400000;
 const inDays=(d,days)=>{const age=(now-dateMs(d))/DAY;return age>=0&&age<days;};
 const effectiveSetsOf=x=>{if(Array.isArray(x.setDetails)&&x.setDetails.length){return x.setDetails.filter(s=>s.done!==false&&!s.skipped&&n(s.reps)>0&&n(s.rir,2)<=4).length;}return n(x.sets);};
 const volumeOf=x=>Math.max(0,n(x.sets))*Math.max(0,n(x.reps))*Math.max(0,n(x.weight));
 const acute=sessions.filter(x=>inDays(x.date,7)), chronic=sessions.filter(x=>inDays(x.date,28));
 const acuteEff=acute.reduce((a,x)=>a+effectiveSetsOf(x),0), chronicEff=chronic.reduce((a,x)=>a+effectiveSetsOf(x),0), chronicWeekly=chronicEff/4;
 const acwr=chronicWeekly>0?acuteEff/chronicWeekly:null;
 const zones=['胸部','上肢','核心','下肢','全身'];
 const muscles=zones.map(zone=>{const a=acute.filter(x=>x.zone===zone),c=chronic.filter(x=>x.zone===zone);return {zone,effective:a.reduce((v,x)=>v+effectiveSetsOf(x),0),volume:a.reduce((v,x)=>v+volumeOf(x),0),chronic:c.reduce((v,x)=>v+effectiveSetsOf(x),0)/4};});
 const allExercises=[...new Set(Object.values(routines).flatMap(r=>(r.exercises||[]).map(e=>e.name)))];
 const failures=[];
 allExercises.forEach(name=>{const target=Object.values(routines).flatMap(r=>r.exercises||[]).find(e=>e.name===name)?.targetReps||10,recent=exerciseRecentSets(name,3);let streak=0;for(const r of recent){const ss=r.sets||[],avgReps=ss.reduce((a,x)=>a+n(x.reps),0)/Math.max(1,ss.length),avgRir=ss.reduce((a,x)=>a+n(x.rir,2),0)/Math.max(1,ss.length),avgRpe=ss.reduce((a,x)=>a+n(x.rpe,8),0)/Math.max(1,ss.length);const fail=avgReps<target*.8||(avgRpe>=9.5&&avgRir<=1);if(fail)streak++;else break;}if(streak>=2)failures.push({name,streak});});
 const weekly=[0,1,2,3].map(i=>sessions.filter(x=>{const age=(now-dateMs(x.date))/DAY;return age>=i*7&&age<(i+1)*7;}).reduce((a,x)=>a+effectiveSetsOf(x),0));
 const trend=weekly[1]>0?(weekly[0]-weekly[1])/weekly[1]:0;
 let deload=false,reasons=[];
 if(acwr!=null&&acwr>=1.5){deload=true;reasons.push(`ACWR ${acwr.toFixed(2)} ≥ 1.50，近7天负荷明显高于近28天基线`);}
 if(failures.length>=2){deload=true;reasons.push(`${failures.length} 个动作出现连续失败/高疲劳`);}
 if(weekly[0]>=20&&trend>=.35){deload=true;reasons.push(`本周有效组较上周增加 ${Math.round(trend*100)}%`);}
 const status=deload?'DELOAD':acwr!=null&&acwr>=1.3?'WATCH':acwr!=null&&acwr<.65&&chronicEff>=8?'LOW':'NORMAL';
 return {today,acuteEff,chronicWeekly,acwr,muscles,failures,weekly,trend,deload,reasons,status,acuteVolume:acute.reduce((a,x)=>a+volumeOf(x),0)};
}
function renderTrainingCycleFatigue(){
 const f=trainingFatigueAnalysis(), max=Math.max(1,...f.weekly), statusLabel=f.status==='DELOAD'?'建议 Deload Week':f.status==='WATCH'?'负荷偏高 · 观察':f.status==='LOW'?'负荷偏低':'负荷正常';
 const rationale=f.deload?f.reasons:['未触发自动减量条件；继续结合睡眠、疼痛和主观恢复判断。'];
 return `<section class="card fatigue-cycle-panel"><div class="card-head"><div><span class="eyebrow">TRAINING CYCLE · FATIGUE MANAGEMENT · V12</span><h3>训练周期 / 疲劳管理</h3><p>用真实训练记录观察周训练量、肌群有效组、ACWR 趋势与连续失败。ACWR 仅作为负荷变化提示，不作为受伤预测或医疗判断。</p></div><span class="progression-badge ${f.status==='DELOAD'?'bad':f.status==='WATCH'?'warn':'good'}">${statusLabel}</span></div>
 <div class="fatigue-kpis"><article><small>近7天有效组</small><strong>${f.acuteEff}</strong><span>RIR≤4 的逐组记录；旧记录按已录组数</span></article><article><small>28天周均有效组</small><strong>${fmt(f.chronicWeekly,1)}</strong><span>慢性负荷基线</span></article><article><small>ACWR</small><strong>${f.acwr==null?'—':fmt(f.acwr,2)}</strong><span>${f.acwr==null?'历史不足':f.acwr>=1.5?'明显高于基线':f.acwr>=1.3?'偏高观察':'基线范围'}</span></article><article><small>连续失败动作</small><strong>${f.failures.length}</strong><span>${f.failures.length?f.failures.map(x=>x.name).slice(0,2).join('、'):'未检测到'}</span></article></div>
 <div class="fatigue-grid"><article class="fatigue-trend"><h4>4周有效组趋势</h4><div class="fatigue-bars">${f.weekly.slice().reverse().map((v,i)=>`<div><span style="height:${Math.max(v?5:0,v/max*100)}%"></span><b>${v}</b><small>${['-3周','-2周','上周','本周'][i]}</small></div>`).join('')}</div></article><article><h4>肌群有效组 · 近7天</h4><div class="muscle-effective-list">${f.muscles.map(x=>`<div><span>${x.zone}</span><i><b style="width:${Math.min(100,x.effective/20*100)}%"></b></i><strong>${x.effective}组</strong><small>28d周均 ${fmt(x.chronic,1)}</small></div>`).join('')}</div></article></div>
 <div class="deload-explain ${f.deload?'active':''}"><div><b>${f.deload?'自动 Deload Week 已触发':'当前不需要自动 Deload'}</b>${rationale.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div><div class="deload-rules"><span>Deload 执行</span><b>重量约 −10%</b><b>目标组数约 −30%</b><small>优先保留动作技术与节奏；若有疼痛/异常不适，应停止并寻求专业评估。</small></div></div></section>`;
}
function progressionDecisionPanel(){
 const f=trainingFatigueAnalysis(), routine=guidedRoutineForToday();
 return `<section class="card decision-explain-panel"><div class="card-head"><div><span class="eyebrow">EXPLAINABLE TRAINING DECISIONS</span><h3>为什么这次加重量 / 加次数 / 维持 / 减量</h3><p>每个建议都显示输入证据、触发规则和下一次处方，避免黑箱式自动加重。</p></div></div><div class="decision-explain-list">${routine.map(ex=>{const a=progressionAdvice(ex),recent=exerciseRecentSets(ex,3),last=recent[0],ss=last?.sets||[],avgReps=ss.length?ss.reduce((v,x)=>v+n(x.reps),0)/ss.length:null,avgRir=ss.length?ss.reduce((v,x)=>v+n(x.rir,2),0)/ss.length:null,avgRpe=ss.length?ss.reduce((v,x)=>v+n(x.rpe,8),0)/ss.length:null;return `<article><div class="decision-title"><strong>${esc(ex.name)}</strong><span class="progression-badge ${a.tone}">${a.label}</span></div><div class="decision-evidence"><span>目标 ${n(ex.targetSets)}×${n(ex.targetReps)}</span><span>最近次数 ${avgReps==null?'—':fmt(avgReps,1)}</span><span>RIR ${avgRir==null?'—':fmt(avgRir,1)}</span><span>RPE ${avgRpe==null?'—':fmt(avgRpe,1)}</span><span>全局 ACWR ${f.acwr==null?'—':fmt(f.acwr,2)}</span></div><p>${esc(a.reason)}</p><b class="decision-prescription">下一次：${a.weight!=null?fmt(a.weight,1)+'kg · ':''}${n(a.reps,ex.targetReps)} 次${f.deload?' · Deload 周降低总组数':''}</b></article>`}).join('')}</div></section>`;
}
function progressionAdvice(ex){
 const recent=exerciseRecentSets(ex,3), last=recent[0], target=n(ex.targetReps,10), step=n(ex.loadStep,2.5);
 const fatigue=trainingFatigueAnalysis();
 if(fatigue.deload&&last){const ss=last.sets||[],lastWeight=Math.max(0,...ss.map(x=>n(x.weight)));return {action:'DELOAD_WEEK',label:'Deload Week',reason:`全局疲劳管理触发减量：${fatigue.reasons.join('；')}。本动作重量约 -10%，总组数建议约 -30%。`,weight:Math.max(0,Math.round(lastWeight*.9*2)/2),reps:target,tone:'bad'};}
 if(!last)return {action:'BASELINE',label:'建立基线',reason:'暂无逐组历史，沿用最近工作重量并建立 RIR/RPE 基线。',weight:null,reps:target,tone:'neutral'};
 const sets=last.sets||[], avgReps=sets.reduce((a,x)=>a+n(x.reps),0)/Math.max(1,sets.length), avgRir=sets.reduce((a,x)=>a+n(x.rir,2),0)/Math.max(1,sets.length), avgRpe=sets.reduce((a,x)=>a+n(x.rpe,8),0)/Math.max(1,sets.length), lastWeight=Math.max(0,...sets.map(x=>n(x.weight)));
 const hard=recent.filter(r=>{const ss=r.sets||[];const rir=ss.reduce((a,x)=>a+n(x.rir,2),0)/Math.max(1,ss.length),rpe=ss.reduce((a,x)=>a+n(x.rpe,8),0)/Math.max(1,ss.length);return rir<=.5||rpe>=9.5;}).length;
 if(hard>=2 || (avgReps<target*.8&&avgRpe>=9)){return {action:'DELOAD',label:'Deload',reason:`近几次疲劳偏高：平均 ${avgReps.toFixed(1)} 次 / RIR ${avgRir.toFixed(1)} / RPE ${avgRpe.toFixed(1)}。建议降载约 10%。`,weight:Math.max(0,Math.round(lastWeight*.9*2)/2),reps:target,tone:'bad'};}
 if(avgReps>=target&&avgRir>=2&&avgRpe<=8.5){return {action:'ADD_WEIGHT',label:'加重量',reason:`目标次数已完成且仍有余量：RIR ${avgRir.toFixed(1)} / RPE ${avgRpe.toFixed(1)}。`,weight:lastWeight+step,reps:target,tone:'good'};}
 if(avgReps>=target-1&&avgRir>=1&&avgRpe<=9){return {action:'ADD_REPS',label:'加次数',reason:`负荷可控但尚未形成明显重量余量：平均 ${avgReps.toFixed(1)} 次 / RIR ${avgRir.toFixed(1)}。`,weight:lastWeight,reps:Math.min(target+1,Math.ceil(avgReps)+1),tone:'warn'};}
 return {action:'MAINTAIN',label:'维持',reason:`当前刺激合适：平均 ${avgReps.toFixed(1)} 次 / RIR ${avgRir.toFixed(1)} / RPE ${avgRpe.toFixed(1)}，先提高完成质量。`,weight:lastWeight,reps:target,tone:'neutral'};
}
function renderRoutineBuilder(){
 const routines=ensureFitnessRoutines(), dayNames=['日','一','二','三','四','五','六'], selected=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay), r=routines[selected], all=Object.entries(EXERCISES).flatMap(([zone,xs])=>xs.map(name=>({zone,name})));
 return `<section class="card routine-builder"><div class="card-head"><div><span class="eyebrow">ROUTINE BUILDER · V11</span><h3>周训练计划 + 自动渐进</h3><p>编排每天动作、拖拽顺序、设置目标组次；训练前根据最近的重量 × 次数 × RIR/RPE 给出下一次负荷建议。</p></div><span class="tag good">Progressive Overload</span></div>
 <div class="routine-days">${[1,2,3,4,5,6,0].map(d=>`<button class="${d===selected?'active':''}" data-action="routine-select-day" data-day="${d}">周${dayNames[d]}<small>${esc(routines[d]?.name||'')}</small></button>`).join('')}</div>
 <div class="routine-name-row"><label>计划名称<input id="routineName" value="${esc(r.name||'')}" placeholder="例如 Push · 胸肩三头"></label><button class="btn btn-outline" data-action="routine-save-name">保存名称</button></div>
 <div class="routine-list" data-routine-day="${selected}">${(r.exercises||[]).map((ex,i)=>{const adv=progressionAdvice(ex);return `<article class="routine-exercise" draggable="true" data-routine-index="${i}"><span class="drag-handle" title="拖拽排序">⠿</span><div class="routine-ex-main"><strong>${i+1}. ${esc(ex.name)}</strong><small>${esc(ex.zone)} · 步进 ${fmt(ex.loadStep||2.5,1)}kg${ex.exerciseId?` · <button class="gym-inline-link" data-action="gym-detail" data-id="${esc(ex.exerciseId)}">openGym 动作说明</button>`:''}</small><p>${esc(adv.reason)}</p></div><label>组<input type="number" min="1" max="12" value="${n(ex.targetSets,3)}" data-routine-field="targetSets" data-index="${i}"></label><label>目标次数<input type="number" min="1" max="100" value="${n(ex.targetReps,10)}" data-routine-field="targetReps" data-index="${i}"></label><label>加重步进<input type="number" min="0.5" step="0.5" value="${n(ex.loadStep,2.5)}" data-routine-field="loadStep" data-index="${i}"></label><span class="progression-badge ${adv.tone}">${adv.label}${adv.weight!=null?` · ${fmt(adv.weight,1)}kg`:''}</span><button class="icon-btn" data-action="routine-remove-exercise" data-index="${i}" title="删除">×</button></article>`}).join('')||'<div class="empty-state">今天还没有动作。下面添加第一个动作。</div>'}</div>
 <div class="routine-add"><select id="routineAddExercise">${all.map(x=>`<option value="${esc(x.zone)}|${esc(x.name)}">${esc(x.zone)} · ${esc(x.name)}</option>`).join('')}</select><input id="routineAddSets" type="number" min="1" value="3" title="组数"><input id="routineAddReps" type="number" min="1" value="10" title="次数"><button class="btn btn-primary" data-action="routine-add-exercise">＋ 添加动作</button><button class="btn btn-outline" data-action="gym-open-picker">从动作库选择</button><button class="btn btn-outline" data-action="gym-generate-plan">✦ 智能生成周计划</button><button class="btn btn-outline" data-action="routine-reset-day">恢复默认</button></div>
 <div class="progression-rule"><b>自动渐进规则</b><span>完成目标 + RIR≥2 + RPE≤8.5 → 加重量</span><span>接近目标 + RIR≥1 → 加次数</span><span>刺激合适 → 维持</span><span>连续高疲劳 / 明显掉次数 → Deload ≈ −10%</span></div></section>`;
}
function lastExercisePerformance(target){
 const name=typeof target==='string'?target:(target?.name||''), exerciseId=typeof target==='string'?'':String(target?.exerciseId||'');
 const matches=(x)=>((exerciseId&&String(x.exerciseId||'')===exerciseId)||String(x.exercise||'')===name);
 const xs=(state.trainingSessions||[]).filter(x=>matches(x)).sort((a,b)=>String(b.date).localeCompare(String(a.date))||n(b.id)-n(a.id));
 return xs[0]||null;
}
function startGuidedWorkout(){
 if(state.activeGuidedWorkout&&!state.activeGuidedWorkout.finishedAt)return;
 const exercises=guidedRoutineForToday().map((e,ei)=>{const last=lastExercisePerformance(e),adv=progressionAdvice(e),w=adv.weight!=null?adv.weight:(last?n(last.weight):0),reps=adv.reps||e.targetReps;return {...e,progression:adv,exerciseIndex:ei,sets:Array.from({length:e.targetSets},(_,si)=>({index:si+1,targetReps:reps,weight:w,reps:reps,rir:2,rpe:8,done:false,completedAt:null}))}});
 state.activeGuidedWorkout={id:Date.now(),date:todayKey(),startedAt:new Date().toISOString(),exerciseIndex:0,setIndex:0,exercises,restUntil:null,restSeconds:n(exercises[0]?.restSeconds,90),prs:[]};
 persist({quiet:true}).then(()=>{renderPage('fitness');setTimeout(()=>document.querySelector('#guidedWorkout')?.scrollIntoView({behavior:'smooth',block:'start'}),30);});
}
function guidedCurrent(){const w=state.activeGuidedWorkout;if(!w||w.finishedAt)return null;const ex=w.exercises?.[n(w.exerciseIndex)];const set=ex?.sets?.[n(w.setIndex)];return {w,ex,set};}
function guidedRestRemaining(w){return w?.restUntil?Math.max(0,Math.ceil((new Date(w.restUntil)-Date.now())/1000)):0;}
function formatClock(sec){sec=Math.max(0,n(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function renderGuidedWorkout(){
 const g=guidedCurrent(); if(!g)return '';
 const {w,ex,set}=g, completed=w.exercises.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0), total=w.exercises.reduce((a,e)=>a+e.sets.length,0), rest=guidedRestRemaining(w), demo=gymExerciseDemo(ex), last=lastExercisePerformance(ex);
 const exerciseDone=ex.sets.filter(s=>s.done).length;
 return `<section class="card guided-workout" id="guidedWorkout"><div class="guided-top"><div><span class="eyebrow">GUIDED WORKOUT · LIVE</span><h2>${esc(ex.name)}</h2><p>${esc(ex.zone)} · 动作 ${n(w.exerciseIndex)+1}/${w.exercises.length} · 第 ${n(w.setIndex)+1}/${ex.sets.length} 组</p></div><div class="guided-progress"><b>${completed}/${total}</b><span>完成组数</span><i><em style="width:${total?completed/total*100:0}%"></em></i></div></div>
 <div class="guided-layout"><article class="guided-demo">${gymVideo(demo,ex.name)}${ex.exerciseId?`<button class="btn btn-small btn-outline guided-demo-info" data-action="gym-detail" data-id="${esc(ex.exerciseId)}">动作库说明</button>`:''}<div class="guided-exercise-strip">${w.exercises.map((e,i)=>`<span class="${i<n(w.exerciseIndex)?'done':i===n(w.exerciseIndex)?'active':''}">${i+1}. ${esc(e.name)}</span>`).join('')}</div></article>
 <article class="guided-set-card"><div class="guided-last"><span>上次工作重量 <b>${last?`${fmt(last.weight,1)} kg`:'无记录'}</b></span><span>本动作进度 <b>${exerciseDone}/${ex.sets.length} 组</b></span></div><div class="guided-set-number"><small>SET</small><strong>${n(w.setIndex)+1}</strong><span>/ ${ex.sets.length}</span></div>
 <div class="guided-input-grid"><label>重量 kg<input id="guidedWeight" type="number" min="0" step="0.5" value="${n(set.weight)}"></label><label>实际次数<input id="guidedReps" type="number" min="0" step="1" value="${n(set.reps)}"></label><label>RIR<input id="guidedRir" type="number" min="0" max="10" step="1" value="${n(set.rir,2)}"><small>还能做几次</small></label><label>RPE<input id="guidedRpe" type="number" min="1" max="10" step="0.5" value="${n(set.rpe,8)}"><small>主观强度 1–10</small></label></div>
 <div class="guided-actions"><button class="btn btn-primary guided-complete" data-action="guided-complete-set">✓ 完成这一组</button><button class="btn btn-outline" data-action="guided-skip-set">跳过本组</button><button class="btn btn-outline" data-action="guided-finish">结束训练</button></div></article>
 <aside class="guided-rest ${rest?'active':''}"><span>REST TIMER</span><strong id="guidedRestClock">${formatClock(rest)}</strong><small>${rest?'恢复中，倒计时结束后进入下一组':'完成一组后自动启动 90 秒休息'}</small><div><button class="btn btn-small btn-outline" data-action="guided-rest-adjust" data-seconds="-15">−15s</button><button class="btn btn-small btn-outline" data-action="guided-rest-adjust" data-seconds="15">+15s</button><button class="btn btn-small btn-outline" data-action="guided-rest-skip">跳过休息</button></div></aside></div>
 <div class="guided-set-track">${ex.sets.map((x,i)=>`<div class="${x.done?'done':i===n(w.setIndex)?'active':''}"><b>${i+1}</b><span>${x.done?`${fmt(x.weight,1)}kg × ${n(x.reps)}`:`目标 ${n(x.targetReps)} 次`}</span>${x.done?`<small>RIR ${n(x.rir)} · RPE ${fmt(x.rpe,1)}</small>`:''}</div>`).join('')}</div>${w.prs?.length?`<div class="guided-pr-banner">🏆 PR：${w.prs.slice(-2).map(x=>`${esc(x.exercise)} ${fmt(x.weight,1)}kg`).join(' · ')}</div>`:''}</section>`;
}
function completeGuidedSet(skip=false){
 const g=guidedCurrent();if(!g)return;const {w,ex,set}=g;
 if(!skip){set.weight=n(document.querySelector('#guidedWeight')?.value,set.weight);set.reps=n(document.querySelector('#guidedReps')?.value,set.reps);set.rir=clamp(document.querySelector('#guidedRir')?.value,0,10);set.rpe=clamp(document.querySelector('#guidedRpe')?.value,1,10);const previousMax=Math.max(0,...(state.trainingSessions||[]).filter(x=>x.exercise===ex.name).map(x=>n(x.weight)),...ex.sets.filter(x=>x.done).map(x=>n(x.weight)));if(set.weight>previousMax&&set.reps>0){w.prs=w.prs||[];w.prs.push({exercise:ex.name,weight:set.weight,reps:set.reps,at:new Date().toISOString()});toast(`🏆 新 PR：${ex.name} ${fmt(set.weight,1)} kg × ${set.reps}`);}}else{set.skipped=true;set.reps=0;}
 set.done=true;set.completedAt=new Date().toISOString();
 let ei=n(w.exerciseIndex),si=n(w.setIndex)+1;if(si>=ex.sets.length){ei++;si=0;}w.exerciseIndex=ei;w.setIndex=si;
 if(ei>=w.exercises.length){finishGuidedWorkout();return;}
 w.restUntil=new Date(Date.now()+n(ex.restSeconds,n(w.restSeconds,90))*1000).toISOString();persist({quiet:true}).then(()=>{renderPage('fitness');startGuidedTimer();});
}
function finishGuidedWorkout(){
 const w=state.activeGuidedWorkout;if(!w)return;w.finishedAt=new Date().toISOString();w.restUntil=null;
 const completed=[];w.exercises.forEach(ex=>{const sets=ex.sets.filter(s=>s.done&&!s.skipped&&n(s.reps)>0);if(!sets.length)return;const reps=Math.round(sets.reduce((a,s)=>a+n(s.reps),0)/sets.length),weight=Math.max(...sets.map(s=>n(s.weight)));completed.push({id:Date.now()+completed.length,date:w.date,zone:ex.zone,exercise:ex.name,exerciseId:ex.exerciseId||null,sets:sets.length,reps,weight,km:0,duration:0,note:`Guided Workout · RIR ${fmt(sets.reduce((a,s)=>a+n(s.rir),0)/sets.length,1)} · RPE ${fmt(sets.reduce((a,s)=>a+n(s.rpe),0)/sets.length,1)}`,guidedWorkoutId:w.id,createdAt:new Date().toISOString(),setDetails:sets.map(s=>({...s}))});});
 state.trainingSessions=[...completed,...(state.trainingSessions||[])];state.guidedWorkoutHistory=state.guidedWorkoutHistory||[];state.guidedWorkoutHistory.unshift({...w});state.healthChecks[w.date]=state.healthChecks[w.date]||{};state.healthChecks[w.date].workout=true;ui.guidedSummaryId=w.id;state.activeGuidedWorkout=null;persist({quiet:true}).then(()=>renderPage('fitness'));
}
function renderGuidedSummary(){
 const id=ui.guidedSummaryId,h=(state.guidedWorkoutHistory||[]).find(x=>String(x.id)===String(id));if(!h)return '';
 const sets=h.exercises.flatMap(e=>e.sets.filter(s=>s.done&&!s.skipped));const zones=[...new Set(h.exercises.filter(e=>e.sets.some(s=>s.done&&!s.skipped)).map(e=>e.zone))];const mins=Math.max(1,Math.round((new Date(h.finishedAt)-new Date(h.startedAt))/60000));
 return `<section class="card guided-summary"><div><span class="eyebrow">WORKOUT COMPLETE</span><h2>训练完成</h2><p>${h.exercises.filter(e=>e.sets.some(s=>s.done&&!s.skipped)).length} 个动作 · ${sets.length} 组 · ${mins} 分钟${h.prs?.length?` · 🏆 ${h.prs.length} 个 PR`:''}</p><button class="btn btn-outline" data-action="guided-close-summary">返回训练驾驶舱</button></div><div class="guided-muscle-finish"><div class="finish-body">◎</div><strong>本次刺激肌群</strong><div>${zones.map(z=>`<span>${esc(z)}</span>`).join('')}</div><small>基于本次实际完成动作映射；下方人体肌肉图可继续查看详细区域。</small></div></section>`;
}
function startGuidedTimer(){clearInterval(guidedTimerInterval);const w=state.activeGuidedWorkout;if(!w?.restUntil)return;guidedTimerInterval=setInterval(()=>{const left=guidedRestRemaining(w),el=document.querySelector('#guidedRestClock');if(el)el.textContent=formatClock(left);if(left<=0){clearInterval(guidedTimerInterval);w.restUntil=null;persist({quiet:true});const box=document.querySelector('.guided-rest');box?.classList.remove('active');}},1000);}
function renderFitnessCommandCenter(){
 const sessions=state.trainingSessions||[], measures=state.bodyMeasurements||[], checks=state.healthChecks||{}, today=todayKey();
 const weekStart=shiftDateKey(today, -((new Date(today+'T12:00:00').getDay()+6)%7));
 const weekDays=[0,1,2,3,4,5,6].map(i=>shiftDateKey(weekStart,i));
 const dayNames=['一','二','三','四','五','六','日'];
 const dayStats=weekDays.map(d=>{const xs=sessions.filter(x=>x.date===d);return {date:d,sets:xs.reduce((a,x)=>a+n(x.sets),0),minutes:xs.reduce((a,x)=>a+n(x.duration),0),count:xs.length}});
 const weekSets=dayStats.reduce((a,x)=>a+x.sets,0), weekMinutes=dayStats.reduce((a,x)=>a+x.minutes,0), weekDaysDone=dayStats.filter(x=>x.count>0).length;
 const last=measures[0]||{};
 const latestByExercise={}; sessions.forEach(x=>{if(!x.exercise)return;const prev=latestByExercise[x.exercise];if(!prev||String(x.date)>String(prev.date)||(String(x.date)===String(prev.date)&&n(x.weight)>n(prev.weight)))latestByExercise[x.exercise]=x;});
 const prs=Object.values(latestByExercise).sort((a,b)=>n(b.weight)-n(a.weight)).slice(0,5);
 const zones=['胸部','上肢','核心','下肢','全身'];
 const zoneRecovery=zones.map(z=>{const xs=sessions.filter(x=>x.zone===z).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const lastDate=xs[0]?.date;const days=lastDate?Math.max(0,Math.floor((new Date(today)-new Date(lastDate))/86400000)):null;let stateLabel=days===null?'未训练':days<2?'恢复中':days<4?'可训练': '长期未刺激';return {z,lastDate,days,label:stateLabel,sets:xs.slice(0,7).reduce((a,x)=>a+n(x.sets),0)};});
 const heatDays=dateRangeKeys(84), heat=heatDays.map(d=>sessions.filter(x=>x.date===d).reduce((a,x)=>a+n(x.duration)||a+n(x.sets),0));
 const maxHeat=Math.max(1,...heat);
 return `<section class="fitness-command-center">
  <div class="fitness-hero card"><div><span class="eyebrow">FITNESS OS · TRAINING COCKPIT</span><h2>今天练什么，练到哪里，恢复得怎么样</h2><p>参考 openGym 的“今日训练 → 训练记录 → 肌肉负荷 → 统计复盘”路径，把健身管理从记录器升级为训练工作台。所有数值均来自当前账户真实记录。</p></div><div class="fitness-hero-actions"><button class="btn btn-primary" data-action="fitness-focus-today">进入今日训练</button><button class="btn btn-outline" data-action="fitness-scroll-muscle">查看肌肉图</button></div></div>
  <div class="fitness-kpi-grid"><article><small>本周训练</small><strong>${weekDaysDone}<em>天</em></strong><span>${weekSets} 组 · ${weekMinutes} 分钟</span></article><article><small>今日状态</small><strong>${dayStats[weekDays.findIndex(x=>x===today)]?.count?'已训练':'待训练'}</strong><span>${checks[today]?.workout?'已完成训练打卡':'完成后自动打卡'}</span></article><article><small>最近体重</small><strong>${last.weight?fmt(last.weight,1):'—'}${last.weight?'<em> kg</em>':''}</strong><span>${last.date?esc(last.date):'尚未记录'}</span></article><article><small>动作 PR 记录</small><strong>${prs.length}</strong><span>当前历史最高工作重量</span></article></div>
  <div class="fitness-main-grid">
   <section class="card fitness-week-card"><div class="card-head"><div><h3>本周训练计划 · Week</h3><p>像 openGym 一样先看整周，再进入当天训练；实际完成状态由训练记录决定。</p></div><span class="tag good">${weekDaysDone}/7 已完成</span></div><div class="fitness-week-grid">${weekDays.map((d,i)=>{const st=dayStats[i],isToday=d===today;return `<button class="fitness-day ${isToday?'today':''} ${st.count?'done':''}" data-action="fitness-day-focus" data-date="${d}"><span>周${dayNames[i]}</span><b>${d.slice(8)}</b><i>${st.count?`${st.sets}组`:'休息/未记录'}</i><small>${isToday?'TODAY':st.count?'已完成':'—'}</small></button>`}).join('')}</div><div class="fitness-week-summary"><span>训练日 <b>${weekDaysDone}</b></span><span>训练组 <b>${weekSets}</b></span><span>训练时长 <b>${weekMinutes} min</b></span><span>记录完整度 <b>${weekDaysDone?Math.round(weekDaysDone/7*100):0}%</b></span></div></section>
   <section class="card fitness-readiness-card"><div class="card-head"><div><h3>肌肉恢复 / 缺口</h3><p>按最近一次该部位训练时间判断，仅作训练安排参考。</p></div></div><div class="fitness-recovery-list">${zoneRecovery.map(x=>`<article><div><strong>${x.z}</strong><small>${x.lastDate?'上次 '+x.lastDate:'暂无历史记录'}</small></div><span class="recovery-dot ${x.days===null?'none':x.days<2?'recover':x.days<4?'ready':'gap'}"></span><b>${x.label}</b><em>${x.sets?x.sets+'组':''}</em></article>`).join('')}</div></section>
  </div>
  <div class="fitness-lower-grid">
   <section class="card fitness-heat-card"><div class="card-head"><div><h3>训练热力图 · 12 周</h3><p>参考 openGym 的 activity heatmap：颜色越深代表当天训练记录越多。</p></div></div><div class="fitness-heatmap">${heatDays.map((d,i)=>`<span class="heat-cell h${heat[i]?Math.min(4,Math.ceil(heat[i]/maxHeat*4)):0}" title="${d} · ${heat[i]?heat[i]:'无记录'}"></span>`).join('')}</div><div class="heat-legend"><span>少</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>多</span></div></section>
   <section class="card fitness-pr-card"><div class="card-head"><div><h3>动作表现 / PR</h3><p>按当前历史记录展示最高工作重量，不估算未记录数据。</p></div></div><div class="fitness-pr-list">${prs.map((x,i)=>`<article><span>#${i+1}</span><div><strong>${esc(x.exercise)}</strong><small>${esc(x.date)} · ${n(x.sets)}组 × ${n(x.reps)}次</small></div><b>${fmt(x.weight,1)}<em> kg</em></b></article>`).join('')||'<div class="empty-state">记录训练动作后，这里会自动出现表现榜。</div>'}</div></section>
  </div>
 </section>`;
}

function renderTrainingStudio(){
 const zone=BODY_ZONES.find(z=>z.id===ui.bodyZone)||null, zoneName=zone?.name||'全身', muscles=zone?.muscles||[], allExercises=EXERCISES[zoneName]||EXERCISES['全身'], query=(ui.bodySearch||'').toLowerCase(), exerciseList=allExercises.filter(x=>x.toLowerCase().includes(query));
 const sessions=(state.trainingSessions||[]).slice(0,5);
 return `<section class="card training-studio"><div class="card-head"><div><h3>3D 交互人体 · 肌肉定位与动作检查器</h3><p>选择六大区域，再细分目标肌群。肌肉、骨骼、外皮和头部使用本地 BodyParts3D 参考网格。可旋转、缩放并点选结构；未经临床验证，不用于诊断。</p></div><div class="body-mode-switch"><button data-action="body-mode" data-mode="muscle" class="${ui.bodyMode==='muscle'?'active':''}">肌肉</button><button data-action="body-mode" data-mode="skeleton" class="${ui.bodyMode==='skeleton'?'active':''}">骨骼</button><button data-action="body-mode" data-mode="skin" class="${ui.bodyMode==='skin'?'active':''}">外皮</button><button data-action="body-mode" data-mode="head" class="${ui.bodyMode==='head'?'active':''}">头部</button></div></div>
 <div class="training-studio-grid"><aside class="body-region-index"><h4>身体区域索引</h4><small>六区 · 悬停预览，点击选择</small>${BODY_ZONES.map(bodyRegionButton).join('')}<button class="btn btn-small btn-outline body-reset" data-action="body-reset">↺ 重置视图 / 取消选择</button></aside>
 <div class="body-model-panel"><div class="body-model-meta"><span class="tag good">${zone?esc(zone.name):'未选择'}</span><span class="model-angle">正面 · 可拖拽查看</span></div><div class="body-model-canvas ${ui.bodyMode==='skeleton'?'medical-model-active':''}" id="bodyModelCanvas" tabindex="0"><iframe class="medical-anatomy-frame" title="BodyParts3D 三维解剖参考模型" src="/static/anatomy/index.html?mode=${encodeURIComponent(ui.bodyMode||'muscle')}" loading="eager" allow="fullscreen"></iframe><div class="body-model-caption">BodyParts3D 参考网格 · 拖拽旋转 / 滚轮缩放 / 点选结构</div></div><div class="body-model-controls"><button data-action="body-mode" data-mode="muscle">肌肉模型</button><button data-action="body-mode" data-mode="skeleton">骨骼模型</button><button data-action="body-mode" data-mode="skin">外皮模型</button><button data-action="body-mode" data-mode="head">头部放大</button><button data-action="body-reset">重置</button></div><p class="body-selection-note">${zone?`当前区域：<b>${esc(zone.name)}</b> · ${esc(zone.desc)}`:'未选择任何肌肉。点击左侧区域或人体模型上的部位开始检查。'}</p></div>
 <aside class="action-inspector"><h4>动作检查器</h4><div class="inspector-tabs"><span>目标细分</span><span>动作列表</span></div><label class="body-search"><span>⌕</span><input id="bodyExerciseSearch" value="${esc(ui.bodySearch||'')}" placeholder="搜索动作名称…" aria-label="搜索动作名称"></label><div class="inspector-section-title">${zone?esc(zone.name):'请选择身体区域'} <small>${zone?`${muscles.length} 个目标`:'六区索引'}</small></div><div class="muscle-target-list">${(muscles.length?muscles:BODY_ZONES.map(z=>z.name)).map((m,i)=>{const id=muscles.length?m:BODY_ZONES[i].id;return `<button data-action="body-muscle" data-muscle="${esc(id)}" class="muscle-target ${ui.bodyMuscle===id?'active':''}"><span>◉</span><b>${esc(m)}</b><small>${ui.bodyMuscle===id?'已选择':'单选目标'}</small></button>`}).join('')}</div><div class="inspector-section-title">推荐动作 <small>${exerciseList.length} 项</small></div><div class="exercise-list">${exerciseList.map((ex,i)=>`<article class="exercise-item"><div class="exercise-mini-figure">${exerciseGifUrl(ex)?`<img src="${exerciseGifUrl(ex)}" alt="${esc(ex)} 动作 GIF" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'动作'}))">`:`<span>${['↗','⇧','↔','⌁'][i%4]}</span>`}</div><div class="exercise-copy"><strong>${esc(ex)}</strong><small>${zoneName} · 建议从可控负荷开始</small>${exerciseGifUrl(ex)?'<small class="local-gif-label">本地动作 GIF · 离线可播</small>':'<small>暂无对应本地动画</small>'}</div><button data-action="body-pick-exercise" data-exercise="${esc(ex)}" data-zone="${esc(zoneName)}" title="在动作库查看并加入计划">查看</button></article>`).join('')||'<div class="empty-state">没有匹配动作。尝试更短的关键词。</div>'}</div></aside></div>
 <div class="fit-cta-row"><div><strong>练完记得记录</strong><small>组数 / 次数 / 重量会进入热力图、PR 与恢复判断。</small></div><button class="btn btn-primary" data-action="open-fitness-log">＋ 记录训练</button></div></section>`;
}
function openInlineModal(title, form){ const existing=$('#interactionModal');existing?.remove();const modal=document.createElement('div');modal.id='interactionModal';modal.className='interaction-modal';modal.innerHTML=`<div class="interaction-modal-backdrop" data-action="close-interaction-modal"></div><section class="interaction-modal-panel" role="dialog" aria-modal="true"><header><h3>${esc(title)}</h3><button type="button" data-action="close-interaction-modal" aria-label="关闭">×</button></header><div class="interaction-modal-body"></div></section>`;document.body.appendChild(modal);modal.querySelector('.interaction-modal-body').appendChild(form.cloneNode(true));const clone=modal.querySelector('form');clone.querySelectorAll('[data-action]').forEach(x=>x.removeAttribute('data-action'));const submit=document.createElement('button');submit.className='btn btn-primary';submit.type='button';submit.textContent='保存记录';submit.addEventListener('click',()=>{const orig=form;const fd=new FormData(clone);for(const el of orig.elements){if(el.name&&fd.has(el.name))el.value=fd.get(el.name)}orig.querySelector('[data-action]')?.click();modal.remove()});clone.appendChild(submit); }

function renderHealthCheckin(){
 const today=todayKey(), checks=state.healthChecks[today]||{}, items=[['nutrition','饮食记录'],['workout','训练/活动'],['skin','皮肤护理'],['hair','发型/头皮护理'],['sleep','睡眠达标'],['water','饮水达标']], checked=items.filter(x=>checks[x[0]]).length;
 const logs=state.healthLogs||[], metrics=state.healthMetrics||[], dates=dateRangeKeys(35), first=new Date(`${dates[0]}T12:00:00`), offset=(first.getDay()+6)%7, cells=[...Array(offset).fill(null),...dates];
 return `${sectionHead('HEALTH OS · CHECK-IN & ANALYTICS','打卡与统计','健康打卡日历、日/周趋势、训练历史与身体指标集中在这里。',`<button class="btn btn-primary" data-action="open-health-log-modal">＋ 新增健康记录</button>`)}
 <section class="card">${cardHead('今日健康打卡','点击项目即可保存到对应日期。',`<span class="tag ${checked===items.length?'good':'neutral'}">${checked}/${items.length}</span>`)}<div class="health-check-grid">${items.map(([key,label])=>`<button class="health-check ${checks[key]?'checked':''}" data-action="toggle-health-check" data-date="${today}" data-check="${key}"><span class="health-check-box">${checks[key]?'✓':''}</span><strong>${label}</strong><small>${checks[key]?'已完成':'点击打卡'}</small></button>`).join('')}</div></section>
 <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('打卡日历','绿色日期表示当天有完成的健康打卡。')}<div class="health-calendar-grid">${['一','二','三','四','五','六','日'].map(d=>`<span class="health-calendar-weekday">${d}</span>`).join('')}${cells.map(d=>d?`<button class="health-calendar-day ${Object.values(state.healthChecks[d]||{}).some(Boolean)?'has-check':''} ${d===today?'today':''}" data-action="select-checkin-date" data-date="${d}" title="${d}">${Number(d.slice(-2))}</button>`:'<span class="health-calendar-day empty"></span>').join('')}</div><div class="health-calendar-selected">日期：${esc(ui.checkinDate||today)} · 已完成 ${Object.values(state.healthChecks[ui.checkinDate||today]||{}).filter(Boolean).length} 项</div></section>
 <section class="card">${cardHead('身体指标监控','录入测量值并按日期追踪；血压单位 mmHg，血脂按化验单单位记录。',`<button class="btn btn-outline" data-action="open-health-metric-modal">＋ 添加指标</button>`)}<form id="healthMetricForm" class="health-form"><label>日期<input name="date" type="date" value="${today}" required></label><label>指标<select name="metric"><option>体重</option><option>收缩压</option><option>舒张压</option><option>总胆固醇</option><option>LDL-C</option><option>HDL-C</option><option>甘油三酯</option><option>静息心率</option><option>腰围</option><option>体脂率</option><option>空腹血糖</option></select></label><label>数值<input name="value" type="number" step="any" required placeholder="测量数值"></label><label>单位<input name="unit" placeholder="kg / mmHg / mmol/L / bpm"></label><label class="wide-field">备注<input name="note" placeholder="测量时间、空腹/餐后、设备等"></label><div class="wide-field"><button class="btn btn-primary" type="button" data-action="add-health-metric">保存指标</button></div></form><div class="health-history-list">${metrics.slice(0,15).map((m,i)=>`<article class="health-history-item"><div class="health-history-date">${esc(m.date)}</div><div class="health-history-copy"><strong>${esc(m.metric)}：${esc(m.value)} ${esc(m.unit||'')}</strong><small>${esc(m.note||'')}</small></div><button class="btn btn-small btn-ghost" data-action="delete-health-metric" data-index="${i}">删除</button></article>`).join('')||'<div class="empty-state">暂无指标数据。血脂等项目建议按体检/化验单日期录入。</div>'}</div></section></div>
 <section class="card" style="margin-top:14px">${cardHead('健康管理 · 日/周统计曲线','基于实际打卡数据统计。')} ${(()=>{const days=dateRangeKeys(7),weeks=groupedWeekStarts(8),daily=days.map(d=>Object.values(state.healthChecks[d]||{}).filter(Boolean).length),weekly=weeks.map(w=>{const e=shiftDateKey(w,6);return Object.keys(state.healthChecks||{}).filter(d=>d>=w&&d<=e).reduce((sum,d)=>sum+Object.values(state.healthChecks[d]||{}).filter(Boolean).length,0)});return renderCapabilityAnalytics({title:'健康打卡',metric:'打卡项数',dailyValues:daily,dailyLabels:days.map(d=>d.slice(5)),weeklyValues:weekly,weeklyLabels:weeks.map(d=>d.slice(5)),checkinsToday:checked,checkinsWeek:weekly[weekly.length-1]||0})})()}</section>
 ${trainingHistoryMarkup()}`;
}
function renderHealthSection(kind){
  if(kind==='fitness') return `${sectionHead('HEALTH OS · MODULE','健身管理','独立子模块：从健康总览进入各主题，详细数据仍保存在健康管理工作区。',`<button class="btn btn-outline" data-action="capability-page" data-page="health">← 健康总览</button>`)}<div class="health-module-card">${renderGuidedSummary()}${renderFitnessV2()}</div>`;
  if(kind==='diet') return renderDietOS();
  if(kind==='skin') return renderSkinOS();
  if(kind==='sleep') return renderSleepOS();
  return `${sectionHead('HEALTH OS · MODULE','发型与穿搭','记录发型参考、头皮状态、衣橱搭配与场景穿搭。',`<button class="btn btn-outline" data-action="capability-page" data-page="health">← 健康总览</button>`)}<div class="health-module-card"><section class="card">${cardHead('发型与穿搭','记录发型参考图、理发日期、长度、头皮状态与沟通要点。')}<ul class="health-guidance"><li>记录穿搭组合、场景、单品、颜色和舒适度，逐步形成个人模板。</li><li>新产品或新风格一次只调整少数变量，便于复盘效果。</li></ul><button class="btn btn-primary" data-action="open-health-log-modal">＋ 新增形象记录</button></section></div>`;
}

function renderHealth(){
  const today=todayKey(), checks=state.healthChecks[today]||{}, checkItems=[['nutrition','饮食记录'],['workout','训练/活动'],['skin','皮肤护理'],['hair','发型/头皮护理'],['sleep','睡眠达标'],['water','饮水达标']];
  const todayLogs=(state.healthLogs||[]).filter(x=>x.date===today), workoutMinutes=todayLogs.filter(x=>x.category==='健身').reduce((a,x)=>a+n(x.duration),0), checked=checkItems.filter(x=>checks[x[0]]).length;
  const categoryNames={饮食:'饮食',饮水:'饮水',健身:'健身',皮肤:'皮肤管理',发型:'发型/头皮',睡眠:'睡眠',穿搭:'穿搭'};
  return `${sectionHead('HEALTH OS · DAILY CARE','健康','把健康当作长期复利系统：先稳定睡眠、饮食和训练，再观察体重、精力、皮肤与仪容变化。这里只做个人记录与习惯管理，不替代医生诊断。',`<button class="btn btn-outline" data-action="capability-page" data-page="home">← 返回今日工作台</button>`)}
  <div class="health-subnav"><span>健康管理 · 子模块</span><a href="#training-studio">健身管理 / 人体动作</a><a href="#diet-sleep-management">饮食饮水记录</a><a href="#appearance-management">形象管理</a><a href="#sleep-management">睡眠记录</a><a href="#health-checkin">今日健康打卡统计</a><a href="#health-log">详细记录</a><a href="#health-history">历史记录</a><a href="https://github.com/EzekielTheMad/healthtrack" target="_blank" rel="noopener noreferrer">GitHub 开源参考 ↗</a></div>
  <div class="grid grid-4">${metricCard('今日习惯',`${checked}/${checkItems.length}`,'完成饮食、训练、护理、睡眠等','✓',checked===checkItems.length?'good':'')}${metricCard('今日训练',`${workoutMinutes}<small> 分钟</small>`,'根据今天已保存的健身记录汇总','⌁')}${metricCard('健康记录',`${(state.healthLogs||[]).length}`,'全部日期的饮食、训练与护理记录','▤')}${metricCard('连续执行',`${healthStreak() }<small> 天</small>`,'按至少一项健康打卡计算连续天数','↗')}</div>
  ${renderHealthOSSummary()}
  ${renderTrainingStudio()}
  ${trainingHistoryMarkup()}
  ${(()=>{const days=dateRangeKeys(7),weeks=groupedWeekStarts(8),daily=days.map(d=>Object.values(state.healthChecks[d]||{}).filter(Boolean).length),weekly=weeks.map(w=>{const e=shiftDateKey(w,6);return Object.keys(state.healthChecks||{}).filter(d=>d>=w&&d<=e).reduce((sum,d)=>sum+Object.values(state.healthChecks[d]||{}).filter(Boolean).length,0)}),labels=days.map(d=>d.slice(5)),wlabels=weeks.map(d=>d.slice(5));return renderCapabilityAnalytics({title:'健康',metric:'打卡项数',dailyValues:daily,dailyLabels:labels,weeklyValues:weekly,weeklyLabels:wlabels,checkinsToday:checked,checkinsWeek:weekly[weekly.length-1]||0})})()}
  <section class="card" id="health-checkin" style="margin-top:14px">${cardHead('今日健康打卡','勾选后自动保存。建议关注可持续性，不追求单日完美。',`<span class="tag ${checked===checkItems.length?'good':'neutral'}">${today}</span>`)}<div class="health-check-grid">${checkItems.map(([key,label])=>`<button class="health-check ${checks[key]?'checked':''}" data-action="toggle-health-check" data-date="${today}" data-check="${key}"><span class="health-check-box">${checks[key]?'✓':''}</span><strong>${label}</strong><small>${checks[key]?'已完成':'点击打卡'}</small></button>`).join('')}</div></section>
  <div class="grid grid-2" id="diet-sleep-management" style="margin-top:14px"><section class="card">${cardHead('饮食饮水记录','记录饮食规律、蛋白质/蔬菜摄入、外食与体感变化')}<div class="card-body"><ul class="health-guidance"><li>优先记录吃了什么、份量与时间，不依赖未经验证的自动热量估算。</li><li>关注规律进餐、蛋白质来源、蔬菜水果、饮水和酒精/含糖饮料。</li><li>若有疾病、过敏或特殊饮食需求，按专业人员建议执行。</li></ul></div></section><section class="card">${cardHead('健身管理','记录力量训练、有氧、步数、时长、强度与恢复')}<div class="card-body"><ul class="health-guidance"><li>训练计划可按力量、有氧、灵活性与日常活动分类。</li><li>每次记录动作/项目、时长、组次或主观强度，按周复盘进步与疲劳。</li><li>疼痛、头晕或异常不适时停止训练并寻求专业评估。</li></ul></div></section><section class="card" id="appearance-management">${cardHead('形象管理 · 皮肤护理','建立晨间/夜间护理习惯与耐受观察')}<div class="card-body"><ul class="health-guidance"><li>基础流程优先简化为温和清洁、保湿与白天防晒。</li><li>新产品一次只引入一个，记录使用日期、反应和停用原因。</li><li>持续、严重或变化异常的皮肤问题交由皮肤科专业人员判断。</li></ul></div></section><section class="card" id="sleep-management">${cardHead('睡眠记录与恢复','记录入睡/起床时间、总睡眠时长、主观质量与次日精神状态')}<div class="card-body"><ul class="health-guidance"><li>记录上床、入睡、起床时间和夜间醒来情况。</li><li>同时记录睡眠质量、白天困倦与咖啡因时间。</li><li>连续出现明显睡眠问题时，考虑寻求专业评估。</li></ul></div></section><section class="card" id="appearance-style-management">${cardHead('发型与穿搭','沉淀适合自己的发型参考、衣橱搭配和场景穿搭方案。')}<div class="card-body"><ul class="health-guidance"><li>记录发型参考图、理发日期、长度、头皮状态与沟通要点。</li><li>记录穿搭组合、场景、单品、颜色和舒适度，逐步形成个人模板。</li><li>新产品或新风格一次只调整少数变量，便于复盘效果。</li></ul></div></section></div>
  <section class="card" id="health-log" style="margin-top:14px">${cardHead('新增健康记录','记录可以是饮食、训练、皮肤护理或发型/头皮；保存后会出现在历史记录中。')}<div class="card-body"><form id="healthLogForm" class="health-form"><label>日期<input name="date" type="date" value="${today}" required></label><label>类别<select name="category"><option>饮食</option><option>健身</option><option>皮肤</option><option>发型</option><option>睡眠</option><option>饮水</option><option>穿搭</option></select></label><label>标题<input name="title" required placeholder="例如：上肢力量训练 / 午餐"></label><label>时长（分钟）<input name="duration" type="number" min="0" value="0"></label><label>数值/份量<input name="value" placeholder="例如：体重 70.2kg、饮水 500ml"></label><label class="wide-field">内容/详情<input name="detail" placeholder="食物、动作组次、护理步骤、发型方案等"></label><label class="wide-field">备注/体感<textarea name="note" rows="2" placeholder="精力、饱腹、疲劳、皮肤耐受、下次调整"></textarea></label><div class="wide-field"><button class="btn btn-primary" type="button" data-action="add-health-log">保存健康记录</button></div></form></div></section>
  <section class="card" id="health-history" style="margin-top:14px">${cardHead('健康历史记录','所有记录按日期倒序，可删除误录项。',`<span class="tag neutral">${(state.healthLogs||[]).length} 条</span>`)}<div class="health-history-list">${(state.healthLogs||[]).slice(0,40).map((x,i)=>`<article class="health-history-item"><div class="health-history-date">${esc(x.date)}</div><div class="health-history-copy"><div><span class="tag neutral">${esc(categoryNames[x.category]||x.category)}</span> <strong>${esc(x.title)}</strong></div><p>${esc(x.detail||'')}${x.value?` · ${esc(x.value)}`:''}${x.duration?` · ${n(x.duration)} 分钟`:''}</p>${x.note?`<small>${esc(x.note)}</small>`:''}</div><button class="btn btn-small btn-ghost" data-action="delete-health-log" data-index="${i}">删除</button></article>`).join('')||'<div class="empty-state">还没有详细记录。先从今日打卡或上方新增记录开始。</div>'}</div></section>`;
}
function healthStreak(){let streak=0,d=new Date();for(let i=0;i<365;i++){const key=todayKey(d),obj=state.healthChecks[key]||{};if(Object.values(obj).some(Boolean)){streak++;d.setDate(d.getDate()-1);}else break;}return streak;}
function renderEnglish(){
  const today=todayKey(), logs=state.englishLogs||[], weekStart=new Date();weekStart.setDate(weekStart.getDate()-6);const weekKey=todayKey(weekStart),weekMinutes=logs.filter(x=>x.date>=weekKey&&x.date<=today).reduce((a,x)=>a+n(x.minutes),0),total=logs.reduce((a,x)=>a+n(x.minutes),0);
  return `${sectionHead('ENGLISH · INPUT TO REUSABLE OUTPUT','外语','每周目标 180 分钟。把阅读、听力、词汇输入转化为可复用的写作、口语复述、项目说明与公开作品。学习记录保存在当前账户。',`<button class="btn btn-primary" data-action="open-english-log-modal">＋ 新增英语学习记录</button><button class="btn btn-outline" data-action="capability-page" data-page="home">← 返回今日工作台</button>`)}
  <div class="health-subnav"><span>英语子模块</span><a href="#english-plan">训练路径</a><a href="#english-log">学习记录</a><a href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">TypeWords ↗</a></div>
  <div class="grid grid-4">${metricCard('本周学习',`${weekMinutes}<small> 分钟</small>`,'滚动近7天记录，目标180分钟','Aa',weekMinutes>=180?'good':'')}${metricCard('目标进度',`${Math.min(100,Math.round(weekMinutes/180*100))}<small>%</small>`,'以持续性为先，避免突击式学习','↗')}${metricCard('累计学习',`${total}<small> 分钟</small>`,'所有已记录的英语学习时长','◷')}${metricCard('学习记录',`${logs.length}`,'每次训练尽量留下输出成果','▤')}</div>
  ${(()=>{const days=dateRangeKeys(7),weeks=groupedWeekStarts(8),daily=days.map(d=>sumDaily(logs,d,'minutes')),weekly=weeklySums(logs,weeks,'minutes'),labels=days.map(d=>d.slice(5)),wlabels=weeks.map(d=>d.slice(5)),todayCount=countDaily(logs,today);return renderCapabilityAnalytics({title:'英语能力',metric:'学习分钟',dailyValues:daily,dailyLabels:labels,weeklyValues:weekly,weeklyLabels:wlabels,checkinsToday:todayCount,checkinsWeek:logs.filter(x=>x.date>=weekKey&&x.date<=today).length})})()}
  <section class="card" id="english-plan" style="margin-top:14px">${cardHead('从输入到可复用输出','建议每周安排 3–5 次短练习，至少形成一份可复用输出。')}<div class="english-node-grid"><div class="english-target"><div class="eyebrow">WEEKLY TARGET</div><strong>180 <small>分钟 / 周</small></strong><p>建议节奏：词汇/跟写 30 分钟；真实资料阅读或听力 60 分钟；复述、写作与项目输出 60 分钟；复盘与间隔复习 30 分钟。</p><div class="english-progress-track"><div class="english-progress-fill" style="width:${clamp(weekMinutes/180*100,0,100)}%"></div></div><small>近7天：${weekMinutes} / 180 分钟</small></div><div class="english-tool"><div class="english-tool-mark">Aa</div><div class="eyebrow">EXTERNAL LEARNING TOOL</div><h4>TypeWords · 单词与文章练习</h4><p>把单词、文章跟写和逐句练习用于输入训练；本工作台记录训练时长与输出成果，不读取 TypeWords 账户或练习数据。</p><div class="roadmap-nested-menu english-secondary-menu"><a href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">打开 TypeWords 单词/文章练习 ↗</a></div></div></div><div class="english-stage-grid"><article><b>01 · 输入</b><p>听读真实材料，提取高频表达和可复用句型。</p></article><article><b>02 · 转述</b><p>不看原文复述核心观点，记录卡壳表达。</p></article><article><b>03 · 输出</b><p>写摘要、项目文档、邮件或做 2–5 分钟口头表达。</p></article><article><b>04 · 复用</b><p>将好句、模板和术语整理进个人表达库。</p></article></div></section>
  <section class="card" id="english-log" style="margin-top:14px">${cardHead('新增英语学习记录','每次记录至少留下一项可见成果，例如摘要、口头复述、邮件草稿或术语卡。')}<div class="card-body"><form id="englishLogForm" class="health-form"><label>日期<input name="date" type="date" value="${today}" required></label><label>训练类型<select name="skill"><option>综合</option><option>词汇/跟写</option><option>阅读</option><option>听力</option><option>口语复述</option><option>写作</option><option>真实工作输出</option></select></label><label>学习分钟<input name="minutes" type="number" min="1" value="30" required></label><label class="wide-field">输出成果<input name="output" required placeholder="例如：用英文写了项目周报 / 复述一篇文章"></label><label class="wide-field">复盘/新表达<textarea name="note" rows="2" placeholder="卡住的表达、值得复用的句型、下一步"></textarea></label><div class="wide-field"><button class="btn btn-primary" type="button" data-action="add-english-log">保存英语记录</button></div></form></div></section>
  <section class="card" style="margin-top:14px">${cardHead('学习历史','按日期倒序。建议每周复用至少一个学习成果。')}<div class="health-history-list">${logs.map((x,i)=>`<article class="health-history-item"><div class="health-history-date">${esc(x.date)}<small>${n(x.minutes)} 分钟</small></div><div class="health-history-copy"><div><span class="tag neutral">${esc(x.skill)}</span> <strong>${esc(x.output)}</strong></div>${x.note?`<small>${esc(x.note)}</small>`:''}</div><button class="btn btn-small btn-ghost" data-action="delete-english-log" data-index="${i}">删除</button></article>`).join('')||'<div class="empty-state">还没有英语记录。完成一次短练习并留下输出即可。</div>'}</div></section>`;
}
function renderReading(){
  const books=state.readingBooks||[],notes=state.readingNotes||[],sessions=state.readingSessions||[],finished=books.filter(x=>x.status==='已读完').length,progress=books.reduce((a,x)=>a+(n(x.totalPages)>0?Math.min(100,n(x.currentPage)/n(x.totalPages)*100):0),0);
  return `${sectionHead('READING OS · LIBRARY & NOTES','阅读','用阅读计划形成持续输入，用感想建立自己的判断，再通过 Notebook 把知识沉淀成可检索、可复用的笔记。',`<button class="btn btn-primary" data-action="open-reading-session-modal">＋ 每日阅读打卡</button><button class="btn btn-outline" data-action="capability-page" data-page="home">← 返回今日工作台</button>`)}
  <div class="reading-external-row"><a class="reading-external-card" href="https://app.flowoss.com/zh-CN" target="_blank" rel="noopener noreferrer"><span class="launch-icon">▣</span><strong>打开 FlowOSS 阅读器 ↗</strong><small>在独立页面阅读；当前工作台不读取 FlowOSS 账号或阅读进度。</small></a><div class="reading-external-card"><span class="launch-icon">▤</span><strong>Notebook · 个人知识库</strong><small>保存摘要、概念、引用、疑问与行动项，并支持导出完整工作区 JSON 备份。</small><button class="btn btn-outline" data-action="export-json">导出笔记与阅读数据 ↓</button></div></div>
  <div class="grid grid-4" style="margin-top:14px">${metricCard('书籍计划',`${books.length}`,'计划阅读、阅读中、已读完与暂缓','▤')}${metricCard('已完成',`${finished}`,'完成阅读后将状态改为已读完','✓',finished?'good':'')}${metricCard('计划进度',`${books.length?Math.round(progress/books.length):0}<small>%</small>`,'按每本书的已读页数/总页数均值计算','↗')}${metricCard('感想/笔记',`${notes.length+ (state.notebookEntries||[]).length}`,'阅读感想与 Notebook 条目合计','✎')}</div>
  ${(()=>{const days=dateRangeKeys(7),weeks=groupedWeekStarts(8),all=[...sessions,...notes.map(x=>({...x,minutes:0,sessionType:'note'})),...(state.notebookEntries||[]).map(x=>({...x,minutes:0,sessionType:'note'}))],daily=days.map(d=>sessions.filter(x=>x.date===d).reduce((a,x)=>a+n(x.minutes),0)),weekly=weeklySums(sessions,weeks,'minutes'),labels=days.map(d=>d.slice(5)),wlabels=weeks.map(d=>d.slice(5)),todayCount=all.filter(x=>x.date===todayKey()).length,weekCount=all.filter(x=>x.date>=shiftDateKey(todayKey(),-6)&&x.date<=todayKey()).length;return renderCapabilityAnalytics({title:'阅读与知识库',metric:'阅读分钟',dailyValues:daily,dailyLabels:labels,weeklyValues:weekly,weeklyLabels:wlabels,checkinsToday:todayCount,checkinsWeek:weekCount})})()}
  <section class="card" style="margin-top:14px">${cardHead('阅读书籍计划','给每本书设定目标页数、完成日期和阅读目的。',`<span class="tag neutral">${books.length} 本</span>`)}<div class="card-body"><form id="readingBookForm" class="health-form"><label>书名<input name="title" required placeholder="书名"></label><label>作者<input name="author" placeholder="作者"></label><label>状态<select name="status"><option>计划阅读</option><option>阅读中</option><option>已读完</option><option>暂缓</option></select></label><label>优先级<select name="priority"><option>高</option><option selected>普通</option><option>低</option></select></label><label>目标完成日<input name="targetDate" type="date"></label><label>总页数<input name="totalPages" type="number" min="0" value="0"></label><label>当前页数<input name="currentPage" type="number" min="0" value="0"></label><label class="wide-field">阅读目的<input name="goal" placeholder="例如：建立投资框架、改善写作、学习某项技能"></label><div class="wide-field"><button class="btn btn-primary" type="button" data-action="add-reading-book">＋ 添加书籍计划</button></div></form></div><div class="table-wrap"><table class="data-table"><thead><tr><th>书籍</th><th>状态</th><th>目标完成</th><th>进度</th><th>阅读目的</th><th></th></tr></thead><tbody>${books.map((x,i)=>`<tr><td><div class="table-main">${esc(x.title)}</div><div class="table-sub">${esc(x.author||'作者未录入')}</div></td><td><select class="table-select" data-reading-book="${i}" data-key="status">${['计划阅读','阅读中','已读完','暂缓'].map(v=>`<option ${x.status===v?'selected':''}>${v}</option>`).join('')}</select></td><td>${esc(x.targetDate||'—')}</td><td><div class="reading-progress-input"><input class="table-input" type="number" min="0" data-reading-book="${i}" data-key="currentPage" value="${n(x.currentPage)}" title="当前页"><span>/</span><input class="table-input" type="number" min="0" data-reading-book="${i}" data-key="totalPages" value="${n(x.totalPages)}" title="总页数"></div><small>${n(x.totalPages)>0?Math.round(n(x.currentPage)/n(x.totalPages)*100)+'%':'未设置总页数'}</small></td><td class="table-sub">${esc(x.goal||'')}</td><td><button class="btn btn-small btn-ghost" data-action="delete-reading-book" data-index="${i}">删除</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-state">暂无书籍计划。先加入一本近期最想读的书。</td></tr>'}</tbody></table></div></section>
  <section class="card" style="margin-top:14px">${cardHead('每日阅读打卡','记录实际阅读分钟、页数与当天理解，统计曲线以这些真实记录为准。')}<div class="card-body"><form id="readingSessionForm" class="health-form"><label>日期<input name="date" type="date" value="${todayKey()}" required></label><label>书籍<select name="book"><option value="">未关联书籍</option>${books.map(x=>`<option value="${esc(x.title)}">${esc(x.title)}</option>`).join('')}</select></label><label>阅读分钟<input name="minutes" type="number" min="1" value="20" required></label><label>阅读页数<input name="pages" type="number" min="0" value="0"></label><label class="wide-field">本次摘要/心得<input name="note" placeholder="读了什么、最重要的观点或下一步"></label><div class="wide-field"><button class="btn btn-primary" type="button" data-action="add-reading-session">保存阅读打卡</button></div></form></div><div class="health-history-list">${sessions.slice(0,12).map((x,i)=>`<article class="health-history-item"><div class="health-history-date">${esc(x.date)}<small>${n(x.minutes)} 分钟 · ${n(x.pages)} 页</small></div><div class="health-history-copy"><strong>${esc(x.book||'自由阅读')}</strong><p>${esc(x.note||'已记录阅读')}</p></div><button class="btn btn-small btn-ghost" data-action="delete-reading-session" data-index="${i}">删除</button></article>`).join('')||'<div class="empty-state">尚无阅读打卡。记录阅读分钟与页数后，会自动进入日/周曲线。</div>'}</div></section>
  <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('阅读感想 / 复盘','记录观点、反例、问题与能采取的行动。')}<div class="card-body"><form id="readingNoteForm" class="health-form one-column"><label>日期<input name="date" type="date" value="${todayKey()}" required></label><label>关联书籍<input name="book" list="readingBookNames" placeholder="书名（可选）"><datalist id="readingBookNames">${books.map(x=>`<option value="${esc(x.title)}"></option>`).join('')}</datalist></label><label>类型<select name="type"><option>感想</option><option>核心观点</option><option>反例/质疑</option><option>行动项</option><option>金句/引用</option></select></label><label>标题<input name="title" required placeholder="这一章最重要的发现"></label><label>内容<textarea name="content" rows="5" required placeholder="用自己的话写：作者观点、证据、我的判断、可执行动作"></textarea></label><button class="btn btn-primary" type="button" data-action="add-reading-note">保存阅读感想</button></form></div></section>
  <section class="card">${cardHead('Notebook · 随手知识库','保存不一定属于某一本书的想法、研究线索、术语和行动清单。')}<div class="card-body"><form id="notebookForm" class="health-form one-column"><label>日期<input name="date" type="date" value="${todayKey()}" required></label><label>标题<input name="title" required placeholder="笔记标题"></label><label>标签<input name="tags" placeholder="例如：投资、英语、AI、健康"></label><label>正文<textarea name="content" rows="6" required placeholder="Markdown风格的普通文本：摘要、问题、证据、行动项……"></textarea></label><button class="btn btn-primary" type="button" data-action="add-notebook-entry">保存到 Notebook</button></form></div></section></div>
  <section class="card" style="margin-top:14px">${cardHead('阅读感想与 Notebook 条目','保存后会在这里汇总，可删除误录记录。')}<div class="reading-notes-list">${[...notes.map((x,i)=>({...x,_kind:'reading',_index:i})),...(state.notebookEntries||[]).map((x,i)=>({...x,_kind:'notebook',_index:i}))].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).map(x=>`<article class="reading-note-item"><div class="reading-note-meta"><span class="tag ${x._kind==='notebook'?'good':'neutral'}">${x._kind==='notebook'?'Notebook':esc(x.type||'感想')}</span><small>${esc(x.date||'')}</small></div><h4>${esc(x.title)}</h4>${x.book?`<p class="table-sub">关联书籍：${esc(x.book)}</p>`:''}${x.tags?`<p class="table-sub">标签：${esc(x.tags)}</p>`:''}<p class="reading-note-content">${esc(x.content||'')}</p><button class="btn btn-small btn-ghost" data-action="${x._kind==='notebook'?'delete-notebook-entry':'delete-reading-note'}" data-index="${x._index}">删除</button></article>`).join('')||'<div class="empty-state">暂无阅读感想或知识笔记。每次阅读后写下自己的判断，比只记摘抄更有价值。</div>'}</div></section>`;
}

function renderNewConfig() {
  const p=state.profile, tasks=state.tasks||[], done=tasks.filter(t=>t.status==='已完成').length;
  const emergencyTarget=n(p.necessaryExpense)*n(p.emergencyMonths,6);
  const gap=Math.max(0,emergencyTarget-n(p.emergencyCash));
  const rate=n(p.monthlyIncome)>0?n(p.monthlyInvest)/n(p.monthlyIncome)*100:0;
  const infraStatus=['未开始','待盘点','待验证','监控中','进行中','已完成','暂缓/法域核验','待法律核验'];
  return `${sectionHead('OLD VS NEW · 90-DAY EXECUTION','新登','先建立底层能力，再逐层增加资产、收入引擎、全球金融基础设施与跨境选择权。任何上层目标都不能替代现金流、合规和执行力。',`<button class="btn btn-outline" data-action="export-json">导出清单 ↓</button>`)}
    ${renderCapabilityQuickNav()}
    <div class="workbook-inline-note"><strong>新登配置原始 Excel</strong><span>查看完整的个人资产台账、90 天路线图、跨境基础设施、每周跟踪与 AI 订阅 ROI。</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="newconfig-90d">预览新登配置 Excel ↗</button></div>
    ${renderCapabilityPyramid()}
    <div class="grid grid-4">${metricCard('90 天里程碑',`${done}/${tasks.length}`,'完成任务需留存可验证证据','✓')}${metricCard('应急金目标',money(emergencyTarget),'必要月支出 × 应急月数（应急金独立于投资组合）','◫')}${metricCard('应急金缺口',money(gap),gap>0?'先补安全垫，再扩大风险仓':'参考目标已覆盖','⌁',gap>0?'warning':'good')}${metricCard('当前储蓄/投资率',pct(rate,1),`目标 ${pct(n(p.savingsRateTarget,20),0)}；收入未录入时显示0`,'↗')}</div>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('个人现金流与执行参数','可编辑默认目标；录入真实数据之后仪表盘会重新计算')}<div class="card-body"><div class="input-grid"><div class="field"><label>税后月收入（元）</label><input type="number" min="0" data-profile="monthlyIncome" value="${n(p.monthlyIncome)}" /></div><div class="field"><label>必要月支出（元）</label><input type="number" min="0" data-profile="necessaryExpense" value="${n(p.necessaryExpense)}" /></div><div class="field"><label>每月计划投资/储蓄额（元）</label><input type="number" min="0" data-profile="monthlyInvest" value="${n(p.monthlyInvest)}" /></div><div class="field"><label>当前负债余额（元）</label><input type="number" min="0" data-profile="currentDebt" value="${n(p.currentDebt)}" /></div><div class="field"><label>应急金现金余额（元）</label><input type="number" min="0" data-profile="emergencyCash" value="${n(p.emergencyCash)}" /></div><div class="field"><label>应急月数目标</label><select data-profile="emergencyMonths"><option value="6" ${n(p.emergencyMonths,6)===6?'selected':''}>6个月</option><option value="9" ${n(p.emergencyMonths,6)===9?'selected':''}>9个月</option><option value="12" ${n(p.emergencyMonths,6)===12?'selected':''}>12个月</option></select></div><div class="field"><label>储蓄/投资率目标（%）</label><input type="number" min="0" max="100" data-profile="savingsRateTarget" value="${n(p.savingsRateTarget,20)}" /></div><div class="field"><label>AI订阅成本合计/月（元）</label><input type="number" min="0" data-profile="aiMonthlyCost" value="${n(p.aiMonthlyCost)}" /></div><div class="field"><label>当前粉丝数</label><input type="number" min="0" data-profile="followers" value="${n(p.followers)}" /></div><div class="field"><label>近12周副业收入（元）</label><input type="number" min="0" data-profile="sideIncome12w" value="${n(p.sideIncome12w)}" /></div><div class="field"><label>近12周执行均分</label><input type="number" min="0" max="100" data-profile="executionScore" value="${n(p.executionScore)}" /></div></div><div class="subtle-divider"></div><p class="rule-explanation">先稳现金流、应急金与高息债；投资资产与应急金分开。VOO/QQQ是全球宽基上的倾斜，不代表额外分散；BTC目标默认0%，境内数字资产与跨境资金需逐项做法域与渠道核验。</p></div></section>
</div>
    <section class="card" id="roadmap-section" style="margin-top:14px">${cardHead('90天行动路线图','按顺序执行；状态、证据和退出条件必须能持续跟踪',`<span class="tag ${done===tasks.length?'good':'neutral'}">完成 ${done}/${tasks.length}</span>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>阶段</th><th>任务</th><th>具体动作</th><th>完成证据</th><th>优先级</th><th>状态</th><th>退出/复盘标准</th></tr></thead><tbody>${tasks.map((t,i)=>`<tr><td>${esc(t.phase)}</td><td><div class="table-main">${esc(t.task)}</div></td><td class="table-sub">${esc(t.action)}${String(t.task||'').includes('英语')?`<div class="roadmap-nested-menu"><span>英语 · 二级菜单</span><a href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">TypeWords：单词与文章练习 ↗</a></div>`:''}</td><td class="table-sub">${esc(t.evidence)}</td><td>${tag(t.priority,t.priority==='P0'?'warn':'neutral')}</td><td><select class="table-select" data-task-status="${i}">${['未开始','进行中','已完成','阻塞','暂缓'].map(s=>`<option ${t.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td class="table-sub">${esc(t.exit)}</td></tr>`).join('')}</tbody></table></div></section>

    <section class="card" style="margin-top:14px">${cardHead('新登配置完整设施清单','类别覆盖聊天列出的资产、订阅、身份、公司、房产、保险及个人产出。每条可改状态和下一步。')}<div class="table-wrap"><table class="data-table"><thead><tr><th>事项 / 优先级</th><th>状态</th><th>下一步具体动作</th><th>复核周期</th><th>纪律 / 风险边界</th></tr></thead><tbody>${state.infrastructure.map((x,i)=>`<tr><td><div class="table-main">${esc(x.category)}</div><div class="table-sub">${esc(x.priority)}</div></td><td><select class="table-select" data-infra-status="${i}">${[...new Set([x.status,...infraStatus])].map(s=>`<option ${s===x.status?'selected':''}>${esc(s)}</option>`).join('')}</select></td><td><textarea class="table-textarea" data-infra-next="${i}">${esc(x.next)}</textarea></td><td>${esc(x.review)}</td><td class="table-sub">${esc(x.guardrail)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card" style="margin-top:14px">${cardHead('AI订阅 ROI 台账','估值 = 节省小时 × 保守小时价值 + 可归因收入；连续30天没有使用或产出则取消/降级。',`<button class="btn btn-outline" data-action="add-subscription">＋ 添加订阅</button>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>工具/服务</th><th>月费</th><th>节省小时</th><th>小时价值</th><th>归因收入</th><th>估计价值</th><th>价值/成本</th><th>续费决策</th><th></th></tr></thead><tbody>${(state.subscriptions||[]).map((x,i)=>{const value=n(x.hours)*n(x.hourValue)+n(x.revenue),ratio=n(x.cost)>0?value/n(x.cost):0;return `<tr><td><input class="table-input wide" data-sub="${i}" data-key="name" value="${esc(x.name)}" /></td><td><input class="table-input" type="number" min="0" data-sub="${i}" data-key="cost" value="${n(x.cost)}" /></td><td><input class="table-input" type="number" min="0" data-sub="${i}" data-key="hours" value="${n(x.hours)}" /></td><td><input class="table-input" type="number" min="0" data-sub="${i}" data-key="hourValue" value="${n(x.hourValue)}" /></td><td><input class="table-input" type="number" min="0" data-sub="${i}" data-key="revenue" value="${n(x.revenue)}" /></td><td>${money(value)}</td><td>${ratio.toFixed(2)}x</td><td><select class="table-select" data-sub="${i}" data-key="decision">${['评估中','续费','降级','取消'].map(s=>`<option ${x.decision===s?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn btn-small btn-ghost" data-action="delete-subscription" data-index="${i}">删除</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-state">尚无订阅记录。添加一条后可计算成本回报。</td></tr>'}</tbody></table></div></section>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('全量资产 / 账户台账','一行一项资产或账户汇总；原币市值 × 人民币汇率换算。不录入密码、助记词、完整账号或身份证件号码。',`<button class="btn btn-outline" data-action="add-asset">＋ 添加资产</button>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>估值日期</th><th>资产桶</th><th>账户/平台简称</th><th>所在地/法域</th><th>币种</th><th>原币金额</th><th>人民币/原币汇率</th><th>人民币市值</th><th>备注</th><th></th></tr></thead><tbody>${(state.assetLedger||[]).map((x,i)=>`<tr><td><input type="date" class="table-input" data-asset="${i}" data-key="date" value="${esc(x.date||'')}" /></td><td><input class="table-input wide" data-asset="${i}" data-key="bucket" value="${esc(x.bucket||'')}" /></td><td><input class="table-input wide" data-asset="${i}" data-key="account" value="${esc(x.account||'')}" /></td><td><input class="table-input wide" data-asset="${i}" data-key="jurisdiction" value="${esc(x.jurisdiction||'')}" /></td><td><input class="table-input" data-asset="${i}" data-key="currency" value="${esc(x.currency||'CNY')}" /></td><td><input class="table-input" type="number" data-asset="${i}" data-key="amount" value="${n(x.amount)}" /></td><td><input class="table-input" type="number" step="0.0001" data-asset="${i}" data-key="fx" value="${n(x.fx,1)}" /></td><td>${money(n(x.amount)*n(x.fx,1))}</td><td><input class="table-input wide" data-asset="${i}" data-key="note" value="${esc(x.note||'')}" /></td><td><button class="btn btn-small btn-ghost" data-action="delete-asset" data-index="${i}">删除</button></td></tr>`).join('')||'<tr><td colspan="10" class="empty-state">尚未录入任何账户资产。请先盘点全量资产与负债，覆盖率目标≥95%。</td></tr>'}</tbody></table></div><div class="table-note">台账仅用于跟踪估值、所在地、币种、流动性和合规备注；本Demo不连接银行/券商账户，也不会收集登录凭证。</div></section>
      <section class="card">${cardHead('每周执行与内容现金流','英语输出、力量训练、睡眠、发布内容、投资储蓄和AI编程交付。以真实输出衡量。',`<button class="btn btn-outline" data-action="add-week">＋ 添加本周</button>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>周起始</th><th>英语分钟</th><th>训练次数</th><th>平均睡眠</th><th>内容条数</th><th>投资额</th><th>副业收入</th><th>AI月费</th><th>粉丝净增</th><th>AI/代码交付</th><th>执行分</th><th></th></tr></thead><tbody>${(state.weeklyLog||[]).map((x,i)=>`<tr><td><input type="date" class="table-input" data-week="${i}" data-key="week" value="${esc(x.week||'')}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="englishMin" value="${n(x.englishMin)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="training" value="${n(x.training)}" /></td><td><input class="table-input" type="number" step="0.1" data-week="${i}" data-key="sleep" value="${n(x.sleep)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="posts" value="${n(x.posts)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="invest" value="${n(x.invest)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="sideIncome" value="${n(x.sideIncome)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="aiCost" value="${n(x.aiCost)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="followersDelta" value="${n(x.followersDelta)}" /></td><td><input class="table-input" type="number" data-week="${i}" data-key="deliverables" value="${n(x.deliverables)}" /></td><td><input class="table-input" type="number" min="0" max="100" data-week="${i}" data-key="score" value="${n(x.score)}" /></td><td><button class="btn btn-small btn-ghost" data-action="delete-week" data-index="${i}">删除</button></td></tr>`).join('')||'<tr><td colspan="12" class="empty-state">无周记录。参考目标：英语180分钟/周、力量训练3次/周、平均睡眠8小时/天、内容发布3条/周。</td></tr>'}</tbody></table></div><div class="table-note">每周记录用于汇总执行表现；下一张表逐作品记录主题、链接、投入时间、播放/阅读、收藏/互动、粉丝、咨询/线索与收入，便于验证内容是否真正产生结果。</div></section></div>
    <section class="card" style="margin-top:14px">${cardHead('内容作品、IP与现金流跟踪','每一条内容/产品都保留投入、反馈、线索与收入；连续4周无信号应复盘定位，而不是机械更新。',`<button class="btn btn-outline" data-action="add-content">＋ 添加作品</button>`)}<div class="table-wrap"><table class="data-table"><thead><tr><th>发布日期</th><th>主题/栏目</th><th>交付形式</th><th>链接/文件</th><th>投入小时</th><th>成本</th><th>阅读/播放</th><th>互动/收藏</th><th>新增关注</th><th>咨询/线索</th><th>收入</th><th>复盘</th><th></th></tr></thead><tbody>${(state.contentLog||[]).map((x,i)=>`<tr><td><input type="date" class="table-input" data-content="${i}" data-key="date" value="${esc(x.date||'')}" /></td><td><input class="table-input wide" data-content="${i}" data-key="topic" value="${esc(x.topic||'')}" /></td><td><input class="table-input wide" data-content="${i}" data-key="format" value="${esc(x.format||'')}" /></td><td><input class="table-input wide" data-content="${i}" data-key="url" value="${esc(x.url||'')}" /></td><td><input class="table-input" type="number" step="0.1" data-content="${i}" data-key="hours" value="${n(x.hours)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="cost" value="${n(x.cost)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="reach" value="${n(x.reach)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="engagement" value="${n(x.engagement)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="followers" value="${n(x.followers)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="leads" value="${n(x.leads)}" /></td><td><input class="table-input" type="number" data-content="${i}" data-key="revenue" value="${n(x.revenue)}" /></td><td><input class="table-input wide" data-content="${i}" data-key="review" value="${esc(x.review||'')}" /></td><td><button class="btn btn-small btn-ghost" data-action="delete-content" data-index="${i}">删除</button></td></tr>`).join('')||'<tr><td colspan="13" class="empty-state">暂无作品记录。通过“添加作品”开始记录可展示交付、作品链接、转化线索与收入。</td></tr>'}</tbody></table></div></section>`;
}

function renderExecution() {
  const rows=[...(state.dailyLog||[])].slice().reverse();
  return `${sectionHead('OPERATING RHYTHM','每日执行与日志','用固定节奏减少临时决策。每次操作记录“触发条件、理由、实际动作、复盘”，避免事后编故事。',`<button class="btn btn-outline" data-action="export-json">导出跟踪日志 ↓</button>`)}
    <div class="grid grid-3">${metricCard('日志记录',`${state.dailyLog.length} 条`,'包括初始化参考记录','▤')}${metricCard('周执行评分',`${fmt(state.profile.executionScore,0)}/100`,'每周复盘后手动更新','✓')}${metricCard('当前数据状态',state.meta.marketQuality||'参考快照','行情刷新不等于交易级实时行情','◉')}</div>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('记录一条执行动作','手动提交会保存到当前登录用户的SQLite记录中')}<form id="dailyLogForm" class="card-body"><div class="input-grid"><div class="field"><label>日期</label><input type="date" id="logDate" required value="${new Date().toISOString().slice(0,10)}" /></div><div class="field"><label>记录类别</label><select id="logKind"><option>每日计划</option><option>市场更新</option><option>买入候选</option><option>减仓/止盈</option><option>再平衡</option><option>风险事件</option><option>技能/内容</option><option>合规事项</option></select></div><div class="field span-2"><label>实际动作</label><textarea id="logAction" required placeholder="例如：维持现金缓冲，等待MA20/MA60确认；没有下单"></textarea></div><div class="field span-2"><label>触发条件 / 理由</label><textarea id="logReason" placeholder="写下数据、评分变化、触发价、失败条件与证据链接"></textarea></div><div class="field"><label>状态</label><select id="logStatus"><option>待复核</option><option>已复核</option><option>已完成</option><option>阻塞</option></select></div></div><div style="margin-top:14px"><button type="submit" class="btn btn-primary">添加到日志 +</button></div></form></section>
      <section class="card">${cardHead('每日 / 每周 / 每月 / 每季度节奏','原方案固定执行时长与检查任务')}<div class="card-body"><div class="timeline">${state.cadence.map(c=>`<div class="timeline-row"><div class="timeline-time">${esc(c.when)}</div><div class="timeline-body"><strong>${esc(c.what)}</strong></div></div>`).join('')}</div><div class="subtle-divider"></div><div class="field"><label>更新每周执行评分（0–100）</label><input type="number" min="0" max="100" data-profile="executionScore" value="${n(state.profile.executionScore)}" /></div><p class="table-note">连续4周低于60分时，减少目标并修复阻力；分数衡量系统执行度，不代表投资收益。</p></div></section></div>
    <section class="card" style="margin-top:14px">${cardHead('操作历史','按时间倒序显示；可删除误录记录')}<div class="table-wrap"><table class="data-table"><thead><tr><th>日期</th><th>类别</th><th>动作</th><th>触发理由</th><th>状态</th><th></th></tr></thead><tbody>${rows.map((x,j)=>{const i=state.dailyLog.length-1-j;return `<tr><td>${esc(x.date)}</td><td>${tag(x.kind||'操作','neutral')}</td><td><div class="table-main">${esc(x.action)}</div></td><td class="table-sub">${esc(x.reason||'')}</td><td>${tag(x.status||'待复核',x.status==='已完成'||x.status==='已复核'?'good':'neutral')}</td><td><button class="btn btn-small btn-ghost" data-action="delete-log" data-index="${i}">删除</button></td></tr>`}).join('')||'<tr><td colspan="6" class="empty-state">暂无操作记录。</td></tr>'}</tbody></table></div></section>`;
}

function renderScreener() {
  const r=state.screenRule||{windowDays:7,yellowBMin:2,includeHigherGrades:true,gradeUniverse:'A+, A, B+, B'};
  const demoN=n(ui.screenTestCount,2), grade=ui.screenTestGrade||'黄色B';
  const gradeAccepted=r.includeHigherGrades?['黄色B','B','B+','A','A+','黄色A','黄色B+'].includes(grade):['黄色B','B'].includes(grade);
  const result=gradeAccepted&&demoN>=n(r.yellowBMin,2);
  return `${sectionHead('SIGNAL SCREENER','黄色 B 信号筛选与评分规则','根据项目聊天中可确认的核心要求：近N个交易日内出现黄色B及以上信号至少M次；评级范围、窗口与阈值可编辑。完整平台原始公式未出现在当前可读取上下文，因此此处是可调规则实现，不冒充原公式原样复制。',`<button class="btn btn-outline" data-action="export-json">导出规则 ↓</button>`)}
    <div class="grid grid-3">${metricCard('回看窗口',`${n(r.windowDays,7)} <small>交易日</small>`,'排除非交易日/按信号源定义','⌗')}${metricCard('最少黄色B次数',`${n(r.yellowBMin,2)} 次`,'同一标的在窗口内聚合','◎')}${metricCard('评级范围',r.includeHigherGrades?'B及以上':'仅B','A/A+/B+等按开关纳入','✓')}</div>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('筛选参数','按你之前确认的“近7天两次黄B，不一定今天是B”逻辑；这些设置可修改')}<div class="card-body"><div class="input-grid"><div class="field"><label>回看交易日数</label><input type="number" min="1" max="60" data-screen="windowDays" value="${n(r.windowDays,7)}" /></div><div class="field"><label>最少黄色B出现次数</label><input type="number" min="1" max="60" data-screen="yellowBMin" value="${n(r.yellowBMin,2)}" /></div><div class="field"><label>包括B以上（B+、A、A+）</label><select data-screen-bool="includeHigherGrades"><option value="true" ${r.includeHigherGrades?'selected':''}>是：B及以上</option><option value="false" ${!r.includeHigherGrades?'selected':''}>否：只统计黄色B</option></select></div><div class="field"><label>评级集合说明</label><input data-screen="gradeUniverse" value="${esc(r.gradeUniverse||'A+, A, B+, B')}" /></div></div><div class="field" style="margin-top:12px"><label>执行说明（可编辑）</label><textarea data-screen="condition">${esc(r.condition||'近7个交易日内黄色B及以上信号次数 ≥ 2')}</textarea></div><div class="field" style="margin-top:12px"><label>入选后的二次过滤（可编辑）</label><textarea data-screen="candidate">${esc(r.candidate||'成交额、趋势、风险扣分、流动性、标的适配检查通过后再评估')}</textarea></div></div></section>
      <section class="card">${cardHead('交互式规则测试','模拟输入信号计数与评级，不连接原券商/选股终端')}<div class="card-body"><div class="field"><label>窗口内黄色B及以上次数</label><input type="range" min="0" max="12" value="${demoN}" id="screenTestCount" /><div class="slider-value"><strong id="screenTestCountText">${demoN}</strong><span>次</span></div></div><div class="field" style="margin-top:18px"><label>最近一次/候选评级</label><select id="screenTestGrade">${['黄色B','B','B+','A','A+','其它'].map(s=>`<option ${grade===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="decision-box" style="margin-top:18px"><div class="eyebrow">RULE TEST RESULT</div><h3>${result?'满足初筛条件':'不满足初筛条件'}</h3><p>${gradeAccepted?`评级 ${grade} 被当前规则纳入统计。`:`评级 ${grade} 不在当前评级集合。`} 计数为 ${demoN}，门槛为至少 ${n(r.yellowBMin,2)} 次；${result?'进入下一步基本面/成交量/风险过滤。':'继续观察，或核验信号记录有没有遗漏。'}</p><div class="decision-footer"><span>是否符合初筛</span><strong>${result?'PASS':'NOT PASSED'}</strong></div></div><p class="table-note">重要：当前界面尚未接通你使用的具体行情软件的黄色B标记数据源。需要从原始聊天或公式编辑器中导入确切字段定义、总分计算及 A/B等级编码后，才能对历史股票池做真实回测与扫描。</p></div></section></div>
    <section class="card" style="margin-top:14px">${cardHead('部署到实际选股工具之前必须验证的条件','避免条件过宽/过窄以及把黄B误认为可直接交易信号')}<div class="grid grid-3" style="padding:16px"><div class="metric-mini"><span>信号频次</span><strong>每个交易日</strong><span>按标的记录所有评级，不能只看今天。</span></div><div class="metric-mini"><span>成交量 / 趋势</span><strong>二次过滤</strong><span>涨跌停、缺口、成交额、MA20/MA60与风险扣分。</span></div><div class="metric-mini"><span>回测与费用</span><strong>必须样本外</strong><span>计入买卖点、停牌/涨停不可成交、滑点、佣金和过拟合风险。</span></div></div></section>`;
}

function renderCycles() {
  const records=state.predictions||[];
  const notes=state.cycleNotes||[];
  return `${sectionHead('CYCLE RESEARCH / FORECAST AUDIT','周期研究：涛动周期论与预测验证','保留历史研究议题，并将理论转成可证伪的预测登记、盲测和复盘台账。当前读取到的是对话题名/摘要，不包含周金涛原始预测清单，所以不虚构具体时间点、目标价格或命中率。',`<button class="btn btn-outline" data-action="export-json">导出研究台账 ↓</button>`)}
    <div class="grid grid-3">${metricCard('已登记明确预测',`${records.length} 条`,'新增需在结果发生前登记时间戳','◎')}${metricCard('待补历史原文',`${notes.filter(x=>x.status==='待补原文').length} 项`,'补入原聊天/图示后逐条建档','▤')}${metricCard('复核纪律','盲测优先','区别明确预测与宽泛叙事','✓')}</div>
    <div class="grid grid-2" style="margin-top:14px"><section class="card">${cardHead('添加一条可验证预测','禁止事后改写原始目标；变更时另开版本')}<form class="card-body" id="predictionForm"><div class="input-grid"><div class="field"><label>发布日期</label><input type="date" id="predDate" required value="${new Date().toISOString().slice(0,10)}" /></div><div class="field"><label>理论/周期标签</label><input id="predTheory" required value="涛动周期论" /></div><div class="field"><label>标的/资产</label><input id="predAsset" required placeholder="例如：中国股票/黄金/房价" /></div><div class="field"><label>预测期限/到期日</label><input id="predHorizon" required placeholder="例如：2027年上半年" /></div><div class="field"><label>方向</label><select id="predDirection"><option>上涨</option><option>下跌</option><option>震荡</option><option>相对跑赢</option><option>相对跑输</option></select></div><div class="field"><label>目标值（可空）</label><input id="predTarget" placeholder="具体数值或区间；没有则留空" /></div><div class="field span-2"><label>命中标准 / 失效条件</label><textarea id="predCriterion" required placeholder="在什么时候，达到什么范围算命中；什么条件算失败"></textarea></div><div class="field span-2"><label>依据与原始引用</label><textarea id="predMemo" placeholder="贴上来源/原文段落或链接，建议保留引用与版本时间"></textarea></div></div><div style="margin-top:14px"><button class="btn btn-primary" type="submit">登记预测 +</button></div></form></section>
      <section class="card">${cardHead('研究框架与复核规程','资产周期解释必须能够映射到观察指标和真实资产价格')}<div class="card-body"><div class="timeline"><div class="timeline-row"><div class="timeline-time">01 · 定义</div><div class="timeline-body"><strong>把叙事变成条件</strong><p>具体标的、发布日期、预测区间、方向、时间期限、目标及失效条件缺一不可。</p></div></div><div class="timeline-row"><div class="timeline-time">02 · 冻结</div><div class="timeline-body"><strong>保存原始版本</strong><p>预测提出后不得覆盖；新增修正要保留旧版本与修正日期。</p></div></div><div class="timeline-row"><div class="timeline-time">03 · 对照</div><div class="timeline-body"><strong>与基准比较</strong><p>加入买入并持有/简单周期规则基准、交易成本、最大回撤、方向准确率及预测区间覆盖率。</p></div></div><div class="timeline-row"><div class="timeline-time">04 · 归因</div><div class="timeline-body"><strong>拒绝事后归因</strong><p>分别标记正确、错误、部分命中、不可判定、修改过预测；不要用宽泛叙事替代明确预测。</p></div></div></div></div></section></div>
    <section class="card" style="margin-top:14px">${cardHead('预测记录与历史研究缺口','记录状态可更改；未到期的预测不纳入命中率')}<div class="table-wrap"><table class="data-table"><thead><tr><th>发布日期</th><th>理论 / 标的</th><th>期限 / 方向</th><th>目标</th><th>命中条件 / 依据</th><th>状态</th><th></th></tr></thead><tbody>${records.map((x,i)=>`<tr><td>${esc(x.date)}</td><td><div class="table-main">${esc(x.theory)} · ${esc(x.asset)}</div><div class="table-sub">${esc(x.memo||'')}</div></td><td>${esc(x.horizon)}<div class="table-sub">${esc(x.direction)}</div></td><td>${esc(x.target||'未设点位')}</td><td class="table-sub">${esc(x.criterion)}</td><td><select class="table-select" data-pred-status="${i}">${['待观察','命中','部分命中','失败','不可判定','已修订'].map(s=>`<option ${x.status===s?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn btn-small btn-ghost" data-action="delete-prediction" data-index="${i}">删除</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty-state">暂无正式预测。先补入原始历史预测或登记未来预测，避免制造假样本。</td></tr>'}</tbody></table></div></section>
    <section class="card" style="margin-top:14px">${cardHead('已知研究笔记与缺口登记','由当前项目上下文可确认的内容，不以推测补齐缺失的原始研究')}<div class="table-wrap"><table class="data-table"><thead><tr><th>条目</th><th>状态</th><th>说明</th></tr></thead><tbody>${notes.map(x=>`<tr><td>${esc(x.period)}</td><td>${tag(x.status,x.status==='框架已建'?'good':'warn')}</td><td class="table-sub">${esc(x.note)}</td></tr>`).join('')}</tbody></table></div><div class="table-note">要完成“涛动周期论”原文级归档，需要把之前对话的完整文字、图片/思维导图或导出文件导入“聊天归档与源文件”所在目录；当前页面已经保留研究框架与补齐位置。</div></section>`;
}

async function loadMarketRefreshLogs(){
 const target=$('#marketRefreshLogBody');if(!target)return;
 try{const data=await api('/api/market/logs?limit=20');const logs=data.logs||[];
 target.innerHTML=logs.length?`<div class="market-log-list">${logs.map(log=>`<article class="market-log-row"><div class="market-log-meta"><strong>${esc(new Date(log.timestamp).toLocaleString('zh-CN'))}</strong><span class="tag ${log.status==='SUCCESS'?'good':'warn'}">${esc(log.status|| (log.ok?'SUCCESS':'FAILED'))} · ${log.success||0}/${log.total||0}</span><span>全球 ${log.successAssets||0}/${log.totalAssets||0} · A股 ${log.successEtfs||0}/${log.totalEtfs||0}</span></div>${(log.failures||[]).length?`<details><summary>失败明细（${log.failures.length}）</summary><ul>${log.failures.map(f=>`<li><b>${esc(f.key)}</b> · ${esc(f.source||'未知数据源')}：${esc(f.error||'无错误详情')}</li>`).join('')}</ul></details>`:''}${(log.qualityWarnings||[]).length?`<details><summary>行情滞后警告（${log.qualityWarnings.length}）</summary><ul>${log.qualityWarnings.map(w=>`<li><b>${esc(w.key)}</b> · 日期 ${esc(w.date||'未知')} · 滞后 ${esc(w.ageDays??'?')} 天 · ${esc(w.source||'未知来源')}</li>`).join('')}</ul></details>`:''}${!(log.failures||[]).length&&!(log.qualityWarnings||[]).length?'<p class="table-note">所有标的均通过基础完整性和新鲜度校验。</p>':''}</article>`).join('')}</div>`:'<p class="table-note">暂无拉取日志。点击投资节点中的「刷新行情」后，系统会将每次结果追加保存到 data/market_refresh_logs.jsonl。</p>';
 }catch(err){target.innerHTML=`<p class="table-note">读取行情日志失败：${esc(err.message)}</p>`;}
}

function renderArchive() {
  const chats=(state.chatArchive||[]).filter(c=>!/黄色\s*B|涛动周期|周期研究/.test(String(c.title||'')+' '+String(c.topics||'')));
  const links=[
    ['A股跟踪工具源码包','/materials/A股ETF自动跟踪工具_含20261009快照.zip','ZIP · 脚本/Excel/README',null],
    ['A股 ETF 自动跟踪工作簿（原始版）','/materials/A股板块轮动_ETF自动跟踪.xlsx','XLSX · 观察池/参数/原始算法表','ashare-tracker'],
    ['A股网页核验快照（最新）','/materials/A股板块轮动_ETF跟踪_20261009网页核验快照.xlsx','XLSX · 参考报价，非统一时点实时','ashare-latest'],
    ['全球资产配置工作簿（最新中文）','/materials/global_multi_asset_allocation_tracker_cn.xlsx','XLSX · 七维评分与动态目标','global-multi-asset-cn'],
    ['全球资产配置工作簿（原版）','/materials/global_multi_asset_allocation_tracker.xlsx','XLSX · 原始多资产配置模板','global-multi-asset-original'],
    ['新登配置90天路线图','/materials/新登配置_90天落地与持续跟踪.xlsx','XLSX · 个人资产与跨境基础设施','newconfig-90d'],
    ['纳斯达克 AI 跟踪器 V2','/materials/nasdaq_ai_daily_tracker_v2.xlsx','XLSX · 早期评分与仓位版本','nasdaq-v2'],
    ['纳斯达克 AI + 杠杆跟踪器 V3（最新）','/materials/nasdaq_ai_daily_tracker_v3_leverage_2.xlsx','XLSX · AI风险 / Core-Swing-Crisis / Leverage','nasdaq-v3'],
    ['A股跟踪 README（工具说明）','/materials/README_Ashare_tool.md','MD · 安装 / 每日执行说明',null],
    ['项目 README 原文','/materials/README_先看这里.md','MD · 原始方案与操作流程',null],
    ['纳指 AI 杠杆跟踪器（源文件名版）','/materials/nasdaq_ai_daily_tracker_v3_leverage.xlsx','XLSX · 与版本副本并存，保留源文件','nasdaq-v3'],
    ['早期A股跟踪源码包','/materials/A股ETF自动跟踪工具.zip','ZIP · 工具源文件',null],
    ['Nasdaq AI monitor 源码包','/materials/nasdaq_ai_monitor_v1.zip','ZIP · AI泡沫监控早期版本',null]
  ];
  return `${sectionHead('PROJECT ARCHIVE & DATA SOURCES','归档','将能确认的对话主题、已保存工作簿和程序源文件放在一个地方。完整逐字聊天历史并未全部出现在当前可访问上下文中，因此明确标记缺口；不会假装已读取并原样转写所有旧对话。',`<button class="btn btn-outline" data-action="export-json">导出完整工作区 JSON ↓</button><button class="btn btn-primary" data-action="import-json-open">导入/恢复 JSON ↑</button>`)}
    <div class="notice-panel"><div class="notice-icon">!</div><div><strong>完整性说明：当前交付是“可读取的项目材料 + 当前对话上下文”覆盖，不等于全部历史聊天逐字转录。</strong><p>当前页面仅保留仍在使用的项目主题与相应 Excel / ZIP 产物；已移除的研究节点及相关引用不再展示。补齐其他原始聊天导出后，可继续无损扩充，不需要重做网站。</p></div></div>
    ${personalVaultCard()}
    <section class="card" style="margin-top:14px">${cardHead('项目聊天主题索引','每条聊天关联最后交付的 Excel：点击“站内预览”可切换工作表并查看已保存单元格；也可下载原文件')}<div class="chat-catalog">${chats.map((c,i)=>{const ids=c.title.includes('新登')?['newconfig-90d']:c.title.includes('A股')?['ashare-latest','ashare-tracker']:c.title.includes('全球资产')?['global-multi-asset-cn','global-multi-asset-original']:c.title.includes('纳斯达克')?['nasdaq-v3','nasdaq-v2']:c.title.includes('指标')?['ashare-tracker']:[];return `<article class="chat-card"><div class="chat-card-top"><span class="chat-index">${String(i+1).padStart(2,'0')}</span><span class="chat-date">${esc(c.date)}</span><span class="tag ${c.status&&c.status.includes('待')?'warn':'good'}">${c.status&&c.status.includes('待')?'含待补内容':'已纳入模块'}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.topics)}</p><div class="chat-status">${esc(c.status)}</div>${ids.length?`<div class="chat-workbooks">${ids.map(id=>{const w=WORKBOOKS.find(x=>x.id===id);return w?`<button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="${esc(id)}">${esc(w.title)} · 站内预览 ↗</button>`:''}).join('')}</div>`:''}</article>`}).join('')}</div></section>
    <section class="card" style="margin-top:14px">${cardHead('项目参考材料','点击文件可下载原工作簿/源码；文件保存在本地项目 reference_materials 目录')}<div class="source-list">${links.map(([name,url,meta,wid])=>`<div class="source-item source-item-combo"><a class="source-file-link" href="${url}" target="_blank" rel="noopener"><div class="source-icon">▤</div><div><strong>${esc(name)}</strong><span>${esc(meta)}</span></div><span class="source-open">下载 ↗</span></a>${wid?`<button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="${wid}">站内预览</button>`:''}</div>`).join('')}</div><div class="table-note">可下载材料是项目中实际找到的原始文件拷贝，保留在 ZIP 包的 reference_materials/ 目录中。出于可部署性，原文件仍作为附件下载；可交互界面把核心字段建模为可编辑记录。</div></section>
    <section class="card" style="margin-top:14px">${cardHead('最近行情刷新结果','失败字段保留旧值；成功更新仅代表公开日线接口返回数据，不代表交易级实时行情')}<div class="card-body"><div class="grid grid-3"><div class="metric-mini"><span>最近尝试</span><strong>${state.meta.lastRefresh?esc(new Date(state.meta.lastRefresh).toLocaleString('zh-CN')):'尚未刷新'}</strong></div><div class="metric-mini"><span>接口成功统计</span><strong>${esc(state.meta.marketQuality||'未刷新')}</strong></div><div class="metric-mini"><span>数据状态</span><strong>${esc(state.meta.marketRefreshStatus==='SUCCESS'?'全量成功':state.meta.marketRefreshStatus==='PARTIAL'?'部分成功/有警告':state.meta.marketRefreshStatus==='FAILED'?'失败/保留旧值':state.meta.lastRefresh?'历史状态未知':'演示/历史参考')}</strong></div></div>${state.meta.marketErrors?.length?`<div class="subtle-divider"></div><p class="rule-explanation">失败/超时字段：${esc(state.meta.marketErrors.join('；'))}</p>`:''}${state.meta.marketRefreshNotice?`<p class="table-note">${esc(state.meta.marketRefreshNotice)}</p>`:''}</div></section>
    <section class="card" id="marketRefreshLogCard" style="margin-top:14px">${cardHead('行情拉取日志（持久化）','保存每次尝试的成功数、失败标的、供应商异常和超时信息')}<div class="card-body" id="marketRefreshLogBody"><p class="table-note">正在读取日志…</p></div></section>
    <section class="card" style="margin-top:14px">${cardHead('数据源注册表与技术链接','链接供手工核验；自动行情刷新只会更新程序能真实抓取的字段')}<div class="source-list">${[['Nasdaq Index History','https://indexes.nasdaq.com/Index/History/NDX','NDX历史日线'],['Cboe VIX','https://www.cboe.com/tradable-products/vix','VIX风险指标'],['FRED DGS10','https://fred.stlouisfed.org/series/DGS10','美国10年期利率'],['SEC EDGAR APIs','https://www.sec.gov/search-filings/edgar-application-programming-interfaces','公司CapEx/现金流/财报'],['AKShare安装与文档','https://github.com/akfamily/akshare/blob/main/docs/tutorial.md','A股公开行情接口'],['上交所ETF列表','https://www.sse.com.cn/','ETF产品公告/IOPV/折溢价核验'],['中国外汇管理局','https://www.safe.gov.cn/','跨境资金用途/银行核验'],['中国人民银行','https://www.pbc.gov.cn/','虚拟货币相关监管材料'],['中国税务总局','https://www.chinatax.gov.cn/','居民身份及境外所得税务'],['美国IRS：非居民遗产税','https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax-for-nonresidents-not-citizens-of-the-united-states','美国境内资产传承风险']].map(([name,url,meta])=>`<a class="source-item" href="${url}" target="_blank" rel="noopener"><div class="source-icon">↗</div><div><strong>${esc(name)}</strong><span>${esc(meta)}</span></div><span class="source-open">外部来源</span></a>`).join('')}</div><p class="table-note">行情供应商不同国家/证券时区、报价延时及字段口径可能不一致。策略字段如AI收入变现、融资风险、估值分位等通常需要公司财报、第三方数据或人工复核，不会因点击刷新就变成准确实时数据。</p></section>
    <section class="card" style="margin-top:14px">${cardHead('工作区备份、恢复与自定义','导出保存全部可编辑数据；JSON可用于自行编程或版本控制')}<div class="card-body"><div class="grid grid-3"><div class="metric-mini"><span>当前模型</span><strong>JSON + SQLite</strong><span>每用户独立工作区</span></div><div class="metric-mini"><span>前端代码</span><strong>static/app.js</strong><span>页面与交互逻辑可直接修改</span></div><div class="metric-mini"><span>后端接口</span><strong>server.py</strong><span>FastAPI / market refresh / user state</span></div></div><div class="subtle-divider"></div><div class="button-row"><button class="btn btn-primary" data-action="export-json">下载当前工作区 JSON</button><button class="btn btn-outline" data-action="import-json-open">导入 JSON 备份</button><input class="hidden" type="file" id="importJsonFile" accept="application/json,.json" /></div><p class="table-note">用导出文件恢复时会替换当前登录账户的整个应用状态，导入前请先导出备份。密码不会放入此 JSON；用户密码哈希单独保存在本地SQLite数据库。</p></div></section>`;
}

function workbookCard(id) { const w=WORKBOOKS.find(x=>x.id===id); if(!w)return ''; return `<div class="workbook-inline-note"><strong>${esc(w.title)}</strong><span>${esc(w.detail)}</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="${esc(id)}">站内查看 Excel ↗</button><a class="workbook-download-link" href="/materials/${encodeURIComponent(w.filename)}" target="_blank" rel="noopener">下载原始文件</a></div>`; }
async function openWorkbookViewer(id) {
  let wrap=$('#workbookViewer'); if(!wrap){wrap=document.createElement('div');wrap.id='workbookViewer';wrap.className='workbook-modal-wrap';document.body.appendChild(wrap);}
  const wb=WORKBOOKS.find(x=>x.id===id); if(!wb){toast('找不到该工作簿',true);return;}
  wrap.innerHTML=`<div class="workbook-backdrop" data-action="close-workbook"></div><section class="workbook-modal" role="dialog" aria-modal="true" aria-labelledby="workbookTitle"><header class="workbook-modal-head"><div><div class="eyebrow">WORKBOOK PREVIEW · ${esc(wb.topic)}</div><h2 id="workbookTitle">${esc(wb.title)}</h2><p>${esc(wb.detail)}</p></div><button class="task-delete" data-action="close-workbook" aria-label="关闭">×</button></header><div class="workbook-modal-toolbar"><span id="workbookSheetCount">正在读取工作表…</span><input id="workbookSearch" type="search" placeholder="搜索当前表中的内容…" /><a class="btn btn-outline" href="/materials/${encodeURIComponent(wb.filename)}" target="_blank" rel="noopener">下载原始 Excel ↗</a></div><div id="workbookTabs" class="workbook-tabs"></div><div id="workbookTableArea" class="workbook-table-area"><div class="loading-state">正在加载工作簿内容…</div></div><div class="workbook-modal-foot"><span>表格显示的是工作簿内已保存的单元格值；如需完整公式/格式/图表，请下载原始文件在 Excel 中查看。</span><span>${esc(wb.filename)}</span></div></section>`;
  try {
    const data=await api(`/api/materials/${encodeURIComponent(id)}/preview`); ui.workbookData=data; ui.workbookSheetIndex=0; renderWorkbookSheet();
  } catch(err) { const area=$('#workbookTableArea'); if(area)area.innerHTML=`<div class="notice-panel"><strong>无法读取工作簿</strong><p>${esc(err.message)}。请确认已登录且 reference_materials 文件存在。</p><a href="/materials/${encodeURIComponent(wb.filename)}" target="_blank">直接下载原始 Excel</a></div>`; }
}
function renderWorkbookSheet() {
  const data=ui.workbookData, tabs=$('#workbookTabs'), area=$('#workbookTableArea'); if(!data||!tabs||!area)return;
  const sheet=data.sheets?.[ui.workbookSheetIndex]; if(!sheet){area.innerHTML='<div class="empty-state">工作簿中没有可展示的工作表。</div>';return;}
  tabs.innerHTML=(data.sheets||[]).map((s,i)=>`<button class="workbook-tab ${i===ui.workbookSheetIndex?'active':''}" data-action="workbook-sheet" data-index="${i}">${esc(s.name)} <small>${s.rowCount||0}行</small></button>`).join('');
  const q=($('#workbookSearch')?.value||'').trim().toLowerCase(); let rows=sheet.rows||[];
  if(q) rows=rows.filter((row,i)=>(row.cells||[]).some(v=>String(v??'').toLowerCase().includes(q)) || (i===0&&String(sheet.name).toLowerCase().includes(q)));
  const maxCols=Math.min(80,Math.max(0,...rows.map(r=>(r.cells||[]).length)));
  const table=rows.length?`<table class="workbook-table"><thead><tr><th class="row-index">#</th>${Array.from({length:maxCols},(_,i)=>`<th>${excelColName(i+1)}</th>`).join('')}</tr></thead><tbody>${rows.map((row,ri)=>`<tr><th class="row-index">${esc(String(row.number||ri+1))}</th>${Array.from({length:maxCols},(_,ci)=>`<td>${esc((row.cells||[])[ci]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<div class="empty-state">没有匹配的单元格。</div>';
  area.innerHTML=`<div class="workbook-sheet-title"><strong>${esc(sheet.name)}</strong><span>${rows.length} 行显示 · 最多展示80列 · ${sheet.truncated?'已截取前500行':''}</span></div><div class="workbook-table-scroll">${table}</div>`;
  const count=$('#workbookSheetCount'); if(count)count.textContent=`${data.sheets.length} 张工作表 · ${data.filename}`;
}
function excelColName(n){let s='';while(n>0){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);}return s;}
function closeSidebar() { $('#sidebar')?.classList.remove('open'); }
function openSidebar() { $('#sidebar')?.classList.add('open'); }

function exportState() {
  const copy=JSON.parse(JSON.stringify(state));
  copy.meta=copy.meta||{}; copy.meta.exportedAt=new Date().toISOString();
  const blob=new Blob([JSON.stringify(copy,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`wealth-os-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); toast('已导出 JSON 备份');
}
async function refreshMarket() {
  if(marketBusy) return;
  marketBusy=true; if(state?.meta)state.meta.lastRefreshAttempt=new Date().toISOString(); const btns=$$('[data-action="refresh-market"]'); btns.forEach(b=>{b.disabled=true;b.classList.add('loading');});
  const progressId='marketRefreshProgress';
  let progressBox=document.getElementById(progressId);
  if(!progressBox){progressBox=document.createElement('div');progressBox.id=progressId;progressBox.className='market-progress-toast';progressBox.innerHTML='<div class="market-progress-head"><strong>正在拉取公开行情</strong><span data-progress-percent>0%</span></div><div class="market-progress-track"><span data-progress-fill></span></div><p data-progress-message>正在连接数据源…</p>';document.body.appendChild(progressBox);}
  progressBox.classList.add('visible');
  const updateProgress=(p={})=>{const percent=Math.max(0,Math.min(100,Number(p.percent)||0));const label=progressBox.querySelector('[data-progress-percent]');const fill=progressBox.querySelector('[data-progress-fill]');const msg=progressBox.querySelector('[data-progress-message]');if(label)label.textContent=`${percent}%`;if(fill)fill.style.width=`${percent}%`;if(msg)msg.textContent=p.message||'正在连接数据源…';};
  let progressPoll=true;
  const pollProgress=async()=>{while(progressPoll){try{const p=await api('/api/market/progress');updateProgress(p);if(!p.running&&p.percent===100)break;}catch{}await new Promise(resolve=>setTimeout(resolve,700));}};
  const pollPromise=pollProgress(); toast('正在拉取行情（最长等待 60 秒）…');
  try {
    const r=await api('/api/market/refresh',{method:'POST',body:JSON.stringify({})});
    state.meta.lastRefresh=r.refreshedAt; state.meta.marketRefreshAttemptAt=r.refreshedAt; state.meta.marketRefreshStatus=r.status||((r.ok)?'PARTIAL':'FAILED'); state.meta.marketRefreshOk=!!r.ok; if(r.status==='SUCCESS')state.meta.lastSuccessfulMarketRefreshAt=r.refreshedAt; state.meta.marketProviderStatus=r.providerStatus; state.meta.marketQuality=`全球 ${r.providerStatus?.globalAssets||'?' } · A股 ${r.providerStatus?.aShareEtfs||'?'}`; state.meta.marketRefreshNotice=r.notice; state.meta.marketErrors=(r.failures||[]).map(x=>`${x.key}: ${x.error}`); state.meta.lastMarketRefreshLog=r.log||null; state.meta.marketDecisionGate=r.decisionGate||null; state.meta.dataConfidence=r.decisionGate?.confidence??0;
    Object.entries(r.assets||{}).forEach(([key,v])=>{
      if(v.error){state.meta.marketErrors.push(`${key}: ${v.error}`);return;}
      const d=state.nasdaq;
      if(key==='NDX'&&v.price){d.ndxUpdatedAt=r.refreshedAt;d.ndxSource=v.source;d.ndxDate=v.date;d.ndx=v.price;if(v.athWindowHigh){d.ath=v.athWindowHigh;d.drawdown=v.drawdownFromWindowHighPct;} if(v.return20dPct!=null)d.ndxReturn20d=v.return20dPct;d.ndxDate=v.date;}
      if(key==='VIX'&&v.price){d.vix=v.price;d.vixDate=v.date;d.vixSource=v.source;d.vixUpdatedAt=r.refreshedAt;}
      if(key==='US10Y'&&v.price){d.tenYear=v.price;d.us10yDate=v.date;d.us10ySource=v.source;d.us10yUpdatedAt=r.refreshedAt;}
      if(key==='QQQ'&&v.price)state.meta.qqq={...v,updatedAt:r.refreshedAt};
      if(key==='VOO'&&v.price)state.meta.voo={...v,updatedAt:r.refreshedAt};
      if(key==='GOLD'&&v.price)state.meta.gold={...v,updatedAt:r.refreshedAt};
      if(key==='BTC'&&v.price)state.meta.btc={...v,updatedAt:r.refreshedAt};
      if(key==='GLOBAL_STOCKS'&&v.price)state.meta.globalStocks={...v,updatedAt:r.refreshedAt};
    });
    const map=new Map((r.etfs||[]).map(e=>[e.code,e]));
    state.etfs.forEach(e=>{const v=map.get(e.code); if(!v)return; if(v.error){state.meta.marketErrors.push(`${e.code}: ${v.error}`);e.marketLastError=v.error;e.marketQualityStatus='invalid';return;} e.price=v.price??e.price;e.change=v.changePct??e.change;e.r20=v.return20dPct??e.r20;e.ma20=v.ma20??null;e.ma60=v.ma60??null;e.r60=v.return60dPct??null;e.drawdown60=v.drawdown60dPct??null;e.marketDate=v.date;e.marketSource=v.source;e.marketUpdatedAt=r.refreshedAt;e.marketRows=v.rows||null;e.marketAgeDays=v.ageDays??null;e.marketQualityStatus=v.qualityStatus||'unknown';e.marketSourceTier=v.sourceTier||'unknown';e.marketLastError=null;e.quality=`行情日期 ${v.date||'缺失'}；拉取于 ${new Date(r.refreshedAt).toLocaleString('zh-CN',{hour12:false})}；来源 ${v.source||'未知'}；${v.rows?`有效日线 ${v.rows} 条；`:''}${v.sourceTier==='backup'?'已切换备用源；':''}${v.ageDays>4?'行情可能滞后；':''}人工宏观/政策/资金等未自动重算`;
      const trend=(v.ma20&&v.ma60)?(v.price>v.ma20&&v.ma20>v.ma60?12:v.price<v.ma20&&v.ma20<v.ma60?2:7):n(e.parts?.technical,5);
      if(v.ma20&&v.ma60){e.parts.technical=trend;e.parts.life=v.price>v.ma20?8:3;e.parts.macro=v.price>v.ma60?7:3;}
      if(v.return20dPct!=null)e.parts.technical=clamp(7+v.return20dPct*.6,0,15);
      e.score=Math.round((Object.values(e.parts||{}).reduce((s,x)=>s+n(x),0)-n(e.riskPenalty))*10)/10;
      if(v.ma60&&v.price<v.ma60){e.life='L5/MA60下方';e.status='风险观察';e.riskPenalty=Math.max(n(e.riskPenalty),5);} else if(v.ma20&&v.price>v.ma20&&v.return20dPct>0){e.life='L2趋势修复待确认';e.status='等待评分/广度确认';}
    });
    if (Object.values(r.assets||{}).some(v=>v&&v.price!=null)) computeNasdaqFromInputs();
    await persist({quiet:true}); renderPage(currentPage);
    const success=(Object.values(r.assets||{}).filter(v=>v.price!=null).length)+(r.etfs||[]).filter(v=>v.price!=null).length;
    toast(r.status==='SUCCESS'?`行情全量更新成功：${success}/26 项，已通过基础校验。`:r.status==='PARTIAL'?`行情部分更新：${success}/26 项；失败项保留旧值并已标记。`: `行情更新失败：保留旧快照，请查看失败明细。`,r.status!=='SUCCESS');
  } catch(err){state.meta.marketErrors=[err.message];state.meta.marketRefreshNotice=err.message;state.meta.marketRefreshOk=false;try{await persist({quiet:true});renderPage(currentPage);}catch{}toast(`刷新失败：${err.message}。保留旧数据。`,true);}
  finally{progressPoll=false;try{await pollPromise;}catch{}updateProgress({percent:100,message:'行情拉取请求已结束'});setTimeout(()=>progressBox?.classList.remove('visible'),1800);marketBusy=false;$$('[data-action="refresh-market"]').forEach(b=>{b.disabled=false;b.classList.remove('loading');});setHeader(currentPage);}
}

/* ===== Fitness v2：四区工作台 + 弹层记录 =====================================
   设计说明：
   - 原来 9 个区块平铺在一页（训练台/仪表盘/周计划/恢复/热力图/PR/疲劳/周计划构建/3D/快速记录），
     默认视图里塞了 3 个表单。现在拆成 4 个互斥工作区，默认只给“今天要做什么”。
   - 所有“填东西”的动作都收进弹层：#trainingSessionForm 与 #bodyMeasureForm 从页面移出，
     只存在于弹层中（id 保持唯一，app.js 原处理函数无需改动）。
   - 复用了原有子模块（renderRoutineBuilder / renderTrainingCycleFatigue /
     progressionDecisionPanel / renderTrainingStudio），只改容器与可达性。
   ========================================================================== */

function fitStepField(name,label,value,delta){
  const step=delta||1;
  return `<div class="fit-stepper"><span>${label}</span><div class="fit-step">
    <button type="button" data-step="-1" data-delta="${step}" aria-label="减少${label}">−</button>
    <input name="${name}" type="number" min="0" step="${step}" value="${value}" inputmode="decimal">
    <button type="button" data-step="1" data-delta="${step}" aria-label="增加${label}">＋</button>
  </div></div>`;
}

function fitnessLogForm(prefill){
  const p = prefill || {};
  const zones=BODY_ZONES.filter(z=>z.id!=='head').map(z=>z.name);
  const zone = p.zone && zones.includes(p.zone) ? p.zone : zones[0];
  let chips=[];
  try{ chips=(guidedRoutineForToday()||[]).map(e=>e.name); }catch(_){ chips=[]; }
  return `<form id="trainingSessionForm" class="fit-form" autocomplete="off">
    <div class="fit-field fit-wide"><span>动作</span>
      <input type="hidden" name="exerciseId" value="${esc(p.exerciseId||'')}">
      <input name="exercise" required placeholder="输入动作名，或点下方常用动作" value="${esc(p.exercise||'')}">
      ${chips.length?`<div class="fit-chips">${chips.map(nm=>`<button type="button" class="fit-chip" data-fill-exercise="${esc(nm)}">${esc(nm)}</button>`).join('')}</div>`:''}
    </div>
    <div class="fit-steppers">
      ${fitStepField('sets','组数',p.sets!=null?p.sets:3,1)}
      ${fitStepField('reps','每组次数',p.reps!=null?p.reps:10,1)}
      ${fitStepField('weight','重量 kg',p.weight!=null?p.weight:20,2.5)}
    </div>
    <div class="fit-grid-2">
      <label class="fit-field"><span>部位</span><select name="zone">${zones.map(z=>`<option ${z===zone?'selected':''}>${esc(z)}</option>`).join('')}</select></label>
      <label class="fit-field"><span>日期</span><input name="date" type="date" value="${todayKey()}"></label>
    </div>
    <details class="fit-more fit-wide">
      <summary>补充：有氧 / 时长 / 备注</summary>
      <div class="fit-grid-2">
        <label class="fit-field"><span>有氧 km</span><input name="km" type="number" step="0.1" min="0" value="0"></label>
        <label class="fit-field"><span>时长 min</span><input name="duration" type="number" min="0" value="30"></label>
        <label class="fit-field fit-wide"><span>备注</span><input name="note" placeholder="RPE、疼痛/不适、动作质量、下次调整"></label>
      </div>
    </details>
    <div class="fit-form-foot"><button type="button" class="btn btn-primary" data-sheet-exec="add-training-session">保存训练记录</button></div>
  </form>`;
}

function fitnessMeasureForm(){
  return `<form id="bodyMeasureForm" class="fit-form" autocomplete="off">
    <label class="fit-field fit-wide"><span>测量日期</span><input type="date" name="date" value="${todayKey()}"></label>
    <label class="fit-field"><span>胸围 cm</span><input type="number" step="0.1" name="chest"></label>
    <label class="fit-field"><span>腰围 cm</span><input type="number" step="0.1" name="waist"></label>
    <label class="fit-field"><span>臀围 cm</span><input type="number" step="0.1" name="hip"></label>
    <label class="fit-field"><span>上臂 cm</span><input type="number" step="0.1" name="arm"></label>
    <label class="fit-field"><span>大腿 cm</span><input type="number" step="0.1" name="thigh"></label>
    <label class="fit-field"><span>体重 kg</span><input type="number" step="0.1" name="weight"></label>
    <div class="fit-form-foot"><button type="button" class="btn btn-primary" data-sheet-exec="add-body-measurement">保存测量</button></div>
  </form>`;
}

function openFitnessSheet(kind, prefill){
  const cfg = kind === 'measure'
    ? { title:'记录身体围度', sub:'至少填写一项围度或体重；数据只保存在本地。', body:fitnessMeasureForm() }
    : { title:'记录训练', sub:'点选动作、调好组次重量即可保存；有氧与备注在「补充」里。', body:fitnessLogForm(prefill||{}) };
  if (!window.UISheet) { toast('弹层组件未加载', true); return; }
  window.UISheet.open(cfg);
}

/* ===== openGym 动作库原生接入 ===============================================
   数据来自本机 openGym/catalogue（由 FastAPI 直接读取，无需启动 openGym 服务）：
   - 动作检索 / 详情 / 中文步骤 / 本地动作动画
   - 一键加入周计划
   - 按目标、周训练天数、可用器械生成整周计划
   所有训练记录仍然写入 state.trainingSessions，与热力图、PR、疲劳分析共用数据。
   ========================================================================== */

const GYM_GOALS = [
  {value:'hypertrophy', label:'增肌 · 8–12 次'},
  {value:'strength', label:'力量 · 3–5 次'},
  {value:'fatloss', label:'减脂 · 12–20 次'},
  {value:'general', label:'体能 · 10–15 次'},
  {value:'mobility', label:'灵活性 · 30–45 秒'}
];
const GYM_EQUIPMENT_CHOICES = [
  ['body weight','自重'],['dumbbell','哑铃'],['barbell','杠铃'],['cable','绳索 / 龙门架'],
  ['kettlebell','壶铃'],['band','弹力带'],['resistance band','阻力带'],
  ['leverage machine','杠杆器械'],['smith machine','史密斯机'],['suspension trainer','悬挂训练带']
];
const GYM = { status:null, facets:null, items:[], total:0, loading:false, loadedOnce:false, forceRefresh:false, pending:false, detail:new Map(), searchTimer:null, pickerTimer:null };

function gymUI(){
  ui.gym = ui.gym || {q:'',bodyPart:'',equipment:'',category:'',favorites:false,limit:48,offset:0};
  return ui.gym;
}
function gymFavSet(){ return new Set((state.gym&&state.gym.favorites)||[]); }
function gymMediaUrl(id, kind){ return id ? `/api/gym/media/${encodeURIComponent(String(id))}/${kind||'still'}` : ''; }
function gymExerciseDemo(ex){
  const id = ex && (ex.exerciseId || (ex.id && GYM.detail.has(String(ex.id)) ? ex.id : ''));
  if (id) return {type:'video', src:gymMediaUrl(id,'clip'), poster:gymMediaUrl(id,'still')};
  const gif = exerciseGifUrl(ex && ex.name || '');
  return gif ? {type:'img', src:gif} : null;
}
function gymVideo(demo, name){
  if(!demo) return `<div class="guided-demo-empty">当前动作暂无本地动画<small>按动作标准完成，或到「动作库」查看文字步骤</small></div>`;
  if(demo.type==='video') return `<video class="gym-video" src="${demo.src}" poster="${demo.poster||''}" autoplay muted loop playsinline controls preload="metadata" aria-label="${esc(name)} 动作动画"></video>`;
  return `<img src="${demo.src}" alt="${esc(name)} 动作示例">`;
}
function gymSourceLine(message){
  const el=$('#gymSource'); if(!el) return;
  if(message){ el.classList.add('is-error'); el.innerHTML=esc(message); return; }
  const s=GYM.status;
  el.classList.remove('is-error');
  if(!s) { el.textContent='正在读取本地 openGym 动作库…'; return; }
  if(!s.available){
    el.innerHTML=`<b>动作库未连接</b> · ${esc(s.reason||'未找到 openGym 目录')} <button class="btn btn-small btn-outline" data-action="gym-retry">重试</button>`;
    return;
  }
  el.innerHTML=`<b>openGym 本地动作库</b> · ${s.total} 个动作 · 中文 ${s.translated} · 动画 ${s.media.clip} · 静图 ${s.media.still} <span class="gym-source-note">无需启动 openGym，由当前服务直接读取</span>`;
}
function gymChips(items, active, action, dataKey){
  return items.map(x=>`<button class="gym-chip ${String(active)===String(x.value)?'is-on':''}" data-action="${action}" data-${dataKey}="${esc(x.value)}">${esc(x.label)}<small>${x.count!=null?x.count:''}</small></button>`).join('');
}
function renderGymFilters(){
  const row=$('#gymFilterRow'); if(!row) return;
  const u=gymUI(), f=GYM.facets||{bodyParts:[],equipment:[],categories:[]};
  const parts=[{value:'',label:'全部部位',count:f.total||''},...(f.bodyParts||[])];
  const equip=[{value:'',label:'全部器械'}].concat((f.equipment||[]).map(x=>({value:x.value,label:x.label})));
  const cats=[{value:'',label:'全部分类'}].concat((f.categories||[]).map(x=>({value:x.value,label:x.label})));
  row.innerHTML=`<div class="gym-chips">${gymChips(parts,u.bodyPart,'gym-zone','zone')}</div>
    <div class="gym-selects">
      <select id="gymEquipmentSelect" aria-label="按器械筛选">${equip.map(x=>`<option value="${esc(x.value)}" ${u.equipment===x.value?'selected':''}>${esc(x.label)}</option>`).join('')}</select>
      <select id="gymCategorySelect" aria-label="按分类筛选">${cats.map(x=>`<option value="${esc(x.value)}" ${u.category===x.value?'selected':''}>${esc(x.label)}</option>`).join('')}</select>
      <button class="gym-chip gym-fav-toggle ${u.favorites?'is-on':''}" data-action="gym-fav-filter">★ 仅收藏</button>
    </div>`;
}
function renderGymChrome(){
  const count=$('#gymCount'), more=$('#gymMore');
  if(count) count.textContent=GYM.loading?'读取中…':`共 ${GYM.total} 个动作 · 已显示 ${GYM.items.length}`;
  if(more) more.classList.toggle('hidden', GYM.loading || GYM.items.length>=GYM.total || !GYM.items.length);
}
function renderGymGrid(){
  const grid=$('#gymGrid'); if(!grid) return;
  const fav=gymFavSet(), u=gymUI();
  if(GYM.error){grid.innerHTML=`<div class="gym-empty">${esc(GYM.error)}<button class="btn btn-outline" data-action="gym-retry">重新连接</button></div>`;return;}
  if(GYM.status && !GYM.status.available){
    grid.innerHTML=`<div class="gym-empty"><b>动作库目录未连接</b><span>${esc(GYM.status.reason||'未找到 openGym 目录')}</span><span>把 OPEN_GYM_DIR 指向 openGym 根目录后点“重试”。</span><button class="btn btn-small btn-outline" data-action="gym-retry">重试</button></div>`;
    renderGymChrome();
    return;
  }
  if(!GYM.items.length){
    grid.innerHTML=`<div class="gym-empty">${u.favorites?'收藏夹还是空的。点动作卡片右上角的 ★ 收藏常用动作。':'没有匹配动作。换个关键词，或清空部位/器械筛选。'}</div>`;
    renderGymChrome();
    return;
  }
  grid.innerHTML=GYM.items.map(e=>`<article class="gym-card">
    <button class="gym-card-media" data-action="gym-detail" data-id="${esc(e.id)}" aria-label="查看 ${esc(e.name)} 详情">
      ${e.hasStill?`<img src="${gymMediaUrl(e.id,'still')}" alt="${esc(e.name)}" loading="lazy" decoding="async">`:`<span class="gym-card-noimg">◉</span>`}
      <span class="gym-card-play">▶</span>
    </button>
    <div class="gym-card-body">
      <div class="gym-card-head"><strong>${esc(e.name)}</strong><button class="gym-fav ${fav.has(e.id)?'is-on':''}" data-action="gym-fav" data-id="${esc(e.id)}" aria-label="收藏 ${esc(e.name)}">★</button></div>
      <small>${esc(e.targetZh)} · ${esc(e.equipmentZh)}</small>
      <div class="gym-card-tags"><span>${esc(e.bodyPartZh)}</span><span>${esc(e.categoryZh)}</span></div>
    </div>
    <div class="gym-card-actions"><button data-action="gym-detail" data-id="${esc(e.id)}">详情</button><button data-action="gym-add-plan" data-id="${esc(e.id)}">加入计划</button></div>
  </article>`).join('');
  renderGymChrome();
}
function renderGymLibraryPanel(){
  return `<div class="fit-lead"><span class="eyebrow">OPEN GYM · EXERCISE LIBRARY</span><h2>动作库 · 直接在本服务里用</h2><p>从本机 openGym 目录读取动作、中文步骤和动画，不需要单独启动 openGym。选中动作后可加入周计划，训练时按组记录，数据进入热力图、PR 与恢复分析。</p></div>
  <section class="card gym-library-card">
    <div class="gym-toolbar">
      <label class="gym-search"><span>⌕</span><input id="gymSearch" type="search" value="${esc(gymUI().q||'')}" placeholder="搜索动作、肌群或器械，例如：深蹲 / 卧推 / 臀" autocomplete="off"></label>
      <div class="gym-toolbar-side"><span id="gymCount" class="gym-count">正在读取…</span><button class="btn btn-small btn-primary" data-action="gym-generate-plan">✦ 生成周计划</button></div>
    </div>
    <div class="gym-filter-row" id="gymFilterRow"></div>
    <div class="gym-source" id="gymSource">正在读取本地 openGym 动作库…</div>
    <div class="gym-grid" id="gymGrid"><div class="gym-empty">正在加载动作…</div></div>
    <div class="gym-more"><button class="btn btn-outline hidden" id="gymMore" data-action="gym-load-more">加载更多</button></div>
  </section>`;
}
async function loadGym(reset=true){
  if(GYM.loading){ GYM.pending=true; return; }
  GYM.pending=false;GYM.error='';
  const u=gymUI();
  if(reset){ u.offset=0; GYM.items=[]; }
  GYM.loading=true;
  const grid=$('#gymGrid');
  if(grid && reset) grid.innerHTML='<div class="gym-empty">正在读取动作库…</div>';
  renderGymChrome();
  try{
    if(!GYM.status || GYM.forceRefresh){
      GYM.status=await gymRequest('/api/gym/status'+(GYM.forceRefresh?'?refresh=1':''));
      GYM.forceRefresh=false;
      gymSourceLine();
      if(!GYM.status.available){ GYM.items=[]; GYM.total=0; renderGymGrid(); return; }
    }
    if(!GYM.status.available){ GYM.items=[]; GYM.total=0; renderGymGrid(); return; }
    if(!GYM.facets){ GYM.facets=await gymRequest('/api/gym/facets'); renderGymFilters(); }
    const p=new URLSearchParams();
    if(u.q) p.set('q',u.q);
    if(u.zone) p.set('zone',u.zone);
    if(u.bodyPart) p.set('bodyPart',u.bodyPart);
    if(u.equipment) p.set('equipment',u.equipment);
    if(u.category) p.set('category',u.category);
    if(u.favorites){
      const favorites=(state.gym&&state.gym.favorites)||[];
      if(!favorites.length){ GYM.items=[]; GYM.total=0; renderGymGrid(); return; }
      p.set('ids',favorites.join(','));
    }
    p.set('limit',u.limit); p.set('offset',u.offset);
    const res=await gymRequest('/api/gym/exercises?'+p.toString());
    GYM.items = reset ? (res.items||[]) : GYM.items.concat(res.items||[]);
    GYM.total = n(res.total,GYM.items.length);
    u.offset = GYM.items.length;
    renderGymGrid();
  }catch(err){
    GYM.error=err.message;
    gymSourceLine('动作库读取失败：'+err.message);
    if($('#gymGrid')) $('#gymGrid').innerHTML=`<div class="gym-empty">动作库读取失败：${esc(err.message)}<button class="btn btn-small btn-outline" data-action="gym-retry">重试</button></div>`;
  }finally{
    GYM.loading=false;
    GYM.loadedOnce=!GYM.error;
    renderGymChrome();
    if(GYM.pending){ GYM.pending=false; loadGym(true); }
  }
}
function hydrateGymLibrary(force=false){
  const grid=$('#gymGrid'); if(!grid) return;
  renderGymFilters();
  gymSourceLine();
  if(GYM.items.length && !force){ renderGymGrid(); return; }
  if(GYM.loadedOnce && !force && !GYM.loading){ renderGymGrid(); return; }
  loadGym(true);
}
async function openGymDetail(id){
  try{
    let d=GYM.detail.get(String(id));
    if(!d){ d=await gymRequest('/api/gym/exercises/'+encodeURIComponent(id)); GYM.detail.set(String(id),d); }
    const fav=gymFavSet().has(d.id);
    let wrap=$('#gymModal');
    if(!wrap){ wrap=document.createElement('div'); wrap.id='gymModal'; document.body.appendChild(wrap); }
    wrap.innerHTML=`<div class="gym-modal-backdrop" data-action="gym-close-modal"></div>
      <section class="gym-modal" role="dialog" aria-modal="true" aria-labelledby="gymModalTitle">
        <header class="gym-modal-head"><div><div class="eyebrow">OPEN GYM · EXERCISE ${esc(d.id)}</div><h2 id="gymModalTitle">${esc(d.name)} <button class="gym-fav ${fav?'is-on':''}" data-action="gym-fav" data-id="${esc(d.id)}" aria-label="收藏">★</button></h2><p>${esc(d.nameEn)}</p></div><button class="gym-modal-x" data-action="gym-close-modal" aria-label="关闭">×</button></header>
        <div class="gym-modal-body">
          <div class="gym-modal-media">${gymVideo({type:'video',src:gymMediaUrl(d.id,'clip'),poster:gymMediaUrl(d.id,'still')},d.name)}</div>
          <div class="gym-modal-info">
            <div class="gym-tags"><span>${esc(d.bodyPartZh)}</span><span>${esc(d.targetZh)}</span><span>${esc(d.equipmentZh)}</span><span>${esc(d.categoryZh)}</span></div>
            <p class="gym-desc">${esc(d.description||'暂无文字说明。')}${d.descriptionTranslated?'':' <span class="gym-lang-tag">英文原文</span>'}</p>
            <h4>动作步骤 <small>${d.instructions.length} 步 · ${d.instructionsTranslated?'中文':'英文原文'}</small></h4>
            <ol class="gym-steps">${(d.instructions||[]).map(x=>`<li>${esc(x)}</li>`).join('')||'<li>该动作暂无中文步骤。</li>'}</ol>
            <h4>协同肌群</h4>
            <div class="gym-tags">${(d.secondaryMusclesZh||[]).map(x=>`<span class="muted">${esc(x)}</span>`).join('')||'<span class="muted">无记录</span>'}</div>
            <div class="gym-modal-actions"><button class="btn btn-primary" data-action="gym-add-plan" data-id="${esc(d.id)}">＋ 加入周计划</button><button class="btn btn-outline" data-action="gym-log" data-id="${esc(d.id)}">记录这次训练</button></div>
            <p class="gym-license">动作媒体来自本机 openGym catalogue，仅在本地按需读取，不复制、不再分发。</p>
          </div>
        </div>
      </section>`;
  }catch(err){ toast('动作详情读取失败：'+err.message,true); }
}
function closeGymModal(){ $('#gymModal')?.remove(); }
function toggleGymFavorite(id){
  if(!state.gym) state.gym={favorites:[]};
  state.gym.favorites=Array.isArray(state.gym.favorites)?state.gym.favorites:[];
  const key=String(id);
  const idx=state.gym.favorites.findIndex(x=>String(x)===key);
  if(idx>=0) state.gym.favorites.splice(idx,1); else state.gym.favorites.push(key);
  const on=idx<0;
  $$(`[data-action="gym-fav"][data-id="${CSS.escape(key)}"]`).forEach(b=>b.classList.toggle('is-on',on));
  persist({quiet:true});
  toast(on?'已收藏到动作库':'已取消收藏');
  if(gymUI().favorites) loadGym(true);
}
function addGymExerciseToRoutine(ex, day, opts={}){
  const routines=ensureFitnessRoutines();
  const targetDay=n(day,new Date(todayKey()+'T12:00:00').getDay());
  const routine=routines[targetDay]||(routines[targetDay]={name:'自定义训练',exercises:[]});
  routine.exercises=routine.exercises||[];
  if(routine.exercises.some(x=>String(x.exerciseId)===String(ex.id))) return false;
  routine.exercises.push({id:`gym-${ex.id}-${Date.now()}`,exerciseId:ex.id,zone:ex.zone||'全身',name:ex.name,targetSets:n(opts.sets,3),targetReps:n(opts.reps,10),loadStep:n(opts.loadStep,2.5),restSeconds:n(opts.rest,90)});
  return true;
}
async function openGymAddPlan(id){
  try{
    let d=GYM.detail.get(String(id));
    if(!d){ d=await gymRequest('/api/gym/exercises/'+encodeURIComponent(id)); GYM.detail.set(String(id),d); }
    closeGymModal();
    if(!window.UISheet){ toast('弹层组件未加载',true); return; }
    const dayNames=['周日','周一','周二','周三','周四','周五','周六'];
    const selected=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay);
    window.UISheet.open({
      title:'加入周计划', sub:'选择训练日与目标组次；保存后可在「计划」里继续调整。',
      body:`<form id="gymAddPlanForm" class="fit-form" autocomplete="off">
        <input type="hidden" name="exerciseId" value="${esc(d.id)}">
        <div class="gym-sheet-ex">${d.hasStill?`<img src="${gymMediaUrl(d.id,'still')}" alt="">`:''}<div><strong>${esc(d.name)}</strong><small>${esc(d.targetZh)} · ${esc(d.equipmentZh)} · ${esc(d.bodyPartZh)}</small></div></div>
        <div class="fit-grid-2">
          <label class="fit-field"><span>加入周几</span><select name="day">${[1,2,3,4,5,6,0].map(x=>`<option value="${x}" ${x===selected?'selected':''}>${dayNames[x]}</option>`).join('')}</select></label>
          <label class="fit-field"><span>组间休息（秒）</span><input name="rest" type="number" min="0" max="600" step="5" value="90"></label>
          <label class="fit-field"><span>目标组数</span><input name="sets" type="number" min="1" max="12" value="3"></label>
          <label class="fit-field"><span>目标次数</span><input name="reps" type="number" min="1" max="100" value="10"></label>
        </div>
        <div class="fit-form-foot"><button type="button" class="btn btn-primary" data-action="gym-add-plan-submit">加入周计划</button></div>
      </form>`
    });
  }catch(err){ toast('动作读取失败：'+err.message,true); }
}
function submitGymAddPlan(){
  const form=$('#gymAddPlanForm'); if(!form) return;
  const fd=new FormData(form);
  const id=String(fd.get('exerciseId')||'');
  const d=GYM.detail.get(id); if(!d){ toast('动作信息已失效，请重新打开',true); return; }
  const ok=addGymExerciseToRoutine(d, n(fd.get('day'),new Date(todayKey()+'T12:00:00').getDay()), {sets:n(fd.get('sets'),3),reps:n(fd.get('reps'),10),rest:n(fd.get('rest'),90)});
  closeGymModal();
  window.UISheet?.close();
  if(!ok){ toast('这个动作已经在当天计划里'); return; }
  try{sessionStorage.setItem('wealthos-fit-tab','plan')}catch(_){}
  saveAndRender('已加入周计划，可在「计划」里调整组次');
}
async function openGymLog(id){
  try{
    let d=GYM.detail.get(String(id));
    if(!d){ d=await gymRequest('/api/gym/exercises/'+encodeURIComponent(id)); GYM.detail.set(String(id),d); }
    closeGymModal();
    openFitnessSheet('log',{exercise:d.name,zone:d.zone,exerciseId:d.id,sets:3,reps:10});
  }catch(err){ toast('动作读取失败：'+err.message,true); }
}
async function searchGymPicker(q){
  const box=$('#gymPickerResults'); if(!box) return;
  if(!q){ box.innerHTML='<div class="gym-empty">输入关键词检索动作库，例如：深蹲 / 划船 / 臀</div>'; return; }
  box.innerHTML='<div class="gym-empty">检索中…</div>';
  try{
    const res=await gymRequest('/api/gym/exercises?q='+encodeURIComponent(q)+'&limit=12');
    if(!res.items.length){ box.innerHTML='<div class="gym-empty">没有匹配动作。</div>'; return; }
    box.innerHTML=res.items.map(e=>`<article class="gym-picker-row">
      ${e.hasStill?`<img src="${gymMediaUrl(e.id,'still')}" alt="" loading="lazy">`:'<span class="gym-picker-noimg">◉</span>'}
      <div><strong>${esc(e.name)}</strong><small>${esc(e.targetZh)} · ${esc(e.equipmentZh)} · ${esc(e.bodyPartZh)}</small></div>
      <button class="btn btn-small btn-primary" data-action="gym-picker-add" data-id="${esc(e.id)}" data-name="${esc(e.name)}" data-zone="${esc(e.zone)}">＋ 加入</button>
    </article>`).join('');
  }catch(err){ box.innerHTML=`<div class="gym-empty">检索失败：${esc(err.message)}</div>`; }
}
function openGymPicker(){
  if(!window.UISheet){ toast('弹层组件未加载',true); return; }
  const dayNames=['周日','周一','周二','周三','周四','周五','周六'];
  const selected=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay);
  window.UISheet.open({
    title:'从动作库添加动作', sub:'按名称、肌群或器械搜索；加入后继续搜索可一次添加多个。',
    body:`<form id="gymPickerForm" class="fit-form" autocomplete="off">
      <div class="fit-grid-2">
        <label class="fit-field"><span>加入周几</span><select id="gymPickerDay">${[1,2,3,4,5,6,0].map(x=>`<option value="${x}" ${x===selected?'selected':''}>${dayNames[x]}</option>`).join('')}</select></label>
        <label class="fit-field"><span>搜索动作库</span><input id="gymPickerSearch" type="search" placeholder="例如：深蹲 / 卧推 / 臀" autocomplete="off"></label>
      </div>
      <div id="gymPickerResults" class="gym-picker-results"><div class="gym-empty">输入关键词检索动作库</div></div>
    </form>`
  });
  setTimeout(()=>$('#gymPickerSearch')?.focus(),60);
}
function addPickedGymExercise(btn){
  const day=n($('#gymPickerDay')?.value,new Date(todayKey()+'T12:00:00').getDay());
  const ok=addGymExerciseToRoutine({id:String(btn.dataset.id||''),name:String(btn.dataset.name||''),zone:String(btn.dataset.zone||'全身')},day,{sets:3,reps:10,rest:90});
  if(!ok){ toast('这个动作已经在当天计划里'); return; }
  btn.textContent='✓ 已加入'; btn.disabled=true; btn.classList.remove('btn-primary'); btn.classList.add('btn-outline');
  try{sessionStorage.setItem('wealthos-fit-tab','plan')}catch(_){}
  persist({quiet:true}).then(()=>renderPage('fitness'));
  toast('已加入周计划，可继续搜索并添加');
}
function openGymPlanSheet(){
  if(!window.UISheet){ toast('弹层组件未加载',true); return; }
  const equipment=GYM_EQUIPMENT_CHOICES;
  window.UISheet.open({
    title:'生成周训练计划', sub:'按目标、每周天数与可用器械从 openGym 动作库自动编排；会覆盖当前周计划。',
    body:`<form id="gymPlanForm" class="fit-form" autocomplete="off">
      <label class="fit-field fit-wide"><span>训练目标</span><select name="goal">${GYM_GOALS.map(g=>`<option value="${g.value}">${g.label}</option>`).join('')}</select></label>
      <div class="fit-grid-2">
        <label class="fit-field"><span>每周训练天数</span><select name="days">${[1,2,3,4,5,6,7].map(x=>`<option value="${x}" ${x===3?'selected':''}>${x} 天</option>`).join('')}</select></label>
        <label class="fit-field"><span>单次时长（分钟）</span><input name="minutes" type="number" min="20" max="150" step="5" value="60"></label>
      </div>
      <div class="fit-field fit-wide"><span>可用器械 <small>不选 = 全部器械</small></span><div class="gym-equip-grid">${equipment.map(([v,l],i)=>`<label class="gym-equip-check"><input type="checkbox" name="equipment" value="${esc(v)}" ${i<2?'checked':''}> ${esc(l)}</label>`).join('')}</div></div>
      <p class="gym-sheet-note">生成后会覆盖当前周计划；已有训练记录、热力图和 PR 不受影响。</p>
      <div class="fit-form-foot"><button class="btn btn-primary" type="button" data-action="gym-generate-plan-submit">生成并覆盖周计划</button></div>
    </form>`
  });
}
function applyGymPlan(plan){
  const routines={};
  [1,2,3,4,5,6,0].forEach(d=>{routines[d]={name:'恢复 / 休息',exercises:[]};});
  Object.entries(plan||{}).forEach(([day,data])=>{
    const wd=n(day);
    routines[wd]={name:data.name||`周${wd} 训练`,exercises:(data.exercises||[]).map((e,i)=>({
      id:`gym-${e.exerciseId}-${Date.now()}-${i}`,exerciseId:e.exerciseId,zone:e.zone,
      name:e.name,targetSets:n(e.targetSets,3),targetReps:n(e.targetReps,10),
      loadStep:n(e.loadStep,2.5),restSeconds:n(e.restSeconds,90)
    }))};
  });
  state.fitnessRoutines=routines;
  state.gym=state.gym||{favorites:[]};
  state.gym.lastPlanAt=new Date().toISOString();
}
async function submitGymPlan(){
  const form=$('#gymPlanForm'); if(!form) return;
  const fd=new FormData(form);
  const equipment=[...form.querySelectorAll('input[name="equipment"]:checked')].map(x=>x.value);
  const btn=form.querySelector('[data-action="gym-generate-plan-submit"]');
  if(btn){ btn.disabled=true; btn.textContent='正在生成…'; }
  try{
    const res=await gymRequest('/api/gym/plan/generate',{method:'POST',body:JSON.stringify({goal:String(fd.get('goal')||'hypertrophy'),daysPerWeek:n(fd.get('days'),3),equipment,sessionMinutes:n(fd.get('minutes'),60)})});
    applyGymPlan(res.plan);
    state.gym.planMeta=res.meta||null;
    const firstDay=[1,2,3,4,5,6,0].find(d=>res.plan&&res.plan[d]);
    if(firstDay!=null) ui.routineDay=firstDay;
    window.UISheet?.close();
    try{sessionStorage.setItem('wealthos-fit-tab','plan')}catch(_){}
    saveAndRender(`已生成${res.meta?.goalLabel||''}周计划：${Object.keys(res.plan||{}).length} 个训练日${res.meta?.equipmentRelaxed?'（部分器械不足，已自动放宽）':''}`);
  }catch(err){
    toast('生成计划失败：'+err.message,true);
    if(btn){ btn.disabled=false; btn.textContent='生成并覆盖周计划'; }
  }
}

function renderFitnessV2(){
  const sessions=state.trainingSessions||[], measures=state.bodyMeasurements||[], checks=state.healthChecks||{}, today=todayKey();
  const weekStart=shiftDateKey(today, -((new Date(today+'T12:00:00').getDay()+6)%7));
  const weekDays=[0,1,2,3,4,5,6].map(i=>shiftDateKey(weekStart,i));
  const dayNames=['一','二','三','四','五','六','日'];
  const dayStats=weekDays.map(d=>{const xs=sessions.filter(x=>x.date===d);return {date:d,sets:xs.reduce((a,x)=>a+n(x.sets),0),minutes:xs.reduce((a,x)=>a+n(x.duration),0),count:xs.length}});
  const weekSets=dayStats.reduce((a,x)=>a+x.sets,0), weekMinutes=dayStats.reduce((a,x)=>a+x.minutes,0), weekDaysDone=dayStats.filter(x=>x.count>0).length;
  const last=measures[0]||{};
  const latestByExercise={}; sessions.forEach(x=>{if(!x.exercise)return;const prev=latestByExercise[x.exercise];if(!prev||String(x.date)>String(prev.date)||(String(x.date)===String(prev.date)&&n(x.weight)>n(prev.weight)))latestByExercise[x.exercise]=x;});
  const prs=Object.values(latestByExercise).sort((a,b)=>n(b.weight)-n(a.weight)).slice(0,5);
  const zones=['胸部','上肢','核心','下肢','全身'];
  const zoneRecovery=zones.map(z=>{const xs=sessions.filter(x=>x.zone===z).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const lastDate=xs[0]?.date;const days=lastDate?Math.max(0,Math.floor((new Date(today)-new Date(lastDate))/86400000)):null;let label=days===null?'未训练':days<2?'恢复中':days<4?'可训练':'长期未刺激';return {z,lastDate,days,label,sets:xs.slice(0,7).reduce((a,x)=>a+n(x.sets),0)};});
  const heatDays=dateRangeKeys(84), heat=heatDays.map(d=>sessions.filter(x=>x.date===d).reduce((a,x)=>a+n(x.duration)||a+n(x.sets),0));
  const maxHeat=Math.max(1,...heat);
  const todayStat=dayStats[weekDays.findIndex(x=>x===today)]||{count:0,sets:0};
  const guidedActive=!!(state.activeGuidedWorkout && !state.activeGuidedWorkout.finishedAt);
  const recents=sessions.slice(0,5);

  const routine = (typeof guidedRoutineForToday==='function') ? guidedRoutineForToday() : [];
  const dow = (new Date(today+'T12:00:00')).getDay();
  const routineName = (ensureFitnessRoutines()[dow]||{}).name || '今日训练';
  const todaySessions = sessions.filter(x=>x.date===today);
  const doneByEx = {}; todaySessions.forEach(x=>{ doneByEx[x.exercise] = (doneByEx[x.exercise]||0) + n(x.sets); });
  const plannedSets = routine.reduce((a,e)=>a+n(e.targetSets,0),0);
  const doneSets = routine.reduce((a,e)=>a+Math.min(n(e.targetSets,0), doneByEx[e.name]||0),0);
  const pct = plannedSets ? Math.round(doneSets/plannedSets*100) : 0;
  const dayLabel = ['周日','周一','周二','周三','周四','周五','周六'][dow];

  const exerciseRows = routine.map((e,i)=>{
    const adv = progressionAdvice(e);
    const last = lastExercisePerformance(e);
    const done = Math.min(n(e.targetSets,0), doneByEx[e.name]||0);
    const target = n(e.targetSets,0);
    const dots = Array.from({length:Math.max(target,1)},(_,k)=>`<i class="${k<done?'on':''}"></i>`).join('');
    return `<article class="fit-ex ${done>=target&&target?'is-done':''}">
      <span class="fit-ex-idx">${String(i+1).padStart(2,'0')}</span>
      <div class="fit-ex-main"><strong>${esc(e.name)}</strong><small>${esc(e.zone)} · 目标 ${target} 组 × ${n(e.targetReps,0)} 次${last?` · 上次 ${fmt(last.weight,1)}kg × ${n(last.reps)}（${esc(String(last.date).slice(5))}）`:' · 无历史记录'}</small></div>
      <div class="fit-ex-note">${esc(adv.reason||"")}</div>
      <div class="fit-ex-adv"><b>${adv.weight!=null?fmt(adv.weight,1):'—'}<em> kg</em></b><small>${esc(adv.label||'建议负荷')}</small></div>
      <div class="fit-ex-dots">${dots}<small>${done}/${target}</small></div>
      <button class="btn btn-small ${done>=target&&target?'btn-outline':'btn-primary'}" data-action="fit-quick-log"
        data-exercise="${esc(e.name)}" data-zone="${esc(e.zone)}" data-exercise-id="${esc(e.exerciseId||'')}" data-sets="${target}" data-reps="${n(e.targetReps,0)}" data-weight="${adv.weight!=null?adv.weight:''}">
        ${done>=target&&target?'已完成':'打卡'}
      </button>
    </article>`;
  }).join('');

  const todayPanel=`
    ${guidedActive?renderGuidedWorkout():''}
    <section class="fit-session">
      <div class="fit-session-head">
        <div>
          <div class="eyebrow">TODAY · ${dayLabel} ${today.slice(5)}</div>
          <h2>${esc(routineName)}</h2>
          <p>${routine.length?`${routine.length} 个动作 · 计划 ${plannedSets} 组 · 已完成 ${doneSets} 组`:'今天还没有排动作，去「计划」里编排，或直接打卡记录。'}</p>
        </div>
        <div class="fit-session-side">
          <div class="fit-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
          <div class="fit-session-actions">
            <button class="btn btn-small btn-outline" data-tab="plan">改编计划</button>
            ${routine.length?`<button class="btn btn-small btn-primary" data-action="fitness-focus-today">${guidedActive?'训练台':'开始训练'}</button>`:''}
          </div>
        </div>
      </div>
      ${routine.length?`<div class="fit-ex fit-ex-head"><span></span><span>动作 / 上次</span><span>为什么这么建议</span><span>建议负荷</span><span>进度</span><span></span></div><div class="fit-exec">${exerciseRows}</div>`:'<div class="empty-state">今天没有安排动作。可以直接「打卡」记录一次训练。</div>'}
      <div class="fit-session-foot">
        <div><small>本周训练</small><b>${weekDaysDone}<em> 天</em></b></div>
        <div><small>今日完成</small><b>${doneSets}<em> / ${plannedSets} 组</em></b></div>
        <div><small>最近体重</small><b>${last.weight?fmt(last.weight,1)+" kg":"—"}</b></div>
        <div><small>动作 PR</small><b>${prs.length}<em> 个</em></b></div>
      </div>
    </section>

    <div class="fit-two">
      <section class="card"><div class="card-head"><div><h3>本周节奏</h3><p>点任一天切换计划日；完成状态来自真实训练记录。</p></div><span class="tag good">${weekDaysDone}/7</span></div>
        <div class="fit-week">${weekDays.map((d,i)=>{const st=dayStats[i],isToday=d===today;return `<button class="fit-day ${isToday?'is-today':''} ${st.count?'is-done':''}" data-action="fitness-day-focus" data-date="${d}"><span>周${dayNames[i]}</span><b>${d.slice(8)}</b><i>${st.count?`${st.sets}组`:'—'}</i><small>${isToday?'今天':st.count?'已完成':'未练'}</small></button>`}).join('')}</div>
        <div class="fit-week-sum"><span>训练组<b>${weekSets}</b></span><span>时长<b>${weekMinutes} min</b></span><span>完整度<b>${weekDaysDone?Math.round(weekDaysDone/7*100):0}%</b></span></div>
      </section>
      <section class="card"><div class="card-head"><div><h3>恢复状态</h3><p>按最近一次同部位训练推算，决定今天该练还是该缓。</p></div></div>
        <div class="fit-recovery">${zoneRecovery.map(x=>`<article><span class="fit-dot ${x.days===null?'none':x.days<2?'recover':x.days<4?'ready':'gap'}"></span><strong>${x.z}</strong><small>${x.lastDate?'上次 '+x.lastDate:'暂无记录'}</small><b>${x.label}</b></article>`).join('')}</div>
      </section>
    </div>

    <section class="card"><div class="card-head"><div><h3>最近训练</h3><p>最新 5 条；补录更早的用右上角「＋ 记录训练」。</p></div><button class="btn btn-small btn-outline" data-action="open-fitness-log">＋ 记录训练</button></div>
      <div class="fit-recent">${recents.map(x=>`<article><b>${esc(x.date)}</b><strong>${esc(x.exercise)}</strong><small>${esc(x.zone)} · ${n(x.sets)}组 × ${n(x.reps)}次 · ${n(x.weight)}kg</small></article>`).join('')||'<div class="empty-state">还没有训练记录。点“记录训练”补上第一条。</div>'}</div>
    </section>`;

  const planPanel=`
    <div class="fit-lead"><span class="eyebrow">PLAN · WEEKLY ROUTINE</span><h2>这周每天练什么</h2><p>先编排周计划，训练时再从“今日”进入引导训练。动作可以从内置列表快速添加，也可以直接检索 openGym 动作库，或按目标自动生成整周计划。</p></div>
    ${renderRoutineBuilder()}
  `;

  const libraryPanel=renderGymLibraryPanel();

  const reviewPanel=`
    <div class="fit-lead"><span class="eyebrow">REVIEW · LOAD & RECOVERY</span><h2>练得够不够，恢复得过来吗</h2><p>热力图看频率，PR 看表现，疲劳面板看是否需要减载。</p></div>
    <div class="fit-two">
      <section class="card"><div class="card-head"><div><h3>训练热力图 · 12 周</h3><p>颜色越深代表当天记录越多。</p></div></div>
        <div class="fitness-heatmap fit-heat">${heatDays.map((d,i)=>`<span class="heat-cell h${heat[i]?Math.min(4,Math.ceil(heat[i]/maxHeat*4)):0}" title="${d} · ${heat[i]?heat[i]:'无记录'}"></span>`).join('')}</div>
        <div class="heat-legend"><span>少</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>多</span></div>
      </section>
      <section class="card"><div class="card-head"><div><h3>动作表现 / PR</h3><p>按历史最高工作重量排序，不估算未记录数据。</p></div></div>
        <div class="fitness-pr-list">${prs.map((x,i)=>`<article><span>#${i+1}</span><div><strong>${esc(x.exercise)}</strong><small>${esc(x.date)} · ${n(x.sets)}组 × ${n(x.reps)}次</small></div><b>${fmt(x.weight,1)}<em> kg</em></b></article>`).join('')||'<div class="empty-state">记录训练动作后，这里会出现表现榜。</div>'}</div>
      </section>
    </div>
    ${renderTrainingCycleFatigue()}
    ${progressionDecisionPanel()}
  `;

  const toolsPanel=`
    <div class="fit-lead"><span class="eyebrow">TOOLS · BODY MAP</span><h2>按部位找动作、记录围度</h2><p>3D 人体用于定位部位与查看动作；围度测量收进弹层，不再占页面。</p></div>
    ${renderTrainingStudio()}
  `;

  return `<div class="fit-shell" data-fit-shell>
    <div class="fit-bar">
      <div class="fit-tabs" data-tabs role="tablist">
        <button class="fit-tab active" data-tab="today" role="tab">今日</button>
        <button class="fit-tab" data-tab="plan" role="tab">计划</button>
        <button class="fit-tab" data-tab="library" role="tab">动作中心</button>
        <button class="fit-tab" data-tab="review" role="tab">复盘</button>

      </div>
      <div class="fit-bar-actions">
        <button class="btn btn-small btn-outline" data-action="open-fitness-measure">测围度</button>
        <button class="btn btn-small btn-primary" data-action="open-fitness-log">＋ 记录训练</button>
      </div>
    </div>
    <div class="fit-panel active" data-tab-panel="today">${todayPanel}</div>
    <div class="fit-panel" data-tab-panel="plan">${planPanel}</div>
    <div class="fit-panel" data-tab-panel="library">${toolsPanel}${libraryPanel}</div>
    <div class="fit-panel" data-tab-panel="review">${reviewPanel}</div>

  </div>`;
}


function bindDelegatedEvents() {
  $('#mainNav')?.addEventListener('click',e=>{const b=e.target.closest('.nav-item[data-page]');if(b)renderPage(b.dataset.page==='newconfig'?'dailyflow':b.dataset.page,{autoRefresh:true});});
  const flowBox=$('#flowSubnav'),flowToggle=$('[data-action="toggle-flow-nav"]');try{const open=localStorage.getItem('wealth-os-flow-open')==='1';flowBox?.classList.toggle('hidden',!open);if(flowToggle){flowToggle.setAttribute('aria-expanded',String(open));const k=flowToggle.querySelector('kbd');if(k)k.textContent=open?'−':'＋';}}catch(_){}
  const investingBox=$('#investingSubnav'), investingToggle=$('[data-action="toggle-investing"]'); try{const open=localStorage.getItem('wealth-os-investing-open')==='1';investingBox?.classList.toggle('hidden',!open);if(investingToggle){investingToggle.setAttribute('aria-expanded',String(open));const k=investingToggle.querySelector('kbd');if(k)k.textContent=open?'−':'＋';}}catch(_){}
  document.addEventListener('change',e=>{const el=e.target;if(!el?.dataset?.routineField)return;const d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),r=ensureFitnessRoutines()[d],ex=r.exercises[n(el.dataset.index)];if(!ex)return;ex[el.dataset.routineField]=Math.max(el.dataset.routineField==='loadStep'?.5:1,n(el.value));persist({quiet:true}).then(()=>renderPage('fitness'));});
  let routineDragIndex=null;document.addEventListener('dragstart',e=>{const row=e.target?.closest?.('.routine-exercise');if(row){routineDragIndex=n(row.dataset.routineIndex);row.classList.add('dragging');}});document.addEventListener('dragend',e=>e.target?.closest?.('.routine-exercise')?.classList.remove('dragging'));document.addEventListener('dragover',e=>{if(e.target?.closest?.('.routine-exercise'))e.preventDefault();});document.addEventListener('drop',e=>{const row=e.target?.closest?.('.routine-exercise');if(!row||routineDragIndex==null)return;e.preventDefault();const to=n(row.dataset.routineIndex),d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),r=ensureFitnessRoutines()[d];if(to!==routineDragIndex){const [m]=r.exercises.splice(routineDragIndex,1);r.exercises.splice(to,0,m);persist({quiet:true}).then(()=>renderPage('fitness'));}routineDragIndex=null;});
  document.addEventListener('input',e=>{if(e.target?.id==='bodyExerciseSearch'){ui.bodySearch=e.target.value;const list=$('.exercise-list');if(list){const zone=BODY_ZONES.find(z=>z.id===ui.bodyZone)?.name||'全身';const items=(EXERCISES[zone]||EXERCISES['全身']).filter(x=>x.toLowerCase().includes(ui.bodySearch.toLowerCase()));list.innerHTML=items.map((ex,i)=>`<article class="exercise-item"><div class="exercise-mini-figure">${exerciseGifUrl(ex)?`<img src="${exerciseGifUrl(ex)}" alt="${esc(ex)} 本地动作动画" loading="lazy">`:`<span>${['↗','⇧','↔','⌁'][i%4]}</span>`}</div><div class="exercise-copy"><strong>${esc(ex)}</strong><small>${esc(zone)} · 建议从可控负荷开始</small>${exerciseGifUrl(ex)?'<small class="local-gif-label">本地动作 GIF · 离线可播</small>':'<small>暂无对应本地动画</small>'}</div><button data-action="body-pick-exercise" data-exercise="${esc(ex)}" data-zone="${esc(zone)}">＋</button></article>`).join('')||'<div class="empty-state">没有匹配动作。尝试更短的关键词。</div>';}}});
  document.addEventListener('input',e=>{
    if(e.target?.id==='gymSearch'){clearTimeout(GYM.searchTimer);const value=e.target.value.trim();GYM.searchTimer=setTimeout(()=>{gymUI().q=value;loadGym(true);},280);return;}
    if(e.target?.id==='gymPickerSearch'){clearTimeout(GYM.pickerTimer);const value=e.target.value.trim();GYM.pickerTimer=setTimeout(()=>searchGymPicker(value),220);return;}
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='gymEquipmentSelect'){gymUI().equipment=e.target.value;loadGym(true);return;}
    if(e.target?.id==='gymCategorySelect'){gymUI().category=e.target.value;loadGym(true);return;}
  });
  document.addEventListener('click',async e=>{
    const bodyPart=e.target.closest('[data-body-zone]');
    if(bodyPart && !e.target.closest('[data-action]') && !ui.bodyDragMoved){const id=bodyPart.dataset.bodyZone||'';ui.bodyZone=ui.bodyZone===id?'':id;ui.bodyMuscle=bodyPart.dataset.bodyMuscle||'';if(ui.bodyZone==='head')ui.bodyMode='head';ui.bodyView={x:0,y:0,rx:0,ry:0,scale:1};renderPage(currentPage);return;}
    const action=e.target.closest('[data-action]'); if(!action)return;
    const a=action.dataset.action;
    if(a==='gym-zone'){gymUI().bodyPart=action.dataset.zone||'';renderGymFilters();loadGym(true);return;}
    if(a==='gym-fav-filter'){const u=gymUI();u.favorites=!u.favorites;renderGymFilters();loadGym(true);return;}
    if(a==='gym-fav'){toggleGymFavorite(action.dataset.id);return;}
    if(a==='gym-detail'){openGymDetail(action.dataset.id);return;}
    if(a==='gym-close-modal'){closeGymModal();return;}
    if(a==='gym-add-plan'){openGymAddPlan(action.dataset.id);return;}
    if(a==='gym-log'){openGymLog(action.dataset.id);return;}
    if(a==='gym-retry'){GYM.status=null;GYM.facets=null;GYM.forceRefresh=true;GYM.loadedOnce=false;loadGym(true);return;}
    if(a==='gym-load-more'){gymUI().offset=GYM.items.length;loadGym(false);return;}
    if(a==='gym-open-picker'){openGymPicker();return;}
    if(a==='gym-generate-plan'){openGymPlanSheet();return;}
    if(a==='gym-add-plan-submit'){submitGymAddPlan();return;}
    if(a==='gym-generate-plan-submit'){submitGymPlan();return;}
    if(a==='gym-picker-add'){addPickedGymExercise(action);return;}
    if(a==='flow-kind'){ui.flowKind=action.dataset.kind;renderPage(currentPage==='xindeng'?'xindeng':'dailyflow');return;}
    if(a==='flow-new'){openFlowEditor(action.dataset.kind||flowDateKind());return;}
    if(a==='flow-edit'){openFlowEditor(action.dataset.kind||'weekday',action.dataset.id);return;}
    if(a==='flow-complete'){const run=(state.dailyFlowRuns||[]).find(x=>String(x.flowId)===String(action.dataset.id)&&x.status==='opened');if(run){run.status='completed';run.note=$('#flowRunNote')?.value||'';run.completedAt=new Date().toISOString();}persist({quiet:true});refreshFlowTabCounts();$('#flowModalMount')?.replaceChildren();toast('流程完成记录已保存');return;}
    if(a==='flow-modal-close'){const m=$('#flowModalMount');if(m)m.innerHTML='';return;}
    if(a==='flow-delete'){const k=action.dataset.kind,id=action.dataset.id;state.dailyFlows[k]=(state.dailyFlows[k]||[]).filter(x=>String(x.id)!==String(id));$('#flowModalMount')?.replaceChildren();saveAndRender('流程块已删除');return;}
    if(a==='flow-run'){const k=action.dataset.kind,id=action.dataset.id,item=(state.dailyFlows[k]||[]).find(x=>String(x.id)===String(id));if(!item)return;state.dailyFlowRuns.unshift({id:Date.now(),flowId:item.id,title:item.title,kind:k,category:item.category||'日常',timestamp:new Date().toISOString(),status:'opened'});openFlowRunModal(item,k);persist({quiet:true});refreshFlowTabCounts();return;}
    if(a==='schedule-refresh'){await loadSchedules();renderPage('schedules');return;}
    if(a==='schedule-new'){const m=$('#scheduleEditMount');if(m)m.innerHTML=scheduleEditor();return;}
    if(a==='schedule-edit'){const j=scheduleJobsCache.find(x=>String(x.id)===String(action.dataset.id));const m=$('#scheduleEditMount');if(m)m.innerHTML=scheduleEditor(j||{});m?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    if(a==='schedule-editor-close'){const m=$('#scheduleEditMount');if(m)m.innerHTML='';return;}
    if(a==='personal-vault-sync'){try{const res=await api('/api/personal-vault/sync',{method:'POST'});toast(res.message||'个人数据已同步')}catch(e){toast('同步失败：'+e.message,true)}return;}
    if(a==='schedule-toggle'){const j=scheduleJobsCache.find(x=>String(x.id)===String(action.dataset.id));if(!j)return;j.enabled=!j.enabled;try{await api('/api/scheduler/jobs',{method:'PUT',body:JSON.stringify({jobs:scheduleJobsCache})});await loadSchedules();renderPage('schedules');toast('定时任务状态已更新')}catch(e){toast(e.message,true)}return;}
    if(a==='schedule-run'||a==='schedule-run-all'){try{const res=await api('/api/scheduler/run',{method:'POST',body:JSON.stringify({id:a==='schedule-run'?action.dataset.id:null})});toast(res.message||'任务已执行');await loadSchedules();renderPage('schedules')}catch(e){toast('执行失败：'+e.message,true)}return;}
    if(a==='agents-import-legacy'){try{const old=JSON.parse(localStorage.getItem('wealth-os-agent-statuses')||'{}');for(const agent of AGENT_DEFS){if(['idle','busy','paused'].includes(old[agent.id]))agentStatuses()[agent.id]=old[agent.id];}state.legacyRolesImported=true;await saveAndRender('旧角色状态已保存到当前账户');}catch(err){toast('旧状态导入失败',true);}return;}
    if(a==='agent-cycle') { const id=action.dataset.agent, all=agentStatuses(), seq=['idle','busy','paused'];all[id]=seq[(seq.indexOf(all[id]||'idle')+1)%seq.length];persist({quiet:true});renderPage('agents');return; }
    if(a==='home-search') { document.querySelector('#tasteSearch')?.click(); return; }
    if(a==='home-share') { const done=()=>toast('当前页面链接已复制'); if(navigator.clipboard?.writeText){navigator.clipboard.writeText(location.href).then(done).catch(()=>toast('复制失败，请手动复制地址栏',true));}else{toast('请手动复制地址栏链接');} return; }
    if(a==='home-range') { ui.homeRange=action.dataset.range||'7'; renderPage('home',{transition:false,animate:false}); return; }
    if(a==='agents-stop-busy') { const all=agentStatuses(), busy=AGENT_DEFS.filter(x=>(all[x.id]||'idle')==='busy'); if(!busy.length){toast('当前没有忙碌的角色');return;} busy.forEach(x=>{all[x.id]='paused'}); persist({quiet:true}); renderPage('agents'); toast(`已暂停 ${busy.length} 个忙碌角色`); return; }
    if(a==='agents-reset') { state.agentStatuses={};persist({quiet:true});renderPage('agents');toast('角色状态已重置');return; }
    if(a==='agents-spin'){ui.agentSpinPaused=!ui.agentSpinPaused;const stage=document.querySelector('.agent-balance-stage');stage?.classList.toggle('agent-stage-paused',!!ui.agentSpinPaused);action.textContent=ui.agentSpinPaused?'继续旋转':'暂停旋转';toast(ui.agentSpinPaused?'已暂停旋转，方便查看单个角色':'已继续旋转');return;}
    if(a==='close-interaction-modal'){ $('#interactionModal')?.remove(); return; }
    if(a==='toggle-flow-nav'){const box=$('#flowSubnav'),open=box?.classList.contains('hidden');if(box)box.classList.toggle('hidden',!open);action.setAttribute('aria-expanded',String(!!open));const k=action.querySelector('kbd');if(k)k.textContent=open?'−':'＋';try{localStorage.setItem('wealth-os-flow-open',open?'1':'0')}catch(_){}return;}
    if(a==='toggle-investing') { const box=$('#investingSubnav'), open=box?.classList.contains('hidden'); if(box)box.classList.toggle('hidden',!open); action.setAttribute('aria-expanded',String(!!open)); const k=action.querySelector('kbd');if(k)k.textContent=open?'−':'＋'; try{localStorage.setItem('wealth-os-investing-open',open?'1':'0')}catch(_){} return; }
    if(a==='add-mustread') { const f=$('#mustReadForm'); if(!f?.reportValidity())return; const fd=new FormData(f); state.dailyMustReads.unshift({id:Date.now(),title:String(fd.get('title')||'').trim(),url:String(fd.get('url')||'').trim(),note:String(fd.get('note')||'').trim(),created:todayKey()}); saveAndRender('每日必读已添加');return; }
    if(a==='delete-mustread') { const i=n(action.dataset.index,-1); if(i>=0){state.dailyMustReads.splice(i,1);saveAndRender('已删除必读条目')}return; }
    if(a==='agent-open') { renderPage(action.dataset.page||'home',{autoRefresh:true});return; }
    if(a==='alpha-focus-form'){document.getElementById('alphaSignalFormCard')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>document.querySelector('#alphaSignalForm input[name=title]')?.focus(),80);return;}
    if(a==='alpha-delete'){const i=n(action.dataset.index,-1);if(i>=0&&state.alphaRadarSignals[i]&&confirm('删除这条 Alpha Radar 信号？')){state.alphaRadarSignals.splice(i,1);await persist({quiet:true});renderPage('alpharadar');toast('信号已删除');}return;}
    if(a==='theme-light'||a==='theme-dark') { const theme=a==='theme-light'?'light':'dark';document.documentElement.dataset.theme=theme;document.body.dataset.theme=theme;syncThemeColor();try{localStorage.setItem('wealth-os-theme-v3',theme)}catch(_){};$$('.theme-option').forEach(btn=>{const on=btn.dataset.action===a;btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',on?'true':'false');});toast(theme==='light'?'已切换为浅色主题':'已切换为深色主题');return; }
    if(a==='watch-filter') { ui.homeWatchScope=action.dataset.scope||'all'; renderPage('home',{transition:false,animate:false}); return; }
    if(a==='go-page') return renderPage(action.dataset.page||'home',{autoRefresh:true});
    if(a==='newconfig-anchor') { const target=action.dataset.target||'capability-pyramid'; if(currentPage!=='newconfig') renderPage('newconfig'); setTimeout(()=>document.getElementById(target)?.scrollIntoView({behavior:'smooth',block:'start'}),40); return; }
    if(a==='clear-task-search'){ui.focusQuery='';renderPage(currentPage);return;}
    if(a==='retry-save') { persist(); return; }
    if(a==='undo-delete') { const entry=undoEntries.pop();if(entry){entry.arr.splice(Math.min(entry.index,entry.arr.length),0,entry.item);renderUndoNotice();saveAndRender('已恢复');}return; }
    if(a==='home-start-focus') { startFocusClock();renderPage('today');toast('专注已开始');return; }
    if(a==='focus-add-focus') { renderPage('today'); setTimeout(()=>$('#focusTaskTitle')?.focus(),0); return; }
    if(a==='calendar-prev'){ui.calendarWeekOffset=(ui.calendarWeekOffset||0)-1;renderPage('calendar');return;}
    if(a==='calendar-next'){ui.calendarWeekOffset=(ui.calendarWeekOffset||0)+1;renderPage('calendar');return;}
    if(a==='calendar-this'){ui.calendarWeekOffset=0;renderPage('calendar');return;}
    if(a==='calendar-toggle-create'){ui.showCalendarComposer=!ui.showCalendarComposer;renderPage('calendar');return;}
    if(a==='calendar-pick-date'){ui.calendarSelectedDate=action.dataset.date||todayKey();ui.showCalendarComposer=true;renderPage('calendar');setTimeout(()=>$('#calendarTaskTitle')?.focus(),0);return;}
    if(a==='calendar-add-day'){ui.calendarSelectedDate=action.dataset.date||todayKey();ui.showCalendarComposer=true;renderPage('calendar');setTimeout(()=>$('#calendarTaskTitle')?.focus(),0);return;}
    if(a==='open-workbook'){openWorkbookViewer(action.dataset.workbookId);return;}
    if(a==='close-workbook'){ $('#workbookViewer')?.remove();ui.workbookData=null;return;}
    if(a==='workbook-sheet'){ui.workbookSheetIndex=n(action.dataset.index);renderWorkbookSheet();return;}
    if(a==='toggle-focus-task') { const t=focusTasks().find(x=>String(x.id)===String(action.dataset.id)); if(t){t.done=!t.done;t.completedAt=t.done?new Date().toISOString():null;if(typeof growthSyncGoals==='function')growthSyncGoals(); if(currentPage==='today'||currentPage==='alltasks'||currentPage==='inbox'){const list=$('#focusTaskList');if(list)list.innerHTML=renderFocusTaskRows(currentPage==='today'?'home':currentPage);updateFocusCounts();persist({quiet:true}).then(ok=>{if(ok)toast(t.done?'任务已完成':'任务已恢复');});}else saveAndRender(t.done?'任务已完成':'任务已恢复');} return; }
    if(a==='toggle-focus-important') { const t=focusTasks().find(x=>String(x.id)===String(action.dataset.id)); if(t){t.important=!t.important;saveAndRender(t.important?'已标记为重要':'已取消重要标记');} return; }
    if(a==='delete-focus-task') { const i=focusTasks().findIndex(x=>String(x.id)===String(action.dataset.id)); if(i>=0){deleteWithUndo(state.focusTasks,i,'任务');} return; }
    if(a==='edit-focus-task') { const t=focusTasks().find(x=>String(x.id)===String(action.dataset.id)); if(t)openFocusTaskEditor(t); return; }
    if(a==='close-focus-modal') { $('#focusTaskModal')?.remove(); return; }
    if(a==='toggle-habit') { const key=todayKey();state.habitChecks[key]=state.habitChecks[key]||{};state.habitChecks[key][action.dataset.habit]=!state.habitChecks[key][action.dataset.habit];saveAndRender('今日打卡已保存');return; }
    if(a==='pomodoro-toggle') { if(focusClock.running)pauseFocusClock();else startFocusClock();renderPage(currentPage);return; }
    if(a==='pomodoro-reset') { pauseFocusClock();focusClock.remaining=1500;renderPage(currentPage);return; }
    if(a==='capability-page') { renderPage(action.dataset.page,{autoRefresh:true}); return; }
    if(a==='body-zone') { const id=action.dataset.zone||'';ui.bodyZone=ui.bodyZone===id?'':id;ui.bodyMuscle='';if(ui.bodyZone==='head')ui.bodyMode='head';ui.bodyView={x:0,y:0,rx:0,ry:0,scale:1};renderPage(currentPage);return; }
    if(a==='body-muscle') { const id=action.dataset.muscle||'';ui.bodyMuscle=ui.bodyMuscle===id?'':id;renderPage(currentPage);return; }
    if(a==='routine-select-day'){ui.routineDay=n(action.dataset.day);renderPage('fitness');return;} if(a==='routine-save-name'){const d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),r=ensureFitnessRoutines()[d];r.name=document.querySelector('#routineName')?.value||r.name;saveAndRender('训练计划名称已保存');return;} if(a==='routine-add-exercise'){const d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),r=ensureFitnessRoutines()[d],v=(document.querySelector('#routineAddExercise')?.value||'全身|深蹲').split('|');r.exercises.push({id:`${Date.now()}`,zone:v[0],name:v.slice(1).join('|'),targetSets:Math.max(1,n(document.querySelector('#routineAddSets')?.value,3)),targetReps:Math.max(1,n(document.querySelector('#routineAddReps')?.value,10)),loadStep:2.5});saveAndRender('动作已加入训练计划');return;} if(a==='routine-remove-exercise'){const d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),r=ensureFitnessRoutines()[d];r.exercises.splice(n(action.dataset.index),1);saveAndRender('动作已移除');return;} if(a==='routine-reset-day'){const d=ui.routineDay==null?new Date(todayKey()+'T12:00:00').getDay():n(ui.routineDay),def=defaultFitnessRoutines()[d];state.fitnessRoutines[d]={name:def.name,exercises:def.exercises.map((x,i)=>({id:`${d}-${i}-${Date.now()}`,zone:x[0],name:x[1],targetSets:x[2],targetReps:x[3],loadStep:2.5}))};saveAndRender('已恢复当天默认计划');return;} if(a==='fit-quick-log'){const d=action.dataset;openFitnessSheet('log',{exercise:d.exercise||'',zone:d.zone||'',exerciseId:d.exerciseId||'',sets:n(d.sets,3),reps:n(d.reps,10),weight:d.weight?n(d.weight):undefined});return;}
    if(a==='open-fitness-log'){openFitnessSheet('log');return;}
    if(a==='open-fitness-measure'){openFitnessSheet('measure');return;}
    if(a==='fitness-focus-today'){startGuidedWorkout();return;} if(a==='guided-complete-set'){completeGuidedSet(false);return;} if(a==='guided-skip-set'){completeGuidedSet(true);return;} if(a==='guided-finish'){finishGuidedWorkout();return;} if(a==='guided-rest-skip'){const g=guidedCurrent();if(g){g.w.restUntil=null;persist({quiet:true});renderPage('fitness');}return;} if(a==='guided-rest-adjust'){const g=guidedCurrent();if(g){const left=guidedRestRemaining(g.w);g.w.restUntil=new Date(Date.now()+Math.max(0,left+n(action.dataset.seconds))*1000).toISOString();persist({quiet:true});renderPage('fitness');startGuidedTimer();}return;} if(a==='guided-close-summary'){ui.guidedSummaryId=null;renderPage('fitness');return;} if(a==='fitness-scroll-muscle'){document.querySelector('.training-studio')?.scrollIntoView({behavior:'smooth',block:'start'});return;} if(a==='fitness-day-focus'){const d=action.dataset.date||todayKey();const f=document.querySelector('#trainingSessionForm');if(f){f.elements.date.value=d;f.scrollIntoView({behavior:'smooth',block:'center'});}return;} if(a==='body-mode') { ui.bodyMode=action.dataset.mode||'muscle';if(ui.bodyMode==='head'){ui.bodyZone='head';ui.bodyMuscle='head';}renderPage(currentPage);return; }
    if(a==='body-reset') {ui.bodyZone='';ui.bodyMuscle='';ui.bodyMode='muscle';ui.bodySearch='';ui.bodyView={x:0,y:0,rx:0,ry:0,scale:1};renderPage(currentPage);return;}
    if(a==='body-pick-exercise') {openRecommendedGym(action.dataset.exercise||'');return;}
    if(a==='add-training-session') {const form=$('#trainingSessionForm');if(!form?.reportValidity())return;const fd=new FormData(form);state.trainingSessions=state.trainingSessions||[];state.trainingSessions.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),zone:String(fd.get('zone')||'全身'),exercise:String(fd.get('exercise')||''),exerciseId:String(fd.get('exerciseId')||'')||null,sets:n(fd.get('sets')),reps:n(fd.get('reps')),weight:n(fd.get('weight')),km:n(fd.get('km')),duration:n(fd.get('duration')),note:String(fd.get('note')||''),createdAt:new Date().toISOString()});state.healthChecks[String(fd.get('date')||todayKey())]=state.healthChecks[String(fd.get('date')||todayKey())]||{};state.healthChecks[String(fd.get('date')||todayKey())].workout=true;saveAndRender('训练记录已保存，统计图已更新');return;}
    if(a==='add-body-measurement') {const form=$('#bodyMeasureForm');if(!form)return;const fd=new FormData(form),entry={id:Date.now(),date:String(fd.get('date')||todayKey())};['chest','waist','hip','arm','thigh','weight'].forEach(k=>{const v=String(fd.get(k)||'').trim();if(v)entry[k]=n(v)});if(Object.keys(entry).length<=2){toast('至少填写一项围度或体重',true);return;}state.bodyMeasurements=state.bodyMeasurements||[];state.bodyMeasurements.unshift(entry);saveAndRender('身体测量已保存');return;}
    if(a==='select-checkin-date'){ui.checkinDate=action.dataset.date||todayKey();renderPage('checkin');return;}
    if(a==='add-health-metric'){const form=$('#healthMetricForm');if(!form?.reportValidity())return;const fd=new FormData(form);state.healthMetrics=state.healthMetrics||[];state.healthMetrics.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),metric:String(fd.get('metric')||''),value:n(fd.get('value')),unit:String(fd.get('unit')||''),note:String(fd.get('note')||'')});saveAndRender('身体指标已保存');return;}
    if(a==='delete-health-metric'){state.healthMetrics.splice(n(action.dataset.index),1);saveAndRender('指标记录已删除');return;}
    if(a==='toggle-health-nav'){const box=$('#healthSubnav'),open=box?.classList.contains('hidden');if(box)box.classList.toggle('hidden',!open);action.setAttribute('aria-expanded',String(!!open));const k=action.querySelector('kbd');if(k)k.textContent=open?'−':'＋';try{localStorage.setItem('wealth-os-health-open',open?'1':'0')}catch(_){}return;}
    if(a==='open-english-log-modal'){const f=$('#englishLogForm');if(f)openInlineModal('新增英语学习记录',f);return;}
    if(a==='open-reading-session-modal'){const f=$('#readingSessionForm');if(f)openInlineModal('每日阅读打卡',f);return;}
    if(a==='open-health-log-modal'){const f=$('#healthLogForm');if(!f){renderPage('health');setTimeout(()=>document.querySelector('#healthLogForm')?.scrollIntoView({behavior:'smooth',block:'center'}),60);return;}openInlineModal('新增健康记录',f);return;}
    if(a==='open-health-metric-modal'){const f=$('#healthMetricForm');if(f)openInlineModal('添加身体指标',f);else renderPage('checkin');return;}
    if(a==='toggle-health-check') { const day=action.dataset.date||todayKey(), key=action.dataset.check; state.healthChecks[day]=state.healthChecks[day]||{}; state.healthChecks[day][key]=!state.healthChecks[day][key]; saveAndRender('健康打卡已保存'); return; }
    if(a==='add-health-log') { const form=$('#healthLogForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.healthLogs.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),category:String(fd.get('category')||'健身'),title:String(fd.get('title')||''),detail:String(fd.get('detail')||''),duration:n(fd.get('duration')),value:String(fd.get('value')||''),note:String(fd.get('note')||'')}); saveAndRender('健康记录已保存'); return; }
    if(a==='delete-health-log') { const i=n(action.dataset.index,-1); if(i>=0){state.healthLogs.splice(i,1);saveAndRender('健康记录已删除');} return; }
    if(a==='add-english-log') { const form=$('#englishLogForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.englishLogs.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),skill:String(fd.get('skill')||'综合'),minutes:n(fd.get('minutes')),output:String(fd.get('output')||''),note:String(fd.get('note')||'')}); saveAndRender('英语学习记录已保存'); return; }
    if(a==='delete-english-log') { const i=n(action.dataset.index,-1); if(i>=0){state.englishLogs.splice(i,1);saveAndRender('英语记录已删除');} return; }
    if(a==='add-reading-book') { const form=$('#readingBookForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.readingBooks.unshift({id:Date.now(),title:String(fd.get('title')||''),author:String(fd.get('author')||''),status:String(fd.get('status')||'计划阅读'),priority:String(fd.get('priority')||'普通'),targetDate:String(fd.get('targetDate')||''),totalPages:n(fd.get('totalPages')),currentPage:n(fd.get('currentPage')),goal:String(fd.get('goal')||''),createdAt:todayKey()}); saveAndRender('书籍计划已添加'); return; }
    if(a==='delete-reading-book') { const i=n(action.dataset.index,-1); if(i>=0){state.readingBooks.splice(i,1);saveAndRender('书籍已删除');} return; }
    if(a==='add-reading-session') { const form=$('#readingSessionForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.readingSessions=state.readingSessions||[]; state.readingSessions.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),book:String(fd.get('book')||''),minutes:n(fd.get('minutes')),pages:n(fd.get('pages')),note:String(fd.get('note')||'')}); saveAndRender('阅读打卡已保存'); return; }
    if(a==='delete-reading-session') { const i=n(action.dataset.index,-1); if(i>=0){state.readingSessions.splice(i,1);saveAndRender('阅读打卡已删除');} return; }
    if(a==='add-reading-note') { const form=$('#readingNoteForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.readingNotes.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),book:String(fd.get('book')||''),type:String(fd.get('type')||'感想'),title:String(fd.get('title')||''),content:String(fd.get('content')||'')}); saveAndRender('阅读感想已保存'); return; }
    if(a==='delete-reading-note') { const i=n(action.dataset.index,-1); if(i>=0){state.readingNotes.splice(i,1);saveAndRender('阅读笔记已删除');} return; }
    if(a==='add-notebook-entry') { const form=$('#notebookForm'); if(!form?.reportValidity()) return; const fd=new FormData(form); state.notebookEntries.unshift({id:Date.now(),date:String(fd.get('date')||todayKey()),title:String(fd.get('title')||''),tags:String(fd.get('tags')||''),content:String(fd.get('content')||'')}); saveAndRender('Notebook 已保存'); return; }
    if(a==='delete-notebook-entry') { const i=n(action.dataset.index,-1); if(i>=0){state.notebookEntries.splice(i,1);saveAndRender('Notebook 条目已删除');} return; }
    if(a==='refresh-market') return refreshMarket();
    if(a==='export-json') return exportState();
    if(a==='import-json-open') {$('#importJsonFile')?.click();return;}
    if(a==='logout') {try{await api('/api/logout',{method:'POST',body:JSON.stringify({})});state=null;showAuth();}catch(err){toast(err.message,true);}return;}
    if(a==='toggle-password') {const p=$('#authPassword');p.type=p.type==='password'?'text':'password';return;}
    if(a==='open-sidebar') return openSidebar();
    if(a==='close-sidebar') return closeSidebar();
    if(a==='allocation-mode') {ui.allocationMode=action.dataset.mode||'global';renderPage('allocation');return;}
    if(a==='nasdaq-recalc') {computeNasdaqFromInputs();await persist({quiet:true});renderPage('nasdaq');toast('分数和风险状态已重算（模型参数是规则示例）');return;}
    if(a==='toggle-etf-parts') {ui.expandedETF=ui.expandedETF===state.etfs[n(action.dataset.index)]?.code?null:state.etfs[n(action.dataset.index)]?.code;renderPage('ashare');return;}
    if(a==='add-daily-log') {$('#dailyLogForm')?.requestSubmit();return;}
    if(a==='delete-log') {const i=n(action.dataset.index,-1);if(i>=0&&confirm('删除这条日志？')){state.dailyLog.splice(i,1);saveAndRender('日志已删除');}return;}
    if(a==='add-subscription') {state.subscriptions=state.subscriptions||[];state.subscriptions.push({name:'新订阅',cost:0,hours:0,hourValue:100,revenue:0,decision:'评估中'});saveAndRender('已添加订阅行');return;}
    if(a==='add-asset') {state.assetLedger=state.assetLedger||[];state.assetLedger.push({date:new Date().toISOString().slice(0,10),bucket:'待分类',account:'',jurisdiction:'',currency:'CNY',amount:0,fx:1,note:''});saveAndRender('已添加资产台账行');return;}
    if(a==='delete-asset') {const i=n(action.dataset.index,-1);if(i>=0){state.assetLedger.splice(i,1);saveAndRender('资产记录已删除');}return;}
    if(a==='add-week') {state.weeklyLog=state.weeklyLog||[];state.weeklyLog.push({week:new Date().toISOString().slice(0,10),englishMin:0,training:0,sleep:0,posts:0,invest:0,sideIncome:0,aiCost:0,followersDelta:0,deliverables:0,score:0});saveAndRender('已添加每周记录');return;}
    if(a==='add-content') {state.contentLog=state.contentLog||[];state.contentLog.push({date:new Date().toISOString().slice(0,10),topic:'',format:'文章/视频/代码',url:'',hours:0,cost:0,reach:0,engagement:0,followers:0,leads:0,revenue:0,review:''});saveAndRender('已添加内容作品');return;}
    if(a==='delete-content') {const i=n(action.dataset.index,-1);if(i>=0){state.contentLog.splice(i,1);saveAndRender('内容记录已删除');}return;}
    if(a==='delete-week') {const i=n(action.dataset.index,-1);if(i>=0){state.weeklyLog.splice(i,1);saveAndRender('每周记录已删除');}return;}
    if(a==='delete-subscription') {const i=n(action.dataset.index,-1);if(i>=0){state.subscriptions.splice(i,1);saveAndRender('已删除订阅行');}return;}
    if(a==='delete-prediction') {const i=n(action.dataset.index,-1);if(i>=0&&confirm('删除该预测记录？')){state.predictions.splice(i,1);saveAndRender('预测记录已删除');}return;}
  });
  document.addEventListener('change',async e=>{
    const el=e.target;
    if(el.id==='pyramidVersion'){state.meta.pyramidVersion=el.value;saveAndRender('回撤梯队版本已切换');return;}
    if(el.id==='etfSearch'){ui.etfSearch=el.value;renderPage('ashare');return;}
    if(el.id==='etfGroup'){ui.etfGroup=el.value;renderPage('ashare');return;}
    if(el.id==='screenTestGrade'){ui.screenTestGrade=el.value;renderPage('screener');return;}
    for(const attr of ['data-profile','data-nasdaq','data-nasdaq-bool','data-screen','data-screen-bool']){
      if(el.hasAttribute(attr)){const key=el.getAttribute(attr);let val=el.value;if(el.type==='number'||el.type==='range')val=val===''?null:Number(val);if(attr==='data-profile')state.profile[key]=val; if(attr==='data-nasdaq')state.nasdaq[key]=val;if(attr==='data-nasdaq-bool')state.nasdaq[key]=val==='true';if(attr==='data-screen')state.screenRule[key]=val;if(attr==='data-screen-bool')state.screenRule[key]=val==='true'; if(attr==='data-nasdaq'||attr==='data-nasdaq-bool')computeNasdaqFromInputs();saveAndRender('参数已保存');return;}
    }
    if(el.hasAttribute('data-edit')){const arr=state[el.dataset.edit],row=arr?.[n(el.dataset.index,-1)];if(row){const key=el.dataset.key;row[key]=n(el.value);if(el.dataset.edit==='globalAllocation'){state.globalAllocation.forEach(r=>{r.dynamicTarget=0});}if(el.dataset.edit==='etfs'){const parts=Object.values(row.parts||{}).reduce((s,x)=>s+n(x),0);row.score=Math.round((parts-n(row.riskPenalty))*10)/10;}saveAndRender('持仓/权重已保存');}return;}
    if(el.hasAttribute('data-task-status')){state.tasks[n(el.dataset.taskStatus)].status=el.value;saveAndRender('路线图状态已保存');return;}
    if(el.hasAttribute('data-infra-status')){state.infrastructure[n(el.dataset.infraStatus)].status=el.value;saveAndRender('基础设施状态已保存');return;}
    if(el.hasAttribute('data-infra-next')){state.infrastructure[n(el.dataset.infraNext)].next=el.value;saveAndRender('下一步动作已保存');return;}
    if(el.hasAttribute('data-etf-part')){const i=n(el.dataset.index);state.etfs[i].parts[el.dataset.etfPart]=n(el.value);state.etfs[i].score=Math.round((Object.values(state.etfs[i].parts).reduce((s,x)=>s+n(x),0)-n(state.etfs[i].riskPenalty))*10)/10;saveAndRender('ETF评分维度已保存');return;}
    if(el.hasAttribute('data-etf-risk')){const i=n(el.dataset.etfRisk);state.etfs[i].riskPenalty=n(el.value);state.etfs[i].score=Math.round((Object.values(state.etfs[i].parts).reduce((s,x)=>s+n(x),0)-n(state.etfs[i].riskPenalty))*10)/10;saveAndRender('ETF风险扣分已保存');return;}
    if(el.hasAttribute('data-etf-note')){state.etfs[n(el.dataset.etfNote)].note=el.value;saveAndRender('ETF备注已保存');return;}
    if(el.hasAttribute('data-sub')){const row=state.subscriptions[n(el.dataset.sub)];const key=el.dataset.key;row[key]=['cost','hours','hourValue','revenue'].includes(key)?n(el.value):el.value;saveAndRender('订阅ROI已保存');return;}
    if(el.hasAttribute('data-asset')){const row=state.assetLedger[n(el.dataset.asset)],key=el.dataset.key;if(row){row[key]=['amount','fx'].includes(key)?n(el.value):el.value;saveAndRender('资产台账已保存');}return;}
    if(el.hasAttribute('data-week')){const row=state.weeklyLog[n(el.dataset.week)],key=el.dataset.key;if(row){row[key]=['englishMin','training','sleep','posts','invest','sideIncome','aiCost','followersDelta','deliverables','score'].includes(key)?n(el.value):el.value;saveAndRender('周跟踪已保存');}return;}
    if(el.hasAttribute('data-content')){const row=state.contentLog[n(el.dataset.content)],key=el.dataset.key;if(row){row[key]=['hours','cost','reach','engagement','followers','leads','revenue'].includes(key)?n(el.value):el.value;saveAndRender('内容现金流台账已保存');}return;}
    if(el.hasAttribute('data-reading-book')){const row=state.readingBooks[n(el.dataset.readingBook)],key=el.dataset.key;if(row){row[key]=['totalPages','currentPage'].includes(key)?n(el.value):el.value;if(key==='currentPage'&&n(row.totalPages)>0&&n(row.currentPage)>=n(row.totalPages))row.status='已读完';else if(key==='currentPage'&&n(row.currentPage)>0&&row.status==='计划阅读')row.status='阅读中';saveAndRender('阅读进度已保存');}return;}
    if(el.hasAttribute('data-pred-status')){state.predictions[n(el.dataset.predStatus)].status=el.value;saveAndRender('预测状态已保存');return;}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='focusSearch'){ui.focusQuery=e.target.value;renderFocusTaskListOnly();return;}
    if(e.target.id==='screenTestCount'){ui.screenTestCount=Number(e.target.value);const t=$('#screenTestCountText');if(t)t.textContent=e.target.value;const box=e.target.closest('.card-body');if(box){const sel=$('#screenTestGrade');const r=state.screenRule||{};const grade=sel?.value||'黄色B';const accepted=r.includeHigherGrades?['黄色B','B','B+','A','A+','黄色A','黄色B+'].includes(grade):['黄色B','B'].includes(grade);const pass=accepted&&Number(e.target.value)>=n(r.yellowBMin,2);const decision=box.querySelector('.decision-box');if(decision){decision.querySelector('h3').textContent=pass?'满足初筛条件':'不满足初筛条件';decision.querySelector('p').textContent=`评级 ${grade}；窗口内计数 ${e.target.value}，门槛 ${n(r.yellowBMin,2)} 次。${pass?'进入下一步过滤。':'继续观察或检查信号记录。'}`;decision.querySelector('.decision-footer strong').textContent=pass?'PASS':'NOT PASSED';}}}
  });
  document.addEventListener('submit',async e=>{
    if(e.target.id==='flowEditForm'){e.preventDefault();const f=e.target,fd=new FormData(f),kind=String(fd.get('kind')||f.dataset.kind),oldKind=f.dataset.kind,id=String(f.dataset.id||''),toMin=v=>{const [h,m]=String(v).split(':').map(Number);return h*60+m;};const start=toMin(fd.get('start')),endRaw=toMin(fd.get('end')),end=endRaw<=start?endRaw+1440:endRaw;const obj={id:id||`flow-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title:String(fd.get('title')||'').trim(),start,end,category:String(fd.get('category')||'日常').trim(),note:String(fd.get('note')||'').trim(),color:String(fd.get('color')||'#6e9c79'),order:Date.now()};if(!obj.title){toast('请填写流程事项',true);return;}if(id&&oldKind!==kind)state.dailyFlows[oldKind]=state.dailyFlows[oldKind].filter(x=>String(x.id)!==id);const list=state.dailyFlows[kind]||(state.dailyFlows[kind]=[]),idx=list.findIndex(x=>String(x.id)===id);if(idx>=0)list[idx]=obj;else list.push(obj);ui.flowKind=kind;await persist({quiet:true});$('#flowModalMount')?.replaceChildren();try{sessionStorage.setItem('wealthos-tab-dailyflow','edit')}catch(_){}renderPage(currentPage==='xindeng'?'xindeng':'dailyflow');toast('流程块已保存');return;}
    if(e.target.id==='scheduleJobForm'){
      e.preventDefault();const fd=new FormData(e.target);const job={id:String(fd.get('id')||`job-${Date.now()}`),name:String(fd.get('name')||'').trim(),taskType:String(fd.get('taskType')||'refresh_archive'),frequency:String(fd.get('frequency')||'daily'),time:String(fd.get('time')||'07:30'),description:String(fd.get('description')||''),enabled:fd.has('enabled')};if(!job.name){toast('请输入任务名称',true);return;}const jobs=scheduleJobsCache.filter(x=>x.id!==job.id);jobs.push(job);try{await api('/api/scheduler/jobs',{method:'PUT',body:JSON.stringify({jobs})});await loadSchedules();renderPage('schedules');toast('定时任务已保存')}catch(err){toast(err.message,true)}return;
    }
    if(e.target.id==='archiveSettingsForm'){
      e.preventDefault();const fd=new FormData(e.target);state.schedulerSettings=state.schedulerSettings||{};state.schedulerSettings.archiveDir=String(fd.get('archiveDir')||'').trim();await persist({quiet:true});try{await api('/api/scheduler/settings',{method:'PUT',body:JSON.stringify(state.schedulerSettings)});toast('归档目录已保存')}catch(err){toast('目录已保存到工作区；服务器设置同步失败：'+err.message,true)}return;
    }
    if(e.target.id==='focusTaskEditForm'){
      e.preventDefault();const task=focusTasks().find(x=>String(x.id)===String(e.target.dataset.id));if(!task)return;
      const title=$('#focusEditName').value.trim(),start=$('#focusEditStart')?.value||'',due=$('#focusEditDue').value||'';if(!title){toast('请输入任务内容',true);return;}if(start&&due&&due<start){toast('截止日期不能早于起始日期',true);return;}
      const priorStartDate=task.startDate||task.dueDate||'';task.title=$('#focusEditName').value.trim();task.project=$('#focusEditProject').value;task.startDate=$('#focusEditStart')?.value||'';task.dueDate=$('#focusEditDue').value||'';if(task.startDate&&task.dueDate&&task.dueDate<task.startDate){toast('截止日期不能早于起始日期',true);return;}if(task.startDate&&!task.dueDate)task.dueDate=task.startDate;if(task.dueDate&&!task.startDate)task.startDate=task.dueDate;if(task.startDate&&task.startDate!==priorStartDate)task.sortOrder=dayDiff('2000-01-01',task.startDate)*1000+(((n(task.sortOrder,0)%1000)+1000)%1000);task.priority=$('#focusEditPriority').value;task.estimate=Math.max(0,n($('#focusEditEstimate').value,25));task.important=$('#focusEditImportant').checked;task.note=$('#focusEditNote').value.trim();
      if(await persist({quiet:true})){$('#focusTaskModal')?.remove();renderPage(currentPage);toast('任务详情已保存');}return;
    }
    if(e.target.id==='focusTaskForm'){
      e.preventDefault();const title=$('#focusTaskTitle')?.value.trim();if(!title){toast('先写下任务内容',true);return;}
      const startDate=$('#focusTaskStart')?.value||'',dueDate=$('#focusTaskDue')?.value||'';if(startDate&&dueDate&&dueDate<startDate){toast('截止日期不能早于起始日期',true);return;}
      const list=focusTasks();list.unshift({id:(window.crypto?.randomUUID?.()||`task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`),title,project:$('#focusTaskProject').value,priority:$('#focusTaskPriority').value,startDate:startDate||dueDate,dueDate:dueDate||startDate,sortOrder:dayDiff('2000-01-01',startDate||dueDate||'2099-12-31')*1000+list.filter(t=>(t.startDate||t.dueDate)===(startDate||dueDate)).length,estimate:Math.max(0,n($('#focusTaskEstimate').value,25)),note:$('#focusTaskNote').value.trim(),done:false,important:$('#focusTaskImportant').checked,createdAt:new Date().toISOString()});
      const ok=await persist({quiet:true});ui.focusQuery='';renderPage(currentPage);if(ok)toast('任务已添加并保存');return;
    }
    if(e.target.id==='calendarTaskForm'){
      e.preventDefault();const title=$('#calendarTaskTitle')?.value.trim(),startDate=$('#calendarTaskStart')?.value||'',dueDate=$('#calendarTaskEnd')?.value||'';if(!title){toast('请先填写任务内容',true);return;}if(!startDate||!dueDate){toast('请填写起始和截止日期',true);return;}if(dueDate<startDate){toast('截止日期不能早于起始日期',true);return;}
      const list=focusTasks();list.push({id:(window.crypto?.randomUUID?.()||`task-${Date.now()}-${Math.random().toString(36).slice(2,8)}`),title,project:$('#calendarTaskProject').value,quadrant:$('#calendarTaskQuadrant')?.value||'later',priority:$('#calendarTaskPriority').value,startDate,dueDate,sortOrder:dayDiff('2000-01-01',startDate)*1000+list.filter(t=>(t.startDate||t.dueDate)===startDate).length,estimate:Math.max(0,n($('#calendarTaskEstimate').value,25)),note:$('#calendarTaskNote').value.trim(),done:false,important:$('#calendarTaskImportant').checked,createdAt:new Date().toISOString()});
      await persist({quiet:true});ui.showCalendarComposer=false;ui.calendarSelectedDate=startDate;renderPage('calendar');toast('任务已添加到周历');return;
    }
    if(e.target.id==='alphaSignalForm'){e.preventDefault();const fd=new FormData(e.target);const v=k=>String(fd.get(k)||'').trim();state.alphaRadarSignals.push({id:`alpha-${Date.now()}`,title:v('title'),radar:v('radar'),stage:n(fd.get('stage'),2),fundamental:clamp(fd.get('fundamental')),catalyst:clamp(fd.get('catalyst')),capital:clamp(fd.get('capital')),attention:clamp(fd.get('attention')),crowding:clamp(fd.get('crowding')),priced:clamp(fd.get('priced')),thesis:v('thesis'),anchor:v('anchor'),mapping:v('mapping'),evidence:v('evidence'),updatedAt:new Date().toLocaleString('zh-CN')});await persist({quiet:true});renderPage('alpharadar');toast('Alpha Radar 信号已保存，并同步到个人数据保险库');return;}
    if(e.target.id==='dailyLogForm'){e.preventDefault();state.dailyLog=state.dailyLog||[];state.dailyLog.push({date:$('#logDate').value,kind:$('#logKind').value,action:$('#logAction').value.trim(),reason:$('#logReason').value.trim(),status:$('#logStatus').value});await persist({quiet:true});renderPage('execution');toast('每日记录已保存');}
    if(e.target.id==='predictionForm'){e.preventDefault();state.predictions=state.predictions||[];state.predictions.push({date:$('#predDate').value,theory:$('#predTheory').value.trim(),asset:$('#predAsset').value.trim(),horizon:$('#predHorizon').value.trim(),direction:$('#predDirection').value,target:$('#predTarget').value.trim(),criterion:$('#predCriterion').value.trim(),memo:$('#predMemo').value.trim(),status:'待观察'});await persist({quiet:true});renderPage('cycles');toast('预测已登记；保持原始版本，勿事后修改');}
  });
  document.addEventListener('change',async e=>{if(e.target.id!=='importJsonFile')return;const file=e.target.files?.[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!imported||typeof imported!=='object'||!Array.isArray(imported.globalAllocation))throw new Error('不是有效的工作区JSON文件');if(!confirm('导入将覆盖当前账户的工作区状态，确定继续吗？'))return;delete imported.meta?.exportedAt;state=imported;ensureStateDefaults();await persist({quiet:true});renderPage(currentPage);toast('工作区已恢复');}catch(err){toast('导入失败：'+err.message,true);}finally{e.target.value='';}});
}

// Daily flow timeline pointer editing: drag body to move, bottom handle to resize end; overlaps are allowed.
let flowPointer=null;
document.addEventListener('pointercancel',()=>{if(flowPointer){flowPointer=null;renderPage(currentPage,{transition:false});}});
document.addEventListener('pointerdown',e=>{const block=e.target.closest('.flow-block');if(e.pointerType==='touch')return;if(!block||e.target.closest('button'))return;const timeline=$('#flowTimeline');if(!timeline)return;flowPointer={id:block.dataset.flowId,kind:ui.flowKind||flowDateKind(),start:n(block.dataset.flowStart),end:n(block.dataset.flowEnd),y:e.clientY,resize:!!e.target.closest('[data-flow-resize]'),last:null};block.setPointerCapture?.(e.pointerId);e.preventDefault();});
document.addEventListener('pointermove',e=>{if(!flowPointer)return;const timeline=$('#flowTimeline');if(!timeline)return;const delta=Math.round((e.clientY-flowPointer.y)/(timeline.clientHeight||800)*1440/5)*5;flowPointer.last=delta;const block=$(`.flow-block[data-flow-id="${CSS.escape(flowPointer.id)}"]`);if(block){const st=flowPointer.resize?flowPointer.start:Math.max(0,Math.min(1435,flowPointer.start+delta));const en=flowPointer.resize?Math.max(st+5,Math.min(1440,flowPointer.end+delta)):Math.max(st+5,Math.min(1440,flowPointer.end+delta));block.style.top=`${st}px`;block.style.height=`${en-st}px`;const time=block.querySelector('.flow-time');if(time)time.textContent=`${flowClock(st)}–${flowClock(en)}`;}});
document.addEventListener('pointerup',async()=>{if(!flowPointer)return;const drag=flowPointer;flowPointer=null;if(drag.last===null||Math.abs(drag.last)<3)return;const item=(state.dailyFlows[drag.kind]||[]).find(x=>String(x.id)===String(drag.id));if(!item)return;if(drag.resize)item.end=Math.max(item.start+5,Math.min(2880,item.end+drag.last));else{const delta=drag.last;item.start=Math.max(0,Math.min(1435,item.start+delta));item.end=Math.max(item.start+5,item.end+delta);}await persist({quiet:true});renderPage(currentPage==='xindeng'?'xindeng':'dailyflow');toast('流程时间已调整');});
// Calendar drag/drop: move date ranges, reorder overlapping work, and resize by dragging the right edge.
let calendarDragState=null;
function persistTaskOrder(){focusTasks().sort((a,b)=>n(a.sortOrder)-n(b.sortOrder)).forEach((t,i)=>t.sortOrder=(i+1)*10);}
function dateUnderPointer(x,y){const els=document.elementsFromPoint(x,y);for(const el of els){const dateEl=el.closest?.('[data-calendar-date]');if(dateEl?.dataset.calendarDate)return dateEl.dataset.calendarDate;}return '';}
function commitCalendarDrop(id,targetDate,targetTaskId='',sourceDate=''){
  const task=focusTasks().find(t=>String(t.id)===String(id));if(!task)return;
  const target=targetTaskId?focusTasks().find(t=>String(t.id)===String(targetTaskId)):null;
  if(target&&String(target.id)!==String(task.id)){
    const priorityRank=t=>({'高':0,'中':1,'低':2}[t.priority]??3);const list=focusTasks().filter(t=>String(t.id)!==String(task.id)).sort((a,b)=>n(a.sortOrder,999999999)-n(b.sortOrder,999999999)||(a.startDate||a.dueDate||'9999').localeCompare(b.startDate||b.dueDate||'9999')||priorityRank(a)-priorityRank(b));const targetIndex=list.findIndex(t=>String(t.id)===String(target.id));const sourceIndex=targetIndex>=0?targetIndex:0;const insertAfter=calendarDragState?.dropAfter===true;list.splice(Math.min(list.length,sourceIndex+(insertAfter?1:0)),0,task);list.forEach((t,i)=>t.sortOrder=(i+1)*10);
  } else if(targetDate) shiftTaskToDate(task,targetDate);
  else if(sourceDate && task.startDate) { /* no-op: invalid drop target */ }
  saveAndRender(target?'任务顺序已调整':'任务日期已调整');
}
function shiftTaskToDate(task,newStart){const oldStart=task.startDate||task.dueDate||newStart,oldEnd=task.dueDate||oldStart;const duration=Math.max(0,Math.min(365,dayDiff(oldStart,oldEnd)));const orderOffset=((n(task.sortOrder,0)%1000)+1000)%1000;task.startDate=newStart;task.dueDate=shiftDateKey(newStart,duration);task.sortOrder=dayDiff('2000-01-01',newStart)*1000+orderOffset;}
document.addEventListener('dragstart',e=>{
  if(e.target.closest?.('[data-resize-task]')){e.preventDefault();return;}
  const event=e.target.closest?.('[data-calendar-event]');const inbox=e.target.closest?.('[data-inbox-task]');const el=event||inbox;if(!el)return;
  calendarDragState={id:el.dataset.taskId||el.dataset.calendarEvent||el.dataset.inboxTask,sourceStart:el.dataset.start||'',sourceEnd:el.dataset.end||'',sourceInbox:!!inbox,dropAfter:false};
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',calendarDragState.id);requestAnimationFrame(()=>el.classList.add('is-dragging'));
});
document.addEventListener('dragend',e=>{e.target.closest?.('[data-calendar-event],[data-inbox-task]')?.classList.remove('is-dragging');$$('.calendar-event,.calendar-day-header,.calendar-day-bg').forEach(x=>x.classList.remove('drag-over'));});
document.addEventListener('dragover',e=>{if(!calendarDragState)return;const target=e.target.closest?.('[data-calendar-event],[data-calendar-date]');if(target){e.preventDefault();e.dataTransfer.dropEffect='move';$$('.calendar-event,.calendar-day-header,.calendar-day-bg').forEach(x=>x.classList.remove('drag-over'));target.classList.add('drag-over');}});
document.addEventListener('drop',e=>{
  if(!calendarDragState)return;const id=e.dataTransfer.getData('text/plain')||calendarDragState.id;const targetEvent=e.target.closest?.('[data-calendar-event]');const dateEl=e.target.closest?.('[data-calendar-date]');
  if(!targetEvent&&!dateEl)return;e.preventDefault();calendarDragState.dropAfter=!!(targetEvent&&e.clientY>targetEvent.getBoundingClientRect().top+targetEvent.getBoundingClientRect().height/2);
  const targetDate=dateEl?.dataset.calendarDate||'';const targetId=targetEvent?.dataset.taskId||'';commitCalendarDrop(id,targetDate,targetId,calendarDragState.sourceStart);calendarDragState=null;
});
document.addEventListener('pointerdown',e=>{
  const handle=e.target.closest?.('[data-resize-task]');if(!handle||currentPage!=='calendar')return;e.preventDefault();e.stopPropagation();const id=handle.dataset.resizeTask,task=focusTasks().find(t=>String(t.id)===String(id));if(!task)return;
  ui.calendarResize={id,originalEnd:task.dueDate||task.startDate,draftEnd:task.dueDate||task.startDate,startDate:task.startDate||task.dueDate};handle.setPointerCapture?.(e.pointerId);handle.classList.add('resizing');
});
document.addEventListener('pointermove',e=>{
  const r=ui.calendarResize;if(!r)return;const key=dateUnderPointer(e.clientX,e.clientY);if(!key)return;const end=Math.max(0,dayDiff(r.startDate,key));r.draftEnd=shiftDateKey(r.startDate,end);
  const ev=$(`[data-calendar-event="${CSS.escape(String(r.id))}"]`);if(ev){const days=getWeekDates(ui.calendarWeekOffset||0);const idxStart=Math.max(0,dayDiff(days[0].date,r.startDate)),idxEnd=Math.min(6,dayDiff(days[0].date,r.draftEnd));const clippedStart=Math.max(0,idxStart);if(idxEnd>=clippedStart)ev.style.gridColumn=`${clippedStart+1} / span ${idxEnd-clippedStart+1}`;ev.title=`调整中：${r.startDate} → ${r.draftEnd}`;}
});
document.addEventListener('pointerup',()=>{const r=ui.calendarResize;if(!r)return;ui.calendarResize=null;const task=focusTasks().find(t=>String(t.id)===String(r.id));if(task&&r.draftEnd){task.dueDate=r.draftEnd;if(!task.startDate)task.startDate=r.startDate;saveAndRender(`结束日期已调整至 ${r.draftEnd}`);}});
document.addEventListener('input',e=>{if(e.target.id==='workbookSearch')renderWorkbookSheet();});

document.addEventListener('keydown',e=>{
  const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||document.activeElement?.isContentEditable;
  if(e.key==='Escape'){ if($('#gymModal')){closeGymModal();return;} $('#focusTaskModal')?.remove(); return; }
  if(editing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key.toLowerCase()==='n'&& $('#authScreen').classList.contains('hidden')){renderPage('home');setTimeout(()=>$('#focusTaskTitle')?.focus(),0);}
  else if(e.key==='/'&& $('#authScreen').classList.contains('hidden')){e.preventDefault();const search=$('#focusSearch');if(search)search.focus();}
});
let bodyPointerState=null;
document.addEventListener('pointerdown',e=>{
 const canvas=e.target.closest?.('#bodyModelCanvas');if(!canvas||!e.isPrimary&&e.button!==1)return;if(e.button!==0&&e.button!==1)return;
 bodyPointerState={x:e.clientX,y:e.clientY,button:e.button,moved:false,view:{...ui.bodyView}};
 if(e.button===1){e.preventDefault();canvas.classList.add('rotating');}
});
document.addEventListener('pointerout',e=>{if(e.target.closest?.('.body-region-btn')&&!e.relatedTarget?.closest?.('.body-region-btn'))$$('[data-body-zone]',$('#anatomySvg')||document).forEach(el=>el.classList.remove('preview'));});
document.addEventListener('pointermove',e=>{
 if(bodyPointerState){const dx=e.clientX-bodyPointerState.x,dy=e.clientY-bodyPointerState.y;if(Math.abs(dx)+Math.abs(dy)>4)bodyPointerState.moved=true;
  if(bodyPointerState.moved){ui.bodyDragMoved=true;if(bodyPointerState.button===1){ui.bodyView.ry=bodyPointerState.view.ry+dx*.55;ui.bodyView.rx=Math.max(-65,Math.min(65,bodyPointerState.view.rx-dy*.4));}else{ui.bodyView.x=bodyPointerState.view.x+dx;ui.bodyView.y=bodyPointerState.view.y+dy;}
   const svg=$('#anatomySvg');if(svg)svg.style.transform=`translate(${ui.bodyView.x}px,${ui.bodyView.y}px) rotateX(${ui.bodyView.rx}deg) rotateY(${ui.bodyView.ry}deg) scale(${ui.bodyView.scale})`;
  }return;
 }
 const btn=e.target.closest?.('.body-region-btn');if(btn){const svg=$('#anatomySvg');if(svg){$$('[data-body-zone]',svg).forEach(el=>el.classList.toggle('preview',el.dataset.bodyZone===btn.dataset.zone));}}
});
document.addEventListener('pointerup',e=>{
 if(!bodyPointerState)return;const canvas=$('#bodyModelCanvas');canvas?.classList.remove('rotating');const moved=bodyPointerState.moved;bodyPointerState=null;if(moved){setTimeout(()=>{ui.bodyDragMoved=false;},120);}
});
document.addEventListener('pointercancel',()=>{bodyPointerState=null;$('#bodyModelCanvas')?.classList.remove('rotating');});
document.addEventListener('wheel',e=>{const canvas=e.target.closest?.('#bodyModelCanvas');if(!canvas)return;e.preventDefault();ui.bodyView.scale=Math.max(.65,Math.min(1.75,ui.bodyView.scale+(e.deltaY<0?.08:-.08)));const svg=$('#anatomySvg');if(svg)svg.style.transform=`translate(${ui.bodyView.x}px,${ui.bodyView.y}px) rotateX(${ui.bodyView.rx}deg) rotateY(${ui.bodyView.ry}deg) scale(${ui.bodyView.scale})`;},{passive:false});
document.addEventListener('click',e=>{const tab=e.target.closest?.('[data-tab-key="dailyflow"] [data-tab="stats"]');if(!tab)return;const panel=$('#flowStatsPanel');if(panel)panel.innerHTML=flowStatsBody();refreshFlowTabCounts();});
updateAuthMode();
bindDelegatedEvents();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

async function gymRequest(path, options={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{return await api(path,{...options,signal:controller.signal});}
  catch(err){
    if(err.name==='AbortError')throw new Error('动作库响应超时，请稍后重试。');
    if(err instanceof TypeError)throw new Error('无法连接本地服务。请确认服务正在运行，并从 http://127.0.0.1:8765 打开工作台后重试。');
    throw err;
  }finally{clearTimeout(timer);}
}
function openRecommendedGym(name){
  const u=gymUI();Object.assign(u,{q:name,zone:'',bodyPart:'',equipment:'',category:'',favorites:false,offset:0});
  try{sessionStorage.setItem('wealthos-fit-tab','library');}catch(_){}
  if(currentPage!=='fitness')renderPage('fitness',{transition:false});
  else{const search=$('#gymSearch');if(search)search.value=name;document.querySelector('.fit-tabs [data-tab="library"]')?.click();loadGym(true);}
  requestAnimationFrame(()=>$('#gymSearch')?.scrollIntoView({behavior:'smooth',block:'center'}));
}

function renderTodayRoles(){const template=document.createElement('template');template.innerHTML=renderAgents();template.content.querySelector('.page-head')?.remove();return template.innerHTML;}

window.addEventListener('message',event=>{
 const frame=document.querySelector('.medical-anatomy-frame');
 if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
 if(event.data?.type==='anatomy-mode'&&['muscle','skeleton','skin','head'].includes(event.data.mode)){ui.bodyMode=event.data.mode;document.querySelectorAll('.body-mode-switch [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===ui.bodyMode));return;}
 if(event.data?.type!=='anatomy-select')return;
 const zones={head:'head',upper:'upper',chest:'chest',core:'core',lower:'lower',full:'full'};
 const zone=zones[event.data.zone];if(!zone)return;
 ui.bodyZone=zone;ui.bodyMuscle='';ui.bodySearch='';
 const template=document.createElement('template');template.innerHTML=renderTrainingStudio();
 const inspector=document.querySelector('.training-studio .action-inspector');if(inspector)inspector.replaceWith(template.content.querySelector('.action-inspector'));
 const note=document.querySelector('.body-selection-note');if(note)note.textContent='已选结构：'+String(event.data.name||'')+'；右侧提供区域训练参考，点击动作可进入动作库。';
});
