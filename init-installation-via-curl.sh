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

# ── Preserve any existing install by renaming it aside ─────────────────────
# We never delete user data. If $INSTALL_DIR exists and is non-empty, rename
# it to a sibling Protovibe_old_version_N. After extraction, if the backup
# contains a projects/ folder, move it into the fresh install so the user's
# work is preserved in place.
BACKUP_DIR=""
if [ -e "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
  parent_dir="$(dirname "$INSTALL_DIR")"
  base_name="$(basename "$INSTALL_DIR")"
  n=1
  while [ -e "$parent_dir/${base_name}_old_version_${n}" ]; do
    n=$((n + 1))
  done
  BACKUP_DIR="$parent_dir/${base_name}_old_version_${n}"
  say "Existing install found — renaming to $BACKUP_DIR"
  mv "$INSTALL_DIR" "$BACKUP_DIR"
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

# ── Restore user's projects/ from the backup (never deleted) ───────────────
if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR/projects" ]; then
  if [ -e "$INSTALL_DIR/projects" ]; then
    rm -rf "$INSTALL_DIR/projects"
  fi
  say "Restoring projects/ from previous install..."
  mv "$BACKUP_DIR/projects" "$INSTALL_DIR/projects"
  ok "projects/ moved into new install. Old install kept at $BACKUP_DIR"
elif [ -n "$BACKUP_DIR" ]; then
  ok "Previous install kept at $BACKUP_DIR (no projects/ folder to restore)"
fi

# ── Hand off to install.sh ──────────────────────────────────────────────────
cd "$INSTALL_DIR"
if [ ! -x "./install.sh" ]; then
  chmod +x ./install.sh 2>/dev/null || true
fi
echo
say "Running install.sh..."
# Tell install.sh whether this is a fresh install or a reinstall on top of
# an existing one. Reinstalls run pnpm install --force to re-verify every
# linked file in node_modules, which fixes corrupt/missing files in pnpm's
# content-addressable store left over from earlier interrupted installs.
if [ -n "$BACKUP_DIR" ]; then
  export PROTOVIBE_REINSTALL=1
fi
exec ./install.sh
