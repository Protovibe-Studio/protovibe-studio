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

        {/* pv-block-start:svhead1 */}
        <div data-pv-block="svhead1" className="flex items-center justify-between">
          {/* pv-editable-zone-start:svhn1 */}
            {/* pv-block-start:svtitle */}
            <TextHeading data-pv-block="svtitle" typography="heading-lg">Surveillance</TextHeading>
            {/* pv-block-end:svtitle */}
            {/* pv-block-start:svtoggle */}
            <div data-pv-block="svtoggle" className="flex items-center gap-3">
              {/* pv-editable-zone-start:svte1 */}
                {/* pv-block-start:svtl1 */}
                <TextParagraph data-pv-block="svtl1" typography="secondary">Global Monitoring</TextParagraph>
                {/* pv-block-end:svtl1 */}
                {/* pv-block-start:svts1 */}
                <ToggleSwitch data-pv-block="svts1" checked={globalMonitoring} onCheckedChange={() => setGlobalMonitoring(v => !v)} />
                {/* pv-block-end:svts1 */}
              {/* pv-editable-zone-end:svte1 */}
            </div>
            {/* pv-block-end:svtoggle */}
          {/* pv-editable-zone-end:svhn1 */}
        </div>
        {/* pv-block-end:svhead1 */}

        {/* pv-block-start:svinfo1 */}
        <InfoBoxBanner data-pv-block="svinfo1" color="success" heading="All systems operational" secondaryText="847 cameras active. 3 flagged individuals under surveillance. Dr. Evil's monologue chamber is sweep-clear." icon="mdi:cctv" actionsLayout="right" primaryActionLabel="View Logs" />
        {/* pv-block-end:svinfo1 */}

        {/* pv-block-start:svgrid1 */}
        <div data-pv-block="svgrid1" className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* pv-editable-zone-start:svgz1 */}
            {/* pv-block-start:svcam1 */}
            <Card data-pv-block="svcam1" className="flex flex-col gap-3">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche1 */}
                    {/* pv-block-start:svcht1 */}
                    <TextParagraph data-pv-block="svcht1" typography="semibold-primary">Cam 01 — Volcano Entrance</TextParagraph>
                    {/* pv-block-end:svcht1 */}
                    {/* pv-block-start:svchs1 */}
                    <Badge data-pv-block="svchs1" label="Live" color="success" />
                    {/* pv-block-end:svchs1 */}
                  {/* pv-editable-zone-end:svche1 */}
                </div>
                {/* pv-block-end:svch1 */}
                {/* pv-block-start:svcfeed1 */}
                <EmptyState data-pv-block="svcfeed1" icon="mdi:cctv" bigHeading="" secondaryText="Feed active — no anomalies" className="bg-background-tertiary rounded min-h-32" />
                {/* pv-block-end:svcfeed1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:svcam1 */}

            {/* pv-block-start:svcam2 */}
            <Card data-pv-block="svcam2" className="flex flex-col gap-3">
              {/* pv-editable-zone-start:svce2 */}
                {/* pv-block-start:svch2 */}
                <div data-pv-block="svch2" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche2 */}
                    {/* pv-block-start:svcht2 */}
                    <TextParagraph data-pv-block="svcht2" typography="semibold-primary">Cam 02 — Shark Tank</TextParagraph>
                    {/* pv-block-end:svcht2 */}
                    {/* pv-block-start:svchs2 */}
                    <Badge data-pv-block="svchs2" label="Live" color="success" />
                    {/* pv-block-end:svchs2 */}
                  {/* pv-editable-zone-end:svche2 */}
                </div>
                {/* pv-block-end:svch2 */}
                {/* pv-block-start:svcfeed2 */}
                <EmptyState data-pv-block="svcfeed2" icon="mdi:cctv" bigHeading="" secondaryText="2 sharks visible" className="bg-background-tertiary rounded min-h-32" />
                {/* pv-block-end:svcfeed2 */}
              {/* pv-editable-zone-end:svce2 */}
            </Card>
            {/* pv-block-end:svcam2 */}

            {/* pv-block-start:svcam3 */}
            <Card data-pv-block="svcam3" className="flex flex-col gap-3">
              {/* pv-editable-zone-start:svce3 */}
                {/* pv-block-start:svch3 */}
                <div data-pv-block="svch3" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche3 */}
                    {/* pv-block-start:svcht3 */}
                    <TextParagraph data-pv-block="svcht3" typography="semibold-primary">Cam 03 — Monologue Chamber</TextParagraph>
                    {/* pv-block-end:svcht3 */}
                    {/* pv-block-start:svchs3 */}
                    <Badge data-pv-block="svchs3" label="Offline" color="neutral" />
                    {/* pv-block-end:svchs3 */}
                  {/* pv-editable-zone-end:svche3 */}
                </div>
                {/* pv-block-end:svch3 */}
                {/* pv-block-start:svcfeed3 */}
                <EmptyState data-pv-block="svcfeed3" icon="mdi:cctv" bigHeading="" secondaryText="Signal lost — check cable" className="bg-background-tertiary rounded min-h-32" />
                {/* pv-block-end:svcfeed3 */}
              {/* pv-editable-zone-end:svce3 */}
            </Card>
            {/* pv-block-end:svcam3 */}
          {/* pv-editable-zone-end:svgz1 */}
        </div>
        {/* pv-block-end:svgrid1 */}

        {/* pv-block-start:svtargets1 */}
        <div data-pv-block="svtargets1" className="flex flex-col gap-3">
          {/* pv-editable-zone-start:svte2 */}
            {/* pv-block-start:svtlabel */}
            <TextHeading data-pv-block="svtlabel" typography="heading-md">Flagged Individuals</TextHeading>
            {/* pv-block-end:svtlabel */}
            {/* pv-block-start:svttable */}
            <Table data-pv-block="svttable">
              <TableRowHeading>
                {/* pv-editable-zone-start:svtth1 */}
                  {/* pv-block-start:svtth2 */}
                  <TableCellHeading data-pv-block="svtth2" label="Individual" />
                  {/* pv-block-end:svtth2 */}
                  {/* pv-block-start:svtth3 */}
                  <TableCellHeading data-pv-block="svtth3" label="Threat Level" />
                  {/* pv-block-end:svtth3 */}
                  {/* pv-block-start:svtth4 */}
                  <TableCellHeading data-pv-block="svtth4" label="Last Known Location" />
                  {/* pv-block-end:svtth4 */}
                  {/* pv-block-start:svtth5 */}
                  <TableCellHeading data-pv-block="svtth5" label="Status" />
                  {/* pv-block-end:svtth5 */}
                  {/* pv-block-start:svtth6 */}
                  <TableCellHeading data-pv-block="svtth6" label="" className="w-12" />
                  {/* pv-block-end:svtth6 */}
                {/* pv-editable-zone-end:svtth1 */}
              </TableRowHeading>
              <TableBody>
                {mockSurveillanceTargets.map(t => (
                  <TableRowContent key={t.id} className="hover:bg-background-subtle">
                    <TableCellContent>
                      <div className="flex items-center gap-2">
                        <Avatar initials={t.name} size="sm" bgColor="default" />
                        <TextParagraph typography="regular">{t.name}</TextParagraph>
                      </div>
                    </TableCellContent>
                    <TableCellContent>
                      <Badge label={t.threat} color={t.threat === 'Critical' ? 'destructive' : t.threat === 'High' ? 'warning' : 'info'} />
                    </TableCellContent>
                    <TableCellContent>
                      <TextParagraph typography="regular">{t.lastSeen}</TextParagraph>
                    </TableCellContent>
                    <TableCellContent>
                      <TextParagraph typography="regular">{t.status}</TextParagraph>
                    </TableCellContent>
                    <TableCellContent className="text-right">
                      <Button iconOnly variant="ghost" color="neutral" leftIcon="MoreHorizontal" />
                    </TableCellContent>
                  </TableRowContent>
                ))}
              </TableBody>
            </Table>
            {/* pv-block-end:svttable */}
          {/* pv-editable-zone-end:svte2 */}
        </div>
        {/* pv-block-end:svtargets1 */}

      {/* pv-editable-zone-end:sv1z2x3 */}
    </div>
  );
}
