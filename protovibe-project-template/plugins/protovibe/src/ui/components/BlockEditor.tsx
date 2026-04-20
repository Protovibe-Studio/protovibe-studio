import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, RemoveFormatting } from 'lucide-react';
import { useProtovibe } from '../context/ProtovibeContext';
import { blockAction, takeSnapshot } from '../api/client';
import { isTextEditableElement, PV_FOCUS_TEXT_CONTENT_EVENT } from '../utils/elementType';
import { theme } from '../theme';
import { LinkPopover } from './LinkPopover';

type ToolbarButtonProps = {
  disabled?: boolean;
  title: string;
  onActivate: (btn: HTMLButtonElement) => void;
  children: React.ReactNode;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ disabled, title, onActivate, children }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // onMouseDown + preventDefault keeps the contentEditable selection alive.
      onMouseDown={e => { e.preventDefault(); if (!disabled) onActivate(e.currentTarget); }}
      style={{
        background: hover && !disabled ? theme.bg_tertiary : 'transparent',
        border: 'none',
        color: theme.text_secondary,
        borderRadius: '3px',
        width: '22px',
        height: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        fontSize: '11px',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};

// Extract inner text/HTML from a JSX snippet. Converts the JSX-escaped /
// className form into something contentEditable can display natively.
const jsxInnerToEditorHtml = (codeSnippet: string): string => {
  const firstClose = codeSnippet.indexOf('>');
  const lastOpen = codeSnippet.lastIndexOf('<');
  if (firstClose === -1 || lastOpen === -1 || lastOpen <= firstClose) return '';

  let inner = codeSnippet.slice(firstClose + 1, lastOpen);

  // Strip JSX comments (e.g., {/* pv-editable-zone */}).
  inner = inner.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  // Convert JSX className to HTML class so the browser applies it in the editor.
  inner = inner.replace(/\bclassName=/g, 'class=');

  // Unescape JSX entities back to their literal characters. Order matters:
  // &amp; must be decoded LAST so we don't double-decode things like &amp;lt;.
  inner = inner
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  return inner.trim();
};

const execCmd = (cmd: string, value?: string) => {
  document.execCommand(cmd, false, value);
};

export const BlockEditor: React.FC = () => {
  const { currentBaseTarget, activeData, activeSourceId, runLockedMutation, isMutationLocked, isLoading } = useProtovibe();

  const editorRef = useRef<HTMLDivElement>(null);
  const originalHtmlRef = useRef<string>('');
  const savedRangeRef = useRef<Range | null>(null);
  // While the link popover is open, the editor loses focus to the popover
  // input — suppress the intermediate blur-save so HMR doesn't re-render the
  // editor and detach the DOM nodes our saved Range points to.
  const suppressBlurRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [linkPopover, setLinkPopover] = useState<{ anchorRect: DOMRect; initialUrl: string } | null>(null);

  const isTextNode = isTextEditableElement(currentBaseTarget, activeData?.code, activeData?.configSchema);

  const normalizeHtml = (value: string) => value.replace(/\s+/g, ' ').trim();

  useEffect(() => {
    const handleFocus = () => {
      if (!isTextEditableElement(currentBaseTarget, activeData?.code, activeData?.configSchema)) return;
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };
    window.addEventListener(PV_FOCUS_TEXT_CONTENT_EVENT, handleFocus);
    return () => window.removeEventListener(PV_FOCUS_TEXT_CONTENT_EVENT, handleFocus);
  }, [currentBaseTarget, activeData?.code]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (isLoading || !isTextNode || !activeData?.code) {
      el.innerHTML = '';
      originalHtmlRef.current = '';
      setIsEmpty(true);
      return;
    }

    const html = jsxInnerToEditorHtml(activeData.code);
    el.innerHTML = html;
    originalHtmlRef.current = normalizeHtml(html);
    setIsEmpty(!el.textContent?.trim());
  }, [currentBaseTarget, activeData?.code, isTextNode, isLoading]);

  const closestBlockId = currentBaseTarget?.closest('[data-pv-block]')?.getAttribute('data-pv-block');

  const persistIfChanged = useCallback(async () => {
    const el = editorRef.current;
    if (!el || !closestBlockId || !activeData?.file) return;

    const newHtml = normalizeHtml(el.innerHTML);
    if (newHtml === originalHtmlRef.current) return;

    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await blockAction('edit-text', closestBlockId, activeData.file, newHtml);
      originalHtmlRef.current = newHtml;
    });
  }, [closestBlockId, activeData?.file, activeSourceId, runLockedMutation]);

  const handleBlur = useCallback(async () => {
    if (suppressBlurRef.current) return;
    await persistIfChanged();
  }, [persistIfChanged]);

  const handleInput = () => {
    setIsEmpty(!editorRef.current?.textContent?.trim());
  };

  const openLinkPopover = (btn: HTMLButtonElement) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0).cloneRange();

    // Walk up from the selection to find an existing <a> (so editing an
    // already-linked span shows its current href).
    const container = (sel.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? (sel.anchorNode as Element)
      : sel.anchorNode?.parentElement) || null;
    const existingHref = container?.closest('a')?.getAttribute('href') || '';

    // Allow Link with a collapsed caret ONLY when the caret sits inside an
    // existing link (so the user can edit it). Otherwise require a selection.
    if (range.collapsed && !existingHref) return;

    savedRangeRef.current = range;
    suppressBlurRef.current = true;
    setLinkPopover({
      anchorRect: btn.getBoundingClientRect(),
      initialUrl: existingHref,
    });
  };

  const restoreSelection = () => {
    const range = savedRangeRef.current;
    if (!range) return;
    editorRef.current?.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const finishLinkFlow = (cmd: 'createLink' | 'unlink' | null, value?: string) => {
    restoreSelection();
    if (cmd) execCmd(cmd, value);
    savedRangeRef.current = null;
    setLinkPopover(null);
    suppressBlurRef.current = false;
    persistIfChanged();
  };

  const handleLinkSave = (url: string) => finishLinkFlow('createLink', url);
  const handleLinkRemove = () => finishLinkFlow('unlink');
  const handleLinkCancel = () => {
    // Nothing changed — skip the save path entirely.
    suppressBlurRef.current = false;
    savedRangeRef.current = null;
    setLinkPopover(null);
  };

  if (!isTextNode) return null;

  return (
    <div style={{ background: theme.bg_default, paddingBottom: '16px', borderTop: `1px solid ${theme.border_default}` }}>
      <div style={{ padding: '12px 16px 4px', fontSize: '10px', fontWeight: '600', color: theme.text_default }}>
        <span>Text Content</span>
      </div>
      <div style={{ padding: '0 16px' }}>
        <div
          style={{
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '4px',
            opacity: isMutationLocked ? 0.7 : 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            ref={editorRef}
            contentEditable={!isMutationLocked}
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={handleBlur}
            style={{
              color: isEmpty ? theme.text_tertiary : theme.accent_default,
              padding: '6px',
              fontSize: '11px',
              fontFamily: 'inherit',
              minHeight: '40px',
              outline: 'none',
              cursor: isMutationLocked ? 'progress' : 'text',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 4px',
              borderTop: `1px solid ${theme.border_secondary}`,
            }}
          >
            <div style={{ display: 'flex', gap: '2px' }}>
              <ToolbarButton title="Bold" disabled={isMutationLocked} onActivate={() => { execCmd('bold'); persistIfChanged(); }}>
                <Bold size={12} />
              </ToolbarButton>
              <ToolbarButton title="Italic" disabled={isMutationLocked} onActivate={() => { execCmd('italic'); persistIfChanged(); }}>
                <Italic size={12} />
              </ToolbarButton>
              <ToolbarButton title="Underline" disabled={isMutationLocked} onActivate={() => { execCmd('underline'); persistIfChanged(); }}>
                <Underline size={12} />
              </ToolbarButton>
              <ToolbarButton title="Link" disabled={isMutationLocked} onActivate={openLinkPopover}>
                <LinkIcon size={12} />
              </ToolbarButton>
            </div>
            <ToolbarButton
              title="Clear formatting"
              disabled={isMutationLocked}
              onActivate={() => { execCmd('removeFormat'); execCmd('unlink'); persistIfChanged(); }}
            >
              <RemoveFormatting size={12} />
            </ToolbarButton>
          </div>
        </div>
      </div>
      {linkPopover && (
        <LinkPopover
          anchorRect={linkPopover.anchorRect}
          initialUrl={linkPopover.initialUrl}
          onSave={handleLinkSave}
          onRemove={handleLinkRemove}
          onCancel={handleLinkCancel}
        />
      )}
    </div>
  );
};
