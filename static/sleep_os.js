/* ============================================================================
   Sleep OS · 睡眠记录与恢复
   结构：今日 / 记录 / 作息 / 复盘
   - 记录上床、入睡、醒来、夜醒、午睡、咖啡因、酒精、屏幕与压力
   - 计算睡眠时长、效率、睡眠债、作息规律性、恢复准备度
   - 睡前降速时间线 + 睡眠卫生清单 + 咖啡因截止时间
   - 与训练衔接：恢复不足时明确建议降低强度
   ========================================================================== */

const HOS_SLEEP_HYGIENE = [
  { key: 'caffeine', label: '下午后不再摄入咖啡因', desc: '咖啡因半衰期约 5 小时；对睡眠敏感的人，截止时间应更早。' },
  { key: 'alcohol', label: '睡前不靠酒精助眠', desc: '酒精可能缩短入睡时间，但会增加夜醒、降低后半夜睡眠质量。' },
  { key: 'screen', label: '睡前 60 分钟减少强光屏幕', desc: '不是必须完全禁用，而是降低亮度、停止工作消息和短视频。' },
  { key: 'light', label: '睡前调暗灯光', desc: '固定一个“关大灯/开小灯”的动作，帮助身体进入夜间节律。' },
  { key: 'temp', label: '卧室保持凉爽', desc: '多数人更适合 18–24°C；以自己舒适、不出汗为准。' },
  { key: 'exercise', label: '白天有活动，睡前不剧烈运动', desc: '规律活动有助于睡眠；临睡前高强度训练可能推迟入睡。' },
  { key: 'routine', label: '固定起床时间', desc: '比固定入睡时间更容易执行，也是稳定生物钟的锚点。' },
  { key: 'bed', label: '困了再上床，不在床上工作', desc: '让床和睡眠建立稳定关联；躺 20 分钟仍清醒可起身做安静的事。' }
];
const HOS_SLEEP_WIND_DOWN = [
  { id: 'wd-120', offset: -120, title: '结束工作与消息', note: '关掉工作窗口，写下明天第一件事。' },
  { id: 'wd-90', offset: -90, title: '轻活动 / 拉伸', note: '散步、洗澡或 5 分钟拉伸，不刷短视频。' },
  { id: 'wd-60', offset: -60, title: '洗漱与护肤', note: '把强光屏幕移出卧室。' },
  { id: 'wd-30', offset: -30, title: '阅读 / 呼吸练习', note: '纸质书、轻音乐或 4-7-8 呼吸。' },
  { id: 'wd-10', offset: -10, title: '调暗灯光 / 空调', note: '确认室温、噪音与闹钟。' },
  { id: 'wd-0', offset: 0, title: '关灯上床', note: '困了再躺下；不强迫自己立刻睡着。' }
];

