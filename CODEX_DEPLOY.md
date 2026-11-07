# Codex 部署说明

这个目录里有一份已经写好固定配置的部署脚本：

- 脚本：`deploy-codex.ps1`
- 本地目录：`E:\configSystem - 副本`
- GitHub：`git@github.com:Asamiyaa/Config-system.git`，分支 `main`
- 服务器：`root@39.106.118.186`
- 远端目录：`/opt/config-system`
- 服务：`config-system.service`
- 公网健康检查：`https://config.39.106.118.186.nip.io/api/health`
- 本机健康检查：`http://127.0.0.1:8770/api/health`

## 直接发给 Codex 的指令

```text
请阅读并执行 E:\configSystem - 副本\CODEX_DEPLOY.md 和 E:\configSystem - 副本\deploy-codex.ps1。

要求：
1. 先运行 dry-run：
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\configSystem - 副本\deploy-codex.ps1" -DryRun
2. 确认预检通过后，再执行正式部署：
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\configSystem - 副本\deploy-codex.ps1"
3. 最后报告：提交号、push 结果、上传结果、服务状态、健康检查 HTTP 状态。
4. 不要修改服务器 nginx 配置，不要删除 /opt/config-system/data 或 .env。
```

## 前置条件

Codex 所在机器必须已经具备：

1. `git`、`ssh`、`scp`、`curl.exe`
2. GitHub SSH 权限，密钥默认 `~/.ssh/id_ed25519`
3. 服务器 SSH 权限：`root@39.106.118.186`
4. 远程服务 `/opt/config-system`、用户 `configsystem` 已存在

脚本不包含密码，不需要也不应该把密码写进仓库。

## 正式执行

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\configSystem - 副本\deploy-codex.ps1"
```

脚本会依次执行：

1. 检查本地目录、Git 仓库、SSH key
2. `git add -A` / commit / `git push origin main`（有改动时）
3. `git archive HEAD` 生成压缩包
4. `scp` 上传到服务器 `/tmp`
5. 备份远端 SQLite 数据库
6. 解压覆盖到 `/opt/config-system`
7. 按 `requirements.txt` 哈希决定是否安装 Python 依赖
8. 修正文件所有者与 `.env` 权限
9. `systemctl restart config-system.service`
10. 服务状态检查 + 本地健康检查 + 公网健康检查

## 常用参数

```powershell
# 只检查配置，不提交、不上传、不重启
... -DryRun

# 已经手动 commit/push，只部署当前 HEAD
... -SkipGit

# 自定义提交信息
... -CommitMessage "Fix mobile dashboard"
```

## 重要说明

- 默认会提交当前工作区所有非忽略文件。执行前先看 `git status`。
- `.env`、数据库、`artifacts/`、`.venv/`、日志等已被 `.gitignore` 排除。
- 部署采用覆盖解压，不会删除远端已存在但新版本已移除的旧文件；如需删除文件，先单独确认路径再处理。
- 上传使用 3 次重试；如果服务器 SSH 临时超时，重新执行脚本即可。
- 脚本只重启 `config-system.service`，不改 nginx。
- 健康检查失败时不要反复重启；先看：
  ```bash
  systemctl status config-system.service
  journalctl -u config-system.service -n 80 --no-pager
  ```

## 本次脚本文件

- `deploy-codex.ps1`：可执行部署脚本
- `CODEX_DEPLOY.md`：本说明
