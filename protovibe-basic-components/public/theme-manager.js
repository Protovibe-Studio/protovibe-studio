(function () {
  const STORAGE_KEY = 'user-theme-preference';
  const VALID_THEMES = ['light', 'dark', 'auto'];

  // Safe localStorage wrapper (prevents errors if cookies/storage are blocked)
  const storage = {
    get() {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return null;
      }
    },
    set(value) {
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch (e) {
        console.warn('localStorage is disabled');
      }
    },
  };

  // Helper to get system preference
  const getSystemTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  // Resolves any preference setting to a concrete 'light' or 'dark' value:
  // 1. Explicit 'light'/'dark' → use as-is
  // 2. 'auto', null, or anything else → fall back to system setting
  const resolveTheme = (preference) => {
    if (preference === 'light' || preference === 'dark') return preference;
    return getSystemTheme();
  };

  // Always sets data-theme to 'light' or 'dark' — never 'auto'
  const applyTheme = (preference) => {
    const resolved = resolveTheme(preference);

    // Apply to HTML tag: <html data-theme="dark">
    document.documentElement.setAttribute('data-theme', resolved);

    // Dispatch a custom event so UI components can update their state
    window.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { setting: preference, resolved },
      }),
    );
  };

  // 1. Initialize on load: check user preference → check system → set data-theme
  applyTheme(storage.get());

  // 2. Listen for OS system theme changes in real-time
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const preference = storage.get();
    // Only react if the user has no explicit 'light'/'dark' preference
    if (!preference || preference === 'auto') {
      applyTheme(preference);
    }
  });

  // 3. Expose the Public API globally
  window.ThemeManager = {
    setTheme(theme) {
      if (!VALID_THEMES.includes(theme)) {
        console.error(
          `Invalid theme: "${theme}". Allowed values are: ${VALID_THEMES.join(', ')}`,
        );
        return;
      }
      storage.set(theme);
      applyTheme(theme);
    },
    // Returns 'light', 'dark', or 'auto' (what the user chose)
    getPreference() {
      return storage.get() || 'auto';
    },
    // Returns 'light' or 'dark' (what is actually painted on the screen right now)
    getActiveTheme() {
      return resolveTheme(storage.get());
    },
  };
})();