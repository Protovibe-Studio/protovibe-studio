#!/usr/bin/env bash
# Protovibe one-shot installer (macOS / Linux)
#
# Robust setup:
#  - Logs everything to install.log
#  - Lock file prevents concurrent runs
#  - Pre-flight checks (internet, write permissions)
#  - Friendly error messages with hints (proxy, permissions)
#  - Self-test after install
#  - Path-independent shortcut (reads ~/.protovibe/project-path at runtime)
set -o pipefail
# Note: intentionally NOT using `set -u`. nvm.sh isn't nounset-clean
# (e.g. references $1 unconditionally), and sourcing it under -u aborts
# the script. All our own var reads use ${VAR:-} defaults already.

# ── colors ───────────────────────────────────────────────────────────────────
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

# ── 0. Resolve repo root ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
cd "$SCRIPT_DIR"

PM_DIR="$SCRIPT_DIR/protovibe-project-manager"
TPL_DIR="$SCRIPT_DIR/protovibe-project-template"
PLUGIN_DIST="$TPL_DIR/plugins/protovibe/dist"
LOG_FILE="$SCRIPT_DIR/install.log"
LOCK_FILE="$SCRIPT_DIR/.install.lock"

if [ ! -d "$PM_DIR" ] || [ ! -d "$TPL_DIR" ]; then
  err "Expected protovibe-project-manager/ and protovibe-project-template/ in $SCRIPT_DIR"
  exit 1
fi

# ── 1. Concurrency lock ──────────────────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
  prev_pid="$(cat "$LOCK_FILE" 2>/dev/null || echo '')"
  if [ -n "$prev_pid" ] && kill -0 "$prev_pid" 2>/dev/null; then
    err "Another install is already running (PID $prev_pid)."
    err "Wait for it to finish, or kill it: kill $prev_pid"
    exit 1
  else
    warn "Stale lock file from a previous run — removing."
    rm -f "$LOCK_FILE"
  fi
fi
echo "$$" > "$LOCK_FILE"

# ── 2. Logging: tee everything to install.log ────────────────────────────────
: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
echo "── Protovibe install — $(date) ──"
echo "Repo: $SCRIPT_DIR"
echo "Shell: ${SHELL:-?}    OS: $OSTYPE    User: $(whoami)"
echo ""

# ── 3. Error trap ────────────────────────────────────────────────────────────
CURRENT_STEP="(starting up)"
on_error() {
  local exit_code=$?
  local line=$1
  echo ""
  err "Install failed during: $CURRENT_STEP"
  err "Exit code $exit_code at line $line"
  echo ""
  echo "Hints:"
  case "$CURRENT_STEP" in
    *internet*|*nvm*|*pnpm\ install*)
      echo "  • Network step. If you're behind a corporate proxy:"
      echo "      export HTTPS_PROXY=http://your.proxy:port"
      echo "      export HTTP_PROXY=http://your.proxy:port"
      echo "    then re-run ./install.sh"
      ;;
    *rc\ file*|*permission*)
      echo "  • Permission issue. Verify you can write to your home directory."
      ;;
  esac
  echo ""
  echo "Full log: $LOG_FILE"
  rm -f "$LOCK_FILE"
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR
trap 'rm -f "$LOCK_FILE"' EXIT

step() { CURRENT_STEP="$1"; say "▸ $1"; }

# ── 4. Pre-flight checks ─────────────────────────────────────────────────────
step "pre-flight: required commands"
for cmd in curl bash uname; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "Required command not found: $cmd"
    exit 1
  fi
done

step "pre-flight: internet connectivity"
if ! curl -fsI --max-time 10 https://registry.npmjs.org/ >/dev/null 2>&1; then
  warn "Could not reach https://registry.npmjs.org/"
  warn "Continuing — this may be a transient DNS hiccup, but expect failures if it isn't."
  if [ -n "${HTTPS_PROXY:-}${HTTP_PROXY:-}" ]; then
    say "Detected proxy env: HTTPS_PROXY=${HTTPS_PROXY:-} HTTP_PROXY=${HTTP_PROXY:-}"
  fi
fi

# Pick the right shell startup file
detect_rc_file() {
  local shell_name; shell_name=$(basename "${SHELL:-bash}")
  case "$OSTYPE" in
    msys*|cygwin*|mingw*) echo "$HOME/.bash_profile" ;;
    darwin*) [ "$shell_name" = "zsh" ] && echo "$HOME/.zshrc" || echo "$HOME/.bash_profile" ;;
    linux*)  [ "$shell_name" = "zsh" ] && echo "$HOME/.zshrc" || echo "$HOME/.bashrc" ;;
    *)       echo "$HOME/.bashrc" ;;
  esac
}
RC_FILE="$(detect_rc_file)"

step "pre-flight: rc file is writable ($RC_FILE)"
touch "$RC_FILE" 2>/dev/null || {
  err "Cannot write to $RC_FILE."
  err "Check ownership/permissions: ls -l $RC_FILE"
  exit 1
}

