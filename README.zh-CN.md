# Swarm Paradigm（蜂群范式）

[English](./README.md) | 简体中文

将模糊的人类目标，转化为可执行、可测试、可审计、可交付的 AI驱动的软件生产流水线（Self-evolving Workflow System）。

## 项目定位

Swarm Paradigm 不是“让 AI 聊天更聪明”，而是“让 AI 像工程系统一样持续交付”。

它通过 Bee / Honey / Dance / Hive 的分层抽象，把复杂业务流程拆成可管理的最小单元，并在人类审核下完成端到端执行，原则上用户不需要看到任何代码，就能得到需要的软件产品。

本项目基于opencode开源项目构建底座。

## 为什么叫“蜜蜂 / 蜂群”

这个命名不是营销包装，而是系统设计隐喻：

- **Bee（蜜蜂）**：单只蜜蜂专注完成一个微小动作，对应系统中的原子能力单元，逻辑先跑通然后再进化
- **Honey（蜂蜜）**：蜜蜂产出的标准化产物，对应可传递、可复用的数据契约
- **Dance（蜂舞）**：蜜蜂通过舞蹈传递方向和任务信号，对应流程编排与协作协议
- **Hive（蜂房）**：蜂群的组织与治理中心，对应执行环境与任务治理
- **Swarm（蜂群）**：整体协同而非单体智能，对应多 Agent 分工协作系统
- **Beekeeping（养蜂）**：养蜂人不生产蜜蜂不采蜜，只做观察与引导，对应“人类只审核与纠偏，不直接写 Bee/Honey/Dance”

这套命名强调一个核心理念：**复杂目标不是由“一个超级 Agent”完成，而是由可组合、可治理、可审计的协同群体完成。**

## 设计原则（硬约束）

以下是项目核心边界，属于 MUST 级约束：

1. **Bee、Honey、Dance 必须由 AI 生成**  
人类不直接写这三类代码/定义，人类只负责审核、验收与纠偏（Beekeeping）。每个 Bee、Honey、Dance 都由 AI 生成，并且通过多种方式的测试后投入使用，生成之后还需要不断进化。  
唯一例外是 MVP 1（架构验证阶段）允许手工编写 Bee、Honey、Dance、Hive，但仅用于验证架构可行性，不进入 BeeHub，也不作为后续 Skill 的训练样板。

2. **必须先创建 Skill，再调用 Skill 生成产物**  
先固化“怎么做”（Skill），再执行“做什么”（Bee/Honey/Dance），以降低生成质量波动。

3. **所有执行必须可追踪、可复盘、可审计**  
每个阶段都要有可解释中间产物和执行记录。审计记录可按需开启，默认保留精简摘要，详细日志用于调试与复盘。

## Skill-First 生产机制

Swarm 的标准生产路径是：

`目标拆解 -> Skill 设计/选择 -> 调用 Skill -> 生成 Bee/Honey/Dance -> Hive 执行 -> Beekeeping`

为什么必须 Skill-First：

- 将隐式经验显式化，减少“每次都从零生成”的随机性
- 通过技能版本化与回归测试，控制质量漂移
- 降低模型波动导致的输出不一致风险
- 让团队可复用“生产方法”，而不只是复用“结果文件”

## 关键技能清单

- 蜜蜂生成
- 蜂蜜生成
- 舞蹈生成
- 目标拆解
- 蜂群可视化
- 记忆宫殿
- 项目管理
- 软件开发
- 代码审核
- 单体测试
- 整体测试
- UI 设计

## 核心概念

### 1. Bee（原子执行单元）

Bee 是 AI 生成的 JS 类，只做一个原子功能。它的核心特点包括：

- 支持等待和挂起（可异步长流程运行）
- **不支持嵌套**（Bee 必须保持原子职责）
- 工作完成或发生异常时都必须输出报告
- **不跨任务持久化任何内部状态**，但可以在单次任务执行期间持有必要的临时运行时状态（例如等待多个 Honey 聚合），任务结束后所有临时状态自动释放。数据完全由外部注入，结果通过 Honey 输出
- 与外部能力解耦，接口化依赖注入
- 必须附带测试类，目标是覆盖全部测试用例（100%）
- 独立版本管理，可指定版本运行
- 每个 Bee 都有一个 execute 方法必须返回 Promise，resolve 传出 { resultHoney, reportHoney }，reject 传出 { errorHoney, reportHoney }。Hive 根据 Promise 的 resolve/reject 状态驱动 Dance 的 onSuccess/onFail 跳转。

