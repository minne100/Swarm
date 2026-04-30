# Swarm Skill System v0.3

## 核心升级

本版本引入四条硬规则：

1. 递归拆解（Recursive Planning）
2. 每节点强制绑定 Dance
3. 技能产物默认 Markdown（用户可读）
4. 双层规范：Skill Spec（平台无关）+ Runner Adapter（平台相关）

## 参考来源

- gstack 的 plan-ceo-review / plan-eng-review（双审查思路）
- gbrain / gstack 的技能化工作流顺序控制

## 标准流程

`goal-decomposition (CEO+ENG review) -> dance-generation per node -> search/generate Bee -> honey-generation -> execution -> learning-loop`

## 双层规范（新增）

### A) Skill Spec（平台无关，给 Swarm）

Skill 只描述意图和约束，不绑定具体工具：

- Contract（保证什么）
- Phases（步骤）
- Output Format（工件输出）
- Quality Gates（质量门禁）
- Anti-Patterns（禁止模式）

### B) Runner Adapter（平台相关）

Runner 负责把 Skill 意图映射到具体可执行能力：

- Codex Runner（当前优先）
- Swarm Native Runner（未来自举）

当前策略：**先兼容 Codex，结构上为 Swarm Native 预留**。

## Codex 优先兼容策略

每个目录式 Skill 的 frontmatter 需新增以下字段：

- `runtime_targets`: 例如 `["codex", "swarm-native"]`
- `required_tools`: 例如 `["read", "write", "grep", "shell"]`
- `fallback_if_unavailable`: 工具不可用时的退化路径

这样可以保证：

1. 今天在 Codex 可稳定执行
2. 明天迁移到 Swarm Native 不需要重写技能逻辑

## 产物格式规范

- 计划树：`artifacts/plans/.../*.md`
- Dance：`artifacts/dances/*.md`
- Honey 契约：`artifacts/honey/*.md`
- 路由决策：`artifacts/runtime/*.md`
- Bee 实体：代码文件（`.js` + `.test.js`）

## 为什么用 Markdown 作为技能主产物

1. 普通用户可直接阅读与审核
2. 便于产品/工程/测试协同评审
3. 审计和版本比较更直观

## 递归执行协议

1. 先输出当前层计划树并等待用户确认
2. 用户确认后再展开下一层
3. 所有节点都必须在 `DANCE_INDEX.md` 中可追踪
4. 未绑定 Dance 的节点视为“不可执行”

## 学习与进化

`skill-learning-loop` 只产出补丁建议（Markdown），不允许自动生效。
