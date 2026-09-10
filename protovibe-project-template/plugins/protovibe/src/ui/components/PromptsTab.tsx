// plugins/protovibe/src/ui/components/PromptsTab.tsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  ExternalLink,
  FileText,
  FolderOpen,
  ImagePlus,
  Paperclip,
  Terminal,
  MousePointer2,
  X,
} from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';
import { savePromptAttachment } from '../api/client';
import { PROMPTS, renderPrompt, PromptRenderContext, PromptFieldRef } from '../prompts/prompts-registry';

type Step = 1 | 2 | 3;

/**
 * A file the user attached to the prompt. By the time one of these exists the
 * bytes have already been copied into the project's gitignored
 * `.protovibe/prompts-attachments/` folder, so `absolutePath` is a real path on
 * the user's disk that a coding agent can open. Nothing leaves the machine.
 *
 * `previewUrl` is a local object URL, images only — the thumbnail is rendered
 * straight from the File the browser already holds, never from the server.
 */
interface PromptAttachment {
  id: string;
  name: string;
  absolutePath: string;
  previewUrl: string | null;
}

let attachmentSeq = 0;


function useProjectRoot() {
  const [root, setRoot] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/__resolve-file-path?file=.')
      .then(r => r.json())
      .then(d => { if (!cancelled) setRoot(d.absolutePath ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return root;
}

function RefChip({ label, value }: { label: string; value: string | null }) {
  const present = !!value;
  return (
    <div
      data-tooltip={value ?? 'Not available'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 6px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 10,
        background: present ? theme.bg_secondary : 'transparent',
        border: `1px solid ${theme.border_default}`,
        color: present ? theme.text_secondary : theme.text_tertiary,
        maxWidth: 240,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ opacity: 0.65 }}>{label}:</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {present ? value : '—'}
      </span>
    </div>
  );
}

// Icon button that opens the native file picker, mirroring the Comments tab's
// composer button. Unlike comments, any file type is accepted — a spec, a log,
// or a screenshot are all just paths handed to the coding agent.
function AttachButton({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={e => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        data-tooltip="Attach a screenshot or file"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent',
          color: theme.text_tertiary, cursor: 'pointer', padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = theme.text_secondary; e.currentTarget.style.background = theme.bg_tertiary; }}
        onMouseLeave={e => { e.currentTarget.style.color = theme.text_tertiary; e.currentTarget.style.background = 'transparent'; }}
      >
        <ImagePlus size={16} />
      </button>
    </>
  );
}

// One attached file. Images get a thumbnail; everything else gets a name chip.
// Either way the tooltip shows the absolute path that will land in the prompt.
function AttachmentItem({ att, onRemove }: { att: PromptAttachment; onRemove: () => void }) {
  // An image the browser can't decode falls back to the name chip rather than
  // rendering a broken-image glyph.
  const [previewFailed, setPreviewFailed] = useState(false);
  const isImage = !!att.previewUrl && !previewFailed;
  return (
    <div
      data-tooltip={att.name}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 6,
        width: isImage ? 56 : undefined, maxWidth: 150, height: 56,
        padding: isImage ? 0 : '0 20px 0 8px',
        borderRadius: 6, overflow: 'hidden', flexShrink: 0,
        border: `1px solid ${theme.border_default}`,
        background: theme.bg_strong,
      }}
    >
      {isImage ? (
        <img
          src={att.previewUrl!}
          alt={att.name}
          onError={() => setPreviewFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <>
          <FileText size={14} color={theme.text_tertiary} style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: theme.font_ui, fontSize: 10, color: theme.text_secondary,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {att.name}
          </span>
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        data-tooltip="Remove attachment"
        style={{
          position: 'absolute', top: 2, right: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.85)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

function AttachmentTray({
  items, saving, onRemove,
}: { items: PromptAttachment[]; saving: number; onRemove: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(a => <AttachmentItem key={a.id} att={a} onRemove={() => onRemove(a.id)} />)}
      {saving > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: 6, flexShrink: 0,
          border: `1px dashed ${theme.border_default}`,
          fontFamily: theme.font_ui, fontSize: 10, color: theme.text_tertiary,
        }}>
          Saving…
        </div>
      )}
    </div>
  );
}

// Covers the whole panel while files are dragged over it, so the drop target is
// the entire Prompts tab rather than just the text field.
function DropOverlay() {
  return (
    <div style={{
      position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, zIndex: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      background: 'rgba(27,27,27,0.94)',
      border: `2px dashed ${theme.accent_default}`,
      borderRadius: 10,
      pointerEvents: 'none',
    }}>
      <Paperclip size={22} color={theme.accent_default} />
      <div style={{ fontFamily: theme.font_ui, fontSize: 13, fontWeight: 600, color: theme.text_default }}>
        Drop to attach
      </div>
    </div>
  );
}

function StepCircle({ n, state }: { n: number; state: 'active' | 'done' | 'pending' }) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  return (
    <div
      style={{
        width: 20, height: 20, borderRadius: '50%',
        background: isDone ? theme.text_default : isActive ? theme.bg_tertiary : 'transparent',
        border: `1px solid ${isActive || isDone ? theme.text_default : theme.border_default}`,
        color: isDone ? theme.bg_strong : theme.text_default,
        fontSize: 11, fontFamily: theme.font_ui, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        opacity: state === 'pending' ? 0.5 : 1,
      }}
    >
      {isDone ? <Check size={12} /> : n}
    </div>
  );
}

