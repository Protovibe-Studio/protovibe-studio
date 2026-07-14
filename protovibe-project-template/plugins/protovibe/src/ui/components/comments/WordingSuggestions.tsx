// UI for the "Suggest wording change" comment feature. Three pieces:
//   • SuggestionToggleButton — the composer-toolbar icon (next to attach image)
//     that toggles the wording editor on/off for the selected element.
//   • SuggestionComposerSection — the in-composer editor shown below the input
//     while rows exist: original → suggested fields plus a "Replace all" switch,
//     live-previewing each change on the canvas as the writer types. Fully
//     controlled by the parent's rows — it has no state of its own, so it can
//     never linger after submit/cancel.
//   • SuggestionPreviewBlock — the saved-comment renderer: shows each
//     original → suggested diff with a Preview / Stop preview toggle.
//
// All talk to the canvas ONLY through the standalone getCopySuggestionPreview()
// service (find/replace + MutationObserver). No preview logic lives here — this
// file is just the Comments-side UI that drives that service.
//
// Anchoring. A suggestion only rewrites text inside the element its comment
// hangs off, unless the writer ticks "Replace all". For a saved thread that
// element is `[data-pv-comment-{threadId}]`; for the not-yet-saved new-comment
// composer it's the current canvas selection. Every entry point here therefore
// takes an optional `threadId` and derives the anchor from it.
//
// Preview ownership: a preview set while composing PERSISTS through submit (so
// the canvas keeps showing the proposed copy once the comment lands) and is only
// dropped on an explicit cancel — the toolbar toggle, the section's X, or the
// parent discarding the draft via clearSuggestionPreviews().
import React, { useSyncExternalStore } from 'react';
import { Check, Plus, RotateCcw, TextCursorInput, Trash2, X } from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';
import { extractTextStrings } from '../../utils/extractTextStrings';
import { getCopySuggestionPreview, findAnchorElement } from '../../utils/copySuggestionPreview';
import type { SuggestionScope } from '../../utils/copySuggestionPreview';
import type { WordingSuggestion } from '../../../shared/comments';

/** The preview scope for one row: its comment's anchor, widened by "Replace all". */
function scopeOf(row: WordingSuggestion, threadId: string | undefined, selected: HTMLElement | null): SuggestionScope {
  return threadId
    ? { threadId, replaceAll: !!row.replaceAll }
    : { element: selected, replaceAll: !!row.replaceAll };
}

/**
 * Keep only rows the writer actually changed (suggested differs from original),
 * at most one per original: the preview registry keys on (anchor, original), so
 * two rows proposing different copy for the same string can never both show on
 * the canvas. Last one wins, which is what the canvas is already previewing.
 */
export function changedSuggestions(rows: WordingSuggestion[]): WordingSuggestion[] {
  const byOriginal = new Map<string, WordingSuggestion>();
  for (const r of rows) {
    if (!r.original.trim() || !r.suggested.trim() || r.suggested === r.original) continue;
    byOriginal.set(r.original.trim(), r);
  }
  return Array.from(byOriginal.values());
}

/**
 * Drop the canvas previews for a set of composer rows. Call this on every path
 * that DISCARDS a draft suggestion (cancel, toggle-off, navigating away) — and
 * never on submit, where the preview intentionally stays active. Rows composed
 * against a saved thread are removed by anchor; rows of the new-comment composer
 * have no thread yet, so every draft preview goes (there is only ever one
 * composer open, and its selection may have moved on since the rows were seeded).
 */
export function clearSuggestionPreviews(rows: WordingSuggestion[], threadId?: string): void {
  // No rows ⇒ nothing was being composed, so there is nothing of ours to drop.
  // (Bailing early matters: the thread-less branch clears EVERY draft preview,
  // which would otherwise take out an unrelated open composer's previews.)
  if (rows.length === 0) return;
  const preview = getCopySuggestionPreview();
  if (!threadId) { preview.clearDrafts(); return; }
  for (const row of rows) preview.remove(row.original, { threadId });
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: theme.text_tertiary, fontFamily: theme.font_ui, marginBottom: 2,
};

