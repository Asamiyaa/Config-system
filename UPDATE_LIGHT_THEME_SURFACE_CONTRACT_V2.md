# Light Theme Surface Contract v2

本次针对白色主题下各页签仍残留的黑色/深色内容块进行全局修复。

## 修复范围
- 任务、规则、维度编辑、聊天/Agent 辅助区域
- 日历、周视图、当前日期、事件卡片
- 新登配置、能力金字塔、路线图子菜单
- 英语学习节点
- Excel/Workbook 预览、行列头、hover/active 状态
- 健康/医学模型宿主区域
- Modal、二级导航、pill/status 控件
- 增加 inline style 浅色主题安全网，降低未来新节点再次出现黑块的概率

## 主题规则
白色主题下，普通应用内容 surface 统一为白色或浅灰/浅绿，正文统一为深色。图表、图片、视频和真正的 3D 渲染画布可以保留自身媒体色彩，不强行漂白。

## 部署
优先使用 Overlay 包覆盖现有项目，然后浏览器执行 Ctrl + F5。补丁不包含 `data/wealth_os.sqlite3`。
