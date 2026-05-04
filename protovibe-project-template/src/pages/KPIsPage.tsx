import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
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

const mockKpis = [
  { id: 'k1', metric: 'World Domination Progress', target: '100%', current: '23%', trend: 'up', status: 'At Risk' },
  { id: 'k2', metric: 'Active Laser Count', target: '1,000', current: '847', trend: 'up', status: 'On Track' },
  { id: 'k3', metric: 'Minion Morale Index', target: '80', current: '34', trend: 'down', status: 'Critical' },
  { id: 'k4', metric: 'Schemes Foiled (YTD)', target: '0', current: '7', trend: 'down', status: 'Critical' },
  { id: 'k5', metric: 'Lair Utility Cost (Monthly)', target: '$2M', current: '$8.4M', trend: 'up', status: 'Over Budget' },
  { id: 'k6', metric: 'Hero Encounters Survived', target: '100%', current: '61%', trend: 'down', status: 'At Risk' },
];

export function KPIsPage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-7">
      {/* pv-editable-zone-start:kp1z2q3 */}
        {/* pv-block-start:kphead1 */}
        <div data-pv-block="kphead1" className="flex justify-between items-center">
          {/* pv-editable-zone-start:kpe1f2 */}
            {/* pv-block-start:nuho94 */}
            <div data-pv-block="nuho94" className="flex flex-col gap-0">
            {/* pv-editable-zone-start:sk9i0j */}
            {/* pv-block-start:4jjrqc */}
            <TextHeading data-pv-block="4jjrqc" typography="heading-lg">
              KPIs
            </TextHeading>
            {/* pv-block-end:4jjrqc */}
            {/* pv-block-start:8ijdtf */}
            <TextParagraph data-pv-block="8ijdtf" typography="secondary">
              Very important numbers
            </TextParagraph>
            {/* pv-block-end:8ijdtf */}
            {/* pv-editable-zone-end:sk9i0j */}
            </div>
            {/* pv-block-end:nuho94 */}
            {/* pv-block-start:kpbtn1 */}
            <Button data-pv-block="kpbtn1" label="Export Report" leftIcon="download" color="neutral" variant="outline" />
            {/* pv-block-end:kpbtn1 */}
          {/* pv-editable-zone-end:kpe1f2 */}
        </div>
        {/* pv-block-end:kphead1 */}

        {/* pv-block-start:kpgrid1 */}
        <div data-pv-block="kpgrid1" className="grid gap-4 grid-cols-4">
          {/* pv-editable-zone-start:kpgz1 */}
            {/* pv-block-start:kpc1 */}
            <Card data-pv-block="kpc1">
              {/* pv-editable-zone-start:kpce1 */}
                {/* pv-block-start:kpnum1 */}
                <TextHeading data-pv-block="kpnum1" typography="heading-xxl" className="mb-2">23%</TextHeading>
                {/* pv-block-end:kpnum1 */}
                {/* pv-block-start:kplabel1 */}
                <div data-pv-block="kplabel1" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple1 */}
                    {/* pv-block-start:kpico1 */}
                    <Icon data-pv-block="kpico1" iconSymbol="mdi:earth" size="sm" />
                    {/* pv-block-end:kpico1 */}
                    {/* pv-block-start:kptxt1 */}
                    <TextParagraph data-pv-block="kptxt1" typography="secondary">World Domination</TextParagraph>
                    {/* pv-block-end:kptxt1 */}
                  {/* pv-editable-zone-end:kple1 */}
                </div>
                {/* pv-block-end:kplabel1 */}
                {/* pv-block-start:kpbadge1 */}
                <Badge data-pv-block="kpbadge1" label="Target: 100%" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:kpbadge1 */}
              {/* pv-editable-zone-end:kpce1 */}
            </Card>
            {/* pv-block-end:kpc1 */}

            {/* pv-block-start:kpc2 */}
            <Card data-pv-block="kpc2">
              {/* pv-editable-zone-start:kpce2 */}
                {/* pv-block-start:kpnum2 */}
                <TextHeading data-pv-block="kpnum2" typography="heading-xxl" className="mb-2">847</TextHeading>
                {/* pv-block-end:kpnum2 */}
                {/* pv-block-start:kplabel2 */}
                <div data-pv-block="kplabel2" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple2 */}
                    {/* pv-block-start:kpico2 */}
                    <Icon data-pv-block="kpico2" iconSymbol="mdi:lightning-bolt" size="sm" />
                    {/* pv-block-end:kpico2 */}
                    {/* pv-block-start:kptxt2 */}
                    <TextParagraph data-pv-block="kptxt2" typography="secondary">Active Lasers</TextParagraph>
                    {/* pv-block-end:kptxt2 */}
                  {/* pv-editable-zone-end:kple2 */}
                </div>
                {/* pv-block-end:kplabel2 */}
                {/* pv-block-start:kpbadge2 */}
                <Badge data-pv-block="kpbadge2" label="+153 this quarter" color="success" prefixIcon="trending-up" />
                {/* pv-block-end:kpbadge2 */}
              {/* pv-editable-zone-end:kpce2 */}
            </Card>
            {/* pv-block-end:kpc2 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:kpnum3 */}
                <TextHeading data-pv-block="kpnum3" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:kpnum3 */}
                {/* pv-block-start:kplabel3 */}
                <div data-pv-block="kplabel3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:kpico3 */}
                    <Icon data-pv-block="kpico3" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:kpico3 */}
                    {/* pv-block-start:kptxt3 */}
                    <TextParagraph data-pv-block="kptxt3" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:kptxt3 */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:kplabel3 */}
                {/* pv-block-start:kpbadge3 */}
                <Badge data-pv-block="kpbadge3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:kpbadge3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:mfwysv */}
                <TextHeading data-pv-block="mfwysv" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:mfwysv */}
                {/* pv-block-start:6vfh8wl3 */}
                <div data-pv-block="6vfh8wl3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:s758jl */}
                    <Icon data-pv-block="s758jl" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:s758jl */}
                    {/* pv-block-start:53alez */}
                    <TextParagraph data-pv-block="53alez" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:53alez */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:6vfh8wl3 */}
                {/* pv-block-start:3i9ei7e3 */}
                <Badge data-pv-block="3i9ei7e3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:3i9ei7e3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:6w7rju */}
                <TextHeading data-pv-block="6w7rju" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:6w7rju */}
                {/* pv-block-start:2r9pmul3 */}
                <div data-pv-block="2r9pmul3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:v33en5 */}
                    <Icon data-pv-block="v33en5" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:v33en5 */}
                    {/* pv-block-start:f4st97 */}
                    <TextParagraph data-pv-block="f4st97" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:f4st97 */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:2r9pmul3 */}
                {/* pv-block-start:ep43fle3 */}
                <Badge data-pv-block="ep43fle3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:ep43fle3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:px7fj6 */}
                <TextHeading data-pv-block="px7fj6" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:px7fj6 */}
                {/* pv-block-start:kplabel3 */}
                <div data-pv-block="kplabel3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:v95g4x */}
                    <Icon data-pv-block="v95g4x" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:v95g4x */}
                    {/* pv-block-start:k1310d */}
                    <TextParagraph data-pv-block="k1310d" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:k1310d */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:kplabel3 */}
                {/* pv-block-start:kpbadge3 */}
                <Badge data-pv-block="kpbadge3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:kpbadge3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:iivl9o */}
                <TextHeading data-pv-block="iivl9o" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:iivl9o */}
                {/* pv-block-start:kplabel3 */}
                <div data-pv-block="kplabel3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:16h1dg */}
                    <Icon data-pv-block="16h1dg" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:16h1dg */}
                    {/* pv-block-start:rf5ke7 */}
                    <TextParagraph data-pv-block="rf5ke7" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:rf5ke7 */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:kplabel3 */}
                {/* pv-block-start:kpbadge3 */}
                <Badge data-pv-block="kpbadge3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:kpbadge3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:lr1ycs */}
                <TextHeading data-pv-block="lr1ycs" typography="heading-xxl" className="mb-2">34</TextHeading>
                {/* pv-block-end:lr1ycs */}
                {/* pv-block-start:kplabel3 */}
                <div data-pv-block="kplabel3" className="flex items-center gap-2 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:052jif */}
                    <Icon data-pv-block="052jif" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:052jif */}
                    {/* pv-block-start:bjzh7q */}
                    <TextParagraph data-pv-block="bjzh7q" typography="secondary">Minion Morale Index</TextParagraph>
                    {/* pv-block-end:bjzh7q */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:kplabel3 */}
                {/* pv-block-start:kpbadge3 */}
                <Badge data-pv-block="kpbadge3" label="Critical — target: 80" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:kpbadge3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}
          {/* pv-editable-zone-end:kpgz1 */}
        </div>
        {/* pv-block-end:kpgrid1 */}
      {/* pv-editable-zone-end:kp1z2q3 */}
    </div>
  );
}
