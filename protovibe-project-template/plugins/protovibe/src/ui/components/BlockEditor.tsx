import React, { useState, useEffect, useRef } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { blockAction, takeSnapshot } from '../api/client';
import { isTextEditableElement, PV_FOCUS_TEXT_CONTENT_EVENT } from '../utils/elementType';
import { theme } from '../theme';

export const BlockEditor: React.FC = () => {
  // 1. Add isLoading to the destructuring
  const { currentBaseTarget, activeData, activeSourceId, runLockedMutation, isMutationLocked, isLoading } = useProtovibe();
  
  const textContentRef = useRef<HTMLTextAreaElement>(null);
  const originalTextContentRef = useRef<string>('');
  const [textContent, setTextContent] = useState('');
  
  const isTextNode = isTextEditableElement(currentBaseTarget, activeData?.code, activeData?.configSchema);

  const normalizeText = (value: string) => String(value).trim();

  useEffect(() => {
    const handleFocusTextContent = () => {
      if (!isTextEditableElement(currentBaseTarget, activeData?.code, activeData?.configSchema)) return;
      const input = textContentRef.current;
      if (!input) return;
      input.focus();
      input.select();
    };
    window.addEventListener(PV_FOCUS_TEXT_CONTENT_EVENT, handleFocusTextContent);
    return () => window.removeEventListener(PV_FOCUS_TEXT_CONTENT_EVENT, handleFocusTextContent);
  }, [currentBaseTarget, activeData?.code]);

  useEffect(() => {
    // 2. Immediately clear text if loading new data (e.g. keyboard traversal)
    // or if the element is no longer a valid text node.
    if (isLoading || !isTextNode || !activeData?.code) {
      setTextContent('');
      originalTextContentRef.current = '';
      return;
    }

    // 3. Safely extract text from AST
    const codeSnippet = activeData.code;
    const firstClose = codeSnippet.indexOf('>');
    const lastOpen = codeSnippet.lastIndexOf('<');

    if (firstClose !== -1 && lastOpen !== -1 && lastOpen > firstClose) {
      let innerContent = codeSnippet.slice(firstClose + 1, lastOpen);
      
      // Clean up formatting for the textarea
      innerContent = innerContent.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // Remove comments
      innerContent = innerContent.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> to newlines
      
      // Unescape JSX specific characters
      innerContent = innerContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#123;/g, '{')
        .replace(/&#125;/g, '}');

      const normalized = normalizeText(innerContent);
      originalTextContentRef.current = normalized;
      setTextContent(normalized);
    } else {
      setTextContent('');
      originalTextContentRef.current = '';
    }
  // 4. Add isLoading and currentBaseTarget to the dependency array
  }, [currentBaseTarget, activeData?.code, isTextNode, isLoading]);

  if (!isTextNode) return null;

  const closestBlockId = currentBaseTarget?.closest('[data-pv-block]')?.getAttribute('data-pv-block');

  const handleTextUpdate = async (newText: string) => {
    if (!closestBlockId || !activeData?.file) return;
    if (normalizeText(newText) === originalTextContentRef.current) return;
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await blockAction('edit-text', closestBlockId, activeData.file, newText);
      originalTextContentRef.current = normalizeText(newText);
    });
  };

  return (
    <div style={{ background: theme.bg_default, paddingBottom: '16px', borderTop: `1px solid ${theme.border_default}` }}>
      <div style={{ padding: '12px 16px 4px', fontSize: '10px', fontWeight: '600', color: theme.text_default }}>
        <span>Text Content</span>
      </div>
      <div style={{ padding: '0 16px' }}>
        <textarea
          ref={textContentRef}
          value={String(textContent)}
          disabled={isMutationLocked}
          onChange={e => setTextContent(e.target.value)}
          onBlur={e => handleTextUpdate(e.target.value)}
          style={{
            width: '100%',
            background: theme.bg_secondary,
            border: `1px solid ${theme.border_default}`,
            color: textContent ? theme.accent_default : theme.text_tertiary,
            padding: '6px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'inherit',
            minHeight: '40px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            opacity: isMutationLocked ? 0.7 : 1,
            cursor: isMutationLocked ? 'progress' : 'text',
          }}
        />
      </div>
    </div>
  );
};