一句话：**Bee 是可独立验证、可替换、可演进的最小生产单元。**

### 2. Honey（标准数据契约）

Honey 是 AI 生成的 JSON 数据包，是 Bee 间协作的数据载体：

- 类型必须明确
- 支持嵌套
- 不允许“无类型约束”的 `Object`
- 允许“有明确 schema 的对象结构”
- 用于跨步骤传递业务上下文与结果

### 3. Dance（流程编排定义）

Dance 是 AI 生成的 JSON 流程定义，用来描述“谁在何时做什么”：

- 定义执行顺序、并行与异步策略
- 支持 Dance 的嵌套组合
- 定义超时、重试、异常与回滚策略
- 定义日志记录、提交规则与交付出口
- 每一步都应具备可供人类理解的描述
- 独立版本管理，可指定版本运行

Dance 规定的是 **Bee 类型的拓扑顺序**，而不指定具体实例。

### 4. Hive（执行与治理环境）

- Bee 注册与调度
- Dance 执行引擎
- 维护活跃 Bee 实例表，依据 Dance 定义和 Honey 目标标识进行路由，支持本地执行与远程通信
- 任务审查与交付汇总
- 负责将产生的 Honey 路由到正确的 Bee 实例，支持 **将多次 Honey 顺序投递给同一个活跃的 Bee 实例**，从而实现长流程、多轮交互的异步协同。

### 5. Swarm（上层协调系统）

运行在 Bun 中的协调层，负责：

- 需求拆解
- Skill 选择与编排
- 模型与工具调度
- webUI
- 部署时将所有的Honey和Dance转换成js代码，和用到的Bee一起打包压缩成一个单独的js文件，做到运行性能零损失

### 6. BeeHub（能力市场）

- 共享可复用 Bee
- 检索现成能力
- 降低重复构建成本
- 通过 Hive 自动评分进行优胜劣汰（评分综合执行表现、用户反馈等信息，用户无需直接对单个 Bee 打分）

## 运行时架构（前后端原生 JS）

为保持范式一致性，运行时架构明确为：

1. 前端和后端都使用原生 JavaScript 编写；前端同样运行一个微型 Hive，可直接执行本地 Bee（如表单联动、动画驱动等），无需所有逻辑都回服务器。
2. 前端 Hive 与后端 Hive 仅在需要共享能力时通过 WebSocket 交换 Honey，传输载体统一为 Honey。
3. 将系统原生能力（如：加密、WebRTC、媒体、文件能力）封装为带有可选沙箱约束的 **System Bee**（高风险场景推荐启用沙箱，用户自行评估风险）。
4. 所有能力都通过统一 Bee 接口调用。

这样做的意义：

- 保持执行模型一致（所有能力都纳入 Bee 工作流）
- 避免过度依赖成熟框架导致范式偏移
- 让系统能力和业务能力一样可测试、可审计、可复盘

**注**：Bee 接口规范本身是语言无关的，目前以 JavaScript 为第一阶段参考实现，未来可扩展至 Python、Rust 等语言，不同语言实现的 Bee 可通过标准 Honey 协议互通。

## 自我进化

在沙箱、评分、审核和版本控制下不断改进 Skill / Bee / Dance。

---

### ✅ 1. 评估层

对每个Bee、Dance、Skill都有一个分值：

每次执行后都需要确认：

* 是否正确执行
* 是否达到目标
* 是否高效
* 是否可复用

根据评分，进行进化。最终进化方向以人类主观判断为最终标准，自动化评分作为重要参考，人类审核（Beekeeping）决定是否采纳新版本。

---

### ✅ 2. 选择机制

* BeeHub 只保留 Top N Bee
* 低评分 Bee 自动淘汰
* Skill 有版本评分

👉 这才叫“蜂群进化”

---

### ✅ 3. System Bee 的沙箱

