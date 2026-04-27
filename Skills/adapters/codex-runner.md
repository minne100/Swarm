# Codex Runner Adapter

This file defines how Swarm Skill Spec is executed in Codex today.

## Mapping

- Skill Contract -> assistant execution constraints
- Skill Phases -> sequential tool-call plan
- Output Format -> files written to workspace
- Quality Gates -> pre-commit checks / review checks

## Required runtime capabilities

- file read/write
- grep/search
- shell command execution
- git status/add/commit/push (when requested)

## Fallback behavior

When a required tool is unavailable:

1. stop at the affected phase
2. emit a markdown blocker note
3. request user approval or alternative path

## Notes

- This adapter is intentionally thin.
- Business logic stays in Skill Spec, not in runner-specific scripts.
- Future `swarm-native` adapter should implement the same contract fields.
