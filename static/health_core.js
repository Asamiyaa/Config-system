/* ============================================================================
   Health OS · shared layer
   为「皮肤护理 / 饮食饮水 / 睡眠与恢复」提供统一的状态初始化、指标计算、
   图表、弹层和健康总览卡片。加载顺序：health_core → skin_os → diet_os →
   sleep_os → app.js。所有函数只在运行时读取 state/ui，不在这里直接渲染。
   ========================================================================== */

const HOS = { version: 'V14', foodVersion: 'CN-FOOD-REF-2026' };

function hosNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function hosRound(value, digits = 0) {
  const n = hosNum(value);
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}
function hosClamp(value, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, hosNum(value)));
}
function hosSum(list, pick) {
  return (list || []).reduce((sum, item) => sum + hosNum(typeof pick === 'function' ? pick(item) : (pick ? item[pick] : item)), 0);
}
function hosAvg(list, pick) {
  const arr = list || [];
  return arr.length ? hosSum(arr, pick) / arr.length : 0;
}
function hosMedian(values) {
  const arr = (values || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}
function hosStd(values) {
  const arr = (values || []).map(Number).filter(Number.isFinite);
  if (arr.length < 2) return 0;
  const mean = hosAvg(arr);
  return Math.sqrt(hosAvg(arr.map((x) => (x - mean) ** 2)));
}
function hosDates(count, end = todayKey()) {
  return Array.from({ length: count }, (_, i) => shiftDateKey(end, i - (count - 1)));
}
function hosDateLabel(key, withWeekday = true) {
  if (!key) return '—';
  if (!withWeekday) return key.slice(5);
  const d = new Date(`${key}T12:00:00`);
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${key.slice(5)} 周${week}`;
}
function hosTimeToMin(value) {
  if (!value) return null;
  const [h, m] = String(value).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}
function hosMinToClock(minutes) {
  let m = Math.round(hosNum(minutes)) % 1440;
  if (m < 0) m += 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function hosNowClock() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function hosToday() {
  return todayKey();
}
function hosScoreTone(score, inverse = false) {
  if (score == null) return 'neutral';
  const x = hosNum(score);
  if (inverse) return x >= 70 ? 'bad' : x >= 45 ? 'warn' : 'good';
  return x >= 80 ? 'good' : x >= 60 ? 'warn' : 'bad';
}
function hosScoreLabel(score) {
  if (score == null) return '暂无数据';
  const x = hosNum(score);
  return x >= 85 ? '状态很好' : x >= 70 ? '基本稳定' : x >= 55 ? '需要关注' : '优先调整';
}
function hosDash(value, unit = '') {
  return value == null || value === '' ? '—' : `${hosRound(value, Number.isInteger(hosNum(value)) ? 0 : 1)}${unit}`;
}

function hosRing(percent, value, label, sub = '') {
  const p = hosClamp(percent, 0, 100);
  return `<div class="hos-ring" style="--hos-pct:${p}%"><div><b>${esc(String(value))}</b><small>${esc(label)}</small>${sub ? `<em>${esc(sub)}</em>` : ''}</div></div>`;
}
function hosKpi(label, value, unit = '', foot = '', tone = '') {
  return `<article class="hos-kpi ${tone}"><small>${esc(label)}</small><strong>${value}${unit ? `<em>${esc(unit)}</em>` : ''}</strong>${foot ? `<span>${esc(foot)}</span>` : ''}</article>`;
}
function hosMini(label, value, foot = '') {
  return `<div class="hos-mini"><small>${esc(label)}</small><b>${value}</b>${foot ? `<span>${esc(foot)}</span>` : ''}</div>`;
}
function hosChips(items, active, action, dataKey = 'value', labelKey = 'label') {
  return `<div class="hos-chips">${items.map((item) => `<button class="hos-chip ${String(item[dataKey]) === String(active) ? 'is-on' : ''}" data-action="${action}" data-${dataKey}="${esc(item[dataKey])}">${esc(item[labelKey])}${item.count != null ? `<small>${item.count}</small>` : ''}</button>`).join('')}</div>`;
}
function hosEmpty(text, action = '') {
  return `<div class="hos-empty"><p>${esc(text)}</p>${action || ''}</div>`;
}
function hosSectionCard(title, desc, body, actions = '', extraClass = '') {
  return `<section class="card ${extraClass}"><div class="card-head"><div><h3>${esc(title)}</h3>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${actions ? `<div class="hos-card-actions">${actions}</div>` : ''}</div>${body}</section>`;
}
function hosInsightCards(items) {
  if (!items || !items.length) return '';
  const icons = { good: '✓', warn: '!', bad: '×', neutral: '·' };
  return `<div class="hos-insights">${items.map((item) => `<article class="hos-insight ${item.tone || 'neutral'}"><span>${icons[item.tone] || '·'}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></article>`).join('')}</div>`;
}
function hosProgress(value, target, label = '') {
  const pct = target ? hosClamp((hosNum(value) / hosNum(target)) * 100, 0, 100) : 0;
  return `<div class="hos-progress"><i><b style="width:${pct}%"></b></i><span>${esc(label || `${hosDash(value)} / ${hosDash(target)}`)}</span></div>`;
}
function hosBarChart(values, labels, opts = {}) {
  const max = Math.max(1, ...values.map((v) => hosNum(v)), hosNum(opts.target));
  return `<div class="hos-bars ${opts.className || ''}" style="--hos-bar-h:${opts.height || 150}px">${values.map((value, i) => {
    const missing = value == null || value === '';
    const h = missing ? 0 : Math.max(value ? 4 : 0, (hosNum(value) / max) * 100);
    return `<div class="hos-bar-col ${missing ? 'is-missing' : ''}" title="${esc(labels[i])}：${missing ? '未记录' : hosDash(value, opts.unit || '')}"><i class="${opts.target && hosNum(value) >= hosNum(opts.target) ? 'is-hit' : ''}" style="height:${h}%"></i><b>${missing ? '—' : hosDash(value)}</b><small>${esc(labels[i])}</small></div>`;
  }).join('')}</div>${opts.target ? `<div class="hos-chart-note">目标 ${hosDash(opts.target, opts.unit || '')}</div>` : ''}`;
}
function hosLineChart(values, labels, opts = {}) {
  const width = opts.width || 680;
  const height = opts.height || 170;
  const pad = { l: 36, r: 14, t: 14, b: 24 };
  const nums = values.map((v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)));
  const present = nums.filter((v) => v != null);
  if (!present.length) return hosEmpty(opts.empty || '暂无趋势数据');
  const min = opts.min != null ? opts.min : Math.min(...present, opts.target != null ? opts.target : Infinity);
  const max = opts.max != null ? opts.max : Math.max(...present, opts.target != null ? opts.target : -Infinity);
  const span = max - min || 1;
  const x = (i) => pad.l + ((width - pad.l - pad.r) * i) / Math.max(1, nums.length - 1);
  const y = (v) => pad.t + (height - pad.t - pad.b) * (1 - (v - min) / span);
  let path = '';
  let pen = false;
  nums.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  const grid = [0, 0.5, 1].map((t) => min + span * t);
  return `<div class="hos-line-wrap"><svg class="hos-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(opts.label || '趋势图')}">
    <g stroke="var(--line)" stroke-dasharray="3 5">${grid.map((v) => `<line x1="${pad.l}" y1="${y(v)}" x2="${width - pad.r}" y2="${y(v)}"/>`).join('')}</g>
    ${opts.target != null ? `<line x1="${pad.l}" y1="${y(opts.target)}" x2="${width - pad.r}" y2="${y(opts.target)}" stroke="var(--warn)" stroke-dasharray="5 4"/>` : ''}
    <path d="${path}" fill="none" stroke="${opts.color || 'var(--accent)'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${nums.map((v, i) => (v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${opts.color || 'var(--accent)'}"/>`)).join('')}
    <g fill="var(--text-3)" font-size="9"><text x="${pad.l}" y="${height - 6}">${esc(labels[0] || '')}</text><text x="${width - pad.r - 28}" y="${height - 6}">${esc(labels[labels.length - 1] || '')}</text></g>
    <g fill="var(--text-3)" font-size="9"><text x="4" y="${y(grid[2]) + 3}">${hosDash(grid[2])}</text><text x="4" y="${y(grid[0]) + 3}">${hosDash(grid[0])}</text></g>
  </svg></div>`;
}
function hosStackBar(items) {
  const total = Math.max(1, hosSum(items, 'value'));
  return `<div class="hos-stack">${items.map((item) => `<i style="width:${(hosNum(item.value) / total) * 100}%;background:${item.color}" title="${esc(item.label)}：${hosDash(item.value)}"></i>`).join('')}</div>`;
}
function hosOpenSheet(title, sub, body) {
  if (!window.UISheet) { toast('弹层组件未加载', true); return; }
  window.UISheet.open({ title, sub, body });
}
function hosCloseSheet() {
  if (window.UISheet) window.UISheet.close();
}
function hosFormFoot(action, label, tone = 'btn-primary') {
  return `<div class="fit-form-foot"><button type="button" class="btn ${tone}" data-action="${action}">${esc(label)}</button></div>`;
}
function hosSelect(name, value, options, attrs = '') {
  return `<select name="${name}" ${attrs}>${options.map((o) => {
    const isObject = o && typeof o === 'object';
    const val = isObject ? o.value : o;
    const label = isObject ? o.label : o;
    return `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('')}</select>`;
}
function hosNumber(name, value, attrs = '') {
  return `<input name="${name}" type="number" value="${esc(value == null ? '' : value)}" ${attrs}>`;
}
function hosRange(name, value, min, max, step = 1, unit = '') {
  const v = hosClamp(value, min, max);
  return `<label class="hos-range"><span>${esc(name)}</span><input type="range" name="${name}" min="${min}" max="${max}" step="${step}" value="${v}" data-hos-range><output>${v}${unit}</output></label>`;
}

/* ---- 健康总览 --------------------------------------------------------- */
function renderHealthOSSummary() {
  const cards = [];
  if (typeof hosDietSummaryCard === 'function') cards.push(hosDietSummaryCard());
  if (typeof hosSleepSummaryCard === 'function') cards.push(hosSleepSummaryCard());
  if (typeof hosSkinSummaryCard === 'function') cards.push(hosSkinSummaryCard());
  if (!cards.length) return '';
  return `<section class="card hos-overview-card"><div class="card-head"><div><span class="eyebrow">HEALTH OS · TODAY</span><h3>今日三个底盘</h3><p>饮食、睡眠、护肤各自有独立工作台；这里只看今天最需要处理的一件事。</p></div><button class="btn btn-small btn-outline" data-action="capability-page" data-page="checkin">查看打卡统计 →</button></div><div class="hos-overview-grid">${cards.join('')}</div></section>`;
}

function ensureHealthOSState() {
  if (typeof state === 'undefined' || !state) return;
  if (typeof hosEnsureSkinState === 'function') hosEnsureSkinState();
  if (typeof hosEnsureDietState === 'function') hosEnsureDietState();
  if (typeof hosEnsureSleepState === 'function') hosEnsureSleepState();
}

/* UI 事件：范围滑块实时显示 */
document.addEventListener('input', (e) => {
  const input = e.target.closest?.('[data-hos-range]');
  if (!input) return;
  const out = input.closest('.hos-range')?.querySelector('output');
  if (out) out.textContent = input.value;
});

/* 通用动作：切换模块内页签的滚动位置（真实页签切换由 ui.js 处理） */
document.addEventListener('click', (e) => {
  const tab = e.target.closest?.('[data-tab]');
  if (!tab) return;
  const panel = tab.closest('[data-tab-shell]');
  if (!panel) return;
  const key = panel.dataset.tabKey || '';
  if (key) panel.dataset.lastTab = tab.dataset.tab;
});
