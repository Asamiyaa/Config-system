/* ============================================================================
   Skin OS · 皮肤护理
   结构：今日 / 流程 / 产品 / 复盘
   - 按肤质、敏感度、诉求与经验生成 AM/PM 流程
   - 视黄醇、酸类、烟酰胺、壬二酸等活性成分按周排程，避免同晚冲突
   - 逐步骤打卡、皮肤状态评分、产品耐受观察、28 天趋势与风险提示
   ========================================================================== */

const HOS_SKIN_TYPES = ['干性', '油性', '混合', '中性', '敏感'];
const HOS_SKIN_CONCERNS = ['痘痘/闭口', '泛红敏感', '暗沉', '干燥', '毛孔', '细纹', '色斑'];
const HOS_SKIN_ACTIVES = {
  retinol: { label: '视黄醇', period: '夜间', target: '2–3 次/周', caution: '孕期/备孕先咨询医生；不与酸类同晚；次日必须防晒。', good: '细纹、光老化、痘痘' },
  bha: { label: '水杨酸', period: '夜间', target: '1–2 次/周', caution: '敏感肌先低频；不与视黄醇同晚；避免叠加磨砂。', good: '毛孔、黑头、闭口' },
  aha: { label: '果酸', period: '夜间', target: '1 次/周', caution: '从低浓度开始；不与视黄醇同晚；白天严格防晒。', good: '粗糙、暗沉、色斑' },
  vitaminC: { label: '维生素 C', period: '白天', target: '每日', caution: '敏感肌从 5–10% 开始；避开过氧化苯甲酰。', good: '暗沉、抗氧化、色斑' },
  niacinamide: { label: '烟酰胺', period: '早晚', target: '每日', caution: '从 5% 开始；明显刺痛时停用并简化。', good: '出油、毛孔、暗沉' },
  azelaic: { label: '壬二酸', period: '早晚', target: '每日或隔日', caution: '初期可能刺痒；孕期使用请先咨询医生。', good: '泛红、痘痘、色沉' },
  benzoyl: { label: '过氧化苯甲酰', period: '局部', target: '按需', caution: '仅点涂；会漂白衣物；不与维 C 同时使用。', good: '炎性痘痘' },
  ceramide: { label: '神经酰胺', period: '早晚', target: '每日', caution: '屏障修护基础，可与大多数成分搭配。', good: '干燥、敏感、屏障受损' },
  panthenol: { label: '泛醇/积雪草', period: '早晚', target: '每日', caution: '舒缓为主；持续泛红应就医评估。', good: '泛红、刺激后修复' },
  spf: { label: '防晒', period: '白天', target: '每日', caution: '用量约一元硬币大小；户外每 2–3 小时补涂。', good: '所有肤质、色斑、光老化' }
};
const HOS_SKIN_STEPS = ['清洁', '卸妆', '抗氧化', '控油', '疏通', '抗老', '美白', '舒缓', '保湿', '封闭', '防晒'];
const HOS_SKIN_FREQS = [
  { value: 'daily', label: '每天' },
  { value: '3x', label: '每周 3 次（一/三/五）' },
  { value: '2x', label: '每周 2 次（一/四）' },
  { value: '2x-alt', label: '每周 2 次（二/五）' },
  { value: '1x', label: '每周 1 次（三）' },
  { value: 'alt', label: '隔天' }
];

