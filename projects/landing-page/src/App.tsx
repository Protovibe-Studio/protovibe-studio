import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/icon';
import { Image } from '@/components/ui/image'

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
      <div data-pv-block="b00001" className="relative z-10 w-full aspect-video bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_40px_80px_-30px_rgba(0,0,0,.7),0_20px_40px_-15px_rgba(0,0,0,.6)] flex items-center justify-center text-foreground-tertiary font-semibold text-sm" role="img" aria-label="Protovibe app preview">
        Miejsce na grafikę
      </div>
      {/* pv-block-end:b00001 */}
    </>
  );
}

function FeatureGrid() {
  return (
    <>
      {/* pv-block-start:b00002 */}
      <section data-pv-block="b00002" className="py-[120px] relative" id="features">
        {/* pv-editable-zone-start:z00001 */}
          {/* pv-block-start:b00003 */}
          <div data-pv-block="b00003" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00002 */}
              {/* pv-block-start:b00004 */}
              <div data-pv-block="b00004" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">Features</div>
              {/* pv-block-end:b00004 */}
              {/* pv-block-start:b00005 */}
              <h2 data-pv-block="b00005" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Designed for people who care about the <em className="italic font-secondary font-bold text-foreground-strong">actual</em> pixels.
              </h2>
              {/* pv-block-end:b00005 */}
            {/* pv-editable-zone-end:z00002 */}
          </div>
          {/* pv-block-end:b00003 */}
          
          {/* pv-block-start:b00006 */}
          <div data-pv-block="b00006" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
            {/* pv-editable-zone-start:z00003 */}
              {/* pv-block-start:b00007 */}
              <div data-pv-block="b00007" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00004 */}
                  {/* pv-block-start:b00008 */}
                  <div data-pv-block="b00008" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">01 · agent</div>
                  {/* pv-block-end:b00008 */}
                  {/* pv-block-start:b00009 */}
                  <h3 data-pv-block="b00009" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">An AI that actually respects your design system.</h3>
                  {/* pv-block-end:b00009 */}
                  {/* pv-block-start:b00010 */}
                  <p data-pv-block="b00010" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">Protovibe's agent reads your tokens, components, and grid — and refuses to hardcode a single pixel. No rogue hex codes. No off-brand radii. No AI shit.</p>
                  {/* pv-block-end:b00010 */}
                  {/* pv-block-start:b00011 */}
                  <div data-pv-block="b00011" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00011 */}
                {/* pv-editable-zone-end:z00004 */}
              </div>
              {/* pv-block-end:b00007 */}

              {/* pv-block-start:b00012 */}
              <div data-pv-block="b00012" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00005 */}
                  {/* pv-block-start:b00013 */}
                  <div data-pv-block="b00013" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">02 · pixels</div>
                  {/* pv-block-end:b00013 */}
                  {/* pv-block-start:b00014 */}
                  <h3 data-pv-block="b00014" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">Pixel-perfect, not vibe-adjacent.</h3>
                  {/* pv-block-end:b00014 */}
                  {/* pv-block-start:b00015 */}
                  <p data-pv-block="b00015" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">Ship mocks that line up to the baseline, match component specs, and pass a designer's squint test. Because "roughly right" is the enemy.</p>
                  {/* pv-block-end:b00015 */}
                  {/* pv-block-start:b00016 */}
                  <div data-pv-block="b00016" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00016 */}
                {/* pv-editable-zone-end:z00005 */}
              </div>
              {/* pv-block-end:b00012 */}

              {/* pv-block-start:b00017 */}
              <div data-pv-block="b00017" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00006 */}
                  {/* pv-block-start:b00018 */}
                  <div data-pv-block="b00018" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">03 · prompt</div>
                  {/* pv-block-end:b00018 */}
                  {/* pv-block-start:b00019 */}
                  <h3 data-pv-block="b00019" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">Prompt like a designer. Commit like an engineer.</h3>
                  {/* pv-block-end:b00019 */}
                  {/* pv-block-start:b00020 */}
                  <p data-pv-block="b00020" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">Natural language in, real React + Tailwind out. Every change is a diff you can read, review, and roll back — not a black box.</p>
                  {/* pv-block-end:b00020 */}
                  {/* pv-block-start:b00021 */}
                  <div data-pv-block="b00021" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00021 */}
                {/* pv-editable-zone-end:z00006 */}
              </div>
              {/* pv-block-end:b00017 */}

              {/* pv-block-start:b00022 */}
              <div data-pv-block="b00022" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00007 */}
                  {/* pv-block-start:b00023 */}
                  <div data-pv-block="b00023" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">04 · control</div>
                  {/* pv-block-end:b00023 */}
                  {/* pv-block-start:b00024 */}
                  <h3 data-pv-block="b00024" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">You stay in the driver's seat.</h3>
                  {/* pv-block-end:b00024 */}
                  {/* pv-block-start:b00025 */}
                  <p data-pv-block="b00025" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">Inspect anything. Tweak props. Override the agent mid-thought. This isn't vibe-coding that runs away from you — it's you, just faster.</p>
                  {/* pv-block-end:b00025 */}
                  {/* pv-block-start:b00026 */}
                  <div data-pv-block="b00026" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00026 */}
                {/* pv-editable-zone-end:z00007 */}
              </div>
              {/* pv-block-end:b00022 */}

              {/* pv-block-start:b00027 */}
              <div data-pv-block="b00027" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00008 */}
                  {/* pv-block-start:b00028 */}
                  <div data-pv-block="b00028" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">05 · system</div>
                  {/* pv-block-end:b00028 */}
                  {/* pv-block-start:b00029 */}
                  <h3 data-pv-block="b00029" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">Brings your whole team up to spec.</h3>
                  {/* pv-block-end:b00029 */}
                  {/* pv-block-start:b00030 */}
                  <p data-pv-block="b00030" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">Import your component library once. Every prototype after that is on-brand by default. Consistency isn't a policy — it's the floor.</p>
                  {/* pv-block-end:b00030 */}
                  {/* pv-block-start:b00031 */}
                  <div data-pv-block="b00031" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00031 */}
                {/* pv-editable-zone-end:z00008 */}
              </div>
              {/* pv-block-end:b00027 */}

              {/* pv-block-start:b00032 */}
              <div data-pv-block="b00032" className="bg-background-secondary rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00009 */}
                  {/* pv-block-start:b00033 */}
                  <div data-pv-block="b00033" className="font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px] text-foreground-primary">06 · open</div>
                  {/* pv-block-end:b00033 */}
                  {/* pv-block-start:b00034 */}
                  <h3 data-pv-block="b00034" className="font-secondary font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_12px] text-balance">Open source. Yours, forever.</h3>
                  {/* pv-block-end:b00034 */}
                  {/* pv-block-start:b00035 */}
                  <p data-pv-block="b00035" className="text-[14.5px] text-foreground-secondary m-[0_0_24px] leading-[1.55] text-pretty">MIT-licensed. Runs on your computer, not ours. No telemetry, no accounts, no rug-pull. Fork it, extend it, ship it. Your prototypes never leave your machine unless you push them.</p>
                  {/* pv-block-end:b00035 */}
                  {/* pv-block-start:b00036 */}
                  <div data-pv-block="b00036" className="mt-auto h-[130px] bg-background-subtle border border-border-secondary rounded-[8px] flex items-center justify-center text-foreground-tertiary font-mono text-[10px]">Miejsce na grafikę</div>
                  {/* pv-block-end:b00036 */}
                {/* pv-editable-zone-end:z00009 */}
              </div>
              {/* pv-block-end:b00032 */}

            {/* pv-editable-zone-end:z00003 */}
          </div>
          {/* pv-block-end:b00006 */}
        {/* pv-editable-zone-end:z00001 */}
      </section>
      {/* pv-block-end:b00002 */}
    </>
  );
}

function LogoReact() {
  return (
    <>
      {/* pv-block-start:b00037 */}
      <div data-pv-block="b00037" className="inline-flex items-center gap-[10px] font-secondary font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00010 */}
          {/* pv-block-start:b00038 */}
          <svg data-pv-block="b00038" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <ellipse cx="12" cy="12" rx="10" ry="4" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
            </g>
          </svg>
          {/* pv-block-end:b00038 */}
          {/* pv-block-start:b00039 */}
          <span data-pv-block="b00039">React</span>
          {/* pv-block-end:b00039 */}
        {/* pv-editable-zone-end:z00010 */}
      </div>
      {/* pv-block-end:b00037 */}
      {/* pv-block-start:eum4ww */}
      <span data-pv-block="eum4ww" className="w-[4px] h-[4px] rounded-full bg-foreground-tertiary opacity-50 inline-block text-[0px]" aria-hidden="true"></span>
      {/* pv-block-end:eum4ww */}

      {/* pv-block-start:uxnkm4 */}
      <div data-pv-block="uxnkm4" className="inline-flex items-center gap-[10px] font-secondary font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00010 */}
          {/* pv-block-start:8wvffo */}
          <svg data-pv-block="8wvffo" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <g fill="none" stroke="currentColor" strokeWidth="1.1">
              <ellipse cx="12" cy="12" rx="10" ry="4" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
            </g>
          </svg>
          {/* pv-block-end:8wvffo */}
          {/* pv-block-start:2wckim */}
          <span data-pv-block="2wckim">
            pnpm
          </span>
          {/* pv-block-end:2wckim */}
        {/* pv-editable-zone-end:z00010 */}
      </div>
      {/* pv-block-end:uxnkm4 */}
    </>
  );
}