* 权限分级（read / write / network）可选启用
* 执行额度限制
* 审批机制（高风险 Bee）

---

## 解决LLM 很难生成“真正有效”的测试的问题

关键原则是：

> **不让同一个 LLM 同时当开发者和考官。**
支持双模型隔离配置，Builder 与 Tester 分模型执行。
否则它很容易写出“代码错、测试也错、全都通过”的自洽闭环。

---

### 1. 先写 Honey Schema，再生成 Bee

不是先生成 Bee，再让 AI 补测试。

顺序应该是：

```text
目标 → Honey Schema → 行为契约 → 测试用例 → Bee 实现
```

> **测试先于实现生成。**

这样 Bee 必须满足外部契约，而不是测试去迁就 Bee。

---

### 2. 引入“独立测试生成 Agent”

至少分三个角色：

```text
Builder Agent：生成 Bee
Tester Agent：只看需求和 Schema，生成测试
Reviewer Agent：审查 Bee 和测试是否互相放水
```

重点是：

* Tester 不看 Bee 源码，避免被实现污染
* Builder 不改测试
* Reviewer 专门找“假测试”

这比单 Agent 自测可靠很多。

---

### 3. 用性质测试，而不是只写例子测试

普通测试：

```js
输入 A，期望输出 B
```

很容易覆盖不足。

更好的方式是定义性质：

```text
无论输入如何：
- 输出必须符合 Honey Schema
- 金额不能为负
- 总数守恒
- 排序后长度不变
- 同输入多次执行结果一致
```

这类测试叫 property-based testing。

在 JS 里可以用：

```text
fast-check
```

例如 Bee 是“抽卡”，性质测试可以是：

```text
抽卡后：
- 手牌数量增加 count
- 牌库数量减少 count
- 总牌数守恒
- count 超过牌库数量时必须走错误分支
```

这比 AI 写几个 happy path 测试强很多。

---

### 4. 加 Metamorphic Testing（变形测试）

当不知道精确答案时，很有用。

例子：

```text
同一个 Dance 执行两次，如果输入完全相同，输出应一致。
把无关字段加入 Honey，结果不应变化。
交换两个无依赖步骤，最终结果应相同。
```

它测试的不是“答案是什么”，而是“关系是否成立”。

这特别适合 AI workflow。

---

### 5. 使用黄金样本 + 回归测试库

每次人类审核通过的案例，都沉淀成：

```text
Golden Honey
Golden Dance
Expected Report
```

之后所有新 Bee / Skill 都必须跑这些历史样本。

这会让系统越用越稳。

---

### 6. 让测试也有评分，不只是 pass/fail

测试本身也要被审查。

可以给 TestSuite 打分：

```text
TestScore =
  schema覆盖率
+ 边界条件覆盖率
+ 异常路径覆盖率
+ 性质测试数量
+ 变形测试数量
- 与实现强耦合程度
```

也就是说：

> **测试也是一种产物，也要被 Beekeeping。**

---

### 7. 加“故意破坏 Bee”的 Mutation Testing

这是最强的一招。

流程：

```text
1. 生成 Bee
2. 自动制造错误版本，例如：
   - > 改成 >=
   - + 改成 -
   - 删除异常判断
   - 反转条件
3. 跑测试
4. 如果测试没抓住错误，说明测试太弱
```

如果一个测试套件连故意植入的 bug 都抓不住，它就不可信。

JS 生态里可以参考：

```text
StrykerJS
```

---

### 8. 引入 Oracle Bee / Reference Bee

对于关键能力，不要只有一个 Bee。

可以有：

```text
Candidate Bee：新生成版本
Reference Bee：稳定旧版本 / 简单但慢的版本
```

同样输入跑两边，对比输出。

这叫 differential testing。

特别适合：

* 数据转换
* 排序
* 规则计算
* 游戏状态变化
* JSON 处理

---

### 9. 对 System Bee 做“仿真测试”

System Bee 不应该直接测真实系统命令。

应该有：

```text
FakeFileSystem
FakeNetwork
FakeClock
FakeRandom
FakeBrowser
```

这样可以测试：

* 是否调用了正确权限
* 是否产生预期副作用
* 是否可回滚
* 是否越权

