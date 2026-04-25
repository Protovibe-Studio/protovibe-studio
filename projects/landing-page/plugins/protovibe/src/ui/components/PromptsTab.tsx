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
  FolderOpen,
  Terminal,
  MousePointer2,
} from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';
import { PROMPTS, renderPrompt, PromptRenderContext, PromptFieldRef } from '../prompts/prompts-registry';

type Step = 1 | 2 | 3;


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
      title={value ?? 'Not available'}
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
        fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600,
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
        fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
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
            fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
            transition: 'background 0.15s ease',
          }}
        >
          {showingFlash ? <Check size={14} /> : primary.icon}
          {showingFlash ? primary.successLabel : primary.label}
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={primary.disabled}
          title="More options"
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
                fontFamily: 'sans-serif', fontSize: 12,
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
    let text = renderPrompt(selectedPrompt, ctx, userInput);
    if (includeRules) {
      try {
        const res = await fetch('/__read-project-file?file=AGENTS.md');
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
  }, [selectedPrompt, ctx, userInput, includeRules, showToast]);

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_default }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: 'sans-serif', fontSize: 14, fontWeight: 600, color: theme.text_default }}>
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
              fontFamily: 'sans-serif', fontSize: 12, padding: '6px 10px', outline: 'none',
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          <div style={{
            padding: '12px 16px 8px',
            fontFamily: 'sans-serif', fontSize: 11, fontWeight: 600,
            color: theme.text_tertiary,
          }}>
            Coding-agent prompts
          </div>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', color: theme.text_tertiary, fontFamily: 'sans-serif', fontSize: 13, paddingTop: 40 }}>
              No prompts match "{search}".
            </div>
          )}
          {visible.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 16px',
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
                <div style={{ fontFamily: 'sans-serif', fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                <div style={{
                  fontFamily: 'sans-serif', fontSize: 11, color: theme.text_tertiary,
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: theme.bg_default }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, backgroundColor: theme.bg_strong, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleBack}
            style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          {React.createElement(selectedPrompt.icon, { size: 14, strokeWidth: 1.8 })}
          <span style={{ fontFamily: 'sans-serif', fontSize: 14, fontWeight: 600, color: theme.text_default }}>
            {selectedPrompt.title}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Step 1 — describe */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeading n={1} state={step === 1 ? 'active' : 'done'}>
            Write a prompt
          </SectionHeading>
          <label style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 500, color: theme.text_secondary }}>
            {selectedPrompt.inputLabel}
          </label>
          <textarea
            value={userInput}
            onChange={e => { setUserInput(e.target.value); if (step !== 1) setStep(1); }}
            placeholder={selectedPrompt.inputPlaceholder}
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: theme.bg_secondary, border: `1px solid ${theme.border_default}`,
              borderRadius: 6, color: theme.text_default,
              fontFamily: 'sans-serif', fontSize: 12,
              padding: '8px 10px', outline: 'none', resize: 'vertical',
              lineHeight: 1.4,
            }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={includeRules}
              onChange={e => handleIncludeRulesChange(e.target.checked)}
              style={{ accentColor: theme.text_default, cursor: 'pointer', width: 13, height: 13 }}
            />
            <span style={{ fontFamily: 'sans-serif', fontSize: 12, color: theme.text_secondary }}>
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
                <div style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600, color: theme.text_default }}>
                  Select an element on the canvas
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: 11, color: theme.text_tertiary, marginTop: 2, lineHeight: 1.4 }}>
                  This prompt needs a selection to attach the file, source code, and block id.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 500, color: theme.text_tertiary }}>
                Will be attached to the prompt
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedPrompt.references.map(r => (
                  <RefChip key={r} label={refLabels[r]} value={refValues[r]} />
                ))}
                <RefChip label="rules" value="AGENTS.md" />
              </div>
            </div>
          )}
        </section>

        {/* Step 2 — copy */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SectionHeading n={2} state={step < 2 && !userInput.trim() ? 'pending' : step >= 3 ? 'done' : 'active'}>
            Copy prompt
          </SectionHeading>
          <button
            onClick={handleCopy}
            disabled={!userInput.trim()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 14px',
              background: userInput.trim() ? theme.text_default : theme.bg_tertiary,
              color: userInput.trim() ? theme.bg_strong : theme.text_tertiary,
              border: 'none', borderRadius: 6,
              cursor: userInput.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
            }}
          >
            {step >= 3 ? <Check size={14} /> : <Copy size={14} />}
            {step >= 3 ? 'Copied — copy again' : 'Copy prompt'}
          </button>
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
      fontFamily: 'sans-serif', fontSize: 12, fontWeight: 600,
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
