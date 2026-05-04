import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { DateInput } from '@/components/ui/date-input';
import { Slider } from '@/components/ui/slider';

export function DashboardPage() {
  return (
    <div className="flex flex-col animate-in fade-in duration-300 gap-6 bg-background-default p-8">
      {/* pv-editable-zone-start:d8z9a1 */}
        {/* pv-block-start:da1sh2 */}
        <TextHeading className="" data-pv-block="da1sh2" typography="heading-lg">
          Welcome!
        </TextHeading>
        {/* pv-block-end:da1sh2 */}
        {/* pv-block-start:i3b4c5 */}
        <InfoBoxBanner color="info" className=""
          data-pv-block="i3b4c5"
          heading="Welcome back, HR Admin!"
          secondaryText="You have 4 pending time-off requests and 2 upcoming performance reviews to manage."

          icon="Sparkles"
          primaryActionLabel="Review Requests"
          actionsLayout="right">

        </InfoBoxBanner>
        {/* pv-block-end:i3b4c5 */}

        {/* pv-block-start:g6h7j8 */}
        <div data-pv-block="g6h7j8" className="grid grid-cols-1 gap-7 md:grid md:grid-cols-4">
          {/* pv-editable-zone-start:w2x3y4 */}
            {/* pv-block-start:z5a6b7 */}
            <Card data-pv-block="z5a6b7" className="">
              {/* pv-editable-zone-start:c8d9e1 */}
                {/* pv-block-start:r5s6t7 */}
                <TextHeading data-pv-block="r5s6t7" typography="heading-xxl" className="mb-2">
                  25
                </TextHeading>
                {/* pv-block-end:r5s6t7 */}
                {/* pv-block-start:f2g3h4 */}
                <div data-pv-block="f2g3h4" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:i5j6k7 */}
                    {/* pv-block-start:l8m9n1 */}
                    <Icon data-pv-block="l8m9n1" iconSymbol="Users" size="sm" />
                    {/* pv-block-end:l8m9n1 */}
                    {/* pv-block-start:o2p3q4 */}
                    <TextParagraph typography="secondary" data-pv-block="o2p3q4" className="">Total Headcount</TextParagraph>
                    {/* pv-block-end:o2p3q4 */}
                  {/* pv-editable-zone-end:i5j6k7 */}
                </div>
                {/* pv-block-end:f2g3h4 */}
                {/* pv-block-start:u8v9w1 */}
                <Badge data-pv-block="u8v9w1" label="+12% vs last year" color="success" prefixIcon="trending-up" />
                {/* pv-block-end:u8v9w1 */}
              {/* pv-editable-zone-end:c8d9e1 */}
            </Card>
            {/* pv-block-end:z5a6b7 */}

            {/* pv-block-start:kx9968 */}
            <Card data-pv-block="kx9968" className="">
              {/* pv-editable-zone-start:c8d9e1 */}
                {/* pv-block-start:5ingd7 */}
                <TextHeading data-pv-block="5ingd7" typography="heading-xxl" className="mb-2">
                  25
                </TextHeading>
                {/* pv-block-end:5ingd7 */}
                {/* pv-block-start:pvq9ce */}
                <div data-pv-block="pvq9ce" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:i5j6k7 */}
                    {/* pv-block-start:reh2tx */}
                    <Icon data-pv-block="reh2tx" iconSymbol="Users" size="sm" />
                    {/* pv-block-end:reh2tx */}
                    {/* pv-block-start:yn22da */}
                    <TextParagraph data-tooltip-dir="bottom" data-tooltip-text="Test" typography="secondary" data-pv-block="yn22da" className="">
                      eNPS score
                    </TextParagraph>
                    {/* pv-block-end:yn22da */}
                  {/* pv-editable-zone-end:i5j6k7 */}
                </div>
                {/* pv-block-end:pvq9ce */}
                {/* pv-block-start:vx10c1 */}
                <Badge data-pv-block="vx10c1" label="+12% vs last year" color="destructive" prefixIcon="material-symbols:trending-down" />
                {/* pv-block-end:vx10c1 */}
              {/* pv-editable-zone-end:c8d9e1 */}
            </Card>
            {/* pv-block-end:kx9968 */}

            {/* pv-block-start:x2y3z4 */}
            <Card data-pv-block="x2y3z4" className="">
              {/* pv-editable-zone-start:a5b6c7 */}
                {/* pv-block-start:p2q3r4 */}
                <TextHeading data-pv-block="p2q3r4" typography="heading-xxl" className="mb-2">18</TextHeading>
                {/* pv-block-end:p2q3r4 */}
                {/* pv-block-start:d8e9f1 */}
                <div data-pv-block="d8e9f1" className="flex gap-3 mb-2 text-foreground-secondary items-center">
                  {/* pv-editable-zone-start:g2h3i4 */}
                    {/* pv-block-start:j5k6l7 */}
                    <Icon data-pv-block="j5k6l7" iconSymbol="Briefcase" size="sm" />
                    {/* pv-block-end:j5k6l7 */}
                    {/* pv-block-start:m8n9o1 */}
                    <TextParagraph typography="secondary" data-pv-block="m8n9o1" className="">Open Roles</TextParagraph>
                    {/* pv-block-end:m8n9o1 */}
                  {/* pv-editable-zone-end:g2h3i4 */}
                </div>
                {/* pv-block-end:d8e9f1 */}
                {/* pv-block-start:s5t6u7 */}
                <Badge data-pv-block="s5t6u7" label="4 critical to fill" color="warning" prefixIcon="alert-circle" />
                {/* pv-block-end:s5t6u7 */}
              {/* pv-editable-zone-end:a5b6c7 */}
            </Card>
            {/* pv-block-end:x2y3z4 */}

            {/* pv-block-start:v8w9x1 */}
            <Card data-pv-block="v8w9x1" className="">
              {/* pv-editable-zone-start:y2z3a4 */}
                {/* pv-block-start:n8o9p1 */}
                <TextHeading data-pv-block="n8o9p1" typography="heading-xxl" className="mb-2">6</TextHeading>
                {/* pv-block-end:n8o9p1 */}
                {/* pv-block-start:b5c6d7 */}
                <div data-pv-block="b5c6d7" className="flex items-center gap-3 mb-2 text-foreground-secondary">
                  {/* pv-editable-zone-start:e8f9g1 */}
                    {/* pv-block-start:h2i3j4 */}
                    <Icon data-pv-block="h2i3j4" iconSymbol="CalendarHeart" size="sm" />
                    {/* pv-block-end:h2i3j4 */}
                    {/* pv-block-start:k5l6m7 */}
                    <TextParagraph typography="secondary" data-pv-block="k5l6m7" className="">On Leave</TextParagraph>
                    {/* pv-block-end:k5l6m7 */}
                  {/* pv-editable-zone-end:e8f9g1 */}
                </div>
                {/* pv-block-end:b5c6d7 */}
                {/* pv-block-start:q2r3s4 */}
                <Badge data-pv-block="q2r3s4" label="2 returning this week" color="info" prefixIcon="clock" />
                {/* pv-block-end:q2r3s4 */}
              {/* pv-editable-zone-end:y2z3a4 */}
            </Card>
            {/* pv-block-end:v8w9x1 */}
          {/* pv-editable-zone-end:w2x3y4 */}
        </div>
        {/* pv-block-end:g6h7j8 */}
        {/* pv-block-start:lib3xn */}
        <TextHeading  data-pv-block="lib3xn" typography="heading-md">
          Heading
        </TextHeading>
        {/* pv-block-end:lib3xn */}

        {/* pv-block-start:dkwss2 */}
        <div data-testid="e2e-pv-block" className="flex flex-col min-h-4 p-4 border border-border-default rounded bg-background-elevated" data-pv-block="dkwss2">
          {/* pv-editable-zone-start:inside-dkwss2 */}
            {/* pv-block-start:rkj7hq */}
            <span className="" data-pv-block="rkj7hq">
              Container for testing adding and styling elements
            </span>
            {/* pv-block-end:rkj7hq */}
          {/* pv-editable-zone-end:inside-dkwss2 */}
        </div>
        {/* pv-block-end:dkwss2 */}
        {/* pv-block-start:ex3xz0 */}
        <Card className="pt-20 bg-background-default overflow-scroll h-px" data-pv-block="ex3xz0">
          {/* pv-editable-zone-start:xqhvyt */}
            {/* pv-block-start:n7n58d */}
            <span className="font-normal" data-pv-block="n7n58d">Lorem ipsum</span>
            {/* pv-block-end:n7n58d */}
            {/* pv-block-start:zjqdot */}
            <Button data-pv-block="zjqdot" label="Button" variant="solid" color="primary" size="md" />
            {/* pv-block-end:zjqdot */}

            {/* pv-block-start:k3et9v */}
            <span className="font-bold" data-pv-block="k3et9v">Lorem ipsum</span>
            {/* pv-block-end:k3et9v */}
          {/* pv-editable-zone-end:xqhvyt */}
        </Card>
        {/* pv-block-end:ex3xz0 */}
        {/* pv-block-start:h6opv6 */}
        <Card className="pt-11" data-pv-block="h6opv6">
          {/* pv-editable-zone-start:eza554 */}
            {/* pv-block-start:s3tl43 */}
            <span className="font-bold" data-pv-block="s3tl43">Lorem ipsum</span>
            {/* pv-block-end:s3tl43 */}
          {/* pv-editable-zone-end:eza554 */}
        </Card>
        {/* pv-block-end:h6opv6 */}
        {/* pv-block-start:462s7c */}
        <DateInput data-pv-block="462s7c" placeholder="MM/DD/YYYY" pickerOpen="Auto (Default)" />
        {/* pv-block-end:462s7c */}
        {/* pv-block-start:a1120r */}
        <Slider data-pv-block="a1120r" value="40" min="0" max="100" step="1" valueField="editable" />
        {/* pv-block-end:a1120r */}

        {/* pv-block-start:0ohoji */}
        <Card className="bg-background-tertiary-hover mt-8" data-pv-block="0ohoji">
          {/* pv-editable-zone-start:xqhvyt */}
            {/* pv-block-start:jtca4v */}
            <span data-pv-block="jtca4v">Lorem ipsum</span>
            {/* pv-block-end:jtca4v */}
          {/* pv-editable-zone-end:xqhvyt */}
        </Card>
        {/* pv-block-end:0ohoji */}
        {/* pv-block-start:bu5asv */}
        <div className="flex flex-col min-h-4" data-pv-block="bu5asv">
          {/* pv-editable-zone-start:uzmjqy */}
          {/* pv-editable-zone-end:uzmjqy */}
        </div>
        {/* pv-block-end:bu5asv */}
      {/* pv-editable-zone-end:d8z9a1 */}
    </div>
  );
}
