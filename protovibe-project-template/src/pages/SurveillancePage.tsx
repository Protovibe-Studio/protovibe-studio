import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { Table } from '@/components/ui/table';
import { TableRowHeading } from '@/components/ui/table-row-heading';
import { TableBody } from '@/components/ui/table-body';
import { TableRowContent } from '@/components/ui/table-row-content';
import { TableCellHeading } from '@/components/ui/table-cell-heading';
import { TableCellContent } from '@/components/ui/table-cell-content';
import { EmptyState } from '@/components/ui/empty-state';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

const mockSurveillanceTargets = [
  { id: 'st1', name: 'Agent Johnson', threat: 'High', lastSeen: 'Geneva', status: 'Being Followed' },
  { id: 'st2', name: 'Prof. Brightwater', threat: 'Medium', lastSeen: 'London', status: 'Under Watch' },
  { id: 'st3', name: 'Captain Goodguy', threat: 'Critical', lastSeen: 'Unknown', status: 'Lost Track' },
];

export function SurveillancePage() {
  const [globalMonitoring, setGlobalMonitoring] = useState(true);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-8">
      {/* pv-editable-zone-start:sv1z2x3 */}
        {/* pv-block-start:vtr94r1 */}
        <div data-pv-block="vtr94r1" className="flex justify-between items-center">
          {/* pv-editable-zone-start:ern9o1 */}
            {/* pv-block-start:g0goke */}
            <div data-pv-block="g0goke" className="flex flex-col gap-0">
            {/* pv-editable-zone-start:sk9i0j */}
            {/* pv-block-start:spryrx */}
            <TextHeading data-pv-block="spryrx" typography="heading-lg">
              Surveillance
            </TextHeading>
            {/* pv-block-end:spryrx */}
            {/* pv-block-start:nkp1ds */}
            <TextParagraph data-pv-block="nkp1ds" typography="secondary">
              Hidden cameras spying on our enemies
            </TextParagraph>
            {/* pv-block-end:nkp1ds */}
            {/* pv-editable-zone-end:sk9i0j */}
            </div>
            {/* pv-block-end:g0goke */}
            {/* pv-block-start:rfdjlv */}
            <Button data-pv-block="rfdjlv" label="Add camera" leftIcon="plus" color="primary" onClick={() => setDrawerOpen(true)} />
            {/* pv-block-end:rfdjlv */}
          {/* pv-editable-zone-end:ern9o1 */}
        </div>
        {/* pv-block-end:vtr94r1 */}

        {/* pv-block-start:rqqb6kle */}
        <div data-pv-block="rqqb6kle" className="flex items-center gap-3">
          {/* pv-editable-zone-start:svte1 */}
            {/* pv-block-start:svts1 */}
            <ToggleSwitch secondaryText="Temporarily disable if in risk" heading="Enable monitoring" data-pv-block="svts1" checked={globalMonitoring} onCheckedChange={() => setGlobalMonitoring(v => !v)} />
            {/* pv-block-end:svts1 */}
          {/* pv-editable-zone-end:svte1 */}
        </div>
        {/* pv-block-end:rqqb6kle */}
        {/* pv-block-start:svgrid1 */}
        <div data-pv-block="svgrid1" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* pv-editable-zone-start:svgz1 */}
            {/* pv-block-start:svcam1 */}
            <Card data-pv-block="svcam1" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:svcfeed1 */}
                <EmptyState data-pv-block="svcfeed1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:svcfeed1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche1 */}
                    {/* pv-block-start:svcht1 */}
                    <TextParagraph data-pv-block="svcht1" typography="semibold-primary">Cam 01 — Volcano Entrance</TextParagraph>
                    {/* pv-block-end:svcht1 */}
                    {/* pv-block-start:svchs1 */}
                    <Badge data-pv-block="svchs1" label="Error" color="destructive" />
                    {/* pv-block-end:svchs1 */}
                  {/* pv-editable-zone-end:svche1 */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:svcam1 */}

            {/* pv-block-start:o9nf3x */}
            <Card data-pv-block="o9nf3x" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:2km09x */}
                <div data-pv-block="2km09x" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-04-at-134811.png')] bg-center bg-no-repeat aspect-video bg-cover rounded" />
                {/* pv-block-end:2km09x */}
                {/* pv-block-start:svcfeed1 */}
                <EmptyState data-pv-block="svcfeed1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:svcfeed1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche1 */}
                    {/* pv-block-start:aa4yzx */}
                    <TextParagraph data-pv-block="aa4yzx" typography="semibold-primary">Cam 01 — Volcano Entrance</TextParagraph>
                    {/* pv-block-end:aa4yzx */}
                    {/* pv-block-start:vdm8u9 */}
                    <Badge data-pv-block="vdm8u9" label="Error" color="destructive" />
                    {/* pv-block-end:vdm8u9 */}
                  {/* pv-editable-zone-end:svche1 */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:o9nf3x */}
          {/* pv-editable-zone-end:svgz1 */}
        </div>
        {/* pv-block-end:svgrid1 */}
      {/* pv-editable-zone-end:sv1z2x3 */}
    </div>
  );
}
