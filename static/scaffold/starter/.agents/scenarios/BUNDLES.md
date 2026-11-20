# 业务场景组合推荐

> 每组是候选清单，不是一次性全装。优先 1 个主场景 + 最多 2 个辅助场景；同一动画属性由一个控制器管理。

## 金融行情终端

- [滚动收缩导航栏](02_SCROLL_LINKED_NAV.md) — 80到56px连续滚动映射
- [侧栏折叠后的宽度迁移](12_SIDEBAR_COLLAPSE.md) — 收起侧栏增加内容区域，同时保持导航锚点
- [折线图数据集形变](44_LINE_CHART_MORPH.md) — 从A数据集切到B时保持坐标与曲线关系
- [真实行情流式曲线](47_LIVE_STREAM_CHART.md) — 连续观察实时数据同时准确暴露陈旧程度
- [Dashboard 下钻图表联动](48_DASHBOARD_DRILLDOWN.md) — 从总览点到板块/标的明细保持数据语义
- [图表 Brush 缩放与平移](51_CHART_BRUSH_ZOOM.md) — 手势明确控制可见数据域
- [蜡烛图周期切换](52_CANDLE_INTERVAL_CHANGE.md) — 周期切换保留时间中心和选定标的上下文
- [图表历史回放播放器](62_HISTORICAL_REPLAY.md) — 以真实历史快照逐帧回放，不误认为实时
- [连接中断与重连](81_RECONNECT_STATUS.md) — 明确区分新鲜与陈旧数据

## AI Agent 工作台

- [按钮按压微反馈](03_PRESS_FEEDBACK.md) — 精确按压与恢复
- [侧栏折叠后的宽度迁移](12_SIDEBAR_COLLAPSE.md) — 收起侧栏增加内容区域，同时保持导航锚点
- [拖拽列表重新排序](33_DRAG_LIST_REORDER.md) — 拖动一个元素重排有稳定占位与明确提交
- [命令面板 Command Palette](86_COMMAND_PALETTE.md) — 一个快捷入口直达应用合法操作
- [树形导航逐级展开](88_TREE_DISCLOSURE.md) — 多级目录展开时保留当前节点位置
- [面板停靠与拖动](92_DOCKABLE_PANELS.md) — 工具面板自定义位置不破坏主要内容
- [AI Agent 流程节点执行态](96_AGENT_WORKFLOW_STATES.md) — 运行中可辨真实步骤与依赖，不被假动画误导
- [保存状态反馈](82_AUTOSAVE_STATUS.md) — 操作数据变更的保存结果可见

## 编辑式知识网站

- [列表到详情共享元素过渡](01_SHARED_ELEMENT_ROUTE.md) — 保持封面和标题从列表到详情的稳定身份
- [标签页滑动指示器](05_TABS_SLIDING_INDICATOR.md) — 保持选中标签的几何身份和内容语义
- [Morphing 弹窗由按钮生长](13_BUTTON_TO_DIALOG_MORPH.md) — 用户理解触发源与详情弹窗的关系
- [图片 Lightbox 共享放大](17_GALLERY_LIGHTBOX.md) — 看大图不失去来源缩略图位置
- [媒体画廊相邻切换](58_MEDIA_GALLERY.md) — 连续浏览媒体不丢当前编号
- [滚动驱动章节图解](63_SCROLL_SCRUB_STORY.md) — 用户滚动主动推动图解状态，不是自动入场
- [编辑器聚焦模式](93_FOCUS_MODE.md) — 需要时减少噪音并可原位恢复

## 电商商品详情

- [列表到详情共享元素过渡](01_SHARED_ELEMENT_ROUTE.md) — 保持封面和标题从列表到详情的稳定身份
- [Morphing 弹窗由按钮生长](13_BUTTON_TO_DIALOG_MORPH.md) — 用户理解触发源与详情弹窗的关系
- [锚点 Popover 气泡定位](14_ANCHORED_POPOVER.md) — 小任务浮层仍明确来源位置
- [图片 Lightbox 共享放大](17_GALLERY_LIGHTBOX.md) — 看大图不失去来源缩略图位置
- [确认对话框危险操作](18_DANGEROUS_CONFIRM.md) — 危险动作前明确后果不误触
- [滑块区间选择](30_RANGE_SLIDER.md) — 精确调节区间不被装饰性延迟干扰
- [前后对比拖动分割](59_BEFORE_AFTER_COMPARE.md) — 同一坐标观看修改前后效果

## 3D 户型交互沙盘

