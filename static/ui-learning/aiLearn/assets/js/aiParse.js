/* ============================================================
 * aiParse.js — AI 视觉解析适配层
 *  - 真实模式：调用 OpenAI 兼容的多模态 chat/completions（豆包/火山视觉等）
 *  - 演示模式：mock_mode=true 或未配置 api_key 时返回演示解析，保证流程可走通
 *  - 严格只产出 5 个字段；自动补“静态截图”备注；保留原始返回
 * 暴露 window.AIParser
 * ============================================================ */
(function () {
  'use strict';

  var FIELD_KEYS = ['layout_structure', 'visual_style', 'interaction', 'color_mood', 'layout_strengths'];
  var FIELD_LABELS = {
    layout_structure: '布局结构',
    visual_style: 'UI视觉风格',
    interaction: '交互特征',
    color_mood: '色调与氛围',
    layout_strengths: '布局优点'
  };
  var STATIC_NOTE = '静态截图，动态交互需手动补充；';

  var tplCache = null;

  async function getTemplates() {
    if (!tplCache) tplCache = await Store.loadTemplates();
    return tplCache;
  }

  function getTemplate(bundle, id) {
    var list = bundle.templates || [];
    return list.find(function (t) { return t.id === id; }) || list[0] || null;
  }
  function getConfig(bundle) {
    // 页面配置（localStorage）优先，其次模板文件内的默认配置
    var local = Store.getAIConfig();
    var base = bundle.ai_config || {};
    var cfg = local ? Object.assign({}, base, local) : base;
    if (typeof cfg.mock_mode === 'undefined') cfg.mock_mode = true;
    return cfg;
  }

  /* ---------- JSON 容错提取 ---------- */
  function extractJSON(text) {
    var s = String(text || '').trim();
    var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    var start = s.indexOf('{');
    var end = s.lastIndexOf('}');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
    return JSON.parse(s);
  }

  /* ---------- 真实请求 ---------- */
  function callVision(cfg, systemPrompt, userText, dataURL) {
    var body = {
      model: cfg.model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: dataURL } }
          ]
        }
      ]
    };
    return fetch(cfg.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.api_key
      },
      body: JSON.stringify(body)
    }).then(function (resp) {
      return resp.json().catch(function () { return {}; }).then(function (data) {
        if (!resp.ok) throw new Error((data.error && data.error.message) || ('请求失败 HTTP ' + resp.status));
        var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!content) throw new Error('模型返回为空');
        return content;
      });
    });
  }

  /* ---------- 静态截图规则兜底 ---------- */
  function enforceStaticNote(parsed) {
    var noteAdded = false;
    if (parsed.interaction && String(parsed.interaction).indexOf('静态截图') < 0) {
      parsed.interaction = STATIC_NOTE + parsed.interaction;
      noteAdded = true;
    }
    return noteAdded;
  }

  function normalize(parsed) {
    var out = {};
    FIELD_KEYS.forEach(function (k) {
      out[k] = parsed && parsed[k] ? String(parsed[k]).trim() : '';
    });
    enforceStaticNote(out);
    return out;
  }

  /* ---------- Mock 演示数据 ---------- */
  function mockParse(template) {
    var isC = template.type === 'C';
    if (isC) {
      return {
        layout_structure: '【演示】纵向单列信息流，按主图、标题价格、规格、图文详情与操作按钮的顺序排布，底部为固定转化区，符合移动端浏览与决策路径。',
        visual_style: '【演示】亮色简约风格，留白充足，圆角卡片承载信息，强调按钮使用品牌主色，字体层级清晰，整体亲和、轻松。',
        interaction: STATIC_NOTE + '【演示】可推断主图支持滑动/放大，规格点击选择，按钮触发加购或下单，页面可能含下拉刷新与弹层反馈。',
        color_mood: '【演示】以中性浅色为底，品牌色集中在价格与行动点，点缀少量暖色营造氛围，整体明亮干净、有引导性。',
        layout_strengths: '【演示】单列流贴合拇指操作，固定操作区让转化入口随时可达，信息按决策顺序组织，降低认知成本。'
      };
    }
    return {
      layout_structure: '【演示】左侧固定导航 + 右侧主内容的后台结构，主内容由标题、指标卡片行、图表区与明细表格组成，信息层级清晰。',
      visual_style: '【演示】深色/中性面板以卡片分块，圆角中等、描边克制、低阴影，数据使用等宽字体，整体是专业工具质感。',
      interaction: STATIC_NOTE + '【演示】可推断侧栏菜单展开与高亮，图表悬停查看数值、时间范围切换，表格支持筛选、排序与分页。',
      color_mood: '【演示】低饱和主色搭配中性深底色，辅以语义色区分状态，整体冷静克制，适合长时间使用。',
      layout_strengths: '【演示】固定导航便于快速切换，指标卡片让关键数据一眼可见，图表与表格分区兼顾趋势与明细，扩展性强。'
    };
  }

  /* ---------- 主入口：全量解析 ---------- */
  async function parse(dataURL, templateId) {
    var bundle = await getTemplates();
    var template = getTemplate(bundle, templateId || bundle.active_template_id);
    if (!template) throw new Error('未找到可用的提示词模板');
    var cfg = getConfig(bundle);

    var useMock = cfg.mock_mode || !cfg.api_key;
    var raw, parsed, model;

    if (useMock) {
      // 模拟网络延迟
      await new Promise(function (r) { setTimeout(r, 700); });
      parsed = mockParse(template);
      raw = JSON.stringify(parsed);
      model = 'mock-demo';
    } else {
      raw = await callVision(cfg, template.system_prompt, template.user_prompt, dataURL);
      parsed = normalize(extractJSON(raw));
      model = cfg.model;
    }
    return {
      parsed: parsed,
      raw: raw,
      model: model,
      is_mock: useMock,
      template_id: template.id,
      static_note: String(parsed.interaction || '').indexOf('静态截图') >= 0,
      parsed_at: Store.nowISO()
    };
  }

  /* ---------- 局部重生成 ---------- */
  async function regenerate(dataURL, fieldKey, templateId, currentText) {
    if (FIELD_KEYS.indexOf(fieldKey) < 0) throw new Error('非法的板块字段');
    var bundle = await getTemplates();
    var template = getTemplate(bundle, templateId || bundle.active_template_id);
    var cfg = getConfig(bundle);
    var useMock = cfg.mock_mode || !cfg.api_key;

    var label = FIELD_LABELS[fieldKey];
    var localSystem =
      '你是 UI 设计分析专家。用户对之前的分析结果不满意，需要你【只】重新分析并改写其中一个板块。\n' +
      '要求：仅输出 JSON 对象，且只包含一个字段 key="' + fieldKey + '"（含义：' + label + '），不要输出其他任何字段或解释，使用中文。\n' +
      '若字段为 interaction 且输入是静态截图，必须以“' + STATIC_NOTE + '”开头。\n' +
      '当前内容（仅供参考，可肯定或推翻）：' + String(currentText || '（空）');
    var localUser = '请基于截图重新分析“' + label + '”，输出 {"' + fieldKey + '": "..."}。';

    if (useMock) {
      await new Promise(function (r) { setTimeout(r, 500); });
      var full = mockParse(template);
      return { content: full[fieldKey], is_mock: true, model: 'mock-demo', parsed_at: Store.nowISO() };
    }
    var raw = await callVision(cfg, localSystem, localUser, dataURL);
    var obj = extractJSON(raw);
    var content = obj[fieldKey] || '';
    if (fieldKey === 'interaction' && content.indexOf('静态截图') < 0) content = STATIC_NOTE + content;
    return { content: content, is_mock: false, model: cfg.model, raw: raw, parsed_at: Store.nowISO() };
  }

  window.AIParser = {
    parse: parse,
    regenerate: regenerate,
    FIELD_KEYS: FIELD_KEYS,
    FIELD_LABELS: FIELD_LABELS,
    extractJSON: extractJSON
  };
})();
