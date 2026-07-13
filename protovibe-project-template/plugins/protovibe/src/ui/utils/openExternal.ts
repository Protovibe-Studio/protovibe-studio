// Opens a link in the user's real web browser instead of spawning a new window
// inside the desktop shell. When Protovibe runs wrapped in an Electron shell,
// a plain `window.open(url, '_blank')` (or a `target="_blank"` anchor) is
// intercepted by the shell and opened as a new in-app Electron window. That is
// almost never what we want for external links — docs, published sites, the
// GitHub App install flow, the "Open in new tab" canvas action, etc. should all
// hand off to the system browser.
//
// This helper prefers an Electron `openExternal` bridge when one is exposed on
// the window, and otherwise falls back to a normal `window.open`, which in a
// plain browser correctly opens a new browser tab.

import type { MouseEvent } from 'react';

type ElectronBridge = {
  openExternal?: (url: string) => void | Promise<unknown>;
  shell?: { openExternal?: (url: string) => void | Promise<unknown> };
};

function getElectronBridge(): ElectronBridge | null {
  const w = window as unknown as {
    electronAPI?: ElectronBridge;
    electron?: ElectronBridge;
  };
  return w.electronAPI ?? w.electron ?? null;
}

/**
 * Open `url` in the user's default web browser rather than a new Electron
 * window. Safe to call from any renderer context.
 */
export function openInBrowser(url: string): void {
  if (!url) return;

  const bridge = getElectronBridge();
  const openExternal = bridge?.openExternal ?? bridge?.shell?.openExternal;
  if (openExternal) {
    try {
      openExternal(url);
      return;
    } catch {
      // Fall through to the browser-based fallback below.
    }
  }

  // Plain browser: opens a new browser tab. `noopener` also prevents Electron
  // from handing the new context back to the opener window.
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a URL served by Protovibe itself (the manager, the dev server) in a new
 * window. Deliberately does NOT use the Electron bridge: inside the desktop
 * shell these belong in an in-app window, not the system browser. In a plain
 * browser this is an ordinary new tab.
 */
export function openLocalWindow(url: string): void {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Click handler for `<a>` elements that should open in the system browser.
 * Prevents the default navigation (which the shell would capture) and routes
 * through `openInBrowser`.
 */
export function handleExternalLinkClick(
  e: MouseEvent<HTMLAnchorElement>,
): void {
  const href = e.currentTarget.href;
  if (!href) return;
  e.preventDefault();
  openInBrowser(href);
}
