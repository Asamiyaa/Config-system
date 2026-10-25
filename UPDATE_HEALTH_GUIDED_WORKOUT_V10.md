# Wealth OS · Health Guided Workout V10

## 本次升级
健身管理从“训练记录”升级为真正的逐组训练系统：

- 点击“进入今日训练”直接创建当天 Guided Workout。
- 按星期自动生成训练动作序列，逐动作 → 逐组推进。
- 每个动作自动带入该动作上一次已保存工作重量。
- 每组可记录实际重量、实际次数、RIR、RPE。
- 完成一组后自动进入下一组并启动 90 秒休息倒计时，支持 ±15 秒和跳过休息。
- 当前重量超过该动作历史最大工作重量时即时显示 PR 提示。
- 训练可中途结束；仅把实际完成且未跳过的组写回 `trainingSessions`。
- 完成页显示动作数、组数、耗时、PR 数与本次刺激肌群；原有交互人体肌肉图继续保留。
- Guided Workout 原始逐组明细保存在 `state.guidedWorkoutHistory`，并在兼容字段 `trainingSessions[].setDetails` 中保留每组详情。
- 活跃训练保存在 `state.activeGuidedWorkout`，刷新页面后不会丢失进度。

## 数据兼容与安全
- 不删除、不迁移原 `state.trainingSessions`，旧训练记录完全兼容。
- 新字段通过 `/api/state` 进入现有 V7 Personal Data Vault 全量状态归档链。
- Full Update 不包含 `data/wealth_os.sqlite3`，不会覆盖用户数据库。
- 不复制 openGym 的受版权保护动作媒体；继续使用项目已有本地 GIF/人体资源，仅复刻训练交互思想。

## 验证
- `node --check static/app.js`
- `python -m py_compile server.py`
- ZIP 完整性检查
