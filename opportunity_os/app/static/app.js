/* Opportunity OS: native, local-first frontend. No CDN runtime dependency. */
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const truncate = (s,n=130) => String(s||'').length>n?String(s||'').slice(0,n)+'…':String(s||'');
const fmt = n => Number(n||0).toLocaleString('zh-CN');
const money = n => '¥'+Number(n||0).toLocaleString('zh-CN',{maximumFractionDigits:1});
const relative = t => {if(!t)return '时间未知';let d=new Date(t);return isNaN(d)?String(t).slice(0,10):d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'});};
const safeURL = v => {try{let u=new URL(v);return /^https?:$/.test(u.protocol)?esc(u.href):'#'}catch{return '#'}};
const STAGES=['待评估','待验证','验证中','开发中','销售中','已成交','已归档'];
const SCORE_LABELS={demand:'需求信号',speed:'交付可行',channel:'获客可达',margin:'潜在毛利',repeat:'复用复购',safety:'许可可控'};
const SOURCE_NAMES={github:'GitHub 仓库',github_trending:'GitHub Trending',xianyu:'闲鱼',xiaohongshu:'小红书',1688:'1688',hn:'Hacker News',rss:'资讯 RSS',x:'X / 原始帖子',manual:'手动录入',demo:'体验样例'};
const SOURCE_SHORT={github:'GH',github_trending:'TR',xianyu:'XY',xiaohongshu:'XHS',1688:'1688',hn:'HN',rss:'RSS',x:'X',manual:'IN',demo:'D'};
const ST={view:'overview',overview:null,opps:[],oppsTotal:0,filters:{search:'',source:'',stage:'',category:'',sort:'score',min_score:0},visible:25,experiments:[],scans:[],watch:[],feeds:[],sourceConfigs:[],health:null,details:null,polling:false};
const API=async(path,opt={})=>{
  const r=await fetch('/opportunity-os/api'+path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opt});
  const body=await r.json().catch(()=>({detail:`HTTP ${r.status}`}));
  if(!r.ok)throw new Error(typeof body.detail==='string'?body.detail:JSON.stringify(body.detail||body));
  return body;
};
const call=(path,method='POST',body=null)=>API(path,{method,...(body!==null?{body:JSON.stringify(body)}:{})});
function toast(msg,isError=false){let e=document.createElement('div');e.className='toast'+(isError?' error':'');e.textContent=msg;$('#toast-stack').append(e);setTimeout(()=>e.remove(),4200);}
function spin(on){$('#scan-btn').disabled=on;$('#scan-icon').classList.toggle('rotating',on);$('#scan-text').textContent=on?'正在采集…':'扫描新机会';}
function closeMobile(){$('#sidebar').classList.remove('open');$('#mobile-shade').classList.remove('open');}
function nav(view){
  ST.view=view;$$('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+view));
  $$('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  $('#breadcrumb').textContent=({overview:'工作台',radar:'机会雷达',pipeline:'转化流水线',experiments:'验证实验室',sources:'情报源中心',settings:'配置与说明'})[view]||view;
  history.replaceState(null,'','#'+view);window.scrollTo({top:0,behavior:'smooth'});closeMobile();
  if(view==='radar')loadOpportunities();
  if(view==='pipeline')loadPipeline();
  if(view==='experiments')loadExperiments();
  if(view==='sources')loadSources();
  if(view==='settings')loadSettings();
}
const empty=(title,desc,button='')=>`<div class="empty"><div class="empty-icon">◎</div><strong>${esc(title)}</strong><p>${esc(desc)}</p>${button}</div>`;
function itemLabel(o){return `${esc(o.source||'')} ${o.is_demo?'<span class="demo-mark">DEMO</span>':''}`;}

async function loadHealth(){
  try{ST.health=await API('/health');$('#system-dot').className='state-dot good';$('#system-text').textContent=ST.health.running?'实时采集进行中':'本地服务运行正常';
    spin(ST.health.running);return ST.health;
  }catch(e){$('#system-dot').className='state-dot bad';$('#system-text').textContent='服务连接失败';throw e}
}
async function loadOverview(){
  try{let d=await API('/overview');ST.overview=d;$('#side-total').textContent=fmt(d.total);
    $('#last-scan-text').textContent=d.last_scan?`上次采集 ${relative(d.last_scan.started_at)} · ${({'completed':'正常','partial':'部分成功','failed':'失败','running':'进行中'})[d.last_scan.status]||d.last_scan.status}`:'尚未采集真实数据';
    const cards=[['真实线索',d.total,'公开来源入库数量','◎'],['高优先级',d.high,'评分 ≥ 80 · 并非已成交','↗'],['验证进行中',d.validating,'待验证 + 验证中','◈'],['已记录收入',money(d.booked_revenue),'手动记录 + 实验收入','¥']];
    $('#metric-grid').innerHTML=cards.map(([label,value,note,icon],i)=>`<div class="metric-card ${i===1?'highlight':''}"><div class="metric-head">${esc(label)} <span class="metric-symbol">${icon}</span></div><div class="metric-value">${esc(value)}</div><div class="metric-foot">${esc(note)}</div></div>`).join('');
    drawTrend(d.trends);drawSources(d.sources,d.total);
    $('#top-list').innerHTML=d.top.length?d.top.map((o,i)=>`<div class="top-row" role="button" tabindex="0" data-open="${o.id}"><span class="top-index">${String(i+1).padStart(2,'0')}</span><div class="source-icon ${esc(o.source)}">${SOURCE_SHORT[o.source]||'O'}</div><div class="top-info"><strong>${esc(o.title)}</strong><p>${esc(truncate(o.summary,105))}</p></div><span class="top-extra">${esc(o.category)}</span><div class="score-num">${o.score}<small> / 100</small></div></div>`).join(''):
       empty('还没有真实机会','点击右上角「扫描新机会」，从 GitHub、开发者社区和资讯源获取公开数据。','<button class="btn btn-primary" data-action="run-scan">立即采集</button>');
  }catch(e){toast('加载总览失败：'+e.message,true)}
}
function drawTrend(rows){
  const byDay=Object.fromEntries((rows||[]).map(x=>[x.date,x.count]));
  const days=[];for(let i=13;i>=0;i--){const d=new Date();d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-i);let key=d.toISOString().slice(0,10);days.push([key,byDay[key]||0]);}
  const max=Math.max(1,...days.map(x=>x[1]));
  $('#trend-chart').innerHTML=`<div class="chart-bars">${days.map(([date,count])=>`<div class="chart-bar" style="height:${count?Math.max(5,count/max*100):1}%" data-label="${esc(date)}：${count}" title="${esc(date)} · ${count} 条"></div>`).join('')}</div>`;
}
function drawSources(rows,total){
  $('#source-distribution').innerHTML=rows.length?rows.slice(0,5).map(x=>`<div class="distribution-item"><div class="distribution-label"><span>${esc(SOURCE_NAMES[x.source]||x.source)}</span><b>${fmt(x.count)} <span style="color:var(--muted);font-weight:400">/ ${total?Math.round(x.count/total*100):0}%</span></b></div><div class="distribution-track"><span style="width:${total?x.count/total*100:0}%"></span></div></div>`).join(''):'<div class="mini-empty">采集成功后，将在这里显示真实来源分布。</div>';
}
async function loadOpportunities(){
  let p=new URLSearchParams({...ST.filters,limit:2000});
  try{const d=await API('/opportunities?'+p.toString());ST.opps=d.items;ST.oppsTotal=d.total;renderOpportunities();}
  catch(e){toast('读取机会失败：'+e.message,true)}
}
function renderOpportunities(){
  const all=ST.opps,items=all.slice(0,ST.visible);
  $('#result-count').textContent=`发现 ${fmt(ST.oppsTotal)} 条线索 · 显示 ${items.length} 条`;
  $('#opportunity-list').innerHTML=items.length?items.map(o=>`<div class="opp-card" data-open="${o.id}" role="button" tabindex="0"><div class="source-icon ${esc(o.source)}">${SOURCE_SHORT[o.source]||'IN'}</div><div><div class="opp-title">${esc(o.title)} ${o.is_demo?'<span class="demo-mark">DEMO</span>':''}</div><div class="opp-summary">${esc(o.summary||'暂缺说明，请前往原始来源验证。')}</div><div class="opp-meta"><span class="tag green">${esc(o.category)}</span><span>${esc(SOURCE_NAMES[o.source]||o.source)}</span><span>·</span><span>${relative(o.published_at)}</span>${o.stars?`<span>★ ${fmt(o.stars)}</span>`:''}</div></div><div class="opp-side"><strong>${esc(o.stage)}</strong><span>${esc(truncate(o.target_customer,23))}</span><span>测试价 ${money(o.estimated_price)}</span></div><div class="opp-score"><b>${o.score}</b><span>/100</span><div class="score-track"><i style="width:${o.score}%"></i></div></div></div>`).join(''):
      empty('没有找到符合条件的机会','可以尝试清空筛选条件、添加手动线索，或者运行一次新的公开来源采集。','<button class="btn btn-outline" data-action="clear-filters">清空筛选</button>');
  $('#load-more').hidden=items.length>=all.length;
}
function clearFilters(){ST.filters={search:'',source:'',stage:'',category:'',sort:'score',min_score:0};ST.visible=25;
  $('#search-input').value='';['source','stage','category'].forEach(k=>$('#'+k+'-filter').value='');$('#sort-filter').value='score';$('#high-only').checked=false;loadOpportunities();}

async function loadPipeline(){
  try{let d=await API('/opportunities?limit=2000&sort=new');ST.opps=d.items;renderPipeline(d.items)}
  catch(e){toast('读取流水线失败：'+e.message,true)}
}
function renderPipeline(items){
  $('#pipeline-board').innerHTML=STAGES.map(stage=>{
    let subset=items.filter(o=>o.stage===stage);
    return `<div class="pipe-column" data-drop-stage="${esc(stage)}"><div class="pipe-header"><span>${esc(stage)}</span><span class="pipe-counter">${subset.length}</span></div>${subset.length?subset.map(o=>`<div class="pipe-card" draggable="true" data-drag="${o.id}" data-open="${o.id}"><strong>${esc(truncate(o.title,70))}</strong><div class="pipe-card-foot"><span>${esc(o.category)}</span><b>${o.score} / 100</b></div>${o.is_demo?'<span class="demo-mark">DEMO</span>':''}</div>`).join(''):'<div class="pipe-empty">拖入机会 / 暂无</div>'}</div>`;
  }).join('');
  $$('.pipe-card').forEach(el=>{el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',el.dataset.drag);e.dataTransfer.effectAllowed='move';});});
  $$('.pipe-column').forEach(el=>{
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('drag-over')});
    el.addEventListener('dragleave',()=>el.classList.remove('drag-over'));
    el.addEventListener('drop',async e=>{e.preventDefault();el.classList.remove('drag-over');let id=e.dataTransfer.getData('text/plain');if(!/^\d+$/.test(id))return;
      try{await call('/opportunities/'+id,'PATCH',{stage:el.dataset.dropStage});toast('已更新机会阶段');loadPipeline();loadOverview()}catch(err){toast(err.message,true)}});
  });
}

async function loadExperiments(){
  try{ST.experiments=await API('/experiments');renderExperiments()}
  catch(e){toast('读取实验失败：'+e.message,true)}
}
function renderExperiments(){
  const exps=ST.experiments;let totals={contacts:0,replies:0,orders:0,revenue:0};
  exps.filter(e=>!e.is_demo).forEach(e=>Object.keys(totals).forEach(k=>totals[k]+=Number(e[k]||0)));
  $('#experiment-summary').innerHTML=[['联系客户',fmt(totals.contacts)],['获得回复',fmt(totals.replies)],['真实订单',fmt(totals.orders)],['实验收入',money(totals.revenue)]].map(([k,v])=>`<div class="exp-metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
  $('#experiment-list').innerHTML=exps.length?exps.map(e=>`<div class="experiment-card" data-experiment="${e.id}"><div class="exp-card-top"><div><strong>${esc(e.hypothesis)}</strong><p><a class="text-link" href="#" data-open="${e.opportunity_id}">${esc(truncate(e.opportunity_title,110))}</a> ${e.is_demo?'<span class="demo-mark">DEMO</span>':''} · ${esc(e.category)}</p></div><span class="tag ${e.status==='已完成'?'green':''}">${esc(e.status)}</span></div><div class="exp-subtitle">执行动作：${esc(e.action)}</div><div class="exp-metrics">${[['contacts','接触人数'],['replies','有效回复'],['orders','成交订单'],['revenue','实收收入 ¥'],['cost','实际费用 ¥']].map(([k,label])=>`<label>${label}<input type="number" min="0" data-exp-field="${k}" value="${Number(e[k]||0)}" /></label>`).join('')}</div><div class="exp-footer"><select data-exp-field="status">${['计划中','进行中','已完成','已取消'].map(x=>`<option ${x===e.status?'selected':''}>${x}</option>`).join('')}</select><button class="btn btn-outline btn-compact" data-action="save-experiment" data-id="${e.id}">保存实验结果</button></div></div>`).join(''):
      empty('还没有验证实验','从任何机会的详情页发起一次验证，记录联系人数、真实回复和订单。','<button class="btn btn-primary" data-action="create-experiment">新建第一个实验</button>');
}

const localDateTime = s => {
  if(!s)return '尚未运行'; const d=new Date(s);
  if(Number.isNaN(d.getTime()))return String(s);
  return d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
};
const sourceDescription={github:'关键词搜索 / 近期新项目',github_trending:'官方 Trending 网页榜单 / 今日热度',
  hn:'Show HN / Ask HN',rss:'订阅源更新',x:'官方 recent search API / 可能计费',
  xianyu:'授权 RSS/JSON 或人工导入',xiaohongshu:'授权 RSS/JSON 或人工导入', '1688':'授权 RSS/JSON 或人工导入'};
async function loadSources(){
  try{const results=await Promise.all([API('/scans?limit=20'),API('/watchlist'),API('/rss-feeds'),API('/health'),API('/sources')]);
    ST.scans=results[0];ST.watch=results[1];ST.feeds=results[2];ST.health=results[3];ST.sourceConfigs=results[4];renderSources();}
  catch(e){toast('来源中心加载失败：'+e.message,true)}
}
function renderSources(){
  const latest=ST.scans[0],detail=latest?.detail||{};
  $('#source-status-grid').innerHTML=ST.sourceConfigs.map(s=>{
    const d=detail[s.source];const state=!s.enabled?'disabled':!s.ready?'unconfigured':s.last_status||'never';
    const status=state==='ok'?'最近成功':state==='partial'?'部分成功':state==='disabled'?'已暂停':state==='error'?'采集失败':state==='unconfigured'?'等待授权':state==='running'?'运行中':'等待首次采集';
    const next=s.next_due_at?`下次预计 ${localDateTime(s.next_due_at)}`:'尚未采集';
    const desc=s.last_message||sourceDescription[s.source]||'';
    return `<div class="source-status-card"><div class="source-card-title">${esc(s.label)}</div>
      <div class="source-card-status"><i class="status-indicator ${esc(state)}"></i>${esc(status)}</div>
      <div class="source-card-desc">${esc(truncate(desc,110))}</div>
      <div class="source-card-foot">间隔 ${fmt(s.interval_minutes/60)} 小时 · ${s.due?'现在到期':esc(next)}</div>
      <button class="btn btn-outline btn-compact source-run-btn" data-action="scan-source" data-id="${esc(s.source)}" ${!s.enabled||!s.ready?'disabled title="请先启用并配置授权"':''}>强制刷新</button>
    </div>`;
  }).join('');
  $('#watch-list').innerHTML=ST.watch.map(x=>`<div class="watch-item"><span>${esc(x.term)}</span><div class="watch-actions"><button data-action="toggle-watch" data-id="${x.id}" data-enabled="${x.enabled}">${x.enabled?'启用中 ✓':'已暂停'}</button><button data-action="delete-watch" data-id="${x.id}" title="删除关键词">✕</button></div></div>`).join('')||'<div class="mini-empty">暂无关键词，添加后可参加下一次 GitHub 仓库搜索。</div>';
  $('#feed-list').innerHTML=ST.feeds.map(x=>`<div class="watch-item"><div><strong>${esc(x.name)}</strong><span class="feed-item-link">${esc(x.url)}</span></div><div class="watch-actions"><button data-action="toggle-feed" data-id="${x.id}" data-enabled="${x.enabled}">${x.enabled?'启用中 ✓':'已暂停'}</button><button data-action="delete-feed" data-id="${x.id}">✕</button></div></div>`).join('')||'<div class="mini-empty">暂无已配置的 RSS 源。</div>';
  $('#scan-history').innerHTML=ST.scans.length?ST.scans.map(s=>`<div class="scan-entry"><div class="scan-entry-title"><strong>${esc(localDateTime(s.started_at))} · ${esc(s.status)}</strong><span>新增 ${s.inserted} / 已有 ${s.updated}</span></div><div class="scan-entry-detail">${Object.entries(s.detail||{}).map(([k,v])=>`${esc(SOURCE_NAMES[k]||k)}: ${v.state==='ok'?'成功':v.state==='disabled'?'停用':v.state==='not_due'?'未到期':v.state==='unconfigured'?'待配置':v.state==='partial'?'部分成功':'失败'}`).join(' · ')||'采集进行中...'}</div>${Object.entries(s.detail||{}).filter(([k,v])=>v.state==='error').map(([k,v])=>`<div class="scan-entry-detail error">${esc(k)}: ${esc(truncate(v.message,190))}</div>`).join('')}</div>`).join(''):'<div class="mini-empty">首次扫描后生成审计日志。</div>';
}
function renderSourceConfigs(){
  const target=$('#source-config-list');if(!target)return;
  target.innerHTML=ST.sourceConfigs.map(s=>`<div class="source-config-card" data-source-config="${esc(s.source)}">
    <div class="source-config-head"><div><strong>${esc(s.label)}</strong><span class="source-config-hint">${esc(sourceDescription[s.source]||'')}</span></div>
      <label class="switch-label"><input class="source-enabled" type="checkbox" ${s.enabled?'checked':''}/> 启用</label></div>
    <div class="source-config-controls"><label>最小刷新间隔 <select class="source-interval">${[[60,'1 小时'],[180,'3 小时'],[360,'6 小时'],[720,'12 小时'],[1440,'24 小时'],[2880,'48 小时'],[10080,'7 天']].map(([v,l])=>`<option value="${v}" ${Number(s.interval_minutes)===v?'selected':''}>${l}</option>`).join('')}${[60,180,360,720,1440,2880,10080].includes(Number(s.interval_minutes))?'':`<option selected value="${s.interval_minutes}">${fmt(s.interval_minutes)} 分钟</option>`}</select></label>
      <div class="source-config-meta">上次运行：${esc(localDateTime(s.last_attempt_at))}<br/>${s.next_due_at?'下一次：'+esc(localDateTime(s.next_due_at)):'尚未设定下次时间'}</div></div>
    ${['xianyu','xiaohongshu','1688'].includes(s.source)?`<label class="source-feed-label">授权 RSS/JSON 数据地址（可留空）<input class="source-feed-url" type="url" placeholder="https://provider.example/authorized-feed" value="${esc(s.feed_url||'')}" /></label>`:''}
    <div class="source-config-bottom"><span class="source-config-message">${s.enabled&&!s.ready?'等待配置授权数据源 / API 密钥':s.last_status==='error'?esc(truncate(s.last_message,110)):'按周期执行；不做高频轮询'}</span>
      <button class="btn btn-primary btn-compact" data-action="save-source" data-id="${esc(s.source)}">保存设置</button></div></div>`).join('');
}
async function loadSettings(){
  try{
    const results=await Promise.all([loadHealth(),API('/sources')]);let d=results[0];ST.sourceConfigs=results[1];
    $('#settings-details').innerHTML=[['版本',d.version],['数据文件',d.data_path],['本机时区',d.timezone],['调度器',d.auto_scan?'Web 后台启用 / 每分钟仅检查到期状态':'Web 后台未启用（可选 Windows 定时任务）'],['GitHub 授权',d.github_token?'Token 已配置':'公开数据 / 未配置 Token'],['X 接入',d.x_enabled?'已配置，可能计费':'未配置或禁用'],['AI 分析',d.llm_configured?'已配置 OpenAI-compatible API':'未配置（规则评分可用）'],['采集任务',d.running?'运行中':'空闲']].map(([k,v])=>`<div><strong>${esc(k)}</strong><span>${esc(v)}</span></div>`).join('');
    renderSourceConfigs();
  }catch(e){toast('读取系统状态失败：'+e.message,true)}
}

async function openDetail(id){
  try{const o=await API('/opportunities/'+id);ST.details=o;$('#drawer-content').innerHTML=detailHTML(o);
    $('#detail-drawer').classList.add('open');$('#detail-drawer').setAttribute('aria-hidden','false');$('#drawer-backdrop').classList.add('open');document.body.style.overflow='hidden';}
  catch(e){toast('读取详情失败：'+e.message,true)}
}
function closeDetail(){$('#detail-drawer').classList.remove('open');$('#detail-drawer').setAttribute('aria-hidden','true');$('#drawer-backdrop').classList.remove('open');document.body.style.overflow='';ST.details=null;}
function detailHTML(o){
  const econ=o.economics||{},report=(()=>{try{return JSON.parse(o.ai_report||'null')}catch{return null}})();
  const src=SOURCE_NAMES[o.source]||o.source;
  const scoreHTML=Object.entries(SCORE_LABELS).map(([key,name])=>`<div class="score-line"><label>${name}<strong>${Number(o.scores?.[key]||0)}/5</strong></label><div class="distribution-track"><span style="width:${Number(o.scores?.[key]||0)*20}%"></span></div></div>`).join('');
  const field=(key,label,value,opts={})=>`<div class="field ${opts.full?'full':''}"><label for="edit-${key}">${label}</label>${opts.area?`<textarea id="edit-${key}" rows="${opts.rows||3}">${esc(value)}</textarea>`:`<input id="edit-${key}" type="${opts.type||'text'}" ${opts.min!=null?`min="${opts.min}"`:''} value="${esc(value)}" />`}</div>`;
  const aiFields={summary:'要点总结',why_now:'为什么是现在',target_customer:'客户与需求',pain_evidence:'痛点证据',product_offer:'交付产品',differentiation:'竞争差异',seven_day_plan:'七天实验',key_risks:'关键风险',unknowns:'证据缺口'};
  return `<div class="detail-topline"><div><div class="section-kicker">${esc(src)} · ${relative(o.published_at)} ${o.is_demo?'<span class="demo-mark">DEMO / 假数据</span>':''}</div><h2 class="detail-title">${esc(o.title)}</h2></div><div class="big-score"><strong>${o.score}</strong><small>/ 100</small></div></div>
    <p class="detail-summary">${esc(o.summary||'暂无源摘要，请直接查看公开来源。')}</p><a class="detail-link" href="${safeURL(o.source_url)}" target="_blank" rel="noopener noreferrer">↗ 查看可验证的原始来源</a>
    <div class="detail-section"><div class="detail-alert"><strong>证据等级：${esc(o.evidence_level||'待验证')}</strong><br>${esc(o.evidence_notes)}<br>付费意愿、成交率和真实利润必须通过客户访谈和实验补充。</div></div>
    <div class="detail-section"><h4>优先级如何计算</h4><div class="score-breakdown">${scoreHTML}</div></div>
    <hr class="detail-divider"/><div class="detail-section"><h4>商业假设与验证动作</h4>
      <div class="field-grid"><div class="field"><label>当前阶段</label><select id="edit-stage">${STAGES.map(s=>`<option ${o.stage===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="field"><label>业务方向</label><input value="${esc(o.category)}" disabled /></div>
      ${field('target_customer','目标付费客户',o.target_customer,{full:true,area:true,rows:2})}
      ${field('offer','可出售的产品 / 服务',o.offer,{full:true,area:true,rows:2})}
      ${field('next_test','下一次验证行动',o.next_test,{full:true,area:true,rows:2})}
      ${field('notes','证据记录 / 沟通纪要',o.notes,{full:true,area:true,rows:3})}
      </div><div class="drawer-action-row"><button class="btn btn-primary" data-action="save-detail">保存方案与阶段</button><button class="btn btn-outline" data-action="launch-experiment">发起验证实验</button></div></div>
    <div class="detail-section"><h4>单次交付经济模型（手工假设）</h4><div class="field-grid">
      ${field('estimated_price','测试报价（元）',o.estimated_price,{type:'number',min:0})}
      ${field('estimated_cost','成本预算（元）',o.estimated_cost,{type:'number',min:0})}
      ${field('estimated_hours','交付工时',o.estimated_hours,{type:'number',min:0})}
      ${field('realized_revenue','已确认收入（元）',o.realized_revenue,{type:'number',min:0})}
      </div><div class="detail-economics" id="econ-block"><div class="econ-box"><span>预计贡献利润</span><b>${money(econ.gross_profit)}</b></div><div class="econ-box"><span>预计毛利率</span><b>${econ.gross_margin}%</b></div><div class="econ-box"><span>贡献 / 工时</span><b>${money(econ.hourly_contribution)}</b></div></div><p class="field-hint" style="margin-top:10px">这些数值为用户假设，订单相关金额必须人工记录实际情况。</p></div>
    <div class="detail-section"><h4>公开信号历史（增量快照）</h4><p>${o.snapshots?.length?o.snapshots.map(s=>`${esc(s.observed_day)} · stars ${fmt(s.stars)} · 公开互动 ${fmt(s.comments)}`).join('<br>'):'首次采集后建立历史快照。'}</p><p class="field-hint">用于观察热度的变化；关注度仍不等于付费意愿。</p></div>
    <div class="detail-section"><h4>权限与履约风险</h4><div class="detail-alert">${esc(o.risk)}<br>源许可证：${esc(o.license||'UNKNOWN')}。发布产品前人工核查许可、API 条款、第三方数据使用范围。</div></div>
    <div class="detail-section"><h4>AI 研究分析（可选）</h4>${report?`<div class="ai-panel">${Object.entries(aiFields).map(([k,label])=>report[k]?`<strong>${label}</strong><p>${esc(report[k])}</p>`:'').join('')}</div>`:'<p>启用百炼或其他 OpenAI-compatible API 后，可对当前证据生成结构化研究分析。模型输出不会被当作事实。</p>'}
    <div class="drawer-action-row"><button class="btn btn-outline" data-action="ai-analyze">${report?'重新分析':'使用已配置模型分析'}</button><button class="btn btn-ghost" data-action="rescore">按当前规则重新评分</button></div></div>
    <div class="detail-section"><h4>验证实验 / ${o.experiments.length}</h4>${o.experiments.length?o.experiments.map(e=>`<div class="scan-entry"><strong>${esc(e.hypothesis)}</strong><div class="scan-entry-detail">${esc(e.status)} · 接触 ${e.contacts} · 订单 ${e.orders} · 收入 ${money(e.revenue)}</div></div>`).join(''):'<div class="mini-empty">还没有真实实验记录。</div>'}</div>`;
}
async function saveDetail(){let o=ST.details;if(!o)return;
  let data={stage:$('#edit-stage').value};for(const k of ['target_customer','offer','notes','next_test'])data[k]=$('#edit-'+k).value;
  for(const k of ['estimated_price','estimated_cost','estimated_hours','realized_revenue'])data[k]=Number($('#edit-'+k).value||0);
  try{await call('/opportunities/'+o.id,'PATCH',data);toast('方案已保存');await openDetail(o.id);loadOverview();if(ST.view==='radar')loadOpportunities();if(ST.view==='pipeline')loadPipeline();}
  catch(e){toast('保存失败：'+e.message,true)}
}
async function rescoreDetail(){const id=ST.details?.id;if(!id)return;try{await call('/opportunities/'+id+'/rescore');toast('已按当前规则重新评分');openDetail(id);loadOpportunities()}catch(e){toast(e.message,true)}}
async function analyzeDetail(){const id=ST.details?.id;if(!id)return;const btn=$('[data-action="ai-analyze"]');if(btn){btn.disabled=true;btn.textContent='正在调用模型…';}
  try{await call('/opportunities/'+id+'/analyze');toast('分析完成；请核实模型推断');openDetail(id)}catch(e){toast(e.message,true);if(btn){btn.disabled=false;btn.textContent='使用已配置模型分析'}}}

function openModal(title,kicker,body){$('#modal-title').textContent=title;$('#modal-kicker').textContent=kicker;$('#modal-content').innerHTML=body;$('#modal-backdrop').classList.add('open');}
function closeModal(){$('#modal-backdrop').classList.remove('open');$('#modal-content').innerHTML=''}
function manualModal(){openModal('添加手动线索','NEW / SIGNAL',`<form class="modal-form" id="manual-form"><div class="field"><label>线索名称 *</label><input name="title" required minlength="3" placeholder="具体名称，例如：MCP 调试工具" /></div><div class="field"><label>可验证的原始链接 *</label><input name="source_url" required type="url" placeholder="https://..." /></div><div class="field"><label>内容摘要 / 客户痛点</label><textarea name="summary" placeholder="原始证据、用户问题、自己的观察..." rows="4"></textarea></div><p class="field-hint">手动添加的数据会标记为未经独立验证，不会被伪装成已采集的项目。</p><div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">保存线索</button></div></form>`);}
async function experimentModal(){
  const o=ST.details;let items=[];
  if(!o){try{items=(await API('/opportunities?limit=200&sort=score')).items}catch(e){toast(e.message,true);return}}
  const choices=o?[o]:items;
  if(!choices.length){toast('请先采集或添加一条机会',true);return}
  openModal('创建验证实验','NEW / EXPERIMENT',`<form class="modal-form" id="experiment-form"><div class="field"><label>关联机会 *</label><select name="opportunity_id" required>${choices.map(x=>`<option value="${x.id}" ${o?.id===x.id?'selected':''}>${esc(truncate(x.title,75))}</option>`).join('')}</select></div><div class="field"><label>可证伪的实验假设 *</label><textarea name="hypothesis" required minlength="3" rows="3" placeholder="例：5 位 Java 开发者中，至少 2 位愿意为自动索引报告付费 299 元"></textarea></div><div class="field"><label>具体执行动作 *</label><textarea name="action" required minlength="3" rows="3" placeholder="展示 2 分钟录屏，询问 5 位潜在客户并记录结果"></textarea></div><div class="field"><label>截止日期（可选）</label><input name="due_date" type="date" /></div><div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">保存实验</button></div></form>`);
}
async function runScan(source=null,force=false){try{let d=await call('/scan','POST',{mode:force?'force':'due',source});if(!d.ok){toast(d.message||'扫描进行中');return}toast(source?'已开始刷新 '+(SOURCE_NAMES[source]||source):'已检查数据源到期时间，未到期将跳过');spin(true);ST.polling=true;let tries=0;
  const timer=setInterval(async()=>{tries++;try{const h=await loadHealth();if(!h.running&&tries>1){clearInterval(timer);ST.polling=false;toast('采集已结束；请检查日志和新增数量');loadOverview();if(ST.view==='sources')loadSources();if(ST.view==='settings')loadSettings();if(ST.view==='radar')loadOpportunities();}}catch(e){clearInterval(timer);ST.polling=false;toast(e.message,true)}if(tries>45){clearInterval(timer);ST.polling=false;toast('扫描可能耗时较长，请到情报源中心查看日志')}} ,2200);
  }catch(e){toast('无法开始采集：'+e.message,true);spin(false)}}

// Event delegation keeps dynamic cards and dialogs interactive.
document.addEventListener('click',async e=>{
  const navButton=e.target.closest('[data-view]');if(navButton){nav(navButton.dataset.view);return;}
  const openEl=e.target.closest('[data-open]');if(openEl){e.preventDefault();openDetail(Number(openEl.dataset.open));return;}
  const actionEl=e.target.closest('[data-action]');if(actionEl){const a=actionEl.dataset.action;
    if(a==='go-radar')nav('radar');if(a==='go-experiments')nav('experiments');if(a==='go-sources')nav('sources');
    if(a==='run-scan')runScan();
    if(a==='scan-source')runScan(actionEl.dataset.id,true);
    if(a==='save-source'){
      const card=actionEl.closest('[data-source-config]');if(!card)return;
      let payload={enabled:card.querySelector('.source-enabled').checked,
        interval_minutes:Number(card.querySelector('.source-interval').value)};
      const feed=card.querySelector('.source-feed-url');if(feed)payload.feed_url=feed.value.trim();
      try{await call('/sources/'+encodeURIComponent(actionEl.dataset.id),'PATCH',payload);
          toast('独立刷新策略已保存');loadSettings();}catch(err){toast(err.message,true)}
    }if(a==='clear-filters')clearFilters();if(a==='save-detail')saveDetail();
    if(a==='launch-experiment'){experimentModal()};if(a==='create-experiment')experimentModal();
    if(a==='close-modal')closeModal();if(a==='rescore')rescoreDetail();if(a==='ai-analyze')analyzeDetail();
    if(a==='toggle-watch'){try{await call('/watchlist/'+actionEl.dataset.id,'PATCH',{enabled:actionEl.dataset.enabled==='0'});loadSources()}catch(err){toast(err.message,true)}}
    if(a==='delete-watch'){if(confirm('确认删除该关键词？'))try{await call('/watchlist/'+actionEl.dataset.id,'DELETE');loadSources()}catch(err){toast(err.message,true)}}
    if(a==='toggle-feed'){try{await call('/rss-feeds/'+actionEl.dataset.id,'PATCH',{enabled:actionEl.dataset.enabled==='0'});loadSources()}catch(err){toast(err.message,true)}}
    if(a==='delete-feed'){if(confirm('确认删除该 RSS 源？'))try{await call('/rss-feeds/'+actionEl.dataset.id,'DELETE');loadSources()}catch(err){toast(err.message,true)}}
    if(a==='save-experiment'){
      const card=actionEl.closest('[data-experiment]');let values={};$$('[data-exp-field]',card).forEach(el=>values[el.dataset.expField]=el.dataset.expField==='status'?el.value:Number(el.value||0));
      try{await call('/experiments/'+actionEl.dataset.id,'PATCH',values);toast('实验数据已保存');loadExperiments();loadOverview()}catch(err){toast(err.message,true)}
    }
  }
});
$('#scan-btn').addEventListener('click',runScan);
$('#manual-add').addEventListener('click',manualModal);
$('#create-experiment-btn').addEventListener('click',experimentModal);
$('#drawer-close').addEventListener('click',closeDetail);$('#drawer-backdrop').addEventListener('click',closeDetail);
$('#modal-close').addEventListener('click',closeModal);$('#modal-backdrop').addEventListener('click',e=>{if(e.target===$('#modal-backdrop'))closeModal()});
$('#mobile-menu').addEventListener('click',()=>{$('#sidebar').classList.add('open');$('#mobile-shade').classList.add('open')});$('#mobile-shade').addEventListener('click',closeMobile);
window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetail();closeModal()}});
let searchTimer;$('#search-input').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{ST.filters.search=e.target.value.trim();ST.visible=25;loadOpportunities()},260)});
for(const key of ['source','stage','category','sort'])$('#'+key+'-filter').addEventListener('change',e=>{ST.filters[key]=e.target.value;ST.visible=25;loadOpportunities()});
$('#high-only').addEventListener('change',e=>{ST.filters.min_score=e.target.checked?80:0;ST.visible=25;loadOpportunities()});
$('#load-more').addEventListener('click',()=>{ST.visible+=25;renderOpportunities()});
$('#export-btn').addEventListener('click',()=>window.location.href='/opportunity-os/api/export.csv');
$('#download-report-btn').addEventListener('click',()=>window.location.href='/opportunity-os/api/report');
$('#backup-btn').addEventListener('click',()=>window.location.href='/opportunity-os/api/backup');
$('#load-demo-btn').addEventListener('click',async()=>{try{const d=await call('/demo/load');toast(`体验数据已加载（${d.inserted} 条，标记为 DEMO）`);loadOverview();}catch(e){toast(e.message,true)}});
$('#clear-demo-btn').addEventListener('click',async()=>{if(!confirm('清除所有 DEMO 数据（不影响真实机会）？'))return;try{let d=await call('/demo','DELETE');toast(`已清理 ${d.deleted} 条体验数据`);loadOverview()}catch(e){toast(e.message,true)}});
$('#add-watch-btn').addEventListener('click',async()=>{let t=$('#watch-input').value.trim();if(t.length<2){toast('请输入至少两个字符',true);return}try{await call('/watchlist','POST',{term:t});$('#watch-input').value='';toast('搜索关键词已加入');loadSources()}catch(e){toast(e.message,true)}});
$('#watch-input').addEventListener('keydown',e=>{if(e.key==='Enter'){$('#add-watch-btn').click()}});
$('#add-feed-btn').addEventListener('click',async()=>{
  const name=$('#feed-name-input').value.trim(),url=$('#feed-url-input').value.trim();
  if(name.length<2||!url.startsWith('https://')){toast('请填写名称与 HTTPS RSS URL',true);return}
  try{await call('/rss-feeds','POST',{name,url});$('#feed-name-input').value='';$('#feed-url-input').value='';toast('资讯订阅已添加');loadSources()}catch(e){toast(e.message,true)}
});
$('#download-template-btn').addEventListener('click',()=>{
  const csv='title,url,summary,price,sales,shop,published_at\r\n';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
  a.download='platform_opportunity_template.csv';a.click();URL.revokeObjectURL(a.href);
});
$('#market-import-btn').addEventListener('click',async()=>{
  const file=$('#market-import-file').files?.[0];if(!file){toast('请先选择 CSV 或 JSON 文件',true);return}
  if(file.size>500000){toast('文件不得超过 500KB',true);return}
  const format=file.name.toLowerCase().endsWith('.json')?'json':'csv';
  try{const data=await file.text();const result=await call('/platform/import','POST',
      {source:$('#market-import-source').value,format,data});
    toast(`导入完成：新增 ${result.inserted}，更新 ${result.updated}，拒绝 ${result.rejected}`);
    $('#market-import-file').value='';loadOverview();loadSources();
  }catch(e){toast('平台导入失败：'+e.message,true)}
});
$('#theme-toggle').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';try{localStorage.setItem('opp-theme',dark?'light':'dark')}catch{}});
$('#modal-content').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target;
 if(f.id==='manual-form'){
   const data=Object.fromEntries(new FormData(f));try{const result=await call('/opportunities','POST',data);closeModal();toast(result.inserted?'线索已入库':'该 URL 已存在，未重复录入');await loadOverview();nav('radar');openDetail(result.id);}catch(err){toast(err.message,true)}
 }else if(f.id==='experiment-form'){
   const data=Object.fromEntries(new FormData(f));data.opportunity_id=Number(data.opportunity_id);
   try{await call('/experiments','POST',data);closeModal();closeDetail();toast('验证实验已创建');nav('experiments');loadOverview()}catch(err){toast(err.message,true)}
 }
});
$('#drawer-content').addEventListener('input',e=>{
  if(!e.target.id?.startsWith('edit-estimated_'))return;
  const p=Number($('#edit-estimated_price')?.value||0),c=Number($('#edit-estimated_cost')?.value||0),h=Number($('#edit-estimated_hours')?.value||0);
  $('#econ-block').innerHTML=`<div class="econ-box"><span>预计贡献利润</span><b>${money(p-c)}</b></div><div class="econ-box"><span>预计毛利率</span><b>${p?Math.round((p-c)/p*100):0}%</b></div><div class="econ-box"><span>贡献 / 工时</span><b>${money(h?(p-c)/h:0)}</b></div>`;
});
// Initial page load: renders zero-data states even if external sources are unreachable.
(async()=>{
  try{if(localStorage.getItem('opp-theme')==='dark')document.documentElement.dataset.theme='dark'}catch{}
  $('#current-date').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
  const hash=window.location.hash.slice(1);if(['overview','radar','pipeline','experiments','sources','settings'].includes(hash))nav(hash);
  try{await Promise.all([loadHealth(),loadOverview()]);if(ST.view!=='overview')nav(ST.view)}catch(e){toast('后端不可用，请使用启动脚本运行服务：'+e.message,true)}
})();
