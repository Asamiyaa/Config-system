# AI Learn Studio · 知识与设计体系架构

## 原始数据来源

用户上传 `aiLearn.rar`（RAR5）。源站 6 页：`index.html`（画廊）、`view.html`、`editor.html`、`compare.html`、`template.html`、`settings.html`。源包的数据文件中有 **2 个种子 UI 案例**和 **2 套 AI 视觉解析模板**。运行时以 localStorage、IndexedDB 和经明确授权的 File System Access 写入为主。原站还含 Impeccable 设计资料，作为独立参考，不把其外部可执行启动器视为本脚手架依赖。

## 与 Creative Frontend v1.2 / v2.0 的能力映射

| 归档知识 | 对应规范 | 在网站中操作 |
|---|---|---|
| 界面误区 / 功能堆砌 / 信息过载 | `UX_FOUNDATIONS.md` | 分类与信息优先级、模块目录 |
| UI/UX 共生，关键路径与反馈 | `UX_FOUNDATIONS.md`, `DESIGN_SYSTEM.md` | 项目目标、搜索/筛选、立即反馈 |
| 状态连续、缓动、先后时序、正反对称 | `MOTION_SPEC.md` | 交互体验与 Prompt 严格对应 |
| 精确场景指令 | `.agents/scenarios/*.md`（104 个） | 选择配方 → 左侧演示 → 右侧复制 Prompt |
| 截图五维拆解与手动避坑 | 原 `data/cases.json` / `UI_DESIGN_GUIDELINES.md` | 截图参考、描述、拆解备注 |
| AI 视觉解析模板 | 原 `data/promptTemplates.json` | 直接复制 B/C 模板文本；不虚称已调用 AI |
| 设计审查与工程验收 | `VISUAL_QA.md`, `RELEASE_CHECKLIST.md` | 学习进度、Codex Skill 规范 |

## 知识管理模型

- **module**：`id, title, parent`；支持顶级、子级，内容按父子目录筛选。
- **knowledge**：`id, title, module, moduleId, keywords, description, prompt, breakdown, demo, image, source, updated`；内置配方只读，自建可编辑/删除。
- **learning**：`favorites[]`, `progress{id: new|learning|practiced}`。
- **media**：新增图片存 IndexedDB，避免大图直接进入 localStorage。
- **portability**：备份导出 JSON（含上传图片 base64）、反向导入，或导出单项 `SKILL.md`；Python 同步工具批量转入目标项目。

## 质量约束

- 截图可证实结构/色彩，**不证实动态交互**；所有推断明确标识。
- 104 份配方是可执行 *规范*；不能将其宣称为 104 个已实现的 Web 组件。
- 可运行演示只用于学习，不代替真实项目完整集成、无障碍与性能验收。
- 以现有业务和数据真实性为先：禁止通过模拟行情、伪造进度等掩饰真实接口故障。
- 动画默认是为用户主动行为服务；不要把自动入场、无意义呼吸、轮播加入工具界面。
- 原静态站的真实 API 密钥如填写在浏览器本地，不意味着有后端保密；正式部署应由服务端管理密钥，不在公开前端保存。

## 演进建议

以 `learn-studio` 为新增知识和场景的交互入口；保留 `source-aiLearn` 作为可访问的原产品与案例录入参考。新增知识→备份→版本控制→Skill 生成→在项目实际落地→把 QA 证据补回知识记录。浏览器本地存储不是自动云同步。
