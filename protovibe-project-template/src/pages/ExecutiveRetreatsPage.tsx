import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { EmptyState } from '@/components/ui/empty-state'

const mockRetreats = [
  { id: 'r1', location: 'Volcano Lair, Hawaii', dates: 'Aug 12–16, 2026', attendees: 24, budget: '$2.4M', status: 'Confirmed' },
  { id: 'r2', location: 'Underwater Base, Pacific', dates: 'Oct 5–9, 2026', attendees: 12, budget: '$890K', status: 'Pending Approval' },
  { id: 'r3', location: 'Secret Island (Undisclosed)', dates: 'Dec 1–5, 2026', attendees: 8, budget: '$3.1M', status: 'Confirmed' },
];

export function ExecutiveRetreatsPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:er1z2r3 */}
        {/* pv-block-start:erhead1 */}
        <div data-pv-block="erhead1" className="flex justify-between items-center">
          {/* pv-editable-zone-start:ern9o1 */}
            {/* pv-block-start:86vn59 */}
            <div data-pv-block="86vn59" className="flex flex-col gap-0">
            {/* pv-editable-zone-start:sk9i0j */}
            {/* pv-block-start:jepzlt */}
            <TextHeading data-pv-block="jepzlt" typography="heading-lg">
              Executive Retreats
            </TextHeading>
            {/* pv-block-end:jepzlt */}
            {/* pv-block-start:ieepe2 */}
            <TextParagraph data-pv-block="ieepe2" typography="secondary">
              Luxurious perks only for senior directors, not for the small
            </TextParagraph>
            {/* pv-block-end:ieepe2 */}
            {/* pv-editable-zone-end:sk9i0j */}
            </div>
            {/* pv-block-end:86vn59 */}
            {/* pv-block-start:erbtn1 */}
            <Button data-pv-block="erbtn1" label="Book Retreat" leftIcon="plus" color="primary" />
            {/* pv-block-end:erbtn1 */}
          {/* pv-editable-zone-end:ern9o1 */}
        </div>
        {/* pv-block-end:erhead1 */}

        {/* pv-block-start:iuv3ok */}
        <EmptyState bigHeading="" data-pv-block="iuv3ok" icon="Inbox" iconSize="2xl" heading="Nothing here yet" secondaryText="Get started by creating your first item." />
        {/* pv-block-end:iuv3ok */}
      {/* pv-editable-zone-end:er1z2r3 */}
    </div>
  );
}
