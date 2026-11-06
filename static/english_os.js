/* ============================================================================
   English OS · 英语工作台
   结构：概览 / 学习记录 / 复盘
   - 每周 180 分钟目标、输出率、连续学习、技能分布
   - 学习记录卡片化，新增/编辑/删除全部使用弹层
   - TypeWords 仅作外部练习入口，不读取其账号或数据
   ========================================================================== */

const ENG_SKILLS = ['综合', '词汇/跟写', '阅读', '听力', '口语复述', '写作', '真实工作输出'];
const ENG_TARGET = 180;

function engLogs() {
  return Array.isArray(state.englishLogs) ? state.englishLogs : (state.englishLogs = []);
}
function engIndexed() {
  return engLogs().map((x, i) => ({ ...x, _i: i })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b._i - a._i);
}
function engStreak() {
  const logs = engLogs();
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = shiftDateKey(hosToday(), -i);
    if (logs.some((x) => x.date === date)) streak += 1;
    else break;
  }
  return streak;
}
function engStats() {
  const logs = engLogs();
  const today = hosToday();
  const weekStart = shiftDateKey(today, -6);
  const week = logs.filter((x) => x.date >= weekStart && x.date <= today);
  const weekMinutes = hosSum(week, 'minutes');
  const total = hosSum(logs, 'minutes');
  const outputs = logs.filter((x) => String(x.output || '').trim()).length;
  const activeDays = new Set(logs.map((x) => x.date).filter(Boolean)).size;
  const outputRate = logs.length ? Math.round((outputs / logs.length) * 100) : 0;
  const bySkill = ENG_SKILLS.map((skill) => {
    const items = logs.filter((x) => (x.skill || '综合') === skill);
    return { skill, count: items.length, minutes: hosSum(items, 'minutes') };
  }).filter((x) => x.count);
  const topSkill = [...bySkill].sort((a, b) => b.minutes - a.minutes)[0] || null;
  const dates = hosDates(14);
  const daily = dates.map((d) => hosSum(logs.filter((x) => x.date === d), 'minutes'));
  const weeks = groupedWeekStarts(8);
  const weekly = weeks.map((w) => {
    const end = shiftDateKey(w, 6);
    return hosSum(logs.filter((x) => x.date >= w && x.date <= end), 'minutes');
  });
  return { logs, week, weekMinutes, total, outputs, activeDays, outputRate, bySkill, topSkill, dates, daily, weeks, weekly, streak: engStreak() };
}
function engInsights(stats) {
  const out = [];
  if (!stats.logs.length) return [{ tone: 'neutral', title: '还没有英语学习记录', text: '先完成一次 20–30 分钟的短练习，并留下一项可见输出。没有记录时所有统计按 0 处理。' }];
  if (stats.weekMinutes < ENG_TARGET) out.push({ tone: 'warn', title: '本周目标还差一段', text: `近 7 天 ${stats.weekMinutes} 分钟，目标 ${ENG_TARGET} 分钟，还差 ${ENG_TARGET - stats.weekMinutes} 分钟。优先安排 2 次 30 分钟输出练习。` });
  else out.push({ tone: 'good', title: '本周时长达标', text: `近 7 天 ${stats.weekMinutes} 分钟。接下来看输出质量，而不是继续堆时长。` });
  if (stats.outputRate < 80) out.push({ tone: 'warn', title: '输出率偏低', text: `只有 ${stats.outputRate}% 的记录留下了可复用输出。每次练习至少写摘要、复述、邮件草稿或术语卡之一。` });
  if (stats.topSkill && stats.total && stats.topSkill.minutes / stats.total > 0.7) out.push({ tone: 'neutral', title: `训练集中在「${stats.topSkill.skill}」`, text: '单一技能占比超过 70%。可以加入口语复述或真实工作输出，形成输入到输出的闭环。' });
  if (stats.activeDays < 3) out.push({ tone: 'neutral', title: '学习频率偏低', text: `目前只有 ${stats.activeDays} 天有记录。与其一次学很久，不如每周 3–5 次短练习。` });
  return out.slice(0, 4);
}
function engSkillTone(skill) {
  return skill === '真实工作输出' ? 'good' : skill === '口语复述' || skill === '写作' ? 'warn' : 'neutral';
}

