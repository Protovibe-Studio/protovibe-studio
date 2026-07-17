# Protovibe auto-update security

Protovibe's in-app updater downloads the manager/template source from GitHub and
runs it (it runs `pnpm install`, and the new manager becomes the process serving
your app). If it pulled unverified code, anyone who could land code on the repo —
a stolen token, a bad dependency in CI, a hijacked account — could ship malware to
every user's next update.

To prevent that, updates are **signed**. Every release is signed with an **Ed25519
private key that never lives in the repository**, and the client verifies that
signature against a **public key baked into the app** before it will offer or
apply an update. A compromise of the git repo alone is not enough to ship
malware — an attacker would also need the offline signing key.

## How it works

- **Signing key.** An Ed25519 key pair. The public half is embedded in
  `protovibe-project-manager/server/release-verify.js` (`PUBLIC_KEY_PEM`). The
  private half is held by the maintainer and stored as the GitHub Actions secret
  `PROTOVIBE_SIGNING_KEY`, scoped to a protected environment (below).
- **Signed release.** `.github/workflows/source-release.yml` builds a source
  bundle (`protovibe-source.zip`), writes a `manifest.json`
  (`{ managerVersion, templateVersion, artifact, artifactSha256, … }`), signs the
  manifest (`manifest.json.sig`), and publishes all three as a GitHub Release
  tagged `source-v*`.
- **Passkey approval (Architecture A).** The signing job runs in the
  `release-signing` environment, which has a **required reviewer**. GitHub pauses
  the job until you approve it in the UI — an approval authenticated by your
  GitHub passkey/2FA. Nothing is signed or published without that second factor.
- **Client verification.** The in-app updater (`vite.config.js`) finds the newest
  `source-v*` release, downloads `manifest.json` + `.sig`, and verifies the
  signature against the embedded public key. Only then does it compare versions
  (**it never downgrades**), download the artifact, check its SHA-256 against the
  signed manifest, and apply. Any failure → the update is refused and the user is
  never offered it.

## One-time setup (maintainer)

1. **Generate the key pair** on your own machine:

   ```
   node scripts/gen-signing-key.mjs
   ```

2. **Embed the public key.** Paste the printed PUBLIC key into
   `protovibe-project-manager/server/release-verify.js`, replacing the value of
   `PUBLIC_KEY_PEM` (currently a placeholder — until you do this, the app refuses
   all updates by design). Commit that change.

3. **Store the private key** as a GitHub Actions secret:
   - Repo → Settings → Environments → **New environment** → name it
     `release-signing`.
   - Under that environment, add **Required reviewers** and select yourself.
   - Under that environment, add a secret `PROTOVIBE_SIGNING_KEY` = the PRIVATE
     key PEM.
   - Keep an offline backup of the private key (password manager / hardware-backed
     store). **Never commit it.** Do not store it as a plain repo-level secret —
     scoping it to the environment is what ties its use to your approval.

   > Note: environment protection rules (required reviewers) are free for public
   > repos; private repos generally need GitHub Pro/Team.

## Cutting a release

1. Bump versions in `protovibe-project-manager/package.json` and/or
   `protovibe-project-template/package.json`, commit, and push.
2. Tag and push: `git tag source-v1.2.3 && git push origin source-v1.2.3`.
3. The workflow starts and **waits for your approval**. Approve it in GitHub
   (e.g. from your phone) — your passkey authenticates the approval.
4. The job signs and publishes the release. Clients will verify and offer it.

## Key rotation

Because the app self-updates, a signed release can also carry a new embedded
public key — an attacker without the current private key can never get a release
verified, so they can never get their key adopted. To rotate:

1. Generate a new pair.
2. Ship one normal release (signed with the **old** key) whose only change is the
   new `PUBLIC_KEY_PEM`.
3. After clients have taken that update, replace `PROTOVIBE_SIGNING_KEY` with the
   new private key and sign subsequent releases with it.

## What this does and does not cover

- ✅ A compromised repo, a leaked token, a malicious CI dependency, or an
  accidental tag push cannot ship an update — none can produce a valid signature
  or pass the approval gate.
- ⚠️ It assumes the signing key stays secret and your GitHub 2FA is
  phishing-resistant (passkey/hardware key preferred over TOTP/SMS). If you need
  to survive a *total* GitHub-account takeover including your authenticator, move
  the key fully off GitHub (sign locally / on a hardware key) instead of storing
  it as an environment secret.
- The Electron shell binary updates through a separate path
  (`electron/src/updater.js` + `electron-release.yml`), protected by Apple
  Developer ID code-signing and notarization **and** the same `release-signing`
  approval gate as source releases — its build job runs in that environment, so an
  accidental or malicious `shell-v*` tag cannot ship a build without your approval.
  The shell is never released on its own: `npm run release -- --shell` always cuts
  a matching source release too (see "Cutting a release" above).
