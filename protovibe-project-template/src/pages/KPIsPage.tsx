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

const chartBars = [
  { id: 'q1-22', label: "Q1 '22", height: 'h-8', color: 'bg-background-primary-subtle' },
  { id: 'q2-22', label: "Q2 '22", height: 'h-10', color: 'bg-background-primary-subtle' },
  { id: 'q3-22', label: "Q3 '22", height: 'h-12', color: 'bg-background-primary-subtle' },
  { id: 'q4-22', label: "Q4 '22", height: 'h-14', color: 'bg-background-primary-subtle' },
  { id: 'q1-23', label: "Q1 '23", height: 'h-16', color: 'bg-background-primary-subtle' },
  { id: 'q2-23', label: "Q2 '23", height: 'h-20', color: 'bg-background-primary-subtle' },
  { id: 'q3-23', label: "Q3 '23", height: 'h-20', color: 'bg-background-primary-subtle' },
  { id: 'q4-23', label: "Q4 '23", height: 'h-24', color: 'bg-background-primary-subtle' },
  { id: 'q1-24', label: "Q1 '24", height: 'h-24', color: 'bg-background-primary-subtle' },
  { id: 'q2-24', label: "Q2 '24", height: 'h-28', color: 'bg-background-primary-subtle' },
  { id: 'q3-24', label: "Q3 '24", height: 'h-32', color: 'bg-background-primary' },
  { id: 'q4-24', label: "Q4 '24", height: 'h-36', color: 'bg-background-primary' },
  { id: 'q1-25', label: "Q1 '25", height: 'h-40', color: 'bg-background-primary' },
  { id: 'q2-25', label: "Q2 '25", height: 'h-44', color: 'bg-background-primary' },
];

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 p-8">
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
            <div data-pv-block="chrth01" className="flex flex-col gap-0 mb-3">
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
            <div data-pv-block="chrtb01" className="flex flex-col gap-2 border-border-default rounded">
              {/* pv-editable-zone-start:chrtbz1 */}
                {/* pv-block-start:plotrw1 */}
                <div data-pv-block="plotrw1" className="flex gap-3">
                  {/* pv-editable-zone-start:plotrwz1 */}
                    {/* pv-block-start:yaxis01 */}
                    <div data-pv-block="yaxis01" className="flex flex-col justify-between items-end h-52 w-8 text-sm">
                      {/* pv-editable-zone-start:yaxisz1 */}
                        {/* pv-block-start:ylab005 */}
                        <TextParagraph data-pv-block="ylab005" typography="small">100</TextParagraph>
                        {/* pv-block-end:ylab005 */}
                        {/* pv-block-start:ylab004 */}
                        <TextParagraph data-pv-block="ylab004" typography="small">75</TextParagraph>
                        {/* pv-block-end:ylab004 */}
                        {/* pv-block-start:ylab003 */}
                        <TextParagraph data-pv-block="ylab003" typography="small">50</TextParagraph>
                        {/* pv-block-end:ylab003 */}
                        {/* pv-block-start:ylab002 */}
                        <TextParagraph data-pv-block="ylab002" typography="small">25</TextParagraph>
                        {/* pv-block-end:ylab002 */}
                        {/* pv-block-start:ylab001 */}
                        <TextParagraph data-pv-block="ylab001" typography="small">0</TextParagraph>
                        {/* pv-block-end:ylab001 */}
                      {/* pv-editable-zone-end:yaxisz1 */}
                    </div>
                    {/* pv-block-end:yaxis01 */}

                    {/* pv-block-start:plotar1 */}
                    <div data-pv-block="plotar1" className="flex flex-1 items-end justify-around gap-2 h-52 px-2 border-l border-b border-border-default">
                      {/* pv-editable-zone-start:plotz01 */}
                        {/* pv-block-start:bartpl1 */}
                        {chartBars.map((bar) => (
                          <div key={bar.id} data-pv-block="bartpl1" className={`flex flex-1 max-w-10 ${bar.height} ${bar.color} rounded rounded-bl-none rounded-br-none`} />
                        ))}
                        {/* pv-block-end:bartpl1 */}
                      {/* pv-editable-zone-end:plotz01 */}
                    </div>
                    {/* pv-block-end:plotar1 */}
                  {/* pv-editable-zone-end:plotrwz1 */}
                </div>
                {/* pv-block-end:plotrw1 */}

                {/* pv-block-start:xaxis01 */}
                <div data-pv-block="xaxis01" className="flex gap-3">
                  {/* pv-editable-zone-start:xaxisz1 */}
                    {/* pv-block-start:xspcr01 */}
                    <div data-pv-block="xspcr01" className="w-8" />
                    {/* pv-block-end:xspcr01 */}
                    {/* pv-block-start:xlbrow1 */}
                    <div data-pv-block="xlbrow1" className="flex flex-1 justify-around gap-2 px-2">
                      {/* pv-editable-zone-start:xlbz01 */}
                        {/* pv-block-start:xlbtpl1 */}
                        {chartBars.map((bar) => (
                          <TextParagraph key={bar.id} data-pv-block="xlbtpl1" typography="secondary" className="flex-1 max-w-10 text-center text-sm whitespace-nowrap">{bar.label}</TextParagraph>
                        ))}
                        {/* pv-block-end:xlbtpl1 */}
                      {/* pv-editable-zone-end:xlbz01 */}
                    </div>
                    {/* pv-block-end:xlbrow1 */}
                  {/* pv-editable-zone-end:xaxisz1 */}
                </div>
                {/* pv-block-end:xaxis01 */}
              {/* pv-editable-zone-end:chrtbz1 */}
            </div>
            {/* pv-block-end:chrtb01 */}
          {/* pv-editable-zone-end:chrtz01 */}
        </Card>
        {/* pv-block-end:chrt001 */}

        {/* pv-block-start:kpgrid1 */}
        <div data-pv-block="kpgrid1" className="grid grid-cols-3 gap-7">
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
