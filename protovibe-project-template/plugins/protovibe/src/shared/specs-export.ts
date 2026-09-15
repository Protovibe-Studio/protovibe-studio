// plugins/protovibe/src/shared/specs-export.ts
// Renders a spec as Markdown or HTML. Used by the /__specs-export endpoint (file
// downloads) and by the editor's "Copy for Notion / Google Docs" action
// (clipboard), so the two never drift.

import type { SpecBundle, SpecAnnotation } from './specs';
import { isAnnotation, SPEC_STATUS_CONFIG } from './specs';

export type SpecExportFormat = 'markdown' | 'html';

export interface SpecExportOptions {
  format: SpecExportFormat;
  /** Published site root (e.g. https://x.pages.dev). Empty ⇒ no links. */
  publishedUrl?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function joinUrl(base: string, rel: string): string {
  return base.replace(/\/+$/, '') + (rel.startsWith('/') ? rel : `/${rel}`);
}

/** Deep link into the published read-only viewer, opened on one annotation. */
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
    const text = item.text.trim() || '(empty annotation)';
    // Counter before the text; continuation lines indented so Markdown keeps the paragraph.
    out.push(`**${n}.** ${text.replace(/\n/g, '\n   ')}`);
    const meta: string[] = [];
    if (item.status) meta.push(`Status: ${SPEC_STATUS_CONFIG[item.status].label}`);
    if (publishedUrl) meta.push(`[View in prototype](${viewerLink(publishedUrl, bundle.spec.id, item.id)})`);
    else meta.push(`State: \`${item.state.path}\``);
    out.push(`   ${meta.join(' · ')}`, '');
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
    const paras = item.text.trim().split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paras.length === 0) paras.push('(empty annotation)');
    paras.forEach((para, i) => {
      const body = escapeHtml(para).replace(/\n/g, '<br>');
      parts.push(i === 0 ? `<p><strong>${n}.</strong> ${body}</p>` : `<p>${body}</p>`);
    });
    const meta: string[] = [];
    if (item.status) meta.push(`<em>Status:</em> ${escapeHtml(SPEC_STATUS_CONFIG[item.status].label)}`);
    if (publishedUrl) meta.push(`<a href="${escapeHtml(viewerLink(publishedUrl, bundle.spec.id, item.id))}">View in prototype</a>`);
    else meta.push(`<em>State:</em> <code>${escapeHtml(item.state.path)}</code>`);
    parts.push(`<p>${meta.join(' · ')}</p>`);
  }
  const body = parts.join('\n');
  return `<!doctype html>\n<html><head><meta charset="utf-8"><title>${escapeHtml(bundle.spec.title)}</title></head><body>\n${body}\n</body></html>\n`;
}
