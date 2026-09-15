// plugins/protovibe/src/ui/components/ShellNavBar.tsx
import React, { useEffect, useState } from 'react';
import { Monitor, LayoutGrid, Palette, Paintbrush, Play, Pause, PenTool, Sparkles, ChevronDown, ArrowLeft, MessageSquare, BookOpen } from 'lucide-react';
import { theme } from '../theme';
import { PublishButton } from './PublishButton';
import { PROTOVIBE_LOGO_DATA_URL } from '../protovibeLogo';

export type IframeTab = 'app' | 'components' | 'sketchpad';
export type SidebarTab = 'design' | 'tokens' | 'prompts' | 'comments' | 'specs';

/** @deprecated Use IframeTab / SidebarTab instead */
export type ShellTab = IframeTab | SidebarTab;

const IFRAME_TABS: { id: IframeTab; icon: React.ElementType; label: string }[] = [
  { id: 'app', icon: Monitor, label: 'App' },
  { id: 'sketchpad', icon: PenTool, label: 'Sketchpad' },
  { id: 'components', icon: LayoutGrid, label: 'Components' },
];

const SIDEBAR_TABS: { id: SidebarTab; icon: React.ElementType; label: string }[] = [
  { id: 'design', icon: Paintbrush, label: 'Design' },
  { id: 'tokens', icon: Palette, label: 'Tokens' },
  { id: 'prompts', icon: Sparkles, label: 'Prompts' },
  { id: 'comments', icon: MessageSquare, label: 'Comments' },
  { id: 'specs', icon: BookOpen, label: 'Specs' },
];

type ShellNavBarProps = {
  activeIframeTab: IframeTab;
  onIframeTabChange: (tab: IframeTab) => void;
  activeSidebarTab: SidebarTab;
  onSidebarTabChange: (tab: SidebarTab) => void;
  unreadComments?: number;
  inspectorOpen?: boolean;
  onToggleInspector?: () => void;
};

function TabButton({
  id,
  icon: Icon,
  label,
  isActive,
  onClick,
  dot,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  dot?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      key={id}
      data-testid={`tab-${id}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '30px',
        padding: '0 10px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: theme.font_ui,
        fontWeight: isActive ? 600 : 400,
        backgroundColor: isActive ? theme.bg_tertiary : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: isActive ? theme.text_default : theme.text_tertiary,
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
    >
      <span style={{ position: 'relative', display: 'flex' }}>
        <Icon size={14} strokeWidth={isActive ? 2 : 1.7} />
        {dot && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -5,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.accent_default,
              border: `1.5px solid ${theme.bg_strong}`,
            }}
          />
        )}
      </span>
      {label}
    </button>
  );
}



export const ShellNavBar: React.FC<ShellNavBarProps> = ({
  activeIframeTab,
  onIframeTabChange,
  activeSidebarTab,
  onSidebarTabChange,
  unreadComments = 0,
  inspectorOpen,
  onToggleInspector,
}) => {
  const [projectName, setProjectName] = useState('');
  const [pluginVersion, setPluginVersion] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [inspectorHovered, setInspectorHovered] = useState(false);
  const [projectManagerAvailable, setProjectManagerAvailable] = useState(false);
  const [goToProjectsHovered, setGoToProjectsHovered] = useState(false);
  const logoRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/protovibe-data.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = d?.['project-name'];
        if (typeof n === 'string' && n.trim()) setProjectName(n.trim());
        const v = d?.['plugin-version'];
        if (typeof v === 'string' && v.trim()) setPluginVersion(v.trim());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectMenuOpen) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    fetch('http://127.0.0.1:5173/', { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
      .then(() => {
        if (!cancelled) setProjectManagerAvailable(true);
      })
      .catch(() => {
        if (!cancelled) setProjectManagerAvailable(false);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [projectMenuOpen]);

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
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '30px',
            padding: '0 6px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            backgroundColor: projectMenuOpen ? theme.bg_tertiary : logoHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
            fontFamily: theme.font_ui,
            fontSize: '13px',
            fontWeight: 700,
            color: theme.text_default,
            letterSpacing: '-0.3px',
            userSelect: 'none',
            transition: 'background-color 0.15s ease',
          }}
        >
          <img src={PROTOVIBE_LOGO_DATA_URL} style={{ height: 11, opacity: 0.6 }} />
          <ChevronDown
            size={14}
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
                fontFamily: theme.font_ui,
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
                fontFamily: theme.font_ui,
                fontSize: '13px',
                fontWeight: 600,
                color: theme.text_default,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              data-tooltip={projectName || 'Untitled project'}
            >
              {projectName || 'Untitled project'}
            </div>
            {pluginVersion && (
              <div
                style={{
                  fontFamily: theme.font_ui,
                  fontSize: '11px',
                  color: theme.text_tertiary,
                  marginTop: '6px',
                }}
              >
                Protovibe v{pluginVersion}
              </div>
            )}
            {projectManagerAvailable && (
              <>
                <div
                  style={{
                    height: '1px',
                    backgroundColor: theme.border_default,
                    margin: '10px -12px 6px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = 'http://127.0.0.1:5173/';
                  }}
                  onMouseEnter={() => setGoToProjectsHovered(true)}
                  onMouseLeave={() => setGoToProjectsHovered(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '6px 8px',
                    textAlign: 'left',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: theme.font_ui,
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.text_default,
                    backgroundColor: goToProjectsHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={1.8} />
                  Back to projects
                </button>
              </>
            )}
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
          dot={id === 'comments' && unreadComments > 0}
        />
      ))}

      {/* Publish / Share */}
      <PublishButton />

      {/* Live preview mode toggle */}
      {onToggleInspector && (
        <button
          onClick={onToggleInspector}
          onMouseEnter={() => setInspectorHovered(true)}
          onMouseLeave={() => setInspectorHovered(false)}
          data-tooltip={inspectorOpen ? 'Enable live preview' : 'Back to editor'}
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
            backgroundColor: !inspectorOpen ? theme.bg_tertiary : inspectorHovered ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: !inspectorOpen ? theme.text_default : theme.text_secondary,
            transition: 'background-color 0.15s ease, color 0.15s ease',
          }}
        >
          {inspectorOpen
            ? <Play size={15} strokeWidth={1.8} />
            : <Pause size={15} strokeWidth={1.8} />}
        </button>
      )}
    </div>
  );
};