function hosSleepState() {
  if (!state.sleep || !state.sleep.profile) hosEnsureSleepState();
  return state.sleep;
}
function hosEnsureSleepState() {
  if (typeof state === 'undefined' || !state) return;
  state.sleep = state.sleep && typeof state.sleep === 'object' ? state.sleep : {};
  const s = state.sleep;
  s.profile = { targetHours: 7.5, usualWake: '07:00', usualBed: '23:30', latencyMin: 15, caffeineLimit: 200, ...(s.profile || {}) };
  if (!Array.isArray(s.logs)) s.logs = [];
  if (!Array.isArray(s.windDown) || !s.windDown.length) s.windDown = HOS_SLEEP_WIND_DOWN.map((x) => ({ ...x }));
  if (!s.hygiene || typeof s.hygiene !== 'object') s.hygiene = {};
  if (!s.windDownDone || typeof s.windDownDone !== 'object') s.windDownDone = {};
}
function hosSleepLogs() {
  return (hosSleepState().logs || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function hosSleepLogByDate(date) {
  return (hosSleepState().logs || []).find((x) => x.date === date) || null;
}
function hosSleepLatest() {
  return hosSleepLogs().find((x) => x.bedtime && x.wakeTime) || null;
}
function hosSleepInBedMinutes(log) {
  const bed = hosTimeToMin(log.bedtime);
  const wake = hosTimeToMin(log.wakeTime);
  if (bed == null || wake == null) return 0;
  let minutes = wake - bed;
  if (minutes <= 0) minutes += 1440;
  return minutes;
}
function hosSleepDurationMinutes(log) {
  const inBed = hosSleepInBedMinutes(log);
  if (!inBed) return 0;
  return Math.max(0, inBed - hosNum(log.latencyMin) - hosNum(log.awakeMin));
}
function hosSleepEfficiency(log) {
  const inBed = hosSleepInBedMinutes(log);
  return inBed ? hosClamp((hosSleepDurationMinutes(log) / inBed) * 100, 0, 100) : 0;
}
function hosSleepTargetMin() {
  return hosNum(hosSleepState().profile.targetHours, 7.5) * 60;
}
function hosSleepDebt(days = 14) {
  const dates = new Set(hosDates(days));
  const logs = hosSleepLogs().filter((x) => dates.has(x.date) && x.bedtime && x.wakeTime);
  const target = hosSleepTargetMin();
  const net = logs.reduce((sum, log) => sum + (hosSleepDurationMinutes(log) - target), 0);
  return { minutes: net, debt: Math.max(0, net), surplus: Math.max(0, -net), days: logs.length };
}
function hosSleepConsistency(days = 14) {
  const dates = new Set(hosDates(days));
  const logs = hosSleepLogs().filter((x) => dates.has(x.date) && x.bedtime && x.wakeTime);
  const bed = logs.map((x) => {
    const m = hosTimeToMin(x.bedtime);
    return m > 12 * 60 ? m - 1440 : m;
  });
  const wake = logs.map((x) => hosTimeToMin(x.wakeTime));
  const bedStd = hosStd(bed);
  const wakeStd = hosStd(wake);
  const score = logs.length >= 3 ? Math.round(hosClamp(100 - (bedStd / 60) * 8 - (wakeStd / 60) * 4, 0, 100)) : null;
  return { bedStd, wakeStd, score, days: logs.length };
}
function hosSleepReadiness(log) {
  if (!log || !log.bedtime || !log.wakeTime) return null;
  const duration = hosSleepDurationMinutes(log);
  const target = hosSleepTargetMin();
  const quality = hosNum(log.quality, 3);
  const efficiency = hosSleepEfficiency(log);
  const debt = hosSleepDebt(14);
  const consistency = hosSleepConsistency(14);
  const durationScore = hosClamp((duration / Math.max(1, target)) * 100, 0, 100);
  const qualityScore = (quality / 5) * 100;
  const efficiencyScore = hosClamp(efficiency, 0, 100);
  const debtScore = hosClamp(100 - (debt.debt / Math.max(1, target * 3)) * 100, 0, 100);
  const consistencyScore = consistency.score == null ? 70 : consistency.score;
  let score = durationScore * 0.35 + qualityScore * 0.25 + efficiencyScore * 0.15 + debtScore * 0.15 + consistencyScore * 0.1;
  const reasons = [];
  if (hosNum(log.alcoholUnits) > 0) { score -= Math.min(12, hosNum(log.alcoholUnits) * 4); reasons.push(`酒精 ${hosNum(log.alcoholUnits)} 单位，可能增加夜醒`); }
  const cutoff = hosSleepCaffeineCutoff();
  if (log.caffeineTime && hosTimeToMin(log.caffeineTime) > hosTimeToMin(cutoff)) { score -= 5; reasons.push(`咖啡因晚于建议截止 ${cutoff}`); }
  if (hosNum(log.screenMin) > 60) { score -= 3; reasons.push('睡前屏幕时间偏长'); }
  if (hosNum(log.stress, 0) >= 4) { score -= 5; reasons.push('主观压力偏高'); }
  if (hosNum(log.awakenings) >= 3) { score -= 3; reasons.push(`夜醒 ${hosNum(log.awakenings)} 次`); }
  score = Math.round(hosClamp(score, 0, 100));
  const label = score >= 85 ? '恢复充足' : score >= 70 ? '基本恢复' : score >= 55 ? '偏疲劳' : '明显不足';
  const tone = score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad';
  const training = score >= 80 ? '可按计划训练；仍以热身和主观状态为准。' : score >= 60 ? '可训练，但建议控制强度，避免额外加量。' : '优先恢复：改为轻活动、拉伸或休息，不追求 PR。';
  return { score, label, tone, reasons, training, duration, target, quality, efficiency, debt, consistency };
}
function hosSleepCaffeineCutoff() {
  const bed = hosTimeToMin(hosSleepState().profile.usualBed);
  return bed == null ? '15:00' : hosMinToClock(bed - 8 * 60);
}
function hosSleepIdealBedtime() {
  const p = hosSleepState().profile;
  const wake = hosTimeToMin(p.usualWake) || 7 * 60;
  return hosMinToClock(wake - hosNum(p.targetHours, 7.5) * 60 - hosNum(p.latencyMin, 15));
}
function hosSleepWindDownPlan() {
  const s = hosSleepState();
  const bed = hosTimeToMin(hosSleepIdealBedtime()) || 23 * 60;
  const done = new Set(s.windDownDone[hosToday()] || []);
  return (s.windDown || []).slice().sort((a, b) => a.offset - b.offset).map((step) => ({ ...step, time: hosMinToClock(bed + hosNum(step.offset)), done: done.has(step.id) }));
}
function hosSleepHygieneDone(date = hosToday()) {
  return hosSleepState().hygiene[date] || {};
}
function hosSleepToggleHygiene(key) {
  const s = hosSleepState();
  const date = hosToday();
  s.hygiene[date] = s.hygiene[date] || {};
  s.hygiene[date][key] = !s.hygiene[date][key];
  saveAndRender('睡眠卫生清单已更新');
}
function hosSleepToggleWindDown(id) {
  const s = hosSleepState();
  const date = hosToday();
  const list = s.windDownDone[date] || [];
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1); else list.push(id);
  s.windDownDone[date] = list;
  saveAndRender('睡前流程已更新');
}
function hosSleepInsights() {
  const logs = hosSleepLogs().filter((x) => x.bedtime && x.wakeTime);
  const out = [];
  if (!logs.length) return [{ tone: 'neutral', title: '还没有睡眠记录', text: '记录一晚上的上床、入睡和起床时间，系统才能计算睡眠债与恢复准备度。' }];
  const recent = logs.filter((x) => hosDates(14).includes(x.date));
  const target = hosSleepTargetMin();
  const avgDuration = hosAvg(recent, (x) => hosSleepDurationMinutes(x));
  const debt = hosSleepDebt(14);
  const consistency = hosSleepConsistency(14);
  const lateCaffeine = recent.filter((x) => x.caffeineTime && hosTimeToMin(x.caffeineTime) > hosTimeToMin(hosSleepCaffeineCutoff()));
  const alcohol = recent.filter((x) => hosNum(x.alcoholUnits) > 0);
  const screens = recent.filter((x) => hosNum(x.screenMin) > 60);
  if (avgDuration && avgDuration < target - 30) out.push({ tone: 'warn', title: '平均睡眠不足', text: `近 14 天有记录的平均睡眠 ${hosRound(avgDuration / 60, 1)} 小时，低于目标 ${hosRound(target / 60, 1)} 小时。先固定起床时间，再逐步提前上床。` });
  if (debt.debt > 90) out.push({ tone: 'warn', title: `累计睡眠债 ${Math.round(debt.debt / 60 * 10) / 10} 小时`, text: '睡眠债不是靠一次周末补觉完全解决；接下来 3–5 天每天多 30–60 分钟更实际。' });
  if (consistency.score != null && consistency.score < 60) out.push({ tone: 'warn', title: '作息波动较大', text: `入睡时间标准差约 ${Math.round(consistency.bedStd)} 分钟。固定起床时间通常比强迫自己提前入睡更有效。` });
  if (lateCaffeine.length >= 2) out.push({ tone: 'warn', title: '咖啡因截止时间偏晚', text: `近 14 天有 ${lateCaffeine.length} 天晚于 ${hosSleepCaffeineCutoff()} 摄入咖啡因。对敏感人群，建议再提前 1–2 小时。` });
  if (alcohol.length >= 2) out.push({ tone: 'neutral', title: '酒精与睡眠质量', text: `近 14 天有 ${alcohol.length} 天记录饮酒。酒精可能缩短入睡时间，但增加夜醒；观察你自己的数据，不把关联当因果。` });
  if (screens.length >= 3) out.push({ tone: 'neutral', title: '睡前屏幕时间偏长', text: `近 14 天有 ${screens.length} 天睡前屏幕超过 60 分钟。先尝试把手机移出床头或开启夜间模式。` });
  if (!out.length) out.push({ tone: 'good', title: '睡眠节律基本稳定', text: '继续保持固定起床时间、适量咖啡因截止和睡前降速流程。' });
  return out.slice(0, 4);
}
function hosSleepSummaryCard() {
  const log = hosSleepLatest();
  const r = hosSleepReadiness(log);
  return `<article class="hos-overview-item"><header><span>SLEEP</span><b class="${r ? r.tone : ''}">${r ? r.score + '/100' : '未记录'}</b></header><h4>睡眠 · 昨晚恢复</h4><p>${log ? `${hosRound(hosSleepDurationMinutes(log) / 60, 1)} 小时 · 质量 ${hosNum(log.quality, 0)}/5 · ${r.label}` : '还没有睡眠记录'}</p>${hosProgress(r ? r.score : 0, 100, r ? r.label : '记录后计算恢复准备度')}<button class="btn btn-small btn-outline" data-action="capability-page" data-page="sleep">打开睡眠工作台 →</button></article>`;
}

/* ---- 页面 ------------------------------------------------------------- */
function renderSleepOS() {
  return `${sectionHead('SLEEP OS · REST & READINESS', '睡眠记录与恢复', '记录真实睡眠，而不是只记“睡了几小时”：上床、入睡、夜醒、咖啡因、酒精、屏幕和压力都会影响恢复。系统计算睡眠债、作息规律性与恢复准备度，并给出今天该不该加量训练的建议。', `<button class="btn btn-outline" data-action="capability-page" data-page="health">← 健康总览</button><button class="btn btn-primary" data-action="hos-sleep-log">＋ 记录睡眠</button>`)}
  <div class="hos-shell" data-tab-shell data-tab-key="sleep" data-default-tab="today">
    <div class="hos-bar"><div class="fit-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="today" role="tab">今日</button>
      <button class="fit-tab" data-tab="log" role="tab">记录</button>
      <button class="fit-tab" data-tab="winddown" role="tab">作息</button>
      <button class="fit-tab" data-tab="review" role="tab">复盘</button>
    </div><div class="hos-bar-actions"><span class="hos-badge">目标 ${hosSleepState().profile.targetHours}h · 起床 ${esc(hosSleepState().profile.usualWake)}</span><button class="btn btn-small btn-outline" data-action="hos-sleep-settings">作息设置</button></div></div>
    <div class="fit-panel active" data-tab-panel="today">${hosSleepTodayPanel()}</div>
    <div class="fit-panel" data-tab-panel="log">${hosSleepLogPanel()}</div>
    <div class="fit-panel" data-tab-panel="winddown">${hosSleepWindDownPanel()}</div>
    <div class="fit-panel" data-tab-panel="review">${hosSleepReviewPanel()}</div>
  </div>`;
}
function hosSleepBandChart(days = 14) {
  const dates = hosDates(days);
  const start = 18 * 60;
  const end = 36 * 60;
  const range = end - start;
  const rows = dates.map((date) => {
    const log = hosSleepLogByDate(date);
    if (!log || !log.bedtime || !log.wakeTime) return `<div class="hos-band-row is-empty"><b>${date.slice(5)}</b><div class="hos-band-track"></div><small>—</small></div>`;
    let bed = hosTimeToMin(log.bedtime);
    let wake = hosTimeToMin(log.wakeTime);
    if (bed < 12 * 60) bed += 1440;
    if (wake <= bed) wake += 1440;
    const left = hosClamp(((bed - start) / range) * 100, 0, 100);
    const width = hosClamp(((wake - bed) / range) * 100, 0.5, 100 - left);
    const duration = hosSleepDurationMinutes(log);
    const tone = duration >= hosSleepTargetMin() * 0.9 ? 'good' : duration >= hosSleepTargetMin() * 0.75 ? 'warn' : 'bad';
    return `<div class="hos-band-row"><b>${date.slice(5)}</b><div class="hos-band-track"><i class="${tone}" style="left:${left}%;width:${width}%"></i></div><small>${hosRound(duration / 60, 1)}h</small></div>`;
  }).join('');
  return `<div class="hos-band"><div class="hos-band-axis"><span>18:00</span><span>24:00</span><span>06:00</span><span>12:00</span></div>${rows}</div><div class="hos-chart-note">横条表示卧床区间；颜色按睡眠时长相对目标判断，空白为未记录。</div>`;
}
function hosSleepCycles() {
  const p = hosSleepState().profile;
  const wake = hosTimeToMin(p.usualWake) || 7 * 60;
  const latency = hosNum(p.latencyMin, 15);
  return [6, 5, 4].map((cycles) => ({ cycles, bed: hosMinToClock(wake - cycles * 90 - latency), wake: p.usualWake, total: hosRound((cycles * 90) / 60, 1) }));
}

function hosSleepTodayPanel() {
  const log = hosSleepLatest();
  const r = log ? hosSleepReadiness(log) : null;
  const debt = hosSleepDebt(14);
  const consistency = hosSleepConsistency(14);
  const target = hosSleepTargetMin();
  const dates = hosDates(7);
  const durations = dates.map((d) => {
    const item = hosSleepLogByDate(d);
    return item && item.bedtime ? hosSleepDurationMinutes(item) : null;
  });
  const hygiene = hosSleepHygieneDone();
  const plan = hosSleepWindDownPlan();
  return `<div class="hos-hero"><div><span class="eyebrow">SLEEP · ${log ? esc(hosDateLabel(log.date)) : '等待第一晚记录'}</span><h2>${r ? `${hosRound(r.duration / 60, 1)}<small> 小时 · ${r.label}</small>` : '先记录一晚，才能谈恢复'}</h2><p>${log ? `上床 ${esc(log.bedtime)} → 起床 ${esc(log.wakeTime)} · 效率 ${Math.round(r.efficiency)}% · 睡眠债 ${hosRound(debt.debt / 60, 1)} 小时 · 作息规律性 ${consistency.score == null ? '—' : consistency.score + '/100'}` : `目标 ${hosSleepState().profile.targetHours} 小时，建议上床 ${hosSleepIdealBedtime()}；先记录真实入睡与起床时间。`}</p><div class="hos-hero-actions"><button class="btn btn-primary" data-action="hos-sleep-log" data-date="${hosToday()}">${log ? '补录/修改昨晚' : '记录昨晚睡眠'}</button><button class="btn btn-outline" data-action="hos-sleep-settings">调整目标</button><button class="btn btn-outline" data-action="capability-page" data-page="fitness">去训练 →</button></div></div><div class="hos-hero-rings">${hosRing(r ? r.score : 0, r ? r.score : '—', '恢复准备度', r ? r.label : '未记录')}${hosRing((r ? r.duration : 0) / Math.max(1, target) * 100, r ? hosRound(r.duration / 60, 1) : '—', '睡眠小时', `目标 ${hosSleepState().profile.targetHours}h`)}</div></div>
  <div class="hos-kpis">${hosKpi('睡眠债 · 14天', debt.days ? hosRound(debt.debt / 60, 1) : '—', '小时', debt.days ? `基于 ${debt.days} 晚记录` : '还没有记录', debt.debt > 1 ? 'warn' : 'good')} ${hosKpi('睡眠效率', r ? Math.round(r.efficiency) : '—', '%', '睡眠时间 / 卧床时间')} ${hosKpi('作息规律性', consistency.score == null ? '—' : consistency.score, '/100', `入睡波动 ${Math.round(consistency.bedStd)} 分钟`)} ${hosKpi('平均睡眠 · 7天', durations.some((x) => x != null) ? hosRound(hosAvg(durations.filter((x) => x != null)) / 60, 1) : '—', '小时', '只统计有记录的晚上')}</div>
  ${r ? `<div class="hos-alert ${r.tone === 'good' ? 'good' : r.tone === 'warn' ? 'warn' : 'bad'}"><b>今天怎么练</b><p>${esc(r.training)}${r.reasons.length ? ` 主要扣分：${esc(r.reasons.join('；'))}。` : ''}</p><button class="btn btn-small btn-outline" data-action="capability-page" data-page="fitness">打开健身管理</button></div>` : ''}
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>今晚睡前时间线</h3><p>按目标起床时间倒推；点一下标记完成。</p></div><span class="tag neutral">${hosSleepIdealBedtime()} 上床</span></div><div class="hos-timeline">${plan.map((x) => `<button class="hos-timeline-step ${x.done ? 'is-done' : ''}" data-action="hos-sleep-winddown-toggle" data-id="${esc(x.id)}"><time>${esc(x.time)}</time><span>${esc(x.title)}</span><small>${esc(x.note || '')}</small><i>${x.done ? '✓' : ''}</i></button>`).join('') || hosEmpty('还没有睡前步骤。')}</div></section>
  <section class="card"><div class="card-head"><div><h3>睡眠卫生清单</h3><p>不追求 100% 完美，挑 2–3 项先做。</p></div><span class="tag neutral">${Object.values(hygiene).filter(Boolean).length}/${HOS_SLEEP_HYGIENE.length}</span></div><div class="hos-checklist">${HOS_SLEEP_HYGIENE.map((x) => `<button class="${hygiene[x.key] ? 'is-done' : ''}" data-action="hos-sleep-hygiene" data-key="${esc(x.key)}"><span>${hygiene[x.key] ? '✓' : ''}</span><div><strong>${esc(x.label)}</strong><small>${esc(x.desc)}</small></div></button>`).join('')}</div></section></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>最近 7 晚</h3><p>睡眠小时与目标线。</p></div></div>${hosBarChart(durations.map((x) => (x == null ? 0 : hosRound(x / 60, 1))), dates.map((d) => d.slice(5)), { target: hosNum(hosSleepState().profile.targetHours, 7.5), unit: 'h', height: 140 })}</section><section class="card"><div class="card-head"><div><h3>恢复建议</h3><p>基于睡眠债、规律性和昨晚数据。</p></div></div>${hosInsightCards(hosSleepInsights())}</section></div>`;
}
function hosSleepLogPanel() {
  const logs = hosSleepLogs();
  return `<div class="hos-lead"><span class="eyebrow">SLEEP LOG</span><h2>一晚一条，按醒来日期记</h2><p>日期填起床当天；例如周一早上醒来，记周一。午睡单独记录，不计入夜间睡眠债。</p></div>
  <div class="hos-kpis">${hosKpi('总记录', logs.length, '晚', '本机保存')} ${hosKpi('最近一次', logs[0] ? hosRound(hosSleepDurationMinutes(logs[0]) / 60, 1) : '—', '小时', logs[0] ? esc(logs[0].date) : '还没有记录')} ${hosKpi('咖啡因截止', hosSleepCaffeineCutoff(), '', '按目标上床时间倒推 8 小时')} ${hosKpi('建议上床', hosSleepIdealBedtime(), '', `目标 ${hosSleepState().profile.targetHours}h`)}</div>
  <section class="card"><div class="card-head"><div><h3>睡眠历史</h3><p>最近 40 晚；可编辑或删除。</p></div><button class="btn btn-primary" data-action="hos-sleep-log">＋ 新增记录</button></div><div class="hos-sleep-list">${logs.slice(0, 40).map((log) => {
    const r = hosSleepReadiness(log);
    return `<article><div class="hos-sleep-date"><b>${esc(log.date.slice(5))}</b><small>${esc(hosDateLabel(log.date, false))}</small></div><div class="hos-sleep-main"><strong>${hosRound(hosSleepDurationMinutes(log) / 60, 1)} 小时</strong><small>${esc(log.bedtime || '—')} → ${esc(log.wakeTime || '—')} · 质量 ${hosNum(log.quality, 0)}/5 · 效率 ${Math.round(hosSleepEfficiency(log))}%</small><p>${esc(log.note || '')}</p></div><div class="hos-sleep-score ${r ? r.tone : ''}">${r ? r.score : '—'}<small>恢复</small></div><div class="hos-sleep-actions"><button class="btn btn-small btn-outline" data-action="hos-sleep-log" data-date="${esc(log.date)}">编辑</button><button class="btn btn-small btn-ghost" data-action="hos-sleep-delete" data-id="${esc(log.id)}">删除</button></div></article>`;
  }).join('') || hosEmpty('还没有睡眠记录。', '<button class="btn btn-primary" data-action="hos-sleep-log">记录第一晚</button>')}</div></section>`;
}
function hosSleepWindDownPanel() {
  const p = hosSleepState().profile;
  const plan = hosSleepWindDownPlan();
  return `<div class="hos-lead"><span class="eyebrow">WIND-DOWN & SETTINGS</span><h2>把“早点睡”拆成可执行的动作</h2><p>固定起床时间，按目标睡眠倒推上床时间；睡前一小时降低光线、工作和信息刺激。</p></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>作息设置</h3><p>目标睡眠、起床时间、入睡潜伏期和咖啡因上限。</p></div></div><form id="hosSleepSettingsForm" class="fit-form" autocomplete="off"><div class="fit-grid-2"><label class="fit-field"><span>目标睡眠（小时）</span>${hosNumber('targetHours', p.targetHours, 'min="4" max="11" step="0.25"')}</label><label class="fit-field"><span>通常起床</span><input type="time" name="usualWake" value="${esc(p.usualWake)}"></label><label class="fit-field"><span>通常上床</span><input type="time" name="usualBed" value="${esc(p.usualBed)}"></label><label class="fit-field"><span>入睡潜伏期（分钟）</span>${hosNumber('latencyMin', p.latencyMin, 'min="0" max="120"')}</label><label class="fit-field"><span>咖啡因上限（mg/天）</span>${hosNumber('caffeineLimit', p.caffeineLimit, 'min="0" max="600" step="10"')}</label></div>${hosFormFoot('hos-sleep-save-settings', '保存作息设置')}</form><div class="hos-calc-note"><span>建议上床 <b>${hosSleepIdealBedtime()}</b></span><span>咖啡因截止 <b>${hosSleepCaffeineCutoff()}</b></span></div></section>
  <section class="card"><div class="card-head"><div><h3>今晚时间线</h3><p>按建议上床时间倒推；可在下方增删步骤。</p></div></div><div class="hos-timeline">${plan.map((x) => `<article class="hos-timeline-step ${x.done ? 'is-done' : ''}"><time>${esc(x.time)}</time><span>${esc(x.title)}</span><small>${esc(x.note || '')}</small><button class="btn btn-small btn-ghost" data-action="hos-sleep-winddown-remove" data-id="${esc(x.id)}">移除</button></article>`).join('')}</div><form id="hosSleepWindDownForm" class="hos-add-step"><input name="offset" type="number" value="-45" step="5" title="相对上床时间（分钟，负数=提前）"><input name="title" placeholder="新步骤，例如：关工作消息"><input name="note" placeholder="备注"><button class="btn btn-small btn-primary" type="button" data-action="hos-sleep-winddown-add">＋ 添加</button></form></section></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>睡眠周期倒推</h3><p>按 90 分钟一个周期估算；以醒来不昏沉为准，不必追求整周期。</p></div></div><div class="hos-cycles">${hosSleepCycles().map((x) => `<article><b>${x.cycles} 个周期</b><strong>${esc(x.bed)} → ${esc(x.wake)}</strong><small>约 ${x.total} 小时 · 含入睡潜伏期 ${hosNum(hosSleepState().profile.latencyMin, 15)} 分钟</small></article>`).join('')}</div></section><section class="card"><div class="card-head"><div><h3>咖啡因截止</h3><p>按目标上床时间提前 8 小时；敏感人群可再提前 1–2 小时。</p></div></div><div class="hos-caffeine"><strong>${esc(hosSleepCaffeineCutoff())}</strong><p>之后尽量只喝水、无咖啡因茶或牛奶。当前自设上限 ${hosNum(hosSleepState().profile.caffeineLimit, 200)}mg/天。</p><small>咖啡因半衰期约 5 小时；个体差异很大，以你的睡眠记录为准。</small></div></section></div>
  <section class="card"><div class="card-head"><div><h3>睡眠卫生</h3><p>与今天清单同步；这里只解释原因。</p></div></div><div class="hos-hygiene-grid">${HOS_SLEEP_HYGIENE.map((x) => `<article><b>${esc(x.label)}</b><p>${esc(x.desc)}</p></article>`).join('')}</div></section>`;
}
function hosSleepReviewPanel() {
  const range = hosNum(ui.sleepRange, 14) === 30 ? 30 : 14;
  const dates = hosDates(range);
  const logs = dates.map((d) => hosSleepLogByDate(d));
  const durations = logs.map((x) => (x && x.bedtime ? hosRound(hosSleepDurationMinutes(x) / 60, 1) : null));
  const quality = logs.map((x) => (x ? hosNum(x.quality, null) : null));
  const bedHours = logs.map((x) => {
    if (!x || !x.bedtime) return null;
    const m = hosTimeToMin(x.bedtime);
    return hosRound((m > 12 * 60 ? m : m + 1440) / 60, 1);
  });
  const efficiency = logs.map((x) => (x ? Math.round(hosSleepEfficiency(x)) : null));
  const debt = hosSleepDebt(range);
  const consistency = hosSleepConsistency(range);
  return `<div class="hos-lead"><span class="eyebrow">REVIEW · ${range} NIGHTS</span><h2>睡得够不够，稳不稳</h2><p>睡眠时长看目标，规律性看波动，恢复准备度结合质量、效率、睡眠债和主观压力。数据不足时不给伪精确结论。</p></div>
  <div class="hos-toolbar"><div class="hos-chips"><button class="hos-chip ${range === 14 ? 'is-on' : ''}" data-action="hos-sleep-range" data-range="14">近 14 晚</button><button class="hos-chip ${range === 30 ? 'is-on' : ''}" data-action="hos-sleep-range" data-range="30">近 30 晚</button></div></div>
  <div class="hos-kpis">${hosKpi('平均睡眠', durations.some((x) => x != null) ? hosDash(hosAvg(durations.filter((x) => x != null)), 1) : '—', '小时', `目标 ${hosSleepState().profile.targetHours}h`)} ${hosKpi('睡眠债', debt.days ? hosRound(debt.debt / 60, 1) : '—', '小时', debt.days ? '净缺口' : '还没有记录')} ${hosKpi('规律性', consistency.score == null ? '—' : consistency.score, '/100', `入睡波动 ${Math.round(consistency.bedStd)} 分钟`)} ${hosKpi('平均效率', efficiency.some((x) => x != null) ? hosDash(hosAvg(efficiency.filter((x) => x != null))) : '—', '%', '睡眠/卧床')}</div>
  <section class="card"><div class="card-head"><div><h3>${range} 晚睡眠带</h3><p>一眼看出上床时间漂移、卧床过长和睡眠不足。</p></div></div>${hosSleepBandChart(range)}</section>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>睡眠时长与目标</h3><p>空白表示当天没有记录。</p></div></div>${hosBarChart(durations, dates.map((d) => d.slice(5)), { target: hosNum(hosSleepState().profile.targetHours, 7.5), unit: 'h', height: 150 })}</section><section class="card"><div class="card-head"><div><h3>主观质量</h3><p>1–5 分，按自己的感受记录。</p></div></div>${hosLineChart(quality, dates.map((d) => d.slice(5)), { min: 1, max: 5, color: 'var(--blue)', label: '睡眠质量趋势' })}</section></div>
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>入睡时间</h3><p>越接近一条水平线，作息越稳定。</p></div></div>${hosLineChart(bedHours, dates.map((d) => d.slice(5)), { min: 21, max: 27, color: 'var(--warn)', label: '入睡时间趋势' })}<div class="hos-chart-note">24 点后显示为 24–27，便于观察跨午夜。</div></section><section class="card"><div class="card-head"><div><h3>睡眠效率</h3><p>低于 85% 时，先检查入睡困难、夜醒和卧床时间。</p></div></div>${hosLineChart(efficiency, dates.map((d) => d.slice(5)), { min: 0, max: 100, target: 85, color: 'var(--good)', label: '睡眠效率趋势' })}</section></div>
  <section class="card"><div class="card-head"><div><h3>复盘提示</h3><p>基于已记录数据；关联不等于因果。</p></div></div>${hosInsightCards(hosSleepInsights())}</section>
  <section class="card"><div class="card-head"><div><h3>旧版通用睡眠记录</h3><p>保留原「健康历史记录」中的条目；新记录请使用睡眠工作台。</p></div><span class="tag neutral">${(state.healthLogs || []).filter((x) => x.category === '睡眠').length} 条</span></div><div class="hos-legacy-list">${(state.healthLogs || []).filter((x) => x.category === '睡眠').slice(0, 12).map((x) => `<article><b>${esc(x.date)}</b><div><strong>${esc(x.title)}</strong><p>${esc(x.detail || x.note || '')}</p></div></article>`).join('') || hosEmpty('没有旧版睡眠记录。')}</div></section>`;
}

/* ---- 弹层与动作 ------------------------------------------------------- */
function hosSleepOpenLog(date = hosToday()) {
  const existing = hosSleepLogByDate(date) || {};
  hosOpenSheet(existing.id ? '编辑睡眠记录' : '记录睡眠', '日期填醒来当天；上床时间可以晚于日期前一天。', `<form id="hosSleepLogForm" class="fit-form" autocomplete="off">
    <input type="hidden" name="recordId" value="${esc(existing.id || '')}">
    <input type="hidden" name="originalDate" value="${esc(existing.date || '')}">
    <div class="fit-grid-2"><label class="fit-field"><span>醒来日期</span><input type="date" name="date" value="${esc(existing.date || date)}"></label><label class="fit-field"><span>上床时间</span><input type="time" name="bedtime" value="${esc(existing.bedtime || hosSleepState().profile.usualBed || '23:30')}"></label><label class="fit-field"><span>起床时间</span><input type="time" name="wakeTime" value="${esc(existing.wakeTime || hosSleepState().profile.usualWake || '07:00')}"></label><label class="fit-field"><span>入睡潜伏期 min</span>${hosNumber('latencyMin', existing.latencyMin != null ? existing.latencyMin : 15, 'min="0" max="180"')}</label><label class="fit-field"><span>夜醒次数</span>${hosNumber('awakenings', existing.awakenings != null ? existing.awakenings : 0, 'min="0" max="20"')}</label><label class="fit-field"><span>夜醒总时长 min</span>${hosNumber('awakeMin', existing.awakeMin != null ? existing.awakeMin : 0, 'min="0" max="300"')}</label><label class="fit-field"><span>午睡 min</span>${hosNumber('napMin', existing.napMin != null ? existing.napMin : 0, 'min="0" max="180"')}</label><label class="fit-field"><span>睡眠质量 1–5</span>${hosSelect('quality', existing.quality || 4, [5, 4, 3, 2, 1])}</label><label class="fit-field"><span>醒来精神 1–5</span>${hosSelect('rested', existing.rested || 4, [5, 4, 3, 2, 1])}</label><label class="fit-field"><span>压力 1–5</span>${hosSelect('stress', existing.stress || 2, [1, 2, 3, 4, 5])}</label></div>
    <div class="hos-form-divider">咖啡因 / 酒精 / 屏幕</div>
    <div class="fit-grid-2"><label class="fit-field"><span>咖啡因杯数</span>${hosNumber('caffeineCups', existing.caffeineCups != null ? existing.caffeineCups : 1, 'min="0" max="10"')}</label><label class="fit-field"><span>最后一杯时间</span><input type="time" name="caffeineTime" value="${esc(existing.caffeineTime || '')}"></label><label class="fit-field"><span>酒精单位</span>${hosNumber('alcoholUnits', existing.alcoholUnits != null ? existing.alcoholUnits : 0, 'min="0" max="20" step="0.5"')}</label><label class="fit-field"><span>睡前屏幕 min</span>${hosNumber('screenMin', existing.screenMin != null ? existing.screenMin : 45, 'min="0" max="600"')}</label><label class="fit-field"><span>室温 °C</span>${hosNumber('roomTemp', existing.roomTemp != null ? existing.roomTemp : 24, 'min="10" max="40" step="0.5"')}</label><label class="fit-field"><span>HRV（可选）</span>${hosNumber('hrv', existing.hrv != null ? existing.hrv : '', 'min="0" max="300"')}</label><label class="fit-field"><span>静息心率（可选）</span>${hosNumber('rhr', existing.rhr != null ? existing.rhr : '', 'min="30" max="150"')}</label></div>
    <label class="fit-field fit-wide"><span>备注</span><textarea name="note" rows="2" placeholder="做梦、夜醒原因、床垫/噪音、第二天计划">${esc(existing.note || '')}</textarea></label>
    ${hosFormFoot('hos-sleep-save-log', existing.id ? '保存修改' : '保存睡眠记录')}
  </form>`);
}
function hosSleepSaveLog() {
  const form = $('#hosSleepLogForm');
  if (!form) return;
  const fd = new FormData(form);
  const date = String(fd.get('date') || hosToday());
  const recordId = String(fd.get('recordId') || '');
  const s = hosSleepState();
  const prev = s.logs.find((x) => String(x.id) === recordId) || s.logs.find((x) => x.date === date) || { id: `sleep-${date}-${Date.now()}` };
  const log = {
    id: prev.id, date,
    bedtime: String(fd.get('bedtime') || ''), wakeTime: String(fd.get('wakeTime') || ''),
    latencyMin: hosNum(fd.get('latencyMin')), awakenings: hosNum(fd.get('awakenings')), awakeMin: hosNum(fd.get('awakeMin')),
    napMin: hosNum(fd.get('napMin')), quality: hosNum(fd.get('quality'), 3), rested: hosNum(fd.get('rested'), 3), stress: hosNum(fd.get('stress'), 2),
    caffeineCups: hosNum(fd.get('caffeineCups')), caffeineTime: String(fd.get('caffeineTime') || ''),
    alcoholUnits: hosNum(fd.get('alcoholUnits')), screenMin: hosNum(fd.get('screenMin')), roomTemp: hosNum(fd.get('roomTemp')),
    hrv: fd.get('hrv') === '' ? null : hosNum(fd.get('hrv')), rhr: fd.get('rhr') === '' ? null : hosNum(fd.get('rhr')),
    note: String(fd.get('note') || ''), createdAt: prev.createdAt || new Date().toISOString()
  };
  if (!log.bedtime || !log.wakeTime) { toast('请填写上床与起床时间', true); return; }
  s.logs = s.logs.filter((x) => String(x.id) !== String(log.id) && x.date !== date);
  s.logs.unshift(log);
  state.healthChecks[date] = state.healthChecks[date] || {};
  state.healthChecks[date].sleep = hosSleepDurationMinutes(log) >= hosSleepTargetMin() * 0.9;
  hosCloseSheet();
  saveAndRender('睡眠记录已保存，恢复准备度已更新');
}
function hosSleepOpenSettings() {
  const p = hosSleepState().profile;
  hosOpenSheet('作息设置', '目标睡眠、起床时间与咖啡因截止会用于今晚时间线和恢复评分。', `<form id="hosSleepSettingsForm" class="fit-form" autocomplete="off"><div class="fit-grid-2"><label class="fit-field"><span>目标睡眠（小时）</span>${hosNumber('targetHours', p.targetHours, 'min="4" max="11" step="0.25"')}</label><label class="fit-field"><span>通常起床</span><input type="time" name="usualWake" value="${esc(p.usualWake)}"></label><label class="fit-field"><span>通常上床</span><input type="time" name="usualBed" value="${esc(p.usualBed)}"></label><label class="fit-field"><span>入睡潜伏期（分钟）</span>${hosNumber('latencyMin', p.latencyMin, 'min="0" max="120"')}</label><label class="fit-field"><span>咖啡因上限（mg/天）</span>${hosNumber('caffeineLimit', p.caffeineLimit, 'min="0" max="600" step="10"')}</label></div>${hosFormFoot('hos-sleep-save-settings', '保存设置')}</form>`);
}
function hosSleepSaveSettings() {
  const form = $('#hosSleepSettingsForm');
  if (!form) return;
  const fd = new FormData(form);
  const p = hosSleepState().profile;
  p.targetHours = hosClamp(fd.get('targetHours'), 4, 11);
  p.usualWake = String(fd.get('usualWake') || '07:00');
  p.usualBed = String(fd.get('usualBed') || '23:30');
  p.latencyMin = hosNum(fd.get('latencyMin'), 15);
  p.caffeineLimit = hosNum(fd.get('caffeineLimit'), 200);
  hosCloseSheet();
  saveAndRender('作息设置已保存');
}
function hosSleepAddWindDown() {
  const form = $('#hosSleepWindDownForm');
  if (!form) return;
  const fd = new FormData(form);
  const title = String(fd.get('title') || '').trim();
  if (!title) { toast('请填写步骤名称', true); return; }
  hosSleepState().windDown.push({ id: `wd-${Date.now()}`, offset: hosNum(fd.get('offset'), -30), title, note: String(fd.get('note') || '') });
  saveAndRender('睡前步骤已添加');
}
function hosSleepRemoveWindDown(id) {
  const s = hosSleepState();
  s.windDown = s.windDown.filter((x) => x.id !== id);
  saveAndRender('睡前步骤已移除');
}
function hosSleepDeleteLog(id) {
  const s = hosSleepState();
  s.logs = s.logs.filter((x) => String(x.id) !== String(id));
  saveAndRender('睡眠记录已删除');
}

/* ---- 事件 ------------------------------------------------------------- */
document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('hos-sleep-')) return;
  if (a === 'hos-sleep-log') { hosSleepOpenLog(btn.dataset.date || hosToday()); return; }
  if (a === 'hos-sleep-save-log') { hosSleepSaveLog(); return; }
  if (a === 'hos-sleep-delete') { hosSleepDeleteLog(btn.dataset.id); return; }
  if (a === 'hos-sleep-settings') {
    try { sessionStorage.setItem('wealthos-tab-sleep', 'winddown'); } catch (_) {}
    renderPage('sleep');
    return;
  }
  if (a === 'hos-sleep-save-settings') { hosSleepSaveSettings(); return; }
  if (a === 'hos-sleep-hygiene') { hosSleepToggleHygiene(btn.dataset.key); return; }
  if (a === 'hos-sleep-winddown-toggle') { hosSleepToggleWindDown(btn.dataset.id); return; }
  if (a === 'hos-sleep-winddown-add') { hosSleepAddWindDown(); return; }
  if (a === 'hos-sleep-winddown-remove') { hosSleepRemoveWindDown(btn.dataset.id); return; }
  if (a === 'hos-sleep-range') { ui.sleepRange = hosNum(btn.dataset.range, 14); renderPage('sleep'); return; }
});
