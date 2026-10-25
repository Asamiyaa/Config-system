# WEALTH OS · Navigation / Information Architecture V5

本次调整：

1. 新增独立节点「错过和过错」，承载原 Agent 分身中的「每日必读 · 错误与错过清单」；Agent 分身不再显示该模块。
2. 「与你当前项目相关的关注点」从 Agent 分身移动到工作台。
3. 左侧导航中「新登」移动到「Agent 分身」之前。
4. 「定时任务」移动到「聊天归档与源文件」之后。
5. 删除左侧「黄色 B 选股规则」「周期研究 / 涛动」节点；投资/归档等可见页面中的相关入口与引用同步清理，归档主题列表也过滤对应历史条目。
6. 删除导航分隔文字 `LIFE OS · CORE CAPABILITIES` 与 `RESEARCH · RULES`，保留实际功能节点。
7. 原「错过/过错」数据继续复用 `state.dailyMustReads`，迁移节点不会丢失已有条目。

部署：覆盖 `static/index.html` 和 `static/app.js` 后重启服务，浏览器 Ctrl+F5。
数据库不需要替换，本更新包不包含 `data/wealth_os.sqlite3`。
