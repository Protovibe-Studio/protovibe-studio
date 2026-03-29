// plugins/protovibe/src/ui/components/ShellNavBar.tsx
import React from 'react';
import { Monitor, LayoutGrid, Palette, Paintbrush, Eye, EyeOff } from 'lucide-react';
import { theme } from '../theme';

export type IframeTab = 'app' | 'components';
export type SidebarTab = 'design' | 'tokens';

/** @deprecated Use IframeTab / SidebarTab instead */
export type ShellTab = IframeTab | SidebarTab;

const IFRAME_TABS: { id: IframeTab; icon: React.ElementType; label: string }[] = [
  { id: 'app', icon: Monitor, label: 'App' },
  { id: 'components', icon: LayoutGrid, label: 'Components' },
];

const SIDEBAR_TABS: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'design', icon: Paintbrush, label: 'Design' },
  { id: 'tokens', icon: Palette, label: 'Tokens' },
];

type ShellNavBarProps = {
  activeIframeTab: IframeTab;
  onIframeTabChange: (tab: IframeTab) => void;
  activeSidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
  inspectorOpen?: boolean;
  onToggleInspector?: () => void;
};

function TabButton({
  id,
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      key={id}
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '30px',
        padding: '0 10px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        fontWeight: isActive ? 600 : 400,
        backgroundColor: isActive ? theme.bg_tertiary : 'transparent',
        color: isActive ? theme.text_default : theme.text_tertiary,
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
    >
      <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
      {label}
    </button>
  );
}

export const ShellNavBar: React.FC<ShellNavBarProps> = ({
  activeIframeTab,
  onIframeTabChange,
  activeSidebarTab,
  onSidebarTabChange,
  inspectorOpen,
  onToggleInspector,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '4px',
        padding: '0 12px',
        height: '44px',
        backgroundColor: theme.bg_strong,
        borderBottom: `1px solid ${theme.border_default}`,
        flexShrink: 0,
      }}
    >
      {/* Logo / wordmark */}
      <span
        style={{
          fontFamily: 'sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          color: theme.text_default,
          letterSpacing: '-0.3px',
          opacity: 0.9,
          userSelect: 'none',
          marginRight: '4px',
        }}
      >
        Protovibe
      </span>

      {/* Left tab group — controls iframe content */}
      {IFRAME_TABS.map(({ id, icon, label }) => (
        <TabButton
          key={id}
          id={id}
          icon={icon}
          label={label}
          isActive={activeIframeTab === id}
          onClick={() => onIframeTabChange(id)}
        />
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right tab group — controls sidebar content */}
      {SIDEBAR_TABS.map(({ id, icon, label }) => (
        <TabButton
          key={id}
          id={id}
          icon={icon}
          label={label}
          isActive={activeSidebarTab === id}
          onClick={() => onSidebarTabChange(id)}
        />
      ))}

      {/* Live preview mode toggle */}
      {onToggleInspector && (
        <button
          onClick={onToggleInspector}
          title={inspectorOpen ? 'Disable live preview' : 'Enable live preview'}
          style={{
            marginLeft: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: inspectorOpen ? theme.bg_tertiary : 'transparent',
            color: inspectorOpen ? theme.text_default : theme.text_tertiary,
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
        >
          {inspectorOpen
            ? <Eye size={15} strokeWidth={1.8} />
            : <EyeOff size={15} strokeWidth={1.8} />}
        </button>
      )}
    </div>
  );
};