---

### 10. 给 Swarm 加一个 Test Skill，而不是让普通 LLM 写测试

你应该把“测试生成”本身固化成 Skill：

```text
skill-generate-test-suite
```

它输入：

```text
Goal
Honey Schema
Bee Contract
Risk Level
Expected Invariants
```

输出：

```text
Unit Tests
Property Tests
Mutation Plan
Golden Cases
Audit Checklist
```

---


## 使用 **记忆宫殿 + 知识图谱** 用来影响决策路径。

### 🧠 记忆宫殿（Memory Palace）

> **时间维度的经验筛选器（temporal filter）**

它解决：

* 过去做过什么？
* 哪些是成功的？
* 哪些是失败的？
* 当前任务“应该借鉴哪些历史片段？”

---

### 🕸️ 知识图谱（Knowledge Graph）

本质：

> **结构化关系网络（structural reasoning）**

它解决的是：

* Bee 和 Skill 之间的依赖关系
* Honey schema 之间的兼容性
* 哪些组件可以复用
* 哪些路径是常见组合

---

### 接入位置


#### 1️⃣ 在 Skill 选择阶段（最重要）

* 记忆宫殿找历史类似任务
* 提供：

  * 用过哪些 Skill
  * 哪些成功 / 失败
  * 常见坑

例如：

```text
当前目标：做一个卡牌战斗系统

Memory 返回：
- 曾经用过 skill-game-logic-v2（成功）
- skill-battle-engine-v1 出现过状态错乱问题
```

* 知识图谱找 Skill 依赖关系
* 找推荐组合

例如：

```text
graph query:
skill: battle-system

返回：
- 必须搭配：state-manager
- 推荐搭配：event-logger
- 不兼容：legacy-action-handler
```

> **避免 AI 每次重新“瞎设计” Skill 组合**

---

#### 2️⃣ 在 Bee 生成阶段

* 记忆宫殿提供类似 Bee 的历史实现
* 提供 bug 案例

例如：

```text
类似 Bee：ModifyAttack

历史问题：
- 忘记处理负数
- rollback 不完整
```

* 知识图谱提供依赖 Bee
* 提供 schema 兼容关系

例如：

```text
Bee: ModifyAttack

依赖：
- PlayerStateBee
- StatValidationBee
```

> **减少重复犯错 + 提升复用率**

---

#### 3️⃣ 在 Dance 编排阶段

* 记忆宫殿找类似流程
* 提供执行路径经验

例如：

```text
类似流程：
- 先 validate → 再 execute → 再 commit
- 不要先写 DB 再算逻辑（历史 bug）
```

* 知识图谱做 DAG 校验
* 检查依赖顺序

例如：

```text
Bee B 必须在 Bee A 之后执行
Honey X 与 Honey Y 不兼容
```

> **防止 workflow 结构错误**

---

### 记忆宫殿的关键设计

#### ✅ 1. 不存“对话”，只存“任务片段”

错误做法：

```text
存整段聊天
```

正确做法：

```json
{
  "goal": "...",
  "skill_used": [...],
  "bee_used": [...],
  "result": "success | fail",
  "failure_reason": "...",
  "metrics": {
    "time": 1200,
    "retry": 2
  }
}
```

👉 宫殿是“经验数据库”，不是聊天记录。

---

#### ✅ 2. 必须有“失败记忆”（比成功更重要）

很多系统只存成功案例，这是错的。

必须存：

```text
失败类型：
- schema mismatch
- timeout
- infinite loop
- bad test
- wrong decomposition
```

👉 失败 = 最有价值的指导

---

#### ✅ 3. 用“相关性评分”，而不是关键词匹配

不要简单：

```text
embedding 相似度
```

要加：

```text
Score =
  语义相似度
+ Skill overlap
+ Bee overlap
+ 同类错误
+ 最近性
```

初期决策前检索主要基于 goal 的语义匹配（轻量嵌入），执行过程中再注入详细的历史片段，避免检索噪音。

---

#### ✅ 4. 控制返回数量（极重要）

记忆宫殿最大坑：

👉 返回太多 = 噪音

建议3-5条，永远不要超过 7。

