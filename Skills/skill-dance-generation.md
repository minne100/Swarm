# skill-dance-generation

version: 0.2.0
owner: swarm
type: orchestration-recursive

## 目标

为计划树中的每个节点生成对应 Dance（Markdown），并由 Dance 负责：

1) 搜索可复用 Bee
2) 若无可复用 Bee，则触发 Bee 生成
3) 生成/确认 Honey 数据契约

## 强约束

1. 每个节点必须有唯一 `dance_id`
2. 输出产物必须是 Markdown（不是 JSON）
3. Dance 必须显式记录 Bee 来源：`search` 或 `generate`
4. Dance 必须显式记录 Honey 契约来源

## 交互卡片

```text
[Skill: Dance Generation]
请选择编排策略：
1) 串行优先（稳定）
2) 并行优先（速度）
3) 混合策略（推荐）
0) 其他（自定义）
```

```text
[Skill: Dance Generation]
请选择 Bee 获取策略：
1) 先搜后生（推荐）
2) 只搜索（严格复用）
3) 直接生成（快速试验）
0) 其他（自定义）
```

## 输入

- `node_id`
- `node_name`
- `node_level`
- `acceptance_criteria`
- `bee_strategy`

## 输出产物（Markdown）

- `artifacts/dances/<dance_id>.md`

### Dance 文件模板

```markdown
# Dance: <dance_id>

## Node Mapping
- node_id: <node_id>
- node_name: <node_name>
- level: <L1/L2/L3>

## Execution Policy
- orchestration_mode: serial|parallel|hybrid
- timeout_sec:
- retry:
- on_failure: stop|retry|degrade|rollback

## Bee Plan
1. search_bee:
   - query:
   - result: found|not_found
2. if_not_found_generate_bee:
   - skill: skill-bee-generation
   - output_files:
     - bees/<BeeName>.js
     - bees/<BeeName>.test.js

## Honey Plan
- skill: skill-honey-generation
- output_file: artifacts/honey/<honey_name>.md

## Deliverables
- result_honey:
- report_required: true

## Acceptance Mapping
- [ ] <criterion 1>
- [ ] <criterion 2>
```

## 递归规则

如果当前节点有子节点：

1. 当前 Dance 作为父 Dance
2. 子节点必须生成子 Dance
3. 父 Dance 中记录对子 Dance 的依赖关系

示例：

```markdown
## Child Dances
- D-T1 (depends_on: D-S1)
- D-T2 (depends_on: D-S1)
```
