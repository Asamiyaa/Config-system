# WEALTH OS · 定时任务与 Excel 每日归档更新

## 本次更新

- 新增「定时任务」导航节点，位于「今日工作台」之前。
- 预置首条任务「全球配置 + 纳斯达克 + A股数据预热与 Excel 归档」，默认每日 07:30（以运行服务器的本地时区为准）。
- 支持新增/编辑任务、每天/工作日频率、执行时间、启用/暂停和手动立即执行。
- 后端后台线程每 20 秒检查到期任务；网站服务进程必须运行，Windows 电脑需保持开机并让服务持续运行。
- 任务尝试获取 Yahoo Finance/yfinance 的全球市场日线与 AKShare/东方财富的 A 股 ETF 日线，计算最新价、涨跌幅、MA20/MA50/MA60/MA200、20/60日收益、区间高点回撤等基础指标。
- 将各跟踪工作簿复制到指定 Windows 归档目录的日期子目录，并附加 `Market_Snapshot` 工作表和 `run_manifest.json`。同日重复运行使用时间后缀，避免覆盖历史副本。
- 只写入数据源实际返回的字段；请求失败、缺失或超时字段为空/标注错误，不伪造数据。行情可能延迟，不等于实时行情，也不是自动交易信号。
- 「与你当前项目相关的关注点」从今日工作台移入「Agent 分身」；「每日必读 · 错误与错过清单」仍独立显示在 Agent 分身节点内。
- 「新登」页面移除「资产组合起始比例」卡片。

## 归档位置

默认目录：`D:\WEALTH_OS_DAILY_ARCHIVE`。可以在「定时任务」页面改成其他 Windows 路径。只有当 FastAPI 服务运行在用户自己的 Windows 电脑上时，这个路径才指向该电脑；若服务运行在远程服务器，归档会写入服务器文件系统。

## 重要边界

- 本次自动化为公开行情预热及每日 Excel 副本归档。现有 Excel 的复杂公式、图表、外部链接或宏不保证由 `openpyxl` 重新计算；新增 `Market_Snapshot` 中的基础指标由 Python 根据拉取到的日线计算后写成值。
- 任务在网站进程关闭期间不会运行。若需要即使网站未启动也执行，应进一步注册 Windows Task Scheduler 计划任务或运行独立 Windows 服务。
- 医学级人体骨骼/肌肉 GLB 网格、绑定动画以及可离线播放的动作 GIF 尚未随本包交付。已有动作链接仍可能跳转到外部网站；不能将其描述为已下载并内置。建议使用具有明确授权的独立网格资产，附带来源与许可清单，再接入本地 Three.js/GLTFLoader。可评估的参考：
  - https://github.com/jixiangying/skeleton （BodyParts3D/MRI 来源，CC BY-SA；需遵守署名及相同方式共享许可）
  - https://github.com/slorksmo/Human-Atlas （3,400+ 可选解剖结构，解剖数据有 CC BY 4.0 署名要求；需按仓库 ATTRIBUTION 文件保留来源）
  - https://github.com/patrick-fung77/human-anatomy-model （程序生成骨骼模型；检查仓库许可与导出资产后再使用）
- 以上模型均不是医学诊断工具；接入前需核验资产完整性、浏览器性能、许可和动画来源。

## 部署

1. 停止服务并备份 `data/wealth_os.sqlite3`、`.env` 与源码。
2. 将覆盖补丁解压到 `D:\aiTools\wealth-command-center`，保留相对路径。
3. 重新运行 `start_windows.bat`。
4. 打开「定时任务」，确认默认任务与归档目录；可先手动运行一次。首次运行可能需要较长时间，取决于数据源网络响应。
5. 检查 `D:\WEALTH_OS_DAILY_ARCHIVE\YYYY-MM-DD\` 下的 Excel 和 `run_manifest.json`。

## 验证

已通过 JavaScript 语法检查、Python 编译、登录/任务 API 冒烟测试、测试副本写入 `Market_Snapshot` 工作表及 ZIP 完整性检查。没有对真实网络行情做全量定时抓取，也没有完成浏览器端到端测试。