---

### 知识图谱关键设计

#### ✅ 1. 需要这几类节点

```text
Skill
Bee
Honey Schema
Dance
Error Type
Test Case
```

---

#### ✅ 2. 建立关键关系

```text
Skill -> uses -> Bee
Bee -> produces -> Honey
Bee -> depends_on -> Bee
Dance -> contains -> Bee
Bee -> failed_with -> Error
Skill -> improved_from -> Skill
```

---

#### ✅ 3. 图谱最重要的用途

不是“展示”，而是：

👉 **约束生成**

例如：

```text
生成 Bee 时：
必须满足 graph 中 schema compatibility

生成 Dance 时：
必须满足 DAG 无环
```

---

### 两者结合

可以产生1+1>2的效果

记忆宫殿提供候选
知识图谱过滤 + 约束

---

例子：

```text
记忆宫殿：推荐 Bee A, B, C

知识图谱：发现 B 与当前系统冲突，A 的版本更古老

最终：选 C
```

## 典型工作流

1. 用户输入业务目标（自然语言）
2. 系统进行目标拆解与澄清
3. AI 创建/选择 Skill
4. 调用 Skill 生成 Bee / Honey / Dance
5. Hive 执行流程并产出中间结果
6. 人类进行 Beekeeping（审核与纠偏）
7. 输出最终交付，并沉淀图谱与记忆宫殿

## 适用群体与边界

本项目追求的是“让低软件基础用户也能落地应用”，而不是极致执行性能。

更适合：

- 原型展示
- 概念打磨与产品方向探索
- 个人应用开发
- 独立游戏开发

明确不做（边界）：

- 极致高性能计算
- 生产级强实时控制系统（局域网演示级实时可接受）
- 金融核心清算/结算系统
- 底层驱动与内核级基础设施
- 需要极高合规与可用性保障的企业级系统

---

## MVP 分阶段落地策略（Skill-First）

为避免过早陷入底层复杂性，Swarm 采用 **Skill-First** 的 MVP 路径。

核心原则：

> **先验证 Swarm 能否生成“做事的方法”，再验证 Swarm 能否生成“可运行的系统”。**

---

### 🧪 MVP 0：任务拆解 Skill（范式起点）

目标：做出能够拆解“文字聊天室项目”的 Skill，并得到拆解后的 Dance。

输入示例：

```text
我要做一个点对点文字聊天室
```

输出：

```text
Project Breakdown Dance
```

验证点：

* Skill 是否能稳定拆解目标
* 是否能识别 Bee / Honey / Dance / Hive 需求
* Dance 是否足够细、可读、可审计
* Dance 是否能作为后续开发蓝图
* 一个 Dance 只对应一条业务规则 / 一个用户动作
* 所有 Dance 合起来覆盖 100% 业务场景
* 无遗漏、无循环、无歧义

---

### 🧱 MVP 1：手动实现文字聊天室（架构验证）

目标：根据 MVP 0 生成的 Dance，**手动编写 Bee、Honey、Dance、Hive**，验证基础架构能跑通。

> **注意**：此阶段手工编写的 Bee、Honey、Dance 仅用于原型验证，不进入 BeeHub，不作为后续 Skill 的训练样板。它们只证明架构的可行性，不参与生产级进化循环。

典型 Bee：

```text
CreateRoomBee
JoinRoomBee
ValidateMessageBee
SendMessageBee
BroadcastMessageBee
LogMessageBee
```

典型 Honey：

```text
UserHoney
RoomHoney
MessageHoney
ChatEventHoney
ExecutionReportHoney
```

典型 Dance：

```text
CreateRoomDance
JoinRoomDance
SendMessageDance
BroadcastMessageDance
ChatAuditDance
```

Hive 需要验证：

* Bee 注册与调度
* Honey Schema 校验
* Dance 执行引擎
* WebSocket 通信
* 执行日志与审计记录
* 对同一活跃 Bee 实例的多次 Honey 路由（如等待房间所有玩家就绪）

验证点：