// ── Composer editor ───────────────────────────────────────────────────────────

/**
 * Composer-toolbar toggle (sits next to the attach-image button). First click
 * seeds one row per text string extracted from the anchored element, which makes
 * SuggestionComposerSection appear below the input; second click clears the rows
 * (cancelling the suggestion) — the section and its previews go with them.
 */
export const SuggestionToggleButton: React.FC<{
  value: WordingSuggestion[];
  onChange: (next: WordingSuggestion[]) => void;
  threadId?: string;
}> = ({ value, onChange, threadId }) => {
  const { currentBaseTarget } = useProtovibe();
  const active = value.length > 0;

  const toggle = () => {
    if (active) {
      clearSuggestionPreviews(value, threadId);
      onChange([]);
      return;
    }
    // Seed from the element the suggestion will actually apply to: the thread's
    // anchor when replying to/editing a saved comment (which may not be what's
    // selected right now), otherwise the current selection.
    const target = (threadId ? findAnchorElement(threadId) : null) ?? currentBaseTarget;
    const strings = target ? extractTextStrings(target) : [];
    // Nothing extractable (e.g. the copy lives in a tooltip) → start with one
    // blank row; the original field is editable so any text can be typed in.
    onChange(strings.length
      ? strings.map((s) => ({ original: s, suggested: s }))
      : [{ original: '', suggested: '' }]);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-tooltip="Suggest wording change"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6, border: 'none', padding: 0, cursor: 'pointer',
        background: active ? `${theme.accent_default}22` : 'transparent',
        color: active ? theme.accent_default : theme.text_tertiary,
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.color = theme.text_secondary; e.currentTarget.style.background = theme.bg_tertiary; } }}
      onMouseLeave={(e) => {
        if (!active) { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; }
      }}
    >
      <TextCursorInput size={16} />
    </button>
  );
};

/**
 * In-composer wording editor, shown below the input while rows exist. `value`
 * holds one row per extracted string (original + current suggested + whether it
 * replaces every occurrence on the page); the parent owns it so it can fold the
 * changed rows onto the comment on submit and reset on cancel. Renders nothing
 * when there are no rows — visibility is entirely driven by the toggle button
 * seeding/clearing the rows.
 */
