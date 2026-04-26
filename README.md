# Swarm Paradigm

English | [简体中文](./README.zh-CN.md)

Turn ambiguous human goals into executable, testable, auditable, and deliverable AI workflows.

## Positioning

Swarm Paradigm is not about making AI chat better. It is about making AI deliver like an engineering system.

Through a layered model of Bee / Honey / Dance / Hive, Swarm decomposes complex business workflows into manageable atomic units and executes them under human review.

## Why the Bee/Swarm Naming

This is not branding decoration. It is a system metaphor:

- **Bee**: one bee does one small action, mapped to one atomic capability unit
- **Honey**: standardized output produced by bees, mapped to reusable data contracts
- **Dance**: bees communicate direction and task signals by dancing, mapped to orchestration protocols
- **Hive**: organization and governance center of the colony, mapped to runtime and control plane
- **Swarm**: collective intelligence over a single giant agent, mapped to multi-agent collaboration
- **Beekeeping**: beekeepers do not fly for bees; they observe and correct, mapped to “humans review and steer, not hand-write Bee/Honey/Dance”

Core message: **complex outcomes come from a governed, composable, auditable collective, not one super agent.**

## Design Principles (Hard Constraints)

1. **Bee, Honey, and Dance MUST be AI-generated.**  
Humans do not directly write these artifacts. Humans review, accept, and correct (Beekeeping).

2. **Execution MUST be traceable, replayable, and auditable.**  
Every stage should produce explainable intermediate artifacts and logs.

3. **Complex workflows first; lightweight automation second.**  
Swarm is designed for complex business collaboration, not simple script replacement.

## Core Concepts

### 1. Bee (Atomic Execution Unit)

A Bee is an AI-generated JS class for exactly one atomic responsibility. Required characteristics:

- Supports waiting and suspension (long-running async workflows)
- Always outputs a report on success or failure
- Stores no Honey internally; all data is injected from outside
- Submits outputs and report together via Dance
- Fully decoupled via interface-based dependency injection
- Must include a test class; target is full test case coverage (100%)
- Independently versioned and runnable by version

In one sentence: **Bee is the smallest independently verifiable, replaceable, and evolvable production unit.**

### 2. Honey (Standard Data Contract)

Honey is AI-generated JSON payload used for Bee-to-Bee collaboration:

- Strongly typed
- Nestable
- `Object` type is not allowed
- Carries context and outputs across steps

### 3. Dance (Workflow Orchestration Definition)

Dance is an AI-generated JSON workflow definition describing who does what and when:

- Execution order, parallelism, and async strategies
- Timeout, retry, exception, and rollback strategies
- Logging, submission rules, and delivery exits
- Human-readable description per step

### 4. Hive (Execution and Governance Runtime)

- Bee registry and scheduler
- Dance execution engine
- Task review and delivery aggregation

### 5. Swarm (Top-level Coordination System)

Node.js coordination layer responsible for:

- Goal decomposition
- Workflow assembly
- Model and tool orchestration
- TUI first (Web extensible)

### 6. BeeHub (Capability Marketplace)

- Share reusable Bees
- Discover ready-made capabilities
- Reduce duplicate implementation cost

## Memory Palace

Memory Palace is a key capability for long-horizon context governance and token cost control.

What it does:

- Selects memory fragments strongly relevant to the current task
- Reduces irrelevant recall noise and improves recall precision
- Cuts redundant context and significantly lowers token usage
- Works with the knowledge graph to build durable organizational memory

Product meaning: **cheaper over time, more accurate over time, and increasingly aligned with your business context.**

## Typical Workflow

1. User provides a business goal in natural language
2. System decomposes and clarifies the goal
3. AI generates Bee / Honey / Dance
4. Hive executes and produces intermediate outputs
5. Humans perform Beekeeping (review and correction)
6. Final delivery is produced and graph + memory are persisted

## Key Features

- Modular: atomic capabilities, low coupling, high reuse
- Orchestratable: composable and iterative workflows
- Testable: mandatory Bee testing
- Auditable: source-backed outputs and replayable processes
- Recoverable: exception handling and rollback support
- Distributed-friendly: cross-thread/process/host execution
- Visualized: graphify-based relationship graph
- Memory-governed: lower recall noise and lower token cost

## PM View: Feasibility and Value

### Why It Matters

1. Upgrades AI from “answering tool” to “delivery system”
2. Reduces coordination failure in multi-role complex workflows
3. Compounds reusable assets (Bee, Dance, graph, memory)

### Feasibility

#### 1) Problem-Solution Fit

Best for:

- Complex business workflow automation
- Cross-role collaboration (PM/Ops/Engineering/QA)
- AI pipelines requiring auditability and accountability

#### 2) Technical Feasibility

Enablers:

- Mature Node.js orchestration ecosystem
- JSON contracts for cross-module collaboration
- Existing patterns for agent scheduling, queues, state machines
- graphify + Memory Palace for understandable and compressed context

Challenges:

- Stability of task decomposition quality
- Consistency and fault recovery in long workflows
- Quality evaluation and automated acceptance standards

Conclusion: **technically feasible; success depends on phased MVP validation of quality and cost.**

#### 3) Business Feasibility

Possible paths:

- Open core + managed platform
- Enterprise edition (audit, security, permissions, private deployment)
- BeeHub ecosystem monetization

### Recommended MVP Scope

- Bee specification + runtime
- Honey contract validation
- Basic Dance orchestration (sequence/parallel/timeout/retry)
- Hive logging and auditing
- Minimal Memory Palace (task-level relevant memory extraction)
- One closed-loop business template (decompose -> execute -> test -> report)

### Suggested Metrics

- End-to-end completion time (TAT)
- Human review interventions per task
- First-pass delivery acceptance rate
- Mean time to recovery (MTTR)
- Bee reuse rate
- Token cost reduction per task

## Fit / Non-Fit

Good fit:

- Teams handling complex workflows with constrained manpower
- Organizations building a sustainable AI delivery system

Not a fit:

- One-off Q&A or lightweight script automation only

## License

MIT
