// plugins/protovibe/src/ui/components/Tabs.tsx
import React from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';

export const Tabs: React.FC = () => {
  const { sourceDataList, activeSourceId, setActiveSourceId, setActiveModifiers } = useProtovibe();

  const normalizePath = (filePath: string) => filePath.replace(/\\/g, '/');
  const isComponentsFolderSource = (filePath: string) => {
    const normalized = normalizePath(filePath);
    return /(^|\/)src\/components(\/|$)/.test(normalized);
  };
  const getFileStem = (fileName: string) => fileName.replace(/\.[^.]+$/, '');
  const hasComponentsFolderSource = sourceDataList.some((source) => isComponentsFolderSource(source.data?.file || ''));

  if (sourceDataList.length <= 1 && !hasComponentsFolderSource) return null;

  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, padding: '12px 16px', gap: '8px', overflowX: 'auto', flexShrink: 0 }}>
      {sourceDataList.map((source) => {
        const isActive = source.id === activeSourceId;
        const defaultDisplayName = source.data?.configSchema?.displayName || source.data?.configSchema?.name || source.data?.compName || 'Block';
        
        // Extract folder and file for context
        const filePath = source.data?.file || '';
        const parts = normalizePath(filePath).split('/');
        const fileName = parts.pop() || 'Unknown';
        
        const isCompFolder = isComponentsFolderSource(filePath);
        const locationText = isCompFolder ? 'Component' : fileName;
        const displayName = isCompFolder ? getFileStem(fileName) : defaultDisplayName;

        const activeBg = isCompFolder ? 'rgba(168, 85, 247, 0.15)' : theme.bg_secondary;
        const activeBorder = isCompFolder ? '#A855F7' : theme.accent_default;
        const topLabelColor = isCompFolder ? '#A855F7' : theme.text_tertiary;

        return (
          <button
            key={source.id}
            onClick={() => {
              setActiveSourceId(source.id);
              setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {} });
              // If this source lives in src/components/ui, navigate the shell to the
              // Components tab and open that component's playground preview.
              if (isCompFolder && filePath) {
                window.dispatchEvent(
                  new CustomEvent('pv-open-component-preview', { detail: { filePath } })
                );
              }
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '8px 12px',
              background: isActive ? activeBg : 'transparent',
              border: `1px solid ${isActive ? activeBorder : theme.border_default}`,
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              boxShadow: isActive ? (isCompFolder ? '0 2px 8px rgba(168, 85, 247, 0.25)' : '0 2px 8px rgba(0,0,0,0.2)') : 'none'
            }}
          >
            <span style={{ fontSize: '9px', color: topLabelColor, marginBottom: '4px', fontFamily: 'monospace', fontWeight: isCompFolder ? 'bold' : 'normal', letterSpacing: isCompFolder ? '0.5px' : '0' }}>
              {locationText}
            </span>
            <span style={{ color: isActive ? theme.text_default : theme.text_secondary, fontSize: '12px', fontWeight: isActive ? '600' : '500' }}>
              {String(displayName)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
