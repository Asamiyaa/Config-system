/* ============================================================================
   Reading OS · 阅读工作台
   结构：书架 / 打卡 / 笔记 / 复盘
   - 书籍计划、阅读进度、每日打卡、感想与 Notebook 分组管理
   - 新增/编辑/删除全部使用弹层；列表只保留可扫描信息
   - FlowOSS 仅作为外部阅读器，不读取其账号或进度
   ========================================================================== */

const READ_STATUSES = ['计划阅读', '阅读中', '已读完', '暂缓'];
const READ_NOTE_TYPES = ['感想', '核心观点', '反例/质疑', '行动项', '金句/引用'];

function readBooks() { return Array.isArray(state.readingBooks) ? state.readingBooks : (state.readingBooks = []); }
function readSessions() { return Array.isArray(state.readingSessions) ? state.readingSessions : (state.readingSessions = []); }
function readNotes() { return Array.isArray(state.readingNotes) ? state.readingNotes : (state.readingNotes = []); }
function readNotebook() { return Array.isArray(state.notebookEntries) ? state.notebookEntries : (state.notebookEntries = []); }
function readBookProgress(book) {
  const total = hosNum(book.totalPages);
  const current = hosNum(book.currentPage);
  return total > 0 ? hosClamp((current / total) * 100, 0, 100) : 0;
}
function readBookByName(name) {
  return readBooks().find((x) => String(x.title) === String(name));
}
function readLastSessionByBook() {
  const map = {};
  readSessions().forEach((s) => {
    if (!s.book) return;
    if (!map[s.book] || String(s.date) > String(map[s.book])) map[s.book] = s.date;
  });
  return map;
}
function readStats() {
  const books = readBooks();
  const sessions = readSessions();
  const notes = readNotes();
  const notebook = readNotebook();
  const finished = books.filter((x) => x.status === '已读完').length;
  const reading = books.filter((x) => x.status === '阅读中').length;
  const progress = books.length ? hosAvg(books, readBookProgress) : 0;
  const pagesRead = books.reduce((a, x) => a + hosNum(x.currentPage), 0);
  const pagesTotal = books.reduce((a, x) => a + hosNum(x.totalPages), 0);
  const minutes = hosSum(sessions, 'minutes');
  const pages = hosSum(sessions, 'pages');
  const weekStart = shiftDateKey(hosToday(), -6);
  const weekSessions = sessions.filter((x) => x.date >= weekStart && x.date <= hosToday());
  const activeDays = new Set(sessions.map((x) => x.date).filter(Boolean)).size;
  const dates = hosDates(14);
  const daily = dates.map((d) => hosSum(sessions.filter((x) => x.date === d), 'minutes'));
  const weeks = groupedWeekStarts(8);
  const weekly = weeks.map((w) => {
    const end = shiftDateKey(w, 6);
    return hosSum(sessions.filter((x) => x.date >= w && x.date <= end), 'minutes');
  });
  const lastByBook = readLastSessionByBook();
  const stagnant = books.filter((b) => b.status === '阅读中' && (!lastByBook[b.title] || dayDiff(lastByBook[b.title], hosToday()) > 14));
  return { books, sessions, notes, notebook, finished, reading, progress: Math.round(progress), pagesRead, pagesTotal, minutes, pages, weekSessions, activeDays, dates, daily, weeks, weekly, lastByBook, stagnant };
}
function readInsights(s) {
  const out = [];
  if (!s.books.length) out.push({ tone: 'neutral', title: '书架还是空的', text: '先添加一本正在读或准备读的书，设定总页数和阅读目的。' });
  if (s.books.length && !s.sessions.length) out.push({ tone: 'neutral', title: '有计划，还没有阅读打卡', text: '记录一次实际阅读分钟与页数，统计曲线才会基于真实行为。' });
  if (s.stagnant.length) out.push({ tone: 'warn', title: `${s.stagnant.length} 本「阅读中」超过 14 天没有打卡`, text: s.stagnant.map((x) => x.title).slice(0, 3).join('、') + '。可以安排一次 20 分钟短读，或把状态改为暂缓。' });
  if (s.sessions.length && s.notes.length + s.notebook.length < s.sessions.length * 0.3) out.push({ tone: 'neutral', title: '打卡多，沉淀少', text: '每 3–5 次阅读至少留一条自己的判断、反例或行动项，而不是只记摘抄。' });
  if (s.finished > 0) out.push({ tone: 'good', title: `已读完 ${s.finished} 本`, text: '完成不是终点；把最有用的观点转成一条 Notebook 或可执行动作。' });
  if (!out.length) out.push({ tone: 'good', title: '阅读节奏稳定', text: '继续保持固定阅读时段，并在读完后写一条自己的判断。' });
  return out.slice(0, 4);
}
function readStatusTone(status) {
  if (status === '已读完') return 'good';
  if (status === '阅读中') return 'warn';
  if (status === '暂缓') return 'bad';
  return 'neutral';
}

