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

2. **Skill-First is mandatory.**  
Create/select skills first, then invoke skills to generate Bee/Honey/Dance. This is the primary mechanism to reduce generation instability.

3. **Execution MUST be traceable, replayable, and auditable.**  
Every stage should produce explainable intermediate artifacts and logs.

## Skill-First Production Model

Standard pipeline:

`Goal decomposition -> Skill design/selection -> Skill invocation -> Bee/Honey/Dance generation -> Hive execution -> Beekeeping`

Why this is required:

- Converts implicit know-how into explicit reusable procedures
- Stabilizes generation quality via skill versioning and regression checks
- Reduces randomness from prompt-only generation
- Reuses production methods, not only output files

## Core Skill Set (from original spec)

- Bee generation
- Honey generation
- Dance generation
- Goal decomposition
- Swarm visualization
- Memory Palace
- Project management
- Software development
- Code review
- Unit testing
- Integration testing
- UI design

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
- Skill orchestration
- Model and tool orchestration
- TUI first (Web extensible)

### 6. BeeHub (Capability Marketplace)

- Share reusable Bees
- Discover ready-made capabilities
- Reduce duplicate implementation cost

## Memory Palace

Memory Palace is a key capability for long-horizon context governance and token cost control.

- Selects memory fragments strongly relevant to the current task
- Reduces irrelevant recall noise and improves recall precision
- Cuts redundant context and significantly lowers token usage
- Works with the knowledge graph to build durable organizational memory

## Typical Workflow

1. User provides a business goal in natural language
2. System decomposes and clarifies the goal
3. AI creates/selects skills
4. Skills generate Bee / Honey / Dance
5. Hive executes and produces intermediate outputs
6. Humans perform Beekeeping (review and correction)
7. Final delivery is produced and graph + memory are persisted

## License

MIT
