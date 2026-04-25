import React, { useState } from 'react';
import { Plus, FileCode, Code2, Copy, CopyCheck } from 'lucide-react';
import { theme } from '../theme';
import { useProtovibe } from '../context/ProtovibeContext';
import { updateSource, takeSnapshot } from '../api/client';
import { InspectorInput } from './InspectorInput';

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', color: theme.text_tertiary }}
  >
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const sectionButtonStyle: React.CSSProperties = {
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
  outline: 'none',
};

export const ClassesRaw: React.FC = () => {
  const { activeData, activeSourceId, runLockedMutation } = useProtovibe();
  const [newClass, setNewClass] = useState('');
  const [copied, setCopied] = useState(false);

  const [classesExpanded, setClassesExpanded] = useState(() => {
    try { return localStorage.getItem('pv-classes-expanded') === 'true'; } catch { return false; }
  });

  const [sourceExpanded, setSourceExpanded] = useState(() => {
    try { return localStorage.getItem('pv-source-expanded') === 'true'; } catch { return false; }
  });

  if (!activeData) return null;

  const handleUpdateClass = async (oldCls: string, newCls: string, action: string) => {
    if (!activeData.file || oldCls === newCls) return;
    await runLockedMutation(async () => {
      await takeSnapshot(activeData.file, activeSourceId!);
      await updateSource({ ...activeData, id: activeSourceId!, oldClass: oldCls, newClass: newCls, action });
    });
  };

  const handleAddClass = async () => {
    if (!newClass.trim() || !activeData.file) return;
    await handleUpdateClass('', newClass.trim(), 'add');
    setNewClass('');
  };

  const toggleClasses = () => {
    const next = !classesExpanded;
    setClassesExpanded(next);
    try { localStorage.setItem('pv-classes-expanded', String(next)); } catch {}
  };

  const toggleSource = () => {
    const next = !sourceExpanded;
    setSourceExpanded(next);
    try { localStorage.setItem('pv-source-expanded', String(next)); } catch {}
  };

  return (
    <div>
      {/* ── Classes ── */}
      {activeData.hasClass && activeData.parsedClasses && Object.keys(activeData.parsedClasses).length > 0 && (
        <div>
          <button onClick={toggleClasses} style={sectionButtonStyle}>
            <span>Classes</span>
            <ChevronIcon expanded={classesExpanded} />
          </button>
          {classesExpanded && (
            <div style={{ padding: '0 16px 16px 16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <InspectorInput
                  type="text"
                  placeholder="Add custom class..."
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                  style={{ color: theme.text_default }}
                  prefix={<Plus size={11} />}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(activeData.parsedClasses).map(([category, classes]: [string, any]) => (
                  <div key={category}>
                    <div style={{ padding: '0 0 4px 0', fontSize: '10px', color: theme.text_tertiary }}>{String(category)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {classes.map((c: any) => (
                        <div key={c.cls}>
                          <InspectorInput
                            type="text"
                            defaultValue={c.cls}
                            onBlur={(e) => handleUpdateClass(c.cls, e.target.value, 'edit')}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            style={{ fontFamily: 'monospace', color: theme.accent_default, fontSize: '10px', paddingLeft: '8px' }}
                            suffix={
                              <button
                                onClick={() => handleUpdateClass(c.cls, '', 'remove')}
                                style={{ background: 'transparent', border: 'none', color: theme.text_tertiary, padding: '2px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                                title="Remove Class"
                                onMouseEnter={e => (e.currentTarget.style.color = theme.text_secondary)}
                                onMouseLeave={e => (e.currentTarget.style.color = theme.text_tertiary)}
                              >&times;</button>
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Source code ── */}
      <div>
        <button onClick={toggleSource} style={sectionButtonStyle}>
          <span>Source code</span>
          <ChevronIcon expanded={sourceExpanded} />
        </button>
        {sourceExpanded && (
          <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeData.file && (
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: theme.text_tertiary, wordBreak: 'break-all' }}>
                {activeData.file}{activeData.startLine ? `:${activeData.startLine}` : ''}
              </span>
            )}
            <pre style={{ margin: 0, padding: '12px', border: `1px solid ${theme.border_default}`, borderRadius: '4px', background: theme.bg_strong, color: theme.text_secondary, fontFamily: 'monospace', fontSize: '10px', overflowX: 'auto', whiteSpace: 'pre', wordBreak: 'normal' }}>
              {activeData.code}
            </pre>
            {activeData.file && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => {
                      const line = activeData.startLine || 1;
                      fetch(`/__open-in-editor?file=${encodeURIComponent(activeData.file)}&line=${line}&column=1`);
                    }}
                    style={{ background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', minHeight: '24px', boxSizing: 'border-box', color: theme.text_default, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <FileCode size={11} />
                    Open in editor
                  </button>
                  <button
                    onClick={async () => {
                      const line = activeData.startLine || 1;
                      const res = await fetch(`/__resolve-file-path?file=${encodeURIComponent(activeData.file)}`);
                      const { absolutePath } = await res.json();
                      window.open(`vscode://file/${absolutePath}:${line}:1`, '_self');
                    }}
                    style={{ background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', minHeight: '24px', boxSizing: 'border-box', color: theme.text_default, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    <Code2 size={11} />
                    Open in VS Code
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeData.code || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    style={{ background: theme.bg_secondary, border: `1px solid ${theme.border_default}`, borderRadius: '4px', padding: '4px 8px', fontSize: '11px', minHeight: '24px', boxSizing: 'border-box', color: theme.text_default, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                  >
                    {copied ? <CopyCheck size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied!' : 'Copy code'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
