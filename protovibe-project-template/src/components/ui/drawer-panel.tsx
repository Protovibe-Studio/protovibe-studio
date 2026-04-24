import React from 'react';
import { cn } from '@/lib/utils';

export interface DrawerPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the drawer panel */
  width?: 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function DrawerPanel({ width = 'md', children, className, ...props }: DrawerPanelProps) {
  return (
    <div
      data-width={width}
      className={cn("w-full h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative data-[width=sm]:max-w-sm data-[width=md]:max-w-[600px] data-[width=lg]:max-w-2xl data-[width=xl]:max-w-4xl bg-background-default", className)}
      {...props}
      data-pv-component-id="DrawerPanel"
    >
      {children}
    </div>
  );
}

export function PvDefaultContent() {
  return (
    <>
      {/* pv-editable-zone-start:dpd-header */}
        {/* pv-block-start:dpd-h1 */}
        <div data-pv-block="dpd-h1" className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
          <h2 className="text-lg font-semibold text-foreground-default">Drawer Title</h2>
          <button className="text-foreground-secondary hover:text-foreground-default transition-colors">✕</button>
        </div>
        {/* pv-block-end:dpd-h1 */}
      {/* pv-editable-zone-end:dpd-header */}

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {/* pv-editable-zone-start:dpd-body */}
          {/* pv-block-start:dpd-b1 */}
          <div data-pv-block="dpd-b1" className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground-default">Section Title</h3>
            <p className="text-sm text-foreground-secondary">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>
          {/* pv-block-end:dpd-b1 */}

          {/* pv-block-start:dpd-b2 */}
          <div data-pv-block="dpd-b2" className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-foreground-default">Another Section</h3>
            <p className="text-sm text-foreground-secondary">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
            </p>
          </div>
          {/* pv-block-end:dpd-b2 */}
        {/* pv-editable-zone-end:dpd-body */}
      </div>

      {/* pv-editable-zone-start:dpd-footer */}
        {/* pv-block-start:dpd-f1 */}
        <div data-pv-block="dpd-f1" className="flex items-center justify-between px-6 py-4 border-t border-border-default bg-background-default shrink-0">
          <button className="px-4 py-2 text-sm font-medium text-foreground-default bg-background-secondary rounded hover:bg-background-tertiary transition-colors">
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium text-foreground-on-primary bg-background-primary rounded hover:opacity-90 transition-opacity">
            Confirm
          </button>
        </div>
        {/* pv-block-end:dpd-f1 */}
      {/* pv-editable-zone-end:dpd-footer */}
    </>
  );
}

export const pvConfig = {
  name: 'DrawerPanel',
  componentId: 'DrawerPanel',
  displayName: 'Drawer Panel',
  description: 'A slide-over drawer panel container. Place inside DrawerOverlay.',
  importPath: '@/components/ui/drawer-panel',
  defaultProps: '',
  defaultContent: <PvDefaultContent />,
  props: {
    width: { type: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
};
