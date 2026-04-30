#!/usr/bin/env bash
set -euo pipefail

if command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun is already installed: $(bun --version)"
  exit 0
fi

echo "[Swarm] Installing Bun..."
curl -fsSL https://bun.sh/install | bash

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

if command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun installed successfully: $(bun --version)"
  echo "[Swarm] If bun is not found in new shells, add this to your shell profile:"
  echo 'export BUN_INSTALL="$HOME/.bun"'
  echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
  exit 0
fi

echo "[Swarm] Bun installation finished, but bun is not in current PATH yet."
echo "[Swarm] Add this to your shell profile and reopen terminal:"
echo 'export BUN_INSTALL="$HOME/.bun"'
echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
exit 1
