import React from 'react';
import { theme } from '../../theme';

interface VisualSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean; // Kept to avoid breaking existing imports
  headerAction?: React.ReactNode;
}

export const VisualSection: React.FC<VisualSectionProps> = ({ title, children, headerAction }) => {
  return (
    <div data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`} style={{ borderTop: `1px solid ${theme.border_default}` }}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          color: theme.text_default,
          fontSize: '10px',
          fontWeight: '600',
          }}
      >
        <span>{title}</span>
        {headerAction}
      </div>
      <div style={{ padding: '0 20px 16px 20px' }}>
        {children}
      </div>
    </div>
  );
};
