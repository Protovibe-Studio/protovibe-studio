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
#
# Node is installed without sudo and without Xcode CLT: we download the
# official Node tarball from nodejs.org into ~/.local/share/protovibe/ and
# symlink the binaries into ~/.local/bin. If the user already has a recent
# enough Node on PATH, we use it instead and touch nothing.
set -o pipefail

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
    *internet*|*download*|*pnpm\ install*)
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

# ── 5. Node ──────────────────────────────────────────────────────────────────
NODE_MAJOR="$(tr -d ' \t\r\n' < "$SCRIPT_DIR/.nvmrc" 2>/dev/null || echo 22)"
LOCAL_BIN="$HOME/.local/bin"
LOCAL_SHARE="$HOME/.local/share/protovibe"

step "check for existing Node ≥ v$NODE_MAJOR"
USE_EXISTING_NODE=0
if command -v node >/dev/null 2>&1; then
  EXISTING_VER="$(node -p 'process.versions.node' 2>/dev/null || echo '')"
  EXISTING_MAJOR="${EXISTING_VER%%.*}"
  if [ -n "$EXISTING_MAJOR" ] && [ "$EXISTING_MAJOR" -ge "$NODE_MAJOR" ] 2>/dev/null; then
    ok "Found existing Node v$EXISTING_VER at $(command -v node) — using it."
    USE_EXISTING_NODE=1
  else
    say "Existing Node v${EXISTING_VER:-?} is older than v$NODE_MAJOR — installing bundled Node."
  fi
fi

if [ "$USE_EXISTING_NODE" -ne 1 ]; then
  step "download Node v$NODE_MAJOR (no sudo, into ~/.local)"

  case "$OSTYPE" in
    darwin*) NODE_OS="darwin" ;;
    linux*)  NODE_OS="linux" ;;
    *) err "Unsupported OS for tarball install: $OSTYPE"; exit 1 ;;
  esac
  case "$(uname -m)" in
    arm64|aarch64) NODE_ARCH="arm64" ;;
    x86_64|amd64)  NODE_ARCH="x64" ;;
    *) err "Unsupported architecture: $(uname -m)"; exit 1 ;;
  esac

  # Discover the latest patch of v$NODE_MAJOR via SHASUMS256.txt — that file
  # also gives us a checksum to verify the download against.
  SHA_URL="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt"
  SHA_LINE="$(curl -fsSL "$SHA_URL" | grep -E "  node-v[^ ]+-${NODE_OS}-${NODE_ARCH}\.tar\.gz$" | head -n1)"
  if [ -z "$SHA_LINE" ]; then
    err "Could not find Node tarball for $NODE_OS-$NODE_ARCH at $SHA_URL"
    exit 1
  fi
  EXPECTED_SHA="${SHA_LINE%% *}"
  TARBALL_NAME="${SHA_LINE##* }"
  NODE_DIR_NAME="${TARBALL_NAME%.tar.gz}"
  TARBALL_URL="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/${TARBALL_NAME}"
  NODE_INSTALL_DIR="$LOCAL_SHARE/$NODE_DIR_NAME"

  if [ -x "$NODE_INSTALL_DIR/bin/node" ]; then
    say "Node already extracted at $NODE_INSTALL_DIR — skipping download."
  else
    mkdir -p "$LOCAL_SHARE"
    TMP_TARBALL="$(mktemp -t protovibe-node).tar.gz"
    say "Downloading $TARBALL_NAME (~50 MB)…"
    curl -fsSL -o "$TMP_TARBALL" "$TARBALL_URL"

    if command -v shasum >/dev/null 2>&1; then
      ACTUAL_SHA="$(shasum -a 256 "$TMP_TARBALL" | awk '{print $1}')"
    elif command -v sha256sum >/dev/null 2>&1; then
      ACTUAL_SHA="$(sha256sum "$TMP_TARBALL" | awk '{print $1}')"
    else
      err "Neither shasum nor sha256sum available — cannot verify download."
      rm -f "$TMP_TARBALL"; exit 1
    fi
    if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
      err "Checksum mismatch for $TARBALL_NAME"
      err "  expected: $EXPECTED_SHA"
      err "  actual:   $ACTUAL_SHA"
      rm -f "$TMP_TARBALL"; exit 1
    fi

    say "Extracting to $LOCAL_SHARE…"
    tar -xzf "$TMP_TARBALL" -C "$LOCAL_SHARE"
    rm -f "$TMP_TARBALL"
  fi

  step "symlink node/npm/npx into $LOCAL_BIN"
  mkdir -p "$LOCAL_BIN"
  for bin in node npm npx; do
    src="$NODE_INSTALL_DIR/bin/$bin"
    if [ -x "$src" ] || [ -L "$src" ]; then
      ln -sf "$src" "$LOCAL_BIN/$bin"
    fi
  done

  # Make node visible in *this* shell so the subsequent steps work without
  # requiring the user to open a new terminal.
  export PATH="$LOCAL_BIN:$PATH"
  ok "Installed Node from $NODE_DIR_NAME"
