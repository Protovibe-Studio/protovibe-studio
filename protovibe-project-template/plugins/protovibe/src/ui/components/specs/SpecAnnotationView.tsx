// plugins/protovibe/src/ui/components/specs/SpecAnnotationView.tsx
// Level 3 of the Specs panel: one annotation, edited in place, with Prev / Next
// stepping through the (filtered) annotation list.
import React, { useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, RefreshCw, PinOff, Link2 } from 'lucide-react';
import { theme } from '../../theme';
import type { SpecAnnotation, SpecBundle } from '../../../shared/specs';
import type { SpecItemPatch } from '../../api/specs';
import { Menu, InlineEditable, StatusPicker, iconBtn, relativeTime } from './specsUi';

export const SpecAnnotationView: React.FC<{
  bundle: SpecBundle;
  item: SpecAnnotation;
  busy: boolean;
  /** Open the text editor immediately (a just-created annotation). */
  autoEditText: boolean;
  onAutoEditDone: () => void;
  /** Whether the pinned element is currently on the canvas. */
  anchorFound: boolean | null;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onUpdate: (patch: SpecItemPatch, note: string) => void;
  /** Navigate the canvas to the annotation's state and highlight its element. */
  onLocate: () => void;
  /** Re-capture the current canvas path and re-pin to the selected element in one go. */
  onUpdateReference: () => void;
  onUnpin: () => void;
  onDelete: () => void;
}> = (p) => {
  const { item } = p;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const [textEditing, setTextEditing] = useState(false);
  const fileName = item.anchor?.file.split('/').pop();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 8px', borderBottom: `1px solid ${theme.border_default}`, flexShrink: 0 }}>
        <button data-testid="spec-annotation-back" style={iconBtn} data-tooltip="Back to spec" onClick={p.onBack}><ArrowLeft size={15} /></button>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: theme.text_secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Annotation
        </span>
        <button style={{ ...iconBtn, opacity: p.onPrev ? 1 : 0.35 }} disabled={!p.onPrev} data-testid="spec-annotation-prev" data-tooltip="Previous (←)" onClick={p.onPrev}><ChevronLeft size={16} /></button>
        <button style={{ ...iconBtn, opacity: p.onNext ? 1 : 0.35 }} disabled={!p.onNext} data-testid="spec-annotation-next" data-tooltip="Next (→)" onClick={p.onNext}><ChevronRight size={16} /></button>
        <button ref={menuRef} style={iconBtn} data-tooltip="More" onClick={() => setMenuOpen(true)}><MoreHorizontal size={15} /></button>
        <Menu
          open={menuOpen}
          anchorRef={menuRef}
          onClose={() => setMenuOpen(false)}
          width={250}
          items={[
            { label: 'Update reference link and element', icon: <RefreshCw size={13} />, onSelect: p.onUpdateReference, disabled: p.busy },
            { label: 'Unpin element', icon: <PinOff size={13} />, onSelect: p.onUnpin, disabled: !item.anchor },
            { label: 'Delete annotation', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: p.onDelete },
          ]}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px 24px' }}>
        <InlineEditable
          value={item.text}
          placeholder="Write the annotation…"
          multiline
          editing={p.autoEditText || textEditing}
          onEditingChange={(v) => { setTextEditing(v); if (!v) p.onAutoEditDone(); }}
          onSave={(t) => p.onUpdate({ text: t }, 'edit annotation')}
          style={{ fontSize: 13, minHeight: 160 }}
        />

        <StatusPicker status={item.status} disabled={p.busy} onChange={(s) => p.onUpdate({ status: s }, 'change annotation status')} />

        {/* prototype link — always visible, divider above */}
        <div style={{ borderTop: `1px solid ${theme.border_default}`, marginTop: 4, paddingTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.text_secondary, marginBottom: 6 }}>Prototype link</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a
                href={item.state.path}
                data-tooltip="Show on canvas"
                onClick={(e) => { e.preventDefault(); p.onLocate(); }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: theme.accent_default, textDecoration: 'none', wordBreak: 'break-all' }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                <Link2 size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ flex: 1 }}>{item.state.path}</span>
              </a>
              {item.anchor && (
                <span style={{ fontSize: 10, color: p.anchorFound === false ? theme.warning_primary : theme.text_tertiary }}>
                  {p.anchorFound === false
                    ? `Pinned element in ${fileName} not found on this screen`
                    : `Element in ${fileName}`}
                </span>
              )}
          </div>
        </div>

        <span style={{ fontSize: 10, color: theme.text_tertiary }}>
          {item.author.name}{item.updatedAt ? ` · edited ${relativeTime(item.updatedAt)}` : ` · ${relativeTime(item.createdAt)}`}
        </span>
      </div>
    </>
  );
};
