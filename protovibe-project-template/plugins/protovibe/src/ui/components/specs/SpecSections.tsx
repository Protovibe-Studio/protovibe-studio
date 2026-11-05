import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { isAnnotation, type SpecHeading, type SpecItem } from '../../../shared/specs';
import { theme } from '../../theme';

interface Section {
  heading: SpecHeading;
  children: Entry[];
}
type Entry = SpecItem | Section;

/** Bound sticky headings to their own sections, so only one of each size
 * stays at the top. Keep the original rows (including editors and find marks). */
export function SpecSections({ items, scrollRoot, renderItem }: {
  items: SpecItem[];
  scrollRoot: HTMLElement | null;
  renderItem: (item: SpecItem) => React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sections = useMemo(() => {
    const roots: Entry[] = [];
    let big: Section | undefined;
    let medium: Section | undefined;
    for (const item of items) {
      if (isAnnotation(item)) {
        (medium?.children ?? big?.children ?? roots).push(item);
      } else {
        const section: Section = { heading: item, children: [] };
        if (item.level === 'big') {
          roots.push(section);
          big = section;
          medium = undefined;
        } else {
          (big?.children ?? roots).push(section);
          medium = section;
        }
      }
    }
    return roots;
  }, [items]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !scrollRoot) return;
    const headings = Array.from(root.querySelectorAll<HTMLElement>('[data-spec-sticky-heading]'));
    const previousPadding = scrollRoot.style.scrollPaddingTop;
    const measure = () => {
      // Published titles can wrap when the sidebar is resized. Measure the
      // actual big heading rather than assuming a fixed second-row offset.
      for (const heading of headings) {
        if (heading.dataset.specStickyHeading === 'big') {
          heading.parentElement!.style.setProperty('--spec-heading-offset', `${heading.getBoundingClientRect().height}px`);
        }
      }
      const height = Math.max(0, ...headings.map(heading =>
        (parseFloat(getComputedStyle(heading).top) || 0) + heading.getBoundingClientRect().height));
      // Find, Prev/Next and deep links use scrollIntoView. Reserve space so
      // their targets are revealed below the headings, including on scroll up.
      scrollRoot.style.scrollPaddingTop = `${height + 8}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    headings.forEach(heading => observer.observe(heading));
    return () => {
      observer.disconnect();
      scrollRoot.style.scrollPaddingTop = previousPadding;
    };
  }, [sections, scrollRoot]);

  const render = (entry: Entry): React.ReactNode => {
    if (!('heading' in entry)) return <React.Fragment key={entry.id}>{renderItem(entry)}</React.Fragment>;
    const { heading, children } = entry;
    const big = heading.level === 'big';
    return (
      <div key={heading.id} data-spec-section={heading.id} style={{ position: 'relative', isolation: 'isolate' }}>
        <div data-spec-sticky-heading={heading.level} style={{
          position: 'sticky', top: big ? 0 : 'var(--spec-heading-offset, 0px)',
          zIndex: big ? 3 : 2, background: theme.bg_strong, display: 'flow-root',
        }}>
          {renderItem(heading)}
        </div>
        {children.map(render)}
      </div>
    );
  };

  return <div ref={rootRef} style={{ flexShrink: 0 }}>{sections.map(render)}</div>;
}
