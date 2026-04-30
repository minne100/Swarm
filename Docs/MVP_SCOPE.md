# MVP 范围定义（Swarm）

## MVP 定义（升级）

**MVP = 用 Swarm 范式成功构建 Swarm 项目本身。**

这不是演示型 MVP，而是自举型 MVP（dogfooding）：

- 用 Swarm 的方法生产 Swarm 的核心能力
- 用真实项目生命周期验证范式有效性
- 以项目本身作为第一份对外可验证案例

## MVP 目标

在当前仓库内跑通并沉淀如下闭环：

`目标定义 -> Skill 设计/创建 -> 调用 Skill 生成 Bee/Honey/Dance -> Hive 执行 -> Beekeeping 审核 -> 合并到主干 -> 指标复盘`

## In Scope（必须完成）

### 0. 自举场景（新增）

- 唯一样板场景：**Swarm 构建 Swarm**
- 至少完成 1 条真实功能链路（不是静态文档演示）
- 产物必须直接进入本仓库并可复盘

### 1. Skill 层（硬要求）

- 目标拆解 Skill
- Bee 生成 Skill
- Honey 生成 Skill
- Dance 生成 Skill
- 代码审核 Skill
- 测试 Skill（单测/整测）

要求：
- 先调用 Skill，再生成执行产物
- 每个 Skill 有版本号与变更记录

### 2. 生成与编排层

- Bee/Honey/Dance 全部由 AI 生成
- Dance 支持最小编排能力（顺序、超时、重试）

### 3. 执行与治理层

- Hive 主链路可执行
- 成功/异常统一报告
- Beekeeping 审核入口可用

### 4. 质量与成本

- Bee 支持等待和挂起
- Bee 不持久化 Honey（外部注入）
- Bee 结果和报告通过 Dance 提交
- Bee 测试覆盖率目标 100%
- 记忆宫殿可降低无关召回并输出 Token 对比

## Out of Scope（本阶段不做）

- 企业级 RBAC/多租户
- 完整 BeeHub 商业体系
- 全功能 Web 平台
- 零人工审核（MVP 仍保留 Beekeeping）

## MVP Exit Criteria

满足以下条件才可宣布 MVP 成立：

1. 在本仓库完成至少 1 条“由 Swarm 生产并合入”的功能链路
2. 全链路证据齐全（Skill 调用日志、执行日志、审核记录、测试报告）
3. 与基线相比，至少一项指标显著改善（TAT / 返工率 / Token 成本）
4. 团队可复用该流程在第二个功能点上重复成功

## 对外叙事（建议）

- **Swarm is built by Swarm.**
- 我们不是在讲方法论，而是在用该方法持续交付本项目本身。
