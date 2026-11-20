/* ============================================================
 * markdown.js — 导出单案例 Markdown（固定 UI 拆解模板）
 * 暴露 window.Markdown
 * ============================================================ */
(function () {
  'use strict';

  var SOURCE_TEXT = {
    ai_generated: 'AI生成',
    human_modified: '人工修改',
    human: '人工'
  };
  function srcName(s) { return SOURCE_TEXT[s] || '人工'; }
  function line(v) { return (v && v.content) ? v.content : '—'; }
  function srcLine(v) { return v && v.source ? '（' + srcName(v.source) + '）' : ''; }

  function build(item) {
    var L = [];
    L.push('# ' + (item.title || '未命名案例'));
    L.push('');
    L.push('- 样式标签：' + ((item.style_tags || []).join('、') || '—'));
    L.push('- 业务标签：' + ((item.business_tags || []).join('、') || '—'));
    L.push('- 收藏：' + (item.favorite ? '是' : '否'));
    L.push('- 创建时间：' + UI.fmtDate(item.created_at));
    L.push('- 更新时间：' + UI.fmtDate(item.updated_at));
    L.push('');

    /* 截图 */
    L.push('## 截图');
    L.push('');
    if (item.images && item.images.length) {
      item.images.forEach(function (im, i) {
        if (im.is_seed || im.src) {
          L.push('![' + im.name + '](' + im.src + ')');
        } else {
          L.push('> 图片：' + im.name + '（站内上传图，详见网站原案例）');
        }
        if (im.annotations && im.annotations.length) {
          im.annotations.forEach(function (a) {
            L.push('  - 标注：' + a.text + '（位置 ' + Math.round(a.x) + '%, ' + Math.round(a.y) + '%）');
          });
        }
        L.push('');
      });
    } else {
      L.push('（暂无截图）');
      L.push('');
    }

    /* 五块解析 */
    var a = item.analysis || {};
    var sections = [
      ['一、布局结构', a.layout_structure],
      ['二、UI视觉风格', a.visual_style],
      ['三、交互特征', a.interaction],
      ['四、色调与氛围', a.color_mood],
      ['五、布局优点', a.layout_strengths]
    ];
    sections.forEach(function (sec) {
      L.push('## ' + sec[0] + ' ' + srcLine(sec[1]));
      L.push('');
      L.push(line(sec[1]));
      L.push('');
    });

    /* 适用场景 */
    L.push('## 适用场景 ' + srcLine(item.use_cases));
    L.push('');
    L.push(line(item.use_cases));
    L.push('');

    /* 避坑清单 */
    L.push('## 避坑清单');
    L.push('');
    var p = item.pitfalls || {};
    L.push('### 需要避开的坑 ' + srcLine(p.avoid_pitfalls));
    L.push('');
    L.push(line(p.avoid_pitfalls));
    L.push('');
    L.push('### 不适合使用的场景（禁用场景） ' + srcLine(p.forbidden_scenarios));
    L.push('');
    L.push(line(p.forbidden_scenarios));
    L.push('');

    /* 来源与版本 */
    L.push('## 来源与版本');
    L.push('');
    if (item.ai_meta) {
      L.push('- AI 模型：' + item.ai_meta.model + '｜模板：' + item.ai_meta.template_id + '｜解析时间：' + UI.fmtDate(item.ai_meta.parsed_at));
      L.push('- 静态截图备注：' + (item.ai_meta.static_screenshot_note ? '已标记' : '否'));
    }
    if (item.versions && item.versions.length) {
      L.push('- 版本记录：');
      item.versions.forEach(function (v) {
        L.push('  - v' + v.version + ' ' + UI.fmtDate(v.saved_at) + (v.note ? ' ' + v.note : ''));
      });
    }
    L.push('');
    L.push('<details>');
    L.push('<summary>AI 原始返回（ai_raw_result）</summary>');
    L.push('');
    L.push('```json');
    L.push(item.ai_raw_result || '（无）');
    L.push('```');
    L.push('');
    L.push('</details>');
    L.push('');

    return L.join('\n');
  }

  function exportCase(item) {
    if (!item) { UI.toast('请先保存案例后再导出', 'error'); return; }
    var safe = (item.title || 'case').replace(/[\\/:*?"<>|\s]+/g, '_');
    Store.downloadText(safe + '.md', build(item), 'text/markdown');
  }

  window.Markdown = { build: build, exportCase: exportCase };
})();
