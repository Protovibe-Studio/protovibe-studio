#!/usr/bin/env bash
set -e

# ── Detect the right shell startup file for this platform/shell ───────────────
detect_rc_file() {
  local shell_name
  shell_name=$(basename "${SHELL:-bash}")

  case "$OSTYPE" in
    msys*|cygwin*|mingw*)
      # Git Bash on Windows: login shell always reads ~/.bash_profile first.
      # ~/.bashrc alone is NOT sourced automatically in new terminals.
      echo "$HOME/.bash_profile"
      ;;
    darwin*)
      # macOS: zsh is the default since Catalina; bash uses ~/.bash_profile
      if [ "$shell_name" = "zsh" ]; then
        echo "$HOME/.zshrc"
      else
        echo "$HOME/.bash_profile"
      fi
      ;;
    linux*)
      if [ "$shell_name" = "zsh" ]; then
        echo "$HOME/.zshrc"
      else
        echo "$HOME/.bashrc"
      fi
      ;;
    *)
      echo "$HOME/.bashrc"
      ;;
  esac
}

# ── 0. Resolve project root early (needed by nvm install to find .nvmrc) ─────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Ensure nvm is installed ────────────────────────────────────────────────
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm not found — installing..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Source nvm into this shell session regardless of startup files
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm &> /dev/null; then
  echo "ERROR: nvm could not be loaded after installation."
  echo "Please restart your shell and re-run this script."
  exit 1
fi

echo "nvm $(nvm --version) is available."

# ── 2. Persist nvm into the correct shell startup file ────────────────────────
RC_FILE=$(detect_rc_file)

# Create the file if it doesn't exist yet
touch "$RC_FILE"

if ! grep -q 'NVM_DIR' "$RC_FILE" 2>/dev/null; then
  echo "Configuring nvm in $RC_FILE..."
  cat >> "$RC_FILE" << 'NVMBLOCK'

# nvm — added by setup-and-run.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
NVMBLOCK
  echo "  → Done. nvm will load automatically in all new terminals."
else
  echo "nvm is already configured in $RC_FILE — skipping."
fi

# ── 3. Install & activate the Node.js version from .nvmrc ────────────────────
echo "Installing Node.js $(cat "$SCRIPT_DIR/.nvmrc") (from .nvmrc) via nvm..."
nvm install           # reads .nvmrc automatically
nvm use               # activates the version from .nvmrc
nvm alias default "$(nvm version)"  # persist as the default for new shells

echo "Using Node $(node --version) / npm $(npm --version)"

# ── 4. Install project dependencies ──────────────────────────────────────────
echo "Running npm install..."
npm install

# ── 5. Reload nvm in the current terminal if possible ────────────────────────
# A script runs in a child process and cannot modify the parent shell's
# environment. The only way to propagate PATH changes upward is to source
# this file instead of executing it:  . ./setup-and-run.sh
#
# We detect whether we ARE being sourced right now and print the right hint.
if [ "${BASH_SOURCE[0]}" != "${0}" ]; then
  # Script is being sourced — nvm and node are already live in this shell.
  echo ""
  echo "✔ nvm is now active in this terminal."
else
  # Script was executed normally — changes only live in the child process.
  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo " ACTION REQUIRED — activate nvm in this terminal:"
  echo ""
  echo "   source $RC_FILE"
  echo ""
  echo " Or, next time run the script with:"
  echo ""
  echo "   . ./setup-and-run.sh"
  echo ""
  echo " New terminals will already have nvm available automatically."
  echo "────────────────────────────────────────────────────────────"
fi

# ── 6. Start the dev server ───────────────────────────────────────────────────
echo "Starting dev server..."
npm run dev
