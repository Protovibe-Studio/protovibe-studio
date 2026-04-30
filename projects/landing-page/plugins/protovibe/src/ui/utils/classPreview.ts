// Temporarily applies inline CSS on the selected canvas elements so the user
// can preview an autocomplete option before committing. On clear() we restore
// the original `style` attribute verbatim; the subsequent commit + HMR
// repaints with the persisted source change.
//
// We use inline styles (rather than swapping class names) so previews work
// without depending on Tailwind's JIT to have compiled the candidate class.
// Inline styles also override class styles cleanly, and `!important` on each
// declaration guarantees the preview wins even if the existing utility is
// already !important.

export interface StyleLivePreviewHandle {
  apply: (els: HTMLElement[], styles: Record<string, string>) => void;
  clear: () => void;
}

const camelToKebab = (s: string) =>
  s.startsWith('--') ? s : s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function createClassLivePreview(): StyleLivePreviewHandle {
  let snapshots: { el: HTMLElement; original: string | null }[] = [];

  const clear = () => {
    for (const { el, original } of snapshots) {
      if (original === null) el.removeAttribute('style');
      else el.setAttribute('style', original);
    }
    snapshots = [];
  };

  const apply = (els: HTMLElement[], styles: Record<string, string>) => {
    clear();
    const entries = Object.entries(styles).filter(([, v]) => v !== '' && v != null);
    if (!entries.length) return;
    for (const el of els) {
      snapshots.push({ el, original: el.getAttribute('style') });
      for (const [prop, value] of entries) {
        el.style.setProperty(camelToKebab(prop), value, 'important');
      }
    }
  };

  return { apply, clear };
}
