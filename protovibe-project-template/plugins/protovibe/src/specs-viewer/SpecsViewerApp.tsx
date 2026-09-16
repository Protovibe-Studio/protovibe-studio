// plugins/protovibe/src/specs-viewer/SpecsViewerApp.tsx
// Read-only viewer for published specs. Loads ./specs-data.json and shows the
// prototype in an iframe next to a sidebar that mirrors the editor's Specs
// panel: a list of annotation cards (lazy iframe thumbnails, full text) of
// which one is *active* — highlighted, its state shown in the prototype.
// Clicking a card activates it; Prev / Next in the header step the active
// one. There is no top bar.
// Routes as specs.html?spec={id}&item={id} so every annotation is shareable;
// opening such a link activates the card and scrolls it into view.
// Same-origin with the prototype, so pinned elements are highlighted by
// touching the iframe document directly — the published app has no bridge.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { theme } from '../ui/theme';
import type { SpecAnnotation, SpecBundle, SpecsViewerData, SpecStatus } from '../shared/specs';
import { annotationsOf, isAnnotation, specIdSelector, SPEC_ACTIVE_BG, SPEC_STATUS_CONFIG as STATUS } from '../shared/specs';
import { SpecThumbnail } from '../ui/components/specs/SpecThumbnail';
import { PROTOVIBE_LOGO_DATA_URL } from '../ui/protovibeLogo';

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

/** path + query + hash of a viewer URL, for comparing two app states. */
function stateKey(href: string): string {
  const u = new URL(href, window.location.href);
  return u.pathname + u.search + u.hash;
}

/** Same minus the hash: two URLs sharing it navigate without a page load. */
function docKey(href: string): string {
  const u = new URL(href, window.location.href);
  return u.pathname + u.search;
}

/**
 * Where the prototype iframe actually is right now, which is not `iframeSrc`
 * once the reader has navigated inside it. `null` when it cannot be read
 * (cross-origin, or no document yet).
 */
function liveState(frame: HTMLIFrameElement | null): string | null {
  try {
    const href = frame?.contentWindow?.location.href;
    if (!href || href === 'about:blank') return null;
    return stateKey(href);
  } catch { return null; }
}

