# Wealth OS · Health V11 — Routine Builder + Progressive Overload

## 新增
- 周一至周日独立 Routine Builder，可编辑计划名称。
- 动作可添加、删除、拖拽排序。
- 每个动作可设置目标组数、目标次数、加重步进。
- Guided Workout 启动时读取当天自定义 Routine，不再只依赖硬编码模板。
- Progressive Overload 根据最近 3 次逐组数据（重量、次数、RIR、RPE）给出：建立基线 / 加重量 / 加次数 / 维持 / Deload。
- 建议重量直接预填到 Guided Workout 当前动作，形成“计划 → 建议 → 执行 → 记录 → 下一次建议”闭环。
- Deload 规则：连续高疲劳（RIR 很低或 RPE 很高）或目标次数明显掉落时，建议约降低 10% 负荷。
- 原 V10 Guided Workout、PR、休息计时、肌肉图、训练历史保持兼容。

## 数据兼容
- 新增 `state.fitnessRoutines` 保存自定义周计划。
- 保留 `state.trainingSessions`、`state.guidedWorkoutHistory`、`state.activeGuidedWorkout`。
- 不修改或覆盖 `data/wealth_os.sqlite3`。
- 继续通过现有 `/api/state` 与 Personal Data Vault 保存状态。

## 自动渐进逻辑
1. 无逐组历史 → 建立基线。
2. 完成目标次数，平均 RIR >= 2 且 RPE <= 8.5 → 加重量（按动作配置的 loadStep）。
3. 接近目标，RIR >= 1 且 RPE <= 9 → 加次数。
4. 负荷刺激适中 → 维持。
5. 最近 3 次中至少 2 次高疲劳，或次数明显下降且 RPE 很高 → Deload 约 10%。

这些规则是训练决策辅助，不替代教练或医疗建议；疼痛、受伤或异常不适应优先停止训练并寻求专业评估。
