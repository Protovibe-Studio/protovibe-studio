import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerticalTabTrigger, ExpandableState } from '@/components/ui/vertical-tab-trigger';

// Extends HTMLDivElement attrs so {...rest} lands on the wrapper div (root element).
export interface VerticalTabsExpandableSectionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  label?: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  prefixIcon?: string;
  suffixIcon?: string;
  /** Controls initial expand state. 'expanded' starts open, 'collapsed'/'expandable' start closed. Default: 'expandable' */
  expandable?: Exclude<ExpandableState, 'not-expandable'>;
  /** Children rendered inside the collapsible section. */
  children?: React.ReactNode;
  /** Forwarded to the inner trigger button. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function VerticalTabsExpandableSection({
  label,
  value,
  active,
  disabled,
  className,
  prefixIcon,
  suffixIcon,
  expandable = 'expandable',
  children,
  onClick,
  ...rest
}: VerticalTabsExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(expandable === 'expanded');

  useEffect(() => {
    setIsExpanded(expandable === 'expanded');
  }, [expandable]);

  const handleTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsExpanded((prev) => !prev);
    onClick?.(e);
  };

  return (
    <div
      {...rest}
      className={cn('w-full', className)}
      data-pv-component-id="VerticalTabsExpandableSection"
    >
      <VerticalTabTrigger
        label={label}
        value={value}
        active={active}
        disabled={disabled}
        prefixIcon={prefixIcon}
        suffixIcon={suffixIcon}
        expandable={expandable}
        isExpanded={isExpanded}
        onClick={handleTriggerClick}
      />
      <div
        data-state={isExpanded ? 'expanded' : 'collapsed'}
        className="data-[state=collapsed]:hidden"
      >
        {/* pv-editable-zone-start */}
        {children}
        {/* pv-editable-zone-end */}
      </div>
    </div>
  );
}

export const pvConfig = {
  name: 'VerticalTabsExpandableSection',
  componentId: 'VerticalTabsExpandableSection',
  displayName: 'Vertical Tabs Expandable Section',
  description: 'A vertical tab item with a collapsible child section.',
  importPath: '@/components/ui/vertical-tabs-expandable-section',
  defaultProps: 'label="Section" value="section1" prefixIcon="FolderOpen"',
  defaultContent: '',
  props: {
    label: { type: 'string', exampleValue: 'Lorem ipsum' },
    value: { type: 'string', exampleValue: 'Lorem ipsum' },
    disabled: { type: 'boolean' },
    prefixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    suffixIcon: { type: 'select', options: Object.keys(LucideIcons) },
    expandable: { type: 'select', options: ['expandable', 'expanded', 'collapsed'] },
  },
};
