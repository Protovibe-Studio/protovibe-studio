import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InfoBoxBanner } from '@/components/ui/info-box-banner';
import { Card } from '@/components/ui/card';
import { TextHeading } from '@/components/ui/text-heading';
import { TextParagraph } from '@/components/ui/text-paragraph';
import { DateInput } from '@/components/ui/date-input';
import { Slider } from '@/components/ui/slider';
import { Container } from '@/components/ui/container'
import { StepCircle } from '@/components/ui/step-circle'
import { DropdownButton } from '@/components/ui/dropdown-button'
import { DropdownItem } from '@/components/ui/dropdown-item'
import { DropdownSeparator } from '@/components/ui/dropdown-separator'
import { Avatar } from '@/components/ui/avatar'

export function DashboardPage() {
  return (
    <div className="flex flex-col animate-in fade-in duration-300 gap-6 bg-background-default p-8 max-w-[1200px] mx-auto">
      {/* pv-editable-zone-start:d8z9a1 */}
        {/* pv-block-start:oryele */}
        <div data-pv-block="oryele" className="flex items-center justify-between">
        {/* pv-editable-zone-start:sk5e6f */}
        {/* pv-block-start:5hdsgr */}
        <div data-pv-block="5hdsgr" className="flex flex-col gap-0">
        {/* pv-editable-zone-start:sk9i0j */}
        {/* pv-block-start:vqs3bs */}
        <TextHeading data-pv-block="vqs3bs" typography="heading-xxl">
          👋 Welcome to example project!
        </TextHeading>
        {/* pv-block-end:vqs3bs */}
        {/* pv-block-start:5b1ctl */}
        <TextParagraph data-pv-block="5b1ctl" typography="secondary">
          We've prepared a foundation for you to adapt to your design system.
        </TextParagraph>
        {/* pv-block-end:5b1ctl */}
        {/* pv-editable-zone-end:sk9i0j */}
        </div>
        {/* pv-block-end:5hdsgr */}
        {/* pv-editable-zone-end:sk5e6f */}
        </div>
        {/* pv-block-end:oryele */}
        {/* pv-block-start:25v9uy */}
        <div data-pv-block="25v9uy" className="flex flex-col gap-0.5">
          {/* pv-editable-zone-start:u936e8 */}
          {/* pv-block-start:0xc3jb */}
          <div data-pv-block="0xc3jb" className="flex flex-col gap-1">
            {/* pv-editable-zone-start:5am4ku */}
            {/* pv-block-start:87mqvj */}
            <TextHeading data-pv-block="87mqvj" typography="heading-sm">
              You can learn the basic in the training playground we've prepraed below
            </TextHeading>
            {/* pv-block-end:87mqvj */}
            {/* pv-block-start:q1985x */}
            <TextParagraph data-pv-block="q1985x" typography="regular">
              We'll cover adding elements, styling, changing variants, adding hover, etc.
            </TextParagraph>
            {/* pv-block-end:q1985x */}
            {/* pv-editable-zone-end:5am4ku */}
          </div>
          {/* pv-block-end:0xc3jb */}

          {/* pv-editable-zone-end:u936e8 */}
        </div>
        {/* pv-block-end:25v9uy */}
        {/* pv-block-start:d1xmx6 */}
        <InfoBoxBanner showCloseButton={false} color="primary" className=""
          data-pv-block="d1xmx6"
          heading="Double-click to send real clicks to the app"
          secondaryText="You don't need to enter preview mode to test out your prototype. the &quot;App&quot; tab, single click just selects elements as in normal design tool. Double-click to interact with your prototype without entering a preview mode."
        
          icon="material-symbols:mouse"
          
          >
        
        </InfoBoxBanner>
        {/* pv-block-end:d1xmx6 */}

        {/* pv-block-start:pf1hzs */}
        <div data-pv-block="pf1hzs" className="flex-col grid gap-7 grid-cols-3">
          {/* pv-editable-zone-start:ewz19j */}
          {/* pv-block-start:d36tba */}
          <Card className="gap-4 items-stretch" data-pv-block="d36tba">
            {/* pv-editable-zone-start:tg5xgy */}
              {/* pv-block-start:fc34u6 */}
              <div data-pv-block="fc34u6" className="flex gap-3 flex-col items-start">
                {/* pv-editable-zone-start:xbd2vc */}
                {/* pv-block-start:dtval8 */}
                <Icon className="text-foreground-primary" data-pv-block="dtval8" iconSymbol="material-symbols:add" size="lg" />
                {/* pv-block-end:dtval8 */}
                {/* pv-block-start:v9egsq */}
                <div data-pv-block="v9egsq" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:njwxcg */}
                  {/* pv-block-start:vu0xmj */}
                  <TextHeading data-pv-block="vu0xmj" typography="heading-sm">
                    Adding elements
                  </TextHeading>
                  {/* pv-block-end:vu0xmj */}
                  {/* pv-block-start:0zr6kw */}
                  <TextParagraph data-pv-block="0zr6kw" typography="small">
                    Click the container below. Then in the bottom floating toolbar you can click "Add inside". It's faster if you use Cmd+E shortcut. Try adding a button inside.
                  </TextParagraph>
                  {/* pv-block-end:0zr6kw */}
          
                  {/* pv-block-start:ljmhof */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="ljmhof" typography="regular">
                    Task for you: try adding a button inside below container.
                  </TextParagraph>
                  {/* pv-block-end:ljmhof */}
                  {/* pv-editable-zone-end:njwxcg */}
                </div>
                {/* pv-block-end:v9egsq */}
                {/* pv-editable-zone-end:xbd2vc */}
              </div>
              {/* pv-block-end:fc34u6 */}
          
              {/* pv-block-start:pbvk9r */}
              <Container data-pv-block="pbvk9r">
                {/* pv-editable-zone-start:p9k4tj */}
                {/* pv-editable-zone-end:p9k4tj */}
              </Container>
              {/* pv-block-end:pbvk9r */}
            {/* pv-editable-zone-end:tg5xgy */}
          </Card>
          {/* pv-block-end:d36tba */}
          {/* pv-block-start:lf7bog */}
          <Card className="gap-4 items-stretch" data-pv-block="lf7bog">
            {/* pv-editable-zone-start:fl9kxd */}
              {/* pv-block-start:6n8z5u */}
              <div data-pv-block="6n8z5u" className="flex gap-3 flex-col">
                {/* pv-editable-zone-start:vp3jem */}
                {/* pv-block-start:ei87x2 */}
                <Icon className="text-foreground-primary" data-pv-block="ei87x2" iconSymbol="material-symbols:mouse" size="lg" />
                {/* pv-block-end:ei87x2 */}
                {/* pv-block-start:7lddhq */}
                <div data-pv-block="7lddhq" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:iugucc */}
                  {/* pv-block-start:hzrzb5 */}
                  <TextHeading data-pv-block="hzrzb5" typography="heading-sm">
                    Double-click to edit popovers or dialogs
                  </TextHeading>
                  {/* pv-block-end:hzrzb5 */}
                  {/* pv-block-start:itlz1l */}
                  <TextParagraph data-pv-block="itlz1l" typography="regular">
                    You can send real clicks to the page by double-clicking any element.
                  </TextParagraph>
                  {/* pv-block-end:itlz1l */}
                  {/* pv-block-start:oubpio */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="oubpio" typography="regular">
                    Try doubleclicking the menu button below. Then the menu opens and you can edit it normally.
                  </TextParagraph>
                  {/* pv-block-end:oubpio */}
                  {/* pv-editable-zone-end:iugucc */}
                </div>
                {/* pv-block-end:7lddhq */}
                {/* pv-editable-zone-end:vp3jem */}
              </div>
              {/* pv-block-end:6n8z5u */}
          
              {/* pv-block-start:gftqjg */}
              <Container data-pv-block="gftqjg">
                {/* pv-editable-zone-start:mjedef */}
                  {/* pv-block-start:l7yacs */}
                  <DropdownButton data-pv-block="l7yacs" label="Dropdown button" variant="outline" color="neutral" rightIcon="chevron-down">
                    {/* pv-editable-zone-start:i42rae */}
                      {/* pv-block-start:d5qhtm */}
                      <DropdownItem data-pv-block="d5qhtm" label="Edit" prefixIcon="edit" />
                      {/* pv-block-end:d5qhtm */}
                      {/* pv-block-start:77yids */}
                      <DropdownItem data-pv-block="77yids" label="Duplicate" prefixIcon="Copy" />
                      {/* pv-block-end:77yids */}
                      {/* pv-block-start:asv58p */}
                      <DropdownSeparator data-pv-block="asv58p" />
                      {/* pv-block-end:asv58p */}
                      {/* pv-block-start:nro64k */}
                      <DropdownItem data-pv-block="nro64k" label="Delete" prefixIcon="trash" destructive={true} />
                      {/* pv-block-end:nro64k */}
                    {/* pv-editable-zone-end:i42rae */}
                  </DropdownButton>
                  {/* pv-block-end:l7yacs */}
                {/* pv-editable-zone-end:mjedef */}
              </Container>
              {/* pv-block-end:gftqjg */}
            {/* pv-editable-zone-end:fl9kxd */}
          </Card>
          {/* pv-block-end:lf7bog */}
          {/* pv-block-start:58e4sq */}
          <Card className="gap-4 items-stretch" data-pv-block="58e4sq">
            {/* pv-editable-zone-start:lzk3wr */}
              {/* pv-block-start:aev719 */}
              <div data-pv-block="aev719" className="flex gap-3 flex-col">
                {/* pv-editable-zone-start:btl59t */}
                {/* pv-block-start:k78o7c */}
                <Icon className="text-foreground-primary" data-pv-block="k78o7c" iconSymbol="material-symbols:add" size="lg" />
                {/* pv-block-end:k78o7c */}
                {/* pv-block-start:8m03j8 */}
                <div data-pv-block="8m03j8" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:gmjmuy */}
                  {/* pv-block-start:yin99m */}
                  <TextHeading data-pv-block="yin99m" typography="heading-sm">
                    Navigating using WASD
                  </TextHeading>
                  {/* pv-block-end:yin99m */}
                  {/* pv-block-start:c7npsa */}
                  <TextParagraph data-pv-block="c7npsa" typography="regular">
                    When working with web you often need to traverse - select parent element, select a sibling. You can do it with keyboard shortcuts using WASD keys, like playing a video game.
                  </TextParagraph>
                  {/* pv-block-end:c7npsa */}
                  {/* pv-block-start:quhudk */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="quhudk" typography="regular">
                    Try selecting the avatar below, the click "W" to select avatars container and change the gap between the avatars (in the Essentials panel on the right).
                  </TextParagraph>
                  {/* pv-block-end:quhudk */}
                  {/* pv-editable-zone-end:gmjmuy */}
                </div>
                {/* pv-block-end:8m03j8 */}
                {/* pv-editable-zone-end:btl59t */}
              </div>
              {/* pv-block-end:aev719 */}
          
              {/* pv-block-start:xdjkc1 */}
              <Container className="flex-row gap-2" data-pv-block="xdjkc1">
                {/* pv-editable-zone-start:zqe8bz */}
                  {/* pv-block-start:0gfvam */}
                  <Avatar data-pv-block="0gfvam" initials="AB" size="md" bgColor="default" imageSrc="https://i.pravatar.cc/60?3453" />
                  {/* pv-block-end:0gfvam */}
          
                  {/* pv-block-start:w9x0m7 */}
                  <Avatar data-pv-block="w9x0m7" initials="AB" size="md" bgColor="default" imageSrc="https://i.pravatar.cc/60?456456" />
                  {/* pv-block-end:w9x0m7 */}
          
                  {/* pv-block-start:6cky30 */}
                  <Avatar data-pv-block="6cky30" initials="AB" size="md" bgColor="default" imageSrc="https://i.pravatar.cc/60?4564" />
                  {/* pv-block-end:6cky30 */}
                {/* pv-editable-zone-end:zqe8bz */}
              </Container>
              {/* pv-block-end:xdjkc1 */}
            {/* pv-editable-zone-end:lzk3wr */}
          </Card>
          {/* pv-block-end:58e4sq */}
          {/* pv-editable-zone-end:ewz19j */}
        </div>
        {/* pv-block-end:pf1hzs */}
        {/* pv-block-start:9kfvew */}
        <TextHeading data-pv-block="9kfvew" typography="heading-sm">
          Editing components
        </TextHeading>
        {/* pv-block-end:9kfvew */}

        {/* pv-block-start:9s48fz */}
        <div data-pv-block="9s48fz" className="flex-col grid gap-7 grid-cols-3">
          {/* pv-editable-zone-start:o9d9z3 */}
          {/* pv-block-start:0z20q2 */}
          <Card className="gap-4 items-stretch" data-pv-block="0z20q2">
            {/* pv-editable-zone-start:3f1qsi */}
              {/* pv-block-start:ipmelx */}
              <div data-pv-block="ipmelx" className="flex gap-3 flex-col items-start">
                {/* pv-editable-zone-start:icrhhy */}
                {/* pv-block-start:2wfrkt */}
                <Icon className="text-foreground-primary" data-pv-block="2wfrkt" iconSymbol="mdi:color" size="lg" />
                {/* pv-block-end:2wfrkt */}
                {/* pv-block-start:yvndi1 */}
                <div data-pv-block="yvndi1" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:o3ztet */}
                  {/* pv-block-start:hxnr3e */}
                  <TextHeading data-pv-block="hxnr3e" typography="heading-sm">
                    Change design system colors
                  </TextHeading>
                  {/* pv-block-end:hxnr3e */}
                  {/* pv-block-start:qh174e */}
                  <TextParagraph data-pv-block="qh174e" typography="regular">
                    In the top right go the the "Tokens" tab then into "Colors". From there you can change all the color variables to match your design system.
                  </TextParagraph>
                  {/* pv-block-end:qh174e */}
                  {/* pv-block-start:yspkyp */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="yspkyp" typography="regular">
                    Go to Tokens tab and try to edit background-primary colors. You will see how buttons colors change.
                  </TextParagraph>
                  {/* pv-block-end:yspkyp */}
                  {/* pv-editable-zone-end:o3ztet */}
                </div>
                {/* pv-block-end:yvndi1 */}
                {/* pv-editable-zone-end:icrhhy */}
              </div>
              {/* pv-block-end:ipmelx */}
            {/* pv-editable-zone-end:3f1qsi */}
          </Card>
          {/* pv-block-end:0z20q2 */}
          {/* pv-block-start:fgpkp9 */}
          <Card className="gap-4 items-stretch" data-pv-block="fgpkp9">
            {/* pv-editable-zone-start:rf7cui */}
              {/* pv-block-start:smip6x */}
              <div data-pv-block="smip6x" className="flex gap-3 flex-col">
                {/* pv-editable-zone-start:ikeie1 */}
                {/* pv-block-start:1u6lvj */}
                <Icon className="text-foreground-primary" data-pv-block="1u6lvj" iconSymbol="material-symbols:edit-outline" size="lg" />
                {/* pv-block-end:1u6lvj */}
                {/* pv-block-start:kbxljz */}
                <div data-pv-block="kbxljz" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:snrj2i */}
                  {/* pv-block-start:5yvk8g */}
                  <TextHeading data-pv-block="5yvk8g" typography="heading-sm">
                    Changing texts and variants
                  </TextHeading>
                  {/* pv-block-end:5yvk8g */}
                  {/* pv-block-start:dpyqm3 */}
                  <TextParagraph data-pv-block="dpyqm3" typography="small">
                    Click the button below and look at the sidebar on the right. You will see component properties panel. You can change variants from there and change texts.
                  </TextParagraph>
                  {/* pv-block-end:dpyqm3 */}
                  {/* pv-block-start:5nhxxq */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="5nhxxq" typography="regular">
                    Try adding a button inside below container. Then undo it with Cmd+Z
                  </TextParagraph>
                  {/* pv-block-end:5nhxxq */}
                  {/* pv-editable-zone-end:snrj2i */}
                </div>
                {/* pv-block-end:kbxljz */}
                {/* pv-editable-zone-end:ikeie1 */}
              </div>
              {/* pv-block-end:smip6x */}
          
              {/* pv-block-start:arvldj */}
              <Container data-pv-block="arvldj">
                {/* pv-editable-zone-start:etpgyr */}
                  {/* pv-block-start:kjqwav */}
                  <Button leftIcon="mdi:star-outline" data-pv-block="kjqwav" label="Change me to Outline variant" variant="solid" color="primary" size="md" />
                  {/* pv-block-end:kjqwav */}
                {/* pv-editable-zone-end:etpgyr */}
              </Container>
              {/* pv-block-end:arvldj */}
            {/* pv-editable-zone-end:rf7cui */}
          </Card>
          {/* pv-block-end:fgpkp9 */}
          {/* pv-block-start:3akqpb */}
          <Card className="gap-4 items-stretch" data-pv-block="3akqpb">
            {/* pv-editable-zone-start:uvph0a */}
              {/* pv-block-start:lh1j2e */}
              <div data-pv-block="lh1j2e" className="flex gap-3 flex-col items-start">
                {/* pv-editable-zone-start:4uatac */}
                {/* pv-block-start:8qrt91 */}
                <Icon className="text-foreground-primary" data-pv-block="8qrt91" iconSymbol="tabler:components" size="lg" />
                {/* pv-block-end:8qrt91 */}
                {/* pv-block-start:99urzh */}
                <div data-pv-block="99urzh" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:mczxyw */}
                  {/* pv-block-start:pajc48 */}
                  <TextHeading data-pv-block="pajc48" typography="heading-sm">
                    Adjusting components style
                  </TextHeading>
                  {/* pv-block-end:pajc48 */}
                  {/* pv-block-start:9zziqs */}
                  <TextParagraph data-pv-block="9zziqs" typography="small">
                    Click the button below. Look on the right sidebar - you will see a "Source files" section with 2 cards. Click a "Component" card. You will jump to straight to list of all variants of this component. <br />
                  </TextParagraph>
                  {/* pv-block-end:9zziqs */}
                  {/* pv-block-start:yhjj76 */}
                  <TextParagraph className="text-foreground-primary" data-pv-block="yhjj76" typography="regular">
                    Try changing horizontal padding for all the buttons in the design system
                  </TextParagraph>
                  {/* pv-block-end:yhjj76 */}
                  {/* pv-editable-zone-end:mczxyw */}
                </div>
                {/* pv-block-end:99urzh */}
                {/* pv-editable-zone-end:4uatac */}
              </div>
              {/* pv-block-end:lh1j2e */}
          
              {/* pv-block-start:boo3oh */}
              <Container data-pv-block="boo3oh">
                {/* pv-editable-zone-start:jyzz7z */}
                  {/* pv-block-start:ftnyv4 */}
                  <Button leftIcon="mdi:arrow-right" data-pv-block="ftnyv4" label="Select me to see that I'm a component" variant="outline" color="primary" size="md" />
                  {/* pv-block-end:ftnyv4 */}
                {/* pv-editable-zone-end:jyzz7z */}
              </Container>
              {/* pv-block-end:boo3oh */}
            {/* pv-editable-zone-end:uvph0a */}
          </Card>
          {/* pv-block-end:3akqpb */}
          {/* pv-editable-zone-end:o9d9z3 */}
        </div>
        {/* pv-block-end:9s48fz */}

        {/* pv-block-start:scza8i */}
        <InfoBoxBanner showCloseButton={false} color="primary" className=""
          data-pv-block="scza8i"
          heading="How to style variants?"
          secondaryText=" Learn to use &quot;Which state to style?&quot;. If you leave this field empty, you will style all variants of the component. If you just want to change the padding for a small button, you will need to select first that you want to style button small."
        
          icon="material-symbols:mouse"
          
          >
        
        </InfoBoxBanner>
        {/* pv-block-end:scza8i */}

        {/* pv-block-start:dkwss2 */}
        <div data-testid="e2e-pv-block" className="flex flex-col min-h-4 border rounded bg-background-elevated border-border-default p-5" data-pv-block="dkwss2">
          {/* pv-editable-zone-start:inside-dkwss2 */}
            {/* pv-block-start:rkj7hq */}
            <span className="" data-pv-block="rkj7hq">
              Container for testing adding and styling elements
            </span>
            {/* pv-block-end:rkj7hq */}
          {/* pv-editable-zone-end:inside-dkwss2 */}
        </div>
        {/* pv-block-end:dkwss2 */}
      {/* pv-editable-zone-end:d8z9a1 */}
    </div>
  );
}