export const SuggestionComposerSection: React.FC<{
  value: WordingSuggestion[];
  onChange: (next: WordingSuggestion[]) => void;
  threadId?: string;
}> = ({ value, onChange, threadId }) => {
  const preview = getCopySuggestionPreview();
  const { currentBaseTarget } = useProtovibe();
  const scope = (row: WordingSuggestion) => scopeOf(row, threadId, currentBaseTarget);

  const updateOne = (idx: number, suggested: string) => {
    const row = value[idx];
    onChange(value.map((r, i) => (i === idx ? { ...r, suggested } : r)));
    // Previews set here deliberately outlive the composer — submitting keeps the
    // proposed copy visible on the canvas; only an explicit cancel clears it.
    preview.set(row.original, suggested, scope(row)); // equal → service treats as no-op/removal
  };

  // The original is editable too, so copy the canvas can't surface for
  // extraction (tooltips, aria labels, alt text) can be typed in by hand. A
  // pristine row keeps suggested mirrored to the original; a dirty row keeps
  // its suggestion and just re-keys the live preview to the new original.
  const updateOriginal = (idx: number, original: string) => {
    const row = value[idx];
    const suggested = row.suggested === row.original ? original : row.suggested;
    preview.remove(row.original, scope(row), row.suggested);
    onChange(value.map((r, i) => (i === idx ? { ...r, original, suggested } : r)));
    if (suggested !== original) preview.set(original, suggested, scope(row));
  };

  // Widening/narrowing a row re-scopes its preview in place (the registry keys
  // on the anchor + original, not on this flag), so the canvas follows instantly.
  const updateReplaceAll = (idx: number, replaceAll: boolean) => {
    const row = { ...value[idx], replaceAll };
    onChange(value.map((r, i) => (i === idx ? row : r)));
    preview.set(row.original, row.suggested, scope(row));
  };

  const resetOne = (idx: number) => updateOne(idx, value[idx].original);

  // Drop a single row: its canvas preview goes with it, and saving the comment
  // rewrites the whole suggestions array, so the row is gone from disk too. This
  // is the only way to remove ONE suggestion from a comment that carries several
  // — clearing the section (the X above) would take all of them.
  const removeOne = (idx: number) => {
    const row = value[idx];
    preview.remove(row.original, scope(row), row.suggested);
    onChange(value.filter((_, i) => i !== idx));
  };

  if (value.length === 0) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, padding: 8, borderRadius: 6,
      border: `1px solid ${theme.border_default}`, background: theme.bg_secondary,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.text_secondary, fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui }}>
        <TextCursorInput size={12} />
        Wording suggestions
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => { clearSuggestionPreviews(value, threadId); onChange([]); }}
          data-tooltip="Cancel wording suggestion"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20,
            borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text_secondary; e.currentTarget.style.background = theme.bg_tertiary; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; }}
        >
          <X size={13} />
        </button>
      </div>
      {/* Rows scroll internally so an element with many strings never grows the
          composer past the panel and buries the submit button. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
      {value.map((row, idx) => {
        const dirty = row.suggested !== row.original;
        return (
          <div key={idx} style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            ...(idx > 0 ? { borderTop: `1px solid ${theme.bg_low}`, paddingTop: 10 } : {}),
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...labelStyle }}>
              Original wording
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => removeOne(idx)}
                data-tooltip="Remove this wording suggestion"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18,
                  borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.destructive_default; e.currentTarget.style.background = theme.bg_tertiary; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; }}
              >
                <Trash2 size={11} />
              </button>
            </div>
            <input
              value={row.original}
              onChange={(e) => updateOriginal(idx, e.target.value)}
              placeholder="Original wording…"
              style={{
                width: '100%', boxSizing: 'border-box', fontSize: 12, fontFamily: theme.font_ui, color: theme.text_secondary,
                padding: '5px 7px', borderRadius: 4, outline: 'none', lineHeight: 1.4,
                background: theme.bg_strong, border: `1px solid ${theme.border_default}`,
              }}
            />
            <div style={{ ...labelStyle, marginTop: 4 }}>Suggested wording</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                value={row.suggested}
                onChange={(e) => updateOne(idx, e.target.value)}
                placeholder="Suggested wording…"
                style={{
                  flex: 1, minWidth: 0, fontSize: 12, fontFamily: theme.font_ui, color: theme.text_default,
                  padding: '5px 7px', borderRadius: 4, outline: 'none',
                  background: theme.bg_strong,
                  border: `1px solid ${dirty ? theme.accent_default : theme.border_default}`,
                }}
              />
              {dirty && (
                <button
                  type="button"
                  onClick={() => resetOne(idx)}
                  data-tooltip="Reset to original"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
                    borderRadius: 4, border: 'none', background: 'transparent', color: theme.text_tertiary, cursor: 'pointer', padding: 0,
                  }}
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
            <label
              data-tooltip="Also replace this text everywhere else on the page, outside the commented element"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start',
                fontSize: 11, color: theme.text_tertiary, fontFamily: theme.font_ui, cursor: 'pointer',
              }}
            >
              {/* The native box can't be themed, so it only carries state and
                  focus/keyboard behaviour; the span next to it is what's seen,
                  cut from the same cloth as the wording inputs above. */}
              <input
                type="checkbox"
                checked={!!row.replaceAll}
                onChange={(e) => updateReplaceAll(idx, e.target.checked)}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, margin: 0, pointerEvents: 'none' }}
              />
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                width: 14, height: 14, borderRadius: 4, boxSizing: 'border-box', color: '#fff',
                background: row.replaceAll ? theme.accent_default : theme.bg_strong,
                border: `1px solid ${row.replaceAll ? theme.accent_default : theme.border_default}`,
              }}>
                {row.replaceAll && <Check size={10} strokeWidth={3} />}
              </span>
              Replace all
            </label>
          </div>
        );
      })}
      </div>
      <button
        type="button"
        onClick={() => onChange([...value, { original: '', suggested: '' }])}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px', marginLeft: -6, borderRadius: 5, border: 'none', background: 'transparent',
          color: theme.text_tertiary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.bg_low; e.currentTarget.style.color = theme.text_secondary; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.text_tertiary; }}
      >
        <Plus size={12} />
        Add wording
      </button>
    </div>
  );
};

