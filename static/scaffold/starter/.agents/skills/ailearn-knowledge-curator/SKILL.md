---
name: ailearn-knowledge-curator
description: "收集、拆解、编辑 UI 截图、Prompt、交互演示并将持续积累的知识导出为可复用 Codex Skill 时使用。"
---

# AI Learn Knowledge Curator

## 目标
把截图、交互观察、设计原则或实践案例转换成可检索、可验证、可复制 Prompt、可转成 Skill 的知识对象。

## 知识对象字段
- 标题、知识模块与子模块、关键词
- 设计/业务目标、适用场景与禁用场景
- 视觉拆解（布局、视觉、交互、色彩、优点）
- 动效合同（触发、状态、时间、反向、降级、验收）
- 可交付给 Codex 的 Prompt
- 参考图、演示类型、来源及人工/AI 标记
- 个人状态：收藏、未学习、学习中、已实践

## 工作流
1. 将原始信息按可信程度标为截图事实、文字说明、交互实测或设计推测；从静态截图不能判断真实动态。
2. 抽取可复用设计原子，不应复制原作品原样。
3. 执行 `.agents/design/UX_FOUNDATIONS.md` 和 `MOTION_SPEC.md` 的约束，生成精确可执行 Prompt。
4. 进入 `learn-studio/index.html` 新增知识，必要时上传参考图、标注学习进度。
5. 从网站导出 JSON 备份，用 `python tools/sync_knowledge.py --input <备份文件> --output <目标项目>` 将自建知识写成 `.agents/skills/knowledge-*/SKILL.md`。不要覆盖已有同名文件。
6. 仅明确通过浏览器实测的效果标记为已验证。

## 安全与版本
默认浏览器本地存储，不是多端同步。不得把 API Key、用户隐私或未授权素材打包发布。原 `aiLearn` 里的 AI 模拟解析不等于真正调用了视觉模型。定期导出 JSON 备份。
