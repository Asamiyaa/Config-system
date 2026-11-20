# 高级动态交互配方总索引 — v2.0

> 共 **104 个**精确场景，每个一份详细 Codex 工程指令；原 v1.2 三个完整场景原样保留。

## 使用方式

1. 先读 `../design/SCENARIO_PROMPT_SCHEMA.md`，明确业务任务与触发源。
2. 使用 `python tools/pick_scenario.py "你的需求"` 找到最匹配场景，或直接从本索引查找。
3. Codex 阅读匹配场景完整 Markdown，再检查仓库状态、细化参数、实现和验收。
4. 同一个任务最多选 1 个主场景 + 2 个辅助场景，避免交互规则冲突与动画引擎重复。

## 全量场景索引

### 三维空间与镜头
- **64** [3D 摄像机轨道观察](64_ORBIT_CAMERA.md) · 查看三维物体多个方向且空间稳定
- **65** [电影式镜头推入](65_CINEMATIC_CAMERA_DOLLY.md) · 从总览精确引导到目标空间
- **66** [2D 户型变成 3D 沙盘](66_FLOORPLAN_2D_TO_3D.md) · 准确展示二维墙线与三维房间的空间对应
- **67** [3D 热点注释锚定](67_WORLD_HOTSPOT.md) · 标签永远对应真实模型表面位置
- **68** [3D 产品爆炸分解](68_EXPLODED_VIEW.md) · 按真实零件关系理解内部结构
- **69** [3D 日照时间模拟](69_SUNLIGHT_TIME.md) · 比较一天不同时刻真实光照方向
- **70** [3D 材质替换对比](70_MATERIAL_SWAP.md) · 更换真实材质但维持空间与光照不变
- **71** [3D 物体拾取与高亮](71_RAYCAST_PICK.md) · 正确指出模型实际被点击的面或对象
- **72** [3D 物件拖动摆放](72_MODEL_PLACEMENT.md) · 按房间真实平面将物品拖放到合法位置
- **73** [镜头路径关键帧编辑](73_CAMERA_PATH_EDITOR.md) · 用户编辑镜头运动而非接受随机轨迹
- **74** [3D 层级剖切展示](74_SECTION_PLANE_3D.md) · 揭示建筑内部而不打乱主体坐标
- **75** [空间视差层级交互](75_SPATIAL_PARALLAX.md) · 通过指针探索辅助感知深度，不持续自动运动

### 专业生产力工作台
- **86** [命令面板 Command Palette](86_COMMAND_PALETTE.md) · 一个快捷入口直达应用合法操作
- **87** [全局快捷键可视反馈](87_KEYBOARD_SHORTCUTS.md) · 热键有明确但不干扰输入框的反馈
- **88** [树形导航逐级展开](88_TREE_DISCLOSURE.md) · 多级目录展开时保留当前节点位置
- **89** [工作台左右对比视图](89_SIDE_BY_SIDE_DIFF.md) · 用户可靠对比两个版本的数据
- **90** [过滤器 Chips 增删重排](90_FILTER_CHIPS.md) · 用户能追踪哪些条件正在生效
- **91** [多选表格操作栏](91_MULTISELECT_TOOLBAR.md) · 选中数量与可操作批量动作明确
- **92** [面板停靠与拖动](92_DOCKABLE_PANELS.md) · 工具面板自定义位置不破坏主要内容
- **93** [编辑器聚焦模式](93_FOCUS_MODE.md) · 需要时减少噪音并可原位恢复
- **94** [无限列表虚拟滚动](94_VIRTUAL_INFINITE_LIST.md) · 快速移动海量条目并保持交互稳定
- **95** [全局搜索结果定位高亮](95_SEARCH_RESULT_JUMP.md) · 从结果到页面目标保留指向关系
- **96** [AI Agent 流程节点执行态](96_AGENT_WORKFLOW_STATES.md) · 运行中可辨真实步骤与依赖，不被假动画误导

