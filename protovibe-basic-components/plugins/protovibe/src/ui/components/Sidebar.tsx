// plugins/protovibe/src/ui/components/Sidebar.tsx
import React from 'react';
import { useProtovibe } from '../context/ProtovibeContext';
import { Header } from './Header';
import { Tabs } from './Tabs';
import { BlockEditor } from './BlockEditor';
import { ComponentProps } from './ComponentProps';
import { Modifiers } from './Modifiers';
import { VisualEditor } from './VisualEditor';
import { ClassesRaw } from './ClassesRaw';
import { TooltipEditor } from './TooltipEditor';
import { theme } from '../theme';
import { INSPECTOR_TRANSITION_EASING, INSPECTOR_TRANSITION_MS, INSPECTOR_WIDTH_PX } from '../constants/layout';
import { Paintbrush } from 'lucide-react';
import { FloatingToolbar } from './FloatingToolbar';

type SidebarProps = {
  isOpen: boolean;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { currentBaseTarget, selectedTargets, activeData, isMutationLocked, isLoading } = useProtovibe();

  const stopScrollEventEscape = (event: React.UIEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const sidebarStyle: React.CSSProperties = {
    flexShrink: 0,
    width: isOpen ? `${INSPECTOR_WIDTH_PX}px` : '0',
    overflow: 'hidden',
    backgroundColor: theme.bg_default,
    color: theme.text_default,
    padding: '0',
    boxSizing: 'border-box',
    fontFamily: 'sans-serif',
    fontSize: '13px',
    overflowY: isOpen ? 'auto' : 'hidden',
    overscrollBehavior: 'contain',
    borderLeft: isOpen ? `1px solid ${theme.border_default}` : 'none',
    display: 'flex',
    flexDirection: 'column',
    cursor: isMutationLocked ? 'progress' : 'default',
    transition: `width ${INSPECTOR_TRANSITION_MS}ms ${INSPECTOR_TRANSITION_EASING}`,
  };

  if (!currentBaseTarget || selectedTargets.length > 1) {
    return (
      <>
        <div
          id="source-loc-toast"
          data-pv-ui="true"
          data-prevent-closing-popover="true"
          style={sidebarStyle}
          onWheelCapture={stopScrollEventEscape}
          onTouchMoveCapture={stopScrollEventEscape}
        >
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border_default}`, background: theme.bg_strong, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <strong style={{ fontSize: '14px', color: theme.text_default }}>Protovibe Editor</strong>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifySelf: 'center', padding: '32px', textAlign: 'center', color: theme.text_tertiary, flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
            <Paintbrush size={48} strokeWidth={1.5} style={{ opacity: 0.5 }} aria-hidden="true" />
            <span style={{ fontSize: '14px' }}>
              {selectedTargets?.length > 1 ? `${selectedTargets.length} items selected` : 'Click anything on the page to edit'}
            </span>
          </div>
        </div>
        <FloatingToolbar />
      </>
    );
  }

  return (
    <>
      <div
        id="source-loc-toast"
        data-pv-ui="true"
        data-prevent-closing-popover="true"
        style={sidebarStyle}
        onWheelCapture={stopScrollEventEscape}
        onTouchMoveCapture={stopScrollEventEscape}
      >
        <Header />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <Tabs />
          <BlockEditor />
          {activeData && (
            <div style={{ opacity: isLoading ? 0.5 : 1, pointerEvents: isLoading ? 'none' : 'auto', transition: 'opacity 0.15s ease' }}>
              <ComponentProps />
              <Modifiers />
              <VisualEditor />
              <TooltipEditor />
              <ClassesRaw />
            </div>
          )}
        </div>
        {isMutationLocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 20,
              background: 'transparent',
              pointerEvents: 'auto',
              cursor: 'progress'
            }}
          />
        )}
      </div>
      <FloatingToolbar />
    </>
  );
};
