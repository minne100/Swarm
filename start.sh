#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"

bun_cmd="$(command -v bun || true)"
if [ -z "$bun_cmd" ] && [ -x "${BUN_INSTALL:-$HOME/.bun}/bin/bun" ]; then
  bun_cmd="${BUN_INSTALL:-$HOME/.bun}/bin/bun"
fi
if [ -z "$bun_cmd" ] && [ -f "$HOME/.bashrc" ]; then
  # Load user profile in non-interactive shell to pick up Bun PATH exports.
  . "$HOME/.bashrc" || true
  bun_cmd="$(command -v bun || true)"
fi
if [ -z "$bun_cmd" ] && [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc" || true
  bun_cmd="$(command -v bun || true)"
fi
if [ -z "$bun_cmd" ]; then
  echo "[Swarm] Bun is not installed or not in PATH. Run ./install.sh, then execute:"
  echo 'source "$HOME/.bun/_bun" 2>/dev/null || true'
  echo 'export PATH="$HOME/.bun/bin:$PATH"'
  exit 1
fi

echo "[Swarm] Starting frontend hot-reload server on http://127.0.0.1:6904 (root: frontend)"
"$bun_cmd" x live-server frontend --port=6904 --host=127.0.0.1 --no-browser &
frontend_pid=$!

echo "[Swarm] Starting backend server with watch mode on http://127.0.0.1:3000"
"$bun_cmd" --watch backend/index.js &
backend_pid=$!

cleanup() {
  kill "$frontend_pid" "$backend_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM
wait "$frontend_pid" "$backend_pid"
