// UI for the "Suggest wording change" comment feature. Two pieces:
//   • SuggestionComposerSection — the in-composer editor: a button that reads the
//     selected element's text strings and lets the writer propose replacements,
//     live-previewing each change on the canvas as they type.
//   • SuggestionPreviewBlock — the saved-comment renderer: shows each
//     original → suggested diff with a Preview / Stop preview toggle.
//
// Both talk to the canvas ONLY through the standalone getCopySuggestionPreview()
// service (find/replace + MutationObserver). No preview logic lives here — this
// file is just the Comments-side UI that drives that service.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Type, Eye, EyeOff, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { theme } from '../../theme';
import { useProtovibe } from '../../context/ProtovibeContext';
import { extractTextStrings } from '../../utils/extractTextStrings';
import { getCopySuggestionPreview } from '../../utils/copySuggestionPreview';
import type { WordingSuggestion } from '../../../shared/comments';

/** Keep only rows the writer actually changed (suggested differs from original). */
export function changedSuggestions(rows: WordingSuggestion[]): WordingSuggestion[] {
  return rows.filter((r) => r.suggested.trim().length > 0 && r.suggested !== r.original);
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, color: theme.text_tertiary, fontFamily: theme.font_ui, marginBottom: 2,
};

// ── Composer editor ───────────────────────────────────────────────────────────

/**
 * In-composer wording editor. `value` holds one row per extracted string
 * (original + current suggested); the parent owns it so it can fold the changed
 * rows onto the comment on submit and reset on cancel.
 */
export const SuggestionComposerSection: React.FC<{
  value: WordingSuggestion[];
  onChange: (next: WordingSuggestion[]) => void;
}> = ({ value, onChange }) => {
  const { currentBaseTarget } = useProtovibe();
  const preview = getCopySuggestionPreview();
  const [open, setOpen] = useState(value.length > 0);
  const [emptyNotice, setEmptyNotice] = useState(false);

  // Originals this composer has previewed, so we clear exactly ours on unmount
  // (submit/cancel) without disturbing a saved comment's active preview.
  const previewedRef = useRef<Set<string>>(new Set());
  useEffect(() => () => {
    for (const orig of previewedRef.current) preview.remove(orig);
  }, [preview]);

  const openEditor = () => {
    if (value.length === 0) {
      const strings = currentBaseTarget ? extractTextStrings(currentBaseTarget) : [];
      if (strings.length === 0) { setEmptyNotice(true); return; }
      onChange(strings.map((s) => ({ original: s, suggested: s })));
    }
    setEmptyNotice(false);
    setOpen(true);
  };

  const updateOne = (idx: number, suggested: string) => {
    onChange(value.map((row, i) => (i === idx ? { ...row, suggested } : row)));
    const original = value[idx].original;
    preview.set(original, suggested); // equal → service treats as no-op/removal
    previewedRef.current.add(original);
  };

  const resetOne = (idx: number) => updateOne(idx, value[idx].original);

  if (!open && value.length === 0) {
    return (
      <div>
        <button
          type="button"
          onClick={openEditor}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6,
            border: `1px solid ${theme.border_default}`, background: 'transparent',
            color: theme.text_secondary, fontSize: 11, cursor: 'pointer', fontFamily: theme.font_ui,
          }}
        >
          <Type size={13} />
          Suggest wording change
        </button>
        {emptyNotice && (
          <div style={{ fontSize: 10, color: theme.text_tertiary, marginTop: 4, fontFamily: theme.font_ui }}>
            No editable text found in the selected element.
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, padding: 8, borderRadius: 6,
      border: `1px solid ${theme.border_default}`, background: theme.bg_sunken,
    }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none',
          padding: 0, color: theme.text_secondary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        Wording suggestions
      </button>
      {open && value.map((row, idx) => {
        const dirty = row.suggested !== row.original;
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={labelStyle}>Original wording</div>
            <div style={{
              fontSize: 12, color: theme.text_secondary, fontFamily: theme.font_ui, lineHeight: 1.4,
              padding: '4px 6px', borderRadius: 4, background: theme.bg_tertiary, wordBreak: 'break-word',
            }}>
              {row.original}
            </div>
            <div style={{ ...labelStyle, marginTop: 4 }}>Suggested wording</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                value={row.suggested}
                onChange={(e) => updateOne(idx, e.target.value)}
                placeholder="Suggested wording…"
                style={{
                  flex: 1, minWidth: 0, fontSize: 12, fontFamily: theme.font_ui, color: theme.text_default,
                  padding: '5px 7px', borderRadius: 4, outline: 'none',
                  background: theme.bg_secondary,
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
          </div>
        );
      })}
    </div>
  );
};

// ── Saved-comment renderer ──────────────────────────────────────────────────

/**
 * Renders a saved comment's suggestions as original → suggested diffs with a
 * single toggle that previews all of them on the canvas. The toggle's on/off
 * state is derived live from the preview service, so if another comment
 * supersedes one of these strings this button reflects it.
 */
export const SuggestionPreviewBlock: React.FC<{
  suggestions: WordingSuggestion[];
  topMargin?: number;
}> = ({ suggestions, topMargin = 8 }) => {
  const preview = getCopySuggestionPreview();
  const previewing = useSyncExternalStore(
    preview.subscribe,
    () => suggestions.length > 0 && suggestions.every((s) => preview.isActive(s.original)),
  );

  // Stop previewing when this comment scrolls out of the panel / unmounts.
  useEffect(() => () => {
    for (const s of suggestions) preview.remove(s.original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (suggestions.length === 0) return null;

  const toggle = () => {
    if (previewing) suggestions.forEach((s) => preview.remove(s.original));
    else suggestions.forEach((s) => preview.set(s.original, s.suggested));
  };

  return (
    <div style={{
      marginTop: topMargin, display: 'flex', flexDirection: 'column', gap: 6,
      padding: 8, borderRadius: 6, border: `1px solid ${theme.border_default}`, background: theme.bg_sunken,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.text_secondary, fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui }}>
        <Type size={12} />
        Wording suggestion{suggestions.length > 1 ? 's' : ''}
      </div>
      {suggestions.map((s, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, fontFamily: theme.font_ui, lineHeight: 1.4, wordBreak: 'break-word' }}>
          <span style={{ color: theme.text_tertiary, textDecoration: 'line-through' }}>{s.original}</span>
          <span style={{ color: theme.accent_default }}>{s.suggested}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={toggle}
        style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 6,
          border: `1px solid ${previewing ? theme.accent_default : theme.border_default}`,
          background: previewing ? theme.accent_default : 'transparent',
          color: previewing ? '#fff' : theme.text_secondary,
          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: theme.font_ui,
        }}
      >
        {previewing ? <EyeOff size={12} /> : <Eye size={12} />}
        {previewing ? 'Stop preview' : 'Preview suggestion'}
      </button>
    </div>
  );
};
