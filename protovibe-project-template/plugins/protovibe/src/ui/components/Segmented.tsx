// plugins/protovibe/src/ui/components/Segmented.tsx
import React from 'react';
import { theme } from '../theme';

// Inspector-style segmented control (self-contained; no source mutation).
export const Segmented: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { val: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div style={{ display: 'flex', background: theme.bg_secondary, borderRadius: 4, border: `1px solid ${theme.border_default}`, overflow: 'hidden' }}>
    {options.map((o, idx) => {
      const active = value === o.val;
      return (
        <React.Fragment key={o.val}>
          {idx > 0 && <div style={{ width: 1, background: theme.border_default }} />}
          <button
            onClick={() => onChange(o.val)}
            style={{
              flex: 1, padding: '5px 8px', border: 'none', cursor: 'pointer',
              background: active ? theme.bg_tertiary : 'transparent',
              color: active ? theme.accent_default : theme.text_tertiary,
              fontSize: 11, fontWeight: 600, fontFamily: theme.font_ui,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {o.label}
          </button>
        </React.Fragment>
      );
    })}
  </div>
);
