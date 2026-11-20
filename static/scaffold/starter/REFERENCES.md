# 官方技术参考与适用边界（查询于 2026-11-20）

以下仅是便于 Codex 学习技术约束的官方文档入口。项目依赖版本/目标浏览器能力应当在实际实施时重新确认。

- MDN — [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using)：`document.startViewTransition()` 处理同文档 DOM 更新；跨文档导航机制和可用性另行确认；若不可用需正确功能降级。
- Motion — [React Layout Animations](https://motion.dev/docs/react-layout-animations)：`layout`, `layoutId`, `LayoutGroup` 可用于共享布局动画；不能和 View Transitions 同时控制相同图形。
- Motion — [Reorder for React](https://motion.dev/docs/react-reorder)：适合简单拖拽排序，复杂跨列/网格需要考虑其他专用工具。
- GSAP — [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)：`scrub` 可以绑定真实滚动位置；避免给直接操作叠加人为惯性。
- W3C WAI-ARIA APG — [Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：弹窗焦点陷阱、Escape、聚焦恢复应符合组件语义。
- W3C WAI-ARIA APG — [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)：命令面板/搜索框不能仅以视觉层面处理键盘导航。
- W3C WAI-ARIA APG — [Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)：按钮、标签页、树、菜单、拖拽键盘替代等应遵循对应模式。

**注意：** 参考文件不是依赖声明；安装器不会自动安装、升级或联网调用以上技术栈。