function LogoTailwind() {
  return (
    <>
      {/* pv-block-start:b00040 */}
      <div data-pv-block="b00040" className="inline-flex items-center gap-[10px] font-secondary font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00011 */}
          {/* pv-block-start:b00041 */}
          <svg data-pv-block="b00041" viewBox="0 0 32 20" width="28" height="18" aria-hidden="true">
            <path d="M8 2 Q12 -1 16 4 Q20 9 24 6 Q20 9 16 4 Q12 -1 8 2 Z M2 10 Q6 7 10 12 Q14 17 18 14 Q14 17 10 12 Q6 7 2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          {/* pv-block-end:b00041 */}
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
      <div data-pv-block="b00043" className="inline-flex items-center gap-[10px] font-secondary font-bold text-[22px] tracking-[-0.02em] text-foreground-strong opacity-92 transition-opacity duration-150 hover:opacity-100">
        {/* pv-editable-zone-start:z00012 */}
          {/* pv-block-start:b00044 */}
          <svg data-pv-block="b00044" viewBox="0 0 24 24" width="20" height="22" aria-hidden="true">
            <path d="M2 4 L22 4 L12 22 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M8 8 L16 8 L12 16 Z" fill="currentColor" opacity="0.7" />
          </svg>
          {/* pv-block-end:b00044 */}
          {/* pv-block-start:b00045 */}
          <span data-pv-block="b00045">Vite</span>
          {/* pv-block-end:b00045 */}
        {/* pv-editable-zone-end:z00012 */}
      </div>
      {/* pv-block-end:b00043 */}
    </>
  );
}

function PoweredBy() {
  return (
    <>
      {/* pv-block-start:b00046 */}
      <section data-pv-block="b00046" className="py-[56px] border-y border-border-secondary grid grid-cols-1 md:grid-cols-[minmax(120px,0.7fr)_auto_minmax(140px,0.9fr)] items-center gap-[24px] md:gap-[32px] text-center md:text-left max-md:py-[64px]">
        {/* pv-editable-zone-start:z00013 */}
          {/* pv-block-start:b00047 */}
          <div data-pv-block="b00047" className="font-bold text-[11px] tracking-[0.18em] uppercase text-foreground-tertiary md:text-right">
            Powered by
          </div>
          {/* pv-block-end:b00047 */}
          
          {/* pv-block-start:b00048 */}
          <div data-pv-block="b00048" className="flex items-center justify-center gap-[20px] flex-nowrap text-foreground-default">
            {/* pv-editable-zone-start:z00014 */}
              {/* pv-block-start:b00049 */}
              <LogoReact data-pv-block="b00049" />
              {/* pv-block-end:b00049 */}
              {/* pv-block-start:b00050 */}
              <span data-pv-block="b00050" className="w-[4px] h-[4px] rounded-full bg-foreground-tertiary opacity-50 inline-block text-[0px]" aria-hidden="true"></span>
              {/* pv-block-end:b00050 */}
              {/* pv-block-start:b00051 */}
              <LogoTailwind data-pv-block="b00051" />
              {/* pv-block-end:b00051 */}
              {/* pv-block-start:b00052 */}
              <span data-pv-block="b00052" className="w-[4px] h-[4px] rounded-full bg-foreground-tertiary opacity-50 inline-block text-[0px]" aria-hidden="true"></span>
              {/* pv-block-end:b00052 */}
              {/* pv-block-start:b00053 */}
              <LogoVite data-pv-block="b00053" />
              {/* pv-block-end:b00053 */}
            {/* pv-editable-zone-end:z00014 */}
          </div>
          {/* pv-block-end:b00048 */}

          {/* pv-block-start:b00054 */}
          <div data-pv-block="b00054" className="text-[13px] leading-[1.5] text-foreground-secondary max-w-[30ch] text-pretty max-md:mx-auto">
            Protovibe is a Vite plugin that makes the app visually editable by hand
          </div>
          {/* pv-block-end:b00054 */}
        {/* pv-editable-zone-end:z00013 */}
      </section>
      {/* pv-block-end:b00046 */}
    </>
  );
}

function BYOAgent() {
  return (
    <>
      {/* pv-block-start:b00055 */}
      <section data-pv-block="b00055" className="py-[100px]" id="agents">
        {/* pv-editable-zone-start:z00015 */}
          {/* pv-block-start:b00056 */}
          <div data-pv-block="b00056" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00016 */}
              {/* pv-block-start:b00057 */}
              <div data-pv-block="b00057" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">Bring your own agent</div>
              {/* pv-block-end:b00057 */}
              {/* pv-block-start:b00058 */}
              <h2 data-pv-block="b00058" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Your favourite agent. <em className="italic font-secondary font-bold text-foreground-strong">Your</em> way.
              </h2>
              {/* pv-block-end:b00058 */}
              {/* pv-block-start:b00059 */}
              <p data-pv-block="b00059" className="mt-[20px] text-[16px] text-foreground-secondary max-w-[56ch] mx-auto leading-[1.55] text-pretty">
                Protovibe doesn't ship its own AI. It plugs into the coding agent
                you already use and trust. No lock-in, no new API key, no extra
                subscription — your agent runs locally, your prompts stay yours.
              </p>
              {/* pv-block-end:b00059 */}
            {/* pv-editable-zone-end:z00016 */}
          </div>
          {/* pv-block-end:b00056 */}

          {/* pv-block-start:b00060 */}
          <div data-pv-block="b00060" className="grid grid-cols-2 md:grid-cols-3 gap-[16px] max-w-[920px] mx-auto">
            {/* pv-editable-zone-start:z00017 */}
              {/* pv-block-start:b00061 */}
              <div data-pv-block="b00061" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00018 */}
                  {/* pv-block-start:b00062 */}
                  <div data-pv-block="b00062" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">⟡</div>
                  {/* pv-block-end:b00062 */}
                  {/* pv-block-start:b00063 */}
                  <div data-pv-block="b00063" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">GitHub Copilot</div>
                  {/* pv-block-end:b00063 */}
                  {/* pv-block-start:b00064 */}
                  <div data-pv-block="b00064" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">cli + ide</div>
                  {/* pv-block-end:b00064 */}
                  {/* pv-block-start:b00065 */}
                  <div data-pv-block="b00065" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00065 */}
                {/* pv-editable-zone-end:z00018 */}
              </div>
              {/* pv-block-end:b00061 */}

              {/* pv-block-start:b00066 */}
              <div data-pv-block="b00066" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00019 */}
                  {/* pv-block-start:b00067 */}
                  <div data-pv-block="b00067" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">∗</div>
                  {/* pv-block-end:b00067 */}
                  {/* pv-block-start:b00068 */}
                  <div data-pv-block="b00068" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">Claude Code</div>
                  {/* pv-block-end:b00068 */}
                  {/* pv-block-start:b00069 */}
                  <div data-pv-block="b00069" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">terminal</div>
                  {/* pv-block-end:b00069 */}
                  {/* pv-block-start:b00070 */}
                  <div data-pv-block="b00070" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00070 */}
                {/* pv-editable-zone-end:z00019 */}
              </div>
              {/* pv-block-end:b00066 */}

              {/* pv-block-start:b00071 */}
              <div data-pv-block="b00071" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00020 */}
                  {/* pv-block-start:b00072 */}
                  <div data-pv-block="b00072" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">◇</div>
                  {/* pv-block-end:b00072 */}
                  {/* pv-block-start:b00073 */}
                  <div data-pv-block="b00073" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">Gemini CLI</div>
                  {/* pv-block-end:b00073 */}
                  {/* pv-block-start:b00074 */}
                  <div data-pv-block="b00074" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">terminal</div>
                  {/* pv-block-end:b00074 */}
                  {/* pv-block-start:b00075 */}
                  <div data-pv-block="b00075" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00075 */}
                {/* pv-editable-zone-end:z00020 */}
              </div>
              {/* pv-block-end:b00071 */}

              {/* pv-block-start:b00076 */}
              <div data-pv-block="b00076" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00021 */}
                  {/* pv-block-start:b00077 */}
                  <div data-pv-block="b00077" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">▸</div>
                  {/* pv-block-end:b00077 */}
                  {/* pv-block-start:b00078 */}
                  <div data-pv-block="b00078" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">Cursor</div>
                  {/* pv-block-end:b00078 */}
                  {/* pv-block-start:b00079 */}
                  <div data-pv-block="b00079" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">ide</div>
                  {/* pv-block-end:b00079 */}
                  {/* pv-block-start:b00080 */}
                  <div data-pv-block="b00080" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00080 */}
                {/* pv-editable-zone-end:z00021 */}
              </div>
              {/* pv-block-end:b00076 */}

              {/* pv-block-start:b00081 */}
              <div data-pv-block="b00081" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00022 */}
                  {/* pv-block-start:b00082 */}
                  <div data-pv-block="b00082" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">◦</div>
                  {/* pv-block-end:b00082 */}
                  {/* pv-block-start:b00083 */}
                  <div data-pv-block="b00083" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">Aider</div>
                  {/* pv-block-end:b00083 */}
                  {/* pv-block-start:b00084 */}
                  <div data-pv-block="b00084" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">terminal</div>
                  {/* pv-block-end:b00084 */}
                  {/* pv-block-start:b00085 */}
                  <div data-pv-block="b00085" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00085 */}
                {/* pv-editable-zone-end:z00022 */}
              </div>
              {/* pv-block-end:b00081 */}

              {/* pv-block-start:b00086 */}
              <div data-pv-block="b00086" className="bg-background-secondary rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-background-tertiary hover:-translate-y-[2px]">
                {/* pv-editable-zone-start:z00023 */}
                  {/* pv-block-start:b00087 */}
                  <div data-pv-block="b00087" className="text-[28px] leading-none mb-[14px] font-secondary font-bold text-foreground-primary">◼</div>
                  {/* pv-block-end:b00087 */}
                  {/* pv-block-start:b00088 */}
                  <div data-pv-block="b00088" className="font-secondary font-bold text-[18px] text-foreground-strong tracking-[-0.01em]">Codex</div>
                  {/* pv-block-end:b00088 */}
                  {/* pv-block-start:b00089 */}
                  <div data-pv-block="b00089" className="font-bold text-[10.5px] text-foreground-tertiary tracking-[0.16em] uppercase">cli</div>
                  {/* pv-block-end:b00089 */}
                  {/* pv-block-start:b00090 */}
                  <div data-pv-block="b00090" className="font-semibold text-[11px] tracking-[0.04em] mt-[10px] text-foreground-primary">✓ supported</div>
                  {/* pv-block-end:b00090 */}
                {/* pv-editable-zone-end:z00023 */}
              </div>
              {/* pv-block-end:b00086 */}

            {/* pv-editable-zone-end:z00017 */}
          </div>
          {/* pv-block-end:b00060 */}
          
          {/* pv-block-start:b00091 */}
          <div data-pv-block="b00091" className="mt-[36px] text-center text-[13.5px] text-foreground-secondary">
            + any agent that can read files and run a dev server. That's the whole spec.
          </div>
          {/* pv-block-end:b00091 */}
        {/* pv-editable-zone-end:z00015 */}
      </section>
      {/* pv-block-end:b00055 */}
    </>
  );
}

