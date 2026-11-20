# 新登集成版本

主工作台已接入账户数据库，请通过新登「成长 → UI 学习」进入。详情见项目 UI_LEARNING_INTEGRATION.md。以下为来源版本说明；其本地存储说明只适用于未集成版本与旧案例站。

# AI Learn Studio（独立网站）

打开 `index.html`，或执行 `start_windows.bat` / `python3 -m http.server 8768 --bind 127.0.0.1`。站点目录自包含原 aiLearn 的 6 页和交互实验室（`original/`、`labs/`），与外层脚手架分离安装后仍可访问。

内置 104 交互配方 + 2 原始 UI 案例 + 2 原始五维解析模板。左效果右 Prompt，支持模块/子模块增删改、知识创建/编辑/删除、图片上传、收藏、进度、JSON 全量备份及 Skill 导出。

注意：内置知识数量不是动态 Demo 数量；存储使用当前浏览器 localStorage / IndexedDB，务必备份。
