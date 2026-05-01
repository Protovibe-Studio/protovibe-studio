import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { FeatureCard } from '@/components/ui/feature-card'
import { TextParagraph } from '@/components/ui/text-paragraph'

const GLOBAL_STYLES = `
  @keyframes pulse-custom {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.55; transform: scale(0.82); }
  }

  @keyframes glow-breathe {
    0%, 100% { opacity: 0.78; transform: scale(1); }
    50% { opacity: 0.88; transform: scale(1.04); }
  }

  @keyframes hero-rise {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.pv-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.remove('opacity-0', 'translate-y-4');
          e.target.classList.add('opacity-100', 'translate-y-0');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// --- Main Page Components ---

function ProtovibeMockup() {
  return (
    <>
      {/* pv-block-start:b00001 */}
      <div data-pv-block="b00001" className="relative z-10 w-full bg-background-secondary overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_40px_80px_-30px_rgba(0,0,0,.7),0_20px_40px_-15px_rgba(0,0,0,.6)] flex items-center justify-center text-foreground-tertiary font-semibold text-sm bg-contain bg-center bg-no-repeat rounded-lg opacity-90 border-border-default border-0 bg-[url('/src/images/from-protovibe/screenshot-2026-05-01-at-191643.png')] aspect-[664/401]" role="img" aria-label="Protovibe app preview">
        <br />
      </div>
      {/* pv-block-end:b00001 */}
    </>
  );
}

const CARD_STEP = 260; // card width (240) + gap (20)

function FeaturesList(props: any) {
  return (
      <section {...props} data-pv-component-id="FeaturesList" className="py-[120px] relative" id="features">
        {/* pv-editable-zone-start:z00001 */}
          {/* pv-block-start:r35ceo */}
          <div data-pv-block="r35ceo" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00002 */}
              {/* pv-block-start:ugssgg */}
              <div data-pv-block="ugssgg" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">Features</div>
              {/* pv-block-end:ugssgg */}
              {/* pv-block-start:wecohl */}
              <h2 data-pv-block="wecohl" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                It has everything you need to get shit done
              </h2>
              {/* pv-block-end:wecohl */}
            {/* pv-editable-zone-end:z00002 */}
          </div>
          {/* pv-block-end:r35ceo */}
          {/* pv-block-start:b00006 */}
          <div data-pv-block="b00006" className="grid grid-cols-1 md:grid-cols-3 gap-x-[20px] gap-y-[12px] md:gap-x-[40px] md:gap-y-[28px] mx-auto justify-items-start max-w-[700px]">
            {/* pv-editable-zone-start:z00003 */}
              {/* pv-block-start:f00101 */}
              <div data-pv-block="f00101" className="flex gap-[14px] items-start">
                <Icon iconSymbol="undo" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Undo &amp; redo</span>
              </div>
              {/* pv-block-end:f00101 */}

              {/* pv-block-start:f00103 */}
              <div data-pv-block="f00103" className="flex gap-[14px] items-start">
                <Icon iconSymbol="select-multiple" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Multi-select</span>
              </div>
              {/* pv-block-end:f00103 */}

              {/* pv-block-start:f00104 */}
              <div data-pv-block="f00104" className="flex gap-[14px] items-start">
                <Icon iconSymbol="cube-outline" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Components</span>
              </div>
              {/* pv-block-end:f00104 */}

              {/* pv-block-start:f00102 */}
              <div data-pv-block="f00102" className="flex gap-[14px] items-start">
                <Icon iconSymbol="image-plus" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Paste image</span>
              </div>
              {/* pv-block-end:f00102 */}

              {/* pv-block-start:f00105 */}
              <div data-pv-block="f00105" className="flex gap-[14px] items-start">
                <Icon iconSymbol="palette" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Color tokens</span>
              </div>
              {/* pv-block-end:f00105 */}

              {/* pv-block-start:f00106 */}
              <div data-pv-block="f00106" className="flex gap-[14px] items-start">
                <Icon iconSymbol="format-text" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Typography</span>
              </div>
              {/* pv-block-end:f00106 */}

              {/* pv-block-start:f00107 */}
              <div data-pv-block="f00107" className="flex gap-[14px] items-start">
                <Icon iconSymbol="layers" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Infinite canvas
                </span>
              </div>
              {/* pv-block-end:f00107 */}

              {/* pv-block-start:f00109 */}
              <div data-pv-block="f00109" className="flex gap-[14px] items-start">
                <Icon iconSymbol="magnet" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Smart snapping</span>
              </div>
              {/* pv-block-end:f00109 */}

              {/* pv-block-start:f00110 */}
              <div data-pv-block="f00110" className="flex gap-[14px] items-start">
                <Icon iconSymbol="responsive" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Responsive design</span>
              </div>
              {/* pv-block-end:f00110 */}

              {/* pv-block-start:f00111 */}
              <div data-pv-block="f00111" className="flex gap-[14px] items-start">
                <Icon iconSymbol="cursor-move" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Drag &amp; drop</span>
              </div>
              {/* pv-block-end:f00111 */}

              {/* pv-block-start:f00112 */}
              <div data-pv-block="f00112" className="flex gap-[14px] items-start">
                <Icon iconSymbol="keyboard" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Keyboard shortcuts</span>
              </div>
              {/* pv-block-end:f00112 */}

              {/* pv-block-start:f00114 */}
              <div data-pv-block="f00114" className="flex gap-[14px] items-start">
                <Icon iconSymbol="content-save" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Auto-save</span>
              </div>
              {/* pv-block-end:f00114 */}

              {/* pv-block-start:f00115 */}
              <div data-pv-block="f00115" className="flex gap-[14px] items-start">
                <Icon iconSymbol="code-tags" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Code export</span>
              </div>
              {/* pv-block-end:f00115 */}

              {/* pv-block-start:f00116 */}
              <div data-pv-block="f00116" className="flex gap-[14px] items-start">
                <Icon iconSymbol="source-branch" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Git integration</span>
              </div>
              {/* pv-block-end:f00116 */}

              {/* pv-block-start:f00118 */}
              <div data-pv-block="f00118" className="flex gap-[14px] items-start">
                <Icon iconSymbol="emoticon" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Icon libraries
                </span>
              </div>
              {/* pv-block-end:f00118 */}

              {/* pv-block-start:f00119 */}
              <div data-pv-block="f00119" className="flex gap-[14px] items-start">
                <Icon iconSymbol="format-font" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Custom fonts</span>
              </div>
              {/* pv-block-end:f00119 */}

              {/* pv-block-start:f00120 */}
              <div data-pv-block="f00120" className="flex gap-[14px] items-start">
                <Icon iconSymbol="weather-night" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Dark mode</span>
              </div>
              {/* pv-block-end:f00120 */}

              {/* pv-block-start:f00121 */}
              <div data-pv-block="f00121" className="flex gap-[14px] items-start">
                <Icon iconSymbol="mdi:file-image" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Compress images
                </span>
              </div>
              {/* pv-block-end:f00121 */}

              {/* pv-block-start:f00122 */}
              <div data-pv-block="f00122" className="flex gap-[14px] items-start">
                <Icon iconSymbol="view-grid-plus" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Layout
                </span>
              </div>
              {/* pv-block-end:f00122 */}

              {/* pv-block-start:f00124 */}
              <div data-pv-block="f00124" className="flex gap-[14px] items-start">
                <Icon iconSymbol="content-copy" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">Copy &amp; paste</span>
              </div>
              {/* pv-block-end:f00124 */}

              {/* pv-block-start:o35kal */}
              <div data-pv-block="o35kal" className="flex gap-[14px] items-start">
                <Icon iconSymbol="material-symbols:share" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  One-click publishing
                </span>
              </div>
              {/* pv-block-end:o35kal */}

              {/* pv-block-start:19ycov */}
              <div data-pv-block="19ycov" className="flex gap-[14px] items-start">
                <Icon iconSymbol="material-symbols:tooltip-outline" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Tooltips
                </span>
              </div>
              {/* pv-block-end:19ycov */}

              {/* pv-block-start:1cbu9t */}
              <div data-pv-block="1cbu9t" className="flex gap-[14px] items-start">
                <Icon iconSymbol="streamline-sharp:hierarchy-16" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  DOM Traversing
                </span>
              </div>
              {/* pv-block-end:1cbu9t */}

              {/* pv-block-start:l8l4fc */}
              <div data-pv-block="l8l4fc" className="flex gap-[14px] items-start">
                <Icon iconSymbol="mdi:zip-box" size="md" className="text-foreground-primary shrink-0 mt-[2px]" />
                <span className="text-foreground-strong font-medium">
                  Export/import ZIP
                </span>
              </div>
              {/* pv-block-end:l8l4fc */}
            {/* pv-editable-zone-end:z00003 */}
          </div>
          {/* pv-block-end:b00006 */}
        {/* pv-editable-zone-end:z00001 */}
      </section>
  );
}

function FeatureGrid(props: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    let target: number;
    if (dir === 'right') {
      // left edge of the first card cropped on the right
      target = Math.floor((el.scrollLeft + el.clientWidth) / CARD_STEP) * CARD_STEP;
    } else {
      // symmetric: go back one viewport snapped to card boundary
      target = Math.max(0, Math.ceil((el.scrollLeft - el.clientWidth) / CARD_STEP) * CARD_STEP);
    }
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
      <section {...props} data-pv-component-id="FeatureGrid" className="py-[120px] relative" id="prototyping">
        {/* pv-editable-zone-start:z00001 */}
          {/* pv-block-start:d0wkgq */}
          <div data-pv-block="d0wkgq" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00002 */}
              {/* pv-block-start:y5wszz */}
              <div data-pv-block="y5wszz" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">
                Prototyping Use cases
              </div>
              {/* pv-block-end:y5wszz */}
              {/* pv-block-start:lx146v */}
              <h2 data-pv-block="lx146v" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Finally you can make your designs fully interactive
              </h2>
              {/* pv-block-end:lx146v */}
              {/* pv-block-start:4p57lr */}
              <p data-pv-block="4p57lr" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty mt-7 mb-0_0_24px mx-0_0_24px">
                Here are some examples what interactions you can do in Protovibe, that other tools can't.
              </p>
              {/* pv-block-end:4p57lr */}
            {/* pv-editable-zone-end:z00002 */}
          </div>
          {/* pv-block-end:d0wkgq */}
          
          {/* pv-block-start:jei6lm */}
          <div data-pv-block="jei6lm" className="relative">
            {canLeft && (
              <button onClick={() => scroll('left')} className="absolute top-1/2 -translate-y-1/2 left-2 md:left-0 md:-translate-x-1/2 z-10 w-9 h-9 rounded-full bg-background-primary border-border-default flex items-center justify-center hover:text-foreground-default transition-all duration-150 shadow-sm hover:bg-background-primary-hover border-0">
                <Icon iconSymbol="chevron-left" size="sm" />
              </button>
            )}
            {canRight && (
              <button onClick={() => scroll('right')} className="absolute top-1/2 -translate-y-1/2 right-2 md:right-0 md:translate-x-1/2 z-10 w-9 h-9 rounded-full bg-background-primary border-border-default flex items-center justify-center hover:text-foreground-default transition-all duration-150 shadow-sm hover:bg-background-primary-hover border-0">
                <Icon iconSymbol="chevron-right" size="sm" />
              </button>
            )}
            {canLeft && (
              <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 bottom-0 w-[80px] z-[5] bg-gradient-to-r from-background-default to-transparent" />
            )}
            {canRight && (
              <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 bottom-0 w-[80px] z-[5] bg-gradient-to-l from-background-default to-transparent" />
            )}
            <div ref={scrollRef} className="flex flex-row gap-[20px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* pv-editable-zone-start:z00003 */}
              {/* pv-block-start:wpvsjh */}
              <FeatureCard data-pv-block="wpvsjh" icon="mdi:form-textbox" heading="Realistic text fields" description="Users can enter real data which makes the usability research less biased." />
              {/* pv-block-end:wpvsjh */}

              {/* pv-block-start:zm2ske */}
              <FeatureCard data-pv-block="zm2ske" icon="mdi:plus-minus-variant" heading="Adding &amp; deleting items" description="Create real data operations, simulate real database." />
              {/* pv-block-end:zm2ske */}

              {/* pv-block-start:kn9xv1 */}
              <FeatureCard data-pv-block="kn9xv1" icon="mdi:magnify" heading="Search" description="Search inputs that actually work and filter data" />
              {/* pv-block-end:kn9xv1 */}

              {/* pv-block-start:z8nzq7 */}
              <FeatureCard data-pv-block="z8nzq7" icon="mdi:animation-play" heading="Animations &amp; microinteractions" description="Unlimited animations with native code and CSS transitions with live preview." />
              {/* pv-block-end:z8nzq7 */}

              {/* pv-block-start:uqzy7w */}
              <FeatureCard data-pv-block="uqzy7w" icon="mdi:view-carousel" heading="Carousels and sliders" description="Like this one, with snapping cards" />
              {/* pv-block-end:uqzy7w */}

              {/* pv-block-start:lrsy8y */}
              <FeatureCard data-pv-block="lrsy8y" icon="mdi:code-braces" heading="If else conditions" description="Show a section of a form if user selects a combination of 2 different values in other fields" />
              {/* pv-block-end:lrsy8y */}

              {/* pv-block-start:ebd65d */}
              <div data-pv-block="ebd65d" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:54zvu8 */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="54zvu8" iconSymbol="mdi:pin-outline" size="lg" />
                  {/* pv-block-end:54zvu8 */}
                  {/* pv-block-start:f6k4cv */}
                  <div data-pv-block="f6k4cv" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:u8n1ql */}
                    {/* pv-block-start:txt6ze */}
                    <h3 data-pv-block="txt6ze" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Sticky headers
                    </h3>
                    {/* pv-block-end:txt6ze */}
                    {/* pv-block-start:qisdp8 */}
                    <p data-pv-block="qisdp8" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Complex inner scrolls with sticky headers
                    </p>
                    {/* pv-block-end:qisdp8 */}
                    {/* pv-editable-zone-end:u8n1ql */}
                  </div>
                  {/* pv-block-end:f6k4cv */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:ebd65d */}

              {/* pv-block-start:w9xvbr */}
              <div data-pv-block="w9xvbr" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:f9cnb1 */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="f9cnb1" iconSymbol="mdi:source-branch" size="lg" />
                  {/* pv-block-end:f9cnb1 */}
                  {/* pv-block-start:d2p7xm */}
                  <div data-pv-block="d2p7xm" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:r5y3tz */}
                    {/* pv-block-start:5bbczi */}
                    <h3 data-pv-block="5bbczi" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Branching wizards
                    </h3>
                    {/* pv-block-end:5bbczi */}
                    {/* pv-block-start:dca525 */}
                    <p data-pv-block="dca525" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Multi-step flows with steps depending on previous user input
                    </p>
                    {/* pv-block-end:dca525 */}
                    {/* pv-editable-zone-end:r5y3tz */}
                  </div>
                  {/* pv-block-end:d2p7xm */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:w9xvbr */}

              {/* pv-block-start:pg9rpm */}
              <div data-pv-block="pg9rpm" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:3f6b9e */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="3f6b9e" iconSymbol="mdi:tooltip-edit" size="lg" />
                  {/* pv-block-end:3f6b9e */}
                  {/* pv-block-start:e9t5bq */}
                  <div data-pv-block="e9t5bq" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:g4v8cj */}
                    {/* pv-block-start:7shgpq */}
                    <h3 data-pv-block="7shgpq" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Hover popovers &amp; tooltips
                    </h3>
                    {/* pv-block-end:7shgpq */}
                    {/* pv-block-start:cqb60m */}
                    <p data-pv-block="cqb60m" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Craft perfect delays for opening and closing hover interactions
                    </p>
                    {/* pv-block-end:cqb60m */}
                    {/* pv-editable-zone-end:g4v8cj */}
                  </div>
                  {/* pv-block-end:e9t5bq */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:pg9rpm */}

              {/* pv-block-start:h4lqx8 */}
              <div data-pv-block="h4lqx8" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:77ftuc */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="77ftuc" iconSymbol="mdi:link-variant" size="lg" />
                  {/* pv-block-end:77ftuc */}
                  {/* pv-block-start:h3s6kr */}
                  <div data-pv-block="h3s6kr" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:j7f2mn */}
                    {/* pv-block-start:awrrbw */}
                    <h3 data-pv-block="awrrbw" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Interconnected variables
                    </h3>
                    {/* pv-block-end:awrrbw */}
                    {/* pv-block-start:3hx3c8 */}
                    <p data-pv-block="3hx3c8" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Show stakeholders demos with real data connections for complex SaaS products
                    </p>
                    {/* pv-block-end:3hx3c8 */}
                    {/* pv-editable-zone-end:j7f2mn */}
                  </div>
                  {/* pv-block-end:h3s6kr */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:h4lqx8 */}

              {/* pv-block-start:o77jgs */}
              <div data-pv-block="o77jgs" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:ijyem2 */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="ijyem2" iconSymbol="mdi:gesture-tap" size="lg" />
                  {/* pv-block-end:ijyem2 */}
                  {/* pv-block-start:k1w9px */}
                  <div data-pv-block="k1w9px" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:l5b4ry */}
                    {/* pv-block-start:aw4bne */}
                    <h3 data-pv-block="aw4bne" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      All button states
                    </h3>
                    {/* pv-block-end:aw4bne */}
                    {/* pv-block-start:nr51nu */}
                    <p data-pv-block="nr51nu" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Design every hover, pressed, disabled, focused state
                    </p>
                    {/* pv-block-end:nr51nu */}
                    {/* pv-editable-zone-end:l5b4ry */}
                  </div>
                  {/* pv-block-end:k1w9px */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:o77jgs */}

              {/* pv-block-start:g2d9jw */}
              <div data-pv-block="g2d9jw" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:hjxtde */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="hjxtde" iconSymbol="mdi:menu-open" size="lg" />
                  {/* pv-block-end:hjxtde */}
                  {/* pv-block-start:x2n8qt */}
                  <div data-pv-block="x2n8qt" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:w7k3mv */}
                    {/* pv-block-start:1mn5q3 */}
                    <h3 data-pv-block="1mn5q3" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Nested context menus
                    </h3>
                    {/* pv-block-end:1mn5q3 */}
                    {/* pv-block-start:mqcqku */}
                    <p data-pv-block="mqcqku" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Crafting real click and hover flow
                    </p>
                    {/* pv-block-end:mqcqku */}
                    {/* pv-editable-zone-end:w7k3mv */}
                  </div>
                  {/* pv-block-end:x2n8qt */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:g2d9jw */}

              {/* pv-block-start:73i55d */}
              <div data-pv-block="73i55d" className="shrink-0 bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px] h-[300px] w-[240px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:ccsgnn */}
                  <Icon className="mb-5 text-foreground-primary" data-pv-block="ccsgnn" iconSymbol="mdi:file-tree" size="lg" />
                  {/* pv-block-end:ccsgnn */}
                  {/* pv-block-start:z4r7pw */}
                  <div data-pv-block="z4r7pw" className="flex flex-col gap-0 mt-auto">
                    {/* pv-editable-zone-start:y9s2bk */}
                    {/* pv-block-start:j1xd7r */}
                    <h3 data-pv-block="j1xd7r" className="font-secondary font-bold leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance text-xl max-w-[70%]">
                      Folder trees
                    </h3>
                    {/* pv-block-end:j1xd7r */}
                    {/* pv-block-start:q1483d */}
                    <p data-pv-block="q1483d" className="text-[14.5px] text-foreground-secondary leading-[1.55] text-pretty">
                      Expandable and collapsible navigations and folder trees
                    </p>
                    {/* pv-block-end:q1483d */}
                    {/* pv-editable-zone-end:y9s2bk */}
                  </div>
                  {/* pv-block-end:z4r7pw */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:73i55d */}
            {/* pv-editable-zone-end:z00003 */}
            </div>
          </div>
          {/* pv-block-end:jei6lm */}
        {/* pv-editable-zone-end:z00001 */}
      </section>
  );
}

function LogoReact() {
  return (
    <>
      {/* pv-editable-zone-start:zlr001 */}
      {/* pv-block-start:b00037 */}
      <div data-pv-block="b00037" className="inline-flex items-center gap-[10px] font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00010 */}
          {/* pv-block-start:ew0oak */}
          <Icon data-pv-block="ew0oak" iconSymbol="mdi:react" size="lg" />
          {/* pv-block-end:ew0oak */}
          {/* pv-block-start:b00039 */}
          <span data-pv-block="b00039">
            React.js
          </span>
          {/* pv-block-end:b00039 */}
        {/* pv-editable-zone-end:z00010 */}
      </div>
      {/* pv-block-end:b00037 */}

      {/* pv-block-start:uxnkm4 */}
      <div data-pv-block="uxnkm4" className="inline-flex items-center gap-[10px] font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00010 */}
          {/* pv-block-start:a42n3e */}
          <Icon data-pv-block="a42n3e" iconSymbol="simple-icons:pnpm" size="lg" />
          {/* pv-block-end:a42n3e */}
          {/* pv-block-start:2wckim */}
          <span data-pv-block="2wckim">
            pnpm
          </span>
          {/* pv-block-end:2wckim */}
        {/* pv-editable-zone-end:z00010 */}
      </div>
      {/* pv-block-end:uxnkm4 */}
      {/* pv-editable-zone-end:zlr001 */}
    </>
  );
}

function LogoTailwind() {
  return (
    <>
      {/* pv-block-start:b00040 */}
      <div data-pv-block="b00040" className="inline-flex items-center gap-[10px] font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00011 */}
          {/* pv-block-start:4o13gv */}
          <Icon data-pv-block="4o13gv" iconSymbol="mdi:tailwind" size="lg" />
          {/* pv-block-end:4o13gv */}
          {/* pv-block-start:b00042 */}
          <span data-pv-block="b00042">Tailwind</span>
          {/* pv-block-end:b00042 */}
        {/* pv-editable-zone-end:z00011 */}
      </div>
      {/* pv-block-end:b00040 */}
    </>
  );
}

function LogoVite() {
  return (
    <>
      {/* pv-block-start:b00043 */}
      <div data-pv-block="b00043" className="inline-flex items-center gap-[10px] font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00012 */}
          {/* pv-block-start:mnzdh0 */}
          <Icon data-pv-block="mnzdh0" iconSymbol="tabler:brand-vite" size="lg" />
          {/* pv-block-end:mnzdh0 */}
          {/* pv-block-start:b00045 */}
          <span data-pv-block="b00045">Vite</span>
          {/* pv-block-end:b00045 */}
        {/* pv-editable-zone-end:z00012 */}
      </div>
      {/* pv-block-end:b00043 */}
    </>
  );
}

function PoweredBy(props: any) {
  return (
      <section {...props} data-pv-component-id="PoweredBy" className="py-[56px] border-y border-border-secondary grid-cols-[auto_1fr] md:grid-cols-[minmax(120px,0.7fr)_auto_minmax(140px,0.9fr)] items-center gap-x-[16px] gap-y-[16px] md:gap-[32px] text-left md:text-left max-md:py-[64px] flex flex-col md:flex md:flex-row md:items-center md:justify-center">
        {/* pv-editable-zone-start:z00013 */}
          {/* pv-block-start:b00047 */}
          <div data-pv-block="b00047" className="font-bold text-[11px] tracking-[0.18em] uppercase text-foreground-tertiary md:text-right">
            Powered by
          </div>
          {/* pv-block-end:b00047 */}
          
          {/* pv-block-start:b00048 */}
          <div data-pv-block="b00048" className="items-center justify-start md:justify-center flex-nowrap text-foreground-default grid justify-items-center grid-cols-2 md:grid md:grid-cols-4 gap-8">
            {/* pv-editable-zone-start:z00014 */}
              {/* pv-block-start:b00049 */}
              <LogoReact data-pv-block="b00049" />
              {/* pv-block-end:b00049 */}
              {/* pv-block-start:b00051 */}
              <LogoTailwind data-pv-block="b00051" />
              {/* pv-block-end:b00051 */}
              {/* pv-block-start:b00053 */}
              <LogoVite data-pv-block="b00053" />
              {/* pv-block-end:b00053 */}
            {/* pv-editable-zone-end:z00014 */}
          </div>
          {/* pv-block-end:b00048 */}

          {/* pv-block-start:b00054 */}
          <div data-pv-block="b00054" className="text-[13px] leading-[1.5] max-w-[30ch] text-pretty max-md:mx-auto text-foreground-tertiary col-span-2 md:col-span-1 max-md:text-center">
            Protovibe is a Vite plugin that makes the Tailwind classes visually editable without coding
          </div>
          {/* pv-block-end:b00054 */}
        {/* pv-editable-zone-end:z00013 */}
      </section>
  );
}

function BYOAgent(props: any) {
  return (
      <section {...props} data-pv-component-id="BYOAgent" className="py-[100px]" id="agents">
        {/* pv-editable-zone-start:z00015 */}
          {/* pv-block-start:b00056 */}
          <div data-pv-block="b00056" className="max-w-[780px] text-center mb-8 mx-auto">
            {/* pv-editable-zone-start:z00016 */}
              {/* pv-block-start:b00058 */}
              <h2 data-pv-block="b00058" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Bring your own AI agent
              </h2>
              {/* pv-block-end:b00058 */}
              {/* pv-block-start:b00059 */}
              <p data-pv-block="b00059" className="mt-[20px] text-[16px] text-foreground-secondary max-w-[56ch] mx-auto leading-[1.55] text-pretty">
                Protovibe doesn't ship its own AI. It plugs into the coding agent
                you already use and trust. No lock-in, no new API key, no extra
                subscription — your agent runs locally, your prompts stay yours.
              </p>
              {/* pv-block-end:b00059 */}
              {/* pv-block-start:0qly4m */}
              <div data-pv-block="0qly4m" className="flex gap-2 flex-row items-center justify-center mt-8 text-foreground-primary">
                {/* pv-editable-zone-start:ac9lof */}
                {/* pv-block-start:n7n6uh */}
                <Icon data-pv-block="n7n6uh" iconSymbol="material-symbols:check" size="md" />
                {/* pv-block-end:n7n6uh */}
                {/* pv-block-start:p6dims */}
                <span className="font-medium" data-pv-block="p6dims">
                  All coding agents are supported
                </span>
                {/* pv-block-end:p6dims */}
                {/* pv-editable-zone-end:ac9lof */}
              </div>
              {/* pv-block-end:0qly4m */}
            {/* pv-editable-zone-end:z00016 */}
          </div>
          {/* pv-block-end:b00056 */}

          {/* pv-block-start:b00060 */}
          <div data-pv-block="b00060" className="grid grid-cols-2 md:grid-cols-3 gap-[16px] mx-auto max-w-[800px]">
            {/* pv-editable-zone-start:z00017 */}
              {/* pv-block-start:b00061 */}
              <div data-pv-block="b00061" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 justify-center aspect-3/2">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:2orjpw */}
                  <Icon className="text-amber-600" data-pv-block="2orjpw" iconSymbol="mingcute:claude-line" size="2xl" />
                  {/* pv-block-end:2orjpw */}
                  {/* pv-block-start:57is7f */}
                  <div data-pv-block="57is7f" className="flex flex-col items-center gap-0">
                    {/* pv-editable-zone-start:07q2gn */}
                    {/* pv-block-start:b00063 */}
                    <div data-pv-block="b00063" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">
                      Claude
                    </div>
                    {/* pv-block-end:b00063 */}
                    {/* pv-block-start:0n7roe */}
                    <TextParagraph className="text-center" data-pv-block="0n7roe" typography="secondary">
                      Cowork Or Claude Code
                    </TextParagraph>
                    {/* pv-block-end:0n7roe */}
                    {/* pv-editable-zone-end:07q2gn */}
                  </div>
                  {/* pv-block-end:57is7f */}

                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:b00061 */}

              {/* pv-block-start:0qu4t8 */}
              <div data-pv-block="0qu4t8" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 aspect-3/2 justify-center">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:yd5dll */}
                  <Icon className="text-foreground-default" data-pv-block="yd5dll" iconSymbol="ri:copilot-fill" size="2xl" />
                  {/* pv-block-end:yd5dll */}
                  {/* pv-block-start:20m7tm */}
                  <div data-pv-block="20m7tm" className="flex flex-col items-center justify-center gap-0">
                    {/* pv-editable-zone-start:uz37di */}
                    {/* pv-block-start:vc14wv */}
                    <div data-pv-block="vc14wv" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">GitHub Copilot</div>
                    {/* pv-block-end:vc14wv */}
                    {/* pv-block-start:2pbhg5 */}
                    <TextParagraph className="text-center" data-pv-block="2pbhg5" typography="secondary">
                      Visual Studio Code
                    </TextParagraph>
                    {/* pv-block-end:2pbhg5 */}
                    {/* pv-editable-zone-end:uz37di */}
                  </div>
                  {/* pv-block-end:20m7tm */}

                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:0qu4t8 */}

              {/* pv-block-start:ig7ao9 */}
              <div data-pv-block="ig7ao9" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 aspect-3/2 justify-center">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:bpd0ad */}
                  <Icon iconSymbol="solar:cursor-bold" className="text-transparent bg-contain bg-center bg-no-repeat bg-[url('/src/images/from-protovibe/cursor-1.svg')] aspect-[1/1]" data-pv-block="bpd0ad"  size="2xl" />
                  {/* pv-block-end:bpd0ad */}
                  {/* pv-block-start:55xctv */}
                  <div data-pv-block="55xctv" className="flex flex-col gap-0 items-center">
                    {/* pv-editable-zone-start:xogfzd */}
                    {/* pv-block-start:shldrd */}
                    <div data-pv-block="shldrd" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">
                      Cursor
                    </div>
                    {/* pv-block-end:shldrd */}
                    {/* pv-block-start:ebzjfh */}
                    <TextParagraph data-pv-block="ebzjfh" typography="secondary">
                      IDE
                    </TextParagraph>
                    {/* pv-block-end:ebzjfh */}
                    {/* pv-editable-zone-end:xogfzd */}
                  </div>
                  {/* pv-block-end:55xctv */}

                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:ig7ao9 */}

              {/* pv-block-start:ruagve */}
              <div data-pv-block="ruagve" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 aspect-3/2 justify-center">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:ruo32p */}
                  <Icon className="text-foreground-default" data-pv-block="ruo32p" iconSymbol="meteor-icons:openai" size="2xl" />
                  {/* pv-block-end:ruo32p */}
                  {/* pv-block-start:ugpx1g */}
                  <div data-pv-block="ugpx1g" className="flex flex-col items-center justify-center gap-0">
                    {/* pv-editable-zone-start:yvlalk */}
                    {/* pv-block-start:78kliu */}
                    <div data-pv-block="78kliu" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">
                      OpenAI Codex
                    </div>
                    {/* pv-block-end:78kliu */}
                    {/* pv-block-start:z1cmyn */}
                    <TextParagraph data-pv-block="z1cmyn" typography="secondary">
                      Terminal
                    </TextParagraph>
                    {/* pv-block-end:z1cmyn */}
                    {/* pv-editable-zone-end:yvlalk */}
                  </div>
                  {/* pv-block-end:ugpx1g */}

                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:ruagve */}

              {/* pv-block-start:uezzcq */}
              <div data-pv-block="uezzcq" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 aspect-3/2 justify-center">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:knrkaq */}
                  <Icon className="text-transparent bg-[url('/src/images/from-protovibe/gemini-color.png')] bg-contain bg-center bg-no-repeat aspect-[1/1]" data-pv-block="knrkaq" iconSymbol="lineicons:gemini" size="2xl" />
                  {/* pv-block-end:knrkaq */}
                  {/* pv-block-start:0t2ir5 */}
                  <div data-pv-block="0t2ir5" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">
                    Gemini
                  </div>
                  {/* pv-block-end:0t2ir5 */}
                  {/* pv-block-start:83746s */}
                  <TextParagraph className="text-center" data-pv-block="83746s" typography="secondary">
                    CLI • Antigravilty
                  </TextParagraph>
                  {/* pv-block-end:83746s */}
                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:uezzcq */}

              {/* pv-block-start:0pe2av */}
              <div data-pv-block="0pe2av" className="bg-background-secondary rounded-[12px] flex flex-col transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px] gap-2 items-center p-7 aspect-3/2 justify-center">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:este2x */}
                  <Icon className="rounded-full text-foreground-secondary" data-pv-block="este2x" iconSymbol="ri:more-fill" size="2xl" />
                  {/* pv-block-end:este2x */}
                  {/* pv-block-start:t1n8kr */}
                  <div data-pv-block="t1n8kr" className="font-secondary font-bold text-[15px] md:text-[18px] text-foreground-strong tracking-[-0.01em] grow flex flex-col justify-end text-center">
                    All other
                  </div>
                  {/* pv-block-end:t1n8kr */}
                  {/* pv-block-start:un5y85 */}
                  <TextParagraph className="text-center" data-pv-block="un5y85" typography="secondary">
                    Visual Studio Code
                  </TextParagraph>
                  {/* pv-block-end:un5y85 */}
                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:0pe2av */}
            {/* pv-editable-zone-end:z00017 */}
          </div>
          {/* pv-block-end:b00060 */}
        {/* pv-editable-zone-end:z00015 */}
      </section>
  );
}

function HowItWorks(props: any) {
  return (
      <section {...props} data-pv-component-id="HowItWorks" className="py-[120px] relative" id="how">
        {/* pv-editable-zone-start:z00024 */}
          {/* pv-block-start:b00093 */}
          <div data-pv-block="b00093" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00025 */}
              {/* pv-block-start:b00094 */}
              <div data-pv-block="b00094" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">
                Prototyping
              </div>
              {/* pv-block-end:b00094 */}
              {/* pv-block-start:b00095 */}
              <h2 data-pv-block="b00095" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                From design system to user testing
              </h2>
              {/* pv-block-end:b00095 */}
            {/* pv-editable-zone-end:z00025 */}
          </div>
          {/* pv-block-end:b00093 */}

          {/* pv-block-start:b00096 */}
          <div data-pv-block="b00096" className="max-w-[1140px] mx-auto flex flex-col gap-0 relative">
            {/* pv-editable-zone-start:z00026 */}
              {/* Step 1 */}
              {/* pv-block-start:b00097 */}
              <div data-pv-block="b00097" className="grid grid-cols-[44px_1fr] md:grid-cols-[44px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00027 */}
                  {/* pv-block-start:b00098 */}
                  <div data-pv-block="b00098" className="absolute left-[21px] top-[44px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00098 */}
                  {/* pv-block-start:b00099 */}
                  <div data-pv-block="b00099" className="w-[44px] h-[44px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    1
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00099 */}
                  {/* pv-block-start:b00100 */}
                  <div data-pv-block="b00100" className="min-w-0 md:col-auto col-span-1 pt-2.5">
                    {/* pv-editable-zone-start:z00028 */}
                      {/* pv-block-start:b00101 */}
                      <h3 data-pv-block="b00101" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">
                        Install Protovibe app
                      </h3>
                      {/* pv-block-end:b00101 */}
                      {/* pv-block-start:b00102 */}
                      <p data-pv-block="b00102" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">
                        We've prepared a single script that automatically installs required terminal commands, so you don't need to manually mess with it. Once installed, you launch it by clicking an icon in your Applications folder (Mac) or from your desktop (Windows)
                      </p>
                      {/* pv-block-end:b00102 */}
                    {/* pv-editable-zone-end:z00028 */}
                  </div>
                  {/* pv-block-end:b00100 */}
                  {/* pv-block-start:b00103 */}
                  <div data-pv-block="b00103" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[66px] md:ml-0 md:max-w-[540px]">
                    <div className="w-full aspect-[21/9] bg-background-secondary border border-border-secondary rounded-[14px] flex items-center justify-center text-foreground-tertiary text-[12px] font-semibold">
                      Miejsce na grafikę
                    </div>
                  </div>
                  {/* pv-block-end:b00103 */}
                {/* pv-editable-zone-end:z00027 */}
              </div>
              {/* pv-block-end:b00097 */}

              {/* Step 2 */}
              {/* pv-block-start:b00104 */}
              <div data-pv-block="b00104" className="grid grid-cols-[44px_1fr] md:grid-cols-[44px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00029 */}
                  {/* pv-block-start:b00105 */}
                  <div data-pv-block="b00105" className="absolute left-[21px] top-[44px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00105 */}
                  {/* pv-block-start:b00106 */}
                  <div data-pv-block="b00106" className="w-[44px] h-[44px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    2
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00106 */}
                  {/* pv-block-start:b00107 */}
                  <div data-pv-block="b00107" className="min-w-0 md:col-auto col-span-1 pt-2.5">
                    {/* pv-editable-zone-start:z00030 */}
                      {/* pv-block-start:b00108 */}
                      <h3 data-pv-block="b00108" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">
                        Set up your colors and tokens
                      </h3>
                      {/* pv-block-end:b00108 */}
                      {/* pv-block-start:b00109 */}
                      <p data-pv-block="b00109" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">
                        Create a new project and jump to "Tokens" to set up your colors, fonts, spacing, shadows. Or just paste your colors to your coding agent and ask to try to match them with Protovibe tokens.
                      </p>
                      {/* pv-block-end:b00109 */}
                    {/* pv-editable-zone-end:z00030 */}
                  </div>
                  {/* pv-block-end:b00107 */}
                  {/* pv-block-start:b00110 */}
                  <div data-pv-block="b00110" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[66px] md:ml-0 md:max-w-[540px]">
                    <div className="w-full aspect-[21/9] bg-background-secondary border border-border-secondary rounded-[14px] flex items-center justify-center text-foreground-tertiary text-[12px] font-semibold">
                      Miejsce na grafikę
                    </div>
                  </div>
                  {/* pv-block-end:b00110 */}
                {/* pv-editable-zone-end:z00029 */}
              </div>
              {/* pv-block-end:b00104 */}

              {/* Step 3 */}
              {/* pv-block-start:b00111 */}
              <div data-pv-block="b00111" className="grid grid-cols-[44px_1fr] md:grid-cols-[44px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00031 */}
                  {/* pv-block-start:b00112 */}
                  <div data-pv-block="b00112" className="absolute left-[21px] top-[44px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00112 */}
                  {/* pv-block-start:b00113 */}
                  <div data-pv-block="b00113" className="w-[44px] h-[44px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    3
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00113 */}
                  {/* pv-block-start:b00114 */}
                  <div data-pv-block="b00114" className="min-w-0 md:col-auto col-span-1 pt-2.5">
                    {/* pv-editable-zone-start:z00032 */}
                      {/* pv-block-start:b00115 */}
                      <h3 data-pv-block="b00115" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">
                        Adjust components library
                      </h3>
                      {/* pv-block-end:b00115 */}
                      {/* pv-block-start:b00116 */}
                      <p data-pv-block="b00116" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">
                        Easily adjust all variants of components to fit your design system. It might take a few hours to get right, but it's worth the effort.
                      </p>
                      {/* pv-block-end:b00116 */}
                    {/* pv-editable-zone-end:z00032 */}
                  </div>
                  {/* pv-block-end:b00114 */}
                  {/* pv-block-start:b00117 */}
                  <div data-pv-block="b00117" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[66px] md:ml-0 md:max-w-[540px]">
                    <div className="w-full aspect-[21/9] bg-background-secondary border border-border-secondary rounded-[14px] flex items-center justify-center text-foreground-tertiary text-[12px] font-semibold">
                      Miejsce na grafikę
                    </div>
                  </div>
                  {/* pv-block-end:b00117 */}
                {/* pv-editable-zone-end:z00031 */}
              </div>
              {/* pv-block-end:b00111 */}

              {/* Step 4 */}
              {/* pv-block-start:b00118 */}
              <div data-pv-block="b00118" className="grid grid-cols-[44px_1fr] md:grid-cols-[44px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative items-start">
                {/* pv-editable-zone-start:z00033 */}
                  {/* pv-block-start:b00119 */}
                  <div data-pv-block="b00119" className="w-[44px] h-[44px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    4
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00119 */}
                  {/* pv-block-start:b00120 */}
                  <div data-pv-block="b00120" className="pt-[14px] min-w-0 md:col-auto col-span-1">
                    {/* pv-editable-zone-start:z00034 */}
                      {/* pv-block-start:b00121 */}
                      <h3 data-pv-block="b00121" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">Publish prototypes with one click.</h3>
                      {/* pv-block-end:b00121 */}
                      {/* pv-block-start:b00122 */}
                      <p data-pv-block="b00122" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">
                        Ship to your own Cloudflare account in a single click. Real URLs, your domain. You can choose any hosting if you want.
                      </p>
                      {/* pv-block-end:b00122 */}
                    {/* pv-editable-zone-end:z00034 */}
                  </div>
                  {/* pv-block-end:b00120 */}
                  {/* pv-block-start:b00123 */}
                  <div data-pv-block="b00123" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[66px] md:ml-0 md:max-w-[540px]">
                    <div className="w-full aspect-[21/9] bg-background-secondary border border-border-secondary rounded-[14px] flex items-center justify-center text-foreground-tertiary text-[12px] font-semibold">
                      Miejsce na grafikę
                    </div>
                  </div>
                  {/* pv-block-end:b00123 */}
                {/* pv-editable-zone-end:z00033 */}
              </div>
              {/* pv-block-end:b00118 */}

            {/* pv-editable-zone-end:z00026 */}
          </div>
          {/* pv-block-end:b00096 */}
        {/* pv-editable-zone-end:z00024 */}
      </section>
  );
}

function ProblemSolution(props: any) {
  return (
      <section {...props} data-pv-component-id="ProblemSolution" className="py-[100px]" id="problems">
        {/* pv-editable-zone-start:z00035 */}
          {/* pv-block-start:b00125 */}
          <div data-pv-block="b00125" className="max-w-2/3 mb-64px mx-auto text-center">
            {/* pv-editable-zone-start:z00036 */}
              {/* pv-block-start:b00126 */}
              <div data-pv-block="b00126" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">Problem → Solution</div>
              {/* pv-block-end:b00126 */}
              {/* pv-block-start:b00127 */}
              <h2 data-pv-block="b00127" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Protovibe fixes what AI web builders did wrong
              </h2>
              {/* pv-block-end:b00127 */}
              {/* pv-block-start:b00128 */}
              <p data-pv-block="b00128" className="text-[16px] text-foreground-secondary leading-[1.55] text-balance mt-8 pb-8">
                Look, prompting an AI to make a UI is not designing. AI spits random UI, and you're stuck trying to fix it. Design is a process where you need to move rectangles yourself and iterate. Protovibe Studio brings you back to a driver seat. <br /><br /><br />
              </p>
              {/* pv-block-end:b00128 */}
            {/* pv-editable-zone-end:z00036 */}
          </div>
          {/* pv-block-end:b00125 */}

          {/* pv-block-start:b00129 */}
          <div data-pv-block="b00129" className="flex flex-col gap-[80px] max-w-[1040px] mx-auto">
            {/* pv-editable-zone-start:z00037 */}
              {/* ROW 1 */}
              {/* pv-block-start:b00160 */}
              <div data-pv-block="b00160" className="grid grid-cols-1 gap-[28px] md:gap-[56px] items-center md:grid-cols-[minmax(280px,380px)_1fr]">
                {/* pv-editable-zone-start:z00050 */}
                  {/* pv-block-start:130933 */}
                  <div data-pv-block="130933" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:130933 */}
                  {/* pv-block-start:b00162 */}
                  <div data-pv-block="b00162" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00051 */}
                      {/* pv-block-start:b00163 */}
                      <h3 data-pv-block="b00163" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        You stay the designer
                      </h3>
                      {/* pv-block-end:b00163 */}
                      {/* pv-block-start:b00164 */}
                      <div data-pv-block="b00164" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00052 */}
                          {/* pv-block-start:b00165 */}
                          <div data-pv-block="b00165" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-default">Problem</div>
                          {/* pv-block-end:b00165 */}
                          {/* pv-block-start:b00166 */}
                          <p data-pv-block="b00166" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            We've all tried the "magic" AI website builders. You ask for a sleek dashboard, and it spits out a generic, inconsistent Frankenstein that looks like a different brand.
                          </p>
                          {/* pv-block-end:b00166 */}
                        {/* pv-editable-zone-end:z00052 */}
                      </div>
                      {/* pv-block-end:b00164 */}
                      {/* pv-block-start:b00167 */}
                      <div data-pv-block="b00167" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00053 */}
                          {/* pv-block-start:b00168 */}
                          <div data-pv-block="b00168" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00168 */}
                          {/* pv-block-start:b00169 */}
                          <p data-pv-block="b00169" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            You can still design by hand. Protovibe looks and feels just like your normal design tool. But you’re visually editing a living app. so AI has agent-friendly coding interface to help you.
                          </p>
                          {/* pv-block-end:b00169 */}
                        {/* pv-editable-zone-end:z00053 */}
                      </div>
                      {/* pv-block-end:b00167 */}
                    {/* pv-editable-zone-end:z00051 */}
                  </div>
                  {/* pv-block-end:b00162 */}
                {/* pv-editable-zone-end:z00050 */}
              </div>
              {/* pv-block-end:b00160 */}

              {/* ROW 2 */}
              {/* pv-block-start:b00200 */}
              <div data-pv-block="b00200" className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00066 */}
                  {/* pv-block-start:b00201 */}
                  <div data-pv-block="b00201" className="md:order-last aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00201 */}
                  {/* pv-block-start:b00202 */}
                  <div data-pv-block="b00202" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00067 */}
                      {/* pv-block-start:b00203 */}
                      <h3 data-pv-block="b00203" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Real design tool, not a textbox
                      </h3>
                      {/* pv-block-end:b00203 */}
                      {/* pv-block-start:b00204 */}
                      <div data-pv-block="b00204" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00068 */}
                          {/* pv-block-start:b00205 */}
                          <div data-pv-block="b00205" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-default">Problem</div>
                          {/* pv-block-end:b00205 */}
                          {/* pv-block-start:b00206 */}
                          <p data-pv-block="b00206" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            AI chat is not a design tool. No undo. No sliders. No color picker. No way to quickly explore options. You can't feel design through a text box.
                          </p>
                          {/* pv-block-end:b00206 */}
                        {/* pv-editable-zone-end:z00068 */}
                      </div>
                      {/* pv-block-end:b00204 */}
                      {/* pv-block-start:b00207 */}
                      <div data-pv-block="b00207" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00069 */}
                          {/* pv-block-start:b00208 */}
                          <div data-pv-block="b00208" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00208 */}
                          {/* pv-block-start:b00209 */}
                          <p data-pv-block="b00209" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Protovibe has everything a designer expects — wired to code. Proper undo, design sidebar, keyboard shortcuts, color sliders, autocomplete fields, drag&amp;drop. It's all there.
                          </p>
                          {/* pv-block-end:b00209 */}
                        {/* pv-editable-zone-end:z00069 */}
                      </div>
                      {/* pv-block-end:b00207 */}
                    {/* pv-editable-zone-end:z00067 */}
                  </div>
                  {/* pv-block-end:b00202 */}
                {/* pv-editable-zone-end:z00066 */}
              </div>
              {/* pv-block-end:b00200 */}

              {/* ROW 3 */}
              {/* pv-block-start:b00130 */}
              <div data-pv-block="b00130" className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00038 */}
                  {/* pv-block-start:b00131 */}
                  <div data-pv-block="b00131" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00131 */}
                  {/* pv-block-start:b00132 */}
                  <div data-pv-block="b00132" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00039 */}
                      {/* pv-block-start:b00133 */}
                      <h3 data-pv-block="b00133" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Coherent design system &amp; tokens
                      </h3>
                      {/* pv-block-end:b00133 */}
                      {/* pv-block-start:b00134 */}
                      <div data-pv-block="b00134" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00040 */}
                          {/* pv-block-start:b00135 */}
                          <div data-pv-block="b00135" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-default">Problem</div>
                          {/* pv-block-end:b00135 */}
                          {/* pv-block-start:b00136 */}
                          <p data-pv-block="b00136" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            AI site builders generate different styles with every prompt. Hardcoded #4F7CFF. Random border radius. Inconsistent font sizes.
                          </p>
                          {/* pv-block-end:b00136 */}
                        {/* pv-editable-zone-end:z00040 */}
                      </div>
                      {/* pv-block-end:b00134 */}
                      {/* pv-block-start:b00137 */}
                      <div data-pv-block="b00137" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00041 */}
                          {/* pv-block-start:b00138 */}
                          <div data-pv-block="b00138" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00138 */}
                          {/* pv-block-start:b00139 */}
                          <p data-pv-block="b00139" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Protovibe lets you set up all your design tokens: colors for light and dark mode, fonts, spacing. AI simply has instructions to use these tokens only.
                          </p>
                          {/* pv-block-end:b00139 */}
                        {/* pv-editable-zone-end:z00041 */}
                      </div>
                      {/* pv-block-end:b00137 */}
                    {/* pv-editable-zone-end:z00039 */}
                  </div>
                  {/* pv-block-end:b00132 */}
                {/* pv-editable-zone-end:z00038 */}
              </div>
              {/* pv-block-end:b00130 */}

              {/* ROW 4 */}
              {/* pv-block-start:b00140 */}
              <div data-pv-block="b00140" className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00042 */}
                  {/* pv-block-start:b00141 */}
                  <div data-pv-block="b00141" className="md:order-last aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00141 */}
                  {/* pv-block-start:b00142 */}
                  <div data-pv-block="b00142" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00043 */}
                      {/* pv-block-start:b00143 */}
                      <h3 data-pv-block="b00143" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Editing without re-prompting
                      </h3>
                      {/* pv-block-end:b00143 */}
                      {/* pv-block-start:b00144 */}
                      <div data-pv-block="b00144" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00044 */}
                          {/* pv-block-start:b00145 */}
                          <div data-pv-block="b00145" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00145 */}
                          {/* pv-block-start:b00146 */}
                          <p data-pv-block="b00146" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            With tools like Figma Make or Cursor, every damn change requires another prompt. You need to prompt "Add 4px margin" and wait. Then wait again. And again.
                          </p>
                          {/* pv-block-end:b00146 */}
                        {/* pv-editable-zone-end:z00044 */}
                      </div>
                      {/* pv-block-end:b00144 */}
                      {/* pv-block-start:b00147 */}
                      <div data-pv-block="b00147" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00045 */}
                          {/* pv-block-start:b00148 */}
                          <div data-pv-block="b00148" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00148 */}
                          {/* pv-block-start:b00149 */}
                          <p data-pv-block="b00149" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            You can easily fix AI mistakes by hand. Just select an element and change it's padding and instantly see results. Reorder, change icons, colors, everything.
                          </p>
                          {/* pv-block-end:b00149 */}
                        {/* pv-editable-zone-end:z00045 */}
                      </div>
                      {/* pv-block-end:b00147 */}
                    {/* pv-editable-zone-end:z00043 */}
                  </div>
                  {/* pv-block-end:b00142 */}
                {/* pv-editable-zone-end:z00042 */}
              </div>
              {/* pv-block-end:b00140 */}

              {/* ROW 5 */}
              {/* pv-block-start:b00150 */}
              <div data-pv-block="b00150" className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00046 */}
                  {/* pv-block-start:b00151 */}
                  <div data-pv-block="b00151" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00151 */}
                  {/* pv-block-start:b00152 */}
                  <div data-pv-block="b00152" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00047 */}
                      {/* pv-block-start:b00153 */}
                      <h3 data-pv-block="b00153" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Components library
                      </h3>
                      {/* pv-block-end:b00153 */}
                      {/* pv-block-start:b00154 */}
                      <div data-pv-block="b00154" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00048 */}
                          {/* pv-block-start:b00155 */}
                          <div data-pv-block="b00155" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-default">Problem</div>
                          {/* pv-block-end:b00155 */}
                          {/* pv-block-start:b00156 */}
                          <p data-pv-block="b00156" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Design Systems in Figma have hundreds of files with scattered variants. Making changes is slow and complicated. Local components? You need to assign all the props manually.
                          </p>
                          {/* pv-block-end:b00156 */}
                        {/* pv-editable-zone-end:z00048 */}
                      </div>
                      {/* pv-block-end:b00154 */}
                      {/* pv-block-start:b00157 */}
                      <div data-pv-block="b00157" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00049 */}
                          {/* pv-block-start:b00158 */}
                          <div data-pv-block="b00158" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00158 */}
                          {/* pv-block-start:b00159 */}
                          <p data-pv-block="b00159" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Protovibe has a robust built-in library of UI components that you can easily enhance. It automatically generates a component preview matrix to show you all possible variants. See a mistake? Just fix it by hand or ask AI. Need a new component? Just ask AI to convert your mock to a component.
                          </p>
                          {/* pv-block-end:b00159 */}
                        {/* pv-editable-zone-end:z00049 */}
                      </div>
                      {/* pv-block-end:b00157 */}
                    {/* pv-editable-zone-end:z00047 */}
                  </div>
                  {/* pv-block-end:b00152 */}
                {/* pv-editable-zone-end:z00046 */}
              </div>
              {/* pv-block-end:b00150 */}

              {/* pv-block-start:b00180 */}
              <div data-pv-block="b00180" className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00058 */}
                  {/* pv-block-start:b00181 */}
                  <div data-pv-block="b00181" className="md:order-last aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00181 */}
                  {/* pv-block-start:b00182 */}
                  <div data-pv-block="b00182" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00059 */}
                      {/* pv-block-start:b00183 */}
                      <h3 data-pv-block="b00183" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Infinite sketchpad canvas
                      </h3>
                      {/* pv-block-end:b00183 */}
                      {/* pv-block-start:b00184 */}
                      <div data-pv-block="b00184" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00060 */}
                          {/* pv-block-start:b00185 */}
                          <div data-pv-block="b00185" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-default">Problem</div>
                          {/* pv-block-end:b00185 */}
                          {/* pv-block-start:b00186 */}
                          <p data-pv-block="b00186" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Ah, the exploration phase... Before prototyping, you need to sketch ideas. You create mockups in Figma, then send screenshots to AI Studio. And you get an app that looks completely different.
                          </p>
                          {/* pv-block-end:b00186 */}
                        {/* pv-editable-zone-end:z00060 */}
                      </div>
                      {/* pv-block-end:b00184 */}
                      {/* pv-block-start:b00187 */}
                      <div data-pv-block="b00187" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00061 */}
                          {/* pv-block-start:b00188 */}
                          <div data-pv-block="b00188" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00188 */}
                          {/* pv-block-start:b00189 */}
                          <p data-pv-block="b00189" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Protovibe lets you design sketches by drag&amp;drop like in Figma, with infinite canvas. But you are actually dragging real coded components. AI understands this better than screenshots.
                          </p>
                          {/* pv-block-end:b00189 */}
                        {/* pv-editable-zone-end:z00061 */}
                      </div>
                      {/* pv-block-end:b00187 */}
                    {/* pv-editable-zone-end:z00059 */}
                  </div>
                  {/* pv-block-end:b00182 */}
                {/* pv-editable-zone-end:z00058 */}
              </div>
              {/* pv-block-end:b00180 */}

              {/* ROW 6 */}
              {/* pv-block-start:b00170 */}
              <div data-pv-block="b00170" className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00054 */}
                  {/* pv-block-start:b00171 */}
                  <div data-pv-block="b00171" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00171 */}
                  {/* pv-block-start:b00172 */}
                  <div data-pv-block="b00172" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00055 */}
                      {/* pv-block-start:b00173 */}
                      <h3 data-pv-block="b00173" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">
                        Design is now promptable<br />
                      </h3>
                      {/* pv-block-end:b00173 */}
                      {/* pv-block-start:b00174 */}
                      <div data-pv-block="b00174" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00056 */}
                          {/* pv-block-start:b00175 */}
                          <div data-pv-block="b00175" className="font-bold tracking-[0.18em] uppercase text-foreground-default text-tiny">Problem</div>
                          {/* pv-block-end:b00175 */}
                          {/* pv-block-start:b00176 */}
                          <p data-pv-block="b00176" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Designs look pristine in Figma. But pixels, states, and edge cases get lost in translation.
                          </p>
                          {/* pv-block-end:b00176 */}
                        {/* pv-editable-zone-end:z00056 */}
                      </div>
                      {/* pv-block-end:b00174 */}
                      {/* pv-block-start:b00177 */}
                      <div data-pv-block="b00177" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00057 */}
                          {/* pv-block-start:b00178 */}
                          <div data-pv-block="b00178" className="font-bold tracking-[0.18em] uppercase text-foreground-primary text-tiny">Solution</div>
                          {/* pv-block-end:b00178 */}
                          {/* pv-block-start:b00179 */}
                          <p data-pv-block="b00179" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">
                            Your design and code is the same single source of truth with a <b className="text-foreground-default font-normal"> two‑way sync</b>. We've prepared useful prompts library for you so, for different situations.
                          </p>
                          {/* pv-block-end:b00179 */}
                        {/* pv-editable-zone-end:z00057 */}
                      </div>
                      {/* pv-block-end:b00177 */}
                    {/* pv-editable-zone-end:z00055 */}
                  </div>
                  {/* pv-block-end:b00172 */}
                {/* pv-editable-zone-end:z00054 */}
              </div>
              {/* pv-block-end:b00170 */}

              {/* ROW 7 */}

              {/* ROW 8 */}

              {/* ROW 9 */}
            {/* pv-editable-zone-end:z00037 */}
          </div>
          {/* pv-block-end:b00129 */}
        {/* pv-editable-zone-end:z00035 */}
      </section>
  );
}

function FAQ(props: any) {
  return (
      <section {...props} data-pv-component-id="FAQ" className="py-[120px] relative" id="faq">
        {/* pv-editable-zone-start:z00074 */}
          {/* pv-block-start:b00221 */}
          <div data-pv-block="b00221" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00075 */}
              {/* pv-block-start:b00222 */}
              <div data-pv-block="b00222" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">FAQ</div>
              {/* pv-block-end:b00222 */}
              {/* pv-block-start:b00223 */}
              <h2 data-pv-block="b00223" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">Questions, answered straight.</h2>
              {/* pv-block-end:b00223 */}
            {/* pv-editable-zone-end:z00075 */}
          </div>
          {/* pv-block-end:b00221 */}

          {/* pv-block-start:b00224 */}
          <div data-pv-block="b00224" className="max-w-[820px] mx-auto border-t border-border-secondary">
            {/* pv-editable-zone-start:z00076 */}
              {/* pv-block-start:b00400 */}
              <details data-pv-block="b00400" className="border-b border-border-secondary group" open>
                {/* pv-editable-zone-start:z00200 */}
                  {/* pv-block-start:b00401 */}
                  <summary data-pv-block="b00401" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00210 */}
                      {/* pv-block-start:b00430 */}
                      <span data-pv-block="b00430">Is it really free?</span>
                      {/* pv-block-end:b00430 */}
                      {/* pv-block-start:b00431 */}
                      <Icon data-pv-block="b00431" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00431 */}
                    {/* pv-editable-zone-end:z00210 */}
                  </summary>
                  {/* pv-block-end:b00401 */}
                  {/* pv-block-start:b00402 */}
                  <div data-pv-block="b00402" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                    Yes. Protovibe is open source licence AGPL v3.0 which means that you can use it for free. You just can't create commercial software using its code. It runs entirely on your machine. There's no SaaS backend, no seat tax, no hidden usage cap.
                  </div>
                  {/* pv-block-end:b00402 */}
                {/* pv-editable-zone-end:z00200 */}
              </details>
              {/* pv-block-end:b00400 */}

              {/* pv-block-start:b00418 */}
              <details data-pv-block="b00418" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00206 */}
                  {/* pv-block-start:b00419 */}
                  <summary data-pv-block="b00419" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00216 */}
                      {/* pv-block-start:b00442 */}
                      <span data-pv-block="b00442">Who's this for?</span>
                      {/* pv-block-end:b00442 */}
                      {/* pv-block-start:b00443 */}
                      <Icon data-pv-block="b00443" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00443 */}
                    {/* pv-editable-zone-end:z00216 */}
                  </summary>
                  {/* pv-block-end:b00419 */}
                  {/* pv-block-start:b00420 */}
                  <div data-pv-block="b00420" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                    It's for designers or developers who want to build advanced realistic prototypes but still ensure they feel like your brand and your design system.
                  </div>
                  {/* pv-block-end:b00420 */}
                {/* pv-editable-zone-end:z00206 */}
              </details>
              {/* pv-block-end:b00418 */}

              {/* pv-block-start:b00403 */}
              <details data-pv-block="b00403" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00201 */}
                  {/* pv-block-start:b00404 */}
                  <summary data-pv-block="b00404" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00211 */}
                      {/* pv-block-start:b00432 */}
                      <span data-pv-block="b00432">Which AI agents does it work with?</span>
                      {/* pv-block-end:b00432 */}
                      {/* pv-block-start:b00433 */}
                      <Icon data-pv-block="b00433" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00433 */}
                    {/* pv-editable-zone-end:z00211 */}
                  </summary>
                  {/* pv-block-end:b00404 */}
                  {/* pv-block-start:b00405 */}
                  <div data-pv-block="b00405" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">GitHub Copilot, Claude Code, Gemini CLI, Cursor, Aider, Codex — basically any agent that can read files and run a dev server. Protovibe doesn't care which one; it just gives your agent a great design surface to write into.</div>
                  {/* pv-block-end:b00405 */}
                {/* pv-editable-zone-end:z00201 */}
              </details>
              {/* pv-block-end:b00403 */}

              {/* pv-block-start:b00406 */}
              <details data-pv-block="b00406" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00202 */}
                  {/* pv-block-start:b00407 */}
                  <summary data-pv-block="b00407" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00212 */}
                      {/* pv-block-start:b00434 */}
                      <span data-pv-block="b00434">How does 'runs on your computer' actually work?</span>
                      {/* pv-block-end:b00434 */}
                      {/* pv-block-start:b00435 */}
                      <Icon data-pv-block="b00435" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00435 */}
                    {/* pv-editable-zone-end:z00212 */}
                  </summary>
                  {/* pv-block-end:b00407 */}
                  {/* pv-block-start:b00408 */}
                  <div data-pv-block="b00408" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                    Protovibe runs your browser but it's not online. Your computer simulates a server so that you can see a website. It reads and writes files to your own drive. Everything should be set up with one script, so you don't need to manually install Node.js and npm.
                  </div>
                  {/* pv-block-end:b00408 */}
                {/* pv-editable-zone-end:z00202 */}
              </details>
              {/* pv-block-end:b00406 */}

              {/* pv-block-start:b00412 */}
              <details data-pv-block="b00412" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00204 */}
                  {/* pv-block-start:b00413 */}
                  <summary data-pv-block="b00413" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00214 */}
                      {/* pv-block-start:b00438 */}
                      <span data-pv-block="b00438">Can I bring my own design system?</span>
                      {/* pv-block-end:b00438 */}
                      {/* pv-block-start:b00439 */}
                      <Icon data-pv-block="b00439" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00439 */}
                    {/* pv-editable-zone-end:z00214 */}
                  </summary>
                  {/* pv-block-end:b00413 */}
                  {/* pv-block-start:b00414 */}
                  <div data-pv-block="b00414" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                    Yes, and you should. Point Protovibe at your tokens file or Tailwind config once, and every prototype after that will snap to your system. Spend couple hours on adjusting built-in components to match your design system and you're good to go for all future projects.
                  </div>
                  {/* pv-block-end:b00414 */}
                {/* pv-editable-zone-end:z00204 */}
              </details>
              {/* pv-block-end:b00412 */}

              {/* pv-block-start:b00415 */}
              <details data-pv-block="b00415" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00205 */}
                  {/* pv-block-start:b00416 */}
                  <summary data-pv-block="b00416" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00215 */}
                      {/* pv-block-start:b00440 */}
                      <span data-pv-block="b00440">
                        Can I export the project?
                      </span>
                      {/* pv-block-end:b00440 */}
                      {/* pv-block-start:b00441 */}
                      <Icon data-pv-block="b00441" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00441 */}
                    {/* pv-editable-zone-end:z00215 */}
                  </summary>
                  {/* pv-block-end:b00416 */}
                  {/* pv-block-start:b00417 */}
                  <div data-pv-block="b00417" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                    Yes, you can just download a ZIP with your project and reimport it again. After all the whole design is represented as a structure of folders and files.
                  </div>
                  {/* pv-block-end:b00417 */}
                {/* pv-editable-zone-end:z00205 */}
              </details>
              {/* pv-block-end:b00415 */}
            {/* pv-editable-zone-end:z00076 */}
          </div>
          {/* pv-block-end:b00224 */}
        {/* pv-editable-zone-end:z00074 */}
      </section>
  );
}

function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("auto");
  const [platform, setPlatform] = useState<"mac" | "windows" | null>(null);
  const [copied, setCopied] = useState(false);
  const installCommand = "curl -fsSL https://raw.githubusercontent.com/Protovibe-Studio/protovibe-studio/main/init-installation-via-curl.sh | bash";
  const windowsZipUrl = "https://github.com/Protovibe-Studio/protovibe-studio/archive/refs/heads/main.zip";
  const onCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const handleClose = () => {
    setPlatform(null);
    setTab("auto");
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* pv-block-start:b00231 */}
      <div data-pv-block="b00231" className="fixed inset-0 z-[100] bg-background-overlay flex items-start justify-center p-[12px] pt-[32px] sm:p-[24px] sm:pt-[64px] animate-[fade-in_0.2s_ease] overflow-y-auto overflow-scroll" onClick={handleClose}>
        {/* pv-editable-zone-start:z00080 */}
          {/* pv-block-start:b00232 */}
          <div data-pv-block="b00232" className="relative w-full rounded-[16px] p-[20px] sm:p-[36px_36px_32px] animate-[modal-in_0.25s_cubic-bezier(.2,.8,.3,1)] overflow-y-auto bg-background-elevated border-0 border-border-default shadow-2xl overflow-hidden max-w-[640px]" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* pv-editable-zone-start:z00081 */}
              {/* pv-block-start:b00233 */}
              <div data-pv-block="b00233" className="absolute top-[-40%] left-[-10%] right-[-10%] h-[60%] pointer-events-none blur-[80px] z-0 rounded-[16px] opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #3d7bff, transparent 60%), radial-gradient(circle at 70% 50%, oklch(0.70 0.26 320), transparent 60%)' }} />
              {/* pv-block-end:b00233 */}
              {/* pv-block-start:b00234 */}
              <button data-pv-block="b00234" className="absolute top-[14px] right-[14px] appearance-none border-0 bg-transparent text-foreground-secondary w-[32px] h-[32px] rounded-[8px] text-[14px] transition-colors duration-150 z-[2] hover:bg-background-tertiary hover:text-foreground-strong" onClick={handleClose} aria-label="Close">✕</button>
              {/* pv-block-end:b00234 */}

              {/* pv-block-start:b00235 */}
              <div data-pv-block="b00235" className="relative z-[1] mb-2">
                {/* pv-editable-zone-start:z00082 */}
                  {/* pv-block-start:b00237 */}
                  <h3 data-pv-block="b00237" className="font-secondary font-bold text-[32px] leading-[1.1] tracking-[-0.03em] text-foreground-strong mt-12px mb-6">
                    Install Protovibe
                  </h3>
                  {/* pv-block-end:b00237 */}
                  {/* pv-block-start:plsub1 */}
                  {platform && (
                    <button data-pv-block="plsub1" onClick={() => setPlatform(null)} className="appearance-none border-0 bg-transparent p-0 text-[13px] text-foreground-secondary hover:text-foreground-default cursor-pointer inline-flex items-center gap-[6px] -mt-2 mb-2">
                      <Icon iconSymbol="mdi:arrow-left" size="sm" />
                      <span>Change platform</span>
                    </button>
                  )}
                  {/* pv-block-end:plsub1 */}
                {/* pv-editable-zone-end:z00082 */}
              </div>
              {/* pv-block-end:b00235 */}

              {/* pv-block-start:plpick */}
              {!platform && (
                <div data-pv-block="plpick" className="relative z-[1]">
                  {/* pv-editable-zone-start:zplpck */}
                    {/* pv-block-start:plpfx0 */}
                    <div data-pv-block="plpfx0" className="text-[14px] text-foreground-secondary leading-[1.55] mb-[16px]">
                      Choose your platform to see the right install steps.
                    </div>
                    {/* pv-block-end:plpfx0 */}
                    {/* pv-block-start:plpgrd */}
                    <div data-pv-block="plpgrd" className="grid grid-cols-1 sm:grid-cols-2 gap-[10px]">
                      {/* pv-editable-zone-start:zplgrd */}
                        {/* pv-block-start:plpmac */}
                        <button data-pv-block="plpmac" onClick={() => setPlatform("mac")} className="appearance-none text-left rounded-[10px] p-[20px] font-inherit cursor-pointer transition-colors duration-150 bg-background-tertiary border-2 border-border-secondary hover:bg-background-secondary hover:border-border-primary flex items-center gap-[14px]">
                          {/* pv-editable-zone-start:zplmac */}
                            {/* pv-block-start:plpmci */}
                            <Icon data-pv-block="plpmci" iconSymbol="mdi:apple" size="lg" className="text-foreground-strong" />
                            {/* pv-block-end:plpmci */}
                            {/* pv-block-start:plpmcl */}
                            <span data-pv-block="plpmcl" className="font-semibold text-[15px] text-foreground-strong">Mac</span>
                            {/* pv-block-end:plpmcl */}
                          {/* pv-editable-zone-end:zplmac */}
                        </button>
                        {/* pv-block-end:plpmac */}
                        {/* pv-block-start:plpwin */}
                        <button data-pv-block="plpwin" onClick={() => setPlatform("windows")} className="appearance-none text-left rounded-[10px] p-[20px] font-inherit cursor-pointer transition-colors duration-150 bg-background-tertiary border-2 border-border-secondary hover:bg-background-secondary hover:border-border-primary flex items-center gap-[14px]">
                          {/* pv-editable-zone-start:zplwin */}
                            {/* pv-block-start:plpwni */}
                            <Icon data-pv-block="plpwni" iconSymbol="mdi:microsoft-windows" size="lg" className="text-foreground-strong" />
                            {/* pv-block-end:plpwni */}
                            {/* pv-block-start:plpwnl */}
                            <span data-pv-block="plpwnl" className="font-semibold text-[15px] text-foreground-strong">Windows</span>
                            {/* pv-block-end:plpwnl */}
                          {/* pv-editable-zone-end:zplwin */}
                        </button>
                        {/* pv-block-end:plpwin */}
                      {/* pv-editable-zone-end:zplgrd */}
                    </div>
                    {/* pv-block-end:plpgrd */}
                  {/* pv-editable-zone-end:zplpck */}
                </div>
              )}
              {/* pv-block-end:plpick */}

              {/* pv-block-start:b00239 */}
              {platform && (
              <div data-pv-block="b00239" className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-[20px] relative z-[1]" role="tablist">
                {/* pv-editable-zone-start:z00083 */}
                  {/* pv-block-start:b00240 */}
                  <button
                    data-pv-block="b00240"
                    role="tab"
                    aria-selected={tab === "auto"}
                    className={`appearance-none text-left rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "auto" ? "bg-background-secondary text-white border-border-primary" : "border-border-secondary text-foreground-secondary hover:bg-background-secondary hover:text-foreground-default"} bg-background-tertiary border-2`}
                    onClick={() => setTab("auto")}>
                    {/* pv-editable-zone-start:z00084 */}
                      {/* pv-block-start:b00241 */}
                      <div data-pv-block="b00241" className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
                        {/* pv-editable-zone-start:z00085 */}
                          {/* pv-block-start:b00243 */}
                          <span data-pv-block="b00243">
                            Automatic installation
                          </span>
                          {/* pv-block-end:b00243 */}
                        {/* pv-editable-zone-end:z00085 */}
                      </div>
                      {/* pv-block-end:b00241 */}
                      {/* pv-block-start:b00244 */}
                      <div data-pv-block="b00244" className="text-[12.5px] text-foreground-secondary leading-[1.5]">
                        {platform === "windows" ? "Download ZIP, run install.bat." : "One terminal command."}
                      </div>
                      {/* pv-block-end:b00244 */}
                    {/* pv-editable-zone-end:z00084 */}
                  </button>
                  {/* pv-block-end:b00240 */}
                  
                  {/* pv-block-start:b00245 */}
                  <button
                    data-pv-block="b00245"
                    role="tab"
                    aria-selected={tab === "manual"}
                    className={`appearance-none text-left rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "manual" ? "bg-background-secondary text-white border-border-primary" : "border-border-secondary text-foreground-secondary hover:text-foreground-default"} bg-background-tertiary hover:border-border-strong border-2`}
                    onClick={() => setTab("manual")}>
                    {/* pv-editable-zone-start:z00086 */}
                      {/* pv-block-start:b00246 */}
                      <div data-pv-block="b00246" className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
                        {/* pv-editable-zone-start:z00087 */}
                          {/* pv-block-start:b00248 */}
                          <span data-pv-block="b00248">
                            Manual installation
                          </span>
                          {/* pv-block-end:b00248 */}
                        {/* pv-editable-zone-end:z00087 */}
                      </div>
                      {/* pv-block-end:b00246 */}
                      {/* pv-block-start:b00249 */}
                      <div data-pv-block="b00249" className="text-[12.5px] text-foreground-secondary leading-[1.5]">For devs comfortable with git and npm.</div>
                      {/* pv-block-end:b00249 */}
                    {/* pv-editable-zone-end:z00086 */}
                  </button>
                  {/* pv-block-end:b00245 */}
                {/* pv-editable-zone-end:z00083 */}
              </div>
              )}
              {/* pv-block-end:b00239 */}

              {/* pv-block-start:b00250 */}
              {platform && (
              <div data-pv-block="b00250" className="relative z-[1]">
                {/* pv-editable-zone-start:z00088 */}
                  {/* pv-block-start:b00251 */}
                  {tab === "auto" && platform === "mac" && (
                    <>
                      {/* pv-block-start:b00252 */}
                      <div data-pv-block="b00252" className="font-semibold text-[12.5px] mb-[10px] flex items-center gap-[8px] text-foreground-default">
                        {/* pv-editable-zone-start:zstp01 */}
                          {/* pv-block-start:nbas01 */}
                          <span data-pv-block="nbas01" className="inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 bg-background-tertiary text-foreground-secondary text-xs p-2 h-6">
                            Step 1
                          </span>
                          {/* pv-block-end:nbas01 */}
                          {/* pv-block-start:stxt01 */}
                          <span data-pv-block="stxt01">Run this in your terminal:</span>
                          {/* pv-block-end:stxt01 */}
                        {/* pv-editable-zone-end:zstp01 */}
                      </div>
                      {/* pv-block-end:b00252 */}
                      {/* pv-block-start:b00253 */}
                      <div data-pv-block="b00253" className="bg-background-sunken border-border-secondary rounded-[10px] font-mono text-[13px] text-foreground-strong leading-[1.55] overflow-auto flex items-center gap-[10px] p-3">
                        {/* pv-editable-zone-start:z00089 */}
                          {/* pv-block-start:9ioxu8 */}
                          <Icon data-pv-block="9ioxu8" iconSymbol="mdi:dollar" size="sm" className="shrink-0 text-foreground-primary mt-[1px]" />
                          {/* pv-block-end:9ioxu8 */}
                          {/* pv-block-start:b00255 */}
                          <code data-pv-block="b00255">{installCommand}</code>
                          {/* pv-block-end:b00255 */}
                        {/* pv-editable-zone-end:z00089 */}
                      </div>
                      {/* pv-block-end:b00253 */}

                      {/* pv-block-start:auto12 */}
                      <div data-pv-block="auto12" className="flex gap-[10px] items-start p-[12px_14px] rounded-[10px] border-0 border-border-default bg-background-secondary mt-2">
                        {/* pv-editable-zone-start:zauto5 */}
                          {/* pv-block-start:autoic */}
                          <Icon data-pv-block="autoic" iconSymbol="mdi:lightbulb-on-outline" size="sm" className="shrink-0 text-foreground-primary mt-[1px]" />
                          {/* pv-block-end:autoic */}
                          {/* pv-block-start:autotx */}
                          <span data-pv-block="autotx" className="text-[13px] text-foreground-secondary leading-[1.55]">
                            Don't want to use a terminal yourself? Paste the command into your coding agent (Claude Code, Cursor, Copilot, Gemini CLI) and ask it to run the script. It'll do exactly the same thing.
                          </span>
                          {/* pv-block-end:autotx */}
                        {/* pv-editable-zone-end:zauto5 */}
                      </div>
                      {/* pv-block-end:auto12 */}

                      {/* pv-block-start:cpybtn */}
                      <button
                        data-pv-block="cpybtn"
                        onClick={onCopy}
                        className="mt-[12px] appearance-none border-0 bg-background-primary text-white font-inherit font-semibold text-[14px] p-[10px_18px] rounded-[9px] inline-flex items-center gap-[8px] cursor-pointer transition-transform duration-150 hover:-translate-y-[1px] shadow-[0_8px_28px_-10px_rgba(61,123,255,0.6)]">
                        {/* pv-editable-zone-start:zcpy01 */}
                          {/* pv-block-start:cpyico */}
                          <Icon data-pv-block="cpyico" iconSymbol={copied ? "mdi:check" : "mdi:content-copy"} size="sm" />
                          {/* pv-block-end:cpyico */}
                          {/* pv-block-start:cpylbl */}
                          <span data-pv-block="cpylbl">{copied ? "Copied!" : "Copy command"}</span>
                          {/* pv-block-end:cpylbl */}
                        {/* pv-editable-zone-end:zcpy01 */}
                      </button>
                      {/* pv-block-end:cpybtn */}
                      {/* pv-block-start:wfo39x */}
                      <div data-pv-block="wfo39x" className="font-semibold text-[12.5px] mt-6 mb-2 flex items-center gap-[8px] text-foreground-default">
                        {/* pv-editable-zone-start:zstp02 */}
                          {/* pv-block-start:kqfogw */}
                          <span data-pv-block="kqfogw" className="inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 bg-background-tertiary text-foreground-secondary text-xs p-2 h-6">
                            Step 2
                          </span>
                          {/* pv-block-end:kqfogw */}
                          {/* pv-block-start:stxt02 */}
                          <span data-pv-block="stxt02">Drag Protovibe.app into Applications folder</span>
                          {/* pv-block-end:stxt02 */}
                        {/* pv-editable-zone-end:zstp02 */}
                      </div>
                      {/* pv-block-end:wfo39x */}
                      {/* pv-block-start:sgaea1 */}
                      <div data-pv-block="sgaea1" className="w-full bg-[url('/src/images/from-protovibe/image.png')] bg-contain bg-center bg-no-repeat aspect-[410/151] rounded mt-0" />
                      {/* pv-block-end:sgaea1 */}

                    </>
                  )}
                  {/* pv-block-end:b00251 */}

                  {/* pv-block-start:winauto */}
                  {tab === "auto" && platform === "windows" && (
                    <>
                      {/* pv-block-start:wins01 */}
                      <div data-pv-block="wins01" className="font-semibold text-[12.5px] mb-[10px] flex items-center gap-[8px] text-foreground-default">
                        {/* pv-editable-zone-start:zwins1 */}
                          {/* pv-block-start:winsb1 */}
                          <span data-pv-block="winsb1" className="inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 bg-background-tertiary text-foreground-secondary text-xs p-2 h-6">
                            Step 1
                          </span>
                          {/* pv-block-end:winsb1 */}
                          {/* pv-block-start:winst1 */}
                          <span data-pv-block="winst1">Download the project as a ZIP and unzip it</span>
                          {/* pv-block-end:winst1 */}
                        {/* pv-editable-zone-end:zwins1 */}
                      </div>
                      {/* pv-block-end:wins01 */}
                      {/* pv-block-start:winzip */}
                      <a data-pv-block="winzip" href={windowsZipUrl} className="appearance-none border-0 bg-background-primary text-white font-inherit no-underline font-semibold text-[14px] p-[10px_18px] rounded-[9px] inline-flex items-center gap-[8px] cursor-pointer transition-transform duration-150 hover:-translate-y-[1px] shadow-[0_8px_28px_-10px_rgba(61,123,255,0.6)]">
                        {/* pv-editable-zone-start:zwzip */}
                          {/* pv-block-start:winzii */}
                          <Icon data-pv-block="winzii" iconSymbol="mdi:download" size="sm" />
                          {/* pv-block-end:winzii */}
                          {/* pv-block-start:winzil */}
                          <span data-pv-block="winzil">Download ZIP</span>
                          {/* pv-block-end:winzil */}
                        {/* pv-editable-zone-end:zwzip */}
                      </a>
                      {/* pv-block-end:winzip */}

                      {/* pv-block-start:wins02 */}
                      <div data-pv-block="wins02" className="font-semibold text-[12.5px] mt-6 mb-2 flex items-center gap-[8px] text-foreground-default">
                        {/* pv-editable-zone-start:zwins2 */}
                          {/* pv-block-start:winsb2 */}
                          <span data-pv-block="winsb2" className="inline-flex items-center justify-center rounded-full font-bold leading-none shrink-0 bg-background-tertiary text-foreground-secondary text-xs p-2 h-6">
                            Step 2
                          </span>
                          {/* pv-block-end:winsb2 */}
                          {/* pv-block-start:winst2 */}
                          <span data-pv-block="winst2">Double-click <code className="font-mono text-[12.5px] px-[6px] py-[1px] rounded-[4px] bg-background-sunken text-foreground-strong">install.bat</code> inside the unzipped folder</span>
                          {/* pv-block-end:winst2 */}
                        {/* pv-editable-zone-end:zwins2 */}
                      </div>
                      {/* pv-block-end:wins02 */}

                      {/* pv-block-start:winhint */}
                      <div data-pv-block="winhint" className="flex gap-[10px] items-start p-[12px_14px] rounded-[10px] border-0 border-border-default bg-background-secondary mt-2">
                        {/* pv-editable-zone-start:zwhint */}
                          {/* pv-block-start:winhic */}
                          <Icon data-pv-block="winhic" iconSymbol="mdi:lightbulb-on-outline" size="sm" className="shrink-0 text-foreground-primary mt-[1px]" />
                          {/* pv-block-end:winhic */}
                          {/* pv-block-start:winhtx */}
                          <span data-pv-block="winhtx" className="text-[13px] text-foreground-secondary leading-[1.55]">
                            The script installs Node.js and the Protovibe dependencies for you, then drops a Protovibe shortcut on your desktop. If Windows SmartScreen warns about the file, click <b className="font-semibold text-foreground-strong">More info → Run anyway</b>.
                          </span>
                          {/* pv-block-end:winhtx */}
                        {/* pv-editable-zone-end:zwhint */}
                      </div>
                      {/* pv-block-end:winhint */}
                    </>
                  )}
                  {/* pv-block-end:winauto */}

                  {/* pv-block-start:b00260 */}
                  {tab === "manual" && (
                    <>
                      {/* pv-block-start:man01 */}
                      <div data-pv-block="man01" className="font-semibold text-[12.5px] text-foreground-secondary mb-[10px]">
                        Clone the repo
                      </div>
                      {/* pv-block-end:man01 */}
                      {/* pv-block-start:man02 */}
                      <div data-pv-block="man02" className="bg-background-sunken border-border-secondary rounded-[10px] p-[14px_16px] font-mono text-[13px] text-foreground-strong leading-[1.55] overflow-auto flex items-center gap-[10px]">
                        {/* pv-editable-zone-start:zman1 */}
                          {/* pv-block-start:man03 */}
                          <span data-pv-block="man03" className="font-bold shrink-0 text-foreground-primary">$</span>
                          {/* pv-block-end:man03 */}
                          {/* pv-block-start:man04 */}
                          <code data-pv-block="man04">{`git clone https://github.com/Protovibe-Studio/protovibe-studio.git && cd protovibe-studio`}</code>
                          {/* pv-block-end:man04 */}
                        {/* pv-editable-zone-end:zman1 */}
                      </div>
                      {/* pv-block-end:man02 */}

                      {/* pv-block-start:man05 */}
                      <div data-pv-block="man05" className="mt-[16px] font-semibold text-[12.5px] text-foreground-secondary mb-[10px]">
                        Install dependencies and start Protovibe
                      </div>
                      {/* pv-block-end:man05 */}
                      {/* pv-block-start:man06 */}
                      <div data-pv-block="man06" className="bg-background-sunken border-border-secondary rounded-[10px] p-[14px_16px] font-mono text-[13px] text-foreground-strong leading-[1.55] overflow-auto flex items-center gap-[10px]">
                        {/* pv-editable-zone-start:zman2 */}
                          {/* pv-block-start:man07 */}
                          <span data-pv-block="man07" className="font-bold shrink-0 text-foreground-primary">$</span>
                          {/* pv-block-end:man07 */}
                          {/* pv-block-start:man08 */}
                          <code data-pv-block="man08">pnpm install && pnpm dev</code>
                          {/* pv-block-end:man08 */}
                        {/* pv-editable-zone-end:zman2 */}
                      </div>
                      {/* pv-block-end:man06 */}

                      {/* pv-block-start:man11 */}
                      <div data-pv-block="man11" className="mt-[16px] text-[13px] text-foreground-secondary leading-[1.55] p-[12px_14px] rounded-[10px] border-border-secondary bg-background-secondary">
                        With the manual setup you'll need to run <code className="font-mono text-[12.5px] px-[6px] py-[1px] rounded-[4px] bg-background-sunken text-foreground-strong">pnpm&nbsp;dev</code> every time you want to launch Protovibe. If you'd rather get a desktop launcher, you can still run <code className="font-mono text-[12.5px] px-[6px] py-[1px] rounded-[4px] bg-background-sunken text-foreground-strong">{platform === "windows" ? "install.bat" : "bash install.sh"}</code> from the project folder.
                      </div>
                      {/* pv-block-end:man11 */}
                    </>
                  )}
                  {/* pv-block-end:b00260 */}

                  {/* pv-block-start:faq01 */}
                  <div data-pv-block="faq01" className="mt-[28px] pt-[12px] border-border-secondary flex flex-col border-t-0">
                    {/* pv-editable-zone-start:zfaq1 */}
                      {/* pv-block-start:faqs0 */}
                      <details data-pv-block="faqs0" className="border-b border-border-secondary group">
                        {/* pv-editable-zone-start:zfaqs0 */}
                          {/* pv-block-start:faqs0a */}
                          <summary data-pv-block="faqs0a" className="list-none cursor-pointer py-[14px] px-[4px] flex items-center justify-between gap-[16px] font-secondary font-semibold text-[14px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white [&::-webkit-details-marker]:hidden">
                            {/* pv-editable-zone-start:zfaqs0a */}
                              {/* pv-block-start:faqs0t */}
                              <span data-pv-block="faqs0t">
                                What is installed, step by step?
                              </span>
                              {/* pv-block-end:faqs0t */}
                              {/* pv-block-start:faqs0i */}
                              <Icon data-pv-block="faqs0i" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                              {/* pv-block-end:faqs0i */}
                            {/* pv-editable-zone-end:zfaqs0a */}
                          </summary>
                          {/* pv-block-end:faqs0a */}

                          {/* pv-block-start:faqs0b */}
                          <ol data-pv-block="faqs0b" className="list-none p-0 px-[4px] pb-[20px] m-0 flex flex-col gap-[10px]">
                            {/* pv-editable-zone-start:zfaqs0b */}
                              {/* pv-block-start:auto03 */}
                              <li data-pv-block="auto03" className="flex gap-[12px] items-start text-[14px] leading-[1.55] text-foreground-default">
                                {/* pv-editable-zone-start:zauto2 */}
                                  {/* pv-block-start:auto04 */}
                                  <span data-pv-block="auto04" className="shrink-0 w-[22px] h-[22px] rounded-full bg-background-tertiary text-foreground-strong text-[12px] font-semibold inline-flex items-center justify-center mt-[1px]">1</span>
                                  {/* pv-block-end:auto04 */}
                                  {/* pv-block-start:auto05 */}
                                  <span data-pv-block="auto05">Checks if you have Node.js. If not, it installs it for you — no manual setup.</span>
                                  {/* pv-block-end:auto05 */}
                                {/* pv-editable-zone-end:zauto2 */}
                              </li>
                              {/* pv-block-end:auto03 */}

                              {/* pv-block-start:auto06 */}
                              <li data-pv-block="auto06" className="flex gap-[12px] items-start text-[14px] leading-[1.55] text-foreground-default">
                                {/* pv-editable-zone-start:zauto3 */}
                                  {/* pv-block-start:auto07 */}
                                  <span data-pv-block="auto07" className="shrink-0 w-[22px] h-[22px] rounded-full bg-background-tertiary text-foreground-strong text-[12px] font-semibold inline-flex items-center justify-center mt-[1px]">2</span>
                                  {/* pv-block-end:auto07 */}
                                  {/* pv-block-start:auto08 */}
                                  <span data-pv-block="auto08">Downloads Protovibe and gets it ready to run on your computer.</span>
                                  {/* pv-block-end:auto08 */}
                                {/* pv-editable-zone-end:zauto3 */}
                              </li>
                              {/* pv-block-end:auto06 */}

                              {/* pv-block-start:auto09 */}
                              <li data-pv-block="auto09" className="flex gap-[12px] items-start text-[14px] leading-[1.55] text-foreground-default">
                                {/* pv-editable-zone-start:zauto4 */}
                                  {/* pv-block-start:auto10 */}
                                  <span data-pv-block="auto10" className="shrink-0 w-[22px] h-[22px] rounded-full bg-background-tertiary text-foreground-strong text-[12px] font-semibold inline-flex items-center justify-center mt-[1px]">3</span>
                                  {/* pv-block-end:auto10 */}
                                  {/* pv-block-start:auto11 */}
                                  {platform === "windows" ? (
                                    <span data-pv-block="auto11">Creates a <b className="font-semibold text-foreground-strong">Protovibe</b> shortcut on your desktop. Done — double-click it like any other app.</span>
                                  ) : (
                                    <span data-pv-block="auto11">Opens a familiar window where you drag <b className="font-semibold text-foreground-strong">Protovibe.app</b> into your <b className="font-semibold text-foreground-strong">Applications</b> folder. Done — launch it like any other app.</span>
                                  )}
                                  {/* pv-block-end:auto11 */}
                                {/* pv-editable-zone-end:zauto4 */}
                              </li>
                              {/* pv-block-end:auto09 */}
                            {/* pv-editable-zone-end:zfaqs0b */}
                          </ol>
                          {/* pv-block-end:faqs0b */}
                        {/* pv-editable-zone-end:zfaqs0 */}
                      </details>
                      {/* pv-block-end:faqs0 */}

                      {/* pv-block-start:faq03 */}
                      <details data-pv-block="faq03" className="border-b border-border-secondary group">
                        {/* pv-editable-zone-start:zfaq2 */}
                          {/* pv-block-start:faq04 */}
                          <summary data-pv-block="faq04" className="list-none cursor-pointer py-[14px] px-[4px] flex items-center justify-between gap-[16px] font-secondary font-semibold text-[14px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white [&::-webkit-details-marker]:hidden">
                            {/* pv-editable-zone-start:zfaq2b */}
                              {/* pv-block-start:faq04a */}
                              <span data-pv-block="faq04a">{platform === "windows" ? "Why install via a ZIP and a .bat file?" : "Why install through the terminal?"}</span>
                              {/* pv-block-end:faq04a */}
                              {/* pv-block-start:faq04b */}
                              <Icon data-pv-block="faq04b" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                              {/* pv-block-end:faq04b */}
                            {/* pv-editable-zone-end:zfaq2b */}
                          </summary>
                          {/* pv-block-end:faq04 */}
                          {/* pv-block-start:faq05 */}
                          <div data-pv-block="faq05" className="px-[4px] pb-[20px] text-[14px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">{platform === "windows" ? "We're working on a one-click installer, but for now the ZIP + install.bat combo is the most reliable way to set up the development dependencies Protovibe runs on (Node, pnpm, the project itself). Two clicks and the script does the rest." : "We're working on a one-click installer, but for now the terminal is the most reliable way to set up the development dependencies Protovibe runs on (Node, pnpm, the project itself). It's one paste — and the script does the rest."}</div>
                          {/* pv-block-end:faq05 */}
                        {/* pv-editable-zone-end:zfaq2 */}
                      </details>
                      {/* pv-block-end:faq03 */}

                      {/* pv-block-start:faq06 */}
                      <details data-pv-block="faq06" className="border-b border-border-secondary group">
                        {/* pv-editable-zone-start:zfaq3 */}
                          {/* pv-block-start:faq07 */}
                          <summary data-pv-block="faq07" className="list-none cursor-pointer py-[14px] px-[4px] flex items-center justify-between gap-[16px] font-secondary font-semibold text-[14px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white [&::-webkit-details-marker]:hidden">
                            {/* pv-editable-zone-start:zfaq3b */}
                              {/* pv-block-start:faq07a */}
                              <span data-pv-block="faq07a">What exactly does this script do?</span>
                              {/* pv-block-end:faq07a */}
                              {/* pv-block-start:faq07b */}
                              <Icon data-pv-block="faq07b" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                              {/* pv-block-end:faq07b */}
                            {/* pv-editable-zone-end:zfaq3b */}
                          </summary>
                          {/* pv-block-end:faq07 */}
                          {/* pv-block-start:faq08 */}
                          <div data-pv-block="faq08" className="px-[4px] pb-[20px] text-[14px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">
                            {platform === "windows" ? (
                              <>Everything is open and readable. The install logic lives in <a className="text-foreground-primary underline hover:no-underline" href="https://github.com/Protovibe-Studio/protovibe-studio/blob/main/install.bat" target="_blank" rel="noreferrer">install.bat</a> at the root of the project. If you'd like a second opinion, paste the file into your coding agent and ask it to walk you through what each line does.</>
                            ) : (
                              <>Everything is open and readable. The main install logic lives in <a className="text-foreground-primary underline hover:no-underline" href="https://github.com/Protovibe-Studio/protovibe-studio/blob/main/install.sh" target="_blank" rel="noreferrer">install.sh</a>, and the curl one-liner just downloads and runs it via <a className="text-foreground-primary underline hover:no-underline" href="https://github.com/Protovibe-Studio/protovibe-studio/blob/main/init-installation-via-curl.sh" target="_blank" rel="noreferrer">init-installation-via-curl.sh</a>. If you'd like a second opinion, paste either file into your coding agent and ask it to walk you through what each line does.</>
                            )}
                          </div>
                          {/* pv-block-end:faq08 */}
                        {/* pv-editable-zone-end:zfaq3 */}
                      </details>
                      {/* pv-block-end:faq06 */}
                    {/* pv-editable-zone-end:zfaq1 */}
                  </div>
                  {/* pv-block-end:faq01 */}
                {/* pv-editable-zone-end:z00088 */}
              </div>
              )}
              {/* pv-block-end:b00250 */}
            {/* pv-editable-zone-end:z00081 */}
          </div>
          {/* pv-block-end:b00232 */}
        {/* pv-editable-zone-end:z00080 */}
      </div>
      {/* pv-block-end:b00231 */}
    </>
  );
}

