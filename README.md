# Protovibe

A tool for rapidly creating and managing prototype projects with an AI-assisted visual editor.

## Getting started

### Zero-clone install (recommended — also what you'd paste into a coding agent)

The bootstrap script clones the repo to `~/Protovibe` (or `%USERPROFILE%\Protovibe` on Windows) and runs the full installer.

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe/main/bootstrap.sh | bash
```

**Windows (PowerShell)**

```powershell
iwr -useb https://raw.githubusercontent.com/Protovibe-Studio/protovibe/main/bootstrap.ps1 | iex
```

Override the install location if you don't want it under your home folder:

```bash
curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe/main/bootstrap.sh \
  | PROTOVIBE_DIR=~/code/protovibe bash
```

The bootstrap installs git if missing (via `xcode-select --install` on macOS, `winget install Git.Git` on Windows), clones the repo, then hands off to `install.sh` / `install.bat` which install nvm/Node/pnpm, install all dependencies, and create a desktop shortcut.

### Already cloned the repo?

```bash
./install.sh        # macOS / Linux
install.bat         # Windows (double-click also works)
```

On macOS this opens a small Finder window — drag `Protovibe.app` onto the `Applications` shortcut, then launch it from Launchpad or `/Applications`. On Linux, look for the `Protovibe` launcher on your Desktop. On Windows, the installer places a `Protovibe` shortcut on your Desktop and auto-launches the app the first time.

If you ever move the repo to a different folder, just re-run the installer — the desktop shortcut keeps working.

### Manual install

If you'd rather skip the shortcut/installer and just install deps:

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
