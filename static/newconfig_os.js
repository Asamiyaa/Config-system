/* ============================================================================
   NewConfig OS · 新登：从资产标签变成真实选择权
   将原来的长页面拆成横向 sheet：
   总览 / 现金流 / 90天 / 设施 / 订阅 / 资产 / 内容IP
   行内编辑全部改为弹层；每条记录都有编辑/删除；总览只保留判断与下一步。
   ========================================================================== */

const NCFG_TABS = [
  { key: 'overview', label: '总览' },
  { key: 'cashflow', label: '现金流' },
  { key: 'roadmap', label: '90天' },
  { key: 'infra', label: '设施' },
  { key: 'subscriptions', label: '订阅' },
  { key: 'assets', label: '资产' },
  { key: 'content', label: '内容IP' }
];
const NCFG_TASK_STATUS = ['未开始', '进行中', '已完成', '阻塞', '暂缓'];
const NCFG_INFRA_STATUS = ['未开始', '待盘点', '待验证', '监控中', '进行中', '已完成', '暂缓/法域核验', '待法律核验'];
const NCFG_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];

function ncfgNum(v, d = 0) {
  return hosNum(v, d);
}
function ncfgProfile() {
  return state.profile || {};
}
function ncfgTasks() {
  return state.tasks || [];
}
function ncfgInfra() {
  return state.infrastructure || [];
}
function ncfgSubs() {
  return state.subscriptions || [];
}
function ncfgAssets() {
  return state.assetLedger || [];
}
function ncfgWeeks() {
  return state.weeklyLog || [];
}
function ncfgContent() {
  return state.contentLog || [];
}
function ncfgAssetValue(x) {
  return ncfgNum(x.amount) * ncfgNum(x.fx, 1);
}
function ncfgStatusTone(status) {
  if (['已完成', '续费', '监控中', '进行中'].includes(status)) return 'good';
  if (['阻塞', '取消', '暂缓', '暂缓/法域核验', '待法律核验'].includes(status)) return 'bad';
  if (['待验证', '待盘点', '评估中', '降级'].includes(status)) return 'warn';
  return 'neutral';
}
function ncfgCashflow() {
  const p = ncfgProfile();
  const income = ncfgNum(p.monthlyIncome);
  const expense = ncfgNum(p.necessaryExpense);
  const invest = ncfgNum(p.monthlyInvest);
  const debt = ncfgNum(p.currentDebt);
  const cash = ncfgNum(p.emergencyCash);
  const months = ncfgNum(p.emergencyMonths, 6);
  const target = expense * months;
  const gap = Math.max(0, target - cash);
  const coverage = expense > 0 ? cash / expense : 0;
  const surplus = income - expense - invest;
  const rate = income > 0 ? (invest / income) * 100 : 0;
  return { income, expense, invest, debt, cash, months, target, gap, coverage, surplus, rate };
}
function ncfgSelection() {
  const c = ncfgCashflow();
  const tasks = ncfgTasks();
  const infra = ncfgInfra();
  const done = tasks.filter((x) => x.status === '已完成').length;
  const infraDone = infra.filter((x) => x.status === '已完成').length;
  const parts = [
    { label: '应急金覆盖', value: hosClamp(c.months ? (c.coverage / c.months) * 100 : 0) },
    { label: '90天路线', value: tasks.length ? (done / tasks.length) * 100 : 0 },
    { label: '设施完成', value: infra.length ? (infraDone / infra.length) * 100 : 0 },
    { label: '收入引擎', value: c.expense > 0 ? hosClamp((ncfgNum(ncfgProfile().sideIncome12w) / Math.max(1, c.expense * 3)) * 100) : 0 },
    { label: '执行评分', value: hosClamp(ncfgNum(ncfgProfile().executionScore)) }
  ];
  return { score: Math.round(hosAvg(parts, 'value')), parts, done, infraDone };
}
function ncfgAssetTotals() {
  const assets = ncfgAssets();
  const total = assets.reduce((s, x) => s + ncfgAssetValue(x), 0);
  const byBucket = {};
  assets.forEach((x) => { const key = x.bucket || '未分类'; byBucket[key] = (byBucket[key] || 0) + ncfgAssetValue(x); });
  return { total, byBucket, count: assets.length };
}

function renderNewConfigV2() {
  const p = ncfgProfile();
  const c = ncfgCashflow();
  const sel = ncfgSelection();
  return `${sectionHead('OLD VS NEW · 90-DAY EXECUTION', '成长总览', '先建立底层能力，再逐层增加资产、收入引擎、全球金融基础设施与跨境选择权。在下方工作区管理具体记录；能力层级在“新登”页查看。', `<button class="btn btn-outline" data-action="export-json">导出清单 ↓</button><button class="btn btn-primary" data-action="ncfg-add-cashflow">编辑现金流</button>`)}
  <div class="hos-shell ncfg-shell" data-tab-shell data-tab-key="newconfig" data-default-tab="overview">
    <div class="hos-bar ncfg-bar">
      <div class="fit-tabs ncfg-tabs" data-tabs role="tablist">${NCFG_TABS.map((t, i) => `<button class="fit-tab ${i === 0 ? 'active' : ''}" data-tab="${t.key}" role="tab">${t.label}</button>`).join('')}</div>
      <div class="hos-bar-actions"><span class="hos-badge">选择权 ${sel.score}/100</span><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="newconfig-90d">原始 Excel ↗</button></div>
    </div>
    <div class="fit-panel active" data-tab-panel="overview">${ncfgOverviewPanel(sel, c)}</div>
    <div class="fit-panel" data-tab-panel="cashflow">${ncfgCashflowPanel(c)}</div>
    <div class="fit-panel" data-tab-panel="roadmap">${ncfgRoadmapPanel()}</div>
    <div class="fit-panel" data-tab-panel="infra">${ncfgInfraPanel()}</div>
    <div class="fit-panel" data-tab-panel="subscriptions">${ncfgSubsPanel()}</div>
    <div class="fit-panel" data-tab-panel="assets">${ncfgAssetsPanel()}</div>
    <div class="fit-panel" data-tab-panel="content">${ncfgContentPanel()}</div>
  </div>`;
}

/* ---- 总览 ------------------------------------------------------------- */
function ncfgNextList(items) {
  return `<div class="ncfg-next-list">${items.map((x) => `<article class="ncfg-next-item ${x.tone}"><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div><button class="btn btn-small btn-outline" data-action="ncfg-goto" data-sheet="${x.sheet}">打开 ${esc((NCFG_TABS.find((t) => t.key === x.sheet) || {}).label || '')} →</button></article>`).join('')}</div>`;
}