fi

# Always symlink node/npm/npx into ~/.local/bin, even when using existing
# system Node. The macOS .app launcher (Platypus, no shell rc) only puts
# ~/.local/bin on PATH — without these symlinks, a user with brew/nvm/volta
# Node sees "env: node: No such file or directory" because pnpm itself has
# a #!/usr/bin/env node shebang.
mkdir -p "$LOCAL_BIN"
for bin in node npm npx; do
  bin_path="$(command -v "$bin" 2>/dev/null || true)"
  if [ -n "$bin_path" ] && [ "$bin_path" != "$LOCAL_BIN/$bin" ]; then
    ln -sf "$bin_path" "$LOCAL_BIN/$bin"
  fi
done

step "ensure ~/.local/bin is on PATH ($RC_FILE)"
if ! grep -q '\.local/bin' "$RC_FILE" 2>/dev/null; then
  cat >> "$RC_FILE" << 'PATHBLOCK'

# Protovibe — added by install.sh
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) export PATH="$HOME/.local/bin:$PATH" ;;
esac
PATHBLOCK
  ok "Added ~/.local/bin to PATH in $RC_FILE."
else
  say "~/.local/bin already on PATH in $RC_FILE — skipping."
fi
ok "Node $(node --version) / npm $(npm --version)"

# ── 6. pnpm ──────────────────────────────────────────────────────────────────
# Single path: install pnpm via `npm install -g pnpm@9.15.9` (the way a dev
# would do it themselves). Lands in whatever global prefix the user's npm is
# configured with — for our bundled Node that's $NODE_INSTALL_DIR; for an
# existing Node it's brew/nvm/volta/etc. We then symlink the resulting pnpm
# into ~/.local/bin only when we're running our bundled Node, since that's
# the dir we already added to PATH for it.
if command -v pnpm >/dev/null 2>&1; then
  step "pnpm already installed ($(command -v pnpm))"
else
  step "install pnpm globally via npm"
  if ! npm install -g pnpm@9.15.9; then
    err "npm install -g pnpm@9.15.9 failed."
    err "If your global npm prefix needs sudo, either:"
    err "  • re-run with sudo, or"
    err "  • set a user-writable prefix: npm config set prefix \"\$HOME/.npm-global\""
    err "    and add \"\$HOME/.npm-global/bin\" to your PATH, then re-run."
    exit 1
  fi
fi

# Always symlink pnpm into ~/.local/bin, regardless of where it lives. The
# macOS .app launcher (Platypus, no shell rc) only puts ~/.local/bin on PATH,
# so a user whose pnpm sits in /opt/homebrew/bin or ~/.volta/bin would see
# "pnpm not found" at startup without this.
PNPM_PATH="$(command -v pnpm 2>/dev/null || true)"
# Bundled Node installs pnpm into $NODE_INSTALL_DIR/bin, which isn't on PATH
# (only ~/.local/bin is) — so command -v won't find it. Fall back to the
# known location in that case.
if [ -z "$PNPM_PATH" ] && [ "$USE_EXISTING_NODE" -ne 1 ] && [ -x "${NODE_INSTALL_DIR:-}/bin/pnpm" ]; then
  PNPM_PATH="$NODE_INSTALL_DIR/bin/pnpm"
fi
if [ -n "$PNPM_PATH" ] && [ "$PNPM_PATH" != "$LOCAL_BIN/pnpm" ]; then
  mkdir -p "$LOCAL_BIN"
  ln -sf "$PNPM_PATH" "$LOCAL_BIN/pnpm"
fi
if ! command -v pnpm >/dev/null 2>&1; then
  err "pnpm is still not on PATH after install."
  err "If npm just installed it, its global bin dir may not be on PATH."
  err "Run: npm config get prefix    — and add <prefix>/bin to your PATH."
  exit 1
fi
ok "pnpm $(pnpm --version) ready."

# ── 7. Install workspaces ────────────────────────────────────────────────────
run_pnpm_install() {
  local dir=$1
  local name=$2
  # On reinstall, --force re-verifies every linked file in node_modules and
  # re-fetches anything corrupt/missing from the pnpm store. Catches the
  # "Cannot find module .../vite/dist/node/chunks/dep-XXX.js" failure mode.
  local extra_args=()
  if [ "${PROTOVIBE_REINSTALL:-0}" = "1" ]; then
    extra_args+=(--force)
  fi
  step "pnpm install ($name)${extra_args[*]:+ ${extra_args[*]}}"
  if ! ( cd "$dir" && pnpm install "${extra_args[@]}" ); then
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

# ── 8. Create shortcut ───────────────────────────────────────────────────────
step "create desktop shortcut"
node "$PM_DIR/scripts/create-shortcut.js"

# ── 9. Self-test ────────────────────────────────────────────────────────────
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

# ── 10. Final guidance ───────────────────────────────────────────────────────
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
