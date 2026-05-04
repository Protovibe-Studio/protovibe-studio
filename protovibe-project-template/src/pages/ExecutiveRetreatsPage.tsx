import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { Table } from '@/components/ui/table';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { DropdownItem } from '@/components/ui/dropdown-item';
import { DrawerOverlay } from '@/components/ui/drawer-overlay';
import { DrawerPanel } from '@/components/ui/drawer-panel';
import { Textarea } from '@/components/ui/textarea';

const mockRetreats = [
  { id: 'r1', location: 'Volcano Lair, Hawaii', dates: 'Aug 12–16, 2026', attendees: 24, budget: '$2.4M', status: 'Confirmed' },
  { id: 'r2', location: 'Underwater Base, Pacific', dates: 'Oct 5–9, 2026', attendees: 12, budget: '$890K', status: 'Pending Approval' },
  { id: 'r3', location: 'Secret Island (Undisclosed)', dates: 'Dec 1–5, 2026', attendees: 8, budget: '$3.1M', status: 'Confirmed' },
];

export function ExecutiveRetreatsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
            <Button data-pv-block="erbtn1" label="Book Retreat" leftIcon="plus" color="primary" onClick={() => setDrawerOpen(true)} />
            {/* pv-block-end:erbtn1 */}
          {/* pv-editable-zone-end:ern9o1 */}
        </div>
        {/* pv-block-end:erhead1 */}

        {/* pv-block-start:ertable1 */}
        <Table data-pv-block="ertable1">
          <TableRowHeading>
            {/* pv-editable-zone-start:erth1 */}
              {/* pv-block-start:erth2 */}
              <TableCellHeading data-pv-block="erth2" label="Location" />
              {/* pv-block-end:erth2 */}
              {/* pv-block-start:erth3 */}
              <TableCellHeading data-pv-block="erth3" label="Dates" />
              {/* pv-block-end:erth3 */}
              {/* pv-block-start:erth4 */}
              <TableCellHeading data-pv-block="erth4" label="Attendees" />
              {/* pv-block-end:erth4 */}
              {/* pv-block-start:erth5 */}
              <TableCellHeading data-pv-block="erth5" label="Budget" />
              {/* pv-block-end:erth5 */}
              {/* pv-block-start:erth6 */}
              <TableCellHeading data-pv-block="erth6" label="Status" />
              {/* pv-block-end:erth6 */}
              {/* pv-block-start:erth7 */}
              <TableCellHeading data-pv-block="erth7" label="" className="w-12" />
              {/* pv-block-end:erth7 */}
            {/* pv-editable-zone-end:erth1 */}
          </TableRowHeading>
          <TableBody>
            {mockRetreats.map(r => (
              <TableRowContent key={r.id} className="hover:bg-background-subtle">
                <TableCellContent>
                  <div className="flex items-center gap-2">
                    <Icon iconSymbol="mdi:map-marker" size="sm" className="text-foreground-secondary" />
                    <TextParagraph typography="regular">{r.location}</TextParagraph>
                  </div>
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{r.dates}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{r.attendees}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <TextParagraph typography="regular">{r.budget}</TextParagraph>
                </TableCellContent>
                <TableCellContent>
                  <Badge label={r.status} color={r.status === 'Confirmed' ? 'success' : 'warning'} />
                </TableCellContent>
                <TableCellContent className="text-right">
                  <Button iconOnly variant="ghost" color="neutral" leftIcon="MoreHorizontal" />
                </TableCellContent>
              </TableRowContent>
            ))}
          </TableBody>
        </Table>
        {/* pv-block-end:ertable1 */}
      {/* pv-editable-zone-end:er1z2r3 */}

      {drawerOpen && createPortal(
        <DrawerOverlay onClick={() => setDrawerOpen(false)}>
          <DrawerPanel width="md">
            <div className="flex flex-col h-full bg-background-default">
              {/* pv-editable-zone-start:erdr1 */}
                {/* pv-block-start:erdrh1 */}
                <div data-pv-block="erdrh1" className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0 bg-background-elevated">
                  {/* pv-editable-zone-start:erdrhe1 */}
                    {/* pv-block-start:erdrt1 */}
                    <TextHeading data-pv-block="erdrt1" typography="heading-md">Book a Retreat</TextHeading>
                    {/* pv-block-end:erdrt1 */}
                    {/* pv-block-start:erdrx1 */}
                    <Button data-pv-block="erdrx1" variant="ghost" color="neutral" iconOnly leftIcon="close" onClick={() => setDrawerOpen(false)} />
                    {/* pv-block-end:erdrx1 */}
                  {/* pv-editable-zone-end:erdrhe1 */}
                </div>
                {/* pv-block-end:erdrh1 */}
                {/* pv-block-start:erdrb1 */}
                <div data-pv-block="erdrb1" className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-background-subtle">
                  {/* pv-editable-zone-start:erdrbe1 */}
                    {/* pv-block-start:erdrbe2 */}
                    <div data-pv-block="erdrbe2" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:erdrbe3 */}
                        {/* pv-block-start:erdrbe4 */}
                        <TextParagraph data-pv-block="erdrbe4" typography="semibold-primary">Location</TextParagraph>
                        {/* pv-block-end:erdrbe4 */}
                        {/* pv-block-start:erdrbe5 */}
                        <SelectDropdown data-pv-block="erdrbe5" placeholder="Select lair..." value="">
                          {/* pv-editable-zone-start:erdrbe6 */}
                            {/* pv-block-start:erdrbe7 */}
                            <DropdownItem data-pv-block="erdrbe7" value="volcano" label="Volcano Lair, Hawaii" />
                            {/* pv-block-end:erdrbe7 */}
                            {/* pv-block-start:erdrbe8 */}
                            <DropdownItem data-pv-block="erdrbe8" value="underwater" label="Underwater Base, Pacific" />
                            {/* pv-block-end:erdrbe8 */}
                            {/* pv-block-start:erdrbe9 */}
                            <DropdownItem data-pv-block="erdrbe9" value="island" label="Secret Island (Undisclosed)" />
                            {/* pv-block-end:erdrbe9 */}
                          {/* pv-editable-zone-end:erdrbe6 */}
                        </SelectDropdown>
                        {/* pv-block-end:erdrbe5 */}
                      {/* pv-editable-zone-end:erdrbe3 */}
                    </div>
                    {/* pv-block-end:erdrbe2 */}
                    {/* pv-block-start:erdrbf1 */}
                    <div data-pv-block="erdrbf1" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:erdrbf2 */}
                        {/* pv-block-start:erdrbf3 */}
                        <TextParagraph data-pv-block="erdrbf3" typography="semibold-primary">Number of Villains Attending</TextParagraph>
                        {/* pv-block-end:erdrbf3 */}
                        {/* pv-block-start:erdrbf4 */}
                        <Input data-pv-block="erdrbf4" placeholder="e.g. 12" />
                        {/* pv-block-end:erdrbf4 */}
                      {/* pv-editable-zone-end:erdrbf2 */}
                    </div>
                    {/* pv-block-end:erdrbf1 */}
                    {/* pv-block-start:erdrbg1 */}
                    <div data-pv-block="erdrbg1" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:erdrbg2 */}
                        {/* pv-block-start:erdrbg3 */}
                        <TextParagraph data-pv-block="erdrbg3" typography="semibold-primary">Special Requirements</TextParagraph>
                        {/* pv-block-end:erdrbg3 */}
                        {/* pv-block-start:erdrbg4 */}
                        <Textarea data-pv-block="erdrbg4" placeholder="Shark tank maintenance, laser grid activation, monologue acoustics testing..." rows={3} />
                        {/* pv-block-end:erdrbg4 */}
                      {/* pv-editable-zone-end:erdrbg2 */}
                    </div>
                    {/* pv-block-end:erdrbg1 */}
                  {/* pv-editable-zone-end:erdrbe1 */}
                </div>
                {/* pv-block-end:erdrb1 */}
                {/* pv-block-start:erdrf1 */}
                <div data-pv-block="erdrf1" className="flex items-center justify-between px-6 py-4 border-t border-border-default shrink-0 bg-background-elevated">
                  {/* pv-editable-zone-start:erdrf2 */}
                    {/* pv-block-start:erdrf3 */}
                    <Button data-pv-block="erdrf3" variant="ghost" color="neutral" label="Cancel" onClick={() => setDrawerOpen(false)} />
                    {/* pv-block-end:erdrf3 */}
                    {/* pv-block-start:erdrf4 */}
                    <Button data-pv-block="erdrf4" variant="solid" color="primary" label="Book Retreat" />
                    {/* pv-block-end:erdrf4 */}
                  {/* pv-editable-zone-end:erdrf2 */}
                </div>
                {/* pv-block-end:erdrf1 */}
              {/* pv-editable-zone-end:erdr1 */}
            </div>
          </DrawerPanel>
        </DrawerOverlay>,
        document.body
      )}
    </div>
  );
}
