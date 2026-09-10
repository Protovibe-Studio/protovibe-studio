// plugins/protovibe/src/ui/events/gitMenu.ts
// Lets anything that runs a git operation pop the bottom-bar Git menu open.
// A sync can be started from the bottom-right "Someone made an update" banner,
// where a failure would otherwise only be a toast that scrolls away — and the
// explanation of what to do next lives in the menu. So on failure we open it.

export const PV_GIT_MENU_OPEN_EVENT = 'pv-git-menu-open';

export function openGitMenu(): void {
  window.dispatchEvent(new CustomEvent(PV_GIT_MENU_OPEN_EVENT));
}
