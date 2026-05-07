#!/usr/bin/env bash
# Bootstrap Protovibe Studio inside a CodeSandbox Devbox.
# - Installs pnpm globally if missing (no Corepack assumed)
# - Installs deps for the manager and the template
set -euo pipefail

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found, installing globally via npm..."
  npm install -g pnpm@9.15.9
fi

echo "Installing project-manager dependencies..."
pnpm --dir protovibe-project-manager install

echo "Installing project-template dependencies..."
pnpm --dir protovibe-project-template install

echo "Done."
