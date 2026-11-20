---
name: interaction-recipe-executor
description: "当用户指定 Morphing 弹窗、拖拽排序、图表形变、3D 镜头、共享元素、命令面板等交互效果时，自动检索并执行精确场景配方。"
---

# Interaction Recipe Executor

## 触发与检索
用户描述一个具体的交互行为时：

```bash
python tools/pick_scenario.py "点击卡片展开详情并可逆关闭"
python tools/pick_scenario.py "需求描述" --prompt --output CODEX_SCENE_TASK.md
```

阅读 `.agents/scenarios/INDEX.md` 与命中的配方全文，不要仅按关键词编程。

## 必须核对的执行合同
- 触发：click / pointer / keyboard / scroll / business state；触发源是否由用户决定。
- 状态：初始、进行中、完成、反向、中断、失败与降级。
- 身份：共享元素、对象 ID、几何锚点、状态唯一来源。
- 动效：时长、曲线、主辅时序和 `prefers-reduced-motion`。
- 双向：正反轨迹、总时长与缓动是否对称；中途反转是否可恢复。
- 约束：复用现有框架、无障碍、真实数据、性能和浏览器支持。
- 验收：前进/返回、快速连点、键盘/触摸、窄屏和错误处理截图或运行结果。

严格区分“规范文档已有”与“实际 Demo 已实现”。不要向用户承诺全部 104 场景已做成组件。

## 可用资产
- `.agents/scenarios/`：104 份场景规范。
- `learn-studio/index.html`：检索、演示和复制 Prompt。
- `demo/studio.html`：独立交互实验室。