function hosSkinState() {
  if (!state.skin || !state.skin.routine) hosEnsureSkinState();
  return state.skin;
}
function hosEnsureSkinState() {
  if (typeof state === 'undefined' || !state) return;
  state.skin = state.skin && typeof state.skin === 'object' ? state.skin : {};
  const s = state.skin;
  s.profile = {
    type: '混合', concerns: ['痘痘/闭口', '暗沉'], experience: '新手',
    sensitivity: '中', spf: '每天', budget: '中', ...(s.profile || {})
  };
  if (!Array.isArray(s.profile.concerns)) s.profile.concerns = [];
  if (!s.routine || !Array.isArray(s.routine.am) || !Array.isArray(s.routine.pm)) {
    s.routine = hosSkinGenerateRoutine(s.profile);
  }
  if (!Array.isArray(s.logs)) s.logs = [];
  if (!Array.isArray(s.products)) s.products = [];
}
function hosSkinFrequencyDays(freq) {
  if (freq === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  if (freq === '3x') return [1, 3, 5];
  if (freq === '2x') return [1, 4];
  if (freq === '2x-alt') return [2, 5];
  if (freq === '1x') return [3];
  if (freq === 'alt') return [1, 3, 5];
  return [0, 1, 2, 3, 4, 5, 6];
}
function hosSkinScheduled(item, dateKey = hosToday()) {
  const dow = new Date(`${dateKey}T12:00:00`).getDay();
  return hosSkinFrequencyDays(item.frequency || 'daily').includes(dow);
}
function hosSkinFrequencyLabel(freq) {
  return (HOS_SKIN_FREQS.find((x) => x.value === freq) || { label: '每天' }).label;
}
function hosSkinGenerateRoutine(profile) {
  const p = profile || {};
  const concerns = p.concerns || [];
  const sensitive = p.sensitivity === '高' || p.type === '敏感';
  const dry = p.type === '干性' || p.type === '敏感';
  const oily = p.type === '油性';
  const beginner = p.experience === '新手';
  const has = (key) => concerns.includes(key);

  const am = [{
    id: 'am-cleanse', step: '清洁',
    product: sensitive ? '无泡氨基酸洁面' : oily ? '温和控油洁面' : '氨基酸洁面',
    active: '', frequency: 'daily', wait: 0,
    note: '水温接近体温，轻揉后冲净；不过度清洁。'
  }];
  if (!sensitive) {
    am.push({ id: 'am-vitc', step: '抗氧化', product: '维生素 C 10% 精华', active: 'vitaminC', frequency: 'daily', wait: 60, note: '干脸使用，等待吸收后再保湿；白天必须防晒。' });
  } else {
    am.push({ id: 'am-panthenol', step: '舒缓', product: '泛醇/积雪草精华', active: 'panthenol', frequency: 'daily', wait: 30, note: '敏感期先修护屏障，减少活性叠加。' });
  }
  if (has('痘痘/闭口') || oily) {
    am.push({ id: 'am-niacinamide', step: '控油', product: '烟酰胺 5% 精华', active: 'niacinamide', frequency: 'daily', wait: 30, note: '与维 C 可早晚分开；刺痛时停用。' });
  }
  if (has('泛红敏感') || sensitive) {
    am.push({ id: 'am-azelaic', step: '舒缓', product: '壬二酸 10% 乳', active: 'azelaic', frequency: 'alt', wait: 20, note: '初期隔天，局部薄涂；刺痒明显时减频。' });
  }
  am.push({ id: 'am-moist', step: '保湿', product: dry ? '神经酰胺面霜' : '轻薄保湿乳', active: 'ceramide', frequency: 'daily', wait: 0, note: '皮肤微湿时涂抹，帮助锁水。' });
  am.push({ id: 'am-spf', step: '防晒', product: '广谱防晒 SPF50 PA++++', active: 'spf', frequency: 'daily', wait: 0, note: '用量约一元硬币；户外每 2–3 小时补涂。' });

  const pm = [{
    id: 'pm-cleanse', step: '清洁',
    product: sensitive ? '无泡氨基酸洁面' : '氨基酸洁面',
    active: '', frequency: 'daily', wait: 0,
    note: '有防晒或彩妆时先用卸妆产品，再温和清洁。'
  }];
  const wantRetinol = has('细纹') || has('色斑') || (!beginner && has('毛孔'));
  if (wantRetinol && !sensitive) {
    pm.push({ id: 'pm-retinol', step: '抗老', product: '视黄醇 0.3% 精华', active: 'retinol', frequency: beginner ? '2x' : '3x', wait: 20, note: '仅夜间；避开眼周与鼻翼；次日严格防晒。' });
  }
  if ((has('痘痘/闭口') || has('毛孔')) && !sensitive) {
    pm.push({ id: 'pm-bha', step: '疏通', product: '水杨酸 2% 精华', active: 'bha', frequency: wantRetinol ? '2x-alt' : '2x', wait: 10, note: '与视黄醇错开晚上；局部使用，避免全脸叠加。' });
  }
  if (has('色斑') && !sensitive && !wantRetinol) {
    pm.push({ id: 'pm-aha', step: '焕肤', product: '果酸 5–8% 精华', active: 'aha', frequency: '1x', wait: 10, note: '仅夜间；不与视黄醇同晚；白天严格防晒。' });
  }
  if (has('暗沉') && !sensitive && !wantRetinol) {
    pm.push({ id: 'pm-niacinamide', step: '提亮', product: '烟酰胺 5% 精华', active: 'niacinamide', frequency: 'daily', wait: 30, note: '可与维 C 早晚配合；避免与高浓度酸直接叠加。' });
  }
  if (sensitive || has('泛红敏感')) {
    pm.push({ id: 'pm-panthenol', step: '修护', product: '泛醇/积雪草修护精华', active: 'panthenol', frequency: 'daily', wait: 20, note: '泛红明显时暂停活性，只保留清洁、保湿、防晒。' });
  }
  pm.push({ id: 'pm-moist', step: '保湿', product: dry ? '神经酰胺面霜' : '修护乳液', active: 'ceramide', frequency: 'daily', wait: 0, note: '活性成分后使用，减少刺激。' });
  if (dry) {
    pm.push({ id: 'pm-occlusive', step: '封闭', product: '凡士林/封闭膏（局部）', active: '', frequency: 'daily', wait: 0, note: '仅在干燥脱屑处薄涂，避免全脸闷痘。' });
  }
  return { am, pm };
}

function hosSkinLogs() {
  return (hosSkinState().logs || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function hosSkinLogByDate(date = hosToday()) {
  return (hosSkinState().logs || []).find((x) => x.date === date) || null;
}
function hosSkinEnsureLog(date = hosToday()) {
  const s = hosSkinState();
  let log = s.logs.find((x) => x.date === date);
  if (!log) {
    log = { id: `skin-${date}-${Date.now()}`, date, done: [], condition: {}, actives: [], newProduct: '', note: '', createdAt: new Date().toISOString() };
    s.logs.unshift(log);
  }
  if (!Array.isArray(log.done)) log.done = [];
  if (!log.condition || typeof log.condition !== 'object') log.condition = {};
  if (!Array.isArray(log.actives)) log.actives = [];
  return log;
}
function hosSkinPlan(date = hosToday()) {
  const s = hosSkinState();
  const log = hosSkinLogByDate(date);
  const done = new Set((log && log.done) || []);
  const map = (items, period) => (items || []).map((item) => ({
    ...item, period,
    scheduled: hosSkinScheduled(item, date),
    done: done.has(`${period}:${item.id}`)
  }));
  return { am: map(s.routine.am, 'am'), pm: map(s.routine.pm, 'pm') };
}
function hosSkinActivesUsed(log) {
  return (log && Array.isArray(log.actives) ? log.actives : []).filter(Boolean);
}
function hosSkinScore(log) {
  if (!log || !log.condition) return null;
  const values = Object.values(log.condition).map(Number).filter((x) => Number.isFinite(x));
  if (!values.length) return null;
  return Math.round(hosClamp(100 - hosAvg(values) * 10, 0, 100));
}
function hosSkinConditionAvg(days = 14) {
  const dates = new Set(hosDates(days));
  const logs = hosSkinLogs().filter((x) => dates.has(x.date) && x.condition);
  const keys = ['redness', 'acne', 'dryness', 'oiliness', 'sensitivity', 'texture'];
  return keys.map((key) => {
    const values = logs.map((x) => hosNum(x.condition[key], NaN)).filter(Number.isFinite);
    return { key, label: { redness: '泛红', acne: '痘痘', dryness: '干燥', oiliness: '出油', sensitivity: '敏感', texture: '粗糙' }[key], value: values.length ? hosAvg(values) : null };
  }).filter((x) => x.value != null);
}
function hosSkinAdherence(days = 14) {
  const dates = hosDates(days);
  let planned = 0;
  let done = 0;
  dates.forEach((date) => {
    const plan = hosSkinPlan(date);
    const log = hosSkinLogByDate(date);
    const doneSet = new Set((log && log.done) || []);
    [...plan.am, ...plan.pm].forEach((step) => {
      if (!step.scheduled) return;
      planned += 1;
      if (doneSet.has(`${step.period}:${step.id}`)) done += 1;
    });
  });
  return { planned, done, rate: planned ? Math.round((done / planned) * 100) : 0 };
}
function hosSkinStreak() {
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = shiftDateKey(hosToday(), -i);
    const log = hosSkinLogByDate(date);
    if (!log || !(log.done || []).length) break;
    streak += 1;
  }
  return streak;
}
function hosSkinActiveUsage(days = 14) {
  const dates = new Set(hosDates(days));
  const strong = new Set(['retinol', 'bha', 'aha', 'vitaminC', 'benzoyl', 'azelaic']);
  const logs = hosSkinLogs().filter((x) => dates.has(x.date));
  const counts = {};
  logs.forEach((log) => hosSkinActivesUsed(log).filter((id) => strong.has(id)).forEach((id) => { counts[id] = (counts[id] || 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: (HOS_SKIN_ACTIVES[id] || {}).label || id, count }));
}
function hosSkinConflicts() {
  const s = hosSkinState();
  const out = [];
  const strong = new Set(['retinol', 'bha', 'aha', 'vitaminC', 'benzoyl', 'azelaic']);
  const activeSteps = (s.routine.pm || []).filter((x) => strong.has(x.active));
  const daysOf = (item) => new Set(hosSkinFrequencyDays(item.frequency || 'daily'));
  const overlap = (a, b) => [...daysOf(a)].some((d) => daysOf(b).has(d));
  const retinol = activeSteps.find((x) => x.active === 'retinol');
  const acids = activeSteps.filter((x) => x.active === 'bha' || x.active === 'aha');
  if (retinol && acids.some((x) => overlap(retinol, x))) out.push('视黄醇与酸类被安排在同一晚：请把水杨酸/果酸移到不重叠的晚上。');
  const vitc = (s.routine.am || []).find((x) => x.active === 'vitaminC');
  const bpo = [...(s.routine.am || []), ...(s.routine.pm || [])].find((x) => x.active === 'benzoyl');
  if (vitc && bpo) out.push('维生素 C 与过氧化苯甲酰不建议同时使用：可分早晚或隔天。');
  if (activeSteps.length >= 3) out.push('夜间强活性步骤达到 3 个：优先保留 1–2 个，其余隔天或暂停。');
  if (!(s.routine.am || []).some((x) => x.active === 'spf')) out.push('晨间流程缺少防晒：使用活性成分时白天必须防晒。');
  if ((s.profile.sensitivity === '高' || s.profile.type === '敏感') && activeSteps.length >= 2) out.push('敏感肌同时使用多种活性：先恢复屏障，活性一次只引入一个。');
  if (out.length === 0) out.push('当前 AM/PM 流程未发现明显成分冲突。');
  return out;
}
function hosSkinInsights() {
  const s = hosSkinState();
  const today = hosToday();
  const log = hosSkinLogByDate(today);
  const adherence = hosSkinAdherence(28);
  const logs = hosSkinLogs();
  const recent = logs.filter((x) => hosDates(7).includes(x.date));
  const prev = logs.filter((x) => hosDates(14).filter((d) => !hosDates(7).includes(d)).includes(x.date));
  const insights = [];
  const conflicts = hosSkinConflicts();
  const conflictCount = conflicts.filter((x) => !x.startsWith('当前')).length;
  if (conflictCount) insights.push({ tone: 'warn', title: '流程存在成分冲突', text: conflicts[0] });
  if (log && log.condition) {
    const score = hosSkinScore(log);
    if (score != null && score < 60) insights.push({ tone: 'bad', title: '今天的皮肤评分偏低', text: `当前 ${score}/100。优先简化护理、保湿和防晒；持续泛红、疼痛或渗液请就医。` });
    else if (score != null && score >= 80) insights.push({ tone: 'good', title: '今天皮肤状态稳定', text: `${score}/100，继续保持当前流程，不急于叠加新产品。` });
  } else {
    insights.push({ tone: 'neutral', title: '还没有今天的皮肤状态', text: '花 30 秒记录泛红、痘痘、干燥、出油、敏感和粗糙度，趋势才有意义。' });
  }
  if (adherence.planned && adherence.rate < 60) insights.push({ tone: 'warn', title: '流程执行率偏低', text: `近 28 天完成 ${adherence.rate}%。如果步骤太多，先把流程压缩到清洁、保湿、防晒三步。` });
  else if (adherence.planned && adherence.rate >= 85) insights.push({ tone: 'good', title: '流程执行稳定', text: `近 28 天完成 ${adherence.rate}%，持续性比一次性堆产品更重要。` });
  if (recent.length && prev.length) {
    const a = hosAvg(recent, (x) => hosSkinScore(x) * 1);
    const b = hosAvg(prev, (x) => hosSkinScore(x) * 1);
    if (b && a - b <= -8) insights.push({ tone: 'warn', title: '近 7 天状态在下降', text: `皮肤评分比前 7 天下降约 ${Math.round(b - a)} 分。先检查新产品、活性频率、睡眠和防晒。` });
  }
  const newProducts = (s.products || []).filter((p) => p.startedAt && dayDiff(p.startedAt, today) <= 14 && p.reaction && p.reaction !== '无不适');
  if (newProducts.length) insights.push({ tone: 'bad', title: '新产品出现不耐受', text: `${newProducts[0].name} 记录了「${newProducts[0].reaction}」。暂停该产品，保留基础清洁、保湿、防晒。` });
  const overused = hosSkinActiveUsage(7).filter((x) => x.count > 3);
  if (overused.length) insights.push({ tone: 'warn', title: '活性成分使用偏频繁', text: `${overused.map((x) => `${x.label} ${x.count} 次/周`).join('、')}。视黄醇/酸类通常不需要每天使用。` });
  if (!insights.length) insights.push({ tone: 'good', title: '护理节奏正常', text: '保持清洁、保湿、防晒和少量活性成分的稳定组合。' });
  return insights.slice(0, 4);
}

/* ---- 页面 ------------------------------------------------------------- */
function renderSkinOS() {
  const s = hosSkinState();
  return `${sectionHead('SKIN OS · BARRIER & ROUTINE', '皮肤护理', '把护肤拆成可执行的 AM/PM 流程：按肤质和诉求生成步骤、安排活性成分、逐项打卡、记录皮肤状态与产品耐受。只做护理管理，不替代皮肤科诊断。', `<button class="btn btn-outline" data-action="capability-page" data-page="health">← 健康总览</button><button class="btn btn-primary" data-action="hos-skin-condition">＋ 记录皮肤状态</button>`)}
  <div class="hos-shell" data-tab-shell data-tab-key="skin" data-default-tab="today">
    <div class="hos-bar"><div class="fit-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="today" role="tab">今日</button>
      <button class="fit-tab" data-tab="routine" role="tab">流程</button>
      <button class="fit-tab" data-tab="products" role="tab">产品</button>
      <button class="fit-tab" data-tab="review" role="tab">复盘</button>
    </div><div class="hos-bar-actions"><span class="hos-badge">${esc(s.profile.type)} · 敏感度${esc(s.profile.sensitivity)}</span><button class="btn btn-small btn-outline" data-action="hos-skin-profile">调整流程</button></div></div>
    <div class="fit-panel active" data-tab-panel="today">${hosSkinTodayPanel()}</div>
    <div class="fit-panel" data-tab-panel="routine">${hosSkinRoutinePanel()}</div>
    <div class="fit-panel" data-tab-panel="products">${hosSkinProductsPanel()}</div>
    <div class="fit-panel" data-tab-panel="review">${hosSkinReviewPanel()}</div>
  </div>`;
}
function hosSkinStepRow(step) {
  return `<button class="hos-step ${step.done ? 'is-done' : ''} ${step.scheduled ? '' : 'is-rest'}" data-action="hos-skin-step" data-period="${step.period}" data-id="${esc(step.id)}">
    <span class="hos-step-check">${step.done ? '✓' : ''}</span>
    <div><strong>${esc(step.step)} · ${esc(step.product)}</strong><small>${step.active ? `${esc((HOS_SKIN_ACTIVES[step.active] || {}).label || step.active)} · ` : ''}${esc(hosSkinFrequencyLabel(step.frequency))}${step.wait ? ` · 等待 ${step.wait}s` : ''}</small><p>${esc(step.note || '')}</p></div>
    <em>${step.scheduled ? (step.done ? '已完成' : '待完成') : '休息日'}</em>
  </button>`;
}
function hosSkinWeeklySchedule() {
  const s = hosSkinState();
  const now = new Date(`${hosToday()}T12:00:00`);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dates = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return todayKey(d);
  });
  const strong = new Set(['retinol', 'bha', 'aha', 'vitaminC', 'benzoyl', 'azelaic']);
  const rows = dates.map((date) => {
    const plan = hosSkinPlan(date);
    const actives = [...plan.am, ...plan.pm].filter((x) => x.scheduled && strong.has(x.active));
    const isToday = date === hosToday();
    return `<article class="${isToday ? 'is-today' : ''}"><b>${esc(hosDateLabel(date))}</b><div class="hos-tags">${actives.map((x) => `<span>${esc((HOS_SKIN_ACTIVES[x.active] || {}).label || x.active)} · ${x.period === 'am' ? 'AM' : 'PM'}</span>`).join('') || '<span>基础护理</span>'}</div></article>`;
  }).join('');
  return hosSectionCard('本周活性排程', '视黄醇与酸类自动错开；点今日或到「流程」里调整。', `<div class="hos-week-schedule">${rows}</div>`, `<button class="btn btn-small btn-outline" data-action="hos-skin-profile">重新生成</button>`);
}
function hosSkinCalendar(days = 28) {
  const dates = hosDates(days);
  const first = new Date(`${dates[0]}T12:00:00`);
  const pad = (first.getDay() + 6) % 7;
  const cells = [...Array(pad).fill(null), ...dates];
  return `<div class="hos-calendar">${['一', '二', '三', '四', '五', '六', '日'].map((d) => `<span class="hos-cal-head">${d}</span>`).join('')}${cells.map((date) => {
    if (!date) return '<span class="hos-cal-day is-empty"></span>';
    const log = hosSkinLogByDate(date);
    const done = (log && log.done || []).length;
    const score = hosSkinScore(log);
    const tone = score == null ? '' : score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
    return `<button class="hos-cal-day ${tone} ${date === hosToday() ? 'is-today' : ''}" data-action="hos-skin-day" data-date="${esc(date)}" title="${esc(date)} · ${done} 步${score == null ? '' : ` · ${score} 分`}"><b>${Number(date.slice(8))}</b><i class="${done ? 'has-care' : ''}"></i><small>${score == null ? '' : score}</small></button>`;
  }).join('')}</div><div class="hos-chart-note">颜色按当天皮肤评分；下方圆点表示至少完成一个护理步骤。点击日期可补录。</div>`;
}

function hosSkinTodayPanel() {
  const s = hosSkinState();
  const plan = hosSkinPlan(hosToday());
  const log = hosSkinLogByDate(hosToday());
  const score = hosSkinScore(log);
  const adherence = hosSkinAdherence(28);
  const amDone = plan.am.filter((x) => x.scheduled && x.done).length;
  const amTotal = plan.am.filter((x) => x.scheduled).length;
  const pmDone = plan.pm.filter((x) => x.scheduled && x.done).length;
  const pmTotal = plan.pm.filter((x) => x.scheduled).length;
  const conflicts = hosSkinConflicts().filter((x) => !x.startsWith('当前'));
  const condition = log && log.condition ? Object.entries(log.condition) : [];
  const labels = { redness: '泛红', acne: '痘痘', dryness: '干燥', oiliness: '出油', sensitivity: '敏感', texture: '粗糙' };
  return `<div class="hos-hero">
    <div><span class="eyebrow">SKIN · ${esc(hosDateLabel(hosToday()))}</span><h2>${score == null ? '今天先给皮肤做一次体检' : `今天皮肤评分 ${score}<small>/100</small>`}</h2><p>${esc(s.profile.type)}肤质 · 诉求 ${esc((s.profile.concerns || []).join(' / ') || '未设置')}。流程执行以真实打卡为准，不追求一次堆满所有活性。</p><div class="hos-hero-actions"><button class="btn btn-primary" data-action="hos-skin-condition">${score == null ? '记录皮肤状态' : '更新皮肤状态'}</button><button class="btn btn-outline" data-action="hos-skin-profile">重新生成流程</button></div></div>
    <div class="hos-hero-rings">${hosRing(score == null ? 0 : score, score == null ? '—' : score, '皮肤评分', score == null ? '未记录' : hosScoreLabel(score))}${hosRing(adherence.rate, `${adherence.rate}%`, '28天执行率', `${adherence.done}/${adherence.planned} 步`)}</div>
  </div>
  <div class="hos-kpis">
    ${hosKpi('今日 AM', `${amDone}/${amTotal}`, '步', '清洁 · 抗氧化 · 保湿 · 防晒', amDone >= amTotal && amTotal ? 'good' : '')}
    ${hosKpi('今日 PM', `${pmDone}/${pmTotal}`, '步', '清洁 · 功效 · 保湿', pmDone >= pmTotal && pmTotal ? 'good' : '')}
    ${hosKpi('连续护理', hosSkinStreak(), '天', '至少完成一个步骤')}
    ${hosKpi('新产品', (s.products || []).filter((p) => p.status === '使用中').length, '个', '正在观察耐受')}
  </div>
  ${conflicts.length ? `<div class="hos-alert warn"><b>流程提醒</b><p>${esc(conflicts.join(' '))}</p><button class="btn btn-small btn-outline" data-action="hos-skin-profile">调整流程</button></div>` : ''}
  <div class="hos-two">
    <section class="card"><div class="card-head"><div><h3>晨间流程 · AM</h3><p>抗氧化、保湿、防晒。完成一步点一下。</p></div><span class="tag neutral">${amDone}/${amTotal}</span></div><div class="hos-steps">${plan.am.map(hosSkinStepRow).join('')}</div></section>
    <section class="card"><div class="card-head"><div><h3>夜间流程 · PM</h3><p>活性成分按周排程；休息日只做清洁、保湿、修护。</p></div><span class="tag neutral">${pmDone}/${pmTotal}</span></div><div class="hos-steps">${plan.pm.map(hosSkinStepRow).join('')}</div></section>
  </div>
  <div class="hos-two">
    <section class="card"><div class="card-head"><div><h3>今日皮肤状态</h3><p>0 = 无/好，10 = 严重。分数越低越需要简化护理。</p></div><button class="btn btn-small btn-outline" data-action="hos-skin-condition">${condition.length ? '更新' : '记录'}</button></div><div class="hos-condition-list">${condition.length ? condition.map(([key, value]) => `<div><span>${esc(labels[key] || key)}</span><i><b style="width:${hosClamp(hosNum(value) * 10, 0, 100)}%"></b></i><strong>${hosNum(value)}</strong></div>`).join('') : hosEmpty('还没有今天的皮肤状态记录。')}</div>${log && log.actives && log.actives.length ? `<div class="hos-inline-tags">今晚使用：${log.actives.map((id) => `<span>${esc((HOS_SKIN_ACTIVES[id] || {}).label || id)}</span>`).join('')}</div>` : ''}${log && log.note ? `<p class="hos-note">${esc(log.note)}</p>` : ''}</section>
    <section class="card"><div class="card-head"><div><h3>今天最值得做的事</h3><p>按当前记录与流程计算，不是泛泛建议。</p></div></div>${hosInsightCards(hosSkinInsights())}</section>
  </div>
  ${hosSkinWeeklySchedule()}`;
}
function hosSkinRoutinePanel() {
  const s = hosSkinState();
  const addForm = (period) => `<form class="hos-add-step" data-period="${period}"><select name="step">${HOS_SKIN_STEPS.map((x) => `<option>${x}</option>`).join('')}</select><input name="product" placeholder="产品/步骤名称"><select name="active"><option value="">无活性</option>${Object.entries(HOS_SKIN_ACTIVES).map(([id, a]) => `<option value="${id}">${a.label}</option>`).join('')}</select><select name="frequency">${HOS_SKIN_FREQS.map((f) => `<option value="${f.value}">${f.label}</option>`).join('')}</select><button class="btn btn-small btn-primary" type="button" data-action="hos-skin-add-step" data-period="${period}">＋ 添加</button></form>`;
  const list = (period, items) => `<div class="hos-routine-list">${items.map((item) => `<article><div><strong>${esc(item.step)} · ${esc(item.product)}</strong><small>${item.active ? `${esc((HOS_SKIN_ACTIVES[item.active] || {}).label || item.active)} · ` : ''}${esc(hosSkinFrequencyLabel(item.frequency))}${item.wait ? ` · 等待 ${item.wait}s` : ''}</small><p>${esc(item.note || '')}</p></div><button class="btn btn-small btn-ghost" data-action="hos-skin-remove-step" data-period="${period}" data-id="${esc(item.id)}">移除</button></article>`).join('') || hosEmpty('还没有步骤。')}${addForm(period)}</div>`;
  return `<div class="hos-lead"><span class="eyebrow">ROUTINE BUILDER</span><h2>先做减法，再做有效成分</h2><p>基础三步（清洁、保湿、防晒）是底盘；活性成分按周排程，同一晚不要叠加多个强刺激。修改后从今天开始生效。</p></div>
  <section class="card"><div class="card-head"><div><h3>当前方案</h3><p>${esc(s.profile.type)}肤质 · 敏感度 ${esc(s.profile.sensitivity)} · 经验 ${esc(s.profile.experience)} · 防晒习惯 ${esc(s.profile.spf)}</p></div><button class="btn btn-small btn-primary" data-action="hos-skin-profile">按诉求重新生成</button></div><div class="hos-profile-chips">${(s.profile.concerns || []).map((x) => `<span>${esc(x)}</span>`).join('') || '<span>未设置诉求</span>'}</div>
  <div class="hos-two"><div><h4 class="hos-subtitle">AM · 晨间</h4>${list('am', s.routine.am)}</div><div><h4 class="hos-subtitle">PM · 夜间</h4>${list('pm', s.routine.pm)}</div></div></section>
  <section class="card"><div class="card-head"><div><h3>成分速查与边界</h3><p>只解释常见使用边界，不替代处方或医生建议。</p></div></div><div class="hos-active-grid">${Object.entries(HOS_SKIN_ACTIVES).map(([id, a]) => `<article><header><strong>${esc(a.label)}</strong><span>${esc(a.period)} · ${esc(a.target)}</span></header><p><b>适合：</b>${esc(a.good)}</p><p class="hos-caution">${esc(a.caution)}</p></article>`).join('')}</div></section>`;
}
function hosSkinProductsPanel() {
  const products = hosSkinState().products || [];
  return `<div class="hos-lead"><span class="eyebrow">PRODUCT TOLERANCE</span><h2>一次只引入一个新产品</h2><p>记录开始日期、活性、反应和停用原因。连续使用 7–14 天再判断耐受；出现明显刺痛、红肿、脱皮时先停用并简化。</p></div>
  <div class="hos-kpis">${hosKpi('使用中', products.filter((p) => p.status === '使用中').length, '个', '正在观察')} ${hosKpi('最近 14 天新增', products.filter((p) => p.startedAt && dayDiff(p.startedAt, hosToday()) <= 14).length, '个', '新产品窗口')} ${hosKpi('出现不适', products.filter((p) => p.reaction && p.reaction !== '无不适').length, '个', '需要暂停评估')} ${hosKpi('已停用', products.filter((p) => p.status === '停用').length, '个', '保留记录')}</div>
  <section class="card"><div class="card-head"><div><h3>在用与观察中的产品</h3><p>产品名、活性、开始日期和反应；不是购买清单。</p></div><button class="btn btn-primary" data-action="hos-skin-product">＋ 添加产品</button></div><div class="hos-product-grid">${products.map((p) => `<article class="hos-product"><header><strong>${esc(p.name)}</strong><span class="tag ${p.status === '使用中' ? 'good' : p.status === '暂停' ? 'warn' : 'neutral'}">${esc(p.status || '使用中')}</span></header><small>${esc(p.actives || '未标注活性')} · 开始 ${esc(p.startedAt || '—')}${p.startedAt ? ` · 第 ${Math.max(1, dayDiff(p.startedAt, hosToday()) + 1)} 天` : ''}</small><p>${esc(p.note || '')}</p><div class="hos-tags">${p.reaction ? `<span>${esc(p.reaction)}</span>` : ''}</div><div class="hos-product-actions"><button class="btn btn-small btn-outline" data-action="hos-skin-product-status" data-id="${esc(p.id)}" data-status="使用中">使用中</button><button class="btn btn-small btn-outline" data-action="hos-skin-product-status" data-id="${esc(p.id)}" data-status="暂停">暂停</button><button class="btn btn-small btn-ghost" data-action="hos-skin-product-status" data-id="${esc(p.id)}" data-status="停用">停用</button></div></article>`).join('') || hosEmpty('还没有记录产品。先添加一个正在使用或刚引入的产品。', '<button class="btn btn-primary" data-action="hos-skin-product">添加第一个产品</button>')}</div></section>
  <section class="card"><div class="card-head"><div><h3>产品引入规则</h3><p>把「耐受」当作可观察的记录，而不是感觉。</p></div></div><div class="hos-rule-grid"><article><b>01 · 一次一个</b><p>新产品单独引入 7–14 天，不与其他新产品同时开始。</p></article><article><b>02 · 局部测试</b><p>先在耳后或下颌小面积试用 2–3 天，再扩大范围。</p></article><article><b>03 · 记录反应</b><p>刺痛、泛红、脱皮、爆痘都要记录出现时间和持续时间。</p></article><article><b>04 · 及时停用</b><p>明显不适先停用，保留基础三步；持续或加重请就医。</p></article></div></section>`;
}
function hosSkinReviewPanel() {
  const dates = hosDates(14);
  const scores = dates.map((d) => hosSkinScore(hosSkinLogByDate(d)));
  const adherence = hosSkinAdherence(14);
  const perDay = dates.map((d) => {
    const plan = hosSkinPlan(d);
    const log = hosSkinLogByDate(d);
    const done = new Set((log && log.done) || []);
    const scheduled = [...plan.am, ...plan.pm].filter((x) => x.scheduled);
    return scheduled.length ? Math.round((scheduled.filter((x) => done.has(`${x.period}:${x.id}`)).length / scheduled.length) * 100) : 0;
  });
  const condition = hosSkinConditionAvg(14);
  const usage = hosSkinActiveUsage(14);
  return `<div class="hos-lead"><span class="eyebrow">REVIEW · 14 DAYS</span><h2>皮肤状态与执行率</h2><p>用同一套 0–10 指标观察趋势；分数变化比单张照片更可靠。持续或异常变化请咨询皮肤科医生。</p></div>
  <div class="hos-kpis">${hosKpi('14 天平均评分', hosDash(hosAvg(scores.filter((x) => x != null))), '/100', '有记录的天数才计入')} ${hosKpi('流程执行率', adherence.rate, '%', `${adherence.done}/${adherence.planned} 步`)} ${hosKpi('记录天数', scores.filter((x) => x != null).length, '天', '近 14 天')} ${hosKpi('活性使用', usage.reduce((a, b) => a + b.count, 0), '次', '近 14 天')}</div>
  <section class="card"><div class="card-head"><div><h3>28 天护理日历</h3><p>按真实记录生成；空白表示未记录。</p></div></div>${hosSkinCalendar(28)}</section>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>皮肤评分趋势</h3><p>分数越高越好；空白表示当天未记录。</p></div></div>${hosLineChart(scores, dates.map((d) => d.slice(5)), { target: 70, min: 0, max: 100, label: '皮肤评分趋势' })}</section><section class="card"><div class="card-head"><div><h3>流程执行率</h3><p>按当天计划步骤计算，休息日不计入。</p></div></div>${hosBarChart(perDay, dates.map((d) => d.slice(5)), { target: 80, unit: '%', height: 140 })}</section></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>14 天平均状态</h3><p>数值越低越好；用于观察哪一项最需要处理。</p></div></div><div class="hos-condition-list">${condition.map((x) => `<div><span>${esc(x.label)}</span><i><b style="width:${hosClamp(x.value * 10, 0, 100)}%"></b></i><strong>${hosRound(x.value, 1)}</strong></div>`).join('') || hosEmpty('还没有足够的皮肤状态记录。')}</div></section><section class="card"><div class="card-head"><div><h3>活性成分使用</h3><p>对照计划频率，避免无意中过量。</p></div></div><div class="hos-usage-list">${usage.map((x) => `<article><span>${esc(x.label)}</span><i><b style="width:${Math.min(100, x.count / 6 * 100)}%"></b></i><strong>${x.count} 次</strong></article>`).join('') || hosEmpty('近 14 天没有记录活性成分。')}</div></section></div>
  <section class="card"><div class="card-head"><div><h3>复盘提示</h3><p>只根据已记录数据给出，不虚构因果。</p></div></div>${hosInsightCards(hosSkinInsights())}</section>
  <section class="card"><div class="card-head"><div><h3>旧版通用护理记录</h3><p>来自原「健康历史记录」，保留可查；新记录请使用上方皮肤工作台。</p></div><span class="tag neutral">${(state.healthLogs || []).filter((x) => x.category === '皮肤').length} 条</span></div><div class="hos-legacy-list">${(state.healthLogs || []).filter((x) => x.category === '皮肤').slice(0, 12).map((x) => `<article><b>${esc(x.date)}</b><div><strong>${esc(x.title)}</strong><p>${esc(x.detail || x.note || '')}</p></div></article>`).join('') || hosEmpty('没有旧版皮肤记录。')}</div></section>`;
}

/* ---- 弹层与动作 ------------------------------------------------------- */
function hosSkinOpenProfile() {
  const p = hosSkinState().profile;
  hosOpenSheet('皮肤评估与流程生成', '按真实情况选择；生成会替换当前 AM/PM 流程，但保留历史记录和产品。', `<form id="hosSkinProfileForm" class="fit-form" autocomplete="off">
    <div class="fit-grid-2"><label class="fit-field"><span>肤质</span>${hosSelect('type', p.type, HOS_SKIN_TYPES)}</label><label class="fit-field"><span>敏感度</span>${hosSelect('sensitivity', p.sensitivity, ['低', '中', '高'])}</label><label class="fit-field"><span>护肤经验</span>${hosSelect('experience', p.experience, ['新手', '进阶', '耐受'])}</label><label class="fit-field"><span>防晒习惯</span>${hosSelect('spf', p.spf, ['每天', '经常', '偶尔'])}</label></div>
    <div class="fit-field fit-wide"><span>主要诉求（可多选）</span><div class="hos-check-grid">${HOS_SKIN_CONCERNS.map((x) => `<label class="hos-check"><input type="checkbox" name="concerns" value="${esc(x)}" ${(p.concerns || []).includes(x) ? 'checked' : ''}> ${esc(x)}</label>`).join('')}</div></div>
    <p class="hos-sheet-note">生成逻辑：先保证清洁、保湿、防晒；再按诉求加入 1–2 个活性成分，并自动错开视黄醇与酸类的使用日。</p>
    ${hosFormFoot('hos-skin-generate', '生成并替换流程')}
  </form>`);
}
function hosSkinGenerateFromForm() {
  const form = $('#hosSkinProfileForm');
  if (!form) return;
  const fd = new FormData(form);
  const profile = {
    type: String(fd.get('type') || '混合'), sensitivity: String(fd.get('sensitivity') || '中'),
    experience: String(fd.get('experience') || '新手'), spf: String(fd.get('spf') || '每天'),
    concerns: [...form.querySelectorAll('input[name="concerns"]:checked')].map((x) => x.value)
  };
  const s = hosSkinState();
  s.profile = profile;
  s.routine = hosSkinGenerateRoutine(profile);
  hosCloseSheet();
  saveAndRender('已按当前肤质和诉求生成 AM/PM 流程');
}
function hosSkinOpenCondition(date = hosToday()) {
  const log = hosSkinLogByDate(date);
  const c = (log && log.condition) || {};
  const labels = [['redness', '泛红'], ['acne', '痘痘'], ['dryness', '干燥'], ['oiliness', '出油'], ['sensitivity', '敏感'], ['texture', '粗糙']];
  const activeOptions = [...new Set([...(hosSkinState().routine.am || []), ...(hosSkinState().routine.pm || [])].map((x) => x.active).filter((x) => x && x !== 'spf'))];
  hosOpenSheet('记录今日皮肤状态', '0 = 无/好，10 = 严重；同一天多次记录以最后一次为准。', `<form id="hosSkinConditionForm" class="fit-form" autocomplete="off">
    <div class="fit-field fit-wide"><span>日期</span><input type="date" name="date" value="${esc((log && log.date) || date)}"></div>
    <div class="hos-range-grid">${labels.map(([key, label]) => `<label class="hos-range"><span>${esc(label)}</span><input type="range" name="${key}" min="0" max="10" step="1" value="${c[key] != null ? c[key] : 0}" data-hos-range><output>${c[key] != null ? c[key] : 0}</output></label>`).join('')}</div>
    <div class="fit-field fit-wide"><span>今天使用的活性成分</span><div class="hos-check-grid">${activeOptions.map((id) => `<label class="hos-check"><input type="checkbox" name="actives" value="${esc(id)}" ${(log && (log.actives || []).includes(id)) ? 'checked' : ''}> ${esc((HOS_SKIN_ACTIVES[id] || {}).label || id)}</label>`).join('') || '<small>当前流程没有活性成分。</small>'}</div></div>
    <div class="fit-grid-2"><label class="fit-field"><span>新增产品</span><input name="newProduct" value="${esc((log && log.newProduct) || '')}" placeholder="今天第一次用的产品"></label><label class="fit-field"><span>明显不适</span>${hosSelect('reaction', (log && log.reaction) || '无不适', ['无不适', '轻微刺痛', '泛红', '脱皮', '爆痘', '明显过敏'])}</label></div>
    <label class="fit-field fit-wide"><span>备注</span><textarea name="note" rows="3" placeholder="作息、饮食、防晒、新产品、月经周期等可能相关因素">${esc((log && log.note) || '')}</textarea></label>
    ${hosFormFoot('hos-skin-save-condition', '保存今日状态')}
  </form>`);
}
function hosSkinSaveCondition() {
  const form = $('#hosSkinConditionForm');
  if (!form) return;
  const fd = new FormData(form);
  const date = String(fd.get('date') || hosToday());
  const log = hosSkinEnsureLog(date);
  const keys = [['redness', '泛红'], ['acne', '痘痘'], ['dryness', '干燥'], ['oiliness', '出油'], ['sensitivity', '敏感'], ['texture', '粗糙']];
  log.condition = {};
  keys.forEach(([key, label]) => { log.condition[key] = hosClamp(fd.get(key), 0, 10); });
  log.actives = [...form.querySelectorAll('input[name="actives"]:checked')].map((x) => x.value);
  log.newProduct = String(fd.get('newProduct') || '');
  log.reaction = String(fd.get('reaction') || '无不适');
  log.note = String(fd.get('note') || '');
  log.updatedAt = new Date().toISOString();
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].skin = true;
  hosCloseSheet();
  saveAndRender('今日皮肤状态已保存，趋势与提醒已更新');
}
function hosSkinOpenProduct() {
  hosOpenSheet('添加/观察产品', '一次只引入一个；先做局部测试，再记录 7–14 天耐受。', `<form id="hosSkinProductForm" class="fit-form" autocomplete="off">
    <div class="fit-grid-2"><label class="fit-field"><span>产品名称</span><input name="name" required placeholder="例如：视黄醇 0.3% 精华"></label><label class="fit-field"><span>主要活性</span><input name="actives" placeholder="例如：视黄醇、烟酰胺"></label><label class="fit-field"><span>开始日期</span><input type="date" name="startedAt" value="${hosToday()}"></label><label class="fit-field"><span>状态</span>${hosSelect('status', '使用中', ['使用中', '暂停', '停用'])}</label><label class="fit-field"><span>目前反应</span>${hosSelect('reaction', '无不适', ['无不适', '轻微刺痛', '泛红', '脱皮', '爆痘', '明显过敏'])}</label></div>
    <label class="fit-field fit-wide"><span>备注</span><textarea name="note" rows="3" placeholder="使用频率、肤感、搭配、停用原因"></textarea></label>
    ${hosFormFoot('hos-skin-save-product', '保存产品记录')}
  </form>`);
}
function hosSkinSaveProduct() {
  const form = $('#hosSkinProductForm');
  if (!form) return;
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim();
  if (!name) { toast('请填写产品名称', true); return; }
  hosSkinState().products.unshift({ id: `prod-${Date.now()}`, name, actives: String(fd.get('actives') || ''), startedAt: String(fd.get('startedAt') || hosToday()), status: String(fd.get('status') || '使用中'), reaction: String(fd.get('reaction') || '无不适'), note: String(fd.get('note') || '') });
  hosCloseSheet();
  saveAndRender('产品已加入耐受观察');
}
function hosSkinToggleStep(period, id) {
  const date = hosToday();
  const log = hosSkinEnsureLog(date);
  const key = `${period}:${id}`;
  const idx = log.done.indexOf(key);
  if (idx >= 0) log.done.splice(idx, 1); else log.done.push(key);
  log.updatedAt = new Date().toISOString();
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].skin = log.done.length > 0;
  saveAndRender(idx >= 0 ? '已取消这一步' : '护理步骤已完成');
}
function hosSkinAddStep(period) {
  const form = $(`.hos-add-step[data-period="${period}"]`);
  if (!form) return;
  const fd = new FormData(form);
  const product = String(fd.get('product') || '').trim();
  if (!product) { toast('请填写产品/步骤名称', true); return; }
  hosSkinState().routine[period].push({ id: `custom-${period}-${Date.now()}`, step: String(fd.get('step') || '自定义'), product, active: String(fd.get('active') || ''), frequency: String(fd.get('frequency') || 'daily'), wait: 0, note: '' });
  saveAndRender('流程步骤已添加');
}
function hosSkinRemoveStep(period, id) {
  const s = hosSkinState();
  s.routine[period] = (s.routine[period] || []).filter((x) => x.id !== id);
  saveAndRender('流程步骤已移除');
}
function hosSkinSummaryCard() {
  const log = hosSkinLogByDate(hosToday());
  const score = hosSkinScore(log);
  const adherence = hosSkinAdherence(28);
  const plan = hosSkinPlan(hosToday());
  const scheduled = [...plan.am, ...plan.pm].filter((x) => x.scheduled);
  const done = scheduled.filter((x) => x.done).length;
  return `<article class="hos-overview-item"><header><span>SKIN</span><b class="${hosScoreTone(score)}">${score == null ? '未记录' : score + '/100'}</b></header><h4>护肤 · 今日流程</h4><p>${done}/${scheduled.length} 步完成 · 28 天执行率 ${adherence.rate}%</p>${hosProgress(done, Math.max(1, scheduled.length), `${done} / ${scheduled.length} 步`)}<button class="btn btn-small btn-outline" data-action="capability-page" data-page="skin">打开护肤工作台 →</button></article>`;
}