### 反馈与异步状态
- **76** [真实请求加载进度](76_REAL_REQUEST_PROGRESS.md) · 用户知道请求正在做什么且可失败恢复
- **77** [乐观更新及撤销](77_OPTIMISTIC_UPDATE_UNDO.md) · 响应及时但失败可恢复数据一致性
- **78** [Toast 消息队列](78_TOAST_QUEUE.md) · 不打断主操作且重要结果可感知
- **79** [Inline Error 原位纠错](79_INLINE_ERROR.md) · 让用户知道错误所在与具体修复
- **80** [Skeleton 与内容稳定替换](80_SKELETON_STABLE.md) · 避免真实加载导致阅读位置跳跃
- **81** [连接中断与重连](81_RECONNECT_STATUS.md) · 明确区分新鲜与陈旧数据
- **82** [保存状态反馈](82_AUTOSAVE_STATUS.md) · 操作数据变更的保存结果可见
- **83** [删除与撤销缓冲](83_DELETE_UNDO.md) · 误删可恢复且操作反馈清晰
- **84** [空状态到首个内容](84_EMPTY_FIRST_ITEM.md) · 首次创建成功时让用户感知内容如何出现
- **85** [复制/下载完成反馈](85_CLIPBOARD_EXPORT_FEEDBACK.md) · 清楚表明真实系统操作完成

### 导航与页面连续性
- **01** [列表到详情共享元素过渡](01_SHARED_ELEMENT_ROUTE.md) · 保持封面和标题从列表到详情的稳定身份
- **02** [滚动收缩导航栏](02_SCROLL_LINKED_NAV.md) · 80到56px连续滚动映射
- **04** [跨路由页面容器变形](04_ROUTE_CONTAINER_MORPH.md) · 列表到另一业务页面仍保留视图空间锚点
- **05** [标签页滑动指示器](05_TABS_SLIDING_INDICATOR.md) · 保持选中标签的几何身份和内容语义
- **06** [面包屑层级迁移](06_BREADCRUMB_DEPTH.md) · 导航当前层级改变时用户不迷失上下文
- **07** [双栏主从详情联动](07_MASTER_DETAIL.md) · 桌面切换详情不丢列表位置，手机改为单页栈
- **08** [导航抽屉展开收起](08_NAV_DRAWER.md) · 隐藏次要导航但保留明确主入口
- **09** [路由前进后退堆栈](09_PAGE_STACK_HISTORY.md) · 页面层级与浏览器History一致
- **10** [菜单项展开到内容区](10_MENU_TO_CONTENT.md) · 从导航选择到内容区域保持视觉指向
- **11** [分页方向连续性](11_PAGINATION_DIRECTION.md) · 大量内容分页仍感知前后关系
- **12** [侧栏折叠后的宽度迁移](12_SIDEBAR_COLLAPSE.md) · 收起侧栏增加内容区域，同时保持导航锚点

### 拖拽与手势
- **33** [拖拽列表重新排序](33_DRAG_LIST_REORDER.md) · 拖动一个元素重排有稳定占位与明确提交
- **34** [看板跨列拖动](34_KANBAN_CROSS_COLUMN.md) · 任务在列之间移动且正确更新业务状态
- **35** [分栏拖拽调整尺寸](35_SPLIT_PANE_RESIZE.md) · 两个工作区实时响应用户拖动
- **36** [滑动卡片露出操作](36_SWIPE_ACTIONS.md) · 移动端明确露出次要操作不误触
- **37** [图片画布拖拽与平移](37_CANVAS_PAN.md) · 可平移大画布但不失选中目标
- **38** [双指捏合缩放](38_PINCH_ZOOM.md) · 手势以两指中心为锚点调整缩放
- **39** [拖拽文件导入区](39_FILE_DROP_ZONE.md) · 拖动文件到合法区域才显示接收状态
- **40** [卡片网格重排](40_GRID_REARRANGE.md) · 用户自定义组件排列但页面不塌陷
- **41** [框选多对象](41_LASSO_SELECT.md) · 快速选中画布中的一组对象
- **42** [可排序表格列宽](42_TABLE_COLUMN_RESIZE.md) · 用户调整列宽不破坏数据与排序
- **43** [拖拽式时间区间选择](43_TIME_RANGE_DRAG.md) · 在图表上精确选取统计窗口

