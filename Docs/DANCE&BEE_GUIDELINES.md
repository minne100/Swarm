# **Bee 接口与 Dance 定义规范**

---

## Bee 接口规范

Bee 是 AI 生成的 JavaScript 类，代表一个原子执行单元。

| 方法 | 是否必须 | 说明 |
|------|----------|------|
| `execute(honey)` | 必须 | 接收输入 Honey（可为空）。**必须返回 Promise**。resolve 时传递 `{ resultHoney, reportHoney }`，reject 时传递 `{ errorHoney, reportHoney }`。所有处理强制异步。 |
| `update(deltaTimeMs)` | 可选 | 时间驱动更新，仅需逐帧处理的 Bee 实现。`deltaTimeMs` 为距上次调用的毫秒数。 |
| `destroy()` | 必须 | 释放所有临时资源，销毁自身。由 Hive 在 Dance 结束时调用。 |

**生命周期与状态：**
- Bee 由 Hive 在 Dance 启动时创建，Dance 结束时统一销毁。  
- `execute` 可以被多次调用（由 Dance 步骤驱动）。  
- Bee 在单次任务期间可以持有私有属性变量，任务结束后必须释放。  

> **设计意图**：Bee 的返回值完全 Promise 化，AI 生成时只需理解“`execute` 返回 Promise，结果包在 `resultHoney` 里，出错走 `errorHoney`”。Hive 根据 Promise 状态执行 `onSuccess` / `onFail` 跳转。

---

## Dance 字段定义

Dance 是 AI 生成的 JSON 文件，描述一次完整业务流程的拓扑。

### Dance 顶层字段

| 字段路径 | 类型 | 必须 | 说明 |
|----------|------|------|------|
| `name` | string | 是 | Dance 全局唯一名称，如 `"ChatRoomMain"` |
| `version` | string | 是 | 语义化版本，如 `"1.0.0"` |
| `description` | string | 是 | 人类可读流程说明 |
| `timeout` | number | 否 | 单次执行（包含所有步骤）的超时毫秒数。超时后 Hive 终止所有步骤，调用相关 Bee 的 `destroy` 并返回超时错误。省略表示无限。 |
| `input` | string | 否 | 初始输入 Honey 的类型名。当 Hive 收到匹配的 Honey 时启动 Dance，该 Honey 成为首个步骤的 `$input`。若不填则 Dance 无需外部数据即可启动（如定时触发的清理 Dance）。 |
| `output` | string | 否 | Dance 最终输出的 Honey 类型名。如果存在，则最后一个步骤的 `output` 必须与之匹配，供上层 Dance 校验。 |
| `steps` | [] | 是 | 步骤列表，至少包含一个步骤。 |
| `bees` | [] | 是 | 本 Dance 中用到的所有 Bee 声明，至少一个。 |
| `dances` | [] | 是 | 本 Dance 中嵌套的子 Dance 声明，可为空数组。 |
| `schedule` | {} | 否 | 定时触发配置，用于无外部输入时创建新 Dance 实例。 |
| `schedule.interval` | number | 与 `schedule.cron` 二选一 | 固定间隔毫秒数，到期后 Hive 创建一个新 Dance 实例并从 steps[0] 开始执行。 |
| `schedule.cron` | string | 与 `schedule.interval` 二选一 | cron 表达式，同样用于定期创建新实例。 |
| `retry` | {} | 否 | 重试策略。 |
| `retry.maxRetries` | number | 是（存在 `retry` 时） | 最大重试次数。 |
| `retry.step` | string | 否 | 从哪个步骤 ID 开始重试，默认为第一个步骤。 |

### `steps[]` 步骤结构

每个步骤是一个对象，字段如下：