function FooterCTA(props: any) {
  return (
      <section {...props} data-pv-component-id="FooterCTA" className="relative pt-[140px] text-center z-[2]">
        {/* pv-editable-zone-start:z00095 */}
          {/* pv-block-start:b00272 */}
          <div data-pv-block="b00272" className="relative z-[2]">
            {/* pv-editable-zone-start:z00096 */}
              {/* pv-block-start:b00273 */}
              <h2 data-pv-block="b00273" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong max-w-[16ch] mx-auto mb-[40px] text-balance">
                Stop describing pixels.<br /> <span className="text-foreground-primary">
                  Start protovibing.
                </span>
              </h2>
              {/* pv-block-end:b00273 */}
              
              {/* pv-block-start:oc6h0r */}
              <div data-pv-block="oc6h0r" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:160ms] flex gap-[12px] mt-[36px] flex-wrap justify-center items-stretch min-w-64 flex-row max-md:flex-col max-md:flex-nowrap max-md:w-full max-md:max-w-[320px] max-md:mx-auto">
                {/* pv-editable-zone-start:z00108 */}
                  {/* pv-block-start:qnw0mp */}
                  <Button rightIcon="mdi:arrow-right" data-pv-block="qnw0mp" data-install label="Install now" variant="solid" color="primary" size="lg" />
                  {/* pv-block-end:qnw0mp */}

                  {/* pv-block-start:s7lvih */}
                  <Button leftIcon="mdi:github" data-pv-block="s7lvih" label="Star on GitHub" variant="solid" color="neutral" size="lg" />
                  {/* pv-block-end:s7lvih */}
                {/* pv-editable-zone-end:z00108 */}
              </div>
              {/* pv-block-end:oc6h0r */}

              {/* pv-block-start:9v1h92 */}
              <div data-pv-block="9v1h92" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:240ms] flex justify-center mt-4">
                {/* pv-editable-zone-start:z00109 */}
                  {/* pv-block-start:1w0i0u */}
                  <div data-pv-block="1w0i0u" className="inline-flex items-center gap-[8px] text-[12px] text-foreground-secondary px-[14px] py-[7px] rounded-full font-sans bg-transparent mt-3">
                    {/* pv-editable-zone-start:z00110 */}
                      {/* pv-block-start:fcw6t7 */}
                      <span data-pv-block="fcw6t7" className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite] bg-background-primary shadow-[0_0_12px_rgba(61,123,255,1)]" />
                      {/* pv-block-end:fcw6t7 */}
                      {/* pv-block-start:l5rgvs */}
                      <span data-pv-block="l5rgvs">
                        Open-source • AGPL-3.0 • Runs locally
                      </span>
                      {/* pv-block-end:l5rgvs */}
                    {/* pv-editable-zone-end:z00110 */}
                  </div>
                  {/* pv-block-end:1w0i0u */}
                {/* pv-editable-zone-end:z00109 */}
              </div>
              {/* pv-block-end:9v1h92 */}
            {/* pv-editable-zone-end:z00096 */}
          </div>
          {/* pv-block-end:b00272 */}

          {/* pv-block-start:b00282 */}
          <div data-pv-block="b00282" className="relative z-[3] mt-[140px] px-[40px] py-[32px] pb-[20px] max-w-[1240px] mx-auto grid-cols-1 text-center md:text-left md:grid-cols-[auto_1fr_auto] gap-[16px] md:gap-[32px] items-center text-[13px] text-foreground-secondary max-md:py-[40px] max-md:px-[20px] max-md:pb-[24px] before:content-[''] before:absolute before:-left-[50vw] before:-right-[50vw] before:top-0 before:-bottom-[100px] before:bg-gradient-to-b before:from-transparent before:to-background-default before:to-60% before:z-[-1] before:pointer-events-none after:content-[''] after:absolute after:left-0 after:right-0 after:top-0 after:h-[1px] after:bg-border-secondary flex flex-col">
            {/* pv-editable-zone-start:z00101 */}
              {/* pv-block-start:m1uo22 */}
              <Image data-pv-block="m1uo22" className="bg-cover bg-center bg-no-repeat bg-[url('/src/images/from-protovibe/protovibe-studio-logo.png')] aspect-[101/12] h-4 opacity-55" />
              {/* pv-block-end:m1uo22 */}
              {/* pv-block-start:b00290 */}
              <div data-pv-block="b00290" className="text-[12px] text-center text-balance md:text-right">
                © 2026 Protovibe Studio · Made with unreasonable care
              </div>
              {/* pv-block-end:b00290 */}
            {/* pv-editable-zone-end:z00101 */}
          </div>
          {/* pv-block-end:b00282 */}
        {/* pv-editable-zone-end:z00095 */}
      </section>
  );
}