* Bee 接口是否合理
* Honey 数据契约是否稳定
* Dance 是否能驱动完整流程
* Hive 是否能调度、记录、回放
* WebSocket 是否能作为 Honey 传输通道
* 前端本地 Hive 与后端 Hive 的协作（消息类 Bee 本地执行，广播等需后端转发）

> **这一阶段先证明架构本身能跑，再证明 AI 能生成架构组件。**

---

### 🧬 MVP 2：生成 Bee / Honey / Dance 的 Skill（生产能力验证）

目标：用 MVP 1 手写出来的 Bee、Honey、Dance 作为 one-shot 示例（但不进入正式仓库），做出生成 Bee / Honey / Dance 的 Skill。

建议拆成三个 Skill：

```text
skill-generate-honey-schema
skill-generate-bee
skill-generate-dance
```

输入：

```text
Goal
Project Breakdown Dance
Existing Bee / Honey / Dance Samples (仅供 AI 参考，不固化)
Coding Standard
Testing Standard
```

输出：

```text
Generated Honey Schema
Generated Bee Class
Generated Dance Definition
Generated Test Suite
```

验证点：

* Skill 是否能从参考样例中学习模式
* 是否能稳定生成符合接口规范的 Bee
* 是否能生成强类型 Honey Schema
* 是否能生成可执行 Dance
* 是否能附带测试与审计说明

---

### 🎧 MVP 3：自动生成 1v1 语音聊天室（System Bee 验证）

目标：使用 MVP 2 的生成 Skill，自动生成 1v1 点对点语音聊天室。

新增典型 Bee：

```text
GetUserMediaBee
CreatePeerConnectionBee
CreateOfferBee
CreateAnswerBee
ExchangeIceCandidateBee
AttachAudioStreamBee
```

新增典型 Honey：

```text
MediaDeviceHoney
PeerConnectionHoney
OfferHoney
AnswerHoney
IceCandidateHoney
AudioStreamHoney
```

新增典型 Dance：

```text
RequestAudioPermissionDance
CreatePeerConnectionDance
SignalingDance
AttachRemoteAudioDance
EndCallDance
```

验证点：

* Skill 是否能从文字聊天室迁移到语音聊天室
* System Bee 是否有可选沙箱和权限约束
* 异步等待是否可靠（如 ICE 候选聚合）
* Dance 是否能表达 WebRTC 信令流程
* Hive 是否能记录关键执行事件

---

### 🐝 MVP 4：多人语音聊天室（复杂协作验证）

目标：跑通多人聊天室，展示 Swarm 在复杂协作场景下的能力。

新增典型 Bee：

```text
CreateVoiceRoomBee
JoinVoiceRoomBee
PeerConnectionManagerBee
MuteBee
LeaveRoomBee
ReconnectBee
RoomStateSyncBee
```

新增典型 Honey：

```text
VoiceRoomHoney
ParticipantHoney
PeerMeshHoney
MuteStateHoney
ConnectionStateHoney
RoomEventHoney
```

新增典型 Dance：

```text
CreateVoiceRoomDance
JoinVoiceRoomDance
PeerMeshSetupDance
MuteParticipantDance
LeaveRoomDance
ReconnectDance
RoomStateSyncDance
```

验证点：

* 多 Bee 协作是否稳定（包括单实例等待多方输入）
* 多 Honey 状态同步是否清晰
* Dance 是否支持嵌套与复杂流程
* Hive 是否能处理多任务调度
* 失败恢复与重连是否可审计

---

### 📌 分阶段策略总结

```text
MVP 0：验证“Swarm 能否拆解目标”
MVP 1：验证“Swarm 架构能否手动跑通”（手写产物隔离）
MVP 2：验证“Swarm 能否生成 Bee / Honey / Dance”
MVP 3：验证“Swarm 能否控制真实系统能力”
MVP 4：验证“Swarm 能否处理复杂协作系统”
```

## 开源依赖

- opencode：https://github.com/anomalyco/opencode
- MemPalace：https://github.com/MemPalace/mempalace
- graphify：https://github.com/safishamsi/graphify
- gbrain（参考）：https://github.com/garrytan/gbrain
- gstack（参考）：https://github.com/garrytan/gstack
- 安装说明：[Docs/INSTALLATION.md](./Docs/INSTALLATION.md)


## License

MIT
