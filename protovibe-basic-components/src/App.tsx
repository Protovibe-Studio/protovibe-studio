import React from 'react';
import { useStore } from '@/store';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Combobox, ComboboxItem } from '@/components/ui/combobox';
import { Tabs } from '@/components/ui/tabs';
import { TabItem } from '@/components/ui/tab-item';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SegmentedControlItem } from '@/components/ui/segmented-control-item';
import { DialogTrigger } from '@/components/ui/dialog-trigger';
import { DialogOverlay } from '@/components/ui/dialog-overlay';
import { DialogWindow } from '@/components/ui/dialog-window';
import { DialogCloseTrigger } from '@/components/ui/dialog-close-trigger';
import { RadioGroup } from '@/components/ui/radio-group';
import { RadioItem } from '@/components/ui/radio-item';
import { RadioIcon } from '@/components/ui/radio-icon';
import { SuperLabel } from '@/components/ui/super-label';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { PreloaderSpinner } from '@/components/ui/preloader-spinner';
import { VerticalTabs } from '@/components/ui/vertical-tabs';
import { VerticalTabItem } from '@/components/ui/vertical-tab-item';
import { VerticalTabsExpandableSection } from '@/components/ui/vertical-tabs-expandable-section';
import { ToastBox } from '@/components/ui/toast-box';
import { DropdownButton } from '@/components/ui/dropdown-button'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { DropdownItem } from '@/components/ui/dropdown-item'
import { DropdownSeparator } from '@/components/ui/dropdown-separator'
import { Card } from '@/components/ui/card'
import { TextBlock } from '@/components/ui/text-block'
import { Container } from '@/components/ui/container'

