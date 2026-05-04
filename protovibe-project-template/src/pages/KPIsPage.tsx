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
              Evil KPIs (allegedly tracked)
            </TextHeading>
            {/* pv-block-end:4jjrqc */}
            {/* pv-block-start:8ijdtf */}
            <TextParagraph data-pv-block="8ijdtf" typography="secondary">
              Numbers the board pretends to read before lunch
            </TextParagraph>
            {/* pv-block-end:8ijdtf */}
            {/* pv-editable-zone-end:sk9i0j */}
            </div>
            {/* pv-block-end:nuho94 */}
            {/* pv-block-start:kpbtn1 */}
            <Button data-pv-block="kpbtn1" label="Email this to the henchmen" leftIcon="download" color="neutral" variant="outline" />
            {/* pv-block-end:kpbtn1 */}
          {/* pv-editable-zone-end:kpe1f2 */}
        </div>
        {/* pv-block-end:kphead1 */}

        {/* pv-block-start:chrt001 */}
        <Card className="items-stretch" data-pv-block="chrt001">
          {/* pv-editable-zone-start:chrtz01 */}
            {/* pv-block-start:chrth01 */}
            <div data-pv-block="chrth01" className="flex flex-col gap-0">
              {/* pv-editable-zone-start:chrthz1 */}
                {/* pv-block-start:chrtt01 */}
                <TextHeading data-pv-block="chrtt01" typography="heading-sm">
                  Plots foiled per quarter (it's not us, it's the heroes)
                </TextHeading>
                {/* pv-block-end:chrtt01 */}
                {/* pv-block-start:chrts01 */}
                <TextParagraph data-pv-block="chrts01" typography="secondary">
                  Trending up. We are not happy about it.
                </TextParagraph>
                {/* pv-block-end:chrts01 */}
              {/* pv-editable-zone-end:chrthz1 */}
            </div>
            {/* pv-block-end:chrth01 */}

            {/* pv-block-start:chrtb01 */}
            <div data-pv-block="chrtb01" className="flex items-end h-48 pt-6 gap-[4%]">
              {/* pv-editable-zone-start:chrtbz1 */}
                {/* pv-block-start:bar0001 */}
                <div data-pv-block="bar0001" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz001 */}
                    {/* pv-block-start:barb001 */}
                    <div data-pv-block="barb001" className="w-full h-12 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb001 */}
                    {/* pv-block-start:barl001 */}
                    <TextParagraph data-pv-block="barl001" typography="secondary">Q1 '23</TextParagraph>
                    {/* pv-block-end:barl001 */}
                  {/* pv-editable-zone-end:barz001 */}
                </div>
                {/* pv-block-end:bar0001 */}

                {/* pv-block-start:bar0002 */}
                <div data-pv-block="bar0002" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz002 */}
                    {/* pv-block-start:barb002 */}
                    <div data-pv-block="barb002" className="w-full h-20 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb002 */}
                    {/* pv-block-start:barl002 */}
                    <TextParagraph data-pv-block="barl002" typography="secondary">Q2 '23</TextParagraph>
                    {/* pv-block-end:barl002 */}
                  {/* pv-editable-zone-end:barz002 */}
                </div>
                {/* pv-block-end:bar0002 */}

                {/* pv-block-start:bar0003 */}
                <div data-pv-block="bar0003" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz003 */}
                    {/* pv-block-start:barb003 */}
                    <div data-pv-block="barb003" className="w-full h-16 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb003 */}
                    {/* pv-block-start:barl003 */}
                    <TextParagraph data-pv-block="barl003" typography="secondary">Q3 '23</TextParagraph>
                    {/* pv-block-end:barl003 */}
                  {/* pv-editable-zone-end:barz003 */}
                </div>
                {/* pv-block-end:bar0003 */}

                {/* pv-block-start:bar0004 */}
                <div data-pv-block="bar0004" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz004 */}
                    {/* pv-block-start:barb004 */}
                    <div data-pv-block="barb004" className="w-full h-24 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb004 */}
                    {/* pv-block-start:barl004 */}
                    <TextParagraph data-pv-block="barl004" typography="secondary">Q4 '23</TextParagraph>
                    {/* pv-block-end:barl004 */}
                  {/* pv-editable-zone-end:barz004 */}
                </div>
                {/* pv-block-end:bar0004 */}

                {/* pv-block-start:bar0005 */}
                <div data-pv-block="bar0005" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz005 */}
                    {/* pv-block-start:barb005 */}
                    <div data-pv-block="barb005" className="w-full h-20 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb005 */}
                    {/* pv-block-start:barl005 */}
                    <TextParagraph data-pv-block="barl005" typography="secondary">Q1 '24</TextParagraph>
                    {/* pv-block-end:barl005 */}
                  {/* pv-editable-zone-end:barz005 */}
                </div>
                {/* pv-block-end:bar0005 */}

                {/* pv-block-start:bar0006 */}
                <div data-pv-block="bar0006" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz006 */}
                    {/* pv-block-start:barb006 */}
                    <div data-pv-block="barb006" className="w-full h-28 bg-background-primary-subtle rounded" />
                    {/* pv-block-end:barb006 */}
                    {/* pv-block-start:barl006 */}
                    <TextParagraph data-pv-block="barl006" typography="secondary">Q2 '24</TextParagraph>
                    {/* pv-block-end:barl006 */}
                  {/* pv-editable-zone-end:barz006 */}
                </div>
                {/* pv-block-end:bar0006 */}

                {/* pv-block-start:bar0007 */}
                <div data-pv-block="bar0007" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz007 */}
                    {/* pv-block-start:barb007 */}
                    <div data-pv-block="barb007" className="w-full h-32 bg-background-primary rounded" />
                    {/* pv-block-end:barb007 */}
                    {/* pv-block-start:barl007 */}
                    <TextParagraph data-pv-block="barl007" typography="secondary">Q3 '24</TextParagraph>
                    {/* pv-block-end:barl007 */}
                  {/* pv-editable-zone-end:barz007 */}
                </div>
                {/* pv-block-end:bar0007 */}

                {/* pv-block-start:bar0008 */}
                <div data-pv-block="bar0008" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:barz008 */}
                    {/* pv-block-start:barb008 */}
                    <div data-pv-block="barb008" className="w-full h-40 bg-background-primary rounded" />
                    {/* pv-block-end:barb008 */}
                    {/* pv-block-start:barl008 */}
                    <TextParagraph data-pv-block="barl008" typography="secondary">Q4 '24</TextParagraph>
                    {/* pv-block-end:barl008 */}
                  {/* pv-editable-zone-end:barz008 */}
                </div>
                {/* pv-block-end:bar0008 */}

                {/* pv-block-start:u6vtfw8 */}
                <div data-pv-block="u6vtfw8" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:ojeixa8 */}
                    {/* pv-block-start:g9xc9n8 */}
                    <div data-pv-block="g9xc9n8" className="w-full h-40 bg-background-primary rounded" />
                    {/* pv-block-end:g9xc9n8 */}
                    {/* pv-block-start:z2stqs8 */}
                    <TextParagraph data-pv-block="z2stqs8" typography="secondary">
                      Q1 '25
                    </TextParagraph>
                    {/* pv-block-end:z2stqs8 */}
                  {/* pv-editable-zone-end:ojeixa8 */}
                </div>
                {/* pv-block-end:u6vtfw8 */}

                {/* pv-block-start:49ofbo8 */}
                <div data-pv-block="49ofbo8" className="flex flex-1 flex-col items-center gap-2">
                  {/* pv-editable-zone-start:mof3xz8 */}
                    {/* pv-block-start:jk3axz8 */}
                    <div data-pv-block="jk3axz8" className="w-full h-40 bg-background-primary rounded" />
                    {/* pv-block-end:jk3axz8 */}
                    {/* pv-block-start:wjld8n8 */}
                    <TextParagraph data-pv-block="wjld8n8" typography="secondary">
                      Q2 '25
                    </TextParagraph>
                    {/* pv-block-end:wjld8n8 */}
                  {/* pv-editable-zone-end:mof3xz8 */}
                </div>
                {/* pv-block-end:49ofbo8 */}
              {/* pv-editable-zone-end:chrtbz1 */}
            </div>
            {/* pv-block-end:chrtb01 */}
          {/* pv-editable-zone-end:chrtz01 */}
        </Card>
        {/* pv-block-end:chrt001 */}

        {/* pv-block-start:kpgrid1 */}
        <div data-pv-block="kpgrid1" className="grid gap-4 grid-cols-3">
          {/* pv-editable-zone-start:kpgz1 */}
            {/* pv-block-start:kpc1 */}
            <Card data-pv-block="kpc1">
              {/* pv-editable-zone-start:kpce1 */}
                {/* pv-block-start:kplabel1 */}
                <div data-pv-block="kplabel1" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple1 */}
                    {/* pv-block-start:kpico1 */}
                    <Icon data-pv-block="kpico1" iconSymbol="mdi:earth" size="sm" />
                    {/* pv-block-end:kpico1 */}
                    {/* pv-block-start:kptxt1 */}
                    <TextParagraph data-pv-block="kptxt1" typography="secondary">World domination progress</TextParagraph>
                    {/* pv-block-end:kptxt1 */}
                  {/* pv-editable-zone-end:kple1 */}
                </div>
                {/* pv-block-end:kplabel1 */}
                {/* pv-block-start:kpnum1 */}
                <TextHeading data-pv-block="kpnum1" typography="heading-xxl">23%</TextHeading>
                {/* pv-block-end:kpnum1 */}
                {/* pv-block-start:kpcmp1 */}
                <div data-pv-block="kpcmp1" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz1 */}
                    {/* pv-block-start:kpcmpi1 */}
                    <Icon data-pv-block="kpcmpi1" iconSymbol="material-symbols:trending-down" size="sm" className="text-foreground-destructive" />
                    {/* pv-block-end:kpcmpi1 */}
                    {/* pv-block-start:kpcmpd1 */}
                    <TextParagraph data-pv-block="kpcmpd1" typography="semibold-primary" className="text-foreground-destructive">−77 pts</TextParagraph>
                    {/* pv-block-end:kpcmpd1 */}
                    {/* pv-block-start:kpcmpv1 */}
                    <TextParagraph data-pv-block="kpcmpv1" typography="secondary">vs target 100%</TextParagraph>
                    {/* pv-block-end:kpcmpv1 */}
                  {/* pv-editable-zone-end:kpcmpz1 */}
                </div>
                {/* pv-block-end:kpcmp1 */}
              {/* pv-editable-zone-end:kpce1 */}
            </Card>
            {/* pv-block-end:kpc1 */}

            {/* pv-block-start:kpc2 */}
            <Card data-pv-block="kpc2">
              {/* pv-editable-zone-start:kpce2 */}
                {/* pv-block-start:kplabel2 */}
                <div data-pv-block="kplabel2" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple2 */}
                    {/* pv-block-start:kpico2 */}
                    <Icon data-pv-block="kpico2" iconSymbol="mdi:lightning-bolt" size="sm" />
                    {/* pv-block-end:kpico2 */}
                    {/* pv-block-start:kptxt2 */}
                    <TextParagraph data-pv-block="kptxt2" typography="secondary">Lasers currently humming</TextParagraph>
                    {/* pv-block-end:kptxt2 */}
                  {/* pv-editable-zone-end:kple2 */}
                </div>
                {/* pv-block-end:kplabel2 */}
                {/* pv-block-start:kpnum2 */}
                <TextHeading data-pv-block="kpnum2" typography="heading-xxl">847</TextHeading>
                {/* pv-block-end:kpnum2 */}
                {/* pv-block-start:kpcmp2 */}
                <div data-pv-block="kpcmp2" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz2 */}
                    {/* pv-block-start:kpcmpi2 */}
                    <Icon data-pv-block="kpcmpi2" iconSymbol="material-symbols:trending-up" size="sm" className="text-foreground-success" />
                    {/* pv-block-end:kpcmpi2 */}
                    {/* pv-block-start:kpcmpd2 */}
                    <TextParagraph data-pv-block="kpcmpd2" typography="semibold-primary" className="text-foreground-success">+153</TextParagraph>
                    {/* pv-block-end:kpcmpd2 */}
                    {/* pv-block-start:kpcmpv2 */}
                    <TextParagraph data-pv-block="kpcmpv2" typography="secondary">vs target 1,000</TextParagraph>
                    {/* pv-block-end:kpcmpv2 */}
                  {/* pv-editable-zone-end:kpcmpz2 */}
                </div>
                {/* pv-block-end:kpcmp2 */}
              {/* pv-editable-zone-end:kpce2 */}
            </Card>
            {/* pv-block-end:kpc2 */}

            {/* pv-block-start:kpc3 */}
            <Card data-pv-block="kpc3">
              {/* pv-editable-zone-start:kpce3 */}
                {/* pv-block-start:kplabel3 */}
                <div data-pv-block="kplabel3" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple3 */}
                    {/* pv-block-start:kpico3 */}
                    <Icon data-pv-block="kpico3" iconSymbol="mdi:emoticon-sad-outline" size="sm" />
                    {/* pv-block-end:kpico3 */}
                    {/* pv-block-start:kptxt3 */}
                    <TextParagraph data-pv-block="kptxt3" typography="secondary">Minion morale (mostly grumbling)</TextParagraph>
                    {/* pv-block-end:kptxt3 */}
                  {/* pv-editable-zone-end:kple3 */}
                </div>
                {/* pv-block-end:kplabel3 */}
                {/* pv-block-start:kpnum3 */}
                <TextHeading data-pv-block="kpnum3" typography="heading-xxl">34</TextHeading>
                {/* pv-block-end:kpnum3 */}
                {/* pv-block-start:kpcmp3 */}
                <div data-pv-block="kpcmp3" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz3 */}
                    {/* pv-block-start:kpcmpi3 */}
                    <Icon data-pv-block="kpcmpi3" iconSymbol="material-symbols:trending-down" size="sm" className="text-foreground-destructive" />
                    {/* pv-block-end:kpcmpi3 */}
                    {/* pv-block-start:kpcmpd3 */}
                    <TextParagraph data-pv-block="kpcmpd3" typography="semibold-primary" className="text-foreground-destructive">−46 pts</TextParagraph>
                    {/* pv-block-end:kpcmpd3 */}
                    {/* pv-block-start:kpcmpv3 */}
                    <TextParagraph data-pv-block="kpcmpv3" typography="secondary">vs target 80</TextParagraph>
                    {/* pv-block-end:kpcmpv3 */}
                  {/* pv-editable-zone-end:kpcmpz3 */}
                </div>
                {/* pv-block-end:kpcmp3 */}
              {/* pv-editable-zone-end:kpce3 */}
            </Card>
            {/* pv-block-end:kpc3 */}

            {/* pv-block-start:kpc4 */}
            <Card data-pv-block="kpc4">
              {/* pv-editable-zone-start:kpce4 */}
                {/* pv-block-start:kplabel4 */}
                <div data-pv-block="kplabel4" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple4 */}
                    {/* pv-block-start:kpico4 */}
                    <Icon data-pv-block="kpico4" iconSymbol="mdi:shield-bug-outline" size="sm" />
                    {/* pv-block-end:kpico4 */}
                    {/* pv-block-start:kptxt4 */}
                    <TextParagraph data-pv-block="kptxt4" typography="secondary">Schemes foiled this year (sigh)</TextParagraph>
                    {/* pv-block-end:kptxt4 */}
                  {/* pv-editable-zone-end:kple4 */}
                </div>
                {/* pv-block-end:kplabel4 */}
                {/* pv-block-start:kpnum4 */}
                <TextHeading data-pv-block="kpnum4" typography="heading-xxl">7</TextHeading>
                {/* pv-block-end:kpnum4 */}
                {/* pv-block-start:kpcmp4 */}
                <div data-pv-block="kpcmp4" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz4 */}
                    {/* pv-block-start:kpcmpi4 */}
                    <Icon data-pv-block="kpcmpi4" iconSymbol="material-symbols:trending-down" size="sm" className="text-foreground-destructive" />
                    {/* pv-block-end:kpcmpi4 */}
                    {/* pv-block-start:kpcmpd4 */}
                    <TextParagraph data-pv-block="kpcmpd4" typography="semibold-primary" className="text-foreground-destructive">+7</TextParagraph>
                    {/* pv-block-end:kpcmpd4 */}
                    {/* pv-block-start:kpcmpv4 */}
                    <TextParagraph data-pv-block="kpcmpv4" typography="secondary">vs target 0</TextParagraph>
                    {/* pv-block-end:kpcmpv4 */}
                  {/* pv-editable-zone-end:kpcmpz4 */}
                </div>
                {/* pv-block-end:kpcmp4 */}
              {/* pv-editable-zone-end:kpce4 */}
            </Card>
            {/* pv-block-end:kpc4 */}

            {/* pv-block-start:kpc5 */}
            <Card data-pv-block="kpc5">
              {/* pv-editable-zone-start:kpce5 */}
                {/* pv-block-start:kplabel5 */}
                <div data-pv-block="kplabel5" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple5 */}
                    {/* pv-block-start:kpico5 */}
                    <Icon data-pv-block="kpico5" iconSymbol="mdi:cash-multiple" size="sm" />
                    {/* pv-block-end:kpico5 */}
                    {/* pv-block-start:kptxt5 */}
                    <TextParagraph data-pv-block="kptxt5" typography="secondary">Lair electricity bill (monthly)</TextParagraph>
                    {/* pv-block-end:kptxt5 */}
                  {/* pv-editable-zone-end:kple5 */}
                </div>
                {/* pv-block-end:kplabel5 */}
                {/* pv-block-start:kpnum5 */}
                <TextHeading data-pv-block="kpnum5" typography="heading-xxl">$8.4M</TextHeading>
                {/* pv-block-end:kpnum5 */}
                {/* pv-block-start:kpcmp5 */}
                <div data-pv-block="kpcmp5" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz5 */}
                    {/* pv-block-start:kpcmpi5 */}
                    <Icon data-pv-block="kpcmpi5" iconSymbol="material-symbols:trending-up" size="sm" className="text-foreground-destructive" />
                    {/* pv-block-end:kpcmpi5 */}
                    {/* pv-block-start:kpcmpd5 */}
                    <TextParagraph data-pv-block="kpcmpd5" typography="semibold-primary" className="text-foreground-destructive">+$6.4M</TextParagraph>
                    {/* pv-block-end:kpcmpd5 */}
                    {/* pv-block-start:kpcmpv5 */}
                    <TextParagraph data-pv-block="kpcmpv5" typography="secondary">vs target $2M</TextParagraph>
                    {/* pv-block-end:kpcmpv5 */}
                  {/* pv-editable-zone-end:kpcmpz5 */}
                </div>
                {/* pv-block-end:kpcmp5 */}
              {/* pv-editable-zone-end:kpce5 */}
            </Card>
            {/* pv-block-end:kpc5 */}

            {/* pv-block-start:kpc6 */}
            <Card data-pv-block="kpc6">
              {/* pv-editable-zone-start:kpce6 */}
                {/* pv-block-start:kplabel6 */}
                <div data-pv-block="kplabel6" className="flex items-center gap-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:kple6 */}
                    {/* pv-block-start:kpico6 */}
                    <Icon data-pv-block="kpico6" iconSymbol="mdi:run-fast" size="sm" />
                    {/* pv-block-end:kpico6 */}
                    {/* pv-block-start:kptxt6 */}
                    <TextParagraph data-pv-block="kptxt6" typography="secondary">Hero encounters survived</TextParagraph>
                    {/* pv-block-end:kptxt6 */}
                  {/* pv-editable-zone-end:kple6 */}
                </div>
                {/* pv-block-end:kplabel6 */}
                {/* pv-block-start:kpnum6 */}
                <TextHeading data-pv-block="kpnum6" typography="heading-xxl">61%</TextHeading>
                {/* pv-block-end:kpnum6 */}
                {/* pv-block-start:kpcmp6 */}
                <div data-pv-block="kpcmp6" className="flex items-center gap-2 pt-2 border-border-default">
                  {/* pv-editable-zone-start:kpcmpz6 */}
                    {/* pv-block-start:kpcmpi6 */}
                    <Icon data-pv-block="kpcmpi6" iconSymbol="material-symbols:trending-down" size="sm" className="text-foreground-destructive" />
                    {/* pv-block-end:kpcmpi6 */}
                    {/* pv-block-start:kpcmpd6 */}
                    <TextParagraph data-pv-block="kpcmpd6" typography="semibold-primary" className="text-foreground-destructive">−39 pts</TextParagraph>
                    {/* pv-block-end:kpcmpd6 */}
                    {/* pv-block-start:kpcmpv6 */}
                    <TextParagraph data-pv-block="kpcmpv6" typography="secondary">vs target 100%</TextParagraph>
                    {/* pv-block-end:kpcmpv6 */}
                  {/* pv-editable-zone-end:kpcmpz6 */}
                </div>
                {/* pv-block-end:kpcmp6 */}
              {/* pv-editable-zone-end:kpce6 */}
            </Card>
            {/* pv-block-end:kpc6 */}
          {/* pv-editable-zone-end:kpgz1 */}
        </div>
        {/* pv-block-end:kpgrid1 */}
      {/* pv-editable-zone-end:kp1z2q3 */}
    </div>
  );
}
