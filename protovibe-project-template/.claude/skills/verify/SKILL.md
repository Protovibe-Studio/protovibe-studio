---
name: verify
description: Build, launch, and drive the Protovibe shell (template + vite-plugin-protovibe) to verify UI/plugin changes at runtime.
---

# Verifying protovibe-project-template / plugins/protovibe changes

## Build & launch

```bash
cd protovibe-project-template
pnpm install          # postinstall also builds plugins/protovibe into dist/
pnpm dev              # vite on http://localhost:3000
```

- After editing plugin source (`plugins/protovibe/src/**`), rebuild with
  `pnpm --dir plugins/protovibe build` — the dev server injects
  `plugins/protovibe/dist/ui/{inspector,bridge,sketchpad-bridge}.js` at
  page-serve time, so a rebuild takes effect on the next page load without
  restarting vite.
- BUT server-side plugin code (`dist/index.js` — middleware, endpoints) is NOT
  reloaded by the plugin's automatic `server.restart()`: node's ESM cache keeps
  the old module. Kill the `pnpm dev` process and start it again to load new
  server-side plugin code.
- The Protovibe shell (editor UI) is at `http://localhost:3000/protovibe.html`
  (`?tab=app|components|sketchpad`). The bare app is at `/`.
- Use `--noproxy localhost` with curl; outbound proxy breaks localhost otherwise.

## Drive it

- Playwright lives in the monorepo **root** `node_modules` (`@playwright/test`);
  run driver scripts from the repo root so module resolution works.
  Pre-installed Chromium: launch with
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`
  (check the versioned dir name under `/opt/pw-browsers/`).
- The shell renders the user app in an iframe; shell UI (banners, overlays,
  nav) is in the top document, Vite's `vite-error-overlay` is inside the
  iframe.
- Shell overlays may be rendered once per iframe tab wrapper (app, sketchpad,
  components) — `getByText` can hit strict-mode violations; iterate `.all()`
  and check `isVisible()` per element.

## Useful flows

- Simulate an app crash: append `\nconst broken = {;\n` to `src/App.tsx`
  (HMR pushes the compile error within ~1–2s); restore the file to recover.
  Rarely — especially right after a plugin-rebuild-triggered server restart —
  the client receives the `hmr update` but never re-fetches the module, so the
  app silently keeps running the last good code and no overlay appears; retry
  the break rather than chasing it.
- Fresh page load while broken shows NO `vite-error-overlay` — the entry
  module request just 500s and the canvas stays blank (bridge.ts detects this
  via failing same-origin script loads).
