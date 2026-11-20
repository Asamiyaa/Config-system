(() => {
  const list = document.querySelector('#scenarioList');
  const filters = document.querySelector('#categoryFilters');
  const search = document.querySelector('#scenarioSearch');
  const count = document.querySelector('#resultCount');
  let scenarios = [];
  let category = '全部';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function renderFilters(categories) {
    filters.innerHTML = ['全部', ...categories].map(name => `<button class="filter ${category === name ? 'active' : ''}" type="button" data-category="${esc(name)}">${esc(name)}</button>`).join('');
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const visible = scenarios.filter(item => {
      const matchesCategory = category === '全部' || item.category === category;
      const haystack = [item.title, item.category, item.goal, ...(item.keywords || [])].join(' ').toLocaleLowerCase();
      return matchesCategory && haystack.includes(query);
    });
    count.textContent = `${visible.length} 个场景`;
    list.innerHTML = visible.length ? visible.map(item => `<a class="scenario" href="./starter/.agents/scenarios/${encodeURIComponent(item.filename)}" target="_blank" rel="noopener"><span class="scenario-id">${esc(item.id)}</span><span><h3>${esc(item.title)}</h3><p>${esc(item.goal)}</p><span class="category">${esc(item.category)}</span></span><span class="scenario-arrow" aria-hidden="true">↗</span></a>`).join('') : '<div class="empty">没有找到匹配的交互场景，试试其他关键词。</div>';
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    filters.querySelectorAll('.filter').forEach(node => node.classList.toggle('active', node === button));
    render();
  });
  search.addEventListener('input', render);
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    event.preventDefault();
    search.focus();
  });

  fetch('./starter/.agents/scenarios/catalog.json')
    .then(response => { if (!response.ok) throw new Error('catalog'); return response.json(); })
    .then(data => {
      scenarios = data.scenarios || [];
      renderFilters(data.categories || []);
      render();
    })
    .catch(() => {
      list.innerHTML = '<div class="empty">交互目录暂时无法读取，请下载完整脚手架包查看本地目录。</div>';
      count.textContent = '目录加载失败';
    });
})();