- [可拖动时间轴 Scrubber](55_TIMELINE_SCRUBBER.md) — 从时间拖拽直接预览对应状态
- [3D 摄像机轨道观察](64_ORBIT_CAMERA.md) — 查看三维物体多个方向且空间稳定
- [电影式镜头推入](65_CINEMATIC_CAMERA_DOLLY.md) — 从总览精确引导到目标空间
- [2D 户型变成 3D 沙盘](66_FLOORPLAN_2D_TO_3D.md) — 准确展示二维墙线与三维房间的空间对应
- [3D 热点注释锚定](67_WORLD_HOTSPOT.md) — 标签永远对应真实模型表面位置
- [3D 日照时间模拟](69_SUNLIGHT_TIME.md) — 比较一天不同时刻真实光照方向
- [3D 物件拖动摆放](72_MODEL_PLACEMENT.md) — 按房间真实平面将物品拖放到合法位置

## 数据分析 Dashboard

- [侧栏折叠后的宽度迁移](12_SIDEBAR_COLLAPSE.md) — 收起侧栏增加内容区域，同时保持导航锚点
- [折线图数据集形变](44_LINE_CHART_MORPH.md) — 从A数据集切到B时保持坐标与曲线关系
- [柱状图排序重排](45_BAR_SORT_FLIP.md) — 值变化后的名次可追踪而不跳行
- [Dashboard 下钻图表联动](48_DASHBOARD_DRILLDOWN.md) — 从总览点到板块/标的明细保持数据语义
- [KPI 数字过渡](49_KPI_COUNT_TRANSITION.md) — 指标数值变化可被辨认而不造成虚假的实时波动
- [热力图渐变与筛选](50_HEATMAP_FILTER.md) — 切换指标时格子保持业务身份
- [图表 Brush 缩放与平移](51_CHART_BRUSH_ZOOM.md) — 手势明确控制可见数据域
- [多选表格操作栏](91_MULTISELECT_TOOLBAR.md) — 选中数量与可操作批量动作明确

## 移动工具 App

- [Bottom Sheet 底部抽屉](15_MOBILE_BOTTOM_SHEET.md) — 移动端不跳转即可完成一组操作
- [滑动卡片露出操作](36_SWIPE_ACTIONS.md) — 移动端明确露出次要操作不误触
- [移动底部导航选中迁移](97_MOBILE_BOTTOM_NAV.md) — 移动端高频任务一步可达
- [下拉刷新真实数据](98_PULL_REFRESH.md) — 主动刷新而非自动频繁请求
- [移动端滑动返回](99_MOBILE_SWIPE_BACK.md) — 触摸手势返回不丢当前页面
- [长按出现操作菜单](100_LONG_PRESS_MENU.md) — 触摸屏显式获得对象上下文操作
- [触摸安全交互目标](104_TOUCH_TARGETS.md) — 减少误触并保留操作反馈

## 影音时间轴编辑器

- [双指捏合缩放](38_PINCH_ZOOM.md) — 手势以两指中心为锚点调整缩放
- [可拖动时间轴 Scrubber](55_TIMELINE_SCRUBBER.md) — 从时间拖拽直接预览对应状态
- [可逆多步骤故事时间线](56_STORY_TIMELINE.md) — 用户每次前进只推进一段叙事
- [带章节的视频进度条](57_VIDEO_CHAPTERS.md) — 准确跳转指定章节并知晓当前位置
- [媒体画廊相邻切换](58_MEDIA_GALLERY.md) — 连续浏览媒体不丢当前编号
- [音频波形裁剪区间](60_AUDIO_WAVEFORM_TRIM.md) — 选取真实音频时间段而非装饰波形
- [时间表事件拖动排期](61_SCHEDULE_DRAG.md) — 可视化调整事项起止时间
- [图表历史回放播放器](62_HISTORICAL_REPLAY.md) — 以真实历史快照逐帧回放，不误认为实时

## 大型专业编辑器

- [分栏拖拽调整尺寸](35_SPLIT_PANE_RESIZE.md) — 两个工作区实时响应用户拖动
- [图片画布拖拽与平移](37_CANVAS_PAN.md) — 可平移大画布但不失选中目标
- [双指捏合缩放](38_PINCH_ZOOM.md) — 手势以两指中心为锚点调整缩放
- [框选多对象](41_LASSO_SELECT.md) — 快速选中画布中的一组对象
- [可排序表格列宽](42_TABLE_COLUMN_RESIZE.md) — 用户调整列宽不破坏数据与排序
- [命令面板 Command Palette](86_COMMAND_PALETTE.md) — 一个快捷入口直达应用合法操作
- [工作台左右对比视图](89_SIDE_BY_SIDE_DIFF.md) — 用户可靠对比两个版本的数据
- [面板停靠与拖动](92_DOCKABLE_PANELS.md) — 工具面板自定义位置不破坏主要内容
- [编辑器聚焦模式](93_FOCUS_MODE.md) — 需要时减少噪音并可原位恢复