function Hero(props: any) {
  return (
      <section {...props} data-pv-component-id="Hero" className="relative pt-[60px] pb-[80px] text-center">
        {/* pv-editable-zone-start:z00107 */}
          {/* pv-block-start:t4dgb7 */}
          <div data-pv-block="t4dgb7" className="flex flex-col gap-2 items-center pt-16">
            {/* pv-editable-zone-start:ger2rz */}
            {/* pv-block-start:b00305 */}
            <h1 data-pv-block="b00305" className="animate-[hero-rise_700ms_ease-out_both] leading-[0.98] max-w-[14ch] tracking-tighter font-secondary font-extrabold mx-auto text-[clamp(44px,9vw,72px)]">
              Design by hand.<br />Prototype with AI.<br /><span className="text-foreground-primary"> Stay pixel-perfect. </span>
            </h1>
            {/* pv-block-end:b00305 */}
            {/* pv-block-start:b00306 */}
            <p data-pv-block="b00306" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:80ms] text-[clamp(16px,1.3vw,19px)] text-foreground-default mt-6 mx-auto text-balance max-w-[75ch]">
              Protovibe Studio is the open-source tool for UX/UI designers who love the power of vibe-coding but refuse to hand off hallucinated slop. It runs locally in pure React, so you and your coding agent are finally on the same page.
            </p>
            {/* pv-block-end:b00306 */}
            {/* pv-block-start:b00307 */}
            <div data-pv-block="b00307" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:160ms] flex gap-[12px] mt-[36px] flex-wrap justify-center flex-col items-stretch min-w-64">
              {/* pv-editable-zone-start:z00108 */}
                {/* pv-block-start:jkwl83 */}
                <Button rightIcon="mdi:arrow-right" data-pv-block="jkwl83" data-install label="Install now" variant="solid" color="primary" size="lg" />
                {/* pv-block-end:jkwl83 */}

                {/* pv-block-start:jppuwr */}
                <Button leftIcon="carbon:demo" data-pv-block="jppuwr" label="Demo in Codesandbox" variant="solid" color="neutral" size="lg" />
                {/* pv-block-end:jppuwr */}

                {/* pv-block-start:twnfpe */}
                <Button leftIcon="mdi:github" data-pv-block="twnfpe" label="Star on GitHub" variant="ghost" color="neutral" size="lg" />
                {/* pv-block-end:twnfpe */}
              {/* pv-editable-zone-end:z00108 */}
            </div>
            {/* pv-block-end:b00307 */}
            {/* pv-editable-zone-end:ger2rz */}
          </div>
          {/* pv-block-end:t4dgb7 */}

          {/* pv-block-start:b00310 */}
          <div data-pv-block="b00310" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:240ms] flex justify-center mt-4">
            {/* pv-editable-zone-start:z00109 */}
              {/* pv-block-start:b00311 */}
              <div data-pv-block="b00311" className="inline-flex items-center gap-[8px] text-[12px] text-foreground-secondary px-[14px] py-[7px] rounded-full font-sans bg-transparent mt-3">
                {/* pv-editable-zone-start:z00110 */}
                  {/* pv-block-start:b00312 */}
                  <span data-pv-block="b00312" className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite] bg-background-primary shadow-[0_0_12px_rgba(61,123,255,1)]" />
                  {/* pv-block-end:b00312 */}
                  {/* pv-block-start:b00313 */}
                  <span data-pv-block="b00313">
                    Open-source • AGPL-3.0 • Runs locally
                  </span>
                  {/* pv-block-end:b00313 */}
                {/* pv-editable-zone-end:z00110 */}
              </div>
              {/* pv-block-end:b00311 */}
            {/* pv-editable-zone-end:z00109 */}
          </div>
          {/* pv-block-end:b00310 */}

          {/* pv-block-start:b00314 */}
          <div data-pv-block="b00314" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:320ms] relative mt-[72px] mx-auto flex-1 rounded-lg border-border-default border">
            {/* pv-editable-zone-start:z00111 */}
              {/* pv-block-start:b00315 */}
              <div data-pv-block="b00315" className="absolute left-[-30%] right-[-30%] top-[-75%] bottom-[5%] z-0 blur-[130px] opacity-[0.78] pointer-events-none animate-[glow-breathe_10s_ease-in-out_infinite]" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, #000 50%, #000 100%)' }}>
                {/* pv-editable-zone-start:z00112 */}
                  {/* pv-block-start:b00316 */}
                  <div data-pv-block="b00316" className="absolute left-[5%] top-[18%] w-[55%] h-[78%] rounded-full opacity-95" style={{ background: 'radial-gradient(circle, oklch(0.58 0.19 265), transparent 70%)' }} />
                  {/* pv-block-end:b00316 */}
                  {/* pv-block-start:b00317 */}
                  <div data-pv-block="b00317" className="absolute right-[5%] top-[14%] w-[55%] h-[82%] rounded-full opacity-90" style={{ background: 'radial-gradient(circle, oklch(0.54 0.16 305), oklch(0.48 0.13 285) 50%, transparent 75%)' }} />
                  {/* pv-block-end:b00317 */}
                  {/* pv-block-start:b00318 */}
                  <div data-pv-block="b00318" className="absolute left-[30%] top-[8%] w-[40%] h-[60%] rounded-full opacity-65" style={{ background: 'radial-gradient(circle, oklch(0.58 0.13 335), transparent 70%)' }} />
                  {/* pv-block-end:b00318 */}
                {/* pv-editable-zone-end:z00112 */}
              </div>
              {/* pv-block-end:b00315 */}

              {/* pv-block-start:b00319 */}
              <ProtovibeMockup data-pv-block="b00319" />
              {/* pv-block-end:b00319 */}
            {/* pv-editable-zone-end:z00111 */}
          </div>
          {/* pv-block-end:b00314 */}
        {/* pv-editable-zone-end:z00107 */}
      </section>
  );
}

