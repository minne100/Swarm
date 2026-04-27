# skill-bee-generation

version: 0.1.1
owner: swarm
type: generation

## 目标

基于拆解结果生成 Bee（原子执行单元）**JS 代码**与**测试代码**。

## 交互卡片

```text
[Skill: Bee Generation]
请选择 Bee 类型：
1) 纯计算型（无外部 I/O）
2) 外部接口型（API/文件/数据库）
3) 协作型（依赖其他 Bee 输出）
0) 其他（自定义）
```

```text
[Skill: Bee Generation]
请选择可靠性策略：
1) 快速模式（最小保护）
2) 标准模式（推荐）
3) 高可靠模式（超时/重试/降级/回滚）
0) 其他（自定义）
```

## 强约束（必须满足）

1. Bee 只做一个原子职责
2. 支持等待和挂起
3. 成功/异常都输出报告
4. 不保存 Honey（仅外部注入）
5. 结果和报告通过 Dance 提交
6. 必须生成测试类，覆盖率目标 100%

## 输入契约

- `sub_goal`
- `input_schema`
- `output_schema`
- `reliability_mode`

## 输出契约（主输出是代码，不是 JSON）

### A) 必须输出（代码产物）

1. `BeeName.js`（主实现）
2. `BeeName.test.js`（测试实现）

示例：

```js
// BeeName.js
export class BeeName {
  async execute(input, ctx) {
    // ...
    return {
      output: {},
      report: {
        status: "success",
        summary: "...",
      },
    };
  }
}
```

```js
// BeeName.test.js
import { BeeName } from "./BeeName";

test("BeeName should return success report", async () => {
  const bee = new BeeName();
  const result = await bee.execute({}, {});
  expect(result.report.status).toBe("success");
});
```

### B) 可选输出（元数据清单）

仅用于追踪/审计，可附带 JSON manifest：

```json
{
  "bee_name": "BeeName",
  "bee_version": "0.1.1",
  "files": ["BeeName.js", "BeeName.test.js"],
  "quality_checks": [
    "single_responsibility",
    "no_honey_persistence",
    "report_on_success_and_failure",
    "test_generated"
  ]
}
```