function renderReadingV2() {
  const s = readStats();
  return `${sectionHead('READING OS · LIBRARY & NOTES', '阅读', '用阅读计划形成持续输入，用打卡记录真实阅读，用感想与 Notebook 沉淀判断。书籍、打卡、笔记分别放在独立页签里，新增和编辑都使用弹层。', `<button class="btn btn-outline" data-action="capability-page" data-page="home">← 返回今日工作台</button><button class="btn btn-outline" data-action="read-add-book">＋ 添加书籍</button><button class="btn btn-primary" data-action="read-add-session">＋ 记录阅读</button>`)}
  <div class="hos-shell" data-tab-shell data-tab-key="reading" data-default-tab="books">
    <div class="hos-bar"><div class="fit-tabs" data-tabs role="tablist">
      <button class="fit-tab active" data-tab="books" role="tab">书架</button>
      <button class="fit-tab" data-tab="logs" role="tab">打卡</button>
      <button class="fit-tab" data-tab="notes" role="tab">笔记</button>
      <button class="fit-tab" data-tab="review" role="tab">复盘</button>
    </div><div class="hos-bar-actions"><span class="hos-badge">${s.books.length} 本 · ${s.finished} 本读完</span><a class="btn btn-small btn-outline" href="https://app.flowoss.com/zh-CN" target="_blank" rel="noopener noreferrer">FlowOSS ↗</a></div></div>
    <div class="fit-panel active" data-tab-panel="books">${readBooksPanel(s)}</div>
    <div class="fit-panel" data-tab-panel="logs">${readLogsPanel(s)}</div>
    <div class="fit-panel" data-tab-panel="notes">${readNotesPanel(s)}</div>
    <div class="fit-panel" data-tab-panel="review">${readReviewPanel(s)}</div>
  </div>`;
}
function readBooksPanel(s) {
  return `<div class="hos-lead"><span class="eyebrow">LIBRARY · PLAN & PROGRESS</span><h2>先有阅读计划，再有阅读记录</h2><p>每本书设置总页数、当前页、目标日期和阅读目的。进度按当前页/总页数计算，不根据打卡时长猜测。</p></div>
  <div class="reading-external-row"><a class="reading-external-card" href="https://app.flowoss.com/zh-CN" target="_blank" rel="noopener noreferrer"><span class="launch-icon">▣</span><strong>打开 FlowOSS 阅读器 ↗</strong><small>在独立页面阅读；当前工作台不读取 FlowOSS 账号或阅读进度。</small></a><div class="reading-external-card"><span class="launch-icon">▤</span><strong>Notebook · 个人知识库</strong><small>保存摘要、概念、引用、疑问与行动项，并支持导出完整工作区 JSON 备份。</small><button class="btn btn-outline" data-action="export-json">导出笔记与阅读数据 ↓</button></div></div>
  <div class="hos-kpis">${hosKpi('书架', s.books.length, '本', `${s.reading} 本阅读中`)}${hosKpi('已读完', s.finished, '本', '状态为已读完')}${hosKpi('平均进度', `${s.progress}%`, '', `${s.pagesRead}/${s.pagesTotal || 0} 页`)}${hosKpi('笔记', s.notes.length + s.notebook.length, '条', `${s.notes.length} 条感想 · ${s.notebook.length} 条 Notebook`)}</div>
  <div class="hos-toolbar"><span class="hos-count">${s.books.length} 本书</span><button class="btn btn-primary" data-action="read-add-book">＋ 添加书籍</button></div>
  <div class="read-book-grid">${s.books.map((b, i) => {
    const pct = readBookProgress(b);
    const last = s.lastByBook[b.title];
    return `<article class="read-book-card"><header><div><strong>${esc(b.title)}</strong><small>${esc(b.author || '作者未录入')}</small></div><span class="tag ${readStatusTone(b.status)}">${esc(b.status || '计划阅读')}</span></header><div class="read-book-progress"><i><b style="width:${pct}%"></b></i><span>${hosNum(b.currentPage)} / ${hosNum(b.totalPages) || '—'} 页 · ${Math.round(pct)}%</span></div><p>${esc(b.goal || '还没有填写阅读目的。')}</p><div class="read-book-meta"><span>目标 ${esc(b.targetDate || '未设置')}</span><span>${esc(b.priority || '普通')}优先级</span><span>${last ? `最近打卡 ${esc(last)}` : '尚未打卡'}</span></div><footer><button class="btn btn-small btn-outline" data-action="read-add-session" data-book="${esc(b.title)}">打卡</button><button class="btn btn-small btn-outline" data-action="read-edit-book" data-index="${i}">编辑</button><button class="btn btn-small btn-ghost" data-action="read-delete-book" data-index="${i}">删除</button></footer></article>`;
  }).join('') || hosEmpty('书架还是空的。先添加一本正在读的书。', '<button class="btn btn-primary" data-action="read-add-book">添加第一本书</button>')}</div>`;
}
function readLogsPanel(s) {
  const sessions = s.sessions.map((x, i) => ({ ...x, _i: i })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b._i - a._i);
  return `<div class="hos-lead"><span class="eyebrow">READING LOG</span><h2>记录真实阅读，而不是计划</h2><p>每次打卡记录日期、书籍、分钟、页数和本次理解。统计曲线以这些真实记录为准。</p></div>
  <div class="hos-kpis">${hosKpi('累计阅读', s.minutes, '分钟', `${s.sessions.length} 次打卡`)}${hosKpi('累计页数', s.pages, '页', '按打卡页数累计')}${hosKpi('近 7 天', hosSum(s.weekSessions, 'minutes'), '分钟', `${s.weekSessions.length} 次`)}${hosKpi('活跃天数', s.activeDays, '天', '至少一次阅读打卡')}</div>
  <div class="hos-toolbar"><span class="hos-count">${sessions.length} 次阅读</span><button class="btn btn-primary" data-action="read-add-session">＋ 记录阅读</button></div>
  <div class="read-session-list">${sessions.map((x) => `<article class="read-session-row"><div class="read-session-date"><b>${esc((x.date || '').slice(5) || '—')}</b><small>${esc(x.date || '')}</small></div><div class="read-session-main"><strong>${esc(x.book || '自由阅读')}</strong><small>${hosNum(x.minutes)} 分钟 · ${hosNum(x.pages)} 页</small>${x.note ? `<p>${esc(x.note)}</p>` : ''}</div><div class="read-session-actions"><button class="btn btn-small btn-outline" data-action="read-edit-session" data-index="${x._i}">编辑</button><button class="btn btn-small btn-ghost" data-action="read-delete-session" data-index="${x._i}">删除</button></div></article>`).join('') || hosEmpty('还没有阅读打卡。', '<button class="btn btn-primary" data-action="read-add-session">记录第一次阅读</button>')}</div>`;
}
function readNotesPanel(s) {
  const filter = ui.readNoteFilter || '全部';
  const combined = [
    ...s.notes.map((x, i) => ({ ...x, _kind: 'reading', _i: i, _type: x.type || '感想' })),
    ...s.notebook.map((x, i) => ({ ...x, _kind: 'notebook', _i: i, _type: 'Notebook' }))
  ].filter((x) => filter === '全部' || (filter === 'Notebook' ? x._kind === 'notebook' : x._kind === 'reading')).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return `<div class="hos-lead"><span class="eyebrow">NOTES · JUDGEMENT & REUSE</span><h2>把读过的东西变成自己的判断</h2><p>阅读感想记录作者观点、证据、反例和行动项；Notebook 收纳不属于某一本书的概念、术语和研究线索。</p></div>
  <div class="hos-toolbar"><div class="hos-chips">${['全部', '感想', 'Notebook'].map((x) => `<button class="hos-chip ${filter === x ? 'is-on' : ''}" data-action="read-note-filter" data-filter="${x}">${x}${x === '全部' ? `<small>${s.notes.length + s.notebook.length}</small>` : ''}</button>`).join('')}</div><div class="hos-bar-actions"><button class="btn btn-outline" data-action="read-add-note">＋ 写感想</button><button class="btn btn-primary" data-action="read-add-notebook">＋ Notebook</button></div></div>
  <div class="read-note-list">${combined.map((x) => `<article class="read-note-card"><header><div><span class="tag ${x._kind === 'notebook' ? 'good' : 'neutral'}">${esc(x._type)}</span><small>${esc(x.date || '')}</small></div><div class="read-note-actions"><button class="btn btn-small btn-outline" data-action="${x._kind === 'notebook' ? 'read-edit-notebook' : 'read-edit-note'}" data-index="${x._i}">编辑</button><button class="btn btn-small btn-ghost" data-action="${x._kind === 'notebook' ? 'read-delete-notebook' : 'read-delete-note'}" data-index="${x._i}">删除</button></div></header><h4>${esc(x.title)}</h4>${x.book ? `<p class="read-note-meta">关联书籍：${esc(x.book)}</p>` : ''}${x.tags ? `<p class="read-note-meta">标签：${esc(x.tags)}</p>` : ''}<p class="read-note-content">${esc(x.content || '')}</p></article>`).join('') || hosEmpty('当前筛选下没有笔记。', '<button class="btn btn-primary" data-action="read-add-note">写第一条感想</button>')}</div>`;
}
function readReviewPanel(s) {
  const labels = s.dates.map((d) => d.slice(5));
  return `<div class="hos-lead"><span class="eyebrow">REVIEW · 14 DAYS</span><h2>读得够不够，沉淀够不够</h2><p>阅读分钟看真实打卡，书籍进度看页数，笔记数量看是否把输入转成判断；不把收藏书单当作阅读完成。</p></div>
  <div class="hos-kpis">${hosKpi('近 14 天', hosSum(s.sessions.filter((x) => s.dates.includes(x.date)), 'minutes'), '分钟', '按打卡日期统计')}${hosKpi('阅读打卡', s.sessions.length, '次', `${s.activeDays} 个活跃天`)}${hosKpi('平均进度', `${s.progress}%`, '', '按书籍当前页/总页数')}${hosKpi('笔记/打卡比', s.sessions.length ? `${(s.notes.length + s.notebook.length)}:${s.sessions.length}` : '—', '', '沉淀是否跟上输入')}</div>
  ${renderCapabilityAnalytics({ title: '阅读与知识库', metric: '阅读分钟', dailyValues: s.daily, dailyLabels: labels, weeklyValues: s.weekly, weeklyLabels: s.weeks.map((d) => d.slice(5)), checkinsToday: s.sessions.filter((x) => x.date === hosToday()).length, checkinsWeek: s.weekSessions.length })}
  <div class="hos-two"><section class="card"><div class="card-head"><div><h3>每本书进度</h3><p>只按当前页/总页数计算；未设置总页数显示 0%。</p></div></div><div class="read-book-progress-list">${s.books.map((b) => { const pct = readBookProgress(b); return `<div><span>${esc(b.title)}</span><i><b style="width:${pct}%"></b></i><strong>${Math.round(pct)}%</strong><small>${hosNum(b.currentPage)}/${hosNum(b.totalPages) || '—'}</small></div>`; }).join('') || hosEmpty('还没有书籍。')}</div></section><section class="card"><div class="card-head"><div><h3>复盘提示</h3><p>按当前书籍、打卡和笔记生成。</p></div></div>${hosInsightCards(readInsights(s))}</section></div>`;
}

