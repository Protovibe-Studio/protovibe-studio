(function () {
  const root = document.documentElement;
  let editorMode = null;
  let enabled = false;
  let restoreTheme;

  function loadFont() {
    if (document.getElementById('pv-lofi-font')) return;
    const link = document.createElement('link');
    link.id = 'pv-lofi-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Balsamiq+Sans:wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  function apply() {
    const next = editorMode !== null
      ? editorMode === 'lofi'
      : new URLSearchParams(location.search).get('lofi') === 'true';
    if (next) {
      if (!enabled) restoreTheme = root.getAttribute('data-theme');
      loadFont();
      root.dataset.theme = 'light';
      root.dataset.pvLofi = 'true';
    } else {
      root.removeAttribute('data-pv-lofi');
      if (enabled) {
        if (restoreTheme === null) root.removeAttribute('data-theme');
        else root.setAttribute('data-theme', restoreTheme);
      }
    }
    enabled = next;
  }

  // An explicit editor selection takes precedence over an iframe's deep link.
  window.addEventListener('pv-preview-mode', (event) => {
    if (!['light', 'dark', 'lofi'].includes(event.detail)) return;
    editorMode = event.detail;
    apply();
    // Light/dark is a one-time preview selection, as before the lofi overlay.
    // Subsequent app theme changes and navigation must remain free to use it.
    if (editorMode !== 'lofi') root.dataset.theme = editorMode;
  });
  window.addEventListener('themechange', (event) => {
    // Remember preferences changed by the app while lofi temporarily paints
    // light. Removing the overlay must restore the latest resolved preference.
    if (enabled && ['light', 'dark'].includes(event.detail?.resolved)) {
      restoreTheme = event.detail.resolved;
    }
    apply();
  });
  window.addEventListener('popstate', apply);

  // Query-string navigation does not emit popstate. Observe it without
  // changing URLs, the app router, or any persisted theme preference.
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      apply();
      return result;
    };
  }
  apply();
})();
