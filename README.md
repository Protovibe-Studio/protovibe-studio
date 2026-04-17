# Protovibe

A tool for rapidly creating and managing prototype projects with an AI-assisted visual editor.

## Getting started

The monorepo holds two independent apps. To install both in one shot:

```bash
pnpm install:all
```

This runs `pnpm install` inside `protovibe-project-manager` and `protovibe-project-template` sequentially. There is no pnpm workspace — each app is fully self-contained.

## Folder structure

### protovibe-project-manager

A React + Vite app that serves as the home screen. It lets you create, duplicate, delete, and run projects. The Vite dev server also exposes a REST/SSE API (`/api/projects/...`) that handles spawning and monitoring project dev servers.

```bash
cd protovibe-project-manager
pnpm install
pnpm dev
```

### protovibe-project-template && vite-plugin-protovibe (`protovibe-project-template/plugins/protovibe`)

The template that gets copied when you create a new project. It is a React + Vite app with Tailwind and the `vite-plugin-protovibe` plugin pre-wired. The plugin lives inside the template at `plugins/protovibe` and is consumed via a pnpm `link:` dependency (symlink) — the template's `postinstall` script handles installing the plugin's own deps and building its `dist/`, so a single `pnpm install` at the template root leaves everything ready to run.

```bash
cd protovibe-project-template
pnpm install        # also installs + builds the plugin via postinstall
pnpm dev            # just runs vite
```

When you are actively developing the plugin itself, run its watcher in a second terminal:

```bash
cd protovibe-project-template/plugins/protovibe
pnpm dev            # watches src, rebuilds dist/
```

Because the plugin is symlinked, rebuilds of `plugins/protovibe/dist/` are immediately visible to the template's Vite server — no reinstall needed.

### projects/

Created and managed by the project manager at runtime. Each subdirectory is an independent copy of `protovibe-project-template`. Do not edit these by hand — use the project manager UI instead to run the projects. *When developing with coding agents, open just the single project folder.*
