# skill-goal-decomposition

version: 0.2.0
owner: swarm
type: planning-recursive

## 目标

将用户目标拆成可执行任务树，并为每个节点分配唯一 Dance。

本技能采用双审查结构（参考 gstack 的 plan-ceo-review / plan-eng-review 思路）：

1) CEO Review：价值、范围、优先级、取舍
2) ENG Review：架构、依赖、边界、测试与回滚

## 强约束

1. 必须递归拆解（用户确认后再下钻）
2. 每一条节点（大条目/小条目）都必须绑定一个 Dance
3. 输出产物必须是 Markdown（不是 JSON）
4. 人类只审核与确认，不直接写 Bee/Honey/Dance

## 递归拆解算法

### 层级定义

- L0：Mission（总目标）
- L1：Streams（主工作流）
- L2：Work Packages（可管理子包）
- L3：Executable Tasks（可执行任务）

### 停止条件（达到 L3）

节点满足以下全部条件即可停止下钻：

1. 可在一个短周期内完成（建议 <= 1 天）
2. 输入输出清晰
3. 验收标准明确
4. 可绑定单个主 Dance

## 交互卡片（选项优先）

```text
[Skill: Goal Decomposition]
请选择拆解深度：
1) 标准拆解（推荐）
2) 深度拆解（复杂项目）
3) 快速拆解（先跑通）
0) 其他（自定义）
```

```text
[Skill: Goal Decomposition - CEO Review]
请选择本轮范围策略：
1) 聚焦最小可交付（推荐）
2) 适度扩展（保留核心）
3) 大幅扩展（探索优先）
0) 其他（自定义）
```

```text
[Skill: Goal Decomposition - ENG Review]
请选择工程策略：
1) 稳定优先（推荐）
2) 速度优先（可接受技术债）
3) 质量优先（测试与边界最严格）
0) 其他（自定义）
```

## 执行流程

1. 读取目标与约束
2. 生成 L1 草案并执行 CEO Review
3. 用户确认 L1 后，递归展开到 L2
4. 对 L2 执行 ENG Review（依赖/风险/测试）
5. 用户确认后递归到 L3
6. 为每个节点分配 `dance_id`
7. 输出 Markdown 工件并等待用户确认

## 输出产物（Markdown）

- `artifacts/plans/<slug>/PLAN_TREE.md`
- `artifacts/plans/<slug>/CEO_REVIEW.md`
- `artifacts/plans/<slug>/ENG_REVIEW.md`
- `artifacts/plans/<slug>/DANCE_INDEX.md`

### PLAN_TREE.md 模板

```markdown
# Plan Tree: <project>

## L0 Mission
- M0: <mission>

## L1 Streams
- S1: <stream> -> dance_id: D-S1
- S2: <stream> -> dance_id: D-S2

## L2 Work Packages
- WP1: <package> (parent: S1) -> dance_id: D-WP1

## L3 Executable Tasks
- T1: <task> (parent: WP1)
  - input:
  - output:
  - acceptance:
  - dance_id: D-T1
```

### DANCE_INDEX.md 模板

```markdown
# Dance Index

| Node ID | Node Name | Level | Dance ID | Dance File |
|---|---|---|---|---|
| S1 | Skill Generation | L1 | D-S1 | artifacts/dances/D-S1.md |
| T1 | Generate Goal Skill | L3 | D-T1 | artifacts/dances/D-T1.md |
```

## 示例（当前项目）

第一层（L1）示例：

1. 技能生成（Skill Generation）
2. 环境搭建（Environment Setup）
3. 项目测试（Project Testing）

当用户确认第 1 项后，继续递归，例如：

- 目标拆解技能
- Bee 生成技能
- Honey 生成技能
- Dance 生成技能
- 学习进化技能

每一条都绑定 Dance 并写入 `DANCE_INDEX.md`。
