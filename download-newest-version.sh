#!/usr/bin/env bash
# Protovibe self-updater (macOS / Linux)
#
# Downloads the latest SIGNED protovibe release and replaces the local
# protovibe-project-manager / protovibe-project-template copies — only the folders
# whose version (in package.json) is newer than the local one. The release's
# Ed25519 signature and artifact hash are verified (against the public key embedded
# in the app) before anything is applied; unverified code is never used. Existing
# user projects under projects/ are never touched. See SECURITY.md.
#
# Usage:
#   ./download-newest-version.sh            # update what is outdated
#   ./download-newest-version.sh --force    # update both regardless of version
#   ./download-newest-version.sh --check    # print JSON of local/remote versions
#
# Exit codes:
#   0 success (or no update needed)
#   1 generic failure
#   2 nothing to update (only meaningful with no flags)
set -o pipefail

REPO="Protovibe-Studio/protovibe-studio"

if [ -t 1 ]; then
  C_RESET="\033[0m"; C_BOLD="\033[1m"
  C_GREEN="\033[32m"; C_YELLOW="\033[33m"; C_CYAN="\033[36m"; C_RED="\033[31m"
else
  C_RESET=""; C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_CYAN=""; C_RED=""
fi
say()  { printf "${C_CYAN}%s${C_RESET}\n" "$*"; }
ok()   { printf "${C_GREEN}${C_BOLD}✔ %s${C_RESET}\n" "$*"; }
warn() { printf "${C_YELLOW}⚠  %s${C_RESET}\n" "$*"; }
err()  { printf "${C_RED}✖ %s${C_RESET}\n" "$*" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

PM_DIR="$SCRIPT_DIR/protovibe-project-manager"
TPL_DIR="$SCRIPT_DIR/protovibe-project-template"

if [ ! -d "$PM_DIR" ] || [ ! -d "$TPL_DIR" ]; then
  err "Expected protovibe-project-manager/ and protovibe-project-template/ in $SCRIPT_DIR"
  exit 1
fi

MODE="auto"
ONLY=""   # ""=both, "template", "manager"
STAGE_MANAGER=0  # if 1, write manager files to a sibling .pending dir
for arg in "$@"; do
  case "$arg" in
    --force) MODE="force" ;;
    --check) MODE="check" ;;
    --only=template) ONLY="template" ;;
    --only=manager)  ONLY="manager" ;;
    --stage) STAGE_MANAGER=1 ;;
    "" ) ;;
    *) err "Unknown flag: $arg"; exit 1 ;;
  esac
done

# ── version helpers ─────────────────────────────────────────────────────────
read_pkg_version() {
  # $1 = path to a package.json
  node -e "try{const p=require('$1');process.stdout.write(p.version||'')}catch{process.stdout.write('')}" 2>/dev/null
}

# returns 0 if $1 > $2 (semver-style), else 1
ver_gt() {
  node -e "
    const a='${1}'.split('.').map(n=>parseInt(n,10)||0);
    const b='${2}'.split('.').map(n=>parseInt(n,10)||0);
    for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x>y){process.exit(0)}if(x<y){process.exit(1)}}
    process.exit(1);
  "
}

# ── 1. Read local versions ──────────────────────────────────────────────────
LOCAL_PM_VER="$(read_pkg_version "$PM_DIR/package.json")"
LOCAL_TPL_VER="$(read_pkg_version "$TPL_DIR/package.json")"

# ── 2. Fetch + verify the signed release ────────────────────────────────────
# SECURITY: we no longer pull raw source from a branch. Instead we download the
# latest SIGNED GitHub release and verify its Ed25519 signature + artifact hash
# (against the public key embedded in the app) before applying anything. This is
# delegated to scripts/fetch-verified-release.mjs, which fails closed on any
# verification error. See SECURITY.md.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! command -v unzip >/dev/null 2>&1; then
  err "unzip is required to verify signed releases. Please install it and retry."
  exit 1
fi

say "Downloading and verifying the latest signed protovibe release ..."
VERIFIED_JSON="$(node "$SCRIPT_DIR/scripts/fetch-verified-release.mjs" --dest "$TMP/verified")" || {
  err "Could not download or verify a signed release. Refusing to apply unverified code."
  exit 1
}

SRC_ROOT="$(printf '%s' "$VERIFIED_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).srcRoot||"")}catch{process.stdout.write("")}})')"
REMOTE_PM_VER="$(printf '%s' "$VERIFIED_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).managerVersion||"")}catch{process.stdout.write("")}})')"
REMOTE_TPL_VER="$(printf '%s' "$VERIFIED_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).templateVersion||"")}catch{process.stdout.write("")}})')"

if [ -z "$SRC_ROOT" ] || [ ! -d "$SRC_ROOT/protovibe-project-manager" ] || [ ! -d "$SRC_ROOT/protovibe-project-template" ]; then
  err "Verified release did not contain the expected folders."
  exit 1
fi

if [ "$MODE" = "check" ]; then
  printf '{"manager":{"current":"%s","latest":"%s"},"template":{"current":"%s","latest":"%s"}}\n' \
    "$LOCAL_PM_VER" "$REMOTE_PM_VER" "$LOCAL_TPL_VER" "$REMOTE_TPL_VER"
  exit 0
fi

# ── 3. Decide what to update ────────────────────────────────────────────────
update_pm=0
update_tpl=0
if [ "$MODE" = "force" ]; then
  update_pm=1; update_tpl=1
