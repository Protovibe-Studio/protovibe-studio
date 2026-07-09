# Protovibe shell — your next steps

Everything below is in order. Do them top to bottom.

---

## 1. Test the unsigned build on this Mac

The unsigned artifacts are already built in `electron/dist/`:

The unsigned artifact is `Protovibe-0.1.0-arm64.dmg` (Apple Silicon only — Intel is not supported).

**Important:** on this Mac the shell will *adopt* your real install — it reads `~/.protovibe/project-path` and uses your existing `~/Protovibe` (projects, GitHub login and all). That's the intended migration behavior. If you want a clean-room run instead, launch from Terminal with an isolated home:

```sh
# clean-room run (leaves your real ~/Protovibe untouched)
mkdir -p /tmp/pv-home
HOME=/tmp/pv-home "/Applications/Protovibe.app/Contents/MacOS/Protovibe"
```

Test checklist:

1. Quit the old Protovibe launcher if it's running (or don't — the shell should then say "attached to running server" in the title bar and must NOT kill it when you quit).
2. Open the DMG, drag Protovibe to Applications, launch.
3. First launch on a machine without a previous install shows the splash → "Installing…" → main window. On this Mac (adopting) it should go straight to the main window in a few seconds.
4. Create a project, run it, open its preview. Stop it.
5. Quit Protovibe → check nothing is left: `pgrep -fl vite` should print nothing.
6. Deep link: `open "protovibe://"` — the app should come to front (works only for the installed app in /Applications, not the dev build).

## 2. Test on a fresh macOS VM

Copy `Protovibe-0.1.0-arm64.dmg` into the VM (a VM on this Mac is arm64).

Because the build is **unsigned**, Gatekeeper will block it:

- **macOS 14 (Sonoma) and older:** right-click the app in Applications → Open → "Open" button.
- **macOS 15 (Sequoia) and newer:** right-click-open no longer works. Either:
  - Try to open it once (it gets blocked), then System Settings → Privacy & Security → scroll down → "Open Anyway", **or**
  - remove the quarantine flag in Terminal: `xattr -dr com.apple.quarantine /Applications/Protovibe.app`

This friction is exactly what the Apple Developer account (step 3) removes.

What to verify on the VM (this is the real zero-dev-tools test):

1. No node/pnpm/git installed: `which node pnpm git` → all missing (git may show the Xcode-stub; that's fine, don't accept the CLT install dialog if it appears).
2. Launch → splash shows install progress (needs network; first run downloads ~200 MB of npm deps) → manager UI appears.
3. `~/Protovibe` and `~/.protovibe/toolchain/bin` exist; `~/.protovibe/toolchain/bin/node --version` prints `v22.21.1`.
4. Create a project from the template and run it.
5. Connect GitHub + clone (this also exercises the embedded-git download).
6. Quit → relaunch → should skip installation and boot in seconds.

## 3. Create an Apple Developer account

You need this for Developer ID signing + notarization (removes all Gatekeeper friction).

