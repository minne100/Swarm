# Skill Resolver (Swarm v1.0)

## Purpose

Route user intent to the right skill and enforce Skill-First execution.

## Routing Order (non-skippable)

1. New goal -> `goal-decomposition/SKILL.md`
2. Approved plan node -> corresponding Dance generation skill
3. Dance execution decides: search Bee / generate Bee / generate Honey
4. End of cycle -> learning-loop skill

## Hard Constraints

- No skill, no execution artifact
- No dance mapping, no executable node
- No user confirmation, no recursive drill-down

## User Entry Card

```text
[Swarm Skill Resolver]
Choose what you want to do:
1) New project: recursive decomposition (recommended)
2) Continue from an existing plan node
3) Rebuild one Dance only
4) Postmortem and skill evolution
0) Other (custom input)
```

## Output (Markdown)

- `artifacts/runtime/ROUTING_DECISION.md`

Template:

```markdown
# Routing Decision
- selected_skill:
- reason:
- next_step:
- required_inputs:
```
