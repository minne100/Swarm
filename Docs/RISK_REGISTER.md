# 风险台账（Risk Register）- Swarm 自举式 MVP

## 风险清单（重点）

| ID | 风险 | 概率 | 影响 | 应对策略 | Owner | 状态 |
|---|---|---|---|---|---|---|
| R1 | 任务拆解质量不稳定 | 中 | 高 | 引入目标拆解 Skill，模板化拆解并回归 | PM + AI Eng | Open |
| R2 | 长流程中断难恢复 | 中 | 高 | 超时/重试/幂等/回滚策略 | Tech Lead | Open |
| R3 | Bee 约束被破坏（持久化 Honey） | 低 | 高 | 静态检查 + 运行时校验 + 评审门禁 | Tech Lead | Open |
| R4 | 覆盖率不足导致质量风险 | 中 | 高 | 覆盖率门禁 + 异常场景测试 | QA Lead | Open |
| R5 | Token 成本失控 | 中 | 高 | 记忆宫殿召回 + 上下文压缩 + 告警阈值 | PM + Infra | Open |
| R6 | 记忆召回噪声高 | 中 | 中 | 召回排序优化 + 相关性阈值 | AI Eng | Open |
| R7 | 审核负担过高 | 中 | 中 | 分级审核（高风险必审） | PM | Open |
| R8 | 单链路成功但难复用到第二链路 | 中 | 高 | Skill 复用目录 + 第二链路强制复用验收 | PM + Tech Lead | Open |
| R9 | 外部模型/网络不稳定 | 中 | 中 | 降级与重试策略 | Infra | Open |
| R10 | MVP 范围膨胀 | 高 | 中 | 严格 In/Out Scope 管理 | PM | Open |
| R11 | 未按 Skill-First 执行导致质量波动 | 高 | 高 | 流程门禁：无 Skill 不得生成执行产物 | PM + Tech Lead | Open |
| R12 | “自举式 MVP”停留在文档层，缺少真实功能交付 | 中 | 高 | 以“至少 1 条功能链路合入主干”作为硬验收门槛 | PM | Open |

## 本期 Top 3

1. R1 任务拆解稳定性
2. R11 Skill-First 执行纪律
3. R12 自举落地真实性
