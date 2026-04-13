#!/usr/bin/env bash
set -e

# ── 1. Ensure nvm is available ────────────────────────────────────────────────
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found. Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Source nvm into this shell session
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm &> /dev/null; then
  echo "ERROR: nvm could not be loaded after installation. Please restart your shell and re-run this script."
  exit 1
fi

echo "nvm $(nvm --version) is available."

# ── 2. Install & use the latest Node.js ───────────────────────────────────────
echo "Installing latest Node.js via nvm..."
nvm install node        # "node" is an alias for the latest release
nvm use node
nvm alias default node  # make it the global default

echo "Using Node $(node --version) / npm $(npm --version)"

# ── 3. Install project dependencies ──────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Running npm install..."
npm install

# ── 4. Start the dev server ───────────────────────────────────────────────────
echo "Starting dev server..."
npm run dev
