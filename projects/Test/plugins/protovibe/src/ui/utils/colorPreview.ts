// Injects a transient CSS override into every canvas iframe so the user
// can see a live preview while dragging color picker sliders. Cleared
// on save/cancel/unmount, after which the file write + HMR repaint with
// the persisted value.

export interface LivePreviewHandle {
  apply: (tokenName: string, themeMode: 'light' | 'dark', oklchValue: string) => void;
  clear: () => void;
}

export function createColorLivePreview(): LivePreviewHandle {
  let styles: HTMLStyleElement[] = [];

  const clear = () => {
    for (const el of styles) el.parentNode?.removeChild(el);
    styles = [];
  };

  const apply = (tokenName: string, themeMode: 'light' | 'dark', oklchValue: string) => {
    const css = `[data-theme="${themeMode}"] { --${tokenName}: ${oklchValue} !important; }`;
    if (styles.length === 0) {
      const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
      for (const iframe of iframes) {
        const doc = iframe.contentDocument;
        if (!doc) continue;
        const style = doc.createElement('style');
        style.setAttribute('data-pv-color-preview', 'true');
        style.textContent = css;
        doc.head.appendChild(style);
        styles.push(style);
      }
    } else {
      for (const style of styles) style.textContent = css;
    }
  };

  return { apply, clear };
}