function HowItWorks() {
  return (
    <>
      {/* pv-block-start:b00092 */}
      <section data-pv-block="b00092" className="py-[120px] relative" id="how">
        {/* pv-editable-zone-start:z00024 */}
          {/* pv-block-start:b00093 */}
          <div data-pv-block="b00093" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00025 */}
              {/* pv-block-start:b00094 */}
              <div data-pv-block="b00094" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">How it works</div>
              {/* pv-block-end:b00094 */}
              {/* pv-block-start:b00095 */}
              <h2 data-pv-block="b00095" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Four steps. <em className="italic font-secondary font-bold text-foreground-strong">Zero</em> BS.
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
              <div data-pv-block="b00097" className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00027 */}
                  {/* pv-block-start:b00098 */}
                  <div data-pv-block="b00098" className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00098 */}
                  {/* pv-block-start:b00099 */}
                  <div data-pv-block="b00099" className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    1
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00099 */}
                  {/* pv-block-start:b00100 */}
                  <div data-pv-block="b00100" className="pt-[14px] min-w-0 md:col-auto col-span-1">
                    {/* pv-editable-zone-start:z00028 */}
                      {/* pv-block-start:b00101 */}
                      <h3 data-pv-block="b00101" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">Set up your Protovibe folder.</h3>
                      {/* pv-block-end:b00101 */}
                      {/* pv-block-start:b00102 */}
                      <p data-pv-block="b00102" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">Clone the repo to your machine. No installer, no sign-up, no dashboard — Protovibe is a folder you own.</p>
                      {/* pv-block-end:b00102 */}
                    {/* pv-editable-zone-end:z00028 */}
                  </div>
                  {/* pv-block-end:b00100 */}
                  {/* pv-block-start:b00103 */}
                  <div data-pv-block="b00103" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
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
              <div data-pv-block="b00104" className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00029 */}
                  {/* pv-block-start:b00105 */}
                  <div data-pv-block="b00105" className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00105 */}
                  {/* pv-block-start:b00106 */}
                  <div data-pv-block="b00106" className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    2
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00106 */}
                  {/* pv-block-start:b00107 */}
                  <div data-pv-block="b00107" className="pt-[14px] min-w-0 md:col-auto col-span-1">
                    {/* pv-editable-zone-start:z00030 */}
                      {/* pv-block-start:b00108 */}
                      <h3 data-pv-block="b00108" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">Run Protovibe via your coding agent.</h3>
                      {/* pv-block-end:b00108 */}
                      {/* pv-block-start:b00109 */}
                      <p data-pv-block="b00109" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">Point Copilot, Claude Code, Gemini — whoever — at the folder. They handle install, deps, and first run.</p>
                      {/* pv-block-end:b00109 */}
                    {/* pv-editable-zone-end:z00030 */}
                  </div>
                  {/* pv-block-end:b00107 */}
                  {/* pv-block-start:b00110 */}
                  <div data-pv-block="b00110" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
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
              <div data-pv-block="b00111" className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
                {/* pv-editable-zone-start:z00031 */}
                  {/* pv-block-start:b00112 */}
                  <div data-pv-block="b00112" className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
                  {/* pv-block-end:b00112 */}
                  {/* pv-block-start:b00113 */}
                  <div data-pv-block="b00113" className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
                    3
                    <div className="absolute inset-[-1px] rounded-full border border-border-primary opacity-55 pointer-events-none" />
                  </div>
                  {/* pv-block-end:b00113 */}
                  {/* pv-block-start:b00114 */}
                  <div data-pv-block="b00114" className="pt-[14px] min-w-0 md:col-auto col-span-1">
                    {/* pv-editable-zone-start:z00032 */}
                      {/* pv-block-start:b00115 */}
                      <h3 data-pv-block="b00115" className="font-secondary font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-foreground-strong m-[0_0_10px]">Design on your computer.</h3>
                      {/* pv-block-end:b00115 */}
                      {/* pv-block-start:b00116 */}
                      <p data-pv-block="b00116" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">Protovibe opens at localhost. Your agent writes the code, you inspect the pixels. Nothing leaves your machine.</p>
                      {/* pv-block-end:b00116 */}
                    {/* pv-editable-zone-end:z00032 */}
                  </div>
                  {/* pv-block-end:b00114 */}
                  {/* pv-block-start:b00117 */}
                  <div data-pv-block="b00117" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
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
              <div data-pv-block="b00118" className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative items-start">
                {/* pv-editable-zone-start:z00033 */}
                  {/* pv-block-start:b00119 */}
                  <div data-pv-block="b00119" className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-background-secondary border border-border-default flex items-center justify-center font-secondary font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-foreground-strong relative z-[1] shrink-0">
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
                      <p data-pv-block="b00122" className="text-[15px] text-foreground-secondary m-0 leading-[1.55] text-pretty">Ship to your own Cloudflare account in a single click. Real URLs, your domain, your infra — no middleman, no seat tax.</p>
                      {/* pv-block-end:b00122 */}
                    {/* pv-editable-zone-end:z00034 */}
                  </div>
                  {/* pv-block-end:b00120 */}
                  {/* pv-block-start:b00123 */}
                  <div data-pv-block="b00123" className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
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
      {/* pv-block-end:b00092 */}
    </>
  );
}