// ── Saved-comment renderer ──────────────────────────────────────────────────

/**
 * Renders a saved comment's suggestions as original → suggested diffs with a
 * switch that previews all of them on the canvas. The switch's on/off state is
 * derived live from the preview service and compares the SUGGESTED value (and
 * its reach) too — so a preview that a later edit superseded reads as off.
 */
export const SuggestionPreviewBlock: React.FC<{
  suggestions: WordingSuggestion[];
  threadId: string;
  topMargin?: number;
}> = ({ suggestions, threadId, topMargin = 8 }) => {
  const preview = getCopySuggestionPreview();
  const previewing = useSyncExternalStore(
    preview.subscribe,
    () => suggestions.length > 0 && suggestions.every((s) => {
      const active = preview.get(s.original, { threadId });
      return !!active && active.suggested === s.suggested && active.replaceAll === !!s.replaceAll;
    }),
  );

  if (suggestions.length === 0) return null;

  const toggle = () => {
    // Guard removals with our own suggested value so switching this block off
    // never clears a preview that took over the same string on this thread.
    if (previewing) suggestions.forEach((s) => preview.remove(s.original, { threadId }, s.suggested));
    else suggestions.forEach((s) => preview.set(s.original, s.suggested, { threadId, replaceAll: !!s.replaceAll }));
  };

  return (
    <div style={{
      marginTop: topMargin, display: 'flex', flexDirection: 'column', gap: 6,
      padding: 8, borderRadius: 6, border: `1px solid ${theme.border_default}`, background: theme.bg_secondary,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.text_secondary, fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui }}>
        <TextCursorInput size={12} />
        Wording suggestion{suggestions.length > 1 ? 's' : ''}
      </div>
      {suggestions.map((s, idx) => (
        <div key={idx} style={{
          display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, fontFamily: theme.font_ui, lineHeight: 1.4, wordBreak: 'break-word',
          ...(idx > 0 ? { borderTop: `1px solid ${theme.bg_low}`, paddingTop: 8 } : {}),
        }}>
          <span style={{ color: theme.text_tertiary, textDecoration: 'line-through' }}>{s.original}</span>
          <span style={{ color: theme.text_default }}>{s.suggested}</span>
          {s.replaceAll && (
            <span
              data-tooltip="Replaces this text everywhere on the page"
              style={{ alignSelf: 'flex-start', marginTop: 2, fontSize: 10, color: theme.text_tertiary, cursor: 'default' }}
            >
              Replace all
            </span>
          )}
        </div>
      ))}
      <div style={{ height: 1, background: theme.bg_low }} />
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={previewing}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
          padding: '3px 0', border: 'none', background: 'transparent', cursor: 'pointer',
          color: previewing ? theme.text_default : theme.text_secondary,
          fontSize: 10, fontWeight: 400, fontFamily: theme.font_ui,
        }}
      >
        <span style={{
          position: 'relative', width: 26, height: 15, borderRadius: 999, flexShrink: 0,
          background: previewing ? theme.success_default : theme.bg_tertiary,
          transition: 'background 0.15s',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: previewing ? 13 : 2, width: 11, height: 11,
            borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
          }} />
        </span>
        Preview
      </button>
    </div>
  );
};
