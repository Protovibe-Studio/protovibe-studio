// plugins/protovibe/src/ui/components/specs/SpecsDocList.tsx
// Level 1 of the Specs panel: every spec document, with create / export /
// delete (titles are edited inside the spec), plus the note that specs publish alongside the prototype.
import React, { useRef, useState } from 'react';
import { BookOpen, Plus, MoreHorizontal, Trash2, Copy, Download, ExternalLink, Info, Search } from 'lucide-react';
import { theme } from '../../theme';
import type { SpecSummary } from '../../../shared/specs';
import { Menu, iconBtn, primaryBtn, hoverBg } from './specsUi';
import { handleExternalLinkClick } from '../../utils/openExternal';

export type SpecExportAction = 'copy' | 'markdown' | 'html';

export const SpecsDocList: React.FC<{
  specs: SpecSummary[];
  publishedUrl: string;
  busy: boolean;
  onOpen: (specId: string) => void;
  onCreate: () => void;
  onDelete: (specId: string) => void;
  onExport: (specId: string, action: SpecExportAction) => void;
}> = ({ specs, publishedUrl, busy, onOpen, onCreate, onDelete, onExport }) => {
  const viewerUrl = publishedUrl ? `${publishedUrl.replace(/\/+$/, '')}/specs.html` : '';
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? specs.filter((s) => (s.title || 'Untitled spec').toLowerCase().includes(q)) : specs;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.text_default }}>Specs</span>
        <button data-testid="specs-new" style={primaryBtn} onClick={onCreate} disabled={busy}>
          <Plus size={13} /> New spec
        </button>
      </div>

      {/* search (only once there is something to search) */}
      {specs.length > 0 && (
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, color: theme.text_tertiary, pointerEvents: 'none' }} />
            <input
              data-testid="specs-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); } }}
              placeholder="Search specs…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '5px 10px 5px 28px',
                background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: 6,
                color: theme.text_default, fontSize: 11, outline: 'none', fontFamily: theme.font_ui,
              }}
            />
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {specs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: theme.text_tertiary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <BookOpen size={40} strokeWidth={1.5} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13 }}>No specs yet. A spec is a walkthrough of annotated prototype states.</span>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: theme.text_tertiary, fontSize: 12, lineHeight: 1.5 }}>
            No specs match “{query.trim()}”.
          </div>
        ) : visible.map((s) => (
          <SpecRow
            key={s.id}
            spec={s}
            onOpen={() => onOpen(s.id)}
            onDelete={() => onDelete(s.id)}
            onExport={(a) => onExport(s.id, a)}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', fontSize: 11, lineHeight: 1.4, color: theme.text_secondary, background: theme.bg_low, borderTop: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1, color: theme.accent_default }} />
        <span>
          {viewerUrl ? (
            <>Specs are published with your prototype at{' '}
              <a href={viewerUrl} target="_blank" rel="noreferrer" onClick={handleExternalLinkClick} style={{ color: theme.accent_default, textDecoration: 'none', wordBreak: 'break-all' }}>{viewerUrl}</a>.
            </>
          ) : (
            <>When you publish the prototype, specs are included as a read-only viewer at <span style={{ color: theme.text_default }}>/specs.html</span>.</>
          )}{' '}
          <a href="/specs.html" target="_blank" rel="noreferrer" onClick={handleExternalLinkClick} style={{ color: theme.accent_default, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Preview viewer <ExternalLink size={10} style={{ verticalAlign: '-1px' }} />
          </a>
        </span>
      </div>

    </>
  );
};

const SpecRow: React.FC<{
  spec: SpecSummary;
  onOpen: () => void;
  onDelete: () => void;
  onExport: (a: SpecExportAction) => void;
}> = ({ spec, onOpen, onDelete, onExport }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const count = spec.annotationCount;
  return (
    <div
      role="button"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px 10px 16px',
        borderBottom: `1px solid ${theme.border_default}`, cursor: 'pointer', fontFamily: theme.font_ui,
      }}
      {...hoverBg}
    >
      <BookOpen size={15} style={{ color: theme.text_tertiary, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {spec.title || 'Untitled spec'}
        </span>
        <span style={{ fontSize: 11, color: theme.text_tertiary }}>
          {count === 0 ? 'No annotations' : count === 1 ? '1 annotation' : `${count} annotations`}
        </span>
      </div>
      <button ref={menuRef} style={iconBtn} data-tooltip="More" onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}>
        <MoreHorizontal size={15} />
      </button>
      <Menu
        open={menuOpen}
        anchorRef={menuRef}
        onClose={() => setMenuOpen(false)}
        width={210}
        items={[
          { label: 'Copy for Notion / Google Docs', icon: <Copy size={13} />, onSelect: () => onExport('copy') },
          { label: 'Download Markdown', icon: <Download size={13} />, onSelect: () => onExport('markdown') },
          { label: 'Download HTML', icon: <Download size={13} />, onSelect: () => onExport('html') },
          { label: 'Delete spec', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: onDelete },
        ]}
      />
    </div>
  );
};
