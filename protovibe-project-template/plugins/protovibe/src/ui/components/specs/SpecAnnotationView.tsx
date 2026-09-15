// plugins/protovibe/src/ui/components/specs/SpecAnnotationView.tsx
// Level 3 of the Specs panel: one annotation, edited in place, with Prev / Next
// stepping through the (filtered) annotation list.
import React, { useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, MapPin, RefreshCw, Pin, PinOff, Link2 } from 'lucide-react';
import { theme } from '../../theme';
import type { SpecAnnotation, SpecBundle } from '../../../shared/specs';
import type { SpecItemPatch } from '../../api/specs';
import { Menu, InlineEditable, StatusPicker, iconBtn, ghostBtn, relativeTime } from './specsUi';

export const SpecAnnotationView: React.FC<{
  bundle: SpecBundle;
  item: SpecAnnotation;
  /** 1-based position among the annotations being stepped through, and their count. */
  position: { index: number; total: number } | null;
  busy: boolean;
  /** Open the text editor immediately (a just-created annotation). */
  autoEditText: boolean;
  onAutoEditDone: () => void;
  /** Whether an element is selected on the App canvas (enables re-pin). */
  canRepin: boolean;
  /** Whether the pinned element is currently on the canvas. */
  anchorFound: boolean | null;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onUpdate: (patch: SpecItemPatch, note: string) => void;
  onLocate: () => void;
  onUpdateState: () => void;
  onRepin: () => void;
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
          {p.bundle.spec.title}
        </span>
        {p.position && (
          <span style={{ fontSize: 11, color: theme.text_tertiary, whiteSpace: 'nowrap', padding: '0 4px' }}>
            {p.position.index} / {p.position.total}
          </span>
        )}
        <button style={{ ...iconBtn, opacity: p.onPrev ? 1 : 0.35 }} disabled={!p.onPrev} data-testid="spec-annotation-prev" data-tooltip="Previous (←)" onClick={p.onPrev}><ChevronLeft size={16} /></button>
        <button style={{ ...iconBtn, opacity: p.onNext ? 1 : 0.35 }} disabled={!p.onNext} data-testid="spec-annotation-next" data-tooltip="Next (→)" onClick={p.onNext}><ChevronRight size={16} /></button>
        <button ref={menuRef} style={iconBtn} data-tooltip="More" onClick={() => setMenuOpen(true)}><MoreHorizontal size={15} /></button>
        <Menu
          open={menuOpen}
          anchorRef={menuRef}
          onClose={() => setMenuOpen(false)}
          width={230}
          items={[
            { label: 'Update state to current view', icon: <RefreshCw size={13} />, onSelect: p.onUpdateState },
            { label: 'Pin to selected element', icon: <Pin size={13} />, onSelect: p.onRepin, disabled: !p.canRepin },
            { label: 'Unpin element', icon: <PinOff size={13} />, onSelect: p.onUnpin, disabled: !item.anchor },
            { label: 'Delete annotation', icon: <Trash2 size={13} />, danger: true, separator: true, onSelect: p.onDelete },
          ]}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 24px' }}>
        <InlineEditable
          value={item.title || ''}
          placeholder="Add a title"
          onSave={(t) => p.onUpdate({ title: t }, 'edit annotation title')}
          style={{ fontSize: 15, fontWeight: 600 }}
        />

        <StatusPicker status={item.status} disabled={p.busy} onChange={(s) => p.onUpdate({ status: s }, 'change annotation status')} />

        <InlineEditable
          value={item.text}
          placeholder="Write the annotation…"
          multiline
          editing={p.autoEditText || textEditing}
          onEditingChange={(v) => { setTextEditing(v); if (!v) p.onAutoEditDone(); }}
          onSave={(t) => p.onUpdate({ text: t }, 'edit annotation')}
          style={{ fontSize: 13, minHeight: 60 }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 6, background: theme.bg_low, border: `1px solid ${theme.border_default}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: theme.text_secondary }}>
            <Link2 size={12} style={{ flexShrink: 0, marginTop: 2, color: theme.text_tertiary }} />
            <span style={{ wordBreak: 'break-all', flex: 1 }}>{item.state.path}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.text_secondary }}>
            <MapPin size={12} style={{ flexShrink: 0, color: theme.text_tertiary }} />
            {item.anchor ? (
              <span>
                Pinned to an element in <span style={{ color: theme.text_default }}>{fileName}</span>
                {p.anchorFound === false && <span style={{ color: theme.warning_primary }}> · not found on this screen</span>}
              </span>
            ) : (
              <span>Describes the whole screen</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button style={ghostBtn} onClick={p.onLocate}><MapPin size={12} /> Show on canvas</button>
            <button style={ghostBtn} onClick={p.onUpdateState} disabled={p.busy}><RefreshCw size={12} /> Update state</button>
          </div>
        </div>

        <span style={{ fontSize: 10, color: theme.text_tertiary }}>
          {item.author.name}{item.updatedAt ? ` · edited ${relativeTime(item.updatedAt)}` : ` · ${relativeTime(item.createdAt)}`}
        </span>
      </div>
    </>
  );
};
