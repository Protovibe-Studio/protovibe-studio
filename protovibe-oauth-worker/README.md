# Protovibe OAuth worker

A Cloudflare Worker that backs the **New Project → Connect to GitHub** flow in the Protovibe project manager.

The manager runs locally on the user's machine and can't hold the GitHub App client secret, so the OAuth code→token exchange happens here:

```
Browser ── authorize ──▶ github.com ── redirect ──▶ local manager (127.0.0.1:5173)
                                                        │  POST {code}
                                                        ▼
                                              this worker /exchange
                                                        │  client_id + client_secret
                                                        ▼
                                                   github.com ──▶ {access_token}
```

## API

`POST /exchange` with JSON body `{ "code": "<oauth code>" }` →
`200 { "access_token": "..." }` or `400 { "error": "..." }`.

## One-time setup

### 1. Create the GitHub App

On github.com: **Settings → Developer settings → GitHub Apps → New GitHub App**

1. **Name**: `Protovibe`.
2. **Homepage URL**: anything (e.g. the Protovibe repo URL).
3. **Callback URL**: `http://127.0.0.1:5173/api/github/oauth/callback`
4. **Uncheck** "Expire user authorization tokens" (Protovibe v1 does not handle refresh tokens).
5. **Check** "Request user authorization (OAuth) during installation".
6. Leave "Enable Device Flow" **off**.
7. **Webhook**: uncheck "Active" (no webhook needed).
8. **Repository permissions**:
   - **Contents: Read and write** (read for cloning; write keeps the future "Collaborate via GitHub" push feature possible)
   - **Metadata: Read-only** (added automatically)
9. **Where can this GitHub App be installed?**: **Any account**.
10. Create the app, then on its settings page:
    - Note the **Client ID**.
    - Note the **app slug** (the URL-friendly name in `github.com/apps/<slug>`).
    - **Generate a new client secret** and copy it — you'll store it in the worker next.

### 2. Deploy this worker

```sh
cd protovibe-oauth-worker
pnpm install
# put the real Client ID into wrangler.toml ([vars] GITHUB_CLIENT_ID)
pnpm wrangler secret put GITHUB_CLIENT_SECRET   # paste the client secret
pnpm deploy
```

Note the deployed URL, e.g. `https://protovibe-oauth.<your-subdomain>.workers.dev`.

### 3. Point the manager at the app + worker

Fill in the constants at the top of `protovibe-project-manager/server/github-auth.js`:

- `GITHUB_CLIENT_ID` — the app's Client ID
- `GITHUB_APP_SLUG` — the app slug
- `OAUTH_WORKER_URL` — the deployed workers.dev URL

Each also has an environment-variable override (`PROTOVIBE_GITHUB_CLIENT_ID`, `PROTOVIBE_GITHUB_APP_SLUG`, `PROTOVIBE_OAUTH_WORKER_URL`) which is handy for testing before committing the constants.

## Notes

- Logging out in Protovibe only deletes the local token file (`~/.protovibe/github.json`). Full revocation is done by the user on GitHub: **Settings → Applications → Protovibe → Revoke**.
- Local development: `pnpm dev` runs the worker at `http://localhost:8787`; point the manager at it with `PROTOVIBE_OAUTH_WORKER_URL=http://localhost:8787`.
