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
        <div data-pv-block="oryele" className="flex items-center justify-between mt-8 mb-2">
        {/* pv-editable-zone-start:sk5e6f */}
        {/* pv-block-start:5hdsgr */}
        <div data-pv-block="5hdsgr" className="flex flex-col gap-0">
        {/* pv-editable-zone-start:sk9i0j */}
        {/* pv-block-start:vqs3bs */}
        <TextHeading data-pv-block="vqs3bs" typography="heading-xxl">
          Welcome to Protovibe example project!
        </TextHeading>
        {/* pv-block-end:vqs3bs */}
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
          <div data-pv-block="0xc3jb" className="flex flex-col gap-0.5 border-border-default rounded">
            {/* pv-editable-zone-start:5am4ku */}
            {/* pv-block-start:87mqvj */}
            <TextHeading data-pv-block="87mqvj" typography="heading-md">
              Learn the basics
            </TextHeading>
            {/* pv-block-end:87mqvj */}
            {/* pv-block-start:q1985x */}
            <TextParagraph className="max-w-[70ch]" data-pv-block="q1985x" typography="secondary">
              This project is an example prototype for you to start with. Below we've listed less obvious things to know about Protovibe in a form of a training playground.
            </TextParagraph>
            {/* pv-block-end:q1985x */}
            {/* pv-editable-zone-end:5am4ku */}
          </div>
          {/* pv-block-end:0xc3jb */}
          {/* pv-editable-zone-end:u936e8 */}
        </div>
        {/* pv-block-end:25v9uy */}

        {/* pv-block-start:pf1hzs */}
        <div data-pv-block="pf1hzs" className="flex-col grid gap-7 grid-cols-3 mb-7">
          {/* pv-editable-zone-start:ewz19j */}
          {/* pv-block-start:58e4sq */}
          <Card className="gap-4 items-stretch" data-pv-block="58e4sq">
            {/* pv-editable-zone-start:lzk3wr */}
              {/* pv-block-start:aev719 */}
              <div data-pv-block="aev719" className="flex gap-3 flex-col grow">
                {/* pv-editable-zone-start:btl59t */}
                {/* pv-block-start:k78o7c */}
                <Icon className="text-foreground-primary" data-pv-block="k78o7c" iconSymbol="material-symbols:keyboard-outline" size="lg" />
                {/* pv-block-end:k78o7c */}
                {/* pv-block-start:8m03j8 */}
                <div data-pv-block="8m03j8" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:gmjmuy */}
                  {/* pv-block-start:yin99m */}
                  <TextHeading data-pv-block="yin99m" typography="heading-sm">
                    Navigating selection using WASD
                  </TextHeading>
                  {/* pv-block-end:yin99m */}
                  {/* pv-block-start:c7npsa */}
                  <TextParagraph data-pv-block="c7npsa" typography="small">
                    When working with web you often need to traverse - select parent element, select a sibling. You can do it with keyboard shortcuts using WASD keys, like playing a video game.
                  </TextParagraph>
                  {/* pv-block-end:c7npsa */}
                  {/* pv-block-start:quhudk */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="quhudk" typography="regular">
                    Try selecting the avatar below, the click "W" to select avatars container.
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
                  <Avatar data-pv-block="0gfvam" initials="AB" size="sm" bgColor="default" imageSrc="https://i.pravatar.cc/60?3453" />
                  {/* pv-block-end:0gfvam */}
          
                  {/* pv-block-start:w9x0m7 */}
                  <Avatar data-pv-block="w9x0m7" initials="AB" size="sm" bgColor="default" imageSrc="https://i.pravatar.cc/60?456456" />
                  {/* pv-block-end:w9x0m7 */}
          
                  {/* pv-block-start:6cky30 */}
                  <Avatar data-pv-block="6cky30" initials="AB" size="sm" bgColor="default" imageSrc="https://i.pravatar.cc/60?4564" />
                  {/* pv-block-end:6cky30 */}
                {/* pv-editable-zone-end:zqe8bz */}
              </Container>
              {/* pv-block-end:xdjkc1 */}
            {/* pv-editable-zone-end:lzk3wr */}
          </Card>
          {/* pv-block-end:58e4sq */}
          {/* pv-block-start:lf7bog */}
          <Card className="gap-4 items-stretch" data-pv-block="lf7bog">
            {/* pv-editable-zone-start:fl9kxd */}
              {/* pv-block-start:6n8z5u */}
              <div data-pv-block="6n8z5u" className="flex gap-3 flex-col grow">
                {/* pv-editable-zone-start:vp3jem */}
                {/* pv-block-start:ei87x2 */}
                <Icon className="text-foreground-primary" data-pv-block="ei87x2" iconSymbol="material-symbols:mouse-outline" size="lg" />
                {/* pv-block-end:ei87x2 */}
                {/* pv-block-start:7lddhq */}
                <div data-pv-block="7lddhq" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:iugucc */}
                  {/* pv-block-start:hzrzb5 */}
                  <TextHeading data-pv-block="hzrzb5" typography="heading-sm">
                    Double-click to edit popovers or dialogs
                  </TextHeading>
                  {/* pv-block-end:hzrzb5 */}
                  {/* pv-block-start:itlz1l */}
                  <TextParagraph data-pv-block="itlz1l" typography="small">
                    You can send real clicks to the page by double-clicking any element.
                  </TextParagraph>
                  {/* pv-block-end:itlz1l */}
                  {/* pv-block-start:oubpio */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="oubpio" typography="regular">
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
          {/* pv-block-start:d36tba */}
          <Card className="gap-4 items-stretch" data-pv-block="d36tba">
            {/* pv-editable-zone-start:tg5xgy */}
              {/* pv-block-start:fc34u6 */}
              <div data-pv-block="fc34u6" className="flex gap-3 flex-col items-start grow">
                {/* pv-editable-zone-start:xbd2vc */}
                {/* pv-block-start:dtval8 */}
                <Icon className="text-foreground-primary" data-pv-block="dtval8" iconSymbol="material-symbols:add" size="lg" />
                {/* pv-block-end:dtval8 */}
                {/* pv-block-start:v9egsq */}
                <div data-pv-block="v9egsq" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:njwxcg */}
                  {/* pv-block-start:vu0xmj */}
                  <TextHeading data-pv-block="vu0xmj" typography="heading-sm">
                    Adding elements manually
                  </TextHeading>
                  {/* pv-block-end:vu0xmj */}
                  {/* pv-block-start:0zr6kw */}
                  <TextParagraph data-pv-block="0zr6kw" typography="small">
                    Click the container below. Then in the bottom floating toolbar you can click "Add inside". It's faster if you use Cmd+E shortcut. Try adding a button inside.
                  </TextParagraph>
                  {/* pv-block-end:0zr6kw */}
          
                  {/* pv-block-start:ljmhof */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="ljmhof" typography="regular">
                    Try adding a button inside below container.
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
          {/* pv-editable-zone-end:ewz19j */}
        </div>
        {/* pv-block-end:pf1hzs */}
        {/* pv-block-start:oqzvp4 */}
        <div data-pv-block="oqzvp4" className="flex flex-col gap-0.5">
          {/* pv-editable-zone-start:wwz4k4 */}
          {/* pv-block-start:rw7bvm */}
          <TextHeading data-pv-block="rw7bvm" typography="heading-md">
            Adjust the app to your design system
          </TextHeading>
          {/* pv-block-end:rw7bvm */}
          {/* pv-block-start:3a7up9 */}
          <TextParagraph data-pv-block="3a7up9" typography="secondary">
            3 essential things to learn to make this app look like your brand.
          </TextParagraph>
          {/* pv-block-end:3a7up9 */}
          {/* pv-editable-zone-end:wwz4k4 */}
        </div>
        {/* pv-block-end:oqzvp4 */}

        {/* pv-block-start:9s48fz */}
        <div data-pv-block="9s48fz" className="flex-col grid gap-7 grid-cols-3">
          {/* pv-editable-zone-start:o9d9z3 */}
          {/* pv-block-start:0z20q2 */}
          <Card className="gap-4 items-stretch" data-pv-block="0z20q2">
            {/* pv-editable-zone-start:3f1qsi */}
              {/* pv-block-start:ipmelx */}
              <div data-pv-block="ipmelx" className="flex gap-3 flex-col items-start grow">
                {/* pv-editable-zone-start:icrhhy */}
                {/* pv-block-start:2wfrkt */}
                <Icon className="text-foreground-primary" data-pv-block="2wfrkt" iconSymbol="mdi:paint-outline" size="lg" />
                {/* pv-block-end:2wfrkt */}
                {/* pv-block-start:yvndi1 */}
                <div data-pv-block="yvndi1" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:o3ztet */}
                  {/* pv-block-start:hxnr3e */}
                  <TextHeading data-pv-block="hxnr3e" typography="heading-sm">
                    Change design system tokens
                  </TextHeading>
                  {/* pv-block-end:hxnr3e */}
                  {/* pv-block-start:qh174e */}
                  <TextParagraph data-pv-block="qh174e" typography="small">
                    In the top right go the the "Tokens" tab then into "Colors". From there you can change all the color variables to match your design system.
                  </TextParagraph>
                  {/* pv-block-end:qh174e */}
                  {/* pv-block-start:yspkyp */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="yspkyp" typography="regular">
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

          {/* pv-block-start:6z3l9y */}
          <Card className="gap-4 items-stretch" data-pv-block="6z3l9y">
            {/* pv-editable-zone-start:lz0sp5 */}
              {/* pv-block-start:6qtzsl */}
              <div data-pv-block="6qtzsl" className="flex gap-3 flex-col grow">
                {/* pv-editable-zone-start:t3tr42 */}
                {/* pv-block-start:9b1q0r */}
                <Icon className="text-foreground-primary" data-pv-block="9b1q0r" iconSymbol="material-symbols:edit-outline" size="lg" />
                {/* pv-block-end:9b1q0r */}
                {/* pv-block-start:ssde0q */}
                <div data-pv-block="ssde0q" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:yv61fy */}
                  {/* pv-block-start:e6jbuk */}
                  <TextHeading data-pv-block="e6jbuk" typography="heading-sm">
                    Changing texts and variants
                  </TextHeading>
                  {/* pv-block-end:e6jbuk */}
                  {/* pv-block-start:ilrduc */}
                  <TextParagraph data-pv-block="ilrduc" typography="small">
                    Click the button below and look at the sidebar on the right. You will see component properties panel. You can change variants from there and change texts.
                  </TextParagraph>
                  {/* pv-block-end:ilrduc */}
                  {/* pv-block-start:h4rc95 */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="h4rc95" typography="regular">
                    Try changing this button to outline variant
                  </TextParagraph>
                  {/* pv-block-end:h4rc95 */}
                  {/* pv-editable-zone-end:yv61fy */}
                </div>
                {/* pv-block-end:ssde0q */}
                {/* pv-editable-zone-end:t3tr42 */}
              </div>
              {/* pv-block-end:6qtzsl */}
          
              {/* pv-block-start:lzyvbi */}
              <Container data-pv-block="lzyvbi">
                {/* pv-editable-zone-start:9slk3n */}
                  {/* pv-block-start:74gnna */}
                  <Button leftIcon="mdi:star-outline" data-pv-block="74gnna" label="Change me to Outline variant" variant="solid" color="primary" size="md" />
                  {/* pv-block-end:74gnna */}
                {/* pv-editable-zone-end:9slk3n */}
              </Container>
              {/* pv-block-end:lzyvbi */}
            {/* pv-editable-zone-end:lz0sp5 */}
          </Card>
          {/* pv-block-end:6z3l9y */}
          {/* pv-block-start:fgpkp9 */}
          <Card className="gap-4 items-stretch" data-pv-block="fgpkp9">
            {/* pv-editable-zone-start:rf7cui */}
              {/* pv-block-start:smip6x */}
              <div data-pv-block="smip6x" className="flex gap-3 flex-col grow">
                {/* pv-editable-zone-start:ikeie1 */}
                {/* pv-block-start:1u6lvj */}
                <Icon className="text-foreground-primary" data-pv-block="1u6lvj" iconSymbol="boxicons:component" size="lg" />
                {/* pv-block-end:1u6lvj */}
                {/* pv-block-start:kbxljz */}
                <div data-pv-block="kbxljz" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:snrj2i */}
                  {/* pv-block-start:5yvk8g */}
                  <TextHeading data-pv-block="5yvk8g" typography="heading-sm">
                    Components tab
                  </TextHeading>
                  {/* pv-block-end:5yvk8g */}
                  {/* pv-block-start:dpyqm3 */}
                  <TextParagraph data-pv-block="dpyqm3" typography="small">
                    We've build a starting point for you with all the buttons, form controls. tabs etc. See what's there in the Components tab.
                  </TextParagraph>
                  {/* pv-block-end:dpyqm3 */}
                  {/* pv-block-start:5nhxxq */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="5nhxxq" typography="regular">
                    Go to the "Components" tab and see which components are available out-of-the-box.
                  </TextParagraph>
                  {/* pv-block-end:5nhxxq */}
                  {/* pv-editable-zone-end:snrj2i */}
                </div>
                {/* pv-block-end:kbxljz */}
                {/* pv-editable-zone-end:ikeie1 */}
              </div>
              {/* pv-block-end:smip6x */}
            {/* pv-editable-zone-end:rf7cui */}
          </Card>
          {/* pv-block-end:fgpkp9 */}
          {/* pv-block-start:3akqpb */}
          <Card className="gap-4 items-stretch" data-pv-block="3akqpb">
            {/* pv-editable-zone-start:uvph0a */}
              {/* pv-block-start:lh1j2e */}
              <div data-pv-block="lh1j2e" className="flex gap-3 flex-col items-start grow">
                {/* pv-editable-zone-start:4uatac */}
                {/* pv-block-start:8qrt91 */}
                <Icon className="text-foreground-primary" data-pv-block="8qrt91" iconSymbol="radix-icons:row-spacing" size="lg" />
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
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="yhjj76" typography="regular">
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
                  <Button leftIcon="mdi:arrow-right" data-pv-block="ftnyv4" label="I'm a component!" variant="outline" color="primary" size="md" />
                  {/* pv-block-end:ftnyv4 */}
                {/* pv-editable-zone-end:jyzz7z */}
              </Container>
              {/* pv-block-end:boo3oh */}
            {/* pv-editable-zone-end:uvph0a */}
          </Card>
          {/* pv-block-end:3akqpb */}

          {/* pv-block-start:5lsqo2 */}
          <Card className="gap-4 items-stretch" data-pv-block="5lsqo2">
            {/* pv-editable-zone-start:q9gan4 */}
              {/* pv-block-start:fmtq4x */}
              <div data-pv-block="fmtq4x" className="flex gap-3 flex-col items-start grow">
                {/* pv-editable-zone-start:z1u6kv */}
                {/* pv-block-start:ao8nno */}
                <Icon className="text-foreground-primary" data-pv-block="ao8nno" iconSymbol="fluent:cursor-hover-16-regular" size="lg" />
                {/* pv-block-end:ao8nno */}
                {/* pv-block-start:r7xusa */}
                <div data-pv-block="r7xusa" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:q5zrj7 */}
                  {/* pv-block-start:vug02k */}
                  <TextHeading data-pv-block="vug02k" typography="heading-sm">
                    Adjusting one variant only
                  </TextHeading>
                  {/* pv-block-end:vug02k */}
                  {/* pv-block-start:1bnop2 */}
                  <TextParagraph data-pv-block="1bnop2" typography="small">
                    You need to use "Which state to style?". If you leave this field empty, you will style all variants of the component. If you just want to change the padding for a medium button, you will need to select first that you want to style "size: md".
                  </TextParagraph>
                  {/* pv-block-end:1bnop2 */}
                  {/* pv-block-start:elfure */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="elfure" typography="regular">
                    Go to components tab and try changing horizontal padding only for small buttons.
                  </TextParagraph>
                  {/* pv-block-end:elfure */}
                  {/* pv-editable-zone-end:q5zrj7 */}
                </div>
                {/* pv-block-end:r7xusa */}
                {/* pv-editable-zone-end:z1u6kv */}
              </div>
              {/* pv-block-end:fmtq4x */}
            {/* pv-editable-zone-end:q9gan4 */}
          </Card>
          {/* pv-block-end:5lsqo2 */}

          {/* pv-block-start:x7pxjy */}
          <Card className="gap-4 items-stretch" data-pv-block="x7pxjy">
            {/* pv-editable-zone-start:4z9lwp */}
              {/* pv-block-start:p4z3qw */}
              <div data-pv-block="p4z3qw" className="flex gap-3 flex-col items-start grow">
                {/* pv-editable-zone-start:f0hunx */}
                {/* pv-block-start:prw5ws */}
                <Icon className="text-foreground-primary" data-pv-block="prw5ws" iconSymbol="material-symbols:help-outline" size="lg" />
                {/* pv-block-end:prw5ws */}
                {/* pv-block-start:azunvx */}
                <div data-pv-block="azunvx" className="flex flex-col gap-1">
                  {/* pv-editable-zone-start:hfwk2f */}
                  {/* pv-block-start:0p0lkd */}
                  <TextHeading data-pv-block="0p0lkd" typography="heading-sm">
                    Ask your coding agent if in doubt
                  </TextHeading>
                  {/* pv-block-end:0p0lkd */}
                  {/* pv-block-start:88ajzk */}
                  <TextParagraph data-pv-block="88ajzk" typography="small">
                    If something is hard to do, just ask your coding agent. You don't need to manually edit your app, you can just edit padding after your coding agent if you want.
                  </TextParagraph>
                  {/* pv-block-end:88ajzk */}
                  {/* pv-block-start:99amab */}
                  <TextParagraph className="text-foreground-primary text-sm" data-pv-block="99amab" typography="regular">
                    You can read full docs on <br />protovibe-studio.github.io/docs
                  </TextParagraph>
                  {/* pv-block-end:99amab */}
                  {/* pv-editable-zone-end:hfwk2f */}
                </div>
                {/* pv-block-end:azunvx */}
                {/* pv-editable-zone-end:f0hunx */}
              </div>
              {/* pv-block-end:p4z3qw */}
            {/* pv-editable-zone-end:4z9lwp */}
          </Card>
          {/* pv-block-end:x7pxjy */}
          {/* pv-editable-zone-end:o9d9z3 */}
        </div>
        {/* pv-block-end:9s48fz */}
        {/* pv-block-start:820zdm */}
        <InfoBoxBanner showCloseButton={false} data-pv-block="820zdm" icon="tabler:bulb" heading="Delete this playground once you read it!" secondaryText="Just select a parent wrapper and click &quot;Delete&quot; on your keyboard" color="primary" >
          {/* pv-editable-zone-start:ololmi */}
          {/* pv-editable-zone-end:ololmi */}
        </InfoBoxBanner>
        {/* pv-block-end:820zdm */}

        {/* pv-block-start:dkwss2 */}
        <div data-testid="e2e-pv-block" className="flex flex-col min-h-4 border rounded bg-background-elevated border-border-default p-5" data-pv-block="dkwss2">
          {/* pv-editable-zone-start:inside-dkwss2 */}
            {/* pv-block-start:rkj7hq */}
            <span className="text-foreground-tertiary text-base" data-pv-block="rkj7hq">
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