function ProblemSolution() {
  return (
    <>
      {/* pv-block-start:b00124 */}
      <section data-pv-block="b00124" className="py-[100px]" id="problems">
        {/* pv-editable-zone-start:z00035 */}
          {/* pv-block-start:b00125 */}
          <div data-pv-block="b00125" className="max-w-[780px] mx-auto mb-[64px] text-center">
            {/* pv-editable-zone-start:z00036 */}
              {/* pv-block-start:b00126 */}
              <div data-pv-block="b00126" className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">Problem → Solution</div>
              {/* pv-block-end:b00126 */}
              {/* pv-block-start:b00127 */}
              <h2 data-pv-block="b00127" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong m-0 text-balance">
                Vibe coding broke <em className="italic font-secondary font-bold text-foreground-strong">design</em>.<br />Protovibe fixes it.
              </h2>
              {/* pv-block-end:b00127 */}
              {/* pv-block-start:b00128 */}
              <p data-pv-block="b00128" className="mt-[20px] text-[16px] text-foreground-secondary max-w-[56ch] mx-auto leading-[1.55] text-pretty">
                Nine things every designer hates about AI-generated UI. Nine answers
                built into Protovibe from day one.
              </p>
              {/* pv-block-end:b00128 */}
            {/* pv-editable-zone-end:z00036 */}
          </div>
          {/* pv-block-end:b00125 */}

          {/* pv-block-start:b00129 */}
          <div data-pv-block="b00129" className="flex flex-col gap-[80px] max-w-[1040px] mx-auto">
            {/* pv-editable-zone-start:z00037 */}
              {/* ROW 1 */}
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
                      <h3 data-pv-block="b00133" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Your tokens, every time.</h3>
                      {/* pv-block-end:b00133 */}
                      {/* pv-block-start:b00134 */}
                      <div data-pv-block="b00134" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00040 */}
                          {/* pv-block-start:b00135 */}
                          <div data-pv-block="b00135" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00135 */}
                          {/* pv-block-start:b00136 */}
                          <p data-pv-block="b00136" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Hardcoded #4F7CFF. Random 13px radii. Every prototype drifts further from your tokens.</p>
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
                          <p data-pv-block="b00139" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe reads your design system and refuses to emit a single raw hex. Every value resolves to a token. Period.</p>
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

              {/* ROW 2 */}
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
                      <h3 data-pv-block="b00143" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Pixel-perfect, measured.</h3>
                      {/* pv-block-end:b00143 */}
                      {/* pv-block-start:b00144 */}
                      <div data-pv-block="b00144" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00044 */}
                          {/* pv-block-start:b00145 */}
                          <div data-pv-block="b00145" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00145 */}
                          {/* pv-block-start:b00146 */}
                          <p data-pv-block="b00146" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">AI output looks fine at a glance. Squint, and everything is vibes-adjacent — baselines off, spacing inconsistent, alignment approximate.</p>
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
                          <p data-pv-block="b00149" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">A live spec panel surfaces every offset against your grid. Drift gets flagged before it ships.</p>
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

              {/* ROW 3 */}
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
                      <h3 data-pv-block="b00153" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Nudge. Don't re-prompt.</h3>
                      {/* pv-block-end:b00153 */}
                      {/* pv-block-start:b00154 */}
                      <div data-pv-block="b00154" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00048 */}
                          {/* pv-block-start:b00155 */}
                          <div data-pv-block="b00155" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00155 */}
                          {/* pv-block-start:b00156 */}
                          <p data-pv-block="b00156" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">"Move it 8px left." "Make the radius 12." "Actually, 10." Every tweak burns a round trip.</p>
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
                          <p data-pv-block="b00159" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Nudge with arrow keys. Drag. Tweak props in the inspector. No prompt, no wait — just pixels under your cursor.</p>
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

              {/* ROW 4 */}
              {/* pv-block-start:b00160 */}
              <div data-pv-block="b00160" className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00050 */}
                  {/* pv-block-start:b00161 */}
                  <div data-pv-block="b00161" className="md:order-last aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00161 */}
                  {/* pv-block-start:b00162 */}
                  <div data-pv-block="b00162" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00051 */}
                      {/* pv-block-start:b00163 */}
                      <h3 data-pv-block="b00163" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">You stay the designer.</h3>
                      {/* pv-block-end:b00163 */}
                      {/* pv-block-start:b00164 */}
                      <div data-pv-block="b00164" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00052 */}
                          {/* pv-block-start:b00165 */}
                          <div data-pv-block="b00165" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00165 */}
                          {/* pv-block-start:b00166 */}
                          <p data-pv-block="b00166" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">You describe. It decides. You're a reviewer of someone else's taste — and losing the craft muscle in the process.</p>
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
                          <p data-pv-block="b00169" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe puts you back in the driver's seat. The agent executes; you direct. Every decision is yours to make or override.</p>
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

              {/* ROW 5 */}
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
                      <h3 data-pv-block="b00173" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Design is the code.</h3>
                      {/* pv-block-end:b00173 */}
                      {/* pv-block-start:b00174 */}
                      <div data-pv-block="b00174" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00056 */}
                          {/* pv-block-start:b00175 */}
                          <div data-pv-block="b00175" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00175 */}
                          {/* pv-block-start:b00176 */}
                          <p data-pv-block="b00176" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Designs look pristine in Figma. Then engineering ships something … close. Pixels, states, and edge cases get lost in translation.</p>
                          {/* pv-block-end:b00176 */}
                        {/* pv-editable-zone-end:z00056 */}
                      </div>
                      {/* pv-block-end:b00174 */}
                      {/* pv-block-start:b00177 */}
                      <div data-pv-block="b00177" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00057 */}
                          {/* pv-block-start:b00178 */}
                          <div data-pv-block="b00178" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00178 */}
                          {/* pv-block-start:b00179 */}
                          <p data-pv-block="b00179" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe designs are already the code. What you see is what gets committed — no handoff, no re-interpretation.</p>
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

              {/* ROW 6 */}
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
                      <h3 data-pv-block="b00183" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Hi-fi from the first prompt.</h3>
                      {/* pv-block-end:b00183 */}
                      {/* pv-block-start:b00184 */}
                      <div data-pv-block="b00184" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00060 */}
                          {/* pv-block-start:b00185 */}
                          <div data-pv-block="b00185" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00185 */}
                          {/* pv-block-start:b00186 */}
                          <p data-pv-block="b00186" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Wireframes beg too many questions. Stakeholders can't judge a boxy grey mock. Feedback rounds multiply.</p>
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
                          <p data-pv-block="b00189" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Real components, real content, real interactions — from the first prompt. Show what it'll actually feel like.</p>
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

              {/* ROW 7 */}
              {/* pv-block-start:b00190 */}
              <div data-pv-block="b00190" className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00062 */}
                  {/* pv-block-start:b00191 */}
                  <div data-pv-block="b00191" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00191 */}
                  {/* pv-block-start:b00192 */}
                  <div data-pv-block="b00192" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00063 */}
                      {/* pv-block-start:b00193 */}
                      <h3 data-pv-block="b00193" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Code you can read.</h3>
                      {/* pv-block-end:b00193 */}
                      {/* pv-block-start:b00194 */}
                      <div data-pv-block="b00194" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00064 */}
                          {/* pv-block-start:b00195 */}
                          <div data-pv-block="b00195" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00195 */}
                          {/* pv-block-start:b00196 */}
                          <p data-pv-block="b00196" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">AI spits out a tangled 400-line component. Touching it means breaking it. The designer taps out.</p>
                          {/* pv-block-end:b00196 */}
                        {/* pv-editable-zone-end:z00064 */}
                      </div>
                      {/* pv-block-end:b00194 */}
                      {/* pv-block-start:b00197 */}
                      <div data-pv-block="b00197" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00065 */}
                          {/* pv-block-start:b00198 */}
                          <div data-pv-block="b00198" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00198 */}
                          {/* pv-block-start:b00199 */}
                          <p data-pv-block="b00199" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Clean, small, named components that map to what's on your canvas. Open a file, change a number, see the pixel move.</p>
                          {/* pv-block-end:b00199 */}
                        {/* pv-editable-zone-end:z00065 */}
                      </div>
                      {/* pv-block-end:b00197 */}
                    {/* pv-editable-zone-end:z00063 */}
                  </div>
                  {/* pv-block-end:b00192 */}
                {/* pv-editable-zone-end:z00062 */}
              </div>
              {/* pv-block-end:b00190 */}

              {/* ROW 8 */}
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
                      <h3 data-pv-block="b00203" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">A real design surface.</h3>
                      {/* pv-block-end:b00203 */}
                      {/* pv-block-start:b00204 */}
                      <div data-pv-block="b00204" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00068 */}
                          {/* pv-block-start:b00205 */}
                          <div data-pv-block="b00205" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00205 */}
                          {/* pv-block-start:b00206 */}
                          <p data-pv-block="b00206" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Chat is not a design tool. You can't feel spacing through a text box.</p>
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
                          <p data-pv-block="b00209" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Canvas, layers, inspector, component library, align/distribute, responsive frames. Everything a designer expects — wired to code.</p>
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

              {/* ROW 9 */}
              {/* pv-block-start:b00210 */}
              <div data-pv-block="b00210" className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
                {/* pv-editable-zone-start:z00070 */}
                  {/* pv-block-start:b00211 */}
                  <div data-pv-block="b00211" className="aspect-square bg-background-secondary border border-border-strong rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-foreground-tertiary text-sm font-semibold">
                    Miejsce na grafikę
                  </div>
                  {/* pv-block-end:b00211 */}
                  {/* pv-block-start:b00212 */}
                  <div data-pv-block="b00212" className="flex flex-col gap-[22px]">
                    {/* pv-editable-zone-start:z00071 */}
                      {/* pv-block-start:b00213 */}
                      <h3 data-pv-block="b00213" className="font-secondary font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-foreground-strong m-[0_0_4px] text-balance">Light and dark, together.</h3>
                      {/* pv-block-end:b00213 */}
                      {/* pv-block-start:b00214 */}
                      <div data-pv-block="b00214" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00072 */}
                          {/* pv-block-start:b00215 */}
                          <div data-pv-block="b00215" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-tertiary">Problem</div>
                          {/* pv-block-end:b00215 */}
                          {/* pv-block-start:b00216 */}
                          <p data-pv-block="b00216" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Contrast dies. Shadows vanish. That one button is suddenly illegible. You ship anyway.</p>
                          {/* pv-block-end:b00216 */}
                        {/* pv-editable-zone-end:z00072 */}
                      </div>
                      {/* pv-block-end:b00214 */}
                      {/* pv-block-start:b00217 */}
                      <div data-pv-block="b00217" className="flex flex-col gap-[6px]">
                        {/* pv-editable-zone-start:z00073 */}
                          {/* pv-block-start:b00218 */}
                          <div data-pv-block="b00218" className="text-[11px] font-bold tracking-[0.18em] uppercase text-foreground-primary">Solution</div>
                          {/* pv-block-end:b00218 */}
                          {/* pv-block-start:b00219 */}
                          <p data-pv-block="b00219" className="text-[14.5px] text-foreground-secondary m-0 leading-[1.55] max-w-[52ch] text-pretty">Every artboard renders light and dark simultaneously. Token changes sync instantly across both. No more one-eye debugging.</p>
                          {/* pv-block-end:b00219 */}
                        {/* pv-editable-zone-end:z00073 */}
                      </div>
                      {/* pv-block-end:b00217 */}
                    {/* pv-editable-zone-end:z00071 */}
                  </div>
                  {/* pv-block-end:b00212 */}
                {/* pv-editable-zone-end:z00070 */}
              </div>
              {/* pv-block-end:b00210 */}

            {/* pv-editable-zone-end:z00037 */}
          </div>
          {/* pv-block-end:b00129 */}
        {/* pv-editable-zone-end:z00035 */}
      </section>
      {/* pv-block-end:b00124 */}
    </>
  );
}

