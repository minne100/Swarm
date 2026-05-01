#!/usr/bin/env bash
set -euo pipefail

export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
BUN_BIN="$BUN_INSTALL/bin/bun"
BUN_INSTALLED=0

if command -v bun >/dev/null 2>&1; then
  echo "[Swarm] Bun is already installed: $(bun --version)"
  BUN_INSTALLED=1
else
  echo "[Swarm] Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
fi

export PATH="$BUN_INSTALL/bin:$PATH"

if command -v bun >/dev/null 2>&1; then
  if [ "$BUN_INSTALLED" -eq 0 ]; then
    echo "[Swarm] Bun installed successfully: $(bun --version)"
  fi
elif [ -x "$BUN_BIN" ]; then
  echo "[Swarm] Bun installed at: $BUN_BIN"
else
  echo "[Swarm] Bun installation finished, but bun was not detected in PATH."
  echo "[Swarm] Add this to your shell profile and reopen terminal (or source profile):"
  echo 'export BUN_INSTALL="$HOME/.bun"'
  echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
  exit 1
fi

if command -v obscura >/dev/null 2>&1; then
  echo "[Swarm] Obscura is already installed: $(obscura --version 2>/dev/null || echo unknown)"
else
  echo "[Swarm] Installing obscura (Playwright replacement for browser debug tools)..."
  if command -v cargo >/dev/null 2>&1; then
    cargo install --git https://github.com/h4ckf0r0day/obscura || true
  else
    echo "[Swarm] Cargo not found. Install Rust first, then run:"
    echo "cargo install --git https://github.com/h4ckf0r0day/obscura"
  fi
fi

echo "[Swarm] For current shell, run:"
echo "source \"$BUN_INSTALL/_bun\" 2>/dev/null || true"
echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\""
echo "[Swarm] For future shells, keep this in your shell profile:"
echo 'export BUN_INSTALL="$HOME/.bun"'
echo 'export PATH="$BUN_INSTALL/bin:$PATH"'