function ncfgOverviewPanel(sel, c) {
  const tasks = ncfgTasks();
  const infra = ncfgInfra();
  const assets = ncfgAssetTotals();
  const subs = ncfgSubs();
  const content = ncfgContent();
  const weeks = ncfgWeeks();
  const next = [];
  const p0 = tasks.filter((x) => x.priority === 'P0' && x.status !== '已完成').slice(0, 2);
  p0.forEach((t) => next.push({ tone: 'warn', title: `P0 · ${t.task}`, text: t.action || t.evidence || '先完成这一项，再解锁上层配置。', sheet: 'roadmap' }));
  if (c.gap > 0) next.push({ tone: 'warn', title: `应急金缺口 ${money(c.gap)}`, text: `当前覆盖 ${hosRound(c.coverage, 1)} 个月，目标 ${c.months} 个月；先补安全垫，再扩大风险仓。`, sheet: 'cashflow' });
  const infraOpen = infra.filter((x) => x.status !== '已完成').slice(0, 2);
  infraOpen.forEach((x) => next.push({ tone: 'neutral', title: `设施 · ${x.category}`, text: x.next || '先核验资格、路径和成本。', sheet: 'infra' }));
  const cancelSubs = subs.filter((x) => x.decision === '取消' || x.decision === '降级');
  if (cancelSubs.length) next.push({ tone: 'bad', title: `${cancelSubs.length} 个订阅待取消/降级`, text: cancelSubs.map((x) => x.name).slice(0, 3).join('、'), sheet: 'subscriptions' });
  if (!next.length) next.push({ tone: 'good', title: '底盘项目暂无紧急缺口', text: '继续按 90 天路线执行，并保持应急金与投资资金分离。', sheet: 'roadmap' });
  return `<div class="hos-hero ncfg-hero"><div><span class="eyebrow">CHOICE, NOT COLLECTION</span><h2>真实选择权 ${sel.score}<small>/100</small></h2><p>${money(c.income)} 月收入 · 储蓄/投资率 ${pct(c.rate, 1)} · 应急金覆盖 ${hosRound(c.coverage, 1)}/${c.months} 个月 · 资产台账 ${money(assets.total)} · 路线完成 ${sel.done}/${tasks.length}。</p><div class="hos-hero-actions"><button class="btn btn-primary" data-action="ncfg-add-cashflow">编辑现金流参数</button><button class="btn btn-outline" data-action="ncfg-goto" data-sheet="roadmap">打开 90 天路线</button><button class="btn btn-outline" data-action="open-workbook" data-workbook-id="newconfig-90d">查看原始 Excel</button></div></div><div class="hos-hero-rings">${hosRing(sel.score, sel.score, '选择权进度', '按底盘/路线/设施/收入/执行计算')}${hosRing(c.months ? (c.coverage / c.months) * 100 : 0, `${hosRound(c.coverage, 1)}`, '应急金覆盖', `目标 ${c.months} 个月`)}</div></div>
  <div class="hos-kpis">${hosKpi('90 天里程碑', `${sel.done}/${tasks.length}`, '', '完成需留存证据', sel.done === tasks.length && tasks.length ? 'good' : '')}${hosKpi('应急金缺口', c.expense > 0 ? money(c.gap) : '—', '', c.expense > 0 ? (c.gap > 0 ? '先补安全垫' : '参考目标已覆盖') : '未录入必要支出', c.expense > 0 && c.gap > 0 ? 'warn' : '')}${hosKpi('资产台账', money(assets.total), '', `${assets.count} 条记录 · 不录凭证`, assets.count ? 'good' : '')}${hosKpi('内容/IP 收入', money(content.reduce((s, x) => s + ncfgNum(x.revenue), 0)), '', `${content.length} 条作品 · ${weeks.length} 周记录`)}</div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><span class="eyebrow">NEXT BEST ACTION</span><h3>下一步只做这些</h3><p>按 P0、应急金、设施与订阅风险自动排序；点击直接进入对应 sheet。</p></div></div>${ncfgNextList(next.slice(0, 5))}</section><section class="card"><div class="card-head"><div><span class="eyebrow">CHOICE SCORE</span><h3>选择权由什么构成</h3><p>不是资产标签数量；是底盘、路线、设施、收入引擎和执行的可核验程度。</p></div></div><div class="hos-condition-list">${sel.parts.map((x) => `<div><span>${esc(x.label)}</span><i><b style="width:${hosClamp(x.value, 0, 100)}%"></b></i><strong>${Math.round(x.value)}</strong></div>`).join('')}</div></section></div>
  <details class="page-fold ncfg-overview-fold"><summary><span>工作簿与更多入口</span><small>EXCEL / SYSTEM</small></summary><div class="page-fold-body">
  <section class="card ncfg-workbook-note"><div class="card-head"><div><h3>工作簿与总表</h3><p>原始 Excel 仍是完整备份；页面是日常执行视图，不替代工作簿里的公式与底稿。</p></div><button class="btn btn-small btn-outline" data-action="open-workbook" data-workbook-id="newconfig-90d">预览新登配置 Excel ↗</button></div></section>
  ${renderCapabilityQuickNav()}
  ${renderCapabilityPyramid()}
  </div></details>`;
}

