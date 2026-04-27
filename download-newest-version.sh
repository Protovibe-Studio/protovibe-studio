#!/usr/bin/env bash
# Protovibe self-updater (macOS / Linux)
#
# Downloads the latest protovibe-project-manager and protovibe-project-template
# from the GitHub repo and replaces the local copies — only the folders whose
# version (in package.json) is newer than the local one. Existing user projects
# under projects/ are never touched.
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
BRANCH="main"

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
for arg in "$@"; do
  case "$arg" in
    --force) MODE="force" ;;
    --check) MODE="check" ;;
    --only=template) ONLY="template" ;;
    --only=manager)  ONLY="manager" ;;
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

# ── 2. Fetch remote tarball ─────────────────────────────────────────────────
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

say "Downloading latest protovibe from github.com/$REPO@$BRANCH ..."
TOKEN="${PROTOVIBE_GITHUB_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ] && command -v gh >/dev/null 2>&1; then
  TOKEN="$(gh auth token 2>/dev/null || true)"
fi
auth_args=()
if [ -n "$TOKEN" ]; then
  auth_args=(-H "Authorization: Bearer $TOKEN")
fi
# API tarball endpoint works for both public and private repos with a token.
TARBALL_URL="https://api.github.com/repos/$REPO/tarball/$BRANCH"
if ! curl -fsSL "${auth_args[@]}" -H "Accept: application/vnd.github+json" "$TARBALL_URL" -o "$TMP/repo.tgz"; then
  err "Failed to download tarball. Check your internet connection."
  exit 1
fi
if ! tar -xzf "$TMP/repo.tgz" -C "$TMP"; then
  err "Failed to extract tarball."
  exit 1
fi

SRC_ROOT=""
for d in "$TMP"/*/; do
  if [ -d "${d}protovibe-project-manager" ] && [ -d "${d}protovibe-project-template" ]; then
    SRC_ROOT="${d%/}"; break
  fi
done
if [ -z "$SRC_ROOT" ]; then
  err "Could not find protovibe folders in extracted tarball."
  exit 1
fi

REMOTE_PM_VER="$(read_pkg_version "$SRC_ROOT/protovibe-project-manager/package.json")"
REMOTE_TPL_VER="$(read_pkg_version "$SRC_ROOT/protovibe-project-template/package.json")"

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
  say "Updating protovibe-project-manager: $LOCAL_PM_VER → $REMOTE_PM_VER"
  sync_dir "$SRC_ROOT/protovibe-project-manager" "$PM_DIR" "node_modules"
  updated_pm=1
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
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  command -v nvm >/dev/null 2>&1 && (nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true)
  if ! command -v pnpm >/dev/null 2>&1 && [ -d "$NVM_DIR/versions/node" ]; then
    for d in "$NVM_DIR"/versions/node/*/bin; do
      [ -x "$d/pnpm" ] && export PATH="$d:$PATH" && break
    done
  fi
  command -v pnpm >/dev/null 2>&1
}

if ! ensure_pnpm; then
  err "pnpm is not available on PATH. Run ./install.sh once and try again."
  exit 1
fi

if [ "$updated_pm" -eq 1 ]; then
  say "Running pnpm install in protovibe-project-manager ..."
  ( cd "$PM_DIR" && pnpm install ) || { err "pnpm install failed in protovibe-project-manager"; exit 1; }
fi
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
