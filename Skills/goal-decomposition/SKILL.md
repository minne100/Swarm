---
name: goal-decomposition
version: 1.1.0
description: |
  Decompose a user goal into a recursive, execution-ready plan with CEO review,
  ENG review, and per-node Dance mapping. Optimized for guided choices
  (preset options + custom input) so non-technical users can make progress.
triggers:
  - "decompose this goal"
  - "break this down"
  - "plan this project"
  - "turn idea into tasks"
tools:
  - read
  - write
  - grep
mutating: true
runtime_targets:
  - codex
  - swarm-native
required_tools:
  - read
  - write
  - grep
fallback_if_unavailable: |
  If required tools are unavailable, stop at current phase, write a blocker note
  in markdown, and request user confirmation before continuing.
---

# Goal Decomposition

## Preamble (run first)

```bash
bash Skills/goal-decomposition/scripts/preamble.sh
```

## Contract

This skill guarantees:

- Recursive decomposition: `L0 -> L1 -> L2 -> L3`
- Dual review gates on each level:
  - CEO review: value, scope, priority
  - ENG review: architecture, dependencies, testability
- Every node gets a `dance_id` (no Dance, no execution)
- Output artifacts are Markdown-first (not JSON-first)
- Interaction is option-first with `0) Other (custom input)`

## Phases

1. Capture goal and constraints.
2. Run L1 decomposition (top streams).
3. Run CEO review and ask for confirmation.
4. Expand selected stream(s) to L2 packages.
5. Run ENG review and ask for confirmation.
6. Expand selected package(s) to L3 executable tasks.
7. Assign `dance_id` to every node.
8. Emit markdown artifacts:
   - `PLAN_TREE.md`
   - `CEO_REVIEW.md`
   - `ENG_REVIEW.md`
   - `DANCE_INDEX.md`

## Guided Interaction Cards

Use these cards in order, one by one:

```text
[Goal Decomposition]
Pick decomposition depth:
1) Standard (recommended)
2) Deep (complex/high-risk projects)
3) Fast (prototype-first)
0) Other (custom input)
```

```text
[CEO Review]
Pick scope posture:
1) Hold MVP scope (recommended)
2) Expand selectively
3) Reduce to essentials
0) Other (custom input)
```

```text
[ENG Review]
Pick engineering posture:
1) Balanced (recommended)
2) Speed-first
3) Reliability-first
0) Other (custom input)
```

## Output Format

Generate these markdown files under `Examples/<slug>/` by default.

If needed, override output root with:

- env: `PLAN_OUTPUT_ROOT=/your/path`
- arg: `--out-root /your/path`

Then artifacts are written to `<out-root>/<slug>/`.

1. `PLAN_TREE.md`
2. `CEO_REVIEW.md`
3. `ENG_REVIEW.md`
4. `DANCE_INDEX.md`

Use templates from `templates/`.

### Example seed (for current MCP)

For the goal "web-based P2P multi-user voice + text chat", L1 should start from:

1. Skill generation
2. Environment setup
3. Project testing

After user confirms "Skill generation", recursively expand to:

1. Goal decomposition skill
2. Bee generation skill
3. Honey generation skill
4. Dance generation skill
5. Skill learning-loop

All five nodes must map to unique `dance_id` values in `DANCE_INDEX.md`.

## Anti-Patterns

- Skipping recursive confirmation and dumping all levels at once
- Producing JSON-only output for user-facing planning
- Creating task nodes without `dance_id`
- Mixing implementation details before CEO/ENG reviews
- Asking open-ended questions when option cards can reduce ambiguity

## Tools Used

- `read`: inspect existing docs/constraints
- `write`: produce markdown artifacts
- `grep`: check naming collisions and consistency

## Optional Helper Script

You can generate a starter plan with:

```bash
node Skills/goal-decomposition/scripts/generate_sample_plan.js \
  --slug p2p-chatroom \
  --project "P2P Chatroom" \
  --mission "Build a web-based multi-user voice + text chat MVP."
```

Custom output root example:

```bash
node Skills/goal-decomposition/scripts/generate_sample_plan.js \
  --slug p2p-chatroom \
  --out-root Examples
```

For any other project, just change `--slug`, `--project`, and `--mission`.