/* ---- 弹层 ------------------------------------------------------------- */
function readOpenBook(index = -1) {
  const b = index >= 0 ? (readBooks()[index] || {}) : { status: '计划阅读', priority: '普通', totalPages: 300, currentPage: 0 };
  hosOpenSheet(index >= 0 ? '编辑书籍' : '添加书籍', '先设定总页数、当前页和阅读目的；状态可手动改，已读完会自动保留。', `<form id="readBookForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>书名</span><input name="title" required value="${esc(b.title || '')}" placeholder="书名"></label><label class="fit-field"><span>作者</span><input name="author" value="${esc(b.author || '')}" placeholder="作者"></label><label class="fit-field"><span>状态</span>${hosSelect('status', b.status || '计划阅读', READ_STATUSES)}</label><label class="fit-field"><span>优先级</span>${hosSelect('priority', b.priority || '普通', ['高', '普通', '低'])}</label><label class="fit-field"><span>目标完成日</span><input type="date" name="targetDate" value="${esc(b.targetDate || '')}"></label><label class="fit-field"><span>总页数</span><input type="number" name="totalPages" min="0" value="${hosNum(b.totalPages)}"></label><label class="fit-field"><span>当前页数</span><input type="number" name="currentPage" min="0" value="${hosNum(b.currentPage)}"></label></div>
    <label class="fit-field fit-wide"><span>阅读目的</span><input name="goal" value="${esc(b.goal || '')}" placeholder="例如：建立投资框架、改善写作、学习某项技能"></label>
    ${hosFormFoot('read-save-book', index >= 0 ? '保存修改' : '添加书籍')}
  </form>`);
}
function readSaveBook() {
  const form = $('#readBookForm');
  if (!form) return;
  const fd = new FormData(form);
  const i = hosNum(fd.get('index'), -1);
  const title = String(fd.get('title') || '').trim();
  if (!title) { toast('请填写书名', true); return; }
  const total = hosNum(fd.get('totalPages'));
  let current = hosNum(fd.get('currentPage'));
  if (total > 0) current = Math.min(current, total);
  let status = String(fd.get('status') || '计划阅读');
  if (total > 0 && current >= total) status = '已读完';
  else if (current > 0 && status === '计划阅读') status = '阅读中';
  const item = { id: i >= 0 && readBooks()[i] ? readBooks()[i].id : Date.now(), title, author: String(fd.get('author') || ''), status, priority: String(fd.get('priority') || '普通'), targetDate: String(fd.get('targetDate') || ''), totalPages: total, currentPage: current, goal: String(fd.get('goal') || ''), createdAt: i >= 0 && readBooks()[i] ? readBooks()[i].createdAt : hosToday() };
  if (i >= 0 && readBooks()[i]) readBooks()[i] = item; else readBooks().unshift(item);
  hosCloseSheet();
  try { sessionStorage.setItem('wealthos-tab-reading', 'books'); } catch (_) {}
  saveAndRender(i >= 0 ? '书籍信息已更新' : '书籍已加入书架');
}
function readOpenSession(index = -1, bookTitle = '') {
  const x = index >= 0 ? (readSessions()[index] || {}) : { date: hosToday(), minutes: 20, pages: 0, book: bookTitle };
  const books = readBooks();
  hosOpenSheet(index >= 0 ? '编辑阅读打卡' : '记录阅读', '只记录真实发生的阅读；分钟和页数用于趋势，不用于证明“很努力”。', `<form id="readSessionForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(x.date || hosToday())}"></label><label class="fit-field"><span>书籍</span><input name="book" list="readBookNames" value="${esc(x.book || '')}" placeholder="书名或自由阅读"><datalist id="readBookNames">${books.map((b) => `<option value="${esc(b.title)}"></option>`).join('')}</datalist></label><label class="fit-field"><span>阅读分钟</span><input type="number" name="minutes" min="1" max="720" value="${hosNum(x.minutes, 20)}"></label><label class="fit-field"><span>阅读页数</span><input type="number" name="pages" min="0" max="5000" value="${hosNum(x.pages)}"></label></div>
    <label class="fit-field fit-wide"><span>本次摘要 / 心得</span><textarea name="note" rows="3" placeholder="读了什么、最重要的观点或下一步">${esc(x.note || '')}</textarea></label>
    ${hosFormFoot('read-save-session', index >= 0 ? '保存修改' : '保存阅读打卡')}
  </form>`);
}
function readSaveSession() {
  const form = $('#readSessionForm');
  if (!form) return;
  const fd = new FormData(form);
  const i = hosNum(fd.get('index'), -1);
  const item = { id: i >= 0 && readSessions()[i] ? readSessions()[i].id : Date.now(), date: String(fd.get('date') || hosToday()), book: String(fd.get('book') || '').trim(), minutes: hosNum(fd.get('minutes')), pages: hosNum(fd.get('pages')), note: String(fd.get('note') || '') };
  if (i >= 0 && readSessions()[i]) readSessions()[i] = item; else readSessions().unshift(item);
  hosCloseSheet();
  try { sessionStorage.setItem('wealthos-tab-reading', 'logs'); } catch (_) {}
  saveAndRender(i >= 0 ? '阅读打卡已更新' : '阅读打卡已保存');
}
function readOpenNote(index = -1) {
  const x = index >= 0 ? (readNotes()[index] || {}) : { date: hosToday(), type: '感想' };
  const books = readBooks();
  hosOpenSheet(index >= 0 ? '编辑阅读感想' : '写阅读感想', '记录作者观点、证据、我的判断和可执行动作；不是摘抄。', `<form id="readNoteForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(x.date || hosToday())}"></label><label class="fit-field"><span>关联书籍</span><input name="book" list="readBookNames" value="${esc(x.book || '')}" placeholder="书名（可选）"><datalist id="readBookNames">${books.map((b) => `<option value="${esc(b.title)}"></option>`).join('')}</datalist></label><label class="fit-field"><span>类型</span>${hosSelect('type', x.type || '感想', READ_NOTE_TYPES)}</label><label class="fit-field"><span>标题</span><input name="title" required value="${esc(x.title || '')}" placeholder="这一章最重要的发现"></label></div>
    <label class="fit-field fit-wide"><span>内容</span><textarea name="content" rows="6" required placeholder="用自己的话写：作者观点、证据、我的判断、可执行动作">${esc(x.content || '')}</textarea></label>
    ${hosFormFoot('read-save-note', index >= 0 ? '保存修改' : '保存阅读感想')}
  </form>`);
}
function readSaveNote() {
  const form = $('#readNoteForm');
  if (!form) return;
  const fd = new FormData(form);
  const i = hosNum(fd.get('index'), -1);
  const title = String(fd.get('title') || '').trim();
  if (!title) { toast('请填写标题', true); return; }
  const item = { id: i >= 0 && readNotes()[i] ? readNotes()[i].id : Date.now(), date: String(fd.get('date') || hosToday()), book: String(fd.get('book') || ''), type: String(fd.get('type') || '感想'), title, content: String(fd.get('content') || '') };
  if (i >= 0 && readNotes()[i]) readNotes()[i] = item; else readNotes().unshift(item);
  hosCloseSheet();
  try { sessionStorage.setItem('wealthos-tab-reading', 'notes'); } catch (_) {}
  saveAndRender(i >= 0 ? '阅读感想已更新' : '阅读感想已保存');
}
function readOpenNotebook(index = -1) {
  const x = index >= 0 ? (readNotebook()[index] || {}) : { date: hosToday() };
  hosOpenSheet(index >= 0 ? '编辑 Notebook 条目' : '新增 Notebook 条目', '保存不属于某一本书的概念、术语、研究线索与行动清单。', `<form id="readNotebookForm" class="fit-form" autocomplete="off"><input type="hidden" name="index" value="${index}">
    <div class="fit-grid-2"><label class="fit-field"><span>日期</span><input type="date" name="date" value="${esc(x.date || hosToday())}"></label><label class="fit-field"><span>标题</span><input name="title" required value="${esc(x.title || '')}" placeholder="笔记标题"></label><label class="fit-field"><span>标签</span><input name="tags" value="${esc(x.tags || '')}" placeholder="例如：投资、英语、AI、健康"></label></div>
    <label class="fit-field fit-wide"><span>正文</span><textarea name="content" rows="7" required placeholder="摘要、问题、证据、行动项……">${esc(x.content || '')}</textarea></label>
    ${hosFormFoot('read-save-notebook', index >= 0 ? '保存修改' : '保存到 Notebook')}
  </form>`);
}
function readSaveNotebook() {
  const form = $('#readNotebookForm');
  if (!form) return;
  const fd = new FormData(form);
  const i = hosNum(fd.get('index'), -1);
  const title = String(fd.get('title') || '').trim();
  if (!title) { toast('请填写标题', true); return; }
  const item = { id: i >= 0 && readNotebook()[i] ? readNotebook()[i].id : Date.now(), date: String(fd.get('date') || hosToday()), title, tags: String(fd.get('tags') || ''), content: String(fd.get('content') || '') };
  if (i >= 0 && readNotebook()[i]) readNotebook()[i] = item; else readNotebook().unshift(item);
  hosCloseSheet();
  try { sessionStorage.setItem('wealthos-tab-reading', 'notes'); } catch (_) {}
  saveAndRender(i >= 0 ? 'Notebook 条目已更新' : 'Notebook 条目已保存');
}
function readDelete(kind, index) {
  const map = { book: ['readingBooks', '书籍'], session: ['readingSessions', '阅读打卡'], note: ['readingNotes', '阅读感想'], notebook: ['notebookEntries', 'Notebook 条目'] };
  const entry = map[kind];
  if (!entry) return;
  const [key, label] = entry;
  const arr = state[key] || [];
  const i = hosNum(index, -1);
  if (i < 0 || !arr[i]) return;
  deleteWithUndo(arr, i, label);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest?.('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action;
  if (!a || !a.startsWith('read-')) return;
  if (a === 'read-add-book') { readOpenBook(); return; }
  if (a === 'read-edit-book') { readOpenBook(hosNum(btn.dataset.index, -1)); return; }
  if (a === 'read-save-book') { readSaveBook(); return; }
  if (a === 'read-delete-book') { readDelete('book', btn.dataset.index); return; }
  if (a === 'read-add-session') { readOpenSession(-1, btn.dataset.book || ''); return; }
  if (a === 'read-edit-session') { readOpenSession(hosNum(btn.dataset.index, -1)); return; }
  if (a === 'read-save-session') { readSaveSession(); return; }
  if (a === 'read-delete-session') { readDelete('session', btn.dataset.index); return; }
  if (a === 'read-add-note') { readOpenNote(); return; }
  if (a === 'read-edit-note') { readOpenNote(hosNum(btn.dataset.index, -1)); return; }
  if (a === 'read-save-note') { readSaveNote(); return; }
  if (a === 'read-delete-note') { readDelete('note', btn.dataset.index); return; }
  if (a === 'read-add-notebook') { readOpenNotebook(); return; }
  if (a === 'read-edit-notebook') { readOpenNotebook(hosNum(btn.dataset.index, -1)); return; }
  if (a === 'read-save-notebook') { readSaveNotebook(); return; }
  if (a === 'read-delete-notebook') { readDelete('notebook', btn.dataset.index); return; }
  if (a === 'read-note-filter') { ui.readNoteFilter = btn.dataset.filter || '全部'; renderPage('reading'); return; }
});
