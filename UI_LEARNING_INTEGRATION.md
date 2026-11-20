# UI 学习集成

入口：成长 → UI 学习（思维导图之后）。网站和 Android WebView 共用页面。

## 内容与功能

来源为用户提供的 codex-ai-learn-studio-v3.0/codex-ai-learn-studio-v3.0/learn-studio，复制为 static/ui-learning，保留 MIT LICENSE。未运行安装器、未覆盖项目 AGENTS/Skills 或既有业务架构。

保留108条内置知识、10类交互示意、模块/子模块、自建知识、图片、搜索筛选、收藏、学习状态、Prompt复制、单项Skill/Markdown导出、JSON导入导出及独立交互实验室。108条知识不等于108个完整动态Demo。原案例站另行保留并标记“独立本地存储”，其旧版AI解析为演示能力，不代表真实模型服务；该旧工具不属于新账户同步边界。

## 账户持久化

主工作台不再依赖原来的通用localStorage/IndexedDB作为主存储。新增 /api/ui-learning GET/PUT，复用新登会话认证及现有SQLite。表ui_learning按user_id隔离，保存自建知识、模块、收藏、进度、图片数据。使用版本号保护多窗口写入，账户改变时拒绝提交；总资料上限20MB，原单图上限4MB。每次成功更新调用原数据库快照机制。

浏览器仅保留按账户ID分开的未同步草稿；请求失败显示重试，未保存或编辑中阻止切页、自动更新和退出。冲突提示先备份、重新打开、导入合并，不自动覆盖远端。完整JSON备份包含图片。

## 测试

- check_ui_learning_api.py：未登录401、账户隔离、跨账户写入拒绝、版本冲突409、初始化/重启后恢复、图片持久化、SQLite快照、格式校验和备份失败提示。
- check_ui_learning_browser.py：实际隔离FastAPI后端；页签、搜索、自建知识+图片、重新加载、收藏/已实践、JSON下载、390/360px无横向溢出、冲突时保护。
- 实际内置浏览器点击新增、保存、收藏与进度，确认顶部“已保存到账户”。
- 截图：artifacts/critique/ui-learning-desktop-test.png、ui-learning-390.png、ui-learning-360.png。

没有向生产账户写入测试知识；未验证实体Android文件下载/系统文件选择器行为。新页面资源与后端一起部署，App无需重装即可加载前端更新。
