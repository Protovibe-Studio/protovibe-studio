import React, { useState } from 'react';
import { theme } from '../theme';
import { useProtovibe } from '../context/ProtovibeContext';
import { updateSource, takeSnapshot } from '../api/client';
import { InspectorInput } from './InspectorInput';

export const ClassesRaw: React.FC = () => {
  const { activeData, activeSourceId, runLockedMutation } = useProtovibe();
  const [newClass, setNewClass] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Initialize state from localStorage (defaulting to false/collapsed)
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem('pv-advanced-expanded') === 'true';
    } catch (e) {
      return false;
    }
  });

  if (!activeData) return null;

  const handleUpdateClass = async (oldCls: string, newCls: string, action: string) => {
    if (!activeData.file || oldCls === newCls) return;
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateSource({
        ...activeData,
        id: activeSourceId!,
        oldClass: oldCls,
        newClass: newCls,
        action
      });
    });
  };

  const handleAddClass = async () => {
    if (!newClass.trim() || !activeData.file) return;
    await handleUpdateClass('', newClass.trim(), 'add');
    setNewClass('');
  };

  const toggleExpanded = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    try {
      localStorage.setItem('pv-advanced-expanded', String(nextState));
    } catch (e) {}
  };

  const detailsStyle: React.CSSProperties = {
    borderTop: `1px solid ${theme.border_default}`,
    background: theme.bg_default
  };

  const summaryStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '10px',
    fontWeight: 'bold',
    color: theme.text_tertiary,
    outline: 'none'
  };

  return (
    <div>
      <button 
        onClick={toggleExpanded}
        style={{ 
          width: '100%', 
          padding: '12px 16px', 
          color: theme.text_default, 
          fontSize: '10px', 
          fontWeight: '600', 
          borderTop: `1px solid ${theme.border_default}`, 
          borderBottom: 'none', 
          borderLeft: 'none', 
          borderRight: 'none', 
          background: 'transparent', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer', 
          outline: 'none' 
        }}
      >
        <span>Advanced</span>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ 
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s ease',
            color: theme.text_tertiary
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isExpanded && (
        <div>
          {activeData.hasClass && activeData.parsedClasses && Object.keys(activeData.parsedClasses).length > 0 && (
            <div style={detailsStyle}>
              <div style={summaryStyle}>
                Applied Classes ({Object.values(activeData.parsedClasses).flat().length})
              </div>
              <div>
                {Object.entries(activeData.parsedClasses).map(([category, classes]: [string, any]) => (
                  <div key={category}>
                    <div style={{ padding: '6px 16px', fontWeight: 'bold', fontSize: '10px', color: theme.text_tertiary }}>{String(category)}</div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {classes.map((c: any) => (
                        <div key={c.cls} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <InspectorInput
                            type="text"
                            defaultValue={c.cls}
                            onBlur={(e) => handleUpdateClass(c.cls, e.target.value, 'edit')}
                            style={{ fontFamily: 'monospace', color: theme.text_default }}
                          />
                          <button 
                            onClick={() => handleUpdateClass(c.cls, '', 'remove')}
                            style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, fontWeight: 'bold', padding: '4px', cursor: 'pointer' }}
                            title="Remove Class"
                          >&times;</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '12px 16px', background: theme.bg_default, display: 'flex', gap: '8px', alignItems: 'center', borderTop: `1px solid ${theme.border_default}` }}>
            <InspectorInput
              type="text"
              placeholder="e.g. text-center"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
              style={{ fontFamily: 'monospace', color: theme.text_default }}
            />
            <button 
              onClick={handleAddClass}
              style={{ background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, color: theme.text_default, padding: '4px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
            >Add</button>
          </div>

          <div style={{ ...detailsStyle, borderTop: `1px solid ${theme.border_default}` }}>
            <div style={summaryStyle}>Raw Code</div>
            {activeData.file && (
              <div style={{ padding: '0 16px 8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: theme.text_tertiary, wordBreak: 'break-all' }}>
                  {activeData.file}{activeData.startLine ? `:${activeData.startLine}` : ''}
                </span>
                <button
                  onClick={() => {
                    const line = activeData.startLine || 1;
                    fetch(`/__open-in-editor?file=${encodeURIComponent(activeData.file)}&line=${line}&column=1`);
                  }}
                  style={{ alignSelf: 'flex-start', background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '3px 10px', fontSize: '10px', color: theme.text_default, cursor: 'pointer' }}
                >
                  Open in editor
                </button>
              </div>
            )}
            <div style={{ padding: '0 16px 16px 16px', position: 'relative' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeData.code || '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                style={{ position: 'absolute', top: '6px', right: '22px', background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: theme.text_tertiary, cursor: 'pointer', zIndex: 1 }}
                title="Copy code"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <pre style={{ margin: 0, padding: '12px', border: `1px solid ${theme.border_default}`, borderRadius: '4px', color: theme.text_secondary, fontFamily: 'monospace', fontSize: '10px', overflowX: 'auto', whiteSpace: 'pre', wordBreak: 'normal' }}>
                {activeData.code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};