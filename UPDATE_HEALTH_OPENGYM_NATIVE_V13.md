# V13 健康管理 · openGym 能力原生接入

## 目标

把 `E:\health\openGym` 的能力并入「健康管理 → 健身管理」，并且**不再需要单独启动 openGym**：

- 不需要运行 `start.ps1`
- 不需要 Node / Docker
- 不需要额外端口（3000 / 8080）
- 不需要第二套账户或 passkey 登录

由 Wealth OS 现有的 FastAPI 进程直接读取 openGym 的 `catalogue` 目录，前端在健身管理内以「动作库」工作区使用。

## 为什么不是启动 openGym 再 iframe

| 方案 | 问题 |
|---|---|
| 启动 Node API + 反向代理前端 | 需要 Node 常驻、双进程、额外端口；openGym 使用自己的 passkey 账户与数据目录，和健康管理数据割裂 |
| iframe 嵌入 openGym | 仍需启动服务；登录、Cookie、WebAuthn 与主站不同源；移动端体验差 |
| **原生读取 catalogue（本方案）** | 单进程、单登录、单数据源；动作与训练记录直接进入现有健康管理统计 |

## 本次新增

### 后端

- `gym_catalogue.py`：openGym catalogue 的只读内存索引
  - 读取 `catalogue/exercises/*.json`（5,632 个有效动作，跳过 922 个仅有 `variantOf` 的变体）
  - 合并 `catalogue/i18n/zh.json`（5,632 条中文名称；步骤缺失时回退英文并标记「英文原文」）
  - 身体部位映射到现有健康管理的五个 zone：胸部 / 上肢 / 核心 / 下肢 / 全身
  - 器械、目标肌群、分类中文标签
  - 关键词检索（名称优先、短名称优先）、部位/器械/目标/分类/收藏过滤、分页
  - 媒体安全读取：仅允许 `^\d{4,5}$` 动作 id + `still|clip`，阻止路径穿越
  - 周计划生成：目标 × 每周天数 × 可用器械 × 单次时长
- `server.py` 新增接口（均要求登录）：
  - `GET /api/gym/status`：动作库可用性、动作数、中文数、媒体数
  - `GET /api/gym/facets`：部位 / 器械 / 目标 / 分类计数
  - `GET /api/gym/exercises`：检索与分页
  - `GET /api/gym/exercises/{id}`：中文名称、步骤、协同肌群、媒体地址
  - `GET /api/gym/media/{id}/still|clip`：从 openGym 原目录流式读取（immutable 缓存）
  - `POST /api/gym/plan/generate`：生成整周计划
- 启动时后台预热索引（约 2–3 秒），不阻塞服务启动。
- 目录不可用时返回可解释状态，不影响健康管理其他功能。

### 前端

- 健身管理新增第 3 个工作区 **「动作库」**（今日 / 计划 / 动作库 / 复盘 / 工具）
  - 动作卡片：静图、中文名、目标肌群、器械、部位、分类
  - 搜索框（防抖 280ms）、部位 chips、器械/分类下拉、仅收藏
  - 动作详情弹层：本地动画、动作步骤、协同肌群、收藏、加入周计划、记录训练
  - 「加载更多」分页
- 计划工作区：
  - 每天的动作行显示 `openGym 动作说明` 入口
  - 「从动作库选择」：检索后一次加入多个动作
  - 「智能生成周计划」：目标 / 天数 / 单次时长 / 可用器械，一键覆盖周计划
- 引导训练：
  - 有 `exerciseId` 的动作优先播放 openGym 本地动画（mp4 + webp poster），无媒体时回退原有本地 GIF
  - 新增「动作库说明」入口
  - 组间休息使用计划中的 `restSeconds`
- 训练记录：
  - `state.trainingSessions` 增加 `exerciseId`
  - 从动作库「记录这次训练」会预填动作名与部位
  - 训练完成后的记录继续进入热力图、PR、恢复、ACWR/疲劳分析

### 数据

动作库、收藏与周计划继续保存在现有 `state`：

```json
{
  "gym": {
    "favorites": ["0025", "1197"],
    "lastPlanAt": "2026-10-25T08:20:00.000Z",
    "planMeta": { "goal": "strength", "daysPerWeek": 4 }
  },
  "fitnessRoutines": {
    "1": {
      "name": "周一 · 推 · 胸肩三头",
      "exercises": [
        {
          "exerciseId": "0025",
          "name": "杠铃卧推",
          "zone": "胸部",
          "targetSets": 4,
          "targetReps": 8,
          "loadStep": 2.5,
          "restSeconds": 90
        }
      ]
    }
  }
}
```

- 不复制动作元数据到 SQLite，避免状态膨胀。
- 个人数据仍走 V7 Excel 个人数据保险库（`Full_State_JSON` 无损恢复）。

## 周计划生成规则

按每周训练天数选择分化：

| 天数 | 分化 |
|---|---|
| 1 | 全身 |
| 2 | 上肢 / 下肢 |
| 3 | 推 / 拉 / 腿 |
| 4 | 上 / 下 / 上 / 下 |
| 5 | 推 / 拉 / 腿 / 上肢 / 全身 |
| 6 | 推 / 拉 / 腿 / 推 / 拉 / 腿 |
| 7 | 上述 6 天 + 核心与有氧 |

- 目标：增肌 8–12 次、力量 3–5 次、减脂 12–20 次、体能 10–15 次、灵活性 30–45 秒
- 优先复合动作（大肌群 + 自由重量/自重），再补辅助动作
- 不同器械轮转出现，避免整周全是自重
- 同一周内尽量不重复动作；器械不足时自动放宽并在返回元数据中标记
- 每天 3–6 个动作，由单次时长推算（默认 60 分钟 → 5 个）

## 许可与边界

- openGym 代码为 AGPL-3.0；本次仅在本地以只读方式读取其数据目录，未复制其源代码。
- 动作图片/动画来自 openGym catalogue 的授权媒体，**保留在原目录按需读取**，不打包、不复制、不再分发。
- 本项目只做训练记录与安排，不提供医学诊断；疼痛/异常应停止并寻求专业评估。

## 验证

```powershell
# 语法
node --check static/app.js
.venv\Scripts\python.exe -m py_compile server.py gym_catalogue.py

# 单元测试（17 项）
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

实测结果：

- 动作库：5,632 个动作，中文 5,632，静图 5,632，动画 5,632
- 检索「深蹲」：331 条，第一条精确为「深蹲」
- 详情：中文名称 + 5 步动作步骤；无中文步骤时标注「英文原文」
- 媒体：`image/webp` / `video/mp4`，`Cache-Control: immutable`
- 未登录访问：401；路径穿越与非法媒体类型：404
- 7 天计划：7 个训练日，动作全部带 `exerciseId`
- 浏览器（Playwright）验证：动作库加载、搜索、详情、加入计划、生成计划、引导训练视频，均无控制台错误

## 使用

1. 正常启动本项目（无需启动 openGym）：
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8765
   ```
2. 登录 → 健康管理 → 健身管理 → 动作库
3. 搜索动作 → 详情 → 加入周计划 / 记录训练
4. 计划 → 智能生成周计划 → 今日 → 开始训练

如果 openGym 目录不在默认位置，在 `.env` 中设置：

```ini
OPEN_GYM_DIR=E:\health\openGym
```