/* ---- 现金流 ----------------------------------------------------------- */
function ncfgCashflowPanel(c) {
  const p = ncfgProfile();
  const spend = Math.max(1, c.expense + c.invest);
  const total = Math.max(1, c.income);
  const insights = [];
  if (!c.income && !c.expense) {
    insights.push({ tone: 'neutral', title: '还没有录入现金流', text: '先填税后收入、必要支出和计划投资；评分与应急金覆盖才有意义。' });
  } else {
    if (c.debt > 0) insights.push({ tone: 'warn', title: '先处理高息负债', text: `当前负债 ${money(c.debt)}；高息债未处理前，不宜加杠杆或投入大额低流动性资产。` });
    if (c.gap > 0) insights.push({ tone: 'warn', title: '应急金未覆盖目标', text: `目标 ${money(c.target)}，当前 ${money(c.cash)}，缺口 ${money(c.gap)}。应急金与投资资金分开。` });
    if (c.income > 0 && c.rate < ncfgNum(p.savingsRateTarget, 20)) insights.push({ tone: 'neutral', title: '储蓄/投资率低于自设目标', text: `当前 ${pct(c.rate, 1)}，目标 ${pct(ncfgNum(p.savingsRateTarget, 20), 0)}。先看必要支出和订阅，不先削减风险预算。` });
    if (c.surplus < 0) insights.push({ tone: 'bad', title: '月度现金流为负', text: `收入 − 必要支出 − 计划投资 = ${money(c.surplus)}；先降低固定支出或投资额。` });
    if (!insights.length) insights.push({ tone: 'good', title: '现金流结构暂无硬缺口', text: '保持应急金覆盖、正现金流和投资纪律；每月复核一次。' });
  }
  return `<div class="hos-lead"><span class="eyebrow">CASHFLOW · FOUNDATION</span><h2>先看现金流，不看资产标签</h2><p>收入、必要支出、计划投资、负债和应急金决定底盘。编辑后总览、90 天路线和资产配置会一起重算。</p></div>
  <div class="ncfg-cash-hero"><div><small>月收入</small><strong>${money(c.income)}</strong><span>税后</span></div><div><small>必要支出</small><strong>${money(c.expense)}</strong><span>${c.income ? pct((c.expense / c.income) * 100, 0) : '未录收入'}</span></div><div><small>计划投资</small><strong>${money(c.invest)}</strong><span>${pct(c.rate, 1)} 储蓄率</span></div><div><small>月结余</small><strong class="${c.surplus < 0 ? 'is-bad' : ''}">${money(c.surplus)}</strong><span>收入 − 支出 − 投资</span></div><div><small>应急金覆盖</small><strong>${hosRound(c.coverage, 1)}<em> 个月</em></strong><span>目标 ${c.months} 个月</span></div><div><small>应急金缺口</small><strong class="${c.gap > 0 ? 'is-warn' : ''}">${money(c.gap)}</strong><span>${c.gap > 0 ? '先补安全垫' : '已覆盖'}</span></div></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>月度现金流分配</h3><p>只按已录入的月收入、必要支出和计划投资计算；未计入偶发消费。</p></div><button class="btn btn-small btn-primary" data-action="ncfg-add-cashflow">编辑参数</button></div><div class="ncfg-split"><div class="ncfg-split-bar"><i class="expense" style="width:${hosClamp((c.expense / total) * 100, 0, 100)}%"></i><i class="invest" style="width:${hosClamp((c.invest / total) * 100, 0, 100)}%"></i></div><div class="ncfg-split-legend"><span><i class="expense"></i>必要支出 ${money(c.expense)}</span><span><i class="invest"></i>计划投资 ${money(c.invest)}</span><span><i class="free"></i>可支配结余 ${money(c.surplus)}</span></div></div><div class="ncfg-cash-note">支出率 ${c.income ? pct((c.expense / total) * 100, 0) : '—'} · 投资率 ${pct(c.rate, 1)} · 目标 ${pct(ncfgNum(p.savingsRateTarget, 20), 0)}</div></section><section class="card"><div class="card-head"><div><h3>执行参数</h3><p>这些数字会进入总览、路线与内容 ROI，不是装饰。</p></div><button class="btn btn-small btn-outline" data-action="ncfg-add-cashflow">编辑</button></div><div class="ncfg-param-grid"><div><span>AI 订阅成本/月</span><b>${money(ncfgNum(p.aiMonthlyCost))}</b></div><div><span>当前粉丝数</span><b>${ncfgNum(p.followers).toLocaleString()}</b></div><div><span>近 12 周副业收入</span><b>${money(ncfgNum(p.sideIncome12w))}</b></div><div><span>近 12 周执行均分</span><b>${hosRound(ncfgNum(p.executionScore), 0)}/100</b></div><div><span>当前负债</span><b>${money(ncfgNum(p.currentDebt))}</b></div><div><span>应急金现金</span><b>${money(ncfgNum(p.emergencyCash))}</b></div></div></section></div>
  <section class="card"><div class="card-head"><div><h3>底盘判断</h3><p>按当前参数自动生成，不引入未经验证的收入预测。</p></div></div>${hosInsightCards(insights)}</section>`;
}

/* ---- 90 天路线图 ------------------------------------------------------ */
function ncfgRoadmapPanel() {
  const tasks = ncfgTasks();
  const phases = [...new Set(tasks.map((x) => x.phase || '未分组'))];
  return `<div class="hos-lead"><span class="eyebrow">ROADMAP · 90 DAYS</span><h2>按依赖顺序执行</h2><p>状态可直接切换；具体动作、完成证据和退出标准点「编辑」查看。删除只用于误录或确认不再执行的任务。</p></div>
  <div class="hos-toolbar"><span class="hos-count">${tasks.filter((x) => x.status === '已完成').length}/${tasks.length} 已完成</span><button class="btn btn-primary" data-action="ncfg-add-task">＋ 新增任务</button></div>
  ${phases.map((phase) => {
    const items = tasks.map((t, i) => ({ ...t, index: i })).filter((t) => (t.phase || '未分组') === phase);
    const done = items.filter((t) => t.status === '已完成').length;
    return `<section class="card ncfg-phase" data-phase="${esc(phase)}"><div class="card-head"><div><h3>${esc(phase)}</h3><p>${done}/${items.length} 完成 · 证据与退出条件必须可核验</p></div><span class="tag ${done === items.length && items.length ? 'good' : 'neutral'}">${items.length ? Math.round((done / items.length) * 100) : 0}%</span></div><div class="ncfg-rows">${items.map((t) => `<article class="ncfg-row"><div class="ncfg-row-main"><div class="ncfg-row-title"><strong>${esc(t.task)}</strong>${tag(t.priority || 'P1', t.priority === 'P0' ? 'warn' : 'neutral')}</div><p>${esc(t.action || '')}</p><small>证据：${esc(t.evidence || '—')}</small><small>退出：${esc(t.exit || '—')}</small></div><div class="ncfg-row-side"><select class="table-select" data-ncfg-task-status="${t.index}" aria-label="任务状态">${NCFG_TASK_STATUS.map((s) => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-task" data-index="${t.index}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="task" data-index="${t.index}">删除</button></div></div></article>`).join('') || hosEmpty('这个阶段还没有任务。')}</div></section>`;
  }).join('') || hosEmpty('还没有路线图任务。', '<button class="btn btn-primary" data-action="ncfg-add-task">新增第一个任务</button>')}`;
}