/* ---- 事件 ------------------------------------------------------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('hos-skin-')) return;
  if (a === 'hos-skin-profile') { hosSkinOpenProfile(); return; }
  if (a === 'hos-skin-generate') { hosSkinGenerateFromForm(); return; }
  if (a === 'hos-skin-condition') { hosSkinOpenCondition(); return; }
  if (a === 'hos-skin-day') { hosSkinOpenCondition(btn.dataset.date || hosToday()); return; }
  if (a === 'hos-skin-save-condition') { hosSkinSaveCondition(); return; }
  if (a === 'hos-skin-product') { hosSkinOpenProduct(); return; }
  if (a === 'hos-skin-save-product') { hosSkinSaveProduct(); return; }
  if (a === 'hos-skin-step') { hosSkinToggleStep(btn.dataset.period, btn.dataset.id); return; }
  if (a === 'hos-skin-add-step') { hosSkinAddStep(btn.dataset.period); return; }
  if (a === 'hos-skin-remove-step') { hosSkinRemoveStep(btn.dataset.period, btn.dataset.id); return; }
  if (a === 'hos-skin-product-status') {
    const product = (hosSkinState().products || []).find((x) => String(x.id) === String(btn.dataset.id));
    if (product) product.status = btn.dataset.status;
    saveAndRender('产品状态已更新');
    return;
  }
});
