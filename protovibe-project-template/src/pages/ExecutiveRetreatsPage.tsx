import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';

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

        {/* pv-block-start:ertable1 */}
        <div data-pv-block="ertable1" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* pv-editable-zone-start:ergrid1 */}
            {/* pv-block-start:ercrd1 */}
            {mockRetreats.map(r => (
              <Card key={r.id} data-pv-block="ercrd1" className="gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon iconSymbol="mdi:map-marker" size="sm" className="text-foreground-secondary" />
                    <TextHeading typography="heading-sm">{r.location}</TextHeading>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label={r.status} color={r.status === 'Confirmed' ? 'success' : 'warning'} />
                    <Button iconOnly variant="ghost" color="neutral" leftIcon="MoreHorizontal" />
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full pt-3 border-t border-border-default">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon iconSymbol="mdi:calendar" size="sm" className="text-foreground-secondary" />
                      <TextParagraph typography="secondary">Dates</TextParagraph>
                    </div>
                    <TextParagraph typography="regular">{r.dates}</TextParagraph>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon iconSymbol="mdi:account-group" size="sm" className="text-foreground-secondary" />
                      <TextParagraph typography="secondary">Attendees</TextParagraph>
                    </div>
                    <TextParagraph typography="regular">{r.attendees}</TextParagraph>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon iconSymbol="mdi:cash" size="sm" className="text-foreground-secondary" />
                      <TextParagraph typography="secondary">Budget</TextParagraph>
                    </div>
                    <TextParagraph typography="regular">{r.budget}</TextParagraph>
                  </div>
                </div>
              </Card>
            ))}
            {/* pv-block-end:ercrd1 */}
          {/* pv-editable-zone-end:ergrid1 */}
        </div>
        {/* pv-block-end:ertable1 */}
      {/* pv-editable-zone-end:er1z2r3 */}
    </div>
  );
}
