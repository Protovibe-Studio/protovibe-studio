#!/usr/bin/env bash
# Protovibe init-installation-via-curl (macOS / Linux)
#
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.sh | bash
#
# Custom install location:
#   curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.sh | PROTOVIBE_DIR=~/code/protovibe bash
set -euo pipefail

REPO_SLUG="${PROTOVIBE_REPO_SLUG:-Protovibe-Studio/protovibe-studio}"
INSTALL_DIR="${PROTOVIBE_DIR:-$HOME/Protovibe}"
BRANCH="${PROTOVIBE_BRANCH:-main}"
TARBALL_URL="https://codeload.github.com/${REPO_SLUG}/tar.gz/refs/heads/${BRANCH}"

C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'
say()  { printf "%s%s%s\n" "$C_CYAN" "$*" "$C_RESET"; }
ok()   { printf "%s%s✔ %s%s\n" "$C_GREEN" "$C_BOLD" "$*" "$C_RESET"; }
err()  { printf "%s✖ %s%s\n" "$C_RED" "$*" "$C_RESET" >&2; }

# ── Ensure curl & tar ───────────────────────────────────────────────────────
if ! command -v curl >/dev/null 2>&1; then
  err "curl is required but not installed. Install curl and re-run."
  exit 1
fi
if ! command -v tar >/dev/null 2>&1; then
  err "tar is required but not installed. Install tar and re-run."
  exit 1
fi

say "Source: $TARBALL_URL"
say "Target: $INSTALL_DIR"
echo

# ── Refuse to clobber an existing non-empty directory ───────────────────────
if [ -e "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
  err "$INSTALL_DIR already exists and is not empty."
  err "Remove it or pick a different location:  PROTOVIBE_DIR=~/somewhere-else  curl ... | bash"
  exit 1
fi

# ── Download & extract ──────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
TMP_TGZ="$(mktemp -t protovibe.XXXXXX).tar.gz"
trap 'rm -f "$TMP_TGZ"' EXIT

say "Downloading..."
curl -fsSL "$TARBALL_URL" -o "$TMP_TGZ"

say "Extracting..."
# Strip the top-level "<repo>-<branch>/" directory the tarball wraps everything in.
tar -xzf "$TMP_TGZ" -C "$INSTALL_DIR" --strip-components=1

ok "Source ready at $INSTALL_DIR"

# ── Hand off to install.sh ──────────────────────────────────────────────────
cd "$INSTALL_DIR"
if [ ! -x "./install.sh" ]; then
  chmod +x ./install.sh 2>/dev/null || true
fi
echo
say "Running install.sh..."
exec ./install.sh