export const SpecsViewerApp: React.FC = () => {
  const [data, setData] = useState<SpecsViewerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState(readRoute);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string>(() => appUrl('/'));
  // Set when the src changes; the highlight then waits for the new document.
  const loadPendingRef = useRef(false);

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
  // `item` is the active annotation; none (or an unknown one) ⇒ nothing active.
  const current: SpecAnnotation | undefined = useMemo(
    () => (route.item ? annotations.find((a) => a.id === route.item) : undefined),
    [annotations, route.item],
  );
  const index = current ? annotations.findIndex((a) => a.id === current.id) : -1;
  const [listScrollEl, setListScrollEl] = useState<HTMLDivElement | null>(null);
  // Bumped to redraw the highlight for the annotation that is already active
  // (clicking its card again after dismissing the frame in the prototype).
  const [highlightNonce, setHighlightNonce] = useState(0);

  // Normalise the URL to the resolved spec / item once data is in.
  useEffect(() => {
    if (!data) return;
    const specId = bundle?.spec.id ?? null;
    if (route.spec !== specId || (route.item && !current)) {
      writeRoute(specId, current?.id ?? null, true);
      setRoute(readRoute());
    }
  }, [data, bundle, current, route.spec, route.item]);

  // Resizable sidebar. The drag crosses the prototype iframe, which swallows
  // mouse events (they go to *its* document, so the parent never sees the move
  // or the release and the drag hangs). Pointer capture keeps the events here,
  // and `resizing` makes the iframe transparent to the pointer for good measure.
  const [sidebarW, setSidebarW] = useState(loadSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startW = sidebarW;
    let width = startW;
    try { handle.setPointerCapture(pointerId); } catch { /* ignore */ }
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      width = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, startW + ev.clientX - startX));
      setSidebarW(width);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      try { handle.releasePointerCapture(pointerId); } catch { /* ignore */ }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizing(false);
      try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(width)); } catch { /* ignore */ }
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setResizing(true);
    // Captured pointer events fire on the handle itself, not on window.
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }, [sidebarW]);

  // "Close" the sidebar: leave the viewer for whatever the prototype iframe is
  // showing right now, so the user lands on the state they were looking at
  // (including any navigation they did inside the prototype).
  const openPrototype = useCallback(() => {
    let href = iframeSrc;
    try {
      const live = iframeRef.current?.contentWindow?.location.href;
      if (live && live !== 'about:blank') href = live;
    } catch { /* cross-origin guard */ }
    window.location.href = href;
  }, [iframeSrc]);

  const select = useCallback((specId: string | null, itemId: string | null) => {
    const r = readRoute();
    if (r.spec === specId && r.item === itemId) return; // already there: no duplicate history entry
    writeRoute(specId, itemId);
    setRoute(readRoute());
  }, []);

  const step = useCallback((delta: number) => {
    if (!bundle) return;
    // With nothing active, Next starts from the first annotation and Prev from the last.
    const next = index >= 0 ? annotations[index + delta] : delta > 0 ? annotations[0] : annotations[annotations.length - 1];
    if (next) select(bundle.spec.id, next.id);
  }, [bundle, annotations, index, select]);
  const canPrev = annotations.length > 0 && index !== 0;
  const canNext = annotations.length > 0 && index !== annotations.length - 1;

  // Keep the active card visible (deep links, Prev / Next, back / forward).
  useEffect(() => {
    if (!current || !listScrollEl) return;
    const card = listScrollEl.querySelector<HTMLElement>(`[data-spec-item="${current.id}"]`);
    try { card?.scrollIntoView({ block: 'nearest' }); } catch { /* ignore */ }
  }, [current, listScrollEl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || !bundle) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'Escape' && index >= 0) { e.preventDefault(); select(bundle.spec.id, null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, index, bundle, select]);

  // Navigate the iframe only when the state actually differs, then highlight
  // the pinned element once it renders.
  useEffect(() => {
    if (!current) {
      // Nothing active: drop the highlight but keep the prototype where it is.
      iframeRef.current?.contentDocument?.getElementById(HIGHLIGHT_ID)?.remove();
      return;
    }
    const target = appUrl(current.state.path);
    const frame = iframeRef.current;
    if (target !== iframeSrc) {
      // The effect re-runs once the new src is committed (iframeSrc dep).
      loadPendingRef.current = true;
      setIframeSrc(target);
      return;
    }
    // Same src as the annotation asks for, but the reader may have navigated
    // the prototype elsewhere since (clicking through the app changes its
    // query string, not our `src`). Activating an annotation always restores
    // its own state, so drive the iframe back to it by hand — React will not
    // re-render an unchanged `src`.
    const live = liveState(frame);
    if (frame && !loadPendingRef.current && live !== null && live !== stateKey(target)) {
      // A hash-only move stays in the same document and fires no load event.
      const reloads = docKey(live) !== docKey(target);
      loadPendingRef.current = reloads;
      const absolute = new URL(target, window.location.href).toString();
      // `replace` keeps the reader's detour out of the iframe's history.
      try { frame.contentWindow!.location.replace(absolute); }
      catch { frame.src = target; loadPendingRef.current = true; }
    }
    let attempts = 0;
    let timer = 0;
    let cleanupListeners: (() => void) | null = null;
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
      // The frame points the annotation out; once the reader starts using the
      // prototype it is just in the way, so the first press inside the iframe
      // drops it. Capture phase so the app's own handlers cannot swallow it.
      const dismiss = () => cleanupListeners?.();
      win.addEventListener('scroll', place, { capture: true, passive: true });
      win.addEventListener('resize', place);
      doc.addEventListener('pointerdown', dismiss, true);
      cleanupListeners = () => {
        win.removeEventListener('scroll', place, { capture: true });
        win.removeEventListener('resize', place);
        doc.removeEventListener('pointerdown', dismiss, true);
        cleanupListeners = null;
        box.remove();
      };
    };
    // After a src change the old document is still reachable until the new
    // one arrives: wait for the load event instead of decorating the outgoing
    // page (whose highlight would vanish with it).
    let fallback = 0;
    const onLoad = () => { loadPendingRef.current = false; clearTimeout(fallback); timer = window.setTimeout(tryHighlight, 50); };
    if (loadPendingRef.current && frame) {
      frame.addEventListener('load', onLoad);
      // Should the load event never arrive, still draw the highlight.
      fallback = window.setTimeout(() => { loadPendingRef.current = false; tryHighlight(); }, 2000);
    } else {
      timer = window.setTimeout(tryHighlight, 150);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(fallback);
      frame?.removeEventListener('load', onLoad);
      try { cleanupListeners?.(); } catch { /* document may be gone */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, iframeSrc, highlightNonce]);

  if (error) return <Center>{error}</Center>;
  if (!data) return <Center>Loading…</Center>;
  if (specs.length === 0) return <Center>No specs have been published yet.</Center>;

  const sidebarHeader = (title: string, onBack: (() => void) | null, trailing?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', minHeight: 40, boxSizing: 'border-box', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
      {onBack && <button onClick={onBack} title="Back" style={{ ...navBtn, padding: '4px 8px' }}>‹</button>}
      <span style={{ flex: 1, minWidth: 0, padding: onBack ? 0 : '0 4px', fontSize: 12, fontWeight: 600, color: onBack ? theme.text_secondary : theme.text_default, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {trailing}
    </div>
  );

  const sidebarBrand = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 14px', minHeight: 40, boxSizing: 'border-box', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
      <img src={PROTOVIBE_LOGO_DATA_URL} alt="Protovibe" style={{ height: 11, opacity: 0.6 }} />
      <div style={{ flex: 1 }} />
      <button
        onClick={openPrototype}
        title="Close specs and open the prototype"
        aria-label="Close specs"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, padding: 0,
          border: 'none', borderRadius: 4, background: 'transparent', color: theme.text_tertiary,
          fontSize: 14, lineHeight: 1, cursor: 'pointer', fontFamily: theme.font_ui, flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_default; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
      >
        ✕
      </button>
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
        {sidebarBrand}
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
        ) : (
          <>
            {/* level 2: one spec's headings + annotation cards, one active */}
            {sidebarHeader(bundle.spec.title, specs.length > 1 ? () => select(null, null) : null, annotations.length > 0 && (
              <>
                <NavButton label="‹" title="Previous annotation (←)" disabled={!canPrev} onClick={() => step(-1)} />
                <NavButton label="›" title="Next annotation (→)" disabled={!canNext} onClick={() => step(1)} />
              </>
            ))}
            <div ref={setListScrollEl} style={{ flex: 1, overflowY: 'auto', scrollbarGutter: 'stable', paddingBottom: 24 }}>
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
                const active = current?.id === it.id;
                const baseBg = active ? SPEC_ACTIVE_BG : 'transparent';
                return (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    data-spec-item={it.id}
                    data-active={active}
                    onClick={() => { if (active) setHighlightNonce((v) => v + 1); else select(bundle.spec.id, it.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active) setHighlightNonce((v) => v + 1); else select(bundle.spec.id, it.id); } }}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px 10px', cursor: 'pointer', outline: 'none',
                      background: baseBg, boxShadow: active ? `inset 3px 0 0 ${theme.accent_default}` : 'none',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = theme.bg_low; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; }}
                  >
                    <SpecThumbnail
                      src={appUrl(it.state.path)}
                      fullWidth
                      scrollRoot={listScrollEl}
                      revealSelector={it.anchor ? specIdSelector(it.id) : undefined}
                    />
                    {body ? (
                      <span style={{ fontSize: 12, color: theme.text_default, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{body}</span>
                    ) : active && (
                      <span style={{ fontSize: 12, color: theme.text_tertiary }}>No description</span>
                    )}
                    {statusBadge(it.status)}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* resize handle */}
        <div
          onPointerDown={startResize}
          title="Resize sidebar"
          style={{ position: 'absolute', top: 0, right: -3, width: 6, height: '100%', cursor: 'col-resize', zIndex: 2, touchAction: 'none' }}
        />
      </div>

      {/* prototype */}
      <div style={{ flex: 1, minWidth: 0, background: '#fff', pointerEvents: resizing ? 'none' : 'auto' }}>
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

const NavButton: React.FC<{ label: string; title?: string; disabled: boolean; onClick: () => void }> = ({ label, title, disabled, onClick }) => (
  <button onClick={onClick} title={title} disabled={disabled} style={{ ...navBtn, justifyContent: 'center', minWidth: 28, padding: '4px 8px', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
    {label}
  </button>
);

const Center: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', color: theme.text_secondary, fontFamily: theme.font_ui, fontSize: 14 }}>
    {children}
  </div>
);