1. Decide **Individual vs Organization**:
   - *Individual* — fastest (minutes to a day). Apps are signed "Developer ID Application: Maciej Sawicki (TEAMID)". You can switch to an org later but it's a migration.
   - *Organization* — signed with the company name, but requires a registered legal entity **and a D-U-N-S number** (free, but takes days–weeks via https://developer.apple.com/enroll/duns-lookup/), plus you must enroll using an account with legal authority.
   - Recommendation: start as **Individual** unless you already have the legal entity + D-U-N-S sorted.
2. Go to https://developer.apple.com/programs/enroll/ and sign in with the Apple ID you want to own this (consider a dedicated `dev@protovibe...` Apple ID for the org path). Enable two-factor auth on it first — it's required.
3. Pay the **$99/year** fee. Individual approval is usually instant-to-24h.
4. When approved, find your **Team ID**: https://developer.apple.com/account → Membership details → Team ID (10 characters, e.g. `A1B2C3D4E5`). You'll need it later.

## 4. Create the signing certificate + notarization credentials

### 4a. Developer ID Application certificate

Easiest with Xcode (install from App Store if needed):

1. Xcode → Settings → Accounts → add your Apple ID → select your team → "Manage Certificates…" → "+" → **Developer ID Application**.
2. Open **Keychain Access** → My Certificates → find "Developer ID Application: … (TEAMID)" → right-click → **Export** → save as `protovibe-devid.p12` with a strong password. This password becomes a GitHub secret.

(No Xcode? Portal path: Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority → save CSR, then https://developer.apple.com/account/resources/certificates → "+" → Developer ID Application → upload CSR → download cert → double-click to import → export .p12 as above.)

### 4b. App-specific password (for notarization)

1. https://account.apple.com → Sign-In and Security → **App-Specific Passwords** → "+" → name it `protovibe-notarize`.
2. Copy the generated `xxxx-xxxx-xxxx-xxxx` password.

### 4c. Base64 the certificate for CI

```sh
base64 -i protovibe-devid.p12 | pbcopy   # now in your clipboard
```

## 5. Configure GitHub and cut the first signed release

Add these repo secrets (GitHub → protovibe-studio → Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `MAC_CERT_P12_BASE64` | the base64 from step 4c |
| `MAC_CERT_PASSWORD` | the .p12 export password |
| `APPLE_ID` | the Apple ID email from step 3 |
| `APPLE_APP_SPECIFIC_PASSWORD` | from step 4b |
| `APPLE_TEAM_ID` | from step 3.4 |

(`GITHUB_TOKEN` is automatic — nothing to add.)

Then release:

```sh
git tag shell-v0.1.0
git push origin shell-v0.1.0
```

The `Release Electron shell` workflow builds arm64, signs, notarizes (takes 5–15 min at Apple's end), staples, and publishes a GitHub Release containing:

- `Protovibe-arm64.dmg` — human download (version-less name on purpose, see step 7)
- `Protovibe-0.1.0-arm64-mac.zip` + `latest-mac.yml` — consumed by the auto-updater, don't rename

Verify the signed build on any Mac:

```sh
spctl -a -vv /Applications/Protovibe.app      # → "accepted", "Notarized Developer ID"
xcrun stapler validate /Applications/Protovibe.app
```

First-release gotcha to test once: install `shell-v0.1.0`, then push a `shell-v0.1.1` tag and confirm the running app offers "Restart now" and comes back on 0.1.1.

## 6. Shell releases vs app updates — mental model

- **`shell-v*` tags → GitHub Releases → electron-updater**: updates the desktop app itself (Electron, shims, splash). Rare.
- **Pushing to `main`**: the existing in-app updater keeps updating the manager/template source inside `~/Protovibe`, exactly as before. Frequent. No new shell release needed.
- Bump `electron/package.json` version before each `shell-v*` tag (tag must match the version).

## 7. Landing page distribution

The repo is public, so GitHub Releases double as your CDN — no hosting needed. Because the DMG name is version-less, this URL is **permanent** and always serves the newest release:

```
https://github.com/Protovibe-Studio/protovibe-studio/releases/latest/download/Protovibe-arm64.dmg
```

One button on the landing page:

```html
<a class="download-btn primary"
   href="https://github.com/Protovibe-Studio/protovibe-studio/releases/latest/download/Protovibe-arm64.dmg">
  Download for Mac
</a>
<p class="hint">Requires a Mac with Apple Silicon (M1 or newer) running macOS 12+.</p>
```

Intel Macs are not supported. When Windows lands later, the NSIS installer gets a stable name and a second button.

---

## Quick reference

| Thing | Where |
|---|---|
| Unsigned test builds | `electron/dist/*.dmg` (rebuild: `pnpm run dist:unsigned` in `electron/`) |
| Dev mode (repo checkout, no packaging) | `pnpm dev` in `electron/` |
| Release pipeline | `.github/workflows/electron-release.yml`, triggers on `shell-v*` tags |
| Signing/notarization config | `electron/electron-builder.yml` + `electron/build/entitlements.mac.plist` |
| Shell architecture notes | `electron/AGENTS.md` |
