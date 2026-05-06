#!/usr/bin/env bash
# Build the Protovibe.app template using Platypus.
#
# Run this ONCE after installing Platypus, then commit the result
# (scripts/assets/Protovibe-template.app/) to git. install.sh on end-user
# machines duplicates this template — it never invokes Platypus itself.
#
# Prereq:
#   brew install --cask platypus
#   open /Applications/Platypus.app    # → menu Platypus → Install Command Line Tool…
#
# Usage:
#   bash protovibe-project-manager/scripts/build-mac-template.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$SCRIPT_DIR/assets"
TEMPLATE_APP="$ASSETS/Protovibe-template.app"
ICON="$ASSETS/icon.icns"

PLATYPUS=""
if command -v platypus >/dev/null 2>&1; then
  PLATYPUS="$(command -v platypus)"
elif [ -x "/Applications/Platypus.app/Contents/Resources/platypus_clt" ]; then
  PLATYPUS="/Applications/Platypus.app/Contents/Resources/platypus_clt"
else
  echo "Platypus is not installed. Install it with:"
  echo "  brew install --cask platypus"
  echo "Then open Platypus and run 'Platypus → Install Command Line Tool…' from the menu."
  exit 1
fi

if [ ! -f "$ICON" ]; then
  echo "Missing icon: $ICON"
  exit 1
fi

# The script baked into the bundle is a tiny shim that defers to
# ~/.protovibe/launch.sh — install.sh regenerates that file on every run, so
# the .app stays valid across project moves and updates without re-signing.
SHIM="$(mktemp -t protovibe-shim).sh"
cat > "$SHIM" <<'SHIM_EOF'
#!/usr/bin/env bash
# Protovibe launcher shim — baked into Protovibe.app/Contents/Resources/script.
# Defers to ~/.protovibe/launch.sh, which install.sh keeps up-to-date.
LAUNCH="$HOME/.protovibe/launch.sh"
if [ ! -x "$LAUNCH" ]; then
  echo "Protovibe is not installed."
  echo "Run ./install.sh from the Protovibe project folder, then re-launch this app."
  exit 1
fi
exec bash "$LAUNCH"
SHIM_EOF
chmod +x "$SHIM"

rm -rf "$TEMPLATE_APP"

# platypus_clt expects ScriptExec + MainMenu.nib at /usr/local/share/platypus
# (populated by Platypus's "Install Command Line Tool…" menu item, which
# requires sudo). We sidestep that by decoding ScriptExec from the bundle's
# .b64 into a temp dir and passing -e / -E so no privileged install is needed.
PLATYPUS_RES="$(dirname "$PLATYPUS")"
STAGE="$(mktemp -d -t protovibe-platypus)"
trap 'rm -rf "$STAGE" "$SHIM"' EXIT

base64 -d -i "$PLATYPUS_RES/ScriptExec.b64" -o "$STAGE/ScriptExec"
chmod +x "$STAGE/ScriptExec"
cp -R "$PLATYPUS_RES/MainMenu.nib" "$STAGE/MainMenu.nib"

# Output type 'Text Window' renders stdout/stderr in a Cocoa NSTextView in the
# app's own window — own dock icon, own Cmd-Q. Default behavior keeps the
# window open after the script exits, which matches our UX (user sees status,
# closes when they want).
"$PLATYPUS" \
  -a 'Protovibe' \
  -o 'Text Window' \
  -p '/bin/bash' \
  -i "$ICON" \
  -I 'com.protovibe.app' \
  -u 'Protovibe' \
  -e "$STAGE/ScriptExec" \
  -E "$STAGE/MainMenu.nib" \
  -y \
  "$SHIM" "$TEMPLATE_APP"

rm -f "$SHIM"

# Strip the quarantine bit Platypus may set (it ad-hoc signs internally;
# our installer re-signs anyway, so this is just hygiene).
xattr -dr com.apple.quarantine "$TEMPLATE_APP" 2>/dev/null || true

echo ""
echo "Built: $TEMPLATE_APP"
echo "Commit this directory to git:"
echo "  git add $TEMPLATE_APP"
echo "  git commit -m 'Add Platypus template for Mac launcher'"
