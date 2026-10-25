# WEALTH OS 白色主题全局对比度修复

本补丁修复工作台切换为“白色”主题后，各节点仍继承 Taste Skill 深色背景/浅色文字导致的可读性问题。

## 修复范围
- 全局 Card / Modal / Table / Form / Sidebar / Home / Task / Market 节点
- 投资行情状态、数据来源、ETF/资产表格
- Agent 节点的深色轨道卡片
- 健康/训练等硬编码深色容器的浅色主题兜底
- 输入框、下拉框、按钮、Chip、状态标签、进度条

## 设计规则
浅色主题统一采用：浅色 Surface + 深色正文；语义色仅用于强调、状态和操作。深色主题不受影响。

## 部署
将 Overlay ZIP 解压覆盖项目根目录即可。不会包含或覆盖 `data/wealth_os.sqlite3`。
浏览器使用 Ctrl+F5 强制刷新缓存。
