// plugins/protovibe/src/specs-viewer/SpecsViewerApp.tsx
// Read-only viewer for published specs. Loads ./specs-data.json and shows the
// prototype in an iframe next to a sidebar that mirrors the editor's Specs
// panel: a list of annotation cards (lazy iframe thumbnails, full text), and
// a single-annotation view with Prev / Next. There is no top bar.
// Routes as specs.html?spec={id}&item={id} so every annotation is shareable;
// without `item` the sidebar shows the list.
// Same-origin with the prototype, so pinned elements are highlighted by
// touching the iframe document directly — the published app has no bridge.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { theme } from '../ui/theme';
import type { SpecAnnotation, SpecBundle, SpecsViewerData, SpecStatus } from '../shared/specs';
import { annotationsOf, isAnnotation, specIdSelector } from '../shared/specs';
import { SpecThumbnail } from '../ui/components/specs/SpecThumbnail';

const STATUS: Record<SpecStatus, { label: string; color: string }> = {
  todo:     { label: 'Todo',       color: '#A78BFA' },
  discuss:  { label: 'To discuss', color: theme.warning_primary },
  verified: { label: 'Verified',   color: theme.success_default },
};

const SIDEBAR_DEFAULT_W = 260;
const SIDEBAR_MIN_W = 240;
const SIDEBAR_MAX_W = 400;
const SIDEBAR_STORAGE_KEY = 'pv-specs-viewer-sidebar-w';

function loadSidebarWidth(): number {
  try {
    const v = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
    if (v >= SIDEBAR_MIN_W && v <= SIDEBAR_MAX_W) return v;
  } catch { /* ignore */ }
  return SIDEBAR_DEFAULT_W;
}
const HIGHLIGHT_ID = 'pv-spec-highlight';

function readRoute(): { spec: string | null; item: string | null } {
  const p = new URLSearchParams(window.location.search);
  return { spec: p.get('spec'), item: p.get('item') };
}

function writeRoute(spec: string | null, item: string | null, replace = false) {
  const url = new URL(window.location.href);
  if (spec) url.searchParams.set('spec', spec); else url.searchParams.delete('spec');
  if (item) url.searchParams.set('item', item); else url.searchParams.delete('item');
  if (replace) window.history.replaceState({}, '', url.toString());
  else window.history.pushState({}, '', url.toString());
}

