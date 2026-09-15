// plugins/protovibe/src/ui/components/specs/specsExport.ts
// Client-side export actions: rich-text clipboard (Notion / Google Docs paste)
// and file downloads. Rendering is shared with the backend (shared/specs-export).
import type { SpecBundle } from '../../../shared/specs';
import { renderHtml, renderMarkdown } from '../../../shared/specs-export';

/** Body-only HTML for the clipboard (a full document confuses some editors). */
function clipboardHtml(bundle: SpecBundle, publishedUrl: string): string {
  const full = renderHtml(bundle, publishedUrl);
  const m = full.match(/<body>([\s\S]*)<\/body>/);
  return m ? m[1].trim() : full;
}

export async function copySpecForDocs(bundle: SpecBundle, publishedUrl: string): Promise<void> {
  const html = clipboardHtml(bundle, publishedUrl);
  const text = renderMarkdown(bundle, publishedUrl);
  const clip = navigator.clipboard as Clipboard | undefined;
  if (clip && typeof ClipboardItem !== 'undefined' && clip.write) {
    await clip.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
    return;
  }
  await clip?.writeText(text);
}

export function downloadText(content: string, filename: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
