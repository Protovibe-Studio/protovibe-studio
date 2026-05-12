// plugins/protovibe/src/ui/components/ShellNavBar.tsx
import React, { useEffect, useState } from 'react';
import { Monitor, LayoutGrid, Palette, Paintbrush, Play, Pause, PenTool, Sparkles, ChevronDown, ArrowLeft } from 'lucide-react';
import { theme } from '../theme';
import { PublishButton } from './PublishButton';

export type IframeTab = 'app' | 'components' | 'sketchpad';
export type SidebarTab = 'design' | 'tokens' | 'prompts';

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
  const [hovered, setHovered] = useState(false);
  return (
    <button
      key={id}
      data-testid={`tab-${id}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        fontFamily: theme.font_ui,
        fontWeight: isActive ? 600 : 400,
        backgroundColor: isActive ? theme.bg_tertiary : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
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
  const [pluginVersion, setPluginVersion] = useState('');
  const [pluginLastUpdated, setPluginLastUpdated] = useState('');
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
        const lu = d?.['plugin-last-updated'];
        if (typeof lu === 'string' && lu.trim()) setPluginLastUpdated(lu.trim());
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
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA2sAAAB4BAMAAACeMXcLAAAAMFBMVEUAAAD///////////////////////////////////////////////////////////87TQQwAAAAD3RSTlMAv99AIJyAYO8QbzCvz1DkiqeDAAAPH0lEQVR42uzcWehMURzA8R8u09hy7dkGkTzojmyhGFuI7EuJEEIpf/uapSyJuvNgi0ghivBAPBHFKy8ePPHACw/M2Ld+dnPv+f3uOfeH4V6d7yP//517zmfmnrlLf7BJWorB8mBLRZYtlVm2VGbZUpllS2WWLZVFsD2aGqgItoRF2eg/F8CWsCxbKrNsqcyypTLLlsosWypLDNvUeE1b2MuejySIDWP3psVx+Dc1cAO1BUmW7XOlyfAvqoOBnoMky/a17Q8gTpatyqGw8gmIkWWrcihuPpizbGr/nK1cA8Ysm9o/Z8OSecf+V7bLa4IVUsWGO8HU/8qmlC42nAOGLJtaEthegSHLppYENuPHzbKpJYLtHeizbGqJYDM9tGTZ1JLB1h20WTa1ZLC9BG2WTS0ZbIajpGVTSwhbE9Bl2dQSwqafPcumlhC2EuiybGoJYdMvbpZNLSlsE0CTZVNLCtsuMHT05PWOwOdcXj11otu0h+venLap/59my45bv2Cm276z67aYdmogaKs+m9NvwUS3s9tu2ooixC07rDKCc71/m00wfdm5iPgMmA6vuoGhPt568ufYnMezfPWBMzJff4/t6ES/sict87HMBszyjPODJOEJd103UM3Pmc4hz3ZgFjJtnQeVyIbbhwbh/qglA3zWR9rH6QWy7WDNgK2eG6zD1+27gZob2Zy5GK5VAQw5Jz2k7Tnzp9jK8K3a3J0BJ4csW525GFFpJSjVEl+pya7yo3Z2MoTKYLAPwDYUg3Uhv/fCxHYoh2ofHgAp1gi65qPZ5g+PasygSahU1LCdRpatr4/RtSr+JtuBHEbX9QIE88hQaJuRDE3Ett+XPolztDVGVl4ZyVYDmi5huAfRbEOQZVuG2rYXfotthI+6PtboSJQobbkgY6NqZrc++hFMiWbTtRzJWHk2x+PYsouMDoXfYOspeuKstvlbcYbc0Bex1fdj7IdsBFOkbBWNShMi2a4gx7YWUeAmZRuLKHHL6O/6UtkuQjYnpxmlRI1Mr5QNRmGwO1FsDXyO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" style={{ height: 11, opacity: 0.6 }} />
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
                {pluginLastUpdated && (
                  <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                    synced {pluginLastUpdated}
                  </span>
                )}
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
            color: !inspectorOpen ? theme.text_default : theme.text_tertiary,
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