### 数据图表与可视化
- **44** [折线图数据集形变](44_LINE_CHART_MORPH.md) · 从A数据集切到B时保持坐标与曲线关系
- **45** [柱状图排序重排](45_BAR_SORT_FLIP.md) · 值变化后的名次可追踪而不跳行
- **46** [堆叠面积图序列切换](46_STACKED_AREA_TRANSITION.md) · 显示贡献变化不发生不合理交叉
- **47** [真实行情流式曲线](47_LIVE_STREAM_CHART.md) · 连续观察实时数据同时准确暴露陈旧程度
- **48** [Dashboard 下钻图表联动](48_DASHBOARD_DRILLDOWN.md) · 从总览点到板块/标的明细保持数据语义
- **49** [KPI 数字过渡](49_KPI_COUNT_TRANSITION.md) · 指标数值变化可被辨认而不造成虚假的实时波动
- **50** [热力图渐变与筛选](50_HEATMAP_FILTER.md) · 切换指标时格子保持业务身份
- **51** [图表 Brush 缩放与平移](51_CHART_BRUSH_ZOOM.md) · 手势明确控制可见数据域
- **52** [蜡烛图周期切换](52_CANDLE_INTERVAL_CHANGE.md) · 周期切换保留时间中心和选定标的上下文
- **53** [关系网络节点聚焦](53_NETWORK_NODE_FOCUS.md) · 从杂乱网络聚焦一个节点的邻接结构
- **54** [地理地图区域钻取](54_MAP_REGION_DRILL.md) · 省→市等层级切换保持空间地理位置

### 时间轴与媒体
- **55** [可拖动时间轴 Scrubber](55_TIMELINE_SCRUBBER.md) · 从时间拖拽直接预览对应状态
- **56** [可逆多步骤故事时间线](56_STORY_TIMELINE.md) · 用户每次前进只推进一段叙事
- **57** [带章节的视频进度条](57_VIDEO_CHAPTERS.md) · 准确跳转指定章节并知晓当前位置
- **58** [媒体画廊相邻切换](58_MEDIA_GALLERY.md) · 连续浏览媒体不丢当前编号
- **59** [前后对比拖动分割](59_BEFORE_AFTER_COMPARE.md) · 同一坐标观看修改前后效果
- **60** [音频波形裁剪区间](60_AUDIO_WAVEFORM_TRIM.md) · 选取真实音频时间段而非装饰波形
- **61** [时间表事件拖动排期](61_SCHEDULE_DRAG.md) · 可视化调整事项起止时间
- **62** [图表历史回放播放器](62_HISTORICAL_REPLAY.md) · 以真实历史快照逐帧回放，不误认为实时
- **63** [滚动驱动章节图解](63_SCROLL_SCRUB_STORY.md) · 用户滚动主动推动图解状态，不是自动入场

### 浮层与空间界面
- **13** [Morphing 弹窗由按钮生长](13_BUTTON_TO_DIALOG_MORPH.md) · 用户理解触发源与详情弹窗的关系
- **14** [锚点 Popover 气泡定位](14_ANCHORED_POPOVER.md) · 小任务浮层仍明确来源位置
- **15** [Bottom Sheet 底部抽屉](15_MOBILE_BOTTOM_SHEET.md) · 移动端不跳转即可完成一组操作
- **16** [上下文菜单原位展开](16_CONTEXT_MENU.md) · 右键或键盘菜单键可得到操作列表
- **17** [图片 Lightbox 共享放大](17_GALLERY_LIGHTBOX.md) · 看大图不失去来源缩略图位置
- **18** [确认对话框危险操作](18_DANGEROUS_CONFIRM.md) · 危险动作前明确后果不误触
- **19** [嵌套浮层层级管理](19_NESTED_OVERLAY_STACK.md) · 多级浮层关闭按栈顺序，不发生焦点泄漏
- **20** [Notification Center 通知抽屉](20_NOTIFICATION_CENTER.md) · 在原页面看未读并处理通知
- **21** [步骤式表单弹层](21_WIZARD_MODAL.md) · 在同一弹层内顺序完成业务任务