/* ---- 设施清单 --------------------------------------------------------- */
function ncfgInfraPanel() {
  const infra = ncfgInfra();
  const filter = ui.ncfgInfraStatus || '全部';
  const statuses = ['全部', ...new Set([...NCFG_INFRA_STATUS, ...infra.map((x) => x.status).filter(Boolean)])];
  const rows = infra.map((x, i) => ({ ...x, index: i })).filter((x) => filter === '全部' || x.status === filter);
  return `<div class="hos-lead"><span class="eyebrow">INFRASTRUCTURE · OPTIONALITY</span><h2>设施清单不是购物车</h2><p>每条设施先核验资格、资金路径、监管实体、费用和税务；状态与下一步可以改，确认不做的条目可以删除。</p></div>
  <div class="hos-toolbar"><div class="hos-chips">${statuses.map((s) => `<button class="hos-chip ${filter === s ? 'is-on' : ''}" data-action="ncfg-infra-filter" data-status="${esc(s)}">${esc(s)}${s === '全部' ? `<small>${infra.length}</small>` : ''}</button>`).join('')}</div><button class="btn btn-primary" data-action="ncfg-add-infra">＋ 新增设施</button></div>
  <div class="ncfg-kpis">${hosKpi('已完成', infra.filter((x) => x.status === '已完成').length, '项', '真正落地')} ${hosKpi('待验证', infra.filter((x) => ['待验证', '待盘点', '待法律核验', '暂缓/法域核验'].includes(x.status)).length, '项', '先核验再投入')} ${hosKpi('监控中', infra.filter((x) => x.status === '监控中' || x.status === '进行中').length, '项', '持续维护')} ${hosKpi('总数', infra.length, '项', '覆盖资产/身份/公司/保险/产出')}</div>
  <div class="ncfg-rows ncfg-infra-rows">${rows.map((x) => `<article class="ncfg-row ncfg-infra-row"><div class="ncfg-row-main"><div class="ncfg-row-title"><strong>${esc(x.category)}</strong>${tag(x.priority || 'P1', x.priority === 'P0' ? 'warn' : 'neutral')}<span class="tag ${ncfgStatusTone(x.status)}">${esc(x.status || '未开始')}</span></div><p>${esc(x.next || '')}</p><small>复核：${esc(x.review || '—')} · 边界：${esc(x.guardrail || '—')}</small></div><div class="ncfg-row-side"><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-infra" data-index="${x.index}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="infra" data-index="${x.index}">删除</button></div></div></article>`).join('') || hosEmpty('当前筛选下没有设施。')}</div>`;
}

/* ---- 订阅 ROI -------------------------------------------------------- */
function ncfgSubsPanel() {
  const subs = ncfgSubs();
  const totalCost = subs.reduce((s, x) => s + ncfgNum(x.cost), 0);
  const totalValue = subs.reduce((s, x) => s + ncfgNum(x.hours) * ncfgNum(x.hourValue) + ncfgNum(x.revenue), 0);
  const cancel = subs.filter((x) => x.decision === '取消' || x.decision === '降级');
  return `<div class="hos-lead"><span class="eyebrow">SUBSCRIPTIONS · ROI</span><h2>AI 订阅按产出决定去留</h2><p>估值 = 节省小时 × 保守小时价值 + 可归因收入。连续 30 天没有使用或产出，取消/降级；不要为“看起来专业”付费。</p></div>
  <div class="ncfg-kpis">${hosKpi('月订阅成本', money(totalCost), '', `${subs.length} 项`, '')} ${hosKpi('估计价值', money(totalValue), '', '小时价值 + 归因收入')} ${hosKpi('价值/成本', totalCost ? `${(totalValue / totalCost).toFixed(2)}x` : '—', '', '低于 1x 需要理由')} ${hosKpi('待取消/降级', cancel.length, '项', cancel.map((x) => x.name).slice(0, 2).join('、') || '暂无', cancel.length ? 'warn' : 'good')}</div>
  <div class="hos-toolbar"><span class="hos-count">${subs.length} 条订阅</span><button class="btn btn-primary" data-action="ncfg-add-sub">＋ 新增订阅</button></div>
  <div class="ncfg-rows">${subs.map((x, i) => { const value = ncfgNum(x.hours) * ncfgNum(x.hourValue) + ncfgNum(x.revenue); const ratio = ncfgNum(x.cost) > 0 ? value / ncfgNum(x.cost) : 0; return `<article class="ncfg-row"><div class="ncfg-row-main"><div class="ncfg-row-title"><strong>${esc(x.name || '未命名订阅')}</strong><span class="tag ${ncfgStatusTone(x.decision)}">${esc(x.decision || '评估中')}</span></div><p>月费 ${money(ncfgNum(x.cost))} · 节省 ${ncfgNum(x.hours)} 小时 · 小时价值 ${money(ncfgNum(x.hourValue))} · 归因收入 ${money(ncfgNum(x.revenue))}</p></div><div class="ncfg-row-side"><div class="ncfg-metric"><b>${ratio.toFixed(2)}x</b><span>价值/成本</span></div><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-sub" data-index="${i}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="sub" data-index="${i}">删除</button></div></div></article>`; }).join('') || hosEmpty('还没有订阅记录。先添加一个正在付费的工具。')}</div>`;
}

/* ---- 资产台账 --------------------------------------------------------- */
function ncfgAssetsPanel() {
  const assets = ncfgAssets();
  const totals = ncfgAssetTotals();
  const buckets = Object.entries(totals.byBucket).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return `<div class="hos-lead"><span class="eyebrow">ASSET LEDGER</span><h2>先把资产与负债盘清楚</h2><p>一行一项资产或账户汇总；原币金额 × 汇率换算。只记账户简称、所在地、币种和备注，不录入密码、助记词、完整账号或证件号码。</p></div>
  <div class="ncfg-kpis">${hosKpi('人民币市值', money(totals.total), '', `${assets.length} 条记录`)} ${hosKpi('资产桶', buckets.length, '类', buckets.map(([k]) => k).slice(0, 2).join('、') || '未录入')} ${hosKpi('估值日期', assets[0] ? esc(assets[0].date || '—') : '—', '', '按最近录入')} ${hosKpi('覆盖率目标', '≥95%', '', '全量资产/负债盘点')}</div>
  <div class="hos-toolbar"><span class="hos-count">${money(totals.total)} 总市值</span><button class="btn btn-primary" data-action="ncfg-add-asset">＋ 新增资产</button></div>
  <div class="ncfg-bucket-bars">${buckets.map(([name, value]) => `<div><span>${esc(name)}</span><i><b style="width:${hosClamp((value / Math.max(1, totals.total)) * 100)}%;"></b></i><strong>${money(value)}</strong></div>`).join('') || hosEmpty('录入资产后会显示资产桶分布。')}</div>
  <div class="ncfg-rows">${assets.map((x, i) => `<article class="ncfg-row"><div class="ncfg-row-main"><div class="ncfg-row-title"><strong>${esc(x.bucket || '未分类')} · ${esc(x.account || '账户简称')}</strong><span class="tag neutral">${esc(x.jurisdiction || '—')}</span></div><p>${esc(x.date || '—')} · ${esc(x.currency || 'CNY')} ${ncfgNum(x.amount).toLocaleString()} × ${ncfgNum(x.fx, 1)} = ${money(ncfgAssetValue(x))}</p><small>${esc(x.note || '')}</small></div><div class="ncfg-row-side"><div class="ncfg-metric"><b>${money(ncfgAssetValue(x))}</b><span>人民币市值</span></div><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-asset" data-index="${i}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="asset" data-index="${i}">删除</button></div></div></article>`).join('') || hosEmpty('尚未录入资产。先盘点全量资产与负债。', '<button class="btn btn-primary" data-action="ncfg-add-asset">录入第一项资产</button>')}</div>`;
}

