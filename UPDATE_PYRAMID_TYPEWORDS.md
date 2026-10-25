# 本次增量更新：新登配置金字塔 + TypeWords

## 修改的文件
- `static/app.js`：新增六层能力金字塔，添加页面内定位按钮、英语能力节点、90天路线图英语二级链接。
- `static/index.html`：在“新登配置 / 90天”导航下增加能力金字塔、90天路线、英语能力与 TypeWords 子菜单。
- `static/styles.css`：增加与 WEALTH OS 深绿/荧光绿主题一致的金字塔、英语卡片和嵌套导航样式，适配窄屏。
- `README.md`、`DEPLOYMENT.md`、`TICKFLOW_INTEGRATION.md`：补充功能和更新说明。

## 六层能力金字塔（从底座到顶部）
1. 现金流、应急金与执行底盘。
2. 核心资产与风险管理。
3. 生产力与收入引擎。
4. 全球金融基础设施。
5. 身份与跨境流动性。
6. 全球所有权与复杂资产。

每层都给出代表项目和进入下一层的解锁/复核条件。

## TypeWords 菜单
“新登配置 / 90天” -> “英语能力” -> “TypeWords 单词练习 / TypeWords 文章练习”。两个入口均在新窗口打开 `https://typewords.cc/`。不嵌入远程页面，不读取外部账号/练习数据；练习成果由每周记录手动回填。

## 覆盖步骤
停止网站服务，备份 `data/wealth_os.sqlite3` 和 `.env`，将本补丁解压到 `D:\aiTools\wealth-command-center` 并覆盖相同相对路径。重启 `start_windows.bat`。本次页面更新不要求数据库迁移。