function FAQ() {
  return (
    <>
      {/* pv-block-start:b00220 */}
      <section data-pv-block="b00220" className="py-[120px] relative" id="faq">
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
                  <div data-pv-block="b00402" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Yes. Protovibe is open source (MIT) and runs entirely on your machine. There's no SaaS backend, no seat tax, no hidden usage cap. You pay whoever you already pay for your coding agent — that's it.</div>
                  {/* pv-block-end:b00402 */}
                {/* pv-editable-zone-end:z00200 */}
              </details>
              {/* pv-block-end:b00400 */}

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
                  <div data-pv-block="b00408" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Clone the repo, ask your agent to set it up, and Protovibe starts at localhost. Your code, your prompts, and your prototypes never leave your machine. No cloud, no telemetry, no account.</div>
                  {/* pv-block-end:b00408 */}
                {/* pv-editable-zone-end:z00202 */}
              </details>
              {/* pv-block-end:b00406 */}

              {/* pv-block-start:b00409 */}
              <details data-pv-block="b00409" className="border-b border-border-secondary group">
                {/* pv-editable-zone-start:z00203 */}
                  {/* pv-block-start:b00410 */}
                  <summary data-pv-block="b00410" className="list-none cursor-pointer py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-secondary font-bold text-[19px] text-foreground-strong tracking-[-0.01em] transition-colors duration-150 hover:text-white">
                    {/* pv-editable-zone-start:z00213 */}
                      {/* pv-block-start:b00436 */}
                      <span data-pv-block="b00436">How is this different from the other AI design tools?</span>
                      {/* pv-block-end:b00436 */}
                      {/* pv-block-start:b00437 */}
                      <Icon data-pv-block="b00437" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00437 */}
                    {/* pv-editable-zone-end:z00213 */}
                  </summary>
                  {/* pv-block-end:b00410 */}
                  {/* pv-block-start:b00411 */}
                  <div data-pv-block="b00411" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Most of them generate pretty pictures in a proprietary cloud. Protovibe is a local, open-source tool that turns your existing coding agent into a design partner — and hands you a real React repo, not a screenshot.</div>
                  {/* pv-block-end:b00411 */}
                {/* pv-editable-zone-end:z00203 */}
              </details>
              {/* pv-block-end:b00409 */}

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
                  <div data-pv-block="b00414" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Yes, and you should. Point Protovibe at your tokens file or Tailwind config once, and every prototype after that will snap to your system. Figma libraries and Storybook stories work too.</div>
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
                      <span data-pv-block="b00440">What do I get out? Screens or code?</span>
                      {/* pv-block-end:b00440 */}
                      {/* pv-block-start:b00441 */}
                      <Icon data-pv-block="b00441" iconSymbol="chevron-down" size="md" className="text-foreground-primary transition-transform duration-200 group-open:rotate-180 shrink-0" />
                      {/* pv-block-end:b00441 */}
                    {/* pv-editable-zone-end:z00215 */}
                  </summary>
                  {/* pv-block-end:b00416 */}
                  {/* pv-block-start:b00417 */}
                  <div data-pv-block="b00417" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Both. A live local URL to share on your LAN, a PDF of screens, or the raw React + Tailwind + Vite project committed to your own repo. No lock-in — it's just files, all the way down.</div>
                  {/* pv-block-end:b00417 */}
                {/* pv-editable-zone-end:z00205 */}
              </details>
              {/* pv-block-end:b00415 */}

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
                  <div data-pv-block="b00420" className="px-[4px] pb-[24px] text-[15.5px] text-foreground-secondary leading-[1.6] max-w-[64ch] text-pretty">Product designers who want to ship in code without becoming engineers. Design engineers tired of tools that pick one or the other. Anyone who thinks "pixel-perfect" is not negotiable.</div>
                  {/* pv-block-end:b00420 */}
                {/* pv-editable-zone-end:z00206 */}
              </details>
              {/* pv-block-end:b00418 */}
            {/* pv-editable-zone-end:z00076 */}
          </div>
          {/* pv-block-end:b00224 */}
        {/* pv-editable-zone-end:z00074 */}
      </section>
      {/* pv-block-end:b00220 */}
    </>
  );
}

