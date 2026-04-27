---
name: goal-decomposition
version: 1.2.0
description: |
  Decompose a user goal into a recursive, execution-ready plan in plain language
  for non-technical users, with mandatory sign-off and full History traceability.
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
- Single artifact output for this phase (one markdown file only)
- Plain-language wording for non-technical users (avoid IT jargon)
- Interaction is option-first with `0) Other (custom input)`
- All decomposition artifacts must be written in the same language as the user's input
- The artifact must include a user sign-off section; no sign-off means no next step
- Project-level traceability and routing rules must follow `AGENTS.md` (do not redefine here)

## Phases

1. Capture goal and constraints.
2. Run L1 decomposition (top streams).
3. Write one user-facing plan file in plain language.
4. Expand selected stream(s) to L2 packages.
5. Expand selected package(s) to L3 executable tasks.
6. Check wording and replace technical terms with plain language where needed.
7. Assign `dance_id` to every node.
8. Emit one markdown artifact with sign-off section:
   - `PLAN_FOR_USER.md`
9. Gate rule: if `PLAN_FOR_USER.md` is not signed off by user, stop and do not enter next phase.

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
[Scope Check]
Pick scope style:
1) Keep MVP small (recommended)
2) Expand a little
3) Keep only essentials
0) Other (custom input)
```

```text
[Build Style]
Pick build style:
1) Balanced (recommended)
2) Speed-first
3) Reliability-first
0) Other (custom input)
```

## Output Format

Generate one markdown file under `Examples/<slug>/` by default:
- Swarm round (no `@MVP`): `Examples/<slug>/PLAN_FOR_USER.md`
- MVP round (`@MVP`): `Examples/p2p-chatroom-4p/<slug>/PLAN_FOR_USER.md`

If needed, override output root with:

- env: `PLAN_OUTPUT_ROOT=/your/path`
- arg: `--out-root /your/path`

Then artifacts are written to `<out-root>/<slug>/`.

1. `PLAN_FOR_USER.md`

Use templates from `templates/`.

### Example seed (for current MVP)

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

All major and child nodes must map to unique `dance_id` values in the same plan file.

## Anti-Patterns

- Skipping recursive confirmation and dumping all levels at once
- Producing JSON-only output for user-facing planning
- Creating task nodes without `dance_id`
- Asking open-ended questions when option cards can reduce ambiguity
- Outputting in a different language than the user input
- Proceeding to next phase without explicit user sign-off
- Splitting this phase output into multiple files
- Using technical wording that non-technical users cannot understand

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
  --mission "Build a web-based multi-user voice + text chat MVP." \
  --language zh \
  --route-by-input true \
  --user-input-text "@MVP 我要开发一个点对点聊天室"
```

Custom output root example:

```bash
node Skills/goal-decomposition/scripts/generate_sample_plan.js \
  --slug p2p-chatroom \
  --out-root Examples
```

Round traceability logging helper:

```bash
node Skills/goal-decomposition/scripts/log_history.js \
  --route-by-input true \
  --user-input-route-file temp/user_input.md \
  --topic "p2p-chatroom-goal-decomposition" \
  --user-input-file temp/user_input.md \
  --prompt-file temp/prompt_submitted.md \
  --output-file temp/model_output.md
```

For any other project, just change `--slug`, `--project`, and `--mission`.