function Testimonial(props: any) {
  return (
      <section {...props} data-pv-component-id="Testimonial" className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out max-w-[880px] mx-auto sm:py-[96px] sm:px-[20px] grid grid-cols-1 sm:grid-cols-[56px_1fr] gap-[16px] sm:gap-x-[28px] sm:gap-y-[32px] items-start py-64px pl-8 pr-0">
        {/* pv-editable-zone-start:z00113 */}
          {/* pv-block-start:b00322 */}
          <span data-pv-block="b00322" className="font-secondary font-extrabold text-[64px] sm:text-[88px] leading-none opacity-85 pointer-events-none select-none sm:-mt-[14px] self-start text-foreground-primary" aria-hidden="true">"</span>
          {/* pv-block-end:b00322 */}

          {/* pv-block-start:b00323 */}
          <div data-pv-block="b00323" className="flex flex-col gap-[32px]">
            {/* pv-editable-zone-start:z00114 */}
              {/* pv-block-start:b00324 */}
              <p data-pv-block="b00324" className="font-secondary font-semibold text-[clamp(22px,2.4vw,32px)] leading-[1.35] tracking-[-0.02em] text-foreground-strong m-0">
                We've tried to combine the best parts of <em className="not-italic font-secondary font-semibold text-foreground-primary">Webflow</em>, <em className="not-italic font-secondary font-semibold text-foreground-primary">Figma</em> and a pro <span className="text-foreground-primary"> design system</span>. Hope you guys like it! Oh, and don't forget to send us your feedback.
              </p>
              {/* pv-block-end:b00324 */}

              {/* pv-block-start:b00325 */}
              <div data-pv-block="b00325" className="items-center gap-[14px] pt-[4px] flex -ml-[8px]">
                {/* pv-editable-zone-start:z00115 */}
                  {/* pv-block-start:oys63u */}
                  <Avatar className="bg-center bg-no-repeat bg-cover border bg-[url('/src/images/from-protovibe/screenshot-2026-04-30-at-103956.png')] aspect-[247/233]" data-pv-block="oys63u" initials="AB" size="xl" bgColor="default"  />
                  {/* pv-block-end:oys63u */}

                  {/* pv-block-start:b00327 */}
                  <div data-pv-block="b00327" className="flex flex-col gap-[2px]">
                    {/* pv-editable-zone-start:z00116 */}
                      {/* pv-block-start:b00328 */}
                      <div data-pv-block="b00328" className="text-foreground-strong font-semibold text-[15px]">
                        Protovibe Team
                      </div>
                      {/* pv-block-end:b00328 */}
                      {/* pv-block-start:b00329 */}
                      <div data-pv-block="b00329" className="text-foreground-secondary text-[13px]">
                        protovibe.studio@gmail.com
                      </div>
                      {/* pv-block-end:b00329 */}
                    {/* pv-editable-zone-end:z00116 */}
                  </div>
                  {/* pv-block-end:b00327 */}
                {/* pv-editable-zone-end:z00115 */}
              </div>
              {/* pv-block-end:b00325 */}
            {/* pv-editable-zone-end:z00114 */}
          </div>
          {/* pv-block-end:b00323 */}
        {/* pv-editable-zone-end:z00113 */}
      </section>
  );
}

