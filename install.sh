#!/usr/bin/env bash
set -euo pipefail

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
BUN_BIN="$BUN_INSTALL/bin/bun"

if command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun is already installed: $(bun --version)"
  echo "[Swarm] Current shell not refreshed automatically. Run:"
  echo "source \"$BUN_INSTALL/_bun\" 2>/dev/null || true"
  echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\""
  exit 0
fi

echo "[Swarm] Installing Bun..."
curl -fsSL https://bun.sh/install | bash

export PATH="$BUN_INSTALL/bin:$PATH"

if command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun installed successfully: $(bun --version)"
  echo "[Swarm] For current shell, run:"
  echo "source \"$BUN_INSTALL/_bun\" 2>/dev/null || true"
  echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\""
  echo "[Swarm] For future shells, keep this in your shell profile:"
  echo 'export BUN_INSTALL="$HOME/.bun"'
  echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
  exit 0
fi

if [ -x "$BUN_BIN" ]; then
  echo "[Swarm] Bun installed at: $BUN_BIN"
  echo "[Swarm] For current shell, run:"
  echo "source \"$BUN_INSTALL/_bun\" 2>/dev/null || true"
  echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\""
  exit 0
fi

echo "[Swarm] Bun installation finished, but bun was not detected in PATH."
echo "[Swarm] Add this to your shell profile and reopen terminal (or source profile):"
echo 'export BUN_INSTALL="$HOME/.bun"'
echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
exit 1
