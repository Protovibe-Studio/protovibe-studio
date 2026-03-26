import React from 'react';
import { theme } from '../../theme';

interface VisualSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean; // Kept to avoid breaking existing imports
}

export const VisualSection: React.FC<VisualSectionProps> = ({ title, children }) => {
  return (
    <div style={{ borderTop: `1px solid ${theme.border_default}` }}>
      <div 
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          color: theme.text_default,
          fontSize: '10px',
          fontWeight: '600',
          }}
      >
        <span>{title}</span>
      </div>
      <div style={{ padding: '0 16px 16px 16px' }}>
        {children}
      </div>
    </div>
  );
};
