// plugins/protovibe/src/ui/components/ShellNavBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Monitor, LayoutGrid, Palette, Paintbrush, Eye, EyeOff, PenTool, Sparkles, Share2 } from 'lucide-react';
import { theme } from '../theme';

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

function CloudflareLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cloudflare"
      role="img"
      viewBox="0 0 512 512"
      width={size}
      height={size}
    >
      <path
        fill="#f38020"
        d="M331 326c11-26-4-38-19-38l-148-2c-4 0-4-6 1-7l150-2c17-1 37-15 43-33 0 0 10-21 9-24a97 97 0 0 0-187-11c-38-25-78 9-69 46-48 3-65 46-60 72 0 1 1 2 3 2h274c1 0 3-1 3-3z"
      />
      <path
        fill="#faae40"
        d="M381 224c-4 0-6-1-7 1l-5 21c-5 16 3 30 20 31l32 2c4 0 4 6-1 7l-33 1c-36 4-46 39-46 39 0 2 0 3 2 3h113l3-2a81 81 0 0 0-78-103"
      />
    </svg>
  );
}

function PublishButton() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const btnRect = btnRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Publish"
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
          backgroundColor: open ? theme.bg_tertiary : 'transparent',
          color: open ? theme.text_default : theme.text_tertiary,
          transition: 'background-color 0.15s ease, color 0.15s ease',
        }}
      >
        <Share2 size={15} strokeWidth={1.8} />
      </button>

      {open && btnRect && (
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: btnRect.bottom + 8,
            right: window.innerWidth - btnRect.right,
            width: '280px',
            backgroundColor: theme.bg_default,
            border: `1px solid ${theme.border_default}`,
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: theme.text_default,
              marginBottom: '6px',
            }}
          >
            Publish your app
          </div>
          <div
            style={{
              fontSize: '12px',
              color: theme.text_tertiary,
              marginBottom: '16px',
              lineHeight: '1.4',
            }}
          >
            Deploy your project to the web in one click.
          </div>
          <button
            onClick={() => {
              /* TODO: publish logic */
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              border: `1px solid ${theme.border_default}`,
              cursor: 'pointer',
              backgroundColor: theme.bg_secondary,
              color: theme.text_default,
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'sans-serif',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.bg_tertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.bg_secondary;
            }}
          >
            <CloudflareLogo size={18} />
            Publish to Cloudflare
          </button>
        </div>
      )}
    </>
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
