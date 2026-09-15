// plugins/protovibe/src/shared/specs-export.ts
// Renders a spec as Markdown or HTML. Used by the /__specs-export endpoint (file
// downloads) and by the editor's "Copy for Notion / Google Docs" action
// (clipboard), so the two never drift.

import type { SpecBundle, SpecAnnotation } from './specs';
import { annotationTitle, isAnnotation } from './specs';

export type SpecExportFormat = 'markdown' | 'html';

export interface SpecExportOptions {
  format: SpecExportFormat;
  /** Published site root (e.g. https://x.pages.dev). Empty ⇒ no links. */
  publishedUrl?: string;
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Todo',
  discuss: 'To discuss',
  verified: 'Verified',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function joinUrl(base: string, rel: string): string {
  return base.replace(/\/+$/, '') + (rel.startsWith('/') ? rel : `/${rel}`);
}

/** Deep link into the published app for an annotation's state. */
export function stateLink(publishedUrl: string, a: SpecAnnotation): string {
  return joinUrl(publishedUrl, a.state.path);
}

/** Deep link into the published read-only viewer. */
export function viewerLink(publishedUrl: string, specId: string, itemId: string): string {
  return joinUrl(publishedUrl, `/specs.html?spec=${encodeURIComponent(specId)}&item=${encodeURIComponent(itemId)}`);
}

export function renderSpecExport(bundle: SpecBundle, opts: SpecExportOptions): string {
  return opts.format === 'html' ? renderHtml(bundle, opts.publishedUrl || '') : renderMarkdown(bundle, opts.publishedUrl || '');
}

export function renderMarkdown(bundle: SpecBundle, publishedUrl: string): string {
  const out: string[] = [`# ${bundle.spec.title}`, ''];
  let n = 0;
  for (const item of bundle.items) {
    if (!isAnnotation(item)) {
      out.push(item.level === 'big' ? `## ${item.title}` : `### ${item.title}`, '');
      continue;
    }
    n++;
    out.push(`#### ${n}. ${annotationTitle(item)}`);
    if (item.status) out.push(`**Status:** ${STATUS_LABELS[item.status] ?? item.status}`, '');
    else out.push('');
    if (item.text.trim()) out.push(item.text.trim(), '');
    if (publishedUrl) {
      out.push(`[Open state](${stateLink(publishedUrl, item)}) · [Open in viewer](${viewerLink(publishedUrl, bundle.spec.id, item.id)})`, '');
    } else {
      out.push(`State: \`${item.state.path}\``, '');
    }
  }
  return out.join('\n').trimEnd() + '\n';
}

export function renderHtml(bundle: SpecBundle, publishedUrl: string): string {
  const parts: string[] = [`<h1>${escapeHtml(bundle.spec.title)}</h1>`];
  let n = 0;
  for (const item of bundle.items) {
    if (!isAnnotation(item)) {
      parts.push(item.level === 'big' ? `<h2>${escapeHtml(item.title)}</h2>` : `<h3>${escapeHtml(item.title)}</h3>`);
      continue;
    }
    n++;
    parts.push(`<h4>${n}. ${escapeHtml(annotationTitle(item))}</h4>`);
    if (item.status) parts.push(`<p><strong>Status:</strong> ${escapeHtml(STATUS_LABELS[item.status] ?? item.status)}</p>`);
    for (const para of item.text.trim().split(/\n{2,}/)) {
      if (para.trim()) parts.push(`<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`);
    }
    if (publishedUrl) {
      parts.push(
        `<p><a href="${escapeHtml(stateLink(publishedUrl, item))}">Open state</a> · ` +
        `<a href="${escapeHtml(viewerLink(publishedUrl, bundle.spec.id, item.id))}">Open in viewer</a></p>`,
      );
    } else {
      parts.push(`<p><em>State:</em> <code>${escapeHtml(item.state.path)}</code></p>`);
    }
  }
  const body = parts.join('\n');
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>${escapeHtml(bundle.spec.title)}</title></head><body>\n${body}\n</body></html>\n`;
}