function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState("npx");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
      <div data-pv-block="b00231" className="fixed inset-0 z-[100] bg-background-overlay backdrop-blur-[8px] flex items-center justify-center p-[24px] animate-[fade-in_0.2s_ease]" onClick={onClose}>
        {/* pv-editable-zone-start:z00080 */}
          {/* pv-block-start:b00232 */}
          <div data-pv-block="b00232" className="relative w-full max-w-[620px] bg-background-secondary border border-border-strong rounded-[16px] p-[36px_36px_32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,.6)] animate-[modal-in_0.25s_cubic-bezier(.2,.8,.3,1)] max-h-[calc(100vh-48px)] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* pv-editable-zone-start:z00081 */}
              {/* pv-block-start:b00233 */}
              <div data-pv-block="b00233" className="absolute top-[-40%] left-[-10%] right-[-10%] h-[60%] pointer-events-none blur-[80px] opacity-[0.35] z-0 rounded-[16px]" style={{ background: 'radial-gradient(circle at 30% 50%, #3d7bff, transparent 60%), radial-gradient(circle at 70% 50%, oklch(0.70 0.26 320), transparent 60%)' }} />
              {/* pv-block-end:b00233 */}
              {/* pv-block-start:b00234 */}
              <button data-pv-block="b00234" className="absolute top-[14px] right-[14px] appearance-none border-0 bg-transparent text-foreground-secondary w-[32px] h-[32px] rounded-[8px] text-[14px] transition-colors duration-150 z-[2] hover:bg-background-tertiary hover:text-foreground-strong" onClick={onClose} aria-label="Close">✕</button>
              {/* pv-block-end:b00234 */}

              {/* pv-block-start:b00235 */}
              <div data-pv-block="b00235" className="mb-[24px] relative z-[1]">
                {/* pv-editable-zone-start:z00082 */}
                  {/* pv-block-start:b00236 */}
                  <div data-pv-block="b00236" className="font-bold text-[12px] tracking-[0.18em] uppercase m-0 text-foreground-primary">Install Protovibe</div>
                  {/* pv-block-end:b00236 */}
                  {/* pv-block-start:b00237 */}
                  <h3 data-pv-block="b00237" className="font-secondary font-bold text-[32px] leading-[1.1] tracking-[-0.03em] text-foreground-strong my-[12px] mb-[10px]">
                    Pick your <em className="italic font-secondary font-bold text-foreground-strong">lane</em>.
                  </h3>
                  {/* pv-block-end:b00237 */}
                  {/* pv-block-start:b00238 */}
                  <p data-pv-block="b00238" className="m-0 text-[14.5px] text-foreground-secondary">
                    Two ways in. Same destination: Protovibe running on <code className="font-mono text-[12.5px] px-[6px] py-[1px] rounded-[4px] bg-background-tertiary text-foreground-strong">localhost</code>.
                  </p>
                  {/* pv-block-end:b00238 */}
                {/* pv-editable-zone-end:z00082 */}
              </div>
              {/* pv-block-end:b00235 */}

              {/* pv-block-start:b00239 */}
              <div data-pv-block="b00239" className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-[20px] relative z-[1]" role="tablist">
                {/* pv-editable-zone-start:z00083 */}
                  {/* pv-block-start:b00240 */}
                  <button
                    data-pv-block="b00240"
                    role="tab"
                    aria-selected={tab === "npx"}
                    className={`appearance-none text-left bg-background-subtle border rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "npx" ? "bg-background-secondary text-white border-border-primary" : "border-border-secondary text-foreground-secondary hover:bg-background-secondary hover:text-foreground-default"}`}
                    onClick={() => setTab("npx")}>
                    {/* pv-editable-zone-start:z00084 */}
                      {/* pv-block-start:b00241 */}
                      <div data-pv-block="b00241" className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
                        {/* pv-editable-zone-start:z00085 */}
                          {/* pv-block-start:b00242 */}
                          <span data-pv-block="b00242" className="font-bold text-[10.5px] tracking-[0.16em] text-foreground-primary">01</span>
                          {/* pv-block-end:b00242 */}
                          {/* pv-block-start:b00243 */}
                          <span data-pv-block="b00243">I know my way around a terminal</span>
                          {/* pv-block-end:b00243 */}
                        {/* pv-editable-zone-end:z00085 */}
                      </div>
                      {/* pv-block-end:b00241 */}
                      {/* pv-block-start:b00244 */}
                      <div data-pv-block="b00244" className="text-[12.5px] text-foreground-secondary leading-[1.5]">One command. <b className="text-foreground-strong font-semibold">npx</b>. Done in 30 seconds.</div>
                      {/* pv-block-end:b00244 */}
                    {/* pv-editable-zone-end:z00084 */}
                  </button>
                  {/* pv-block-end:b00240 */}
                  
                  {/* pv-block-start:b00245 */}
                  <button
                    data-pv-block="b00245"
                    role="tab"
                    aria-selected={tab === "ai"}
                    className={`appearance-none text-left bg-background-subtle border rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "ai" ? "bg-background-secondary text-white border-border-primary" : "border-border-secondary text-foreground-secondary hover:bg-background-secondary hover:text-foreground-default"}`}
                    onClick={() => setTab("ai")}>
                    {/* pv-editable-zone-start:z00086 */}
                      {/* pv-block-start:b00246 */}
                      <div data-pv-block="b00246" className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
                        {/* pv-editable-zone-start:z00087 */}
                          {/* pv-block-start:b00247 */}
                          <span data-pv-block="b00247" className="font-bold text-[10.5px] tracking-[0.16em] text-foreground-primary">02</span>
                          {/* pv-block-end:b00247 */}
                          {/* pv-block-start:b00248 */}
                          <span data-pv-block="b00248">I'd rather let my agent handle it</span>
                          {/* pv-block-end:b00248 */}
                        {/* pv-editable-zone-end:z00087 */}
                      </div>
                      {/* pv-block-end:b00246 */}
                      {/* pv-block-start:b00249 */}
                      <div data-pv-block="b00249" className="text-[12.5px] text-foreground-secondary leading-[1.5]">Paste a prompt. Claude, Copilot, Gemini — any of them — sets it up for you.</div>
                      {/* pv-block-end:b00249 */}
                    {/* pv-editable-zone-end:z00086 */}
                  </button>
                  {/* pv-block-end:b00245 */}
                {/* pv-editable-zone-end:z00083 */}
              </div>
              {/* pv-block-end:b00239 */}

              {/* pv-block-start:b00250 */}
              <div data-pv-block="b00250" className="relative z-[1]">
                {/* pv-editable-zone-start:z00088 */}
                  {/* pv-block-start:b00251 */}
                  {tab === "npx" && (
                    <>
                      {/* pv-block-start:b00252 */}
                      <div data-pv-block="b00252" className="font-bold text-[11px] text-foreground-tertiary tracking-[0.16em] uppercase mb-[10px]">Run this in your terminal:</div>
                      {/* pv-block-end:b00252 */}
                      {/* pv-block-start:b00253 */}
                      <div data-pv-block="b00253" className="bg-background-sunken border border-border-secondary rounded-[10px] p-[14px_16px] font-mono text-[13px] text-foreground-strong leading-[1.55] overflow-auto flex items-center gap-[10px]">
                        {/* pv-editable-zone-start:z00089 */}
                          {/* pv-block-start:b00254 */}
                          <span data-pv-block="b00254" className="font-bold shrink-0 text-foreground-primary">$</span>
                          {/* pv-block-end:b00254 */}
                          {/* pv-block-start:b00255 */}
                          <code data-pv-block="b00255">npx protovibe@latest init</code>
                          {/* pv-block-end:b00255 */}
                        {/* pv-editable-zone-end:z00089 */}
                      </div>
                      {/* pv-block-end:b00253 */}
                      {/* pv-block-start:b00256 */}
                      <div data-pv-block="b00256" className="mt-[12px] flex gap-[10px] flex-wrap font-mono text-[11.5px] text-foreground-tertiary">
                        {/* pv-editable-zone-start:z00090 */}
                          {/* pv-block-start:b00257 */}
                          <span data-pv-block="b00257">Requires Node 20+</span>
                          {/* pv-block-end:b00257 */}
                          {/* pv-block-start:b00258 */}
                          <span data-pv-block="b00258" className="text-border-strong">·</span>
                          {/* pv-block-end:b00258 */}
                          {/* pv-block-start:b00259 */}
                          <span data-pv-block="b00259">macOS · Linux · Windows (WSL)</span>
                          {/* pv-block-end:b00259 */}
                        {/* pv-editable-zone-end:z00090 */}
                      </div>
                      {/* pv-block-end:b00256 */}
                    </>
                  )}
                  {/* pv-block-end:b00251 */}

                  {/* pv-block-start:b00260 */}
                  {tab === "ai" && (
                    <>
                      {/* pv-block-start:b00261 */}
                      <div data-pv-block="b00261" className="font-bold text-[11px] text-foreground-tertiary tracking-[0.16em] uppercase mb-[10px]">Paste this into your coding agent:</div>
                      {/* pv-block-end:b00261 */}
                      {/* pv-block-start:b00262 */}
                      <div data-pv-block="b00262" className="bg-background-sunken border border-border-secondary rounded-[10px] p-[14px_16px] font-mono text-[12.5px] text-foreground-strong leading-[1.55] overflow-auto max-h-[260px]">
                        {/* pv-editable-zone-start:z00091 */}
                          {/* pv-block-start:b00263 */}
                          <pre data-pv-block="b00263" className="m-0 whitespace-pre-wrap break-words"><code data-pv-block="b00264">{`I want to install and run Protovibe, an open-source design tool, on my computer.

Please do the following, asking me before any destructive step:

1. Check that I have Node.js 20+ installed; if not, tell me how to install it for my OS.
2. Create a folder called \`protovibe\` in my current directory.
3. Clone https://github.com/protovibe/protovibe.git into that folder.
4. Install dependencies with my package manager (prefer pnpm, fall back to npm).
5. Copy \`.env.example\` to \`.env\` and leave the defaults.
6. Start the dev server with \`pnpm dev\` (or \`npm run dev\`).
7. When it's running, print the local URL (http://localhost:5173) and stop — don't open the browser.

If anything fails, show me the exact error and stop. Do not fix it silently.`}</code></pre>
                          {/* pv-block-end:b00263 */}
                        {/* pv-editable-zone-end:z00091 */}
                      </div>
                      {/* pv-block-end:b00262 */}
                      {/* pv-block-start:b00265 */}
                      <div data-pv-block="b00265" className="mt-[12px] flex gap-[10px] flex-wrap font-mono text-[11.5px] text-foreground-tertiary">
                        {/* pv-editable-zone-start:z00092 */}
                          {/* pv-block-start:b00266 */}
                          <span data-pv-block="b00266">Works with Claude Code, Copilot, Gemini CLI, Cursor, Aider…</span>
                          {/* pv-block-end:b00266 */}
                        {/* pv-editable-zone-end:z00092 */}
                      </div>
                      {/* pv-block-end:b00265 */}
                    </>
                  )}
                  {/* pv-block-end:b00260 */}

                  {/* pv-block-start:b00267 */}
                  <div data-pv-block="b00267" className="mt-[20px] flex gap-[10px] items-center flex-wrap">
                    {/* pv-editable-zone-start:z00093 */}
                      {/* pv-block-start:b00268 */}
                      <button
                        data-pv-block="b00268"
                        className="appearance-none border-0 p-[12px_20px] rounded-[9px] text-white font-inherit font-semibold text-[14px] transition-transform duration-150 hover:-translate-y-[1px] bg-background-primary shadow-[0_8px_28px_-10px_rgba(61,123,255,0.6)]">
                        Copy
                      </button>
                      {/* pv-block-end:b00268 */}
                      {/* pv-block-start:b00269 */}
                      <a data-pv-block="b00269" className="p-[12px_18px] rounded-[9px] border border-border-strong text-foreground-strong font-medium text-[14px] inline-flex items-center gap-[8px] transition-colors duration-150 hover:bg-background-tertiary" href="#">
                        {/* pv-editable-zone-start:z00094 */}
                          {/* pv-block-start:b00270 */}
                          <span data-pv-block="b00270" className="text-[14px] text-foreground-primary">★</span>
                          {/* pv-block-end:b00270 */}
                          Star on GitHub
                        {/* pv-editable-zone-end:z00094 */}
                      </a>
                      {/* pv-block-end:b00269 */}
                    {/* pv-editable-zone-end:z00093 */}
                  </div>
                  {/* pv-block-end:b00267 */}
                {/* pv-editable-zone-end:z00088 */}
              </div>
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