# ── 5. nvm ───────────────────────────────────────────────────────────────────
step "install/load nvm"
NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
export NVM_DIR

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  say "nvm not found — installing v0.40.3..."
  curl -fsSL -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v nvm >/dev/null 2>&1; then
  err "nvm could not be loaded after installation."
  err "Open a new terminal and re-run ./install.sh"
  exit 1
fi
ok "nvm $(nvm --version) ready."

step "persist nvm in $RC_FILE"
if ! grep -q 'NVM_DIR' "$RC_FILE" 2>/dev/null; then
  cat >> "$RC_FILE" << 'NVMBLOCK'

# nvm — added by Protovibe install.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
NVMBLOCK
  ok "nvm will load automatically in new terminals."
else
  say "nvm already configured — skipping."
fi

# ── 6. Node ──────────────────────────────────────────────────────────────────
step "install Node from .nvmrc"
NODE_VERSION="$(cat "$SCRIPT_DIR/.nvmrc" 2>/dev/null || echo 22)"
nvm install "$NODE_VERSION" >/dev/null
nvm use "$NODE_VERSION" >/dev/null

# Ensure 'default' alias points to a real, installed version. The launcher
# relies on `nvm use default`; without this alias it silently fails and pnpm
# never lands on PATH. nvm doesn't always create 'default' on its own (e.g.
# when nvm was installed previously without a node install), so set it
# unconditionally to whatever we just activated.
ACTIVE_NODE="$(nvm version)"
CURRENT_DEFAULT="$(nvm alias default 2>/dev/null | awk '{print $3}')"
if [ -z "$CURRENT_DEFAULT" ] || [ "$CURRENT_DEFAULT" = "N/A" ] || ! [ -d "$NVM_DIR/versions/node/$CURRENT_DEFAULT" ]; then
  nvm alias default "$ACTIVE_NODE" >/dev/null
  ok "Set nvm 'default' alias → $ACTIVE_NODE"
else
  say "nvm 'default' alias already set → $CURRENT_DEFAULT"
fi
ok "Node $(node --version) / npm $(npm --version)"

# ── 7. pnpm ──────────────────────────────────────────────────────────────────
step "enable pnpm via corepack"
corepack enable pnpm >/dev/null 2>&1 || warn "corepack enable returned non-zero — continuing"
corepack prepare pnpm@9.15.9 --activate >/dev/null
ok "pnpm $(pnpm --version) ready."

# ── 8. Install workspaces ────────────────────────────────────────────────────
run_pnpm_install() {
  local dir=$1
  local name=$2
  step "pnpm install ($name)"
  if ! ( cd "$dir" && pnpm install ); then
    err "pnpm install failed in $name."
    if [ -z "${HTTPS_PROXY:-}${HTTP_PROXY:-}" ]; then
      err "If you're behind a proxy, set HTTPS_PROXY and HTTP_PROXY and re-run."
    fi
    err "Last 30 lines of output above — full log: $LOG_FILE"
    exit 1
  fi
}
run_pnpm_install "$PM_DIR" "protovibe-project-manager"
run_pnpm_install "$TPL_DIR" "protovibe-project-template"
ok "All deps installed."

# ── 9. Create shortcut ───────────────────────────────────────────────────────
step "create desktop shortcut"
node "$PM_DIR/scripts/create-shortcut.js"

# ── 10. Self-test ────────────────────────────────────────────────────────────
step "self-test"
self_test_failed=0
node -v >/dev/null 2>&1 || { err "self-test: node missing"; self_test_failed=1; }
pnpm -v >/dev/null 2>&1 || { err "self-test: pnpm missing"; self_test_failed=1; }
if ! ls "$PLUGIN_DIST"/* >/dev/null 2>&1; then
  err "self-test: vite-plugin-protovibe dist/ is empty or missing ($PLUGIN_DIST)"
  err "  Try: cd protovibe-project-template/plugins/protovibe && pnpm build"
  self_test_failed=1
fi
if ! ( cd "$PM_DIR" && pnpm exec vite --version >/dev/null 2>&1 ); then
  err "self-test: vite is not callable from project-manager"
  self_test_failed=1
fi
if [ "$self_test_failed" -ne 0 ]; then
  err "Self-test failed. Install partially completed — see $LOG_FILE"
  exit 1
fi
ok "Self-test passed: node, pnpm, vite, plugin dist all good."

# ── 11. Final guidance ───────────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────────────────"
case "$OSTYPE" in
  darwin*)
    ok "Setup complete!"
    echo ""
    echo "  An installer window opened in Finder."
    echo "  ${C_BOLD}Drag Protovibe.app onto the Applications shortcut${C_RESET},"
    echo "  then launch it from Launchpad or /Applications."
    echo ""
    echo "  The first launch opens Terminal and runs the dev server;"
    echo "  the project manager will then be available in your browser."
    ;;
  linux*)
    ok "Setup complete!"
    echo ""
    echo "  A 'Protovibe' launcher was placed on your Desktop."
    echo "  Double-click it (you may need to mark it Trusted on first run)."
    ;;
  *)
    ok "Setup complete!"
    ;;
esac
echo ""
echo "  ⓘ  If you ever move this folder, just re-run ./install.sh"
echo "      to rebind the shortcut to the new location."
echo "────────────────────────────────────────────────────────────"