// --- Main App ---

export default function App() {
  const [installOpen, setInstallOpen] = useState(false);
  useReveal();

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const el = target.closest('[data-install]');
      if (el) { e.preventDefault(); setInstallOpen(true); }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <>
    {/* pv-block-start:b00291 */}
    <div data-pv-block="b00291" data-theme="dark" className="bg-background-default text-foreground-default text-[16px] leading-[1.55] antialiased min-h-screen relative" style={{ textRendering: 'optimizeLegibility' }}>
      {/* pv-editable-zone-start:z00103 */}
        {/* pv-block-start:b00292 */}
        <style data-pv-block="b00292">{GLOBAL_STYLES}</style>
        {/* pv-block-end:b00292 */}

        {/* Grain */}
        {/* pv-block-start:b00293 */}
        <div data-pv-block="b00293" className="fixed inset-0 pointer-events-none z-[1] mix-blend-overlay opacity-100" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.018) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
        {/* pv-block-end:b00293 */}

        {/* Nav */}
        {/* pv-block-start:b00294 */}
        <nav data-pv-block="b00294" className="sticky top-0 z-50 flex items-center justify-between px-[20px] py-[14px] md:px-[40px] md:py-[18px] bg-gradient-to-b from-[#050509eb] via-[#05050999] to-transparent backdrop-blur-[8px]">
          {/* pv-editable-zone-start:z00104 */}
            {/* pv-block-start:96mqud */}
            <Image data-pv-block="96mqud" className="bg-cover bg-center bg-no-repeat bg-[url('/src/images/from-protovibe/protovibe-studio-logo.png')] aspect-[101/12] h-5" />
            {/* pv-block-end:96mqud */}
            
            {/* pv-block-start:b00296 */}
            <div data-pv-block="b00296" className="hidden md:flex gap-[28px] text-[14px] text-foreground-secondary ml-auto mr-[24px]">
              {/* pv-editable-zone-start:z00105 */}
                {/* pv-block-start:b00296a */}
                <a data-pv-block="b00296a" href="#problems" className="hover:text-foreground-strong">Why</a>
                {/* pv-block-end:b00296a */}
                {/* pv-block-start:b00299 */}
                <a data-pv-block="b00299" href="#features" className="hover:text-foreground-strong">Features</a>
                {/* pv-block-end:b00299 */}
                {/* pv-block-start:b00297 */}
                <a data-pv-block="b00297" href="#agents" className="hover:text-foreground-strong">AI Agents</a>
                {/* pv-block-end:b00297 */}
                {/* pv-block-start:b00298 */}
                <a data-pv-block="b00298" href="#prototyping" className="hover:text-foreground-strong">Prototyping</a>
                {/* pv-block-end:b00298 */}
                {/* pv-block-start:b00300 */}
                <a data-pv-block="b00300" href="#faq" className="hover:text-foreground-strong">FAQ</a>
                {/* pv-block-end:b00300 */}
                {/* pv-block-start:b00301 */}
                <a data-pv-block="b00301" href="https://github.com/Protovibe-Studio/protovibe-studio" target="_blank" rel="noreferrer" className="hover:text-foreground-strong">GitHub</a>
                {/* pv-block-end:b00301 */}
              {/* pv-editable-zone-end:z00105 */}
            </div>
            {/* pv-block-end:b00296 */}
            
            {/* pv-block-start:b00302 */}
            <a data-pv-block="b00302" className="appearance-none border-0 bg-[#f4f4f6] text-[#000] text-[13px] font-semibold px-[14px] py-[8px] rounded-[8px] transition-all duration-150 hover:-translate-y-[1px] hover:bg-white cursor-pointer" data-install>Install now</a>
            {/* pv-block-end:b00302 */}
          {/* pv-editable-zone-end:z00104 */}
        </nav>
        {/* pv-block-end:b00294 */}

        {/* Layout Shell */}
        {/* pv-block-start:b00303 */}
        <div data-pv-block="b00303" className="relative z-[2] mx-auto px-[20px] md:px-[40px] max-w-[1340px]">
          {/* pv-editable-zone-start:z00106 */}
            {/* Hero */}
            {/* pv-block-start:hr0001 */}
            <Hero data-pv-block="hr0001" />
            {/* pv-block-end:hr0001 */}

            {/* Powered by */}
            {/* pv-block-start:b00320 */}
            <PoweredBy className="" data-pv-block="b00320" />
            {/* pv-block-end:b00320 */}

            {/* Testimonial */}
            {/* pv-block-start:tm0001 */}
            <Testimonial data-pv-block="tm0001" />
            {/* pv-block-end:tm0001 */}

            {/* pv-block-start:b00330 */}
            <ProblemSolution data-pv-block="b00330" />
            {/* pv-block-end:b00330 */}

            {/* pv-block-start:fl0001 */}
            <FeaturesList data-pv-block="fl0001" />
            {/* pv-block-end:fl0001 */}

            {/* pv-block-start:b00331 */}
            <BYOAgent data-pv-block="b00331" />
            {/* pv-block-end:b00331 */}

            {/* pv-block-start:b00333 */}
            <FeatureGrid data-pv-block="b00333" />
            {/* pv-block-end:b00333 */}

            {/* pv-block-start:b00332 */}
            <HowItWorks data-pv-block="b00332" />
            {/* pv-block-end:b00332 */}

            {/* pv-block-start:b00335 */}
            <div data-pv-block="b00335" aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1500px] h-[1500px] pointer-events-none blur-[140px] opacity-[0.45] -z-10" style={{ background: 'radial-gradient(ellipse 45% 35% at 25% 75%, oklch(0.58 0.19 265), transparent 70%), radial-gradient(ellipse 45% 35% at 75% 75%, oklch(0.54 0.16 305), transparent 70%), radial-gradient(ellipse 55% 30% at 50% 60%, oklch(0.52 0.13 290), transparent 70%), radial-gradient(ellipse 70% 25% at 50% 95%, oklch(0.50 0.12 280), transparent 75%)' }} />
            {/* pv-block-end:b00335 */}

            {/* pv-block-start:b00337 */}
            <FAQ data-pv-block="b00337" />
            {/* pv-block-end:b00337 */}

            {/* pv-block-start:b00338 */}
            <FooterCTA data-pv-block="b00338" />
            {/* pv-block-end:b00338 */}
          {/* pv-editable-zone-end:z00106 */}
        </div>
        {/* pv-block-end:b00303 */}

        {/* pv-block-start:b00339 */}
        <InstallModal data-pv-block="b00339" open={installOpen} onClose={() => setInstallOpen(false)} />
        {/* pv-block-end:b00339 */}
      {/* pv-editable-zone-end:z00103 */}
    </div>
    {/* pv-block-end:b00291 */}
    </>
  );
}