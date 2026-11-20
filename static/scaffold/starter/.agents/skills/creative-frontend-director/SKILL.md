---
name: creative-frontend-director
description: "在新旧 Web 项目中做高品质 UI/UX、动效编排、交互重构或视觉审查时使用；按 v1.2 设计体系和场景规范执行。"
---

# Creative Frontend Director

## 适用
用户要求网页审美升级、动态交互、去 AI 味、视觉设计、交互编排或 UI/UX 验收时，使用本 Skill。对纯后端任务不要调用。

## 执行步骤
1. 读取项目 `AGENTS.md`、`.agents/PROJECT_ADAPTATION.md`、`.agents/design/UX_FOUNDATIONS.md`、`DESIGN_SYSTEM.md`、`MOTION_SPEC.md`、`INTERACTION_BLUEPRINT.md`、`VISUAL_QA.md`。项目没有这些文件时明确说明，不盲目假设。
2. 明确用户任务、首要视觉焦点、业务限制以及旧项目不可改动项。区分 UI 外观与 UX 路径。
3. 根据需求检索 `.agents/scenarios/INDEX.md` 或运行 `python tools/pick_scenario.py "用户需求"`，选 1 个主场景和最多 2 个辅助配方并全文读取。
4. 完成设计 brief → 关键场景 → 组件/状态机 → 实现 → 浏览器验证 → 问题修复。
5. 用户主动触发的动画才运行；确保形变/迁移、非线性缓动、父子时序、可逆、可中断、精准微反馈、reduced-motion。允许基于真实数据的必要状态更新，禁止无意义装饰性循环。
6. 浏览器检查键盘、触摸、窄屏、空状态、异常和快速反向。不要把静态图、假数据或构建通过当成真实体验验收。

## 输出
交付实现代码、所选配方及理由、修改文件清单、真实验收证据、未测风险。

## 知识库
`learn-studio/index.html` 提供左效果右 Prompt 检索；需要自建知识时使用 `$ailearn-knowledge-curator`。
