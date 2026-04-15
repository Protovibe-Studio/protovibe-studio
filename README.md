# Protovibe

A tool for rapidly creating and managing prototype projects with an AI-assisted visual editor.

## Folder structure

### protovibe-project-manager

A React + Vite app that serves as the home screen. It lets you create, duplicate, delete, and run projects. The Vite dev server also exposes a REST/SSE API (`/api/projects/...`) that handles spawning and monitoring project dev servers.

```bash
cd protovibe-project-manager
pnpm install
pnpm dev
```

### protovibe-basic-components && vite-plugin-protovibe (`protovibe-basic-components/plugins/protovibe`)

The template that gets copied when you create a new project. It is a React + Vite app with Tailwind and the `vite-plugin-protovibe` plugin pre-wired.
And a vite plugin that powers the in-browser AI editor (inspector, sketchpad, component hot-reload). It lives inside `protovibe-basic-components` as a pnpm workspace package and gets copied along with the rest of the template when a new project is created — each project has its own independent copy.

```bash
cd protovibe-basic-components
pnpm install
pnpm dev
```

### projects/

Created and managed by the project manager at runtime. Each subdirectory is an independent copy of `protovibe-basic-components`. Do not edit these by hand — use the project manager UI instead to run the projects. *When developing with coding agents, open just the single project folder.*
