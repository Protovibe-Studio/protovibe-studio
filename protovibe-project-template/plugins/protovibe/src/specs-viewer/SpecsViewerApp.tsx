// plugins/protovibe/src/specs-viewer/SpecsViewerApp.tsx
// Read-only viewer for published specs. Loads ./specs-data.json, shows the
// prototype in an iframe and walks through annotations with Prev / Next.
// Routes as specs.html?spec={id}&item={id} so every annotation is shareable.
// Same-origin with the prototype, so pinned elements are highlighted by
// touching the iframe document directly — the published app has no bridge.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { theme } from '../ui/theme';
import type { SpecAnnotation, SpecBundle, SpecsViewerData, SpecStatus } from '../shared/specs';
import { annotationTitle, annotationsOf, isAnnotation, specIdSelector } from '../shared/specs';

const STATUS: Record<SpecStatus, { label: string; color: string }> = {
  todo:     { label: 'Todo',       color: '#A78BFA' },
  discuss:  { label: 'To discuss', color: theme.warning_primary },
  verified: { label: 'Verified',   color: theme.success_default },
};

const SIDEBAR_W = 340;
const HIGHLIGHT_ID = 'pv-spec-highlight';

function readRoute(): { spec: string | null; item: string | null } {
  const p = new URLSearchParams(window.location.search);
  return { spec: p.get('spec'), item: p.get('item') };
}

function writeRoute(spec: string, item: string | null, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set('spec', spec);
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
  const bundle: SpecBundle | undefined = useMemo(
    () => specs.find((b) => b.spec.id === route.spec) ?? specs[0],
    [specs, route.spec],
  );
  const annotations = useMemo(() => (bundle ? annotationsOf(bundle.items) : []), [bundle]);
  const current: SpecAnnotation | undefined = useMemo(
    () => annotations.find((a) => a.id === route.item) ?? annotations[0],
    [annotations, route.item],
  );
  const index = current ? annotations.findIndex((a) => a.id === current.id) : -1;

  // Normalise the URL to the resolved spec / item once data is in.
  useEffect(() => {
    if (!bundle) return;
    if (route.spec !== bundle.spec.id || (current && route.item !== current.id)) {
      writeRoute(bundle.spec.id, current?.id ?? null, true);
      setRoute(readRoute());
    }
  }, [bundle, current, route.spec, route.item]);

  const select = useCallback((specId: string, itemId: string | null) => {
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
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  // Navigate the iframe only when the state actually differs, then highlight
  // the pinned element once it renders.
  useEffect(() => {
    if (!current) return;
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
  if (!bundle) return <Center>No specs have been published yet.</Center>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: theme.bg_strong, color: theme.text_default, fontFamily: theme.font_ui }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 12px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        {specs.length > 1 ? (
          <select
            value={bundle.spec.id}
            onChange={(e) => select(e.target.value, null)}
            style={{ background: theme.bg_secondary, color: theme.text_default, border: `1px solid ${theme.border_default}`, borderRadius: 6, padding: '4px 8px', fontSize: 13, fontWeight: 600, fontFamily: theme.font_ui }}
          >
            {specs.map((b) => <option key={b.spec.id} value={b.spec.id}>{b.spec.title}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600 }}>{bundle.spec.title}</span>
        )}
        <div style={{ flex: 1 }} />
        {current && <span style={{ fontSize: 12, color: theme.text_tertiary }}>{index + 1} / {annotations.length}</span>}
        <NavButton label="‹ Prev" disabled={index <= 0} onClick={() => step(-1)} />
        <NavButton label="Next ›" disabled={index < 0 || index >= annotations.length - 1} onClick={() => step(1)} />
        <a
          href={current ? appUrl(current.state.path) : appUrl('/')}
          target="_blank"
          rel="noreferrer"
          style={{ ...navBtn, textDecoration: 'none', color: theme.accent_default, borderColor: theme.border_default }}
        >
          Open app ↗
        </a>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* sidebar */}
        <div style={{ width: SIDEBAR_W, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${theme.border_default}`, minHeight: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {bundle.items.length === 0 && <div style={{ padding: 16, fontSize: 12, color: theme.text_tertiary }}>This spec has no annotations.</div>}
            {bundle.items.map((it) => {
              if (!isAnnotation(it)) {
                const big = it.level === 'big';
                return (
                  <div key={it.id} style={{ padding: big ? '14px 16px 4px' : '10px 16px 2px', fontSize: big ? 13 : 11, fontWeight: big ? 700 : 600, color: big ? theme.text_default : theme.text_secondary, letterSpacing: big ? 0 : '0.03em', textTransform: big ? 'none' : 'uppercase' }}>
                    {it.title}
                  </div>
                );
              }
              const n = annotations.findIndex((a) => a.id === it.id) + 1;
              const active = current?.id === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() => select(bundle.spec.id, it.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 16px', border: 'none',
                    background: active ? `${theme.accent_default}22` : 'transparent', color: active ? theme.text_default : theme.text_secondary,
                    cursor: 'pointer', fontFamily: theme.font_ui, fontSize: 12, borderLeft: `2px solid ${active ? theme.accent_default : 'transparent'}`,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = theme.bg_low; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 18, fontSize: 10, fontWeight: 700, color: theme.text_tertiary, flexShrink: 0 }}>{n}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{annotationTitle(it)}</span>
                  {it.status && <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS[it.status].color, flexShrink: 0 }} title={STATUS[it.status].label} />}
                </button>
              );
            })}
          </div>

          {current && (
            <div style={{ borderTop: `1px solid ${theme.border_default}`, padding: '14px 16px', maxHeight: '45%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: theme.bg_default }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {index + 1}. {current.title ? current.title : <span style={{ color: theme.text_tertiary, fontWeight: 500 }}>Annotation</span>}
              </div>
              {current.status && (
                <span style={{ alignSelf: 'flex-start', padding: '2px 7px', borderRadius: 6, background: `${STATUS[current.status].color}22`, color: STATUS[current.status].color, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {STATUS[current.status].label}
                </span>
              )}
              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: theme.text_default }}>
                {current.text || <span style={{ color: theme.text_tertiary, fontStyle: 'italic' }}>No description</span>}
              </div>
            </div>
          )}
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
    </div>
  );
};

const navBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 6, border: `1px solid ${theme.border_default}`,
  background: 'transparent', color: theme.text_default, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
};

const NavButton: React.FC<{ label: string; disabled: boolean; onClick: () => void }> = ({ label, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{ ...navBtn, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
    {label}
  </button>
);

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', color: theme.text_secondary, fontFamily: theme.font_ui, fontSize: 14 }}>
    {children}
  </div>
);
