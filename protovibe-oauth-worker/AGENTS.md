# protovibe-oauth-worker

A tiny Cloudflare Worker used by the Protovibe project manager's "Connect to GitHub" feature.

It has exactly one job: exchange a GitHub OAuth authorization `code` for an access token, because the code→token exchange requires the GitHub App client secret, which must never ship inside the locally-running Protovibe app.

## Rules

- Keep this worker minimal — one route (`POST /exchange`), no state, no storage.
- The client secret only exists as a Wrangler secret (`GITHUB_CLIENT_SECRET`). Never write it into any file in this repo.
- No CORS headers are needed: the worker is called server-to-server by the manager's local Vite backend, never from a browser.
- Run commands from this directory (`pnpm install`, `pnpm dev`, `pnpm deploy`). See the monorepo root AGENTS.md for context rules.