/** App URL for a state path, relative to this page's folder. */
function appUrl(path: string): string {
  const base = new URL('./index.html', window.location.href);
  const rel = path.startsWith('/') ? path.slice(1) : path;
  // Keep only search + hash from the state path: the app is a single page.
  const qi = rel.search(/[?#]/);
  return base.pathname + (qi >= 0 ? rel.slice(qi) : '');
}

export const SpecsViewerApp: React.FC = () => {
  const [data, setData] = useState<SpecsViewerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState(readRoute);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string>(() => appUrl('/'));

  useEffect(() => {
    fetch('./specs-data.json', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: SpecsViewerData) => setData(d))
      .catch((e) => setError(`Could not load specs: ${e.message}`));
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const specs = data?.specs ?? [];
  // No spec in the URL ⇒ the sidebar lists the specs (a single published spec
  // opens directly). An unknown spec falls back to the list.
  const bundle: SpecBundle | undefined = useMemo(
    () => (route.spec ? specs.find((b) => b.spec.id === route.spec) : specs.length === 1 ? specs[0] : undefined),
    [specs, route.spec],
  );
  const annotations = useMemo(() => (bundle ? annotationsOf(bundle.items) : []), [bundle]);
  // No item in the URL ⇒ the sidebar shows the card list; an unknown item
  // falls back to the list as well.
  const current: SpecAnnotation | undefined = useMemo(
    () => (route.item ? annotations.find((a) => a.id === route.item) : undefined),
    [annotations, route.item],
  );
  const index = current ? annotations.findIndex((a) => a.id === current.id) : -1;
  const [listScrollEl, setListScrollEl] = useState<HTMLDivElement | null>(null);

  // Normalise the URL to the resolved spec / item once data is in.
  useEffect(() => {
    if (!data) return;
    const specId = bundle?.spec.id ?? null;
    if (route.spec !== specId || (route.item && !current)) {
      writeRoute(specId, current?.id ?? null, true);
      setRoute(readRoute());
    }
  }, [data, bundle, current, route.spec, route.item]);

  // Resizable sidebar.
  const [sidebarW, setSidebarW] = useState(loadSidebarWidth);
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarW;
    const onMove = (ev: MouseEvent) => {
      setSidebarW(Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, startW + ev.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarW((w) => { try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(w)); } catch { /* ignore */ } return w; });
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarW]);

  const select = useCallback((specId: string | null, itemId: string | null) => {
    writeRoute(specId, itemId);
    setRoute(readRoute());
  }, []);

  const step = useCallback((delta: number) => {
    if (!bundle) return;
    const next = annotations[index + delta];
    if (next) select(bundle.spec.id, next.id);
  }, [bundle, annotations, index, select]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || index < 0) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'Escape') { e.preventDefault(); select(bundle?.spec.id ?? null, null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, index, bundle, select]);

  // Navigate the iframe only when the state actually differs, then highlight
  // the pinned element once it renders.
  useEffect(() => {
    if (!current) {
      // Back on a list: drop the highlight but keep the prototype where it is.
      iframeRef.current?.contentDocument?.getElementById(HIGHLIGHT_ID)?.remove();
      return;
    }
    const target = appUrl(current.state.path);
    if (target !== iframeSrc) setIframeSrc(target);
    let attempts = 0;
    let timer = 0;
    const tryHighlight = () => {
      const doc = iframeRef.current?.contentDocument;
      const win = iframeRef.current?.contentWindow;
      if (!doc || !win) return;
      doc.getElementById(HIGHLIGHT_ID)?.remove();
      if (!current.anchor) return;
      const el = doc.querySelector(specIdSelector(current.id)) as HTMLElement | null;
      if (!el) {
        if (++attempts < 25) timer = window.setTimeout(tryHighlight, 200);
        return;
      }
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch { /* ignore */ }
      const box = doc.createElement('div');
      box.id = HIGHLIGHT_ID;
      const place = () => {
        const r = el.getBoundingClientRect();
        Object.assign(box.style, {
          position: 'fixed', left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`,
          border: `2px solid ${theme.accent_default}`, borderRadius: '4px', pointerEvents: 'none', zIndex: '2147483647',
          boxShadow: `0 0 0 4px ${theme.accent_default}33`, boxSizing: 'border-box', transition: 'all 0.15s',
        });
      };
      const badge = doc.createElement('span');
      badge.textContent = String(index + 1);
      Object.assign(badge.style, {
        position: 'absolute', top: '-10px', left: '-10px', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '10px',
        background: theme.accent_default, color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: theme.font_ui, boxSizing: 'border-box',
      });
      box.appendChild(badge);
      place();
      doc.body.appendChild(box);
      win.addEventListener('scroll', place, { capture: true, passive: true });
      win.addEventListener('resize', place);
    };
    timer = window.setTimeout(tryHighlight, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, iframeSrc]);

  if (error) return <Center>{error}</Center>;
  if (!data) return <Center>Loading…</Center>;
  if (specs.length === 0) return <Center>No specs have been published yet.</Center>;

  const sidebarHeader = (title: string, onBack: (() => void) | null) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', minHeight: 40, boxSizing: 'border-box', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
      {onBack && <button onClick={onBack} title="Back" style={{ ...navBtn, padding: '4px 8px' }}>‹</button>}
      <span style={{ flex: 1, minWidth: 0, padding: onBack ? 0 : '0 4px', fontSize: 12, fontWeight: 600, color: onBack ? theme.text_secondary : theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
    </div>
  );

  const statusBadge = (status: SpecStatus | undefined) => status && (
    <span style={{ alignSelf: 'flex-start', padding: '1px 6px', borderRadius: 6, background: `${STATUS[status].color}22`, color: STATUS[status].color, fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0 }}>
      {STATUS[status].label}
    </span>
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: theme.bg_strong, color: theme.text_default, fontFamily: theme.font_ui }}>
      {/* sidebar */}
      <div style={{ width: sidebarW, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border_default}`, minHeight: 0, position: 'relative' }}>
        {!bundle ? (
          <>
            {/* level 1: specs */}
            {sidebarHeader('Specs', null)}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {specs.map((b) => {
                const count = annotationsOf(b.items).length;
                return (
                  <div
                    key={b.spec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => select(b.spec.id, null)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(b.spec.id, null); } }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 16px', borderBottom: `1px solid ${theme.border_default}`, cursor: 'pointer', outline: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: theme.text_default, wordBreak: 'break-word' }}>{b.spec.title}</span>
                    <span style={{ fontSize: 11, color: theme.text_tertiary }}>{count === 0 ? 'No annotations' : count === 1 ? '1 annotation' : `${count} annotations`}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : !current ? (
          <>
            {/* level 2: one spec's headings + annotation cards */}
            {sidebarHeader(bundle.spec.title, specs.length > 1 ? () => select(null, null) : null)}
            <div ref={setListScrollEl} style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
              {bundle.items.length === 0 && <div style={{ padding: 16, fontSize: 12, color: theme.text_tertiary }}>This spec has no annotations.</div>}
              {bundle.items.map((it) => {
                if (!isAnnotation(it)) {
                  const big = it.level === 'big';
                  return (
                    <div key={it.id} style={{ padding: big ? '16px 16px 4px' : '10px 16px 2px', fontSize: big ? 14 : 12, fontWeight: big ? 700 : 600, color: big ? theme.text_default : theme.text_secondary, letterSpacing: big ? 0 : '0.02em' }}>
                      {it.title}
                    </div>
                  );
                }
                const body = it.text.trim();
                return (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => select(bundle.spec.id, it.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(bundle.spec.id, it.id); } }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 16px 10px', cursor: 'pointer', outline: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <SpecThumbnail src={appUrl(it.state.path)} fullWidth scrollRoot={listScrollEl} />
                    {it.title && <span style={{ fontSize: 12, fontWeight: 600, color: theme.text_default, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{it.title}</span>}
                    {body && (
                      <span style={{ fontSize: 11, color: theme.text_secondary, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</span>
                    )}
                    {statusBadge(it.status)}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* level 3: single annotation */}
            {sidebarHeader('Annotation', () => select(bundle.spec.id, null))}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px' }}>
              {current.title && (
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.text_secondary, wordBreak: 'break-word' }}>{current.title}</div>
              )}
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: theme.text_default }}>
                {current.text || <span style={{ color: theme.text_tertiary }}>No description</span>}
              </div>
              {statusBadge(current.status)}
              <a
                href={appUrl(current.state.path)}
                target="_blank"
                rel="noreferrer"
                style={{ alignSelf: 'flex-start', fontSize: 11, color: theme.accent_default, textDecoration: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                Open app ↗
              </a>
            </div>
            <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderTop: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
              <NavButton label="‹ Prev" disabled={index <= 0} onClick={() => step(-1)} grow />
              <NavButton label="Next ›" disabled={index >= annotations.length - 1} onClick={() => step(1)} grow />
            </div>
          </>
        )}

        {/* resize handle */}
        <div
          onMouseDown={startResize}
          title="Resize sidebar"
          style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 2 }}
        />
      </div>

      {/* prototype */}
      <div style={{ flex: 1, minWidth: 0, background: '#fff' }}>
        <iframe
          ref={iframeRef}
          name="pv-spec-viewer"
          src={iframeSrc}
          title="Prototype"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
};

const navBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border_default}`,
  background: 'transparent', color: theme.text_default, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
};

const NavButton: React.FC<{ label: string; disabled: boolean; onClick: () => void; grow?: boolean }> = ({ label, disabled, onClick, grow }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...navBtn, justifyContent: 'center', flex: grow ? 1 : undefined, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
    {label}
  </button>
);

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', color: theme.text_secondary, fontFamily: theme.font_ui, fontSize: 14 }}>
    {children}
  </div>
);
