#!/usr/bin/env bash
# Start the Protovibe template dev server and open /protovibe.html
# in VS Code's Simple Browser inside the Codespace.
set -u

cd "$(dirname "$0")/.."

PROTOVIBE_NO_OPEN=1 pnpm --dir protovibe-project-template dev &
DEV_PID=$!

# Wait for the dev server to be reachable on :3000
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:3000/"; then break; fi
  sleep 1
done

# Open /protovibe.html in VS Code's Simple Browser (Codespaces only)
if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/protovibe.html"
  if [ -n "${BROWSER:-}" ] && [ -x "$BROWSER" ]; then
    "$BROWSER" "$URL" || true
  fi
  echo ""
  echo "  Protovibe editor: $URL"
  echo ""
fi

wait "$DEV_PID"
