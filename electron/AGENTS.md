# Protovibe Electron shell

Desktop wrapper around `../protovibe-project-manager`. This is an independent sub-project: its own `package.json`, its own `node_modules`. Do not modify the manager or template from here — the shell only *consumes* their contracts.

## Architecture

The manager's backend is Vite dev-server middleware, so the shell spawns `pnpm --dir protovibe-project-manager dev` as a child process, parses the bound port from stdout, and points a `BrowserWindow` at `http://127.0.0.1:<port>`. The built `dist/` of the manager is NOT servable (no `/api` middleware outside `vite dev`).

Zero-dev-tools machines are supported by shimming the toolchain:

- `node` → the app's own Electron binary with `ELECTRON_RUN_AS_NODE=1`
- `pnpm` → bundled standalone `pnpm.cjs` (from the `pnpm` npm package, pinned) run through that node

Shims live in `~/.protovibe/toolchain/bin` and are rewritten on every boot (`src/toolchain.js`). They are prepended to `PATH` for the spawned vite process, so every transitive spawn (project dev servers, `pnpm install`, template postinstall) resolves them. git is NOT bundled — the manager's `git-engine.js` lazily downloads an embedded git when no system git exists.

**Never disable Electron's `runAsNode` fuse** — the entire toolchain depends on `ELECTRON_RUN_AS_NODE`.

## Contracts honored (read-only dependencies)

- `../protovibe-project-manager/vite.config.js` — port stdout format (`Local: http://localhost:<port>`), `PROTOVIBE_NO_OPEN`, `/api/projects` health endpoint, in-app updater writing `protovibe-project-manager.pending/`.
- `../protovibe-project-manager/scripts/create-shortcut.js` — `~/.protovibe/project-path` convention and the `.pending → live` swap ported into `src/staged-update.js`.
- Electron major must ship Node major 22 (see repo `.nvmrc`); pin exact electron version.

## Dev mode

`pnpm dev` runs `electron . --protovibe-repo=..` — uses the checked-out repo as the install root, skips first-run extraction, resolves `pnpm.cjs` from `electron/node_modules`, but still writes shims and applies pending swaps, so the spawn chain matches production.

Deep-link testing in dev: macOS requires `app.setAsDefaultProtocolClient('protovibe', process.execPath, [appDir])`-style registration (handled in `src/deeplink.js`); test with `open "protovibe://..."`.

## Release

Tag `shell-v*` triggers `.github/workflows/electron-release.yml`: builds mac arm64+x64 dmg+zip, signs (Developer ID), notarizes, publishes to GitHub Releases for electron-updater. The build job runs in the `release-signing` environment, so it PAUSES for the maintainer's approval before signing/publishing (same gate as source releases). The shell's version is independent of manager/template versions — those still update via the in-app zipball updater.

Cut a shell release from the **repo root** (not here), because the shell never ships alone — it always drags a full source release along:

- `npm run bump:shell` — bump only `electron/package.json` (patch).
- `npm run release:all` — bump manager+template+shell, then tag `source-v*` **and** `shell-v*` (both gated by your approval). Equivalent to `npm run release -- --shell --bump all` (here `all` means everything, shell included).
- `npm run release -- --shell --bump shell` — shell-only fix: bump just the shell, re-cut the source unchanged.

The `shell-v*` tag must equal `electron/package.json` exactly (electron-builder publishes under that version), so it can't auto-suffix like source tags — bump the shell to get a fresh tag.
