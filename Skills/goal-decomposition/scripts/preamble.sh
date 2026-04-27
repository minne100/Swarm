#!/usr/bin/env bash
set -euo pipefail

# Goal Decomposition preflight (Codex-first, Swarm-compatible)
# - Collect minimal runtime context
# - Create required artifact directories
# - Check required tools (non-fatal, for visibility)

PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
PLAN_OUTPUT_ROOT="${PLAN_OUTPUT_ROOT:-${PROJECT_ROOT}/Examples}"
HISTORY_ROOT="${HISTORY_ROOT:-${PROJECT_ROOT}/History}"
SKILL_DIR="Skills/goal-decomposition"
RUNTIME_ROOT="${PROJECT_ROOT}/artifacts/runtime"

mkdir -p "${PLAN_OUTPUT_ROOT}" "${RUNTIME_ROOT}" "${HISTORY_ROOT}"

BRANCH="$(git -C "${PROJECT_ROOT}" branch --show-current 2>/dev/null || echo "unknown")"
HEAD_SHORT="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

REQUIRED_TOOLS=("bash" "git" "grep")
OPTIONAL_TOOLS=("rg" "node")

missing_required=()
missing_optional=()

for t in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "${t}" >/dev/null 2>&1; then
    missing_required+=("${t}")
  fi
done

for t in "${OPTIONAL_TOOLS[@]}"; do
  if ! command -v "${t}" >/dev/null 2>&1; then
    missing_optional+=("${t}")
  fi
done

cat > "${RUNTIME_ROOT}/goal-decomposition-preamble.md" <<EOF
# Goal Decomposition Preamble

- timestamp: ${TIMESTAMP}
- branch: ${BRANCH}
- head: ${HEAD_SHORT}
- skill_dir: ${SKILL_DIR}
- plan_output_root: ${PLAN_OUTPUT_ROOT}
- history_root: ${HISTORY_ROOT}
- runtime_targets: codex, swarm-native
- required_tools_missing: ${missing_required[*]:-none}
- optional_tools_missing: ${missing_optional[*]:-none}

## Notes

- If required_tools_missing is not empty, stop and resolve before executing phases.
- If optional_tools_missing contains \`rg\`, fallback to \`grep\`.
- This preamble is non-destructive and can be run repeatedly.
EOF

echo "[goal-decomposition preamble] branch=${BRANCH} head=${HEAD_SHORT}"
if [ "${#missing_required[@]}" -gt 0 ]; then
  echo "[goal-decomposition preamble] missing required tools: ${missing_required[*]}"
  exit 2
fi

if [ "${#missing_optional[@]}" -gt 0 ]; then
  echo "[goal-decomposition preamble] missing optional tools: ${missing_optional[*]}"
fi

echo "[goal-decomposition preamble] wrote artifacts/runtime/goal-decomposition-preamble.md"
