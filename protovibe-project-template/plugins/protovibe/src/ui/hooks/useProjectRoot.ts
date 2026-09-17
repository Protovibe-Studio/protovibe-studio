// plugins/protovibe/src/ui/hooks/useProjectRoot.ts
//
// The project's absolute folder path on the user's disk, e.g.
// "/Users/protovibe/projects/MyProject". Vite is the source of truth: the dev
// server resolves "." against `process.cwd()` and hands the path back, so the
// UI never has to guess it.
import { useEffect, useState } from 'react';

/** Absolute path of the project folder, or null until the dev server answers. */
export function useProjectRoot(): string | null {
  const [root, setRoot] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/__resolve-file-path?file=.')
      .then(r => r.json())
      .then(d => { if (!cancelled) setRoot(d.absolutePath ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return root;
}
