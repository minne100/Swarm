# Swarm 范式最佳实践

本文档通过几个典型场景展示如何在实际开发中使用 Swarm 范式（Bee / Honey / Dance / Hive / QueenBee）

## 1. 前端动态列表组件（Todo 列表）

### 需求
- 显示一个任务列表，列表项数量动态变化（从服务器获取或用户添加/删除）。
- 每个列表项可以点击标记完成，或删除。
- 所有交互可审计。

### 设计
- **Dance 定义**：`TodoListDance`（静态）作为主流程，负责监听数据变化。
- **子 Dance**：`TodoItemDance`（静态），每个列表项对应一个独立实例。
- **Bee**：`ItemRendererBee`（将数据渲染为 DOM），`EventToHoneyBee`（将点击转为 Honey），`ListItemUpdaterBee`（处理更新）。

### 关键点：使用 `multiplicity` 动态创建子实例

`TodoListDance` 的步骤片段：

{
  "id": "spawn-items",
  "alias": "todo-item-dance",
  "multiplicity": {
    "source": "$.items",
    "instanceIdTemplate": "todo-item-${item.id}",
    "inputTemplate": {
      "type": "ItemInitHoney",
      "payload": { "id": "${item.id}", "text": "${item.text}", "completed": "${item.completed}" }
    }
  },
  "onSuccess": "wait-events"
}

当接收到的 `ListDataHoney` 中包含 `items` 数组时，Hive 自动为每个元素创建一个 `TodoItemDance` 实例。

### 事件处理

列表项的点击（完成/删除）由 `TodoItemDance` 内的 `EventToHoneyBee` 转换为 `ItemActionHoney` 并发送给父 Dance。父 Dance 通过 `triggeredBy` 步骤捕获：

{
  "id": "wait-events",
  "triggeredBy": "ItemActionHoney",
  "onSuccess": "handle-action"
}

### 清理

当某个列表项被删除时，父 Dance 计算 diff，调用 QueenBee 终止对应的子实例：

{
  "id": "cleanup-item",
  "alias": "queen-bee",
  "input": {
    "action": "terminate",
    "instanceId": "${removedItem.instanceId}"
  }
}

子实例收到 `__Terminate__` 后，执行 `destroy` 方法移除 DOM，自然结束。

---

## 2. 后端 HTTP 服务（API 网关）

### 需求
- 监听端口 8080，提供 REST API。
- 每个请求独立处理，支持不同路由（如 `GET /users/:id`）。

### 设计
- **System Bee**：`HttpServerBee` 长期运行，`execute` 保持 pending，监听端口。
- **Dance**：为每个路由定义独立的 Dance（如 `GetUserDance`）。

### `HttpServerBee` 实现要点

class HttpServerBee {
  async execute(inputHoney) {
    const { port, host } = inputHoney.payload;
    this.server = createServer(async (req, res) => {
      const requestHoney = {
        type: "HttpRequestHoney",
        payload: { method: req.method, url: req.url, body: await readBody(req) }
      };
      const responseHoney = await this.hive.requestResponse(requestHoney);
      res.writeHead(responseHoney.payload.statusCode, responseHoney.payload.headers);
      res.end(responseHoney.payload.body);
    });
    this.server.listen(port, host);
    return new Promise(() => {}); // 永久 pending，直到收到 ShutdownHoney
  }
  destroy() { this.server?.close(); }
}

### 路由 Dance 示例（`GetUserDance`）

{
  "name": "GetUserDance",
  "input": "HttpRequestHoney",
  "output": "HttpResponseHoney",
  "steps": [
    { "id": "parse-id", "alias": "url-parser", "onSuccess": "fetch-user" },
    { "id": "fetch-user", "alias": "db-bee", "onSuccess": "build-response", "onFail": "build-404" },
    { "id": "build-response", "alias": "response-builder", "output": "HttpResponseHoney" },
    { "id": "build-404", "alias": "response-builder", "output": "HttpResponseHoney" }
  ]
}

Hive 根据请求 URL 自动路由到对应的 Dance（通过配置映射）。

---

## 3. 后端 WebSocket 服务（聊天室）

### 需求
- 每个客户端建立一个 WebSocket 长连接。
- 连接期间可以收发消息，连接关闭时释放资源。

### 设计
- **System Bee**：`WssServerBee` 监听端口，处理 upgrade 请求。
- **Dance**：`ChatConnectionDance` 为每个连接创建一个实例，生命周期等于连接时长。

### 关键点：`triggeredBy` 实现消息循环

`ChatConnectionDance` 的步骤：

{
  "steps": [
    { "id": "on-open", "alias": "log", "onSuccess": "wait-message" },
    {
      "id": "wait-message",
      "triggeredBy": "WsMessageHoney",
      "onSuccess": "route-message"
    },
    { "id": "route-message", "alias": "chat-router", "onSuccess": "wait-message" }
  ]
}

当 `WssServerBee` 收到客户端消息，构造 `WsMessageHoney` 并投递给对应的 `ChatConnectionDance` 实例，该实例的 `wait-message` 步骤被唤醒，处理消息后回到等待状态。