function renderEnglishV2() {
  const s = engStats();
  return `${sectionHead('ENGLISH · INPUT TO REUSABLE OUTPUT', '英语', '把阅读、听力、词汇输入转化为可复用的写作、口语复述、项目说明与公开作品。新增和编辑都在弹层完成，列表只保留可扫描的记录。', `<button class="btn btn-outline" data-action="capability-page" data-page="home">← 返回今日工作台</button><button class="btn btn-primary" data-action="eng-add-log">＋ 新增学习记录</button>`)}
  <div class="hos-shell" data-tab-shell data-tab-key="english" data-default-tab="overview">
    <div class="hos-bar"><div class="fit-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="overview" role="tab">概览</button>
      <button class="fit-tab" data-tab="logs" role="tab">学习记录</button>
      <button class="fit-tab" data-tab="review" role="tab">复盘</button>
    </div><div class="hos-bar-actions"><span class="hos-badge">本周 ${s.weekMinutes}/${ENG_TARGET} 分钟</span><a class="btn btn-small btn-outline" href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">TypeWords ↗</a></div></div>
    <div class="fit-panel active" data-tab-panel="overview">${engOverviewPanel(s)}</div>
    <div class="fit-panel" data-tab-panel="logs">${engLogsPanel(s)}</div>
    <div class="fit-panel" data-tab-panel="review">${engReviewPanel(s)}</div>
  </div>`;
}
function engOverviewPanel(s) {
  return `<div class="hos-hero"><div><span class="eyebrow">WEEKLY TARGET · OUTPUT FIRST</span><h2>${s.weekMinutes}<small> / ${ENG_TARGET} 分钟</small></h2><p>本周目标进度 ${hosClamp((s.weekMinutes / ENG_TARGET) * 100)}%。建议节奏：词汇/跟写 30 分钟 · 真实材料输入 60 分钟 · 复述/写作/项目输出 60 分钟 · 复盘 30 分钟。</p><div class="hos-hero-actions"><button class="btn btn-primary" data-action="eng-add-log">记录一次练习</button><a class="btn btn-outline" href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">打开 TypeWords</a><button class="btn btn-outline" data-action="eng-export">导出学习记录 ↓</button></div></div><div class="hos-hero-rings">${hosRing((s.weekMinutes / ENG_TARGET) * 100, s.weekMinutes, '本周分钟', `目标 ${ENG_TARGET}`)}${hosRing(s.outputRate, `${s.outputRate}%`, '输出率', `${s.outputs}/${s.logs.length} 条有输出`)}</div></div>
  <div class="hos-kpis">${hosKpi('累计学习', s.total, '分钟', `${s.logs.length} 条记录`)}${hosKpi('连续学习', s.streak, '天', '从今天往前计算')}${hosKpi('活跃天数', s.activeDays, '天', '至少有一条记录')}${hosKpi('本周输出', s.outputs, '项', '有具体成果的记录')}</div>
  ${renderCapabilityAnalytics({ title: '英语能力', metric: '学习分钟', dailyValues: s.daily, dailyLabels: s.dates.map((d) => d.slice(5)), weeklyValues: s.weekly, weeklyLabels: s.weeks.map((d) => d.slice(5)), checkinsToday: s.logs.filter((x) => x.date === hosToday()).length, checkinsWeek: s.week.length })}
  <section class="card"><div class="card-head"><div><span class="eyebrow">INPUT → RETELL → OUTPUT → REUSE</span><h3>四步训练路径</h3><p>建议每周 3–5 次短练习，至少形成一份可复用输出。</p></div></div><div class="english-stage-grid"><article><b>01 · 输入</b><p>听读真实材料，提取高频表达和可复用句型。</p></article><article><b>02 · 转述</b><p>不看原文复述核心观点，记录卡壳表达。</p></article><article><b>03 · 输出</b><p>写摘要、项目文档、邮件或做 2–5 分钟口头表达。</p></article><article><b>04 · 复用</b><p>将好句、模板和术语整理进个人表达库。</p></article></div></section>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>TypeWords · 外部练习入口</h3><p>单词、文章跟写与逐句练习；本工作台不读取其账号或练习数据。</p></div></div><div class="english-tool"><div class="english-tool-mark">Aa</div><div><div class="eyebrow">EXTERNAL LEARNING TOOL</div><h4>把输入练习留给 TypeWords，把输出记录留在这里</h4><p>打开外部页面练习，回到本页记录时长、输出成果和下一步。</p><a class="btn btn-small btn-outline" href="https://typewords.cc/" target="_blank" rel="noopener noreferrer">打开 TypeWords ↗</a></div></div></section><section class="card"><div class="card-head"><div><h3>本周最值得调整的事</h3><p>按真实记录计算。</p></div></div>${hosInsightCards(engInsights(s))}</section></div>`;
}
function engLogsPanel(s) {
  const filter = ui.engSkill || '全部';
  const skills = ['全部', ...ENG_SKILLS];
  const rows = engIndexed().filter((x) => filter === '全部' || (x.skill || '综合') === filter);
  return `<div class="hos-lead"><span class="eyebrow">LEARNING LOG</span><h2>每次练习留下一个可复用成果</h2><p>记录日期、训练类型、时长、输出成果和卡住的表达。列表按日期倒序；编辑与删除不再占用页面空间。</p></div>
  <div class="hos-toolbar"><div class="hos-chips">${skills.map((sk) => `<button class="hos-chip ${filter === sk ? 'is-on' : ''}" data-action="eng-filter" data-skill="${esc(sk)}">${esc(sk)}${sk === '全部' ? `<small>${s.logs.length}</small>` : ''}</button>`).join('')}</div><button class="btn btn-primary" data-action="eng-add-log">＋ 新增记录</button></div>
  <div class="eng-log-list">${rows.map((x) => `<article class="eng-log-card"><header><div><span class="tag ${engSkillTone(x.skill)}">${esc(x.skill || '综合')}</span><small>${esc(x.date || '—')} · ${hosNum(x.minutes)} 分钟</small></div><div class="eng-log-actions"><button class="btn btn-small btn-outline" data-action="eng-edit-log" data-index="${x._i}">编辑</button><button class="btn btn-small btn-ghost" data-action="eng-delete-log" data-index="${x._i}">删除</button></div></header><strong>${esc(x.output || '未填写输出成果')}</strong>${x.note ? `<p>${esc(x.note)}</p>` : ''}</article>`).join('') || hosEmpty('当前筛选下没有记录。', '<button class="btn btn-primary" data-action="eng-add-log">记录第一次练习</button>')}</div>`;
}
function engReviewPanel(s) {
  const labels = s.dates.map((d) => d.slice(5));
  const skillTotal = Math.max(1, s.bySkill.reduce((a, b) => a + b.minutes, 0));
  return `<div class="hos-lead"><span class="eyebrow">REVIEW · 14 DAYS</span><h2>时长、输出与技能结构</h2><p>不把学习时长当成唯一指标；输出率、技能覆盖和连续频率更能说明是否形成可复用能力。</p></div>
  <div class="hos-kpis">${hosKpi('近 14 天', hosSum(s.logs.filter((x) => s.dates.includes(x.date)), 'minutes'), '分钟', '按记录日期统计')}${hosKpi('输出率', `${s.outputRate}%`, '', `${s.outputs}/${s.logs.length} 条有成果`)}${hosKpi('平均每次', s.logs.length ? hosRound(s.total / s.logs.length, 0) : '—', '分钟', '总时长 / 记录数')}${hosKpi('主要技能', s.topSkill ? s.topSkill.skill : '—', '', s.topSkill ? `${s.topSkill.minutes} 分钟` : '暂无记录')}</div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>近 14 天学习分钟</h3><p>空白表示当天没有记录。</p></div></div>${hosBarChart(s.daily, labels, { target: 26, unit: 'min', height: 150 })}</section><section class="card"><div class="card-head"><div><h3>技能时长结构</h3><p>观察是否长期只做输入、缺少输出。</p></div></div><div class="eng-skill-bars">${s.bySkill.map((x) => `<div><span>${esc(x.skill)}</span><i><b style="width:${(x.minutes / skillTotal) * 100}%"></b></i><strong>${x.minutes} 分钟</strong><small>${x.count} 次</small></div>`).join('') || hosEmpty('还没有技能记录。')}</div></section></div>
  <section class="card"><div class="card-head"><div><h3>复盘提示</h3><p>按当前记录生成，不虚构未记录的学习。</p></div></div>${hosInsightCards(engInsights(s))}</section>`;
}

