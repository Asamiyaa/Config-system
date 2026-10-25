# Wealth OS V12 · Training Cycle / Fatigue Management

## 新增
- 近 7 天周训练有效组与 28 天周均基线。
- 肌群有效组：逐组数据中 RIR <= 4 计为有效组；旧记录没有 RIR 时保留已记录组数，避免历史数据丢失。
- ACWR：近 7 天有效组 / 近 28 天周均有效组，只用于训练负荷变化提示，不用于受伤预测或医疗判断。
- 4 周有效组趋势。
- 连续失败检测：动作最近连续记录出现明显掉次数，或 RPE >= 9.5 且 RIR <= 1。
- 自动 Deload Week：ACWR >= 1.50、多个动作连续失败，或高训练量下周增幅过快时触发。
- Deload 处方：动作重量约 -10%，总组数建议约 -30%。
- 可解释训练决策面板：逐动作展示目标组次、最近次数、RIR、RPE、全局 ACWR、触发原因和下一次处方。
- Progressive Overload 与全局疲劳联动：触发 Deload Week 时，全局减量优先级高于单动作“加重量”。

## 数据安全
- 不改变/删除既有 trainingSessions、guidedWorkoutHistory、fitnessRoutines。
- 不覆盖 data/wealth_os.sqlite3。
- V7 Personal Data Vault 仍负责个人数据外部归档。

## 说明
ACWR 和自动 Deload 是训练管理启发式规则，不是医学诊断。疼痛、头晕、异常疲劳或其他不适应停止训练并寻求专业评估。
