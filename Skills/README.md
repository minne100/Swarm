# Skills (Swarm)

This directory stores Swarm production skills.
Goal: make execution reliable for non-technical users via guided choice cards.

## Directory Structure

- `RESOLVER.md`: skill routing entry
- `manifest.json`: skill registry
- `adapters/`
  - `codex-runner.md` (current runner adapter)
- `goal-decomposition/`
  - `SKILL.md`
  - `templates/*.md.tmpl`
  - `scripts/*.js`

Legacy flat `.md` skills are still present for transition, but new skills should use
folder format (`<skill-name>/SKILL.md` + templates/scripts).

## Two-Layer Standard

1. Skill Spec (platform-independent)
2. Runner Adapter (platform-dependent)

Current execution target: **Codex-first compatibility**.
Future execution target: **Swarm-native runner**.

## Required frontmatter fields (new skills)

- `runtime_targets`
- `required_tools`
- `fallback_if_unavailable`

## Interaction Rules

Every skill should:

1. Start with preset options
2. Always include `0) Other (custom input)`
3. Avoid long open-ended interrogation
4. Output markdown artifacts that users can read and approve

For directory-based skills, include a `scripts/preamble.sh` and a
`## Preamble (run first)` section in `SKILL.md`.

## Hard Constraints

- No skill, no execution artifacts
- Bee/Honey/Dance are AI-generated
- Humans do Beekeeping only (review/correct/accept)
