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
        <div data-pv-block="svgrid1" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* pv-editable-zone-start:svgz1 */}
            {/* pv-block-start:o9nf3x */}
            <Card data-pv-block="o9nf3x" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:2km09x */}
                <div data-pv-block="2km09x" className="w-full bg-center bg-no-repeat bg-cover rounded bg-[url('/src/images/from-protovibe/screenshot-2026-05-04-at-134811.jpg')] aspect-[629/347]" />
                {/* pv-block-end:2km09x */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:svche1 */}
                    {/* pv-block-start:aa4yzx */}
                    <TextParagraph data-pv-block="aa4yzx" typography="semibold-primary">
                      Cam 01 — Invisible drone
                    </TextParagraph>
                    {/* pv-block-end:aa4yzx */}
                    {/* pv-block-start:vdm8u9 */}
                    <Badge data-pv-block="vdm8u9" label="Live" color="success" />
                    {/* pv-block-end:vdm8u9 */}
                  {/* pv-editable-zone-end:svche1 */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:o9nf3x */}

            {/* pv-block-start:p4175t */}
            <Card data-pv-block="p4175t" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:15qpj1d1 */}
                <EmptyState data-pv-block="15qpj1d1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:15qpj1d1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:bm5e5w */}
                    {/* pv-block-start:gj6qu6 */}
                    <TextParagraph data-pv-block="gj6qu6" typography="semibold-primary">Cam 01 — Volcano Entrance</TextParagraph>
                    {/* pv-block-end:gj6qu6 */}
                    {/* pv-block-start:x6wqbj */}
                    <Badge data-pv-block="x6wqbj" label="Error" color="destructive" />
                    {/* pv-block-end:x6wqbj */}
                  {/* pv-editable-zone-end:bm5e5w */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:p4175t */}

            {/* pv-block-start:l0xasb */}
            <Card data-pv-block="l0xasb" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:g9ismld1 */}
                <EmptyState data-pv-block="g9ismld1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:g9ismld1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:tmykp5 */}
                    {/* pv-block-start:dlse1l */}
                    <TextParagraph data-pv-block="dlse1l" typography="semibold-primary">
                      Cam 02 - New York palace
                    </TextParagraph>
                    {/* pv-block-end:dlse1l */}
                    {/* pv-block-start:udbqru */}
                    <Badge data-pv-block="udbqru" label="Error" color="destructive" />
                    {/* pv-block-end:udbqru */}
                  {/* pv-editable-zone-end:tmykp5 */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:l0xasb */}

            {/* pv-block-start:rkm49s */}
            <Card data-pv-block="rkm49s" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:1c8pv4d1 */}
                <EmptyState data-pv-block="1c8pv4d1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:1c8pv4d1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:nkm0ra */}
                    {/* pv-block-start:jtbnvv */}
                    <TextParagraph data-pv-block="jtbnvv" typography="semibold-primary">
                      Cam A01 - Headquarters
                    </TextParagraph>
                    {/* pv-block-end:jtbnvv */}
                    {/* pv-block-start:84h9tb */}
                    <Badge data-pv-block="84h9tb" label="Error" color="destructive" />
                    {/* pv-block-end:84h9tb */}
                  {/* pv-editable-zone-end:nkm0ra */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:rkm49s */}

            {/* pv-block-start:wlbwej */}
            <Card data-pv-block="wlbwej" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:v5vwfkd1 */}
                <EmptyState data-pv-block="v5vwfkd1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:v5vwfkd1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:xgxenk */}
                    {/* pv-block-start:qtw0ly */}
                    <TextParagraph data-pv-block="qtw0ly" typography="semibold-primary">
                      Cam 024
                    </TextParagraph>
                    {/* pv-block-end:qtw0ly */}
                    {/* pv-block-start:tf4pgu */}
                    <Badge data-pv-block="tf4pgu" label="Error" color="destructive" />
                    {/* pv-block-end:tf4pgu */}
                  {/* pv-editable-zone-end:xgxenk */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:wlbwej */}

            {/* pv-block-start:m5nyfo */}
            <Card data-pv-block="m5nyfo" className="flex flex-col gap-3 items-stretch">
              {/* pv-editable-zone-start:svce1 */}
                {/* pv-block-start:qiby83d1 */}
                <EmptyState data-pv-block="qiby83d1" icon="mdi:cctv" bigHeading="" secondaryText="Video camera broken" className="rounded aspect-video bg-background-subtle" />
                {/* pv-block-end:qiby83d1 */}
                {/* pv-block-start:svch1 */}
                <div data-pv-block="svch1" className="flex items-center justify-between">
                  {/* pv-editable-zone-start:ui3pf0 */}
                    {/* pv-block-start:wpmazx */}
                    <TextParagraph data-pv-block="wpmazx" typography="semibold-primary">
                      Cam 0234
                    </TextParagraph>
                    {/* pv-block-end:wpmazx */}
                    {/* pv-block-start:2zfl42 */}
                    <Badge data-pv-block="2zfl42" label="Error" color="destructive" />
                    {/* pv-block-end:2zfl42 */}
                  {/* pv-editable-zone-end:ui3pf0 */}
                </div>
                {/* pv-block-end:svch1 */}
              {/* pv-editable-zone-end:svce1 */}
            </Card>
            {/* pv-block-end:m5nyfo */}
          {/* pv-editable-zone-end:svgz1 */}
        </div>
        {/* pv-block-end:svgrid1 */}
      {/* pv-editable-zone-end:sv1z2x3 */}
    </div>
  );
}