function FooterCTA({ onCTA }: { onCTA: () => void }) {
  return (
    <>
      {/* pv-block-start:b00271 */}
      <section data-pv-block="b00271" className="relative pt-[140px] text-center z-[2]">
        {/* pv-editable-zone-start:z00095 */}
          {/* pv-block-start:b00272 */}
          <div data-pv-block="b00272" className="relative z-[2]">
            {/* pv-editable-zone-start:z00096 */}
              {/* pv-block-start:b00273 */}
              <h2 data-pv-block="b00273" className="font-secondary font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-foreground-strong max-w-[16ch] mx-auto mb-[40px] text-balance">
                Stop describing pixels.<br />
                <span className="text-foreground-primary">Start shipping them.</span>
              </h2>
              {/* pv-block-end:b00273 */}
              
              {/* pv-block-start:b00274 */}
              <div data-pv-block="b00274" className="inline-flex gap-[12px] flex-wrap justify-center">
                {/* pv-editable-zone-start:z00097 */}
                  {/* pv-block-start:b00275 */}
                  <button data-pv-block="b00275" className="appearance-none border-0 inline-flex items-center gap-[10px] text-[17px] font-semibold text-white px-[28px] py-[16px] rounded-[10px] transition-transform duration-150 hover:-translate-y-[1px] group bg-background-primary shadow-[0_12px_40px_-10px_rgba(61,123,255,0.6)]" onClick={onCTA} data-install>
                    Install now
                    <span className="transition-transform duration-200 group-hover:translate-x-[3px]">→</span>
                  </button>
                  {/* pv-block-end:b00275 */}
                  {/* pv-block-start:b00276 */}
                  <a data-pv-block="b00276" className="appearance-none border-0 inline-flex items-center gap-[8px] text-[17px] font-medium text-foreground-strong px-[28px] py-[16px] rounded-[10px] bg-background-tertiary transition-colors duration-150 hover:bg-background-tertiary-hover" href="#">
                    {/* pv-editable-zone-start:z00098 */}
                      {/* pv-block-start:b00277 */}
                      <span data-pv-block="b00277" className="text-[14px] text-foreground-primary">★</span>
                      {/* pv-block-end:b00277 */}
                      Star on GitHub
                    {/* pv-editable-zone-end:z00098 */}
                  </a>
                  {/* pv-block-end:b00276 */}
                {/* pv-editable-zone-end:z00097 */}
              </div>
              {/* pv-block-end:b00274 */}

              {/* pv-block-start:b00278 */}
              <div data-pv-block="b00278" className="mt-[24px] flex justify-center">
                {/* pv-editable-zone-start:z00099 */}
                  {/* pv-block-start:b00279 */}
                  <div data-pv-block="b00279" className="inline-flex items-center gap-[8px] font-mono text-[12px] text-foreground-secondary px-[14px] py-[7px] rounded-full bg-background-secondary mt-[24px]">
                    {/* pv-editable-zone-start:z00100 */}
                      {/* pv-block-start:b00280 */}
                      <span data-pv-block="b00280" className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite] bg-background-primary shadow-[0_0_12px_rgba(61,123,255,1)]" />
                      {/* pv-block-end:b00280 */}
                      {/* pv-block-start:b00281 */}
                      <span data-pv-block="b00281">open source · MIT · runs on your machine</span>
                      {/* pv-block-end:b00281 */}
                    {/* pv-editable-zone-end:z00100 */}
                  </div>
                  {/* pv-block-end:b00279 */}
                {/* pv-editable-zone-end:z00099 */}
              </div>
              {/* pv-block-end:b00278 */}
            {/* pv-editable-zone-end:z00096 */}
          </div>
          {/* pv-block-end:b00272 */}

          {/* pv-block-start:b00282 */}
          <div data-pv-block="b00282" className="relative z-[3] mt-[140px] px-[40px] py-[32px] pb-[20px] max-w-[1240px] mx-auto grid grid-cols-1 text-center md:text-left md:grid-cols-[auto_1fr_auto] gap-[16px] md:gap-[32px] items-center text-[13px] text-foreground-secondary max-md:py-[40px] max-md:px-[20px] max-md:pb-[24px] before:content-[''] before:absolute before:-left-[50vw] before:-right-[50vw] before:top-0 before:-bottom-[100px] before:bg-gradient-to-b before:from-transparent before:to-background-default before:to-60% before:z-[-1] before:pointer-events-none after:content-[''] after:absolute after:left-0 after:right-0 after:top-0 after:h-[1px] after:bg-border-secondary">
            {/* pv-editable-zone-start:z00101 */}
              {/* pv-block-start:b00283 */}
              <div data-pv-block="b00283" className="h-[9px] opacity-50 font-secondary font-bold text-[16px] leading-[9px] flex items-center justify-center">PROTOVIBE</div>
              {/* pv-block-end:b00283 */}
              {/* pv-block-start:b00284 */}
              <div data-pv-block="b00284" className="flex gap-[24px] justify-center text-foreground-secondary">
                {/* pv-editable-zone-start:z00102 */}
                  {/* pv-block-start:b00285 */}
                  <a data-pv-block="b00285" className="hover:text-foreground-strong cursor-pointer">Docs</a>
                  {/* pv-block-end:b00285 */}
                  {/* pv-block-start:b00286 */}
                  <a data-pv-block="b00286" className="hover:text-foreground-strong cursor-pointer">Changelog</a>
                  {/* pv-block-end:b00286 */}
                  {/* pv-block-start:b00287 */}
                  <a data-pv-block="b00287" className="hover:text-foreground-strong cursor-pointer">GitHub</a>
                  {/* pv-block-end:b00287 */}
                  {/* pv-block-start:b00288 */}
                  <a data-pv-block="b00288" className="hover:text-foreground-strong cursor-pointer">Discord</a>
                  {/* pv-block-end:b00288 */}
                  {/* pv-block-start:b00289 */}
                  <a data-pv-block="b00289" className="hover:text-foreground-strong cursor-pointer">X</a>
                  {/* pv-block-end:b00289 */}
                {/* pv-editable-zone-end:z00102 */}
              </div>
              {/* pv-block-end:b00284 */}
              {/* pv-block-start:b00290 */}
              <div data-pv-block="b00290" className="text-[12px]">© 2026 Protovibe Labs · Made with unreasonable care</div>
              {/* pv-block-end:b00290 */}
            {/* pv-editable-zone-end:z00101 */}
          </div>
          {/* pv-block-end:b00282 */}
        {/* pv-editable-zone-end:z00095 */}
      </section>
      {/* pv-block-end:b00271 */}
    </>
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
            <Image data-pv-block="96mqud" className="bg-cover bg-center bg-no-repeat bg-[url('/src/images/from-protovibe/protovibe-studio-logo.png')] aspect-[101/12] h-6" />
            {/* pv-block-end:96mqud */}
            
            {/* pv-block-start:b00296 */}
            <div data-pv-block="b00296" className="hidden md:flex gap-[28px] text-[14px] text-foreground-secondary ml-auto mr-[24px]">
              {/* pv-editable-zone-start:z00105 */}
                {/* pv-block-start:b00297 */}
                <a data-pv-block="b00297" href="#agents" className="hover:text-foreground-strong">Agents</a>
                {/* pv-block-end:b00297 */}
                {/* pv-block-start:b00298 */}
                <a data-pv-block="b00298" href="#how" className="hover:text-foreground-strong">How it works</a>
                {/* pv-block-end:b00298 */}
                {/* pv-block-start:b00299 */}
                <a data-pv-block="b00299" href="#features" className="hover:text-foreground-strong">Features</a>
                {/* pv-block-end:b00299 */}
                {/* pv-block-start:b00300 */}
                <a data-pv-block="b00300" href="#faq" className="hover:text-foreground-strong">FAQ</a>
                {/* pv-block-end:b00300 */}
                {/* pv-block-start:b00301 */}
                <a data-pv-block="b00301" href="#" className="hover:text-foreground-strong">GitHub</a>
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
        <div data-pv-block="b00303" className="relative z-[2] max-w-[1240px] mx-auto px-[20px] md:px-[40px]">
          {/* pv-editable-zone-start:z00106 */}
            {/* Hero */}
            {/* pv-block-start:b00304 */}
            <section data-pv-block="b00304" className="relative pt-[60px] pb-[80px] text-center">
              {/* pv-editable-zone-start:z00107 */}
                {/* pv-block-start:t4dgb7 */}
                <div data-pv-block="t4dgb7" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:ger2rz */}
                  {/* pv-block-start:b00305 */}
                  <h1 data-pv-block="b00305" className="animate-[hero-rise_700ms_ease-out_both] text-[clamp(44px,6.6vw,84px)] leading-[0.98] max-w-[14ch] tracking-tighter mt-6 mx-auto font-secondary font-extrabold">
                    You design. AI agent prototypes. Pixel-perfect.
                  </h1>
                  {/* pv-block-end:b00305 */}
                  {/* pv-block-start:b00306 */}
                  <p data-pv-block="b00306" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:80ms] text-[clamp(16px,1.3vw,19px)] text-foreground-default max-w-[52ch] text-pretty mt-6 mx-auto">
                    Protovibe Studio is an open-source design tool for professional product designers who want to vibe-code, but refuse to ship inconsistent AI slop. It runs
                    
                     on your machine in pure React.js so your own
                     
                     coding agent can implement anything you imagine.
                  </p>
                  {/* pv-block-end:b00306 */}
                  {/* pv-block-start:b00307 */}
                  <div data-pv-block="b00307" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:160ms] flex gap-[12px] mt-[36px] flex-wrap justify-center flex-col max-w-70">
                    {/* pv-editable-zone-start:z00108 */}
                      {/* pv-block-start:b00308 */}
                      <button
                        data-pv-block="b00308"
                        className="appearance-none border-0 inline-flex items-center gap-[10px] text-[15px] font-semibold text-white px-[22px] py-[13px] rounded-[10px] transition-transform duration-150 hover:-translate-y-[1px] group bg-background-primary shadow-[0_8px_32px_-8px_rgba(61,123,255,0.6)] justify-center"
                        data-install>
                        Install now
                        <span className="transition-transform duration-200 group-hover:translate-x-[3px]">→</span>
                      </button>
                      {/* pv-block-end:b00308 */}
                      {/* pv-block-start:b00309 */}
                      <a data-pv-block="b00309" className="appearance-none border-0 inline-flex items-center gap-[8px] text-[15px] font-medium text-foreground-strong px-[20px] py-[13px] rounded-[10px] bg-background-tertiary transition-colors duration-150 hover:bg-background-tertiary-hover justify-center" href="#">
                        <span className="text-[14px] text-foreground-primary">★</span> Star on GitHub <span className="font-mono text-[12px] text-foreground-secondary ml-[4px] pl-[10px] border-l border-border-strong">4.1k</span>
                      </a>
                      {/* pv-block-end:b00309 */}
                    {/* pv-editable-zone-end:z00108 */}
                  </div>
                  {/* pv-block-end:b00307 */}
                  {/* pv-editable-zone-end:ger2rz */}
                </div>
                {/* pv-block-end:t4dgb7 */}

                
                
                
                {/* pv-block-start:b00310 */}
                <div data-pv-block="b00310" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:240ms] mt-[24px] flex justify-center">
                  {/* pv-editable-zone-start:z00109 */}
                    {/* pv-block-start:b00311 */}
                    <div data-pv-block="b00311" className="inline-flex items-center gap-[8px] font-mono text-[12px] text-foreground-secondary px-[14px] py-[7px] rounded-full bg-background-secondary mt-[24px]">
                      {/* pv-editable-zone-start:z00110 */}
                        {/* pv-block-start:b00312 */}
                        <span data-pv-block="b00312" className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite] bg-background-primary shadow-[0_0_12px_rgba(61,123,255,1)]" />
                        {/* pv-block-end:b00312 */}
                        {/* pv-block-start:b00313 */}
                        <span data-pv-block="b00313">open source · MIT · runs on your machine</span>
                        {/* pv-block-end:b00313 */}
                      {/* pv-editable-zone-end:z00110 */}
                    </div>
                    {/* pv-block-end:b00311 */}
                  {/* pv-editable-zone-end:z00109 */}
                </div>
                {/* pv-block-end:b00310 */}

                {/* pv-block-start:b00314 */}
                <div data-pv-block="b00314" className="animate-[hero-rise_700ms_ease-out_both] [animation-delay:320ms] relative mt-[72px] mx-auto max-w-[1140px] px-[20px] flex-1">
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
            {/* pv-block-end:b00304 */}

            {/* Powered by */}
            {/* pv-block-start:b00320 */}
            <PoweredBy data-pv-block="b00320" />
            {/* pv-block-end:b00320 */}

            {/* Testimonial */}
            {/* pv-block-start:b00321 */}
            <section data-pv-block="b00321" className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out max-w-[880px] mx-auto py-[64px] px-0 sm:py-[96px] sm:px-[20px] grid grid-cols-1 sm:grid-cols-[56px_1fr] gap-[16px] sm:gap-x-[28px] sm:gap-y-[32px] items-start">
              {/* pv-editable-zone-start:z00113 */}
                {/* pv-block-start:b00322 */}
                <span data-pv-block="b00322" className="font-secondary font-extrabold text-[64px] sm:text-[88px] leading-none opacity-85 pointer-events-none select-none sm:-mt-[14px] self-start text-foreground-primary" aria-hidden="true">"</span>
                {/* pv-block-end:b00322 */}
                
                {/* pv-block-start:b00323 */}
                <div data-pv-block="b00323" className="flex flex-col gap-[32px]">
                  {/* pv-editable-zone-start:z00114 */}
                    {/* pv-block-start:b00324 */}
                    <p data-pv-block="b00324" className="font-secondary font-semibold text-[clamp(22px,2.4vw,32px)] leading-[1.35] tracking-[-0.02em] text-foreground-strong m-0">
                      Protovibe combines the best parts of <em className="not-italic font-secondary font-semibold text-foreground-primary">Webflow</em>, <em className="not-italic font-secondary font-semibold text-foreground-primary">Figma</em> and a pro design system.
                    </p>
                    {/* pv-block-end:b00324 */}
                    
                    {/* pv-block-start:b00325 */}
                    <div data-pv-block="b00325" className="items-center gap-[14px] pt-[4px] hidden">
                      {/* pv-editable-zone-start:z00115 */}
                        {/* pv-block-start:b00326 */}
                        <div data-pv-block="b00326" className="w-[44px] h-[44px] rounded-full bg-background-tertiary-hover text-foreground-default flex items-center justify-center font-semibold text-[14px] shrink-0">HD</div>
                        {/* pv-block-end:b00326 */}
                        
                        {/* pv-block-start:b00327 */}
                        <div data-pv-block="b00327" className="flex flex-col gap-[2px]">
                          {/* pv-editable-zone-start:z00116 */}
                            {/* pv-block-start:b00328 */}
                            <div data-pv-block="b00328" className="text-foreground-strong font-semibold text-[15px]">
                              Some guy
                            </div>
                            {/* pv-block-end:b00328 */}
                            {/* pv-block-start:b00329 */}
                            <div data-pv-block="b00329" className="text-foreground-secondary text-[13px]">
                              You never heard of him. From a company you never heard of
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
            {/* pv-block-end:b00321 */}
            {/* pv-block-start:nkmyb8 */}
            <div className="flex flex-col min-h-4" data-pv-block="nkmyb8">
              {/* pv-editable-zone-start:wot8l6 */}
              {/* pv-editable-zone-end:wot8l6 */}
            </div>
            {/* pv-block-end:nkmyb8 */}

            {/* pv-block-start:b00330 */}
            <ProblemSolution data-pv-block="b00330" />
            {/* pv-block-end:b00330 */}
            
            {/* pv-block-start:b00331 */}
            <BYOAgent data-pv-block="b00331" />
            {/* pv-block-end:b00331 */}
            
            {/* pv-block-start:b00332 */}
            <HowItWorks data-pv-block="b00332" />
            {/* pv-block-end:b00332 */}
            
            {/* pv-block-start:b00333 */}
            <FeatureGrid data-pv-block="b00333" />
            {/* pv-block-end:b00333 */}

            {/* Finale Wrapper */}
            {/* pv-block-start:b00334 */}
            <section data-pv-block="b00334" className="relative pt-[80px]">
              {/* pv-editable-zone-start:z00117 */}
                {/* pv-block-start:b00335 */}
                <div data-pv-block="b00335" className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[1500px] pointer-events-none blur-[140px] opacity-[0.45] z-0" style={{ background: 'radial-gradient(ellipse 45% 35% at 25% 75%, oklch(0.58 0.19 265), transparent 70%), radial-gradient(ellipse 45% 35% at 75% 75%, oklch(0.54 0.16 305), transparent 70%), radial-gradient(ellipse 55% 30% at 50% 60%, oklch(0.52 0.13 290), transparent 70%), radial-gradient(ellipse 70% 25% at 50% 95%, oklch(0.50 0.12 280), transparent 75%)' }} />
                {/* pv-block-end:b00335 */}
                
                {/* pv-block-start:b00336 */}
                <div data-pv-block="b00336" className="relative z-[2]">
                  {/* pv-editable-zone-start:z00118 */}
                    {/* pv-block-start:b00337 */}
                    <FAQ data-pv-block="b00337" />
                    {/* pv-block-end:b00337 */}
                  {/* pv-editable-zone-end:z00118 */}
                </div>
                {/* pv-block-end:b00336 */}
                
                {/* pv-block-start:b00338 */}
                <FooterCTA data-pv-block="b00338" onCTA={() => setInstallOpen(true)} />
                {/* pv-block-end:b00338 */}
              {/* pv-editable-zone-end:z00117 */}
            </section>
            {/* pv-block-end:b00334 */}
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