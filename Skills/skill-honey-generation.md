# skill-honey-generation

version: 0.2.0
owner: swarm
type: data-contract

## 目标

生成对普通用户友好的 Honey 契约文档（Markdown），同时保持强类型与可验证性。

## 强约束

1. Honey 契约必须由 AI 生成
2. 产物默认为 Markdown 文件
3. 字段类型必须明确
4. 不允许 `Object` 兜底类型

## 交互卡片

```text
[Skill: Honey Generation]
请选择契约严格度：
1) 标准（推荐）
2) 严格（高风险任务）
3) 轻量（快速验证）
0) 其他（自定义）
```

## 输入

- `honey_name`
- `producer_bee`
- `consumer_bee`
- `fields`
- `compatibility_mode`

## 输出产物（Markdown）

- `artifacts/honey/<honey_name>.md`

### Honey 文件模板

```markdown
# Honey Contract: <honey_name>

## Ownership
- producer: <bee_name>
- consumer: <bee_name>
- version: <x.y.z>

## Field Schema
| Field | Type | Required | Description |
|---|---|---|---|
| user_id | string | yes | 用户标识 |
| score | number | yes | 评分 |

## Validation Rules
- score >= 0
- score <= 100

## Compatibility
- mode: backward|breaking|dual-track
- migration_notes:

## Example Payload
```json
{
  "user_id": "u-001",
  "score": 95
}
```
```

备注：可以附 JSON 示例，但 Honey 的主交付是 Markdown 契约文档。