/* ---- 弹层 ------------------------------------------------------------- */
function engOpenLog(index = -1) {
  const item = index >= 0 ? (engLogs()[index] || {}) : { date: hosToday(), skill: '综合', minutes: 30 };
  hosOpenSheet(index >= 0 ? '编辑英语学习记录' : '新增英语学习记录', '每次练习至少留下一项可见成果，例如摘要、口头复述、邮件草稿或术语卡。', `<form id="engLogForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(item.date || hosToday())}"></label><label class="fit-field"><span>训练类型</span>${hosSelect('skill', item.skill || '综合', ENG_SKILLS)}</label><label class="fit-field"><span>学习分钟</span><input type="number" name="minutes" min="1" max="600" value="${hosNum(item.minutes, 30)}"></label></div>
    <label class="fit-field fit-wide"><span>输出成果</span><input name="output" required value="${esc(item.output || '')}" placeholder="例如：用英文写了项目周报 / 复述一篇文章"></label>
    <label class="fit-field fit-wide"><span>复盘 / 新表达</span><textarea name="note" rows="3" placeholder="卡住的表达、值得复用的句型、下一步">${esc(item.note || '')}</textarea></label>
    ${hosFormFoot('eng-save-log', index >= 0 ? '保存修改' : '保存学习记录')}
  </form>`);
}
function engSaveLog() {
  const form = $('#engLogForm');
  if (!form) return;
  const fd = new FormData(form);
  const i = hosNum(fd.get('index'), -1);
  const output = String(fd.get('output') || '').trim();
  if (!output) { toast('请填写输出成果', true); return; }
  const item = { id: i >= 0 && engLogs()[i] ? engLogs()[i].id : Date.now(), date: String(fd.get('date') || hosToday()), skill: String(fd.get('skill') || '综合'), minutes: hosNum(fd.get('minutes'), 0), output, note: String(fd.get('note') || '') };
  if (i >= 0 && engLogs()[i]) engLogs()[i] = item; else engLogs().unshift(item);
  hosCloseSheet();
  try { sessionStorage.setItem('wealthos-tab-english', 'logs'); } catch (_) {}
  saveAndRender(i >= 0 ? '英语记录已更新' : '英语记录已保存');
}
function engDelete(index) {
  const i = hosNum(index, -1);
  if (i < 0 || !engLogs()[i]) return;
  deleteWithUndo(engLogs(), i, '英语记录');
}
function engExport() {
  const header = ['日期', '训练类型', '分钟', '输出成果', '复盘/新表达'];
  const rows = engIndexed().map((x) => [x.date, x.skill, x.minutes, x.output, x.note]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `english-log-${hosToday()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('英语学习记录已导出 CSV');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('eng-')) return;
  if (a === 'eng-add-log') { engOpenLog(); return; }
  if (a === 'eng-edit-log') { engOpenLog(hosNum(btn.dataset.index, -1)); return; }
  if (a === 'eng-save-log') { engSaveLog(); return; }
  if (a === 'eng-delete-log') { engDelete(btn.dataset.index); return; }
  if (a === 'eng-filter') { ui.engSkill = btn.dataset.skill || '全部'; renderPage('english'); return; }
  if (a === 'eng-export') { engExport(); return; }
});
