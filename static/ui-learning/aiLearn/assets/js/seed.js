/* ============================================================
 * seed.js — 内联种子数据（file:// 下 fetch 本地 JSON 会被浏览器拦截，
 * 因此首次打开时由本文件提供初始案例与模板；结构与 data/*.json 完全一致）
 * ============================================================ */
(function () {
  'use strict';
  var T0 = '2026-11-01T09:00:00.000Z';

  function ab(content) { return { content: content, source: 'ai_generated', updated_at: T0 }; }
  function hb(content) { return { content: content, source: 'human', updated_at: T0 }; }

  window.SEED_DATA = {
    cases: [
      {
        id: 'case_demo_b_001',
        title: 'B端数据监控仪表盘',
        cover_image_id: 'img_demo_b_1',
        images: [
          {
            id: 'img_demo_b_1',
            name: 'sample-b-dashboard.svg',
            src: 'assets/images/sample-b-dashboard.svg',
            is_seed: true,
            annotations: [
              { id: 'ann_b_1', x: 8, y: 14, text: '左侧固定导航', color: '#3b6ea5' },
              { id: 'ann_b_2', x: 60, y: 12, text: '顶部KPI卡片行', color: '#c08a3e' }
            ]
          }
        ],
        style_tags: ['深色', '仪表盘', '卡片化'],
        business_tags: ['B端', '数据监控', '后台系统'],
        favorite: true,
        analysis: {
          layout_structure: ab('采用左侧固定导航 + 右侧主内容的经典后台结构；主内容自上而下为页面标题、KPI 指标卡片行、图表区与明细表格，信息层级清晰，符合监控类任务的浏览习惯。'),
          visual_style: ab('深色主题，面板以卡片形式分块，圆角中等、描边克制、低阴影；数据与标签使用等宽字体，整体偏专业工具质感，不做多余装饰。'),
          interaction: ab('静态截图，动态交互需手动补充；可从控件形态推断：侧栏支持菜单展开与选中高亮，图表可能支持悬停查看数值与时间范围切换，表格支持分页与筛选。'),
          color_mood: ab('以深灰蓝为底，主色为低饱和蓝，辅以少量语义色（成功/告警/危险）区分状态；整体冷静、克制，利于长时间盯屏而不疲劳。'),
          layout_strengths: ab('固定导航保证模块间快速切换；KPI 卡片行让关键指标一眼可见；图表与表格分区兼顾趋势判断与明细核对，扩展性与信息承载能力强。')
        },
        use_cases: hb('适用于需要持续监控核心指标、做多维度数据分析并下钻明细的后台系统，如运维监控、经营分析、风控与资产管理看板。'),
        pitfalls: {
          avoid_pitfalls: hb('避免指标卡片堆叠过多导致重点丢失；避免深色下次级文字对比度过低；图表口径与刷新时间需明确标注，防止误读。'),
          forbidden_scenarios: hb('不适合面向大众的轻量营销页或强情感化品牌场景；也不适合信息极少、追求大图视觉冲击的展示型页面。')
        },
        ai_raw_result: '{"layout_structure":"采用左侧固定导航 + 右侧主内容的经典后台结构……","visual_style":"深色主题，面板以卡片形式分块……","interaction":"静态截图，动态交互需手动补充……","color_mood":"以深灰蓝为底，主色为低饱和蓝……","layout_strengths":"固定导航保证模块间快速切换……"}',
        ai_meta: { model: 'mock-demo', template_id: 'b_dashboard', parsed_at: T0, static_screenshot_note: true },
        versions: [{ version: 1, saved_at: T0, note: '初始归档' }],
        created_at: T0,
        updated_at: T0
      },
      {
        id: 'case_demo_c_002',
        title: 'C端电商商品详情页',
        cover_image_id: 'img_demo_c_1',
        images: [
          {
            id: 'img_demo_c_1',
            name: 'sample-c-page.svg',
            src: 'assets/images/sample-c-page.svg',
            is_seed: true,
            annotations: [{ id: 'ann_c_1', x: 50, y: 8, text: '商品主图', color: '#3b6ea5' }]
          }
        ],
        style_tags: ['亮色', '移动端', '简约'],
        business_tags: ['C端', '电商', '商品详情'],
        favorite: false,
        analysis: {
          layout_structure: ab('移动端纵向单列信息流，从上到下为商品主图、价格与标题、规格选择、图文详情与评价，底部固定购买操作条，形成清晰的浏览到转化路径。'),
          visual_style: ab('亮色简约风格，留白充足，圆角卡片承载信息，主按钮使用高强调品牌色；字体层级对比明显，整体轻松、亲和。'),
          interaction: ab('静态截图，动态交互需手动补充；可推断：主图支持左右滑动与放大，规格区点击选择，底部按钮触发加购或下单，评价区可展开查看。'),
          color_mood: ab('以白色/浅灰中性色为底，品牌色集中在价格与行动按钮，点缀少量暖色营造促销氛围；整体明亮、干净、有购买引导性。'),
          layout_strengths: ab('单列信息流符合拇指操作与阅读习惯；固定底部操作条让转化入口随时可达；信息按决策顺序排布，降低下单前的认知成本。')
        },
        use_cases: hb('适用于电商、零售、本地生活等需要在移动端完成商品了解与下单转化的消费级页面。'),
        pitfalls: {
          avoid_pitfalls: hb('避免首屏信息过载挤掉主图与价格；避免底部操作条遮挡内容；规格与库存状态需即时反馈，减少下单挫败。'),
          forbidden_scenarios: hb('不适合高密度、多控件并列的专业后台场景；也不适合需要长时间多任务并行处理的工作台。')
        },
        ai_raw_result: '{"layout_structure":"移动端纵向单列信息流……","visual_style":"亮色简约风格，留白充足……","interaction":"静态截图，动态交互需手动补充……","color_mood":"以白色/浅灰中性色为底……","layout_strengths":"单列信息流符合拇指操作与阅读习惯……"}',
        ai_meta: { model: 'mock-demo', template_id: 'c_page', parsed_at: T0, static_screenshot_note: true },
        versions: [{ version: 1, saved_at: T0, note: '初始归档' }],
        created_at: T0,
        updated_at: T0
      }
    ]
  };

  window.SEED_TEMPLATES = {
    active_template_id: 'b_dashboard',
    ai_config: {
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model: 'doubao-vision-pro',
      api_key: '',
      mock_mode: true
    },
    templates: [
      {
        id: 'b_dashboard',
        name: 'B端仪表盘解析模板',
        type: 'B',
        is_default: true,
        description: '适用于后台、数据看板、工作台、管理系统等 B 端界面的截图拆解。',
        system_prompt: '你是一名资深 B 端产品设计与数据可视化专家，擅长从界面截图中拆解仪表盘、后台与工作台的设计逻辑。请基于用户提供的【静态截图】完成 UI 拆解分析。\n\n【硬性输出规则】\n1. 你只能分析并输出以下 5 个字段，禁止输出任何其他字段，尤其禁止输出“适用场景”“避坑清单”“禁用场景”（这些由人工填写）。\n2. 必须严格输出 JSON 对象，不要输出 Markdown 代码块、解释语或前后缀文字。\n3. 每个字段的值为字符串，使用中文，条理清晰，可使用分号或序号分点，不要留空；信息不足时基于可见元素做合理推断并标注“（推断）”。\n4. 由于输入是静态截图，无法观察真实的动态交互。若无法从界面确证交互行为，interaction 字段必须以“静态截图，动态交互需手动补充；”开头，再描述可从控件形态推断的交互。\n5. 仅基于截图可见内容，不要编造具体数据、品牌或不存在的功能。\n\n【输出字段定义】\n- layout_structure：布局结构。描述页面分栏/栅格、导航与内容区关系、信息层级、卡片与表格的组织方式。\n- visual_style：UI 视觉风格。描述整体风格定位、组件质感（描边/阴影/圆角/填充）、设计语言、字体与图标特征。\n- interaction：交互特征。描述可推断的操作方式、控件状态、反馈与流转；静态截图规则见上。\n- color_mood：色调与氛围。描述主色/辅助色/中性色、明暗关系、饱和度、整体氛围与情绪感受。\n- layout_strengths：布局优点。描述该布局在信息传达、效率、可读性、扩展性等方面的具体优势。\n\n【输出 JSON 示例】\n{"layout_structure":"...","visual_style":"...","interaction":"...","color_mood":"...","layout_strengths":"..."}',
        user_prompt: '请拆解这张 B 端界面截图，严格按系统约定的 5 字段 JSON 输出。',
        created_at: T0,
        updated_at: T0
      },
      {
        id: 'c_page',
        name: 'C端页面解析模板',
        type: 'C',
        is_default: true,
        description: '适用于移动端、营销页、电商、App 页面等消费级 C 端界面的截图拆解。',
        system_prompt: '你是一名资深 C 端产品与体验设计专家，擅长从截图中拆解移动端、消费级页面与营销界面的设计逻辑。请基于用户提供的【静态截图】完成 UI 拆解分析。\n\n【硬性输出规则】\n1. 你只能分析并输出以下 5 个字段，禁止输出任何其他字段，尤其禁止输出“适用场景”“避坑清单”“禁用场景”（这些由人工填写）。\n2. 必须严格输出 JSON 对象，不要输出 Markdown 代码块、解释语或前后缀文字。\n3. 每个字段的值为字符串，使用中文，条理清晰，可使用分号或序号分点，不要留空；信息不足时基于可见元素做合理推断并标注“（推断）”。\n4. 由于输入是静态截图，无法观察真实的动态交互（如点击跳转、弹层、手势、动效）。若无法确证，interaction 字段必须以“静态截图，动态交互需手动补充；”开头，再描述可从控件与布局形态推断的交互。\n5. 仅基于截图可见内容，不要编造具体数据、品牌或不存在的功能。\n\n【输出字段定义】\n- layout_structure：布局结构。描述页面分区、内容流与转化路径、信息层级、图文与按钮的排布方式。\n- visual_style：UI 视觉风格。描述风格定位、品牌感、组件质感（圆角/描边/阴影/质感）、字体与图标、情感化设计元素。\n- interaction：交互特征。描述可推断的操作路径、点击/滑动/手势、状态反馈与转化引导；静态截图规则见上。\n- color_mood：色调与氛围。描述主色/点缀色/中性色、明暗与饱和度、色彩情绪、对用户感受的引导。\n- layout_strengths：布局优点。描述该布局在聚焦注意力、引导转化、可读性、情感共鸣等方面的具体优势。\n\n【输出 JSON 示例】\n{"layout_structure":"...","visual_style":"...","interaction":"...","color_mood":"...","layout_strengths":"..."}',
        user_prompt: '请拆解这张 C 端界面截图，严格按系统约定的 5 字段 JSON 输出。',
        created_at: T0,
        updated_at: T0
      }
    ]
  };
})();