/* ---- 每周执行 --------------------------------------------------------- */
function ncfgWeeklyPanel() {
  const weeks = ncfgWeeks();
  const avg = (key) => weeks.length ? hosAvg(weeks, (x) => ncfgNum(x[key])) : 0;
  const last = weeks[0] || {};
  return `<div class="hos-lead"><span class="eyebrow">WEEKLY EXECUTION</span><h2>用每周真实输出代替感觉</h2><p>英语、训练、睡眠、内容、投资、副业、AI 成本和交付。每周只记一次，复盘时看趋势，不追求单周完美。</p></div>
  <div class="ncfg-kpis">${hosKpi('平均执行分', hosRound(avg('score'), 0), '/100', `${weeks.length} 周记录`)} ${hosKpi('最近一周', last.week ? esc(last.week) : '—', '', last.week ? `执行分 ${ncfgNum(last.score)}` : '还没有记录')} ${hosKpi('平均英语', hosRound(avg('englishMin'), 0), '分钟/周', '目标 180')} ${hosKpi('平均训练', hosRound(avg('training'), 1), '次/周', '目标 3 次')}</div>
  <div class="hos-toolbar"><span class="hos-count">${weeks.length} 周</span><button class="btn btn-primary" data-action="ncfg-add-week">＋ 新增本周</button></div>
  <div class="ncfg-week-grid">${weeks.map((x, i) => `<article class="ncfg-week-card"><header><div><strong>${esc(x.week || '未填日期')}</strong><small>执行分 ${ncfgNum(x.score)} / 100</small></div><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-week" data-index="${i}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="week" data-index="${i}">删除</button></div></header><div class="ncfg-week-metrics"><span>英语 <b>${ncfgNum(x.englishMin)}</b> 分</span><span>训练 <b>${ncfgNum(x.training)}</b> 次</span><span>睡眠 <b>${ncfgNum(x.sleep)}</b> h</span><span>内容 <b>${ncfgNum(x.posts)}</b> 条</span><span>投资 <b>${money(ncfgNum(x.invest))}</b></span><span>副业 <b>${money(ncfgNum(x.sideIncome))}</b></span><span>AI <b>${money(ncfgNum(x.aiCost))}</b></span><span>粉丝 <b>${ncfgNum(x.followersDelta) >= 0 ? '+' : ''}${ncfgNum(x.followersDelta)}</b></span><span>交付 <b>${ncfgNum(x.deliverables)}</b></span></div></article>`).join('') || hosEmpty('还没有周记录。先补最近一周。', '<button class="btn btn-primary" data-action="ncfg-add-week">录入本周</button>')}</div>`;
}

/* ---- 内容/IP ---------------------------------------------------------- */
function ncfgContentPanel() {
  const items = ncfgContent();
  const reach = items.reduce((s, x) => s + ncfgNum(x.reach), 0);
  const leads = items.reduce((s, x) => s + ncfgNum(x.leads), 0);
  const revenue = items.reduce((s, x) => s + ncfgNum(x.revenue), 0);
  const hours = items.reduce((s, x) => s + ncfgNum(x.hours), 0);
  return `<div class="hos-lead"><span class="eyebrow">CONTENT · IP · CASHFLOW</span><h2>内容不是发布量，是反馈与现金流</h2><p>每条内容/产品保留投入、反馈、线索与收入。连续 4 周没有正向信号，应调整受众、选题或分发，而不是机械更新。</p></div>
  <div class="ncfg-kpis">${hosKpi('作品数', items.length, '条', `${hours} 小时投入`)} ${hosKpi('总触达', reach.toLocaleString(), '', `线索 ${leads}`)} ${hosKpi('内容收入', money(revenue), '', `每投入小时 ${hours ? money(revenue / hours) : '—'}`)} ${hosKpi('线索转化', reach ? `${((leads / reach) * 100).toFixed(2)}%` : '—', '', '线索 / 触达')}</div>
  <div class="hos-toolbar"><span class="hos-count">${items.length} 条作品</span><button class="btn btn-primary" data-action="ncfg-add-content">＋ 新增作品</button></div>
  <div class="ncfg-content-grid">${items.map((x, i) => `<article class="ncfg-content-card"><header><div><span class="tag neutral">${esc(x.format || '内容')}</span><strong>${esc(x.topic || '未命名作品')}</strong><small>${esc(x.date || '—')}${x.url ? ` · <a href="${esc(x.url)}" target="_blank" rel="noopener">打开链接 ↗</a>` : ''}</small></div><div class="ncfg-actions"><button class="btn btn-small btn-outline" data-action="ncfg-edit-content" data-index="${i}">编辑</button><button class="btn btn-small btn-ghost" data-action="ncfg-delete" data-type="content" data-index="${i}">删除</button></div></header><div class="ncfg-content-metrics"><span>触达 <b>${ncfgNum(x.reach).toLocaleString()}</b></span><span>互动 <b>${ncfgNum(x.engagement).toLocaleString()}</b></span><span>涨粉 <b>${ncfgNum(x.followers)}</b></span><span>线索 <b>${ncfgNum(x.leads)}</b></span><span>收入 <b>${money(ncfgNum(x.revenue))}</b></span><span>成本 <b>${money(ncfgNum(x.cost))}</b></span></div>${x.review ? `<p class="ncfg-review">${esc(x.review)}</p>` : ''}</article>`).join('') || hosEmpty('还没有内容记录。第一条只需要填主题、形式和链接。', '<button class="btn btn-primary" data-action="ncfg-add-content">记录第一条作品</button>')}</div>`;
}

