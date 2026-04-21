# E2E Tests

Playwright tests for Protovibe's core canvas features.

## Prerequisites

The dev server must be running before you start any tests. Playwright does not start it automatically.

From the repo root, start all three processes at once (project manager, plugin watcher, and template dev server):

```bash
pnpm dev
```

Or start only the template (the minimum needed for E2E tests):

```bash
cd protovibe-project-template
pnpm dev
```

The template server starts on `http://localhost:3000`. Keep this terminal open.

## Running tests

From the repo root:

```bash
# Headless run in the terminal
pnpm test:e2e

# Interactive Playwright UI (recommended for debugging)
pnpm test:e2e:ui
```

## What the tests cover

### `sketchpad.spec.ts`

**Test 1 — Frame lifecycle and sketchpad cleanup**
Creates a new sketchpad, adds two frames, deletes them one by one via keyboard, then deletes the sketchpad itself through the panel UI. Verifies each step and leaves the filesystem clean.

**Test 2 — Component drag and undo stack**
Adds a frame, drops a Button component onto it via the component palette, drags it 100px, then walks back through the undo stack (move → component add → frame add) asserting the DOM reverts at each step.

## Notes

- The confirm dialog (`dialog-confirm`) is in the shell frame, not inside the canvas iframe. The tests account for this by querying it on `page` rather than the canvas `frameLocator`.
- Undo relies on Cmd+Z (Mac) / Ctrl+Z (Windows/Linux). The modifier is detected automatically via `process.platform`.
- Tests are not parallelised (`fullyParallel: false`) to avoid canvas state collisions between runs.
