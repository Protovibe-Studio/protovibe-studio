# Protovibe App

This app was created with [Protovibe Studio](https://protovibe-studio.github.io) — an open-source visual builder that reads and writes React code directly.

## Run project locally in Protovibe Studio desktop app

The best way to run the project is to do it via Protovibe Studio app, as it allows you to easily update Protovibe to the newest version

1. Install [Protovibe Studio](https://protovibe-studio.github.io)
2. Clone this repo into ~/Protovibe/projects/ folder
3. Run project via Protovibe interface

## Run locally without Protovibe app

**Prerequisites:** Node.js, pnpm

1. Install dependencies: `pnpm install`
2. Start the editor: `pnpm dev`

## Deploy

Build for production: `pnpm build`

This bundles your app into a `dist/` folder of static files (HTML, CSS, JS) that you can upload to any web host — like GitHub Pages, Netlify, or Vercel — to share your app online.
But you can also publish your app from inside the Protovibe editor with a click.

## Maintenance notes

**Don't un-pin Tailwind or remove the `pnpm.supportedArchitectures` block in `package.json`.** `tailwindcss`/`@tailwindcss/vite` are pinned to `4.1.14` and pnpm also installs the `wasm32` oxide build so live CSS generation works on StackBlitz (4.2/4.3's WASM scanner misses new classes). No effect on local machines. To upgrade, bump the pin and re-test new classes on StackBlitz first.
