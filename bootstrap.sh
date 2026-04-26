#!/usr/bin/env bash
# Protovibe bootstrap (macOS / Linux)
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe/main/bootstrap.sh | bash
#
# Custom install location:
#   curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe/main/bootstrap.sh | PROTOVIBE_DIR=~/code/protovibe bash
set -euo pipefail

REPO_URL="${PROTOVIBE_REPO:-https://github.com/Protovibe-Studio/protovibe.git}"
INSTALL_DIR="${PROTOVIBE_DIR:-$HOME/Protovibe}"
BRANCH="${PROTOVIBE_BRANCH:-main}"

C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'
say()  { printf "%s%s%s\n" "$C_CYAN" "$*" "$C_RESET"; }
ok()   { printf "%s%s✔ %s%s\n" "$C_GREEN" "$C_BOLD" "$*" "$C_RESET"; }
err()  { printf "%s✖ %s%s\n" "$C_RED" "$*" "$C_RESET" >&2; }

# ── Ensure git ──────────────────────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  case "$OSTYPE" in
    darwin*)
      err "git is not installed."
      err "macOS will prompt to install Xcode Command Line Tools — accept that, then re-run."
      xcode-select --install 2>/dev/null || true
      exit 1
      ;;
    linux*)
      err "git is not installed. Install it via your package manager (e.g. apt-get install git) and re-run."
      exit 1
      ;;
    *)
      err "git is required. Install git and re-run."
      exit 1
      ;;
  esac
fi

say "Repo:   $REPO_URL ($BRANCH)"
say "Target: $INSTALL_DIR"
echo

# ── Clone or update ─────────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  say "Existing checkout found — updating..."
  git -C "$INSTALL_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
elif [ -e "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
  err "$INSTALL_DIR already exists and is not empty (and not a git checkout)."
  err "Pick a different location:  PROTOVIBE_DIR=~/somewhere-else  curl ... | bash"
  exit 1
else
  say "Cloning..."
  mkdir -p "$INSTALL_DIR"
  git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi
ok "Source ready at $INSTALL_DIR"

# ── Hand off to install.sh ──────────────────────────────────────────────────
cd "$INSTALL_DIR"
if [ ! -x "./install.sh" ]; then
  chmod +x ./install.sh 2>/dev/null || true
fi
echo
say "Running install.sh..."
exec ./install.sh
