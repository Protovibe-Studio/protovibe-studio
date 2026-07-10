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
# We never delete user projects. If $INSTALL_DIR exists and is non-empty,
# rename it aside. After extraction, projects/ is moved into the fresh
# install, node_modules are stripped from the backup (they are recreated by
# install.sh and only waste space), and the backup lands in
# $INSTALL_DIR/backups/ where only the 2 most recent are kept.
BACKUP_DIR=""
BACKUP_STAMP="$(date +%Y%m%d-%H%M%S)"
if [ -e "$INSTALL_DIR" ] && [ "$(ls -A "$INSTALL_DIR" 2>/dev/null)" ]; then
  parent_dir="$(dirname "$INSTALL_DIR")"
  base_name="$(basename "$INSTALL_DIR")"
  BACKUP_DIR="$parent_dir/${base_name}_backup_${BACKUP_STAMP}"
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
fi

# ── Tuck the backup into $INSTALL_DIR/backups/, keep the 2 most recent ─────
if [ -n "$BACKUP_DIR" ]; then
  BACKUPS_ROOT="$INSTALL_DIR/backups"
  # Carry backup history from the previous install forward.
  if [ -d "$BACKUP_DIR/backups" ]; then
    mv "$BACKUP_DIR/backups" "$BACKUPS_ROOT"
  fi
  mkdir -p "$BACKUPS_ROOT"

  # node_modules are recreated by install.sh — dropping them shrinks the
  # backup from gigabytes to megabytes.
  say "Trimming node_modules from backup..."
  find "$BACKUP_DIR" -type d -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true

  FINAL_BACKUP="$BACKUPS_ROOT/backup-$BACKUP_STAMP"
  mv "$BACKUP_DIR" "$FINAL_BACKUP"
  ok "Previous install backed up to $FINAL_BACKUP"

  # Keep only the 2 most recent backups (timestamped names sort chronologically).
  # (grep exits 1 on no matches; don't let pipefail kill the script.)
  { ls -1 "$BACKUPS_ROOT" 2>/dev/null | grep '^backup-' | sort -r | tail -n +3 || true; } | while IFS= read -r old; do
    say "Removing old backup $old"
    rm -rf "$BACKUPS_ROOT/$old"
  done
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
