# 部署与 Demo 调试步骤

## A. 本地 Demo（推荐第一步）

1. 解压 `Wealth_OS_TickFlow_Integrated_Update.zip`；如果你已有项目目录，也可以将 `Wealth_OS_TickFlow_Overlay.zip` 解压并覆盖到项目根目录。
2. 安装 Python 3.11/3.12。
3. 双击 `start_windows.bat`（Windows），或者执行 `./start_macos_linux.sh`（macOS/Linux）。脚本会建立虚拟环境、安装依赖并启动服务。
4. 打开 `http://127.0.0.1:8765`；登录 `demo / Demo1234!`，或者创建一个新本地账户。
5. 逐个点击左侧模块；更改输入框后离开控件即自动保存到当前账户；日志/预测按提交按钮保存。
6. `聊天归档与源文件` 页面可以导出完整工作区 JSON，或从之前的 JSON 恢复。恢复会覆盖当前账户状态，导入前先导出备份。
7. 点“刷新公开行情”以尝试更新公开日线数据。网络、第三方服务、频率限制、接口变化都会影响成功率；状态区域会显示本轮成功概况。不要把快照当作交易级行情。

## B. Docker 本机试运行

```bash
docker compose up --build
```
然后访问 `http://127.0.0.1:8765`。

持久化数据库位于 `./data/wealth_os.sqlite3`。在开发/演示中，Docker Compose 将其目录挂载到容器内。

## C. 部署到公网前必须变更

此仓库默认适合单机 Demo / 内网实验。公网部署前：

1. 设置长且随机的 `SECRET_KEY`；不要继续使用开发默认值。
2. 设置 `DISABLE_DEMO_ACCOUNT=1` 后再初始化新数据库，禁用固定 Demo 账号。
3. 设置 `COOKIE_HTTPS_ONLY=1`，并由反向代理配置 TLS/HTTPS。
4. 不要把数据库、备份 JSON、`reference_materials/` 或环境变量暴露到公开目录；设置最小文件权限并定期加密备份。
5. 配置反向代理、访问日志、限流、备份与升级回滚。当前代码是原型，不是完整的多租户生产产品：还没有邮件验证、找回密码、MFA、管理员管理、完整审计日志、CSRF 防护/严格生产安全评审。
6. 对有投资决策用途的数据源建立 SLA/监控，并自行采购有权限的数据；公开 API 可能延迟、缺失或变更。不要将任何第三方 API 输出当成保证可用的交易数据。

## D. 数据库 / 配置

- 用户与密码哈希：`data/wealth_os.sqlite3`
- 新用户默认工作区：`data/seed_state.json`
- 前端：`static/`
- 参考原文件：`reference_materials/`
- 可从 UI 导出/导入 JSON。

`.env.example` 是环境变量示例。用 shell 设置环境变量后启动即可，例如：

```bash
export SECRET_KEY="请替换成至少32字节的随机秘密"
export COOKIE_HTTPS_ONLY=1
export DISABLE_DEMO_ACCOUNT=1
uvicorn server:app --host 127.0.0.1 --port 8765
```

生产系统通常把服务监听在 localhost，由 Nginx/Caddy 等反向代理终止 TLS；不要直接对公网暴露调试服务器。


## 更新：TickFlow 任务首页
首页已从“资产总览”调整为“今日工作台”。先备份整个目录（特别是 `data/wealth_os.sqlite3`），再覆盖 `static/index.html`、`static/app.js`、`static/styles.css` 与文档。重启 FastAPI 后，登录首页（今日工作台）即可看到今日任务、快速新增、重要事项、未来7天、每日习惯、25分钟专注计时和 WEALTH OS 关注卡片。任务保存在当前用户 SQLite 工作区；不需要 Supabase 配置，也不会同步至 TickTick 官方服务。


## 应用金字塔 / TypeWords 更新

更新包内 `static/index.html`、`static/app.js`、`static/styles.css` 和 `README.md` 是可覆盖的增量更新。应用更新前请停止服务并备份 `data/wealth_os.sqlite3` 与 `.env`。本次只改页面展示/导航，不需要数据库迁移：

1. 解压补丁到项目根目录并覆盖对应文件。
2. 运行 `node --check static/app.js`（仅检查前端 JavaScript 语法，可选）。
3. 重新启动 `start_windows.bat`。
4. 登录后进入“新登配置 / 90天”；检查“能力金字塔”“90天路线图”“英语能力节点”。
5. 点击侧边栏英语下的 TypeWords 单词/文章练习，确认新窗口打开 `https://typewords.cc/`。

TypeWords 是外部工具；当前系统不读取它的登录信息或练习统计，建议每周把英语练习分钟数回填到本工作区。
