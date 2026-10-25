# V7 · Windows Excel 个人数据保险库

## 目标
所有用户产生的长期数据不再只依赖项目目录中的 SQLite/JSON。每次保存时，系统同步一份完整状态到用户指定的 Windows Excel 历史归档目录，程序升级或覆盖项目文件后仍可恢复。

## 外部主文件
`<归档目录>/PERSONAL_DATA/WEALTH_OS_PERSONAL_DATA_<用户名>.xlsx`

工作表：
- `Overview`：用户、同步时间、外部路径与恢复说明。
- `Personal_Data_Index`：所有顶层个人数据域的可读索引与完整 JSON，包括任务、健康/健身、每日流程/打卡、日志、投资配置、错过和过错、新登配置、学习记录等。
- `Full_State_JSON`：无损恢复源，按 Excel 单元格长度限制分片保存完整 state。
- `Scheduled_Tasks`：定时任务配置与执行状态。

## 升级保护
1. `/api/state` 每次成功保存后自动镜像 Excel。
2. 定时任务配置修改后自动镜像。
3. “Windows Excel 历史归档”提供“立即同步个人数据 Excel”。
4. 每日归档任务会把个人数据保险库一并复制到当天日期目录。
5. 归档目录写入 `%APPDATA%/WealthOS/archive_path.txt`，因此即使整个程序目录被替换，新版本仍能找到外部保险库。
6. 新建同名账户时，如果外部保险库存在，会自动以 `Full_State_JSON` 恢复状态。
7. 密码/密码哈希不会写入 Excel。若数据库被人为删除，需要重新创建同名账户并设置新密码，个人业务数据会从 Excel 恢复。

## 数据安全边界
- SQLite 仍作为运行时快速存储；Excel 是外部持久化/灾备副本。
- Full Update 继续排除 `data/wealth_os.sqlite3`、日志、`.env`。
- 不把登录密码写入 Excel。
