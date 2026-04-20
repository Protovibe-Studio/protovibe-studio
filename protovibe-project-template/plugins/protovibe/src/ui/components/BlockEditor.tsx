import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { blockAction, takeSnapshot } from '../api/client';
import { isTextEditableElement, PV_FOCUS_TEXT_CONTENT_EVENT } from '../utils/elementType';
import { theme } from '../theme';

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
  const [isEmpty, setIsEmpty] = useState(true);

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

  const handleBlur = useCallback(async () => {
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

  const handleInput = () => {
    setIsEmpty(!editorRef.current?.textContent?.trim());
  };

  const insertLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    // window.prompt blurs the contentEditable and collapses the selection.
    // Snapshot the range before prompting and restore it after so execCommand
    // has a valid target. If there's no selected text, abort — the link needs
    // something to wrap.
    const range = sel.getRangeAt(0).cloneRange();
    if (range.collapsed) {
      window.alert('Select some text first to turn it into a link.');
      return;
    }
    const existing = sel.anchorNode?.parentElement?.closest('a')?.getAttribute('href') || '';
    const url = window.prompt('Link URL', existing || 'https://');
    if (url === null) return;

    editorRef.current?.focus();
    const restored = window.getSelection();
    restored?.removeAllRanges();
    restored?.addRange(range);

    if (url === '') execCmd('unlink');
    else execCmd('createLink', url);
  };

  if (!isTextNode) return null;

  const btnStyle: React.CSSProperties = {
    background: 'transparent',
    border: `1px solid ${theme.border_default}`,
    color: theme.text_secondary,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '11px',
    cursor: isMutationLocked ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ background: theme.bg_default, paddingBottom: '16px', borderTop: `1px solid ${theme.border_default}` }}>
      <div style={{ padding: '12px 16px 4px', fontSize: '10px', fontWeight: '600', color: theme.text_default }}>
        <span>Text Content</span>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', gap: '4px', marginBottom: '6px' }}>
        <button type="button" disabled={isMutationLocked} onMouseDown={e => { e.preventDefault(); execCmd('bold'); }} style={{ ...btnStyle, fontWeight: 700 }}>B</button>
        <button type="button" disabled={isMutationLocked} onMouseDown={e => { e.preventDefault(); execCmd('italic'); }} style={{ ...btnStyle, fontStyle: 'italic' }}>I</button>
        <button type="button" disabled={isMutationLocked} onMouseDown={e => { e.preventDefault(); insertLink(); }} style={btnStyle}>Link</button>
        <button type="button" disabled={isMutationLocked} onMouseDown={e => { e.preventDefault(); execCmd('removeFormat'); execCmd('unlink'); }} style={btnStyle}>Clear</button>
      </div>
      <div style={{ padding: '0 16px', position: 'relative' }}>
        <div
          ref={editorRef}
          contentEditable={!isMutationLocked}
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          style={{
            width: '100%',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            color: isEmpty ? theme.text_tertiary : theme.accent_default,
            padding: '6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'inherit',
            minHeight: '40px',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: isMutationLocked ? 0.7 : 1,
            cursor: isMutationLocked ? 'progress' : 'text',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      </div>
    </div>
  );
};