| 字段路径 | 类型 | 必须 | 说明 |
|----------|------|------|------|
| `id` | string | 是 | 步骤唯一标识，供 `onSuccess`、`onFail`、`fork`、`retry.step` 引用。 |
| `alias` | string | 是 | 本步骤要调用的 Bee 或子 Dance 的别名，必须能在 `bees` 或 `dances` 列表中找到。 |
| `description` | string | 是 | 人类可读步骤说明。 |
| `input` | string | 否 | 本步骤输入 Honey 的类型名。若是第一步则此 Honey 来自 Dance 的初始 `input`；否则来自上一步的 `output`。空表示无输入或沿用上一步输出。 |
| `triggeredBy` | string | 否 | 若本步骤不是顺序调用，而是由外部 Honey 事件触发，则此字段指定触发它的 Honey 类型名。此时 `input` 即为该外部 Honey。 |
| `output` | string | 否 | 本步骤产出的 Honey 类型名，会传递给下一个步骤作为 `input`。 |
| `onSuccess` | string | 条件必须* | 当 Bee/子 Dance 的 Promise resolve 时跳转的步骤 ID。如果步骤没有 `fork`，则必须填写；如果有 `fork` 并为最后一步，则可省略。 |
| `onFail` | string | 条件必须* | 当 Bee/子 Dance 的 Promise reject 时跳转的步骤 ID。要求同 `onSuccess`。 |
| `fork` | string | 否 | 如果存在，Hive 启动当前 Bee/子 Dance 后**立即**跳转到此 ID 对应的步骤，不等待 Promise 完成。当 Promise 最终 resolve/reject 时，再根据 `onSuccess`/`onFail` 跳转（异步结果处理）。 |
| `update` | boolean | 否 | 是否对该步骤的 Bee 启用 `update` 调用。仅对实现了 `update` 方法的 Bee 有效，Hive 会在每帧调用。 |
| `timeout` | number | 否 | 步骤级超时毫秒数。若设置，将覆盖 Dance 全局 `timeout` 对本步骤的约束。超时后强制触发 `onFail`，并视情况终止整个 Dance。 |
| `log` | string | 否 | 日志策略：`"none"`（默认，忽略）、`"console"`（输出到控制台）、`"file"`（写入文件，目标由 Hive 配置）。 |

**跳转规则：**
1. **有 `fork`**：调用 Bee/子 Dance 后立即跳转到 `fork` 指向的步骤；主流程继续执行，不等待 Promise。当 Bee/子 Dance 的 Promise 完成时，Hive 根据 `onSuccess`/`onFail` 再次跳转（此时可能跳转到等待收集结果的步骤或结束）。  
2. **无 `fork`**：调用后必须等待 Promise 完成，然后根据 `onSuccess` 或 `onFail` 跳转。  
3. **最后一步**：无需填写 `onSuccess`/`onFail`/`fork`，Dance 直接结束，并将最终 `output` 返回给 Hive（如有）。

### `bees[]` 与 `dances[]` 声明

两种资源使用相同的字段结构：

| 字段路径 | 类型 | 必须 | 说明 |
|----------|------|------|------|
| `name` | string | 是 | Bee 或 Dance 的实际名称（对应文件或注册名）。 |
| `version` | string | 是 | 版本号，如 `"1.0.0"`。建议始终指定，以保证可追踪。 |
| `alias` | string | 是 | 在当前 Dance 中的别名。允许多个同类型 Bee 使用不同别名（如 `"validator"` 和 `"adminValidator"`）。 |

---

## 补充说明

1. **类型契约**：若 Dance 顶层声明了 `output`，则最后一个步骤的 `output` 必须与其一致。若步骤的 `input` 与上一步的 `output` 不一致，Hive 应记录警告并视情况拒绝执行。
2. **Bee 实例化**：Dance 启动时，Hive 根据 `bees` 列表创建所有 Bee 实例；子 Dance 则在被初次调用时由 Hive 创建实例。所有实例在 Dance 退出时统一 `destroy`。
3. **子 Dance 的输入/输出**：当步骤调用子 Dance 时，Hive 会将步骤的 `input` 所指向的 Honey 传递给子 Dance 的初始 `input`（如果子 Dance 要求输入）。子 Dance 的最终 `output` 会成为该步骤的 `output`，继续向下传递。
4. **定时与实例**：`schedule` 只负责**创建新 Dance 实例**，不影响当前实例。每次定时触发都会启动一个全新的执行，彼此独立。
5. **环境信息传递**：`taskId`、日志器等运行时上下文由 Hive 在调用 Bee 的 `execute` 时通过 Honey 传入（首次调用可夹带），无需特殊接口。

