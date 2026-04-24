// plugins/protovibe/src/ui/components/Tabs.tsx
import React, { useState } from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { theme } from '../theme';

const SourceFileButton: React.FC<{
  isActive: boolean;
  isCompFolder: boolean;
  activeBg: string;
  activeBorder: string;
  topLabelColor: string;
  locationText: string;
  displayName: string;
  filePath: string;
  onSelect: () => void;
}> = ({ isActive, isCompFolder, activeBg, activeBorder, topLabelColor, locationText, displayName, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  const bg = isActive ? activeBg : hovered ? theme.bg_low : 'transparent';
  const border = isActive ? activeBorder : hovered ? theme.border_strong : theme.border_default;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '8px 12px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        minWidth: '80px',
        maxWidth: '160px',
        overflow: 'hidden',
        textAlign: 'left',
        boxShadow: isActive ? (isCompFolder ? '0 2px 8px rgba(168, 85, 247, 0.25)' : '0 2px 8px rgba(0,0,0,0.2)') : 'none'
      }}
    >
      <span style={{ fontSize: '10px', color: topLabelColor, marginBottom: '4px', fontWeight: 'bold'}}>
        {locationText}
      </span>
      <span style={{ color: isActive ? theme.text_default : hovered ? theme.text_default : theme.text_secondary, fontSize: '12px', fontWeight: isActive ? '600' : '500', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
        {String(displayName)}
      </span>
    </button>
  );
};

export const Tabs: React.FC = () => {
  const { sourceDataList, activeSourceId, setActiveSourceId, setActiveModifiers, activeData } = useProtovibe();

  const normalizePath = (filePath: string) => filePath.replace(/\\/g, '/');
  const isComponentsFolderSource = (filePath: string) => {
    const normalized = normalizePath(filePath);
    return /(^|\/)src\/components(\/|$)/.test(normalized);
  };
  const getFileStem = (fileName: string) => fileName.replace(/\.[^.]+$/, '');
  const hasComponentsFolderSource = sourceDataList.some((source) => isComponentsFolderSource(source.data?.file || ''));

  if (sourceDataList.length <= 1 && !hasComponentsFolderSource) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, flexShrink: 0 }}>
      <div style={{ padding: '12px 16px 0' }}>
        <span style={{ fontSize: '10px', fontWeight: '600', color: theme.text_default }}>
          Source files
        </span>
      </div>
      <div style={{ display: 'flex', padding: '8px 16px 12px', gap: '8px', overflowX: 'auto' }}>
      {sourceDataList.map((source) => {
        const isActive = source.id === activeSourceId;
        // Extract folder and file for context
        const filePath = source.data?.file || '';
        const parts = normalizePath(filePath).split('/');
        const fileName = parts.pop() || 'Unknown';
        
        const isCompFolder = isComponentsFolderSource(filePath);
        const locationText = isCompFolder ? 'Component' : 'File';
        const displayName = fileName;

        const activeBg = isCompFolder ? 'rgba(168, 85, 247, 0.15)' : theme.bg_secondary;
        const activeBorder = isCompFolder ? '#A855F7' : theme.accent_default;
        const topLabelColor = isCompFolder ? '#A855F7' : theme.text_tertiary;

        return (
          <SourceFileButton
            key={source.id}
            isActive={isActive}
            isCompFolder={isCompFolder}
            activeBg={activeBg}
            activeBorder={activeBorder}
            topLabelColor={topLabelColor}
            locationText={locationText}
            displayName={displayName}
            filePath={filePath}
            onSelect={() => {
              // Extract props from the CURRENTLY active source (the consumer file)
              // before we switch the view to the component definition file.
              const currentProps = activeData?.componentProps?.reduce((acc: any, p: any) => {
                acc[p.name] = p.value;
                return acc;
              }, {}) || {};

              setActiveSourceId(source.id);
              setActiveModifiers({ interaction: [], breakpoint: null, dataAttrs: {}, pseudoClasses: [] });
              if (isCompFolder && filePath) {
                window.dispatchEvent(
                  new CustomEvent('pv-open-component-preview', { detail: { filePath, currentProps } })
                );
              }
            }}
          />
        );
      })}
      </div>
    </div>
  );
};