### 移动端与无障碍
- **97** [移动底部导航选中迁移](97_MOBILE_BOTTOM_NAV.md) · 移动端高频任务一步可达
- **98** [下拉刷新真实数据](98_PULL_REFRESH.md) · 主动刷新而非自动频繁请求
- **99** [移动端滑动返回](99_MOBILE_SWIPE_BACK.md) · 触摸手势返回不丢当前页面
- **100** [长按出现操作菜单](100_LONG_PRESS_MENU.md) · 触摸屏显式获得对象上下文操作
- **101** [减少动态效果降级](101_REDUCED_MOTION_MODE.md) · 系统减少动态时仍完整保留业务和焦点
- **102** [键盘拖拽与焦点迁移](102_KEYBOARD_REORDER.md) · 不可使用鼠标的用户也能重排
- **103** [响应式密度平衡](103_RESPONSIVE_DENSITY.md) · 小屏优先核心任务而不隐藏关键事实
- **104** [触摸安全交互目标](104_TOUCH_TARGETS.md) · 减少误触并保留操作反馈

### 输入与表单微交互
- **03** [按钮按压微反馈](03_PRESS_FEEDBACK.md) · 精确按压与恢复
- **22** [Switch 开关轨道迁移](22_SWITCH_THUMB.md) · 准确区分开关提交中与真实状态
- **23** [分段控制选中底座](23_SEGMENTED_CONTROL.md) · 相互排斥选项有统一的活动锚点
- **24** [输入框焦点与浮动标签](24_FLOATING_LABEL.md) · 焦点与已填值状态一目了然
- **25** [异步输入校验反馈](25_ASYNC_FIELD_VALIDATION.md) · 提示出错原因而不是摇晃表单
- **26** [可搜索 Combobox](26_SEARCHABLE_COMBOBOX.md) · 输入并通过键盘选择真实选项
- **27** [密码显隐与强度提示](27_PASSWORD_REVEAL.md) · 显示密码不改变表单结构
- **28** [搜索框展开到结果页](28_SEARCH_EXPAND.md) · 搜索从小入口扩展到真正结果区域
- **29** [文件上传拖放与进度](29_FILE_UPLOAD.md) · 文件选择与上传反馈明确、可信
- **30** [滑块区间选择](30_RANGE_SLIDER.md) · 精确调节区间不被装饰性延迟干扰
- **31** [日期时间选择面板](31_DATE_TIME_PICKER.md) · 有明确选中态和有效日期限制
- **32** [表单步骤进度器](32_FORM_STEPPER.md) · 跨步骤输入状态可恢复

## 场景选择判据

- 页面/区域关系变化：优先“共享元素/容器形变/侧栏/Popover”，单元素小反馈不要用全屏过渡。
- 数据变化：先确认数据真实性、坐标域、时间戳及错误状态；然后才考虑插值。
- 直接操纵（拖拽/滚动/时间轴）：运动位置与真实输入同步，不叠加人为惯性；只有结束归位可使用缓动。
- 3D：仅内容含真实空间关系时采用，必须存在2D/静态可用替代。
- 异步：网络进度绝不能以动画进度虚构，失败/取消/重试优先于视觉对称。
- 默认初始静止、交互触发、有焦点反馈；可逆变换同锚点同路径同曲线同标称时长。

## 规范和来源

- [SCENARIO_PROMPT_SCHEMA](../design/SCENARIO_PROMPT_SCHEMA.md)
- [MOTION_SPEC](../design/MOTION_SPEC.md)
- [UX_FOUNDATIONS](../design/UX_FOUNDATIONS.md)
- [VISUAL_QA](../design/VISUAL_QA.md)

详见根目录 `REFERENCES.md`（官方 API 文档与技术适用限制）。