---
Dance示例

```json
{
  "name": "ChatRoomMain",
  "version": "1.0.0",
  "description": "一对一文字聊天主流程：验证用户，分配房间，进入消息循环直到退出",
  "input": "SessionStart",
  "output": "ChatEvent",
  "bees": [
    { "name": "ValidateUser", "version": "1.0.0", "alias": "validate-user" },
    { "name": "CheckRoom", "version": "1.0.0", "alias": "check-room" },
    { "name": "AssignRoom", "version": "1.0.0", "alias": "assign-room" },
    { "name": "NotifyPeer", "version": "1.0.0", "alias": "websocket" },
    { "name": "LogEvent", "version": "1.0.0", "alias": "log-event" },
    { "name": "CleanupUser", "version": "1.0.0", "alias": "cleanup-user" }
  ],
  "dances": [
    { "name": "SendMessage", "version": "1.0.0", "alias": "message-dance" }
  ],
  "steps": [
    {
      "id": "validate",
      "alias": "validate-user",
      "description": "校验用户身份合法性，检查用户名与会话有效性",
      "input": "User",
      "output": "User",
      "onSuccess": "check-room",
      "onFail": "fail-exit"
    },
    {
      "id": "check-room",
      "alias": "check-room",
      "description": "检查目标房间是否存在且有空位，若满则通知用户",
      "input": "User",
      "output": "Room",
      "onSuccess": "assign",
      "onFail": "room-unavailable"
    },
    {
      "id": "assign",
      "alias": "assign-room",
      "description": "将用户绑定到房间，更新房间成员列表",
      "output": "Room",
      "onSuccess": "notify-join",
      "onFail": "fail-exit"
    },
    {
      "id": "notify-join",
      "alias": "websocket",
      "description": "通知房间内已有用户：新用户已加入",
      "output": "ChatEvent",
      "onSuccess": "start-message-loop",
      "onFail": "log-and-exit"
    },
    {
      "id": "start-message-loop",
      "alias": "message-dance",
      "description": "启动消息收发子流程，处理一条新消息",
      "fork": "log-join",
      "onSuccess": "log-message",
      "onFail": "log-message"
    },
    {
      "id": "log-join",
      "alias": "log-event",
      "description": "记录用户加入房间的审计事件",
      "output": "Audit",
      "onSuccess": "wait-messages",
      "onFail": "done"
    },
    {
      "id": "wait-messages",
      "alias": "message-dance",
      "description": "等待下一条消息（被动触发），直到 USER_LEFT 事件跳出循环",
      "triggeredBy": "Message",
      "onSuccess": "log-message",
      "onFail": "log-message"
    },
    {
      "id": "log-message",
      "alias": "log-event",
      "description": "记录一条消息发送的审计事件，并检查是否为退出事件",
      "output": "Audit",
      "onSuccess": "wait-messages",
      "onFail": "done"
    },
    {
      "id": "done",
      "alias": "log-event",
      "description": "记录用户离开房间事件，终止流程",
      "output": "ChatEvent"
    },
    {
      "id": "fail-exit",
      "alias": "cleanup-user",
      "description": "异常退出：清理用户占用的资源并记录错误",
      "output": "Audit"
    },
    {
      "id": "room-unavailable",
      "alias": "websocket",
      "description": "房间不可用：通知用户房间已满或不存在",
      "output": "ChatEvent",
      "onSuccess": "done"
    },
    {
      "id": "log-and-exit",
      "alias": "log-event",
      "description": "通知失败或异常退出时记录审计日志",
      "output": "Audit",
      "onSuccess": "done"
    }
  ],
  "timeout": 60000,
  "retry": {
    "maxRetries": 0
  }
}
```

> **说明**：`start-message-loop` 步骤使用 `fork` 立即进入日志步骤，同时后台启动消息循环子 Dance。当子 Dance 完成（收到 `Message` 并处理）后会跳回 `log-message` 进行记录，然后继续等待下一条消息。这样既保持了实时性，又不会阻塞主流程。

---

此规范即日起生效，可据此实现 Hive 引擎及 AI 生成模板。
