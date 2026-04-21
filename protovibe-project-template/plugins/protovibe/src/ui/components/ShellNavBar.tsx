// plugins/protovibe/src/ui/components/ShellNavBar.tsx
import React, { useEffect, useState } from 'react';
import { Monitor, LayoutGrid, Palette, Paintbrush, Eye, EyeOff, PenTool, Sparkles, ChevronDown } from 'lucide-react';
import { theme } from '../theme';
import { PublishButton } from './PublishButton';

export type IframeTab = 'app' | 'components' | 'sketchpad';
export type SidebarTab = 'design' | 'tokens' | 'prompts';

/** @deprecated Use IframeTab / SidebarTab instead */
export type ShellTab = IframeTab | SidebarTab;

const IFRAME_TABS: { id: IframeTab; icon: React.ElementType; label: string }[] = [
  { id: 'app', icon: Monitor, label: 'App' },
  { id: 'components', icon: LayoutGrid, label: 'Components' },
  { id: 'sketchpad', icon: PenTool, label: 'Sketchpad' },
];

const SIDEBAR_TABS: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'design', icon: Paintbrush, label: 'Design' },
  { id: 'tokens', icon: Palette, label: 'Tokens' },
  { id: 'prompts', icon: Sparkles, label: 'Prompts' },
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
      data-testid={`tab-${id}`}
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
  const [projectName, setProjectName] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const logoRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/protovibe-data.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = d?.['project-name'];
        if (typeof n === 'string' && n.trim()) setProjectName(n.trim());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (logoRef.current && !logoRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProjectMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [projectMenuOpen]);

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
      {/* Logo / wordmark with project dropdown */}
      <div
        ref={logoRef}
        style={{ position: 'relative', marginRight: '16px' }}
      >
        <button
          type="button"
          onClick={() => setProjectMenuOpen((o) => !o)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            height: '30px',
            padding: '0 6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: projectMenuOpen ? theme.bg_tertiary : 'transparent',
            fontFamily: 'sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: theme.text_default,
            letterSpacing: '-0.3px',
            userSelect: 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          <span style={{ opacity: 0.9 }}>Protovibe</span>
          <ChevronDown
            size={13}
            strokeWidth={2}
            style={{
              color: theme.text_tertiary,
              transform: projectMenuOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>

        {projectMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: '200px',
              padding: '10px 12px',
              backgroundColor: theme.bg_strong,
              border: `1px solid ${theme.border_default}`,
              borderRadius: '8px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                fontFamily: 'sans-serif',
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: theme.text_tertiary,
                marginBottom: '4px',
              }}
            >
              Current project
            </div>
            <div
              style={{
                fontFamily: 'sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: theme.text_default,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={projectName || 'Untitled project'}
            >
              {projectName || 'Untitled project'}
            </div>
          </div>
        )}
      </div>

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

      {/* Publish / Share */}
      <PublishButton />

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
            backgroundColor: !inspectorOpen ? theme.bg_tertiary : 'transparent',
            color: !inspectorOpen ? theme.text_default : theme.text_tertiary,
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
