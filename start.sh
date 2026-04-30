#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"

if ! command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun is not installed or not in PATH. Run ./install.sh first."
  exit 1
fi

echo "[Swarm] Starting frontend hot-reload server on http://127.0.0.1:6904 (root: frontend)"
bun x live-server frontend --port=6904 --host=127.0.0.1 --no-browser &
frontend_pid=$!

echo "[Swarm] Starting backend server with watch mode on http://127.0.0.1:3000"
bun --watch backend/index.js &
backend_pid=$!

cleanup() {
  kill "$frontend_pid" "$backend_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait "$frontend_pid" "$backend_pid"