else
  if [ -n "$REMOTE_PM_VER" ] && [ -n "$LOCAL_PM_VER" ] && ver_gt "$REMOTE_PM_VER" "$LOCAL_PM_VER"; then
    update_pm=1
  fi
  if [ -n "$REMOTE_TPL_VER" ] && [ -n "$LOCAL_TPL_VER" ] && ver_gt "$REMOTE_TPL_VER" "$LOCAL_TPL_VER"; then
    update_tpl=1
  fi
fi

# Filter by --only=...
if [ "$ONLY" = "template" ]; then update_pm=0; fi
if [ "$ONLY" = "manager" ];  then update_tpl=0; fi

if [ "$update_pm" -eq 0 ] && [ "$update_tpl" -eq 0 ]; then
  ok "Already up to date — manager $LOCAL_PM_VER, template $LOCAL_TPL_VER."
  exit 2
fi

# ── 4. Sync helpers ─────────────────────────────────────────────────────────
# Replace `dest` contents with `src` contents, but preserve directories listed
# in PRESERVE (relative to dest). pnpm-lock.yaml is intentionally overwritten —
# it's part of the core source we ship.
sync_dir() {
  local src="$1"
  local dest="$2"
  shift 2
  local preserve=("$@")

  # Save preserved dirs to a temp side location, swap, then restore.
  local stash
  stash="$(mktemp -d)"
  for rel in "${preserve[@]}"; do
    if [ -e "$dest/$rel" ]; then
      mkdir -p "$stash/$(dirname "$rel")"
      mv "$dest/$rel" "$stash/$rel"
    fi
  done

  # Wipe everything else and copy fresh
  rm -rf "$dest"
  mkdir -p "$dest"
  # cp -R on macOS doesn't have --no-target-directory, so copy contents:
  ( cd "$src" && tar -cf - . ) | ( cd "$dest" && tar -xf - )

  # Restore preserved
  for rel in "${preserve[@]}"; do
    if [ -e "$stash/$rel" ]; then
      mkdir -p "$dest/$(dirname "$rel")"
      # Remove anything the new tree placed at that path
      rm -rf "$dest/$rel"
      mv "$stash/$rel" "$dest/$rel"
    fi
  done
  rm -rf "$stash"
}

# ── 5. Apply updates ────────────────────────────────────────────────────────
updated_pm=0
updated_tpl=0

if [ "$update_pm" -eq 1 ]; then
  if [ "$STAGE_MANAGER" -eq 1 ]; then
    # Staged mode: write the new manager into a sibling .pending dir so the
    # currently running manager can keep serving files. The launcher swaps it
    # into place on next start, before vite boots.
    PENDING_DIR="$SCRIPT_DIR/protovibe-project-manager.pending"
    say "Staging protovibe-project-manager: $LOCAL_PM_VER → $REMOTE_PM_VER (apply on next launch)"
    rm -rf "$PENDING_DIR"
    mkdir -p "$PENDING_DIR"
    ( cd "$SRC_ROOT/protovibe-project-manager" && tar -cf - . ) | ( cd "$PENDING_DIR" && tar -xf - )
    updated_pm=1
  else
    say "Updating protovibe-project-manager: $LOCAL_PM_VER → $REMOTE_PM_VER"
    sync_dir "$SRC_ROOT/protovibe-project-manager" "$PM_DIR" "node_modules"
    updated_pm=1
  fi
fi

if [ "$update_tpl" -eq 1 ]; then
  say "Updating protovibe-project-template: $LOCAL_TPL_VER → $REMOTE_TPL_VER"
  # Preserve node_modules at the template root AND inside plugins/protovibe so
  # pnpm install is fast. Plugin dist/ gets rebuilt by postinstall.
  sync_dir "$SRC_ROOT/protovibe-project-template" "$TPL_DIR" \
    "node_modules" \
    "plugins/protovibe/node_modules"
  updated_tpl=1
fi

# ── 6. pnpm install in updated dirs ─────────────────────────────────────────
ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then return 0; fi
  # install.sh symlinks node/pnpm into ~/.local/bin. Prepend it if the
  # current shell hasn't sourced the user's rc file yet (e.g. when launched
  # from a GUI helper).
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
  esac
  command -v pnpm >/dev/null 2>&1
}

if ! ensure_pnpm; then
  err "pnpm is not available on PATH. Run ./install.sh once and try again."
  exit 1
fi

if [ "$updated_pm" -eq 1 ] && [ "$STAGE_MANAGER" -eq 0 ]; then
  say "Running pnpm install in protovibe-project-manager ..."
  ( cd "$PM_DIR" && pnpm install ) || { err "pnpm install failed in protovibe-project-manager"; exit 1; }
fi
# Staged manager updates defer pnpm install to the launcher (runs on next start).
if [ "$updated_tpl" -eq 1 ]; then
  say "Running pnpm install in protovibe-project-template ..."
  ( cd "$TPL_DIR" && pnpm install ) || { err "pnpm install failed in protovibe-project-template"; exit 1; }
fi

# ── 7. Summary ──────────────────────────────────────────────────────────────
ok "Update complete."
if [ "$updated_pm" -eq 1 ]; then echo "  • protovibe-project-manager  → $REMOTE_PM_VER"; fi
if [ "$updated_tpl" -eq 1 ]; then echo "  • protovibe-project-template → $REMOTE_TPL_VER"; fi

# Print machine-readable trailer for the project-manager UI to parse.
printf '\n__PROTOVIBE_UPDATE_RESULT__ {"manager":%s,"template":%s,"managerVersion":"%s","templateVersion":"%s"}\n' \
  "$([ $updated_pm -eq 1 ] && echo true || echo false)" \
  "$([ $updated_tpl -eq 1 ] && echo true || echo false)" \
  "$REMOTE_PM_VER" "$REMOTE_TPL_VER"