/* ---- 弹层 ------------------------------------------------------------- */
function ncfgOpenCashflow() {
  const p = ncfgProfile();
  const field = (name, label, value, attrs = '') => `<label class="fit-field"><span>${label}</span><input name="${name}" type="number" min="0" value="${ncfgNum(value)}" ${attrs}></label>`;
  hosOpenSheet('现金流与执行参数', '只录入真实数据；没有的数字留 0，不用估算填满。保存后总览、路线和资产判断会一起更新。', `<form id="ncfgCashflowForm" class="fit-form" autocomplete="off">
    <div class="fit-grid-2">${field('monthlyIncome', '税后月收入（元）', p.monthlyIncome)}${field('necessaryExpense', '必要月支出（元）', p.necessaryExpense)}${field('monthlyInvest', '每月计划投资/储蓄（元）', p.monthlyInvest)}${field('currentDebt', '当前负债余额（元）', p.currentDebt)}${field('emergencyCash', '应急金现金余额（元）', p.emergencyCash)}<label class="fit-field"><span>应急月数目标</span><select name="emergencyMonths">${[6, 9, 12].map((m) => `<option value="${m}" ${ncfgNum(p.emergencyMonths, 6) === m ? 'selected' : ''}>${m} 个月</option>`).join('')}</select></label>${field('savingsRateTarget', '储蓄/投资率目标（%）', p.savingsRateTarget, 'max="100"')}${field('aiMonthlyCost', 'AI 订阅成本合计/月（元）', p.aiMonthlyCost)}${field('followers', '当前粉丝数', p.followers)}${field('sideIncome12w', '近 12 周副业收入（元）', p.sideIncome12w)}${field('executionScore', '近 12 周执行均分（0–100）', p.executionScore, 'max="100"')}</div>
    <p class="hos-sheet-note">建议顺序：高息债 → 6–12 个月应急金 → 合规低成本核心资产 → 收入引擎 → 跨境基础设施。应急金与投资资金分开。</p>
    ${hosFormFoot('ncfg-save-cashflow', '保存现金流参数')}
  </form>`);
}
function ncfgOpenTask(index = -1) {
  const t = index >= 0 ? (ncfgTasks()[index] || {}) : { phase: '第1周', priority: 'P1', status: '未开始' };
  hosOpenSheet(index >= 0 ? '编辑路线图任务' : '新增路线图任务', '状态、证据和退出条件必须能持续核验；不要把“开始了解”写成已完成。', `<form id="ncfgTaskForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>阶段</span><input name="phase" value="${esc(t.phase || '第1周')}" placeholder="第1周 / 第2–3周"></label><label class="fit-field"><span>优先级</span><select name="priority">${NCFG_PRIORITIES.map((p) => `<option ${t.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="fit-field"><span>任务</span><input name="task" required value="${esc(t.task || '')}" placeholder="例如：完成个人资产与负债盘点"></label><label class="fit-field"><span>状态</span><select name="status">${NCFG_TASK_STATUS.map((s) => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div>
    <label class="fit-field fit-wide"><span>具体动作</span><textarea name="action" rows="2">${esc(t.action || '')}</textarea></label>
    <div class="fit-grid-2"><label class="fit-field"><span>完成证据</span><textarea name="evidence" rows="2">${esc(t.evidence || '')}</textarea></label><label class="fit-field"><span>退出/复盘标准</span><textarea name="exit" rows="2">${esc(t.exit || '')}</textarea></label></div>
    ${hosFormFoot('ncfg-save-task', index >= 0 ? '保存修改' : '添加任务')}</form>`);
}
function ncfgOpenInfra(index = -1) {
  const x = index >= 0 ? (ncfgInfra()[index] || {}) : { priority: 'P1', status: '未开始' };
  hosOpenSheet(index >= 0 ? '编辑设施' : '新增设施', '先写清资格、路径、成本和边界；没有真实用途的设施先不启用。', `<form id="ncfgInfraForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>事项/类别</span><input name="category" required value="${esc(x.category || '')}" placeholder="例如：海外券商账户"></label><label class="fit-field"><span>优先级</span><select name="priority">${NCFG_PRIORITIES.map((p) => `<option ${x.priority === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label><label class="fit-field"><span>状态</span><select name="status">${NCFG_INFRA_STATUS.map((s) => `<option ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="fit-field"><span>复核周期</span><input name="review" value="${esc(x.review || '')}" placeholder="每月 / 每季度"></label></div>
    <label class="fit-field fit-wide"><span>下一步具体动作</span><textarea name="next" rows="2">${esc(x.next || '')}</textarea></label>
    <label class="fit-field fit-wide"><span>纪律/风险边界</span><textarea name="guardrail" rows="2">${esc(x.guardrail || '')}</textarea></label>
    ${hosFormFoot('ncfg-save-infra', index >= 0 ? '保存修改' : '添加设施')}</form>`);
}
function ncfgOpenSub(index = -1) {
  const x = index >= 0 ? (ncfgSubs()[index] || {}) : { decision: '评估中' };
  hosOpenSheet(index >= 0 ? '编辑订阅' : '新增订阅', '价值 = 节省小时 × 保守小时价值 + 可归因收入。没有产出的工具不因为“专业”而续费。', `<form id="ncfgSubForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>工具/服务</span><input name="name" required value="${esc(x.name || '')}"></label><label class="fit-field"><span>续费决策</span><select name="decision">${['评估中', '续费', '降级', '取消'].map((s) => `<option ${x.decision === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="fit-field"><span>月费（元）</span><input name="cost" type="number" min="0" value="${ncfgNum(x.cost)}"></label><label class="fit-field"><span>每月节省小时</span><input name="hours" type="number" min="0" step="0.5" value="${ncfgNum(x.hours)}"></label><label class="fit-field"><span>保守小时价值（元）</span><input name="hourValue" type="number" min="0" value="${ncfgNum(x.hourValue)}"></label><label class="fit-field"><span>可归因收入（元）</span><input name="revenue" type="number" min="0" value="${ncfgNum(x.revenue)}"></label></div>
    ${hosFormFoot('ncfg-save-sub', index >= 0 ? '保存修改' : '添加订阅')}</form>`);
}
function ncfgOpenAsset(index = -1) {
  const x = index >= 0 ? (ncfgAssets()[index] || {}) : { date: todayKey(), currency: 'CNY', fx: 1 };
  hosOpenSheet(index >= 0 ? '编辑资产' : '新增资产', '只记录账户简称、所在地、币种、金额和备注；不要录入密码、助记词、完整账号或证件号码。', `<form id="ncfgAssetForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>估值日期</span><input name="date" type="date" value="${esc(x.date || todayKey())}"></label><label class="fit-field"><span>资产桶</span><input name="bucket" value="${esc(x.bucket || '')}" placeholder="现金 / 股票 / 债券 / 黄金 / 房产"></label><label class="fit-field"><span>账户/平台简称</span><input name="account" value="${esc(x.account || '')}" placeholder="不要填完整账号"></label><label class="fit-field"><span>所在地/法域</span><input name="jurisdiction" value="${esc(x.jurisdiction || '')}"></label><label class="fit-field"><span>币种</span><input name="currency" value="${esc(x.currency || 'CNY')}"></label><label class="fit-field"><span>原币金额</span><input name="amount" type="number" step="any" value="${ncfgNum(x.amount)}"></label><label class="fit-field"><span>人民币/原币汇率</span><input name="fx" type="number" step="0.0001" value="${ncfgNum(x.fx, 1)}"></label><label class="fit-field"><span>备注</span><input name="note" value="${esc(x.note || '')}"></label></div>
    ${hosFormFoot('ncfg-save-asset', index >= 0 ? '保存修改' : '添加资产')}</form>`);
}
function ncfgOpenWeek(index = -1) {
  const x = index >= 0 ? (ncfgWeeks()[index] || {}) : { week: todayKey() };
  const num = (name, label, step = '1') => `<label class="fit-field"><span>${label}</span><input name="${name}" type="number" step="${step}" min="0" value="${ncfgNum(x[name])}"></label>`;
  hosOpenSheet(index >= 0 ? '编辑每周执行' : '新增每周执行', '每周只记一次；不会把没有记录的周自动补成 0 或完成。', `<form id="ncfgWeekForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <label class="fit-field fit-wide"><span>周起始日期</span><input name="week" type="date" value="${esc(x.week || todayKey())}"></label>
    <div class="fit-grid-2">${num('englishMin', '英语分钟')}${num('training', '训练次数')}${num('sleep', '平均睡眠（小时）', '0.1')}${num('posts', '内容条数')}${num('invest', '投资额（元）')}${num('sideIncome', '副业收入（元）')}${num('aiCost', 'AI 月费（元）')}${num('followersDelta', '粉丝净增')}${num('deliverables', 'AI/代码交付')}${num('score', '执行分（0–100）')}</div>
    ${hosFormFoot('ncfg-save-week', index >= 0 ? '保存修改' : '添加本周')}</form>`);
}
function ncfgOpenContent(index = -1) {
  const x = index >= 0 ? (ncfgContent()[index] || {}) : { date: todayKey() };
  const num = (name, label, step = '1') => `<label class="fit-field"><span>${label}</span><input name="${name}" type="number" step="${step}" min="0" value="${ncfgNum(x[name])}"></label>`;
  hosOpenSheet(index >= 0 ? '编辑内容作品' : '新增内容作品', '至少记录主题、形式、触达和线索；收入没有就留 0，不虚构。', `<form id="ncfgContentForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>发布日期</span><input name="date" type="date" value="${esc(x.date || todayKey())}"></label><label class="fit-field"><span>交付形式</span><input name="format" value="${esc(x.format || '')}" placeholder="文章 / 视频 / 代码 / 产品"></label><label class="fit-field"><span>主题/栏目</span><input name="topic" required value="${esc(x.topic || '')}"></label><label class="fit-field"><span>链接/文件</span><input name="url" value="${esc(x.url || '')}"></label><label class="fit-field"><span>投入小时</span><input name="hours" type="number" step="0.1" min="0" value="${ncfgNum(x.hours)}"></label><label class="fit-field"><span>成本（元）</span><input name="cost" type="number" min="0" value="${ncfgNum(x.cost)}"></label></div>
    <div class="fit-grid-2">${num('reach', '阅读/播放')}${num('engagement', '互动/收藏')}${num('followers', '新增关注')}${num('leads', '咨询/线索')}${num('revenue', '收入（元）')}</div>
    <label class="fit-field fit-wide"><span>复盘</span><textarea name="review" rows="3">${esc(x.review || '')}</textarea></label>
    ${hosFormFoot('ncfg-save-content', index >= 0 ? '保存修改' : '添加作品')}</form>`);
}

/* ---- 保存与删除 ------------------------------------------------------- */
function ncfgFd(form) {
  return new FormData(form);
}
function ncfgSaveCashflow() {
  const form = $('#ncfgCashflowForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const p = ncfgProfile();
  ['monthlyIncome', 'necessaryExpense', 'monthlyInvest', 'currentDebt', 'emergencyCash', 'savingsRateTarget', 'aiMonthlyCost', 'followers', 'sideIncome12w', 'executionScore'].forEach((k) => { p[k] = ncfgNum(fd.get(k)); });
  p.emergencyMonths = ncfgNum(fd.get('emergencyMonths'), 6);
  hosCloseSheet();
  saveAndRender('现金流参数已保存，总览与判断已更新');
}
function ncfgSaveTask() {
  const form = $('#ncfgTaskForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const task = { phase: String(fd.get('phase') || '').trim() || '未分组', task: String(fd.get('task') || '').trim(), action: String(fd.get('action') || ''), evidence: String(fd.get('evidence') || ''), priority: String(fd.get('priority') || 'P1'), status: String(fd.get('status') || '未开始'), exit: String(fd.get('exit') || '') };
  if (!task.task) { toast('请填写任务名称', true); return; }
  state.tasks = state.tasks || [];
  if (i >= 0 && state.tasks[i]) state.tasks[i] = task; else state.tasks.unshift(task);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '任务已更新' : '任务已添加');
}
function ncfgSaveInfra() {
  const form = $('#ncfgInfraForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const item = { category: String(fd.get('category') || '').trim(), priority: String(fd.get('priority') || 'P1'), status: String(fd.get('status') || '未开始'), next: String(fd.get('next') || ''), review: String(fd.get('review') || ''), guardrail: String(fd.get('guardrail') || '') };
  if (!item.category) { toast('请填写事项/类别', true); return; }
  state.infrastructure = state.infrastructure || [];
  if (i >= 0 && state.infrastructure[i]) state.infrastructure[i] = item; else state.infrastructure.unshift(item);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '设施已更新' : '设施已添加');
}
function ncfgSaveSub() {
  const form = $('#ncfgSubForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const item = { name: String(fd.get('name') || '').trim(), cost: ncfgNum(fd.get('cost')), hours: ncfgNum(fd.get('hours')), hourValue: ncfgNum(fd.get('hourValue')), revenue: ncfgNum(fd.get('revenue')), decision: String(fd.get('decision') || '评估中') };
  if (!item.name) { toast('请填写工具/服务名称', true); return; }
  state.subscriptions = state.subscriptions || [];
  if (i >= 0 && state.subscriptions[i]) state.subscriptions[i] = item; else state.subscriptions.unshift(item);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '订阅已更新' : '订阅已添加');
}
function ncfgSaveAsset() {
  const form = $('#ncfgAssetForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const item = { date: String(fd.get('date') || ''), bucket: String(fd.get('bucket') || ''), account: String(fd.get('account') || ''), jurisdiction: String(fd.get('jurisdiction') || ''), currency: String(fd.get('currency') || 'CNY'), amount: ncfgNum(fd.get('amount')), fx: ncfgNum(fd.get('fx'), 1), note: String(fd.get('note') || '') };
  state.assetLedger = state.assetLedger || [];
  if (i >= 0 && state.assetLedger[i]) state.assetLedger[i] = item; else state.assetLedger.unshift(item);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '资产已更新' : '资产已添加');
}
function ncfgSaveWeek() {
  const form = $('#ncfgWeekForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const item = { week: String(fd.get('week') || ''), englishMin: ncfgNum(fd.get('englishMin')), training: ncfgNum(fd.get('training')), sleep: ncfgNum(fd.get('sleep')), posts: ncfgNum(fd.get('posts')), invest: ncfgNum(fd.get('invest')), sideIncome: ncfgNum(fd.get('sideIncome')), aiCost: ncfgNum(fd.get('aiCost')), followersDelta: ncfgNum(fd.get('followersDelta')), deliverables: ncfgNum(fd.get('deliverables')), score: ncfgNum(fd.get('score')) };
  state.weeklyLog = state.weeklyLog || [];
  if (i >= 0 && state.weeklyLog[i]) state.weeklyLog[i] = item; else state.weeklyLog.unshift(item);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '每周记录已更新' : '每周记录已添加');
}
function ncfgSaveContent() {
  const form = $('#ncfgContentForm');
  if (!form) return;
  const fd = ncfgFd(form);
  const i = ncfgNum(fd.get('index'), -1);
  const item = { date: String(fd.get('date') || ''), topic: String(fd.get('topic') || '').trim(), format: String(fd.get('format') || ''), url: String(fd.get('url') || ''), hours: ncfgNum(fd.get('hours')), cost: ncfgNum(fd.get('cost')), reach: ncfgNum(fd.get('reach')), engagement: ncfgNum(fd.get('engagement')), followers: ncfgNum(fd.get('followers')), leads: ncfgNum(fd.get('leads')), revenue: ncfgNum(fd.get('revenue')), review: String(fd.get('review') || '') };
  if (!item.topic) { toast('请填写主题/栏目', true); return; }
  state.contentLog = state.contentLog || [];
  if (i >= 0 && state.contentLog[i]) state.contentLog[i] = item; else state.contentLog.unshift(item);
  hosCloseSheet();
  saveAndRender(i >= 0 ? '内容作品已更新' : '内容作品已添加');
}
function ncfgDelete(type, index) {
  const map = { task: ['tasks', '任务'], infra: ['infrastructure', '设施'], sub: ['subscriptions', '订阅'], asset: ['assetLedger', '资产'], week: ['weeklyLog', '每周记录'], content: ['contentLog', '内容作品'] };
  const entry = map[type];
  if (!entry) return;
  const [key, label] = entry;
  const arr = state[key] || [];
  const i = ncfgNum(index, -1);
  if (i < 0 || !arr[i]) return;
  if (!confirm(`确认删除这条${label}？删除后不能恢复；如只是暂停，请改为暂缓/取消状态。`)) return;
  arr.splice(i, 1);
  saveAndRender(`${label}已删除`);
}
function ncfgGoto(sheet) {
  const root = document.querySelector('[data-tab-key="newconfig"]');
  const btn = root?.querySelector(`[data-tab="${sheet}"]`);
  if (btn) btn.click();
  else {
    try { sessionStorage.setItem('wealthos-tab-newconfig', sheet); } catch (_) {}
    renderPage('newconfig');
  }
}

/* ---- 事件 ------------------------------------------------------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('ncfg-')) return;
  if (a === 'ncfg-goto') { ncfgGoto(btn.dataset.sheet); return; }
  if (a === 'ncfg-add-cashflow') { ncfgOpenCashflow(); return; }
  if (a === 'ncfg-save-cashflow') { ncfgSaveCashflow(); return; }
  if (a === 'ncfg-add-task') { ncfgOpenTask(); return; }
  if (a === 'ncfg-edit-task') { ncfgOpenTask(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-task') { ncfgSaveTask(); return; }
  if (a === 'ncfg-add-infra') { ncfgOpenInfra(); return; }
  if (a === 'ncfg-edit-infra') { ncfgOpenInfra(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-infra') { ncfgSaveInfra(); return; }
  if (a === 'ncfg-add-sub') { ncfgOpenSub(); return; }
  if (a === 'ncfg-edit-sub') { ncfgOpenSub(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-sub') { ncfgSaveSub(); return; }
  if (a === 'ncfg-add-asset') { ncfgOpenAsset(); return; }
  if (a === 'ncfg-edit-asset') { ncfgOpenAsset(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-asset') { ncfgSaveAsset(); return; }
  if (a === 'ncfg-add-week') { ncfgOpenWeek(); return; }
  if (a === 'ncfg-edit-week') { ncfgOpenWeek(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-week') { ncfgSaveWeek(); return; }
  if (a === 'ncfg-add-content') { ncfgOpenContent(); return; }
  if (a === 'ncfg-edit-content') { ncfgOpenContent(ncfgNum(btn.dataset.index, -1)); return; }
  if (a === 'ncfg-save-content') { ncfgSaveContent(); return; }
  if (a === 'ncfg-delete') { ncfgDelete(btn.dataset.type, btn.dataset.index); return; }
  if (a === 'ncfg-infra-filter') { ui.ncfgInfraStatus = btn.dataset.status || '全部'; renderPage('newconfig'); return; }
});
document.addEventListener('change', (e) => {
  if (e.target.matches?.('[data-ncfg-task-status]')) {
    const i = ncfgNum(e.target.dataset.ncfgTaskStatus, -1);
    if (i >= 0 && state.tasks[i]) { state.tasks[i].status = e.target.value; saveAndRender('路线图状态已保存'); }
  }
});

function renderXinDeng() {
  return `${sectionHead('GROWTH FOUNDATION', '新登', '先建立底盘，再逐层积累能力与选择权。')}<div class="xindeng-foundation" aria-label="成长核心能力">${renderCapabilityPyramid()}</div>`;
}