export default function App() {
  const { showToast } = useStore();
  const [showMoreButtonVariants, setShowMoreButtonVariants] = React.useState(false);
  return (
    <div>
      <div className="flex flex-col items-start pl-15">
        {/* pv-editable-zone-start:kcyc8f */}
          {/* pv-block-start:vcqewy */}
          <div className="flex flex-col min-h-4" data-pv-block="vcqewy">
            {/* pv-editable-zone-start:inside-vcqewy */}
            {/* pv-editable-zone-end:inside-vcqewy */}
          </div>
          {/* pv-block-end:vcqewy */}

          {/* pv-block-start:0t5wgl */}
          <VerticalTabs data-pv-block="0t5wgl" value="tab1">
            {/* pv-editable-zone-start:yly832 */}
              {/* pv-block-start:a6b1x8 */}
              <VerticalTabItem data-pv-block="a6b1x8" label="Dashboard" value="tab1" prefixIcon="LayoutDashboard">
                {/* pv-editable-zone-start:6e7oh7 */}
                {/* pv-editable-zone-end:6e7oh7 */}
              </VerticalTabItem>
              {/* pv-block-end:a6b1x8 */}
              {/* pv-block-start:re97r0 */}
              <VerticalTabItem data-pv-block="re97r0" label="Analytics" value="tab2" prefixIcon="BarChart2">
                {/* pv-editable-zone-start:5fu92a */}
                {/* pv-editable-zone-end:5fu92a */}
              </VerticalTabItem>
              {/* pv-block-end:re97r0 */}
              {/* pv-block-start:1toybw */}
              <VerticalTabItem data-pv-block="1toybw" label="Settings" value="tab3" prefixIcon="Settings">
                {/* pv-editable-zone-start:o0xx1b */}
                {/* pv-editable-zone-end:o0xx1b */}
              </VerticalTabItem>
              {/* pv-block-end:1toybw */}
            {/* pv-editable-zone-end:yly832 */}
          </VerticalTabs>
          {/* pv-block-end:0t5wgl */}

          {/* pv-block-start:k89w9h */}
          <Tabs data-pv-block="k89w9h" value="tab1">
            {/* pv-editable-zone-start:i28u3r */}
              {/* pv-block-start:njzs0e */}
              <TabItem data-pv-block="njzs0e" label="Tab 1" value="tab1" />
              {/* pv-block-end:njzs0e */}
              {/* pv-block-start:zzi41i */}
              <TabItem data-pv-block="zzi41i" label="Tab 2" value="tab2" />
              {/* pv-block-end:zzi41i */}
              {/* pv-block-start:e16o38 */}
              <TabItem data-pv-block="e16o38" label="Tab 3" value="tab3" />
              {/* pv-block-end:e16o38 */}
            {/* pv-editable-zone-end:i28u3r */}
          </Tabs>
          {/* pv-block-end:k89w9h */}

          {/* pv-block-start:1imggz */}
          <div className="flex flex-col min-h-4 p-5 bg-background-secondary rounded-md" data-pv-block="1imggz">
            {/* pv-editable-zone-start:inside-1imggz */}
              {/* pv-block-start:dxq3u9 */}
              <span data-pv-block="dxq3u9">
                Lorem ipsum
                {/* pv-editable-zone-start:inside-dxq3u9 */}
                {/* pv-editable-zone-end:inside-dxq3u9 */}
              </span>
              {/* pv-block-end:dxq3u9 */}
            {/* pv-editable-zone-end:inside-1imggz */}
          </div>
          {/* pv-block-end:1imggz */}

        {/* pv-block-start:j5f1fn */}
          <div className="flex flex-col min-h-4 bg-background-secondary rounded-md py-5 pl-2 pr-5" data-pv-block="j5f1fn">
            {/* pv-editable-zone-start:inside-j5f1fn */}
              {/* pv-block-start:hkx3km */}
              <span data-pv-block="hkx3km">
                Lorem ipsum
                {/* pv-editable-zone-start:inside-hkx3km */}
                {/* pv-editable-zone-end:inside-hkx3km */}
              </span>
              {/* pv-block-end:hkx3km */}
            {/* pv-editable-zone-end:inside-j5f1fn */}
          </div>
          {/* pv-block-end:j5f1fn */}

          {/* pv-block-start:54fl2x */}
          <Card className="" data-pv-block="54fl2x"  >
            {/* pv-editable-zone-start:c5gbka */}
            {/* pv-block-start:gc051c */}
          <TextBlock className="font-thin" data-pv-block="gc051c" text="Text block Test" typography="heading-md" />
          {/* pv-block-end:gc051c */}

              {/* pv-block-start:fas0lb */}
              <Button data-pv-block="fas0lb" label="Button" variant="solid" color="primary" size="md" />
              {/* pv-block-end:fas0lb */}
            {/* pv-editable-zone-end:c5gbka */}
          </Card>
          {/* pv-block-end:54fl2x */}

          {/* pv-block-start:im5sfy */}
          <Container data-pv-block="im5sfy">
            {/* pv-editable-zone-start:vvh5ey */}
              {/* pv-block-start:5pzojq */}
              <TextBlock className="text-foreground-primary" data-pv-block="5pzojq" text="Text block" typography="regular" />
              {/* pv-block-end:5pzojq */}
            {/* pv-editable-zone-end:vvh5ey */}
          </Container>
          {/* pv-block-end:im5sfy */}

          {/* pv-block-start:85inm3 */}
          <span data-pv-block="85inm3">
            Lorem ipsum
            {/* pv-editable-zone-start:inside-85inm3 */}
            {/* pv-editable-zone-end:inside-85inm3 */}
          </span>
          {/* pv-block-end:85inm3 */}
        {/* pv-editable-zone-end:kcyc8f */}
      </div>
      <div className="grid grid-cols-2 gap-y-12 gap-x-8 p-8 max-w-6xl mx-auto font-sans items-start">
        {/* Icon — all 6 sizes */}
        <div className="flex gap-4 items-end">
          <Icon name="Star" size="xs" />
          <Icon name="Star" size="sm" />
          <Icon name="Star" size="md" />
          <Icon name="Star" size="lg" />
          <Icon name="Star" size="xl" />
          <Icon name="Star" size="2xl" />
        </div>
        <pre>
          {JSON.stringify({ sizes: ["xs", "sm", "md", "lg", "xl", "2xl"] }, null, 2)}
        </pre>

        {/* Icon — different icons with foreground colors */}
        <div className="flex gap-4 items-center flex-wrap">
          <Icon name="Star" size="lg" className="text-foreground-warning" />
          <Icon name="Heart" size="lg" className="text-foreground-destructive" />
          <Icon name="Zap" size="lg" className="text-foreground-primary" />
          <Icon name="Shield" size="lg" className="text-foreground-success" />
          <Icon name="Bell" size="lg" className="text-foreground-info" />
          <Icon name="Settings" size="lg" className="text-foreground-secondary" />
          <Icon name="Search" size="lg" className="text-foreground-default" />
          <Icon name="Mail" size="lg" className="text-foreground-tertiary" />
        </div>
        <pre>
          {JSON.stringify({ demo: "icons with semantic foreground colors" }, null, 2)}
        </pre>

        {/* Button — solid variant, all colors */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button label="Primary" variant="solid" color="primary" size="md" />
          <Button label="Secondary" variant="solid" color="neutral" size="md" />
          <Button label="Danger" variant="solid" color="danger" size="md" />
        </div>
        <pre>
          {JSON.stringify({ variant: "solid", colors: ["primary", "secondary", "danger"] }, null, 2)}
        </pre>

        {/* Button — outline variant, all colors */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button label="Primary" variant="outline" color="primary" size="md" />
          <Button label="Secondary" variant="outline" color="neutral" size="md" />
          <Button label="Danger" variant="outline" color="danger" size="md" />
        </div>
        <pre>
          {JSON.stringify({ variant: "outline", colors: ["primary", "secondary", "danger"] }, null, 2)}
        </pre>

        {/* Button — ghost variants */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button label="Ghost Primary" variant="ghost"  size="md" />
          <Button label="Ghost Secondary" variant="ghost" color="neutral" size="md" />
          <Button label="Ghost Danger" variant="ghost" color="danger" size="md" />
          <Button iconOnly label="Ghost Neutral" variant="ghost" color="neutral" size="md" />
        </div>
        <pre>
          {JSON.stringify({ variant: "ghost", colors: ["primary", "neutral", "danger"] }, null, 2)}
        </pre>

        {/* Button — sizes */}
        <div className="flex flex-wrap gap-3 items-center">
          <Button label="Small" variant="solid" color="primary" size="sm" />
          <Button label="Medium" variant="solid" color="primary" size="md" />
          <Button label="Large" variant="solid" color="primary" size="lg" />
        </div>
        <pre>
          {JSON.stringify({ sizes: ["sm", "md", "lg"] }, null, 2)}
        </pre>

        {/* Button — show more toggle (spans both columns) */}
        <div className="col-span-2 flex justify-start">
          <Button
            label={showMoreButtonVariants ? "Show fewer variants" : "Show more variants of the button"}
            variant="ghost"
            color="neutral"
            size="md"
            rightIcon={showMoreButtonVariants ? "ChevronUp" : "ChevronDown"}
            onClick={() => setShowMoreButtonVariants(v => !v)}
          />
        </div>

        {showMoreButtonVariants && (
          <>
            {/* Button — with left / right icons */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button label="Download" variant="solid" color="primary" size="md" leftIcon="Download" />
              <Button label="Settings" variant="outline" color="neutral" size="md" rightIcon="Settings" />
              <Button label="Delete" variant="solid" color="danger" size="md" leftIcon="Trash2" />
              <Button label="Share" variant="ghost" color="primary" size="md" rightIcon="Share2" />
            </div>
            <pre>
              {JSON.stringify({ demo: "leftIcon / rightIcon props" }, null, 2)}
            </pre>

            {/* Button — icon-only */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button iconOnly variant="solid" color="primary" size="sm" leftIcon="Plus" />
              <Button iconOnly variant="solid" color="primary" size="md" leftIcon="Plus" />
              <Button iconOnly variant="solid" color="primary" size="lg" leftIcon="Plus" />
              <Button iconOnly variant="outline" color="neutral" size="md" leftIcon="Settings" />
              <Button iconOnly variant="ghost" color="neutral" size="md" leftIcon="MoreHorizontal" />
              <Button iconOnly variant="solid" color="danger" size="md" leftIcon="Trash2" />
            </div>
            <pre>
              {JSON.stringify({ demo: "iconOnly across sizes and variants" }, null, 2)}
            </pre>

            {/* Button — disabled states */}
            <div className="flex flex-wrap gap-3 items-center">
              <Button label="Disabled Solid" variant="solid" color="primary" size="md" disabled />
              <Button label="Disabled Outline" variant="outline" color="primary" size="md" disabled />
              <Button label="Disabled Ghost" variant="ghost" color="primary" size="md" disabled />
            </div>
            <pre>
              {JSON.stringify({ demo: "disabled state across variants" }, null, 2)}
            </pre>
          </>
        )}

        {/* Input — base states */}
        <div className="flex flex-col gap-3">
          <Input  placeholder="Default input" />
          <Input placeholder="Disabled input" disabled />
          <Input placeholder="Error state" error />
          <Input defaultValue="With a value" />
        </div>
        <pre>
          {JSON.stringify({ demo: "base states: default / disabled / error / with value" }, null, 2)}
        </pre>

        {/* Input — prefix & suffix icons */}
        <div className="flex flex-col gap-3">
          <Input placeholder="Search..." prefixIcon="Search" />
          <Input placeholder="Enter email" prefixIcon="Mail" />
          <Input placeholder="Amount" suffixIcon="DollarSign" />
          <Input placeholder="Website" prefixIcon="Globe" suffixIcon="ExternalLink" />
        </div>
        <pre>
          {JSON.stringify({ demo: "prefix and suffix icons" }, null, 2)}
        </pre>

        {/* Input — prefix & suffix text */}
        <div className="flex flex-col gap-3">
          <Input placeholder="yourdomain.com" prefixText="https://" />
          <Input placeholder="0.00" suffixText="USD" />
          <Input placeholder="username" prefixText="@" suffixText=".com" />
          <Input placeholder="Enter amount" prefixText="$" suffixText="per month" />
        </div>
        <pre>
          {JSON.stringify({ demo: "prefix and suffix text adornments" }, null, 2)}
        </pre>

        {/* Input — mixed icons + text */}
        <div className="flex flex-col gap-3">
          <Input placeholder="Search users..." prefixIcon="Search" suffixText="⌘K" />
          <Input placeholder="Enter price" prefixText="€" suffixIcon="Tag" />
          <Input placeholder="Port number" prefixText="localhost:" error />
          <Input placeholder="Disabled with adornments" prefixIcon="Lock" suffixText="required" disabled />
        </div>
        <pre>
          {JSON.stringify({ demo: "mixed icon + text combos, including error and disabled" }, null, 2)}
        </pre>

        {/* Textarea — base states */}
        <div className="flex flex-col gap-3">
          <Textarea placeholder="Default textarea" />
          <Textarea placeholder="Disabled textarea" disabled />
          <Textarea placeholder="Error textarea" error />
          <Textarea defaultValue={"Line one\nLine two\nLine three"} />
        </div>
        <pre>
          {JSON.stringify({ demo: "textarea states: default / disabled / error / with value" }, null, 2)}
        </pre>

        {/* Textarea — prefix/suffix adornments */}
        <div className="flex flex-col gap-3">
          <Textarea placeholder="Write a message..." prefixIcon="MessageSquare" />
          <Textarea placeholder="Add a note..." prefixText="Note" />
          <Textarea placeholder="Your bio" suffixIcon="User" />
          <Textarea placeholder="Leave feedback" prefixIcon="Star" suffixText="max 500" />
        </div>
        <pre>
          {JSON.stringify({ demo: "prefix/suffix icon and text adornments" }, null, 2)}
        </pre>

        {/* Textarea — resize options */}
        <div className="flex flex-col gap-3">
          <Textarea placeholder="No resize" autoHeight={false} resize="none" />
          <Textarea placeholder="Horizontal resize only" autoHeight={false} resize="horizontal" />
          <Textarea placeholder="Vertical resize (default)" autoHeight={false} resize="vertical" />
          <Textarea placeholder="Resize both directions" autoHeight={false} resize="both" />
        </div>
        <pre>
          {JSON.stringify({ demo: "resize options: none / horizontal / vertical / both (autoHeight disabled)" }, null, 2)}
        </pre>

        {/* Textarea — auto height + rows + defaultHeight */}
        <div className="flex flex-col gap-3">
          <Textarea placeholder="Auto height (default) — grows as you type" />
          <Textarea placeholder="Auto height disabled — fixed at 3 rows" autoHeight={false} rows={3} />
          <Textarea placeholder="Custom default height of 160px" defaultHeight={160} />
          <Textarea placeholder="5 rows, no auto height" autoHeight={false} rows={5} />
        </div>
        <pre>
          {JSON.stringify({ demo: "autoHeight / rows / defaultHeight props" }, null, 2)}
        </pre>

        <div className="flex flex-col gap-3">
          <Checkbox checked primaryText="Accept terms" secondaryText="I agree to the terms of service" />
          <Checkbox  primaryText="Unchecked option" />
          <Checkbox disabled primaryText="Disabled option" secondaryText="Cannot be changed" />
          <Checkbox error errorLabel="This field is required" primaryText="Error state" secondaryText="Please accept to continue" />
          <Checkbox checked error errorLabel="Invalid selection" primaryText="Checked with error" />
        </div>
        <pre>
          {JSON.stringify({ props: ["checked", "disabled", "error", "errorLabel", "primaryText", "secondaryText", "heading", "prefixIcon", "suffixIcon"] }, null, 2)}
        </pre>

        <ToggleSwitch heading="" primaryText="Enable feature" checked disabled={false} />
        <pre>
          {JSON.stringify({ label: "Enable feature", checked: true, disabled: false }, null, 2)}
        </pre>

<Combobox placeholder="Search items..." open={false} value="item1">
          <ComboboxItem label="Item 1" value="item1" selected={true} />
        </Combobox>
        <pre>
          {JSON.stringify({ placeholder: "Search items...", open: false, value: "item1", children: "[ComboboxItem]" }, null, 2)}
        </pre>

        <Tabs value="tab1">
          <TabItem  label="Tab 1" value="tab1" />
          <TabItem label="Tab 2" value="tab2" />
        </Tabs>
        <pre>
          {JSON.stringify({ activeValue: "tab1", children: "[TabItem, TabItem]" }, null, 2)}
        </pre>

        <SegmentedControl value="opt1">
          <SegmentedControlItem label="Option 1" value="opt1" />
          <SegmentedControlItem label="Option 2" value="opt2" />
        </SegmentedControl>
        <pre>
          {JSON.stringify({ activeValue: "opt1", children: "[SegmentedControlItem, SegmentedControlItem]" }, null, 2)}
        </pre>

        <DialogTrigger>
          {/* pv-editable-zone-start:dtr1gx */}
          <Button label="Open Dialog" variant="solid" color="primary" size="md" />
          <DialogOverlay>
            <DialogWindow size="md">
              {/* pv-editable-zone-start:dwn2ky */}
              <h2 className="text-xl font-semibold text-foreground-default mb-2">Dialog Title</h2>
              <p className="text-foreground-secondary mb-6">This is the dialog content. Click the button below or press Escape to close.</p>
              <DialogCloseTrigger>
                <Button label="Close" variant="outline" color="primary" size="md" />
              </DialogCloseTrigger>

                {/* pv-block-start:7asxww */}
                <span className="block py-5" data-pv-block="7asxww">
                  Lorem ipsum
                  {/* pv-editable-zone-start:inside-7asxww */}
                  {/* pv-editable-zone-end:inside-7asxww */}
                </span>
                {/* pv-block-end:7asxww */}

                {/* pv-block-start:ulvawm */}
                <div className="flex flex-col min-h-4 gap-4" data-pv-block="ulvawm">
                  {/* pv-editable-zone-start:inside-ulvawm */}

                    {/* pv-block-start:4ygxbo */}
                    <Button data-pv-block="4ygxbo" label="kokoko" variant="solid" color="primary" size="md" />
                    {/* pv-block-end:4ygxbo */}

                    {/* pv-block-start:pv0qkq */}
                    <Button data-pv-block="pv0qkq" label="Button" variant="solid" color="primary" size="md" />
                    {/* pv-block-end:pv0qkq */}
                  {/* pv-editable-zone-end:inside-ulvawm */}
                </div>
                {/* pv-block-end:ulvawm */}
              {/* pv-editable-zone-end:dwn2ky */}
            </DialogWindow>
          </DialogOverlay>

            {/* pv-block-start:wnv1it */}
            <span data-pv-block="wnv1it">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-wnv1it */}
              {/* pv-editable-zone-end:inside-wnv1it */}
            </span>
            {/* pv-block-end:wnv1it */}

            {/* pv-block-start:3nnoxx */}
            <span data-pv-block="3nnoxx">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-3nnoxx */}
              {/* pv-editable-zone-end:inside-3nnoxx */}
            </span>
            {/* pv-block-end:3nnoxx */}

            {/* pv-block-start:aq1y0u */}
            <span data-pv-block="aq1y0u">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-aq1y0u */}
              {/* pv-editable-zone-end:inside-aq1y0u */}
            </span>
            {/* pv-block-end:aq1y0u */}

            {/* pv-block-start:6jdpfx */}
            <span data-pv-block="6jdpfx">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-6jdpfx */}
              {/* pv-editable-zone-end:inside-6jdpfx */}
            </span>
            {/* pv-block-end:6jdpfx */}

            {/* pv-block-start:932lo5 */}
            <span data-pv-block="932lo5">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-932lo5 */}
              {/* pv-editable-zone-end:inside-932lo5 */}
            </span>
            {/* pv-block-end:932lo5 */}

            {/* pv-block-start:8bcnse */}
            <span data-pv-block="8bcnse">
              Lorem ipsum
              {/* pv-editable-zone-start:inside-8bcnse */}
              {/* pv-editable-zone-end:inside-8bcnse */}
            </span>
            {/* pv-block-end:8bcnse */}
          {/* pv-editable-zone-end:dtr1gx */}
        </DialogTrigger>
        <pre>
          {JSON.stringify({ children: "[Button trigger, DialogOverlay > DialogWindow]" }, null, 2)}
        </pre>

        <RadioGroup  value="opt2">
          {/* pv-editable-zone-start:rgz8kp */}

            {/* pv-block-start:rxa3n1 */}
            <RadioItem   data-pv-block="rxa3n1" value="opt1" primaryText="Option One" secondaryText="Description for option one" />
            {/* pv-block-end:rxa3n1 */}

            {/* pv-block-start:rxb4m2 */}
            <RadioItem data-pv-block="rxb4m2" value="opt2" selected={true} primaryText="Option Two" secondaryText="This one is selected" />
            {/* pv-block-end:rxb4m2 */}

            {/* pv-block-start:rxc5p3 */}
            <RadioItem data-pv-block="rxc5p3" value="opt3" disabled={true} primaryText="Option Three" secondaryText="Disabled option" />
            {/* pv-block-end:rxc5p3 */}

            {/* pv-block-start:rxd6q4 */}
            <RadioItem data-pv-block="rxd6q4" value="opt4" error={true} errorLabel="This selection is invalid" primaryText="Option Four" secondaryText="Error state example" />
            {/* pv-block-end:rxd6q4 */}

          {/* pv-editable-zone-end:rgz8kp */}
        </RadioGroup>
        <pre>
          {JSON.stringify({ orientation: "vertical", value: "opt2", items: ["opt1 (unselected)", "opt2 (selected)", "opt3 (disabled)"] }, null, 2)}
        </pre>

        <div className="flex gap-4 items-center">
          <RadioIcon state="unselected" />
          <RadioIcon state="selected" />
          <RadioIcon state="disabled" />
          <RadioIcon state="error" />
          <RadioIcon state="inherit" />
        </div>
        <pre>
          {JSON.stringify({ states: ["unselected", "selected", "disabled", "error", "inherit"] }, null, 2)}
        </pre>

        <SuperLabel
          heading="Category"
          primaryText="Option Label"
          secondaryText="Helper description text"
          prefixIcon="Star"
          suffixIcon="ChevronRight"
        />
        <pre>
          {JSON.stringify({ heading: "Category", primaryText: "Option Label", secondaryText: "Helper description text", prefixIcon: "Star", suffixIcon: "ChevronRight" }, null, 2)}
        </pre>

        {/* Avatar — sizes */}
        <div className="flex gap-4 items-end">
          <Avatar size="xs" initials="ab" bgColor="primary" />
          <Avatar  size="sm" initials="cd"  />
          <Avatar size="md" initials="ef" bgColor="warning" />
          <Avatar size="lg" initials="gh" bgColor="destructive" />
          <Avatar size="xl" initials="ij" bgColor="info" />
          <Avatar size="2xl" initials="kl" bgColor="default" />
        </div>
        <pre>
          {JSON.stringify({ demo: "6 sizes with initials (auto-uppercase)", sizes: ["xs", "sm", "md", "lg", "xl", "2xl"] }, null, 2)}
        </pre>

        {/* Avatar — icon + outline */}
        <div className="flex gap-4 items-center">
          <Avatar size="md" icon="User" bgColor="default" />
          <Avatar size="md" icon="Star" bgColor="primary" />
          <Avatar size="lg" initials="jd" bgColor="primary" outline />
          <Avatar size="lg" initials="ms" bgColor="success" outline />
          <Avatar size="xl" icon="Shield" bgColor="destructive" outline />
        </div>
        <pre>
          {JSON.stringify({ demo: "icon prop replaces initials; outline=true adds 2px ring in background-default color" }, null, 2)}
        </pre>

        {/* Avatar — with image */}
        <div className="flex gap-4 items-center">
          <Avatar size="sm" initials="jd" bgColor="primary" imageSrc="https://i.pravatar.cc/80?img=1" />
          <Avatar size="md" initials="ms" bgColor="success" imageSrc="https://i.pravatar.cc/80?img=2" />
          <Avatar size="lg" initials="ab" bgColor="info" imageSrc="https://i.pravatar.cc/80?img=3" />
          <Avatar size="xl" initials="cd" bgColor="warning" imageSrc="https://i.pravatar.cc/80?img=4" outline />
          <Avatar size="2xl" initials="ef" bgColor="destructive" imageSrc="https://i.pravatar.cc/80?img=5" outline />
        </div>
        <pre>
          {JSON.stringify({ demo: "imageSrc covers initials when loaded; initials visible as fallback" }, null, 2)}
        </pre>

        {/* Badge — all color variants */}
        <div className="flex gap-2 items-center flex-wrap">
          <Badge label="Primary" color="primary" />
          <Badge label="Destructive" color="destructive" />
          <Badge  label="Success" color="success" />
          <Badge label="Warning" color="warning" />
          <Badge label="Info" color="info" />
          <Badge label="Neutral" color="neutral" />
        </div>
        <pre>
          {JSON.stringify({ demo: "all six color variants" }, null, 2)}
        </pre>

        {/* Badge — with prefix and suffix icons */}
        <div className="flex gap-2 items-center flex-wrap">
          <Badge label="New" color="primary" prefixIcon="Sparkles" />
          <Badge label="Error" color="destructive" prefixIcon="AlertCircle" />
          <Badge label="Live" color="success" prefixIcon="Radio" />
          <Badge label="Pending" color="warning" suffixIcon="Clock" />
          <Badge label="Beta" color="info" prefixIcon="FlaskConical" />
          <Badge label="Draft" color="neutral" suffixIcon="FileEdit" />
        </div>
        <pre>
          {JSON.stringify({ demo: "badges with prefix and suffix icons" }, null, 2)}
        </pre>

        {/* InfoBoxBanner — color variants */}
        <div className="flex flex-col gap-3">
          <InfoBoxBanner icon="Info" heading="Info" secondaryText="This is an informational message." color="info" showCloseButton={false} />
          <InfoBoxBanner primaryActionLabel="test" icon="CheckCircle" heading="Success" secondaryText="Your changes were saved successfully." color="success" showCloseButton={false} />
          <InfoBoxBanner icon="AlertTriangle" heading="Warning" secondaryText="Please review before continuing." color="warning" showCloseButton={false} />
          <InfoBoxBanner icon="XCircle" heading="Error" secondaryText="Something went wrong. Try again." color="destructive" showCloseButton={false} />
          <InfoBoxBanner icon="Sparkles" heading="New feature" secondaryText="Check out what's new in this release." color="primary" showCloseButton={false} />
          <InfoBoxBanner icon="MessageSquare" heading="Note" secondaryText="A neutral message with no specific urgency." color="neutral" showCloseButton={false} />
        </div>
        <pre>
          {JSON.stringify({ demo: "all six color variants" }, null, 2)}
        </pre>

        {/* InfoBoxBanner — with action buttons and close */}
        <div className="flex flex-col gap-3">
          <InfoBoxBanner
            icon="Info"
            heading="Update available"
            secondaryText="A new version is ready to install."
            color="primary"
            primaryActionLabel="Install now"
            secondaryActionLabel="Remind me later"
            showCloseButton={true}
          />
          <InfoBoxBanner
            icon="AlertTriangle"
            heading="Storage almost full"
            secondaryText="You have used 90% of your storage quota."
            color="warning"
            primaryActionLabel="Upgrade plan"
            secondaryActionLabel="Manage files"
            showCloseButton={true}
          />
        </div>
        <pre>
          {JSON.stringify({ demo: "with primary/secondary actions and close button" }, null, 2)}
        </pre>

        {/* InfoBoxBanner — actionsLayout right */}
        <div className="flex flex-col gap-3">
          <InfoBoxBanner
            icon="Info"
            heading="Update available"
            secondaryText="A new version is ready to install. Some random text so that it's longer so that you can see how it wraps. All right, man, shit, motherfucker. "
            color="primary"
            primaryActionLabel="Install now"
            secondaryActionLabel="Later"
            actionsLayout="right"
            showCloseButton={true}
          />
          <InfoBoxBanner
            icon="AlertTriangle"
            heading="Storage almost full"
            secondaryText="You have used 90% of your storage quota."
            color="warning"
            primaryActionLabel="Upgrade plan"
            actionsLayout="right"
            showCloseButton={true}
          />
        </div>
        <pre>
          {JSON.stringify({ demo: "actionsLayout right — buttons beside text before close" }, null, 2)}
        </pre>

        {/* EmptyState — basic */}
        <EmptyState
          icon="Inbox"
          iconSize="xl"
          heading="Nothing here yet"
          secondaryText="Get started by creating your first item."
          learnMoreLabel="Learn more"
          learnMoreHref="#"
          primaryActionLabel="Create item"
          secondaryActionLabel="Learn more"
        />
        <pre>
          {JSON.stringify({ demo: "empty state with icon, heading, description and actions" }, null, 2)}
        </pre>

        {/* EmptyState — icon size variants */}
        <div className="grid grid-cols-3 gap-4">
          <EmptyState icon="Search" iconSize="sm" heading="No results" secondaryText="Try a different search." />
          <EmptyState icon="FolderOpen" iconSize="lg" heading="Empty folder" secondaryText="Upload files to get started." primaryActionLabel="Upload" />
          <EmptyState icon="Bell" iconSize="2xl" heading="No notifications" secondaryText="You're all caught up!" />
        </div>
        <pre>
          {JSON.stringify({ demo: "icon size variants: sm / lg / 2xl" }, null, 2)}
        </pre>

        {/* PreloaderSpinner — all sizes */}
        <div className="flex gap-6 items-end">
          <PreloaderSpinner size="xs" />
          <PreloaderSpinner size="sm" />
          <PreloaderSpinner size="md" />
          <PreloaderSpinner size="lg" />
          <PreloaderSpinner size="xl" />
          <PreloaderSpinner size="2xl" />
        </div>
        <pre>
          {JSON.stringify({ demo: "all six sizes" }, null, 2)}
        </pre>

        {/* PreloaderSpinner — with label */}
        <div className="flex flex-col gap-4">
          <PreloaderSpinner size="md" label="Loading..." labelPlacement="bottom" />
          <PreloaderSpinner size="md" label="Loading..." labelPlacement="right" />
          <PreloaderSpinner size="lg" label="Please wait" labelPlacement="right" />
        </div>
        <pre>
          {JSON.stringify({ demo: "label bottom vs right" }, null, 2)}
        </pre>

        {/* VerticalTabs — basic with active state */}
        <VerticalTabs value="tab2" className="w-56">
          <VerticalTabItem label="Dashboard" value="tab1" prefixIcon="LayoutDashboard">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
          <VerticalTabItem label="Analytics" value="tab2" prefixIcon="BarChart2">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
          <VerticalTabItem label="Reports" value="tab3" prefixIcon="FileText">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
          <VerticalTabItem label="Settings" value="tab4" prefixIcon="Settings" disabled>
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
        </VerticalTabs>
        <pre>
          {JSON.stringify({ demo: "basic vertical tabs with prefix icons, tab2 active, settings disabled" }, null, 2)}
        </pre>

        {/* VerticalTabs — with suffix icons */}
        <VerticalTabs value="tab1" className="w-56">
          <VerticalTabItem  label="Inbox" value="tab1" prefixIcon="Inbox" suffixIcon="Bell">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
          <VerticalTabItem label="Sent" value="tab2" prefixIcon="Send">
            {/* pv-editable-zone-start:z43kf6 */}
            
              {/* pv-block-start:c3dwn7 */}
              <Badge data-pv-block="c3dwn7" label="Badge" color="primary" />
              {/* pv-block-end:c3dwn7 */}
            {/* pv-editable-zone-end:z43kf6 */}
          </VerticalTabItem>
          <VerticalTabItem label="Drafts" value="tab3" prefixIcon="FileEdit" suffixIcon="Badge">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
          <VerticalTabItem label="Trash" value="tab4" prefixIcon="Trash2">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
        </VerticalTabs>
        <pre>
          {JSON.stringify({ demo: "with prefix and suffix icons" }, null, 2)}
        </pre>

        {/* VerticalTabs — expandable states */}
        <VerticalTabs value="tab1" className="w-64">
          <VerticalTabsExpandableSection label="Projects" value="tab1" prefixIcon="FolderOpen" expandable="expanded">
            <div className="flex flex-col gap-0.5 py-1 pl-9">
              <VerticalTabItem label="Frontend" value="sub1">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
              <VerticalTabItem label="Backend" value="sub2">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
              <VerticalTabItem label="Mobile" value="sub3">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
            </div>
          </VerticalTabsExpandableSection>
          <VerticalTabsExpandableSection label="Team" value="tab2" prefixIcon="Users" expandable="expandable">
            <div className="flex flex-col gap-0.5 py-1 pl-9">
              <VerticalTabItem label="Members" value="sub4">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
              <VerticalTabItem label="Roles" value="sub5">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
            </div>
          </VerticalTabsExpandableSection>
          <VerticalTabsExpandableSection label="Settings" value="tab3" prefixIcon="Settings" expandable="collapsed">
            <div className="flex flex-col gap-0.5 py-1 pl-9">
              <VerticalTabItem label="General" value="sub6">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
              <VerticalTabItem label="Security" value="sub7">
                {/* pv-editable-zone-start */}
                {/* pv-editable-zone-end */}
              </VerticalTabItem>
            </div>
          </VerticalTabsExpandableSection>
          <VerticalTabItem label="Docs" value="tab4" prefixIcon="BookOpen">
            {/* pv-editable-zone-start */}
            {/* pv-editable-zone-end */}
          </VerticalTabItem>
        </VerticalTabs>
        <pre>
          {JSON.stringify({ demo: "expandable states: 'expanded' (open by default), 'expandable' (toggleable, starts collapsed), 'collapsed' (starts collapsed)" }, null, 2)}
        </pre>

        {/* ToastBox — all 4 variants */}
        <div className="flex flex-col gap-3">
          <ToastBox variant="success" heading="Success!" secondaryText="Your changes have been saved successfully." showCloseButton={false} />
          <ToastBox variant="destructive" heading="Error" secondaryText="Something went wrong. Please try again." showCloseButton={false} />
          <ToastBox variant="warning" heading="Warning" secondaryText="This action cannot be undone." showCloseButton={false} />
          <ToastBox variant="neutral" heading="Info" secondaryText="A new update is available." showCloseButton={false} />
        </div>
        <pre>
          {JSON.stringify({ demo: "all four toast variants" }, null, 2)}
        </pre>

        {/* ToastBox — with action button and close */}
        <div className="flex flex-col gap-3">
          <ToastBox variant="success" heading="File uploaded" secondaryText="report.pdf was uploaded." actionLabel="View" />
          <ToastBox variant="warning" heading="Session expiring" secondaryText="Your session will expire in 5 minutes." actionLabel="Extend" />
        </div>
        <pre>
          {JSON.stringify({ demo: "with action button and close button" }, null, 2)}
        </pre>

        {/* ToastBox — trigger buttons for global toast */}
        <div className="flex flex-col gap-3">
          <Button
            label="Show success toast"
            variant="solid"
            color="primary"
            size="md"
            onClick={() => showToast({ variant: 'success', heading: 'Saved!', secondaryText: 'Your changes have been saved.' })}
          />
          <Button
            label="Show destructive toast"
            variant="outline"
            color="danger"
            size="md"
            onClick={() => showToast({ variant: 'destructive', heading: 'Error', secondaryText: 'Something went wrong.' })}
          />
          <Button
            label="Show warning toast"
            variant="outline"
            color="neutral"
            size="md"
            onClick={() => showToast({ variant: 'warning', heading: 'Warning', secondaryText: 'This action cannot be undone.' })}
          />
          <Button
            label="Show persistent toast"
            variant="ghost"
            color="neutral"
            size="md"
            onClick={() => showToast({ variant: 'neutral', heading: 'Persistent toast', secondaryText: 'This will not auto-dismiss. Click close to hide.', persistent: true })}
          />
        </div>
        <pre>
          {JSON.stringify({ demo: "buttons triggering global toast via showToast()" }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