### 连接关闭

当 WebSocket 关闭时，`WssServerBee` 发送 `__Terminate__` 给该 Dance 实例，实例执行清理步骤后自然结束。

---

## 4. 表单提交与实时校验（前端）

### 需求
- 注册表单：用户名、邮箱、密码。
- 实时校验（输入时显示错误）。
- 提交时整体校验，成功后发送请求。

### 设计
- **Dance**：`FormDance` 管理整个表单。
- **Bee**：`InputRendererBee`（渲染输入框），`ValidatorBee`（校验规则），`SubmitterBee`（发送请求）。
- **事件**：每个输入框的 `input` 事件被 `UIEventHoney` 捕获，触发校验步骤。

### 事件处理流程

1. 用户输入 → DOM 事件 → `DOMEventAdapter` 生成 `UIEventHoney` → 投递给 Hive。
2. 当前 `FormDance` 实例的 `wait-input` 步骤（`triggeredBy: "UIEventHoney"`）被唤醒。
3. 调用 `ValidatorBee`，输出 `ValidationResultHoney`。
4. 若失败，调用 `ErrorDisplayBee` 更新 DOM 显示错误；若成功，更新内部状态。
5. 回到等待状态。

### 提交处理

点击提交按钮产生 `click` 事件，转换为 `SubmitHoney`，另一个 `triggeredBy` 步骤捕获后执行整体校验和提交逻辑。

---

## 5. Dance 测试实战（以 TodoListDance 为例）

### 编写测试场景文件 `TodoListDance.test.json`

{
  "scenarios": [
    {
      "description": "初始空列表，添加三个项目，应创建三个子实例",
      "inputSequence": [
        { "type": "ListDataHoney", "payload": { "items": [] }, "delayMs": 0 },
        { "type": "ListDataHoney", "payload": { "items": [{"id":1,"text":"A"}, {"id":2,"text":"B"}, {"id":3,"text":"C"}] }, "delayMs": 10 }
      ],
      "mockBeeResponses": {
        "diff": { "onSuccess": { "resultHoney": { "type": "DiffResultHoney", "payload": { "added": [1,2,3], "removed": [] } } } }
      },
      "expectedTrace": {
        "stepIds": ["compute-diff", "spawn-items", "wait-events"],
        "subDanceInstanceCreations": [
          { "danceName": "TodoItemDance", "instanceId": "todo-item-1" },
          { "danceName": "TodoItemDance", "instanceId": "todo-item-2" },
          { "danceName": "TodoItemDance", "instanceId": "todo-item-3" }
        ]
      }
    },
    {
      "description": "删除中间项目，应销毁对应子实例",
      "inputSequence": [
        { "type": "ListDataHoney", "payload": { "items": [{"id":1,"text":"A"}, {"id":3,"text":"C"}] }, "delayMs": 0 }
      ],
      "mockBeeResponses": {
        "diff": { "onSuccess": { "resultHoney": { "type": "DiffResultHoney", "payload": { "added": [], "removed": [2] } } } }
      },
      "expectedTrace": {
        "stepIds": ["compute-diff", "cleanup-removed", "wait-events"],
        "subDanceInstanceDestructions": [ { "instanceId": "todo-item-2" } ]
      }
    }
  ]
}

### 运行测试

Hive 进入测试模式，加载 Mock Bee，模拟时钟，执行输入序列，比对轨迹。若实际轨迹与期望不符，测试失败并给出差异报告。

---

## 6. QueenBee 使用示例

### 在 Dance 中动态创建子 Dance 实例（不使用 `multiplicity` 的替代方式）

{
  "steps": [
    {
      "id": "create-child",
      "alias": "queen-bee",
      "input": {
        "action": "create",
        "danceName": "TodoItemDance",
        "instanceId": "custom-id-123",
        "initHoney": { "type": "ItemInitHoney", "payload": { "id": 123, "text": "Buy milk" } }
      },
      "onSuccess": "next"
    }
  ]
}

### 查询所有活跃实例

{
  "id": "list-instances",
  "alias": "queen-bee",
  "input": { "action": "list" },
  "output": "InstanceListHoney"
}

---

## 总结

以上最佳实践展示了 Swarm 范式如何以统一的方式处理前端动态 UI、后端 HTTP/WebSocket 服务、事件驱动流程。核心要点：

- **Dance 定义静态，实例动态**：通过 `multiplicity` 或 QueenBee 创建多个实例。
- **事件统一为 Honey**：无论 DOM 事件、WebSocket 消息、HTTP 请求，都用 Honey 表示。
- **长流程使用 `triggeredBy`**：实现等待外部事件的循环。
- **测试贯穿始终**：每个 Dance 必须附带测试场景，使用 Mock Bee 和轨迹断言。
- **QueenBee 管理生命周期**：负责创建、终止、查询 Dance 实例，避免资源泄漏。

遵循这些实践，你可以构建既灵活又可靠的 AI 驱动工作流系统。