function SectionHeading({ n, state, children }: { n: number; state: 'active' | 'done' | 'pending'; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StepCircle n={n} state={state} />
      <span style={{
        fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
        color: state === 'pending' ? theme.text_tertiary : theme.text_default,
      }}>
        {children}
      </span>
    </div>
  );
}

interface SplitButtonAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** If set, the primary button briefly shows this label after being clicked. */
  successLabel?: string;
}

function SplitButton({
  options,
  storageKey,
  disabled: sectionDisabled = false,
}: {
  options: SplitButtonAction[];
  storageKey: string;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved && options.some(o => o.id === saved)) return saved;
    } catch {}
    return options[0]?.id;
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, activeId); } catch {}
  }, [activeId, storageKey]);

  const rawPrimary = options.find(o => o.id === activeId) ?? options[0];
  const primary: SplitButtonAction = sectionDisabled
    ? { ...rawPrimary, disabled: true }
    : rawPrimary;
  const alternates = options.filter(o => o.id !== primary.id);

  const [open, setOpen] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);
  const handlePrimaryClick = (a: SplitButtonAction) => {
    a.onClick();
    if (a.successLabel) {
      setFlashId(a.id);
      window.setTimeout(() => setFlashId(curr => (curr === a.id ? null : curr)), 1500);
    }
  };
  const showingFlash = flashId === primary.id && !!primary.successLabel;
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <>
      <div ref={wrapRef} style={{ display: 'flex', width: '100%' }}>
        <button
          onClick={() => handlePrimaryClick(primary)}
          disabled={primary.disabled}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px',
            background: primary.disabled ? theme.bg_tertiary : theme.text_default,
            color: primary.disabled ? theme.text_tertiary : theme.bg_strong,
            border: 'none',
            borderTopLeftRadius: 6, borderBottomLeftRadius: 6,
            cursor: primary.disabled ? 'not-allowed' : 'pointer',
            fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
            transition: 'background 0.15s ease',
          }}
        >
          {showingFlash ? <Check size={14} /> : primary.icon}
          {showingFlash ? primary.successLabel : primary.label}
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={primary.disabled}
          data-tooltip="More options"
          style={{
            padding: '0 10px',
            background: primary.disabled ? theme.bg_tertiary : theme.text_default,
            color: primary.disabled ? theme.text_tertiary : theme.bg_strong,
            border: 'none',
            borderLeft: `1px solid ${primary.disabled ? theme.border_default : theme.bg_strong}`,
            borderTopRightRadius: 6, borderBottomRightRadius: 6,
            cursor: primary.disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>
      {open && createPortal(
        <div
          ref={menuRef}
          style={{
            ...menuStyle,
            background: theme.bg_strong,
            border: `1px solid ${theme.border_default}`,
            borderRadius: 6,
            padding: 4,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 10000,
          }}
        >
          {alternates.map(a => (
            <button
              key={a.id}
              onClick={() => { setOpen(false); setActiveId(a.id); handlePrimaryClick(a); }}
              disabled={a.disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 10px',
                background: 'transparent', border: 'none',
                color: theme.text_default,
                fontFamily: theme.font_ui, fontSize: 12,
                textAlign: 'left', cursor: a.disabled ? 'not-allowed' : 'pointer',
                borderRadius: 4,
                opacity: a.disabled ? 0.5 : 1,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bg_tertiary)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export const PromptsTab: React.FC = () => {
  const { activeData, currentBaseTarget } = useProtovibe();
  const projectRoot = useProjectRoot();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [includeRules, setIncludeRules] = useState<boolean>(() => {
    try { return localStorage.getItem('pv-prompts-include-rules') === 'true'; } catch { return false; }
  });
  // Attachments belong to the tab, not to one prompt, so they survive going back
  // to the list and picking a different prompt.
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [savingCount, setSavingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // dragenter/dragleave fire for every child element the pointer crosses; count
  // the nesting so the overlay doesn't flicker on the way in.
  const dragDepth = useRef(0);

  const selectedPrompt = useMemo(
    () => PROMPTS.find(p => p.id === selectedId) ?? null,
    [selectedId],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PROMPTS;
    return PROMPTS.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [search]);

  const ctx: PromptRenderContext = useMemo(() => {
    const closestBlock = currentBaseTarget?.closest('[data-pv-block]') as HTMLElement | null;
    const blockId = closestBlock?.getAttribute('data-pv-block') || null;
    return {
      file: activeData?.file ?? null,
      startLine: activeData?.startLine ?? null,
      endLine: activeData?.endLine ?? null,
      blockId,
      code: activeData?.code ?? null,
    };
  }, [activeData, currentBaseTarget]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setSavingCount(n => n + files.length);
    for (const file of files) {
      try {
        const saved = await savePromptAttachment(file);
        attachmentSeq += 1;
        setAttachments(prev => [...prev, {
          id: `att-${attachmentSeq}`,
          name: saved.name,
          absolutePath: saved.absolutePath,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }]);
      } catch (err) {
        showToast((err as Error)?.message || `Could not attach ${file.name}`);
      } finally {
        setSavingCount(n => n - 1);
      }
    }
  }, [showToast]);

  // Removing only drops the reference. The copy stays in the gitignored folder,
  // which is harmless and keeps removal instant.
  const removeAttachment = useCallback((id: string) => {
    const gone = attachments.find(a => a.id === id);
    if (gone?.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, [attachments]);

  const clearAttachments = useCallback(() => {
    attachments.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
    setAttachments([]);
  }, [attachments]);

  // Release every object URL if the tab is ever unmounted.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(() => () => {
    attachmentsRef.current.forEach(a => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
  }, []);

  const dragCarriesFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  // Spread onto both the list and detail roots so the whole right panel is one
  // drop target.
  const dropZoneProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!dragCarriesFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!dragCarriesFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!dragCarriesFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!dragCarriesFiles(e)) return;
      // The canvas installs window-level drop handlers that insert dropped
      // images onto the page. Keep this drop local, or it lands in two places.
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      dragDepth.current = 0;
      setDragOver(false);
      void addFiles(Array.from(e.dataTransfer.files));
    },
  };

  // Same reasoning as the drop handler: the canvas also listens for paste.
  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter(i => i.kind === 'file')
      .map(i => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    void addFiles(files);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setUserInput('');
    setStep(1);
  };

  const handleBack = () => {
    setSelectedId(null);
    setUserInput('');
    setStep(1);
  };

  const handleIncludeRulesChange = useCallback((checked: boolean) => {
    setIncludeRules(checked);
    try { localStorage.setItem('pv-prompts-include-rules', String(checked)); } catch {}
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedPrompt) return;
    let text = renderPrompt(selectedPrompt, ctx, userInput, attachments.map(a => a.absolutePath));
    if (includeRules) {
      try {
        const res = await fetch('/__read-project-file?file=plugins/protovibe/PROTOVIBE_AGENTS.md');
        const data = await res.json();
        if (data.ok && data.content) {
          text += `\n\nHere's the full file with Protovibe rules you need to follow:\n${data.content}`;
        }
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Prompt copied to clipboard');
      setStep(3);
    } catch {
      showToast('Failed to copy prompt');
    }
  }, [selectedPrompt, ctx, userInput, includeRules, attachments, showToast]);

  const openInVsCode = useCallback(() => {
    if (!projectRoot) return;
    window.open(`vscode://file/${projectRoot}`, '_self');
  }, [projectRoot]);

  const copyCdPath = useCallback(async () => {
    if (!projectRoot) return;
    const cmd = `cd "${projectRoot}"`;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      showToast('Failed to copy command');
    }
  }, [projectRoot, showToast]);

  const revealFolder = useCallback(async () => {
    if (!projectRoot) return;
    try {
      const res = await fetch(`/__reveal-folder?path=${encodeURIComponent(projectRoot)}`);
      const data = await res.json();
      if (data.ok) showToast('Revealed in file manager');
      else showToast(data.error || 'Could not reveal folder');
    } catch {
      showToast('Could not reveal folder');
    }
  }, [projectRoot, showToast]);

  // ─── List view ───────────────────────────────────────────────────────
  if (!selectedPrompt) {
    return (
      <div
        {...dropZoneProps}
        style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_strong }}
      >
        <div style={{ padding: '16px 20px 20px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: theme.font_ui, fontSize: 14, fontWeight: 600, color: theme.text_default }}>
              Prompts
            </span>
          </div>
          <input
            type="text"
            placeholder="Find a prompt…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: theme.bg_secondary, border: `1px solid ${theme.border_default}`,
              borderRadius: 6, color: theme.text_default,
              fontFamily: theme.font_ui, fontSize: 12, padding: '6px 10px', outline: 'none',
            }}
          />
          {(attachments.length > 0 || savingCount > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: theme.font_ui, fontSize: 11, fontWeight: 600, color: theme.text_tertiary }}>
                  Attachments
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={clearAttachments}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary,
                  }}
                >
                  Clear
                </button>
              </div>
              <AttachmentTray items={attachments} saving={savingCount} onRemove={removeAttachment} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          <div style={{
            padding: '12px 20px 8px',
            fontFamily: theme.font_ui, fontSize: 11, fontWeight: 600,
            color: theme.text_tertiary,
          }}>
            Coding-agent prompts
          </div>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: theme.font_ui, fontSize: 13, paddingTop: 40 }}>
              No prompts match "{search}".
            </div>
          )}
          {visible.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 20px',
                background: 'transparent', border: 'none',
                borderBottom: `1px solid ${theme.border_default}`,
                cursor: 'pointer', color: theme.text_default, textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.bg_secondary)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 6,
                background: theme.bg_secondary,
                border: `1px solid ${theme.border_default}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: theme.text_default,
              }}>
                {React.createElement(p.icon, { size: 15, strokeWidth: 1.8 })}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: theme.font_ui, fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                <div style={{
                  fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary,
                  marginTop: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.35,
                }}>
                  {p.description}
                </div>
              </div>
              <ChevronRight size={16} color={theme.text_tertiary} />
            </button>
          ))}
        </div>
        {dragOver && <DropOverlay />}
        {toast && <ToastOverlay message={toast} />}
      </div>
    );
  }

  // ─── Detail view ─────────────────────────────────────────────────────
  const refValues: Record<PromptFieldRef, string | null> = {
    file: ctx.file,
    code: ctx.code ? `${ctx.code.slice(0, 40)}${ctx.code.length > 40 ? '…' : ''}` : null,
    blockId: ctx.blockId,
    lineRange: ctx.startLine ? `${ctx.startLine}–${ctx.endLine ?? ctx.startLine}` : null,
  };
  const refLabels: Record<PromptFieldRef, string> = {
    file: 'file',
    code: 'code',
    blockId: 'pv-block',
    lineRange: 'lines',
  };

  return (
    <div
      {...dropZoneProps}
      style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_strong }}
    >
      <div style={{ padding: '16px 20px 20px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleBack}
            style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            data-tooltip="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontFamily: theme.font_ui, fontSize: 14, fontWeight: 600, color: theme.text_default }}>
            {selectedPrompt.title}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Step 1 — describe */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeading n={1} state={step === 1 ? 'active' : 'done'}>
            Write a prompt
          </SectionHeading>
          <label style={{ fontFamily: theme.font_ui, fontSize: 12, fontWeight: 500, color: theme.text_secondary }}>
            {selectedPrompt.inputLabel}
          </label>
          <div
            onPaste={handlePaste}
            style={{
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              background: theme.bg_secondary,
              border: `1px solid ${dragOver ? theme.accent_default : theme.border_default}`,
              borderRadius: 6,
            }}
          >
            <textarea
              value={userInput}
              onChange={e => { setUserInput(e.target.value); if (step !== 1) setStep(1); }}
              placeholder={
                selectedPrompt.inputOptional
                  ? selectedPrompt.inputPlaceholder
                    ? `Optional — ${selectedPrompt.inputPlaceholder}`
                    : 'Optional'
                  : selectedPrompt.inputPlaceholder
              }
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'transparent', border: 'none',
                color: theme.text_default,
                fontFamily: theme.font_ui, fontSize: 12,
                padding: '8px 10px 2px', outline: 'none', resize: 'vertical',
                lineHeight: 1.4,
              }}
            />
            {(attachments.length > 0 || savingCount > 0) && (
              <div style={{ padding: '4px 10px 0' }}>
                <AttachmentTray items={attachments} saving={savingCount} onRemove={removeAttachment} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 5px 6px' }}>
              <AttachButton onFiles={addFiles} />
              {attachments.length > 0 && (
                <button
                  onClick={clearAttachments}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                    fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary,
                  }}
                >
                  Clear
                </button>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontFamily: theme.font_ui, fontSize: 10, color: theme.text_tertiary }}>
                or drop files anywhere here
              </span>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={includeRules}
              onChange={e => handleIncludeRulesChange(e.target.checked)}
              style={{ accentColor: theme.text_default, cursor: 'pointer', width: 13, height: 13 }}
            />
            <span style={{ fontFamily: theme.font_ui, fontSize: 12, color: theme.text_secondary }}>
              Include full Protovibe rules
            </span>
          </label>
          {selectedPrompt.requiresSelection !== false && !ctx.file ? (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 12px',
                background: theme.bg_secondary,
                border: `1px dashed ${theme.border_default}`,
                borderRadius: 8,
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 5,
                background: theme.bg_tertiary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: theme.text_default,
              }}>
                <MousePointer2 size={13} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600, color: theme.text_default }}>
                  Select an element on the canvas
                </div>
                <div style={{ fontFamily: theme.font_ui, fontSize: 11, color: theme.text_tertiary, marginTop: 2, lineHeight: 1.4 }}>
                  This prompt needs a selection to attach the file, source code, and block id.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: theme.font_ui, fontSize: 11, fontWeight: 500, color: theme.text_tertiary }}>
                Will be attached to the prompt
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedPrompt.references.map(r => (
                  <RefChip key={r} label={refLabels[r]} value={refValues[r]} />
                ))}
                <RefChip label="rules" value="PROTOVIBE_AGENTS.md" />
                {attachments.length > 0 && (
                  <RefChip label="files" value={`${attachments.length} attached`} />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Step 2 — copy */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeading n={2} state={step < 2 && !userInput.trim() && attachments.length === 0 && !selectedPrompt.inputOptional ? 'pending' : step >= 3 ? 'done' : 'active'}>
            Copy prompt
          </SectionHeading>
          {(() => {
            const canCopy = selectedPrompt.inputOptional || !!userInput.trim() || attachments.length > 0;
            return (
          <button
            onClick={handleCopy}
            disabled={!canCopy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 14px',
              background: canCopy ? theme.text_default : theme.bg_tertiary,
              color: canCopy ? theme.bg_strong : theme.text_tertiary,
              border: 'none', borderRadius: 6,
              cursor: canCopy ? 'pointer' : 'not-allowed',
              fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
            }}
          >
            {step >= 3 ? <Check size={14} /> : <Copy size={14} />}
            {step >= 3 ? 'Copied — copy again' : 'Copy prompt'}
          </button>
            );
          })()}
        </section>

        {/* Step 3 — open project */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeading n={3} state={step >= 3 ? 'active' : 'pending'}>
            Open project folder in your coding agent
          </SectionHeading>
          <SplitButton
            storageKey="pv-prompts-open-action"
            disabled={step < 3 || !projectRoot}
            options={[
              { id: 'vscode', label: 'Open project in VS Code', icon: <ExternalLink size={14} />, onClick: openInVsCode },
              { id: 'cd', label: 'Copy terminal cd path', icon: <Terminal size={13} />, onClick: copyCdPath, successLabel: 'Copied!' },
              { id: 'reveal', label: 'Reveal folder in Finder', icon: <FolderOpen size={13} />, onClick: revealFolder },
            ]}
          />
          {projectRoot && (
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: theme.text_tertiary, wordBreak: 'break-all' }}>
              {projectRoot}
            </div>
          )}
        </section>
      </div>

      {dragOver && <DropOverlay />}
      {toast && <ToastOverlay message={toast} />}
    </div>
  );
};

function ToastOverlay({ message }: { message: string }) {
  return createPortal(
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
      background: theme.text_default, color: theme.bg_strong,
      padding: '8px 14px', borderRadius: 6,
      fontFamily: theme.font_ui, fontSize: 12, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      zIndex: 10001,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <Check size={13} />
      {message}
    </div>,
    document.body,
  );
}
