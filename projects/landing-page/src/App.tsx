import React, { useState, useEffect, useRef, useCallback } from 'react';

const TWEAK_DEFAULTS = {
  accent: "#3d7bff",
  headline: "Design pixel-perfect prototypes with your coding agent."
};

const ACCENT_PRESETS = [
  { label: "Electric", value: "#3d7bff" },
  { label: "Cyan",     value: "#22d3ee" },
  { label: "Violet",   value: "#8b5cf6" },
  { label: "Acid",     value: "#a3e635" },
  { label: "Magenta",  value: "#ec4899" },
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;500&display=swap');

  @keyframes pulse-custom {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.55; transform: scale(0.82); }
  }

  @keyframes glow-breathe {
    0%, 100% { opacity: 0.78; transform: scale(1); }
    50% { opacity: 0.88; transform: scale(1.04); }
  }

  .scrollbar-thin::-webkit-scrollbar { width: 8px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; margin: 2px; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 4px; border: 2px solid transparent; background-clip: content-box; }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.25); border: 2px solid transparent; background-clip: content-box; }

  .twk-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; border: .5px solid rgba(0,0,0,.12); box-shadow: 0 1px 3px rgba(0,0,0,.2); cursor: default; }
  .twk-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: .5px solid rgba(0,0,0,.12); box-shadow: 0 1px 3px rgba(0,0,0,.2); cursor: default; }
  .twk-swatch::-webkit-color-swatch-wrapper { padding: 0; }
  .twk-swatch::-webkit-color-swatch { border: 0; border-radius: 5.5px; }
  .twk-swatch::-moz-color-swatch { border: 0; border-radius: 5.5px; }
`;

function useTweaks(defaults) {
  const [values, setValues] = useState(defaults);
  const setTweak = useCallback((key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  }, []);
  return [values, setTweak];
}

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

function splitHeadline(h) {
  const m = /\*([^*]+)\*/.exec(h);
  if (m) return { before: h.slice(0, m.index), accent: m[1], after: h.slice(m.index + m[0].length) };
  const words = h.trim().split(/\s+/);
  if (words.length < 3) return { before: '', accent: h, after: '' };
  const tail = words.slice(-2).join(' ');
  const head = words.slice(0, -2).join(' ') + ' ';
  return { before: head, accent: tail, after: '' };
}

// --- Tweaks Panel Components ---

function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth, h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  useEffect(() => {
    const onMsg = (e) => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);
      else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    setOpen(true); 
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
  };

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;
  return (
    <div 
      ref={dragRef} 
      className="fixed z-[2147483646] w-[280px] max-h-[calc(100vh-32px)] flex flex-col bg-[rgba(250,249,247,.78)] text-[#29261b] backdrop-blur-[24px] backdrop-saturate-[160%] border border-[rgba(255,255,255,.6)] rounded-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_12px_40px_rgba(0,0,0,.18)] font-[ui-sans-serif,system-ui,-apple-system,sans-serif] text-[11.5px] leading-[1.4] overflow-hidden"
      style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
    >
      <div className="flex items-center justify-between px-[14px] py-[10px] pr-[8px] cursor-move select-none" onMouseDown={onDragStart}>
        <b className="text-[12px] font-semibold tracking-[.01em]">{title}</b>
        <button className="appearance-none border-0 bg-transparent text-[rgba(41,38,27,.55)] w-[22px] h-[22px] rounded-[6px] cursor-default text-[13px] leading-none hover:bg-[rgba(0,0,0,.06)] hover:text-[#29261b]" onMouseDown={(e) => e.stopPropagation()} onClick={dismiss}>✕</button>
      </div>
      <div className="px-[14px] pt-[2px] pb-[14px] flex flex-col gap-[10px] overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin">
        {children}
      </div>
    </div>
  );
}

function TweakSection({ label }) {
  return <div className="text-[10px] font-semibold tracking-[.06em] uppercase text-[rgba(41,38,27,.45)] pt-[10px] first:pt-0">{label}</div>;
}

function TweakColor({ label, value, onChange }) {
  return (
    <div className="flex flex-row items-center justify-between gap-[10px]">
      <div className="flex justify-between items-baseline text-[rgba(41,38,27,.72)]"><span className="font-medium">{label}</span></div>
      <input type="color" className="twk-swatch appearance-none w-[56px] h-[22px] border border-[rgba(0,0,0,.1)] rounded-[6px] p-0 cursor-default bg-transparent shrink-0" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// --- Main Page Components ---

function ProtovibeMockup() {
  return (
    <div className="relative z-10 w-full aspect-video bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_40px_80px_-30px_rgba(0,0,0,.7),0_20px_40px_-15px_rgba(0,0,0,.6)] flex items-center justify-center text-[#4a4a55] font-semibold text-sm" role="img" aria-label="Protovibe app preview">
      Miejsce na grafikę
    </div>
  );
}

function FeatureGrid({ accent }) {
  return (
    <section className="py-[120px] relative" id="features">
      <div className="max-w-[780px] mx-auto mb-[64px] text-center">
        <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px]" style={{ color: accent }}>Features</div>
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] m-0 text-balance">
          Designed for people who care about the <em className="italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[#f4f4f6]">actual</em> pixels.
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px]">
        
        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>01 · agent</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">An AI that actually respects your design system.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">Protovibe's agent reads your tokens, components, and grid — and refuses to hardcode a single pixel. No rogue hex codes. No off-brand radii. No AI shit.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>02 · pixels</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">Pixel-perfect, not vibe-adjacent.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">Ship mocks that line up to the baseline, match component specs, and pass a designer's squint test. Because "roughly right" is the enemy.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>03 · prompt</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">Prompt like a designer. Commit like an engineer.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">Natural language in, real React + Tailwind out. Every change is a diff you can read, review, and roll back — not a black box.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>04 · control</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">You stay in the driver's seat.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">Inspect anything. Tweak props. Override the agent mid-thought. This isn't vibe-coding that runs away from you — it's you, just faster.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>05 · system</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">Brings your whole team up to spec.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">Import your component library once. Every prototype after that is on-brand by default. Consistency isn't a policy — it's the floor.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[14px] px-[28px] py-[32px] flex flex-col min-h-[340px] transition-all duration-200 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.16em] uppercase mb-[20px]" style={{ color: accent }}>06 · open</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_12px] text-balance">Open source. Yours, forever.</h3>
          <p className="text-[14.5px] text-[#7c7c88] m-[0_0_24px] leading-[1.55] text-pretty">MIT-licensed. Runs on your computer, not ours. No telemetry, no accounts, no rug-pull. Fork it, extend it, ship it. Your prototypes never leave your machine unless you push them.</p>
          <div className="mt-auto h-[130px] bg-[rgba(255,255,255,.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center text-[#4a4a55] font-['JetBrains_Mono',monospace] text-[10px]">Miejsce na grafikę</div>
        </div>

      </div>
    </section>
  );
}

function LogoReact() {
  return (
    <div className="inline-flex items-center gap-[10px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] tracking-[-0.02em] text-[#f4f4f6] opacity-92 transition-opacity duration-150 hover:opacity-100">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <g fill="none" stroke="currentColor" strokeWidth="1.1">
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </g>
      </svg>
      <span>React</span>
    </div>
  );
}

function LogoTailwind() {
  return (
    <div className="inline-flex items-center gap-[10px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] tracking-[-0.02em] text-[#f4f4f6] opacity-92 transition-opacity duration-150 hover:opacity-100">
      <svg viewBox="0 0 32 20" width="28" height="18" aria-hidden="true">
        <path d="M8 2 Q12 -1 16 4 Q20 9 24 6 Q20 9 16 4 Q12 -1 8 2 Z M2 10 Q6 7 10 12 Q14 17 18 14 Q14 17 10 12 Q6 7 2 10 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span>Tailwind</span>
    </div>
  );
}

function LogoVite() {
  return (
    <div className="inline-flex items-center gap-[10px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[22px] tracking-[-0.02em] text-[#f4f4f6] opacity-92 transition-opacity duration-150 hover:opacity-100">
      <svg viewBox="0 0 24 24" width="20" height="22" aria-hidden="true">
        <path d="M2 4 L22 4 L12 22 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M8 8 L16 8 L12 16 Z" fill="currentColor" opacity="0.7" />
      </svg>
      <span>Vite</span>
    </div>
  );
}

function PoweredBy({ accent }) {
  return (
    <section className="py-[56px] border-y border-[rgba(255,255,255,0.08)] grid grid-cols-1 md:grid-cols-[minmax(120px,0.7fr)_auto_minmax(140px,0.9fr)] items-center gap-[24px] md:gap-[32px] text-center md:text-left max-md:py-[64px]">
      <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] tracking-[0.18em] uppercase text-[#4a4a55] md:text-right">Speaks fluent</div>
      <div className="flex items-center justify-center gap-[20px] flex-nowrap text-[#c8c8d0]">
        <LogoReact />
        <span className="w-[4px] h-[4px] rounded-full bg-[#4a4a55] opacity-50 inline-block text-[0px]" aria-hidden="true"></span>
        <LogoTailwind />
        <span className="w-[4px] h-[4px] rounded-full bg-[#4a4a55] opacity-50 inline-block text-[0px]" aria-hidden="true"></span>
        <LogoVite />
      </div>
      <div className="text-[13px] leading-[1.5] text-[#7c7c88] max-w-[30ch] text-pretty max-md:mx-auto">
        Your stack, your conventions. Protovibe outputs code you'd actually commit.
      </div>
    </section>
  );
}

function BYOAgent({ accent }) {
  return (
    <section className="py-[100px]" id="agents">
      <div className="max-w-[780px] mx-auto mb-[64px] text-center">
        <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px]" style={{ color: accent }}>Bring your own agent</div>
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] m-0 text-balance">
          Your favourite agent. <em className="italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[#f4f4f6]">Your</em> way.
        </h2>
        <p className="mt-[20px] text-[16px] text-[#7c7c88] max-w-[56ch] mx-auto leading-[1.55] text-pretty">
          Protovibe doesn't ship its own AI. It plugs into the coding agent
          you already use and trust. No lock-in, no new API key, no extra
          subscription — your agent runs locally, your prompts stay yours.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-[16px] max-w-[920px] mx-auto">
        
        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>⟡</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">GitHub Copilot</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">cli + ide</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>∗</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">Claude Code</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">terminal</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>◇</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">Gemini CLI</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">terminal</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>▸</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">Cursor</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">ide</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>◦</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">Aider</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">terminal</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

        <div className="bg-[rgba(255,255,255,0.035)] rounded-[12px] px-[22px] pt-[26px] pb-[22px] flex flex-col items-start gap-[6px] transition-all duration-150 hover:bg-[rgba(255,255,255,0.06)] hover:-translate-y-[2px]">
          <div className="text-[28px] leading-none mb-[14px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold" style={{ color: accent }}>◼</div>
          <div className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] text-[#f4f4f6] tracking-[-0.01em]">Codex</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] text-[#4a4a55] tracking-[0.16em] uppercase">cli</div>
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-semibold text-[11px] tracking-[0.04em] mt-[10px]" style={{ color: accent }}>✓ supported</div>
        </div>

      </div>
      <div className="mt-[36px] text-center text-[13.5px] text-[#7c7c88]">
        + any agent that can read files and run a dev server. That's the whole spec.
      </div>
    </section>
  );
}

function HowItWorks({ accent }) {
  return (
    <section className="py-[120px] relative" id="how">
      <div className="max-w-[780px] mx-auto mb-[64px] text-center">
        <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px]" style={{ color: accent }}>How it works</div>
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] m-0 text-balance">
          Four steps. <em className="italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[#f4f4f6]">Zero</em> BS.
        </h2>
      </div>
      <div className="max-w-[1140px] mx-auto flex flex-col gap-0 relative">
        
        {/* Step 1 */}
        <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
          <div className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
          <div className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,.12)] flex items-center justify-center font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-[#f4f4f6] relative z-[1] shrink-0">
            1
            <div className="absolute inset-[-1px] rounded-full border opacity-55 pointer-events-none" style={{ borderColor: accent }} />
          </div>
          <div className="pt-[14px] min-w-0 md:col-auto col-span-1">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_10px]">Set up your Protovibe folder.</h3>
            <p className="text-[15px] text-[#7c7c88] m-0 leading-[1.55] text-pretty">Clone the repo to your machine. No installer, no sign-up, no dashboard — Protovibe is a folder you own.</p>
          </div>
          <div className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
            <div className="w-full aspect-[21/9] bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.08)] rounded-[14px] flex items-center justify-center text-[#4a4a55] text-[12px] font-semibold">
              Miejsce na grafikę
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
          <div className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
          <div className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,.12)] flex items-center justify-center font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-[#f4f4f6] relative z-[1] shrink-0">
            2
            <div className="absolute inset-[-1px] rounded-full border opacity-55 pointer-events-none" style={{ borderColor: accent }} />
          </div>
          <div className="pt-[14px] min-w-0 md:col-auto col-span-1">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_10px]">Run Protovibe via your coding agent.</h3>
            <p className="text-[15px] text-[#7c7c88] m-0 leading-[1.55] text-pretty">Point Copilot, Claude Code, Gemini — whoever — at the folder. They handle install, deps, and first run.</p>
          </div>
          <div className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
            <div className="w-full aspect-[21/9] bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.08)] rounded-[14px] flex items-center justify-center text-[#4a4a55] text-[12px] font-semibold">
              Miejsce na grafikę
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative pb-[40px] sm:pb-[48px] md:pb-[56px] items-start">
          <div className="absolute left-[21px] sm:left-[27px] md:left-[31px] top-[44px] sm:top-[56px] md:top-[64px] bottom-0 w-[1px] bg-gradient-to-b from-[rgba(255,255,255,.18)] via-[rgba(255,255,255,.18)] to-transparent" />
          <div className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,.12)] flex items-center justify-center font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-[#f4f4f6] relative z-[1] shrink-0">
            3
            <div className="absolute inset-[-1px] rounded-full border opacity-55 pointer-events-none" style={{ borderColor: accent }} />
          </div>
          <div className="pt-[14px] min-w-0 md:col-auto col-span-1">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_10px]">Design on your computer.</h3>
            <p className="text-[15px] text-[#7c7c88] m-0 leading-[1.55] text-pretty">Protovibe opens at localhost. Your agent writes the code, you inspect the pixels. Nothing leaves your machine.</p>
          </div>
          <div className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
            <div className="w-full aspect-[21/9] bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.08)] rounded-[14px] flex items-center justify-center text-[#4a4a55] text-[12px] font-semibold">
              Miejsce na grafikę
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="grid grid-cols-[44px_1fr] sm:grid-cols-[56px_1fr] md:grid-cols-[64px_minmax(220px,1fr)_minmax(360px,1.25fr)] gap-x-[18px] sm:gap-x-[22px] md:gap-x-[32px] gap-y-[16px] relative items-start">
          <div className="w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[64px] md:h-[64px] rounded-full bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,.12)] flex items-center justify-center font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[18px] sm:text-[22px] md:text-[26px] tracking-[-0.02em] text-[#f4f4f6] relative z-[1] shrink-0">
            4
            <div className="absolute inset-[-1px] rounded-full border opacity-55 pointer-events-none" style={{ borderColor: accent }} />
          </div>
          <div className="pt-[14px] min-w-0 md:col-auto col-span-1">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[20px] md:text-[24px] leading-[1.15] tracking-[-0.02em] text-[#f4f4f6] m-[0_0_10px]">Publish prototypes with one click.</h3>
            <p className="text-[15px] text-[#7c7c88] m-0 leading-[1.55] text-pretty">Ship to your own Cloudflare account in a single click. Real URLs, your domain, your infra — no middleman, no seat tax.</p>
          </div>
          <div className="flex flex-col gap-[12px] min-w-0 pt-0 md:pt-[6px] col-span-2 md:col-span-1 sm:ml-[78px] md:ml-0 md:max-w-[540px]">
            <div className="w-full aspect-[21/9] bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.08)] rounded-[14px] flex items-center justify-center text-[#4a4a55] text-[12px] font-semibold">
              Miejsce na grafikę
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function ProblemSolution({ accent }) {
  return (
    <section className="py-[100px]" id="problems">
      <div className="max-w-[780px] mx-auto mb-[64px] text-center">
        <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px]" style={{ color: accent }}>Problem → Solution</div>
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] m-0 text-balance">
          Vibe coding broke <em className="italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[#f4f4f6]">design</em>.<br />Protovibe fixes it.
        </h2>
        <p className="mt-[20px] text-[16px] text-[#7c7c88] max-w-[56ch] mx-auto leading-[1.55] text-pretty">
          Nine things every designer hates about AI-generated UI. Nine answers
          built into Protovibe from day one.
        </p>
      </div>
      <div className="flex flex-col gap-[80px] max-w-[1040px] mx-auto">
        
        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
          <div className="aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Your tokens, every time.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Hardcoded #4F7CFF. Random 13px radii. Every prototype drifts further from your tokens.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe reads your design system and refuses to emit a single raw hex. Every value resolves to a token. Period.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
          <div className="md:order-last aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Pixel-perfect, measured.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">AI output looks fine at a glance. Squint, and everything is vibes-adjacent — baselines off, spacing inconsistent, alignment approximate.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">A live spec panel surfaces every offset against your grid. Drift gets flagged before it ships.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
          <div className="aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Nudge. Don't re-prompt.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">"Move it 8px left." "Make the radius 12." "Actually, 10." Every tweak burns a round trip.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Nudge with arrow keys. Drag. Tweak props in the inspector. No prompt, no wait — just pixels under your cursor.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
          <div className="md:order-last aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">You stay the designer.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">You describe. It decides. You're a reviewer of someone else's taste — and losing the craft muscle in the process.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe puts you back in the driver's seat. The agent executes; you direct. Every decision is yours to make or override.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
          <div className="aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Design is the code.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Designs look pristine in Figma. Then engineering ships something … close. Pixels, states, and edge cases get lost in translation.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Protovibe designs are already the code. What you see is what gets committed — no handoff, no re-interpretation.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
          <div className="md:order-last aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Hi-fi from the first prompt.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Wireframes beg too many questions. Stakeholders can't judge a boxy grey mock. Feedback rounds multiply.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Real components, real content, real interactions — from the first prompt. Show what it'll actually feel like.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
          <div className="aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Code you can read.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">AI spits out a tangled 400-line component. Touching it means breaking it. The designer taps out.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Clean, small, named components that map to what's on your canvas. Open a file, change a number, see the pixel move.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(280px,380px)] gap-[28px] md:gap-[56px] items-center">
          <div className="md:order-last aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">A real design surface.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Chat is not a design tool. You can't feel spacing through a text box.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Canvas, layers, inspector, component library, align/distribute, responsive frames. Everything a designer expects — wired to code.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,380px)_1fr] gap-[28px] md:gap-[56px] items-center">
          <div className="aspect-square bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[14px] overflow-hidden shadow-[0_20px_40px_-20px_rgba(0,0,0,.6)] relative flex items-center justify-center text-[#4a4a55] text-sm font-semibold">
            Miejsce na grafikę
          </div>
          <div className="flex flex-col gap-[22px]">
            <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[30px] leading-[1.1] tracking-[-0.025em] text-[#f4f4f6] m-[0_0_4px] text-balance">Light and dark, together.</h3>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase text-[#4a4a55]">Problem</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Contrast dies. Shadows vanish. That one button is suddenly illegible. You ship anyway.</p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>Solution</div>
              <p className="text-[14.5px] text-[#7c7c88] m-0 leading-[1.55] max-w-[52ch] text-pretty">Every artboard renders light and dark simultaneously. Token changes sync instantly across both. No more one-eye debugging.</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

function FAQ({ accent }) {
  const items = [
    { q: "Is it really free?", a: "Yes. Protovibe is open source (MIT) and runs entirely on your machine. There's no SaaS backend, no seat tax, no hidden usage cap. You pay whoever you already pay for your coding agent — that's it." },
    { q: "Which AI agents does it work with?", a: "GitHub Copilot, Claude Code, Gemini CLI, Cursor, Aider, Codex — basically any agent that can read files and run a dev server. Protovibe doesn't care which one; it just gives your agent a great design surface to write into." },
    { q: "How does 'runs on your computer' actually work?", a: "Clone the repo, ask your agent to set it up, and Protovibe starts at localhost. Your code, your prompts, and your prototypes never leave your machine. No cloud, no telemetry, no account." },
    { q: "How is this different from the other AI design tools?", a: "Most of them generate pretty pictures in a proprietary cloud. Protovibe is a local, open-source tool that turns your existing coding agent into a design partner — and hands you a real React repo, not a screenshot." },
    { q: "Can I bring my own design system?", a: "Yes, and you should. Point Protovibe at your tokens file or Tailwind config once, and every prototype after that will snap to your system. Figma libraries and Storybook stories work too." },
    { q: "What do I get out? Screens or code?", a: "Both. A live local URL to share on your LAN, a PDF of screens, or the raw React + Tailwind + Vite project committed to your own repo. No lock-in — it's just files, all the way down." },
    { q: "Who's this for?", a: "Product designers who want to ship in code without becoming engineers. Design engineers tired of tools that pick one or the other. Anyone who thinks \"pixel-perfect\" is not negotiable." },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="py-[120px] relative" id="faq">
      <div className="max-w-[780px] mx-auto mb-[64px] text-center">
        <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px]" style={{ color: accent }}>FAQ</div>
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] m-0 text-balance">Questions, answered straight.</h2>
      </div>
      <div className="max-w-[820px] mx-auto border-t border-[rgba(255,255,255,0.08)]">
        {items.map((it, i) => (
          <div className="border-b border-[rgba(255,255,255,0.08)] group" key={i}>
            <button className="w-full appearance-none border-0 bg-transparent py-[24px] px-[4px] flex items-center justify-between gap-[20px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[19px] text-[#f4f4f6] text-left tracking-[-0.01em] transition-colors duration-150 hover:text-white" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{it.q}</span>
              <span className="font-['JetBrains_Mono',monospace] font-normal text-[22px] w-[24px] text-center shrink-0 transition-transform duration-200" style={{ color: accent }}>
                {open === i ? "−" : "+"}
              </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open === i ? 'max-h-[300px]' : 'max-h-0'}`}>
              <div className="px-[4px] pb-[24px] text-[15.5px] text-[#7c7c88] leading-[1.6] max-w-[64ch] text-pretty">{it.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstallModal({ accent, open, onClose }) {
  const [tab, setTab] = useState("npx");
  const [copied, setCopied] = useState(false);

  const npxCmd = "npx protovibe@latest init";

  const aiPrompt = `I want to install and run Protovibe, an open-source design tool, on my computer.

Please do the following, asking me before any destructive step:

1. Check that I have Node.js 20+ installed; if not, tell me how to install it for my OS.
2. Create a folder called \`protovibe\` in my current directory.
3. Clone https://github.com/protovibe/protovibe.git into that folder.
4. Install dependencies with my package manager (prefer pnpm, fall back to npm).
5. Copy \`.env.example\` to \`.env\` and leave the defaults.
6. Start the dev server with \`pnpm dev\` (or \`npm run dev\`).
7. When it's running, print the local URL (http://localhost:5173) and stop — don't open the browser.

If anything fails, show me the exact error and stop. Do not fix it silently.`;

  const current = tab === "npx" ? npxCmd : aiPrompt;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[rgba(3,3,7,0.75)] backdrop-blur-[8px] flex items-center justify-center p-[24px] animate-[fade-in_0.2s_ease]" onClick={onClose}>
      <div className="relative w-full max-w-[620px] bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.14)] rounded-[16px] p-[36px_36px_32px] shadow-[0_40px_100px_-20px_rgba(0,0,0,.6)] animate-[modal-in_0.25s_cubic-bezier(.2,.8,.3,1)] max-h-[calc(100vh-48px)] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="absolute top-[-40%] left-[-10%] right-[-10%] h-[60%] pointer-events-none blur-[80px] opacity-[0.35] z-0 rounded-[16px]" style={{ background: `radial-gradient(circle at 30% 50%, ${accent}, transparent 60%), radial-gradient(circle at 70% 50%, oklch(0.70 0.26 320), transparent 60%)` }} />
        <button className="absolute top-[14px] right-[14px] appearance-none border-0 bg-transparent text-[#7c7c88] w-[32px] h-[32px] rounded-[8px] text-[14px] transition-colors duration-150 z-[2] hover:bg-[rgba(255,255,255,.06)] hover:text-[#f4f4f6]" onClick={onClose} aria-label="Close">✕</button>

        <div className="mb-[24px] relative z-[1]">
          <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[12px] tracking-[0.18em] uppercase m-0" style={{ color: accent }}>Install Protovibe</div>
          <h3 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[32px] leading-[1.1] tracking-[-0.03em] text-[#f4f4f6] my-[12px] mb-[10px]">
            Pick your <em className="italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[#f4f4f6]">lane</em>.
          </h3>
          <p className="m-0 text-[14.5px] text-[#7c7c88]">
            Two ways in. Same destination: Protovibe running on <code className="font-['JetBrains_Mono',monospace] text-[12.5px] px-[6px] py-[1px] rounded-[4px] bg-[rgba(255,255,255,.06)] text-[#f4f4f6]">localhost</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[10px] mb-[20px] relative z-[1]" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "npx"}
            className={`appearance-none text-left bg-[rgba(255,255,255,.02)] border rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "npx" ? "bg-[rgba(255,255,255,.04)] text-white" : "border-[rgba(255,255,255,0.08)] text-[#7c7c88] hover:bg-[rgba(255,255,255,.04)] hover:text-[#c8c8d0]"}`}
            onClick={() => setTab("npx")}
            style={tab === "npx" ? { borderColor: accent } : {}}>
            <div className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
              <span className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] tracking-[0.16em]" style={{ color: tab === "npx" ? accent : '#4a4a55' }}>01</span>
              <span>I know my way around a terminal</span>
            </div>
            <div className="text-[12.5px] text-[#7c7c88] leading-[1.5]">One command. <b className="text-[#f4f4f6] font-semibold">npx</b>. Done in 30 seconds.</div>
          </button>
          <button
            role="tab"
            aria-selected={tab === "ai"}
            className={`appearance-none text-left bg-[rgba(255,255,255,.02)] border rounded-[10px] p-[14px_16px] font-inherit cursor-pointer transition-colors duration-150 ${tab === "ai" ? "bg-[rgba(255,255,255,.04)] text-white" : "border-[rgba(255,255,255,0.08)] text-[#7c7c88] hover:bg-[rgba(255,255,255,.04)] hover:text-[#c8c8d0]"}`}
            onClick={() => setTab("ai")}
            style={tab === "ai" ? { borderColor: accent } : {}}>
            <div className="flex items-center gap-[10px] font-semibold text-[14px] mb-[4px]">
              <span className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[10.5px] tracking-[0.16em]" style={{ color: tab === "ai" ? accent : '#4a4a55' }}>02</span>
              <span>I'd rather let my agent handle it</span>
            </div>
            <div className="text-[12.5px] text-[#7c7c88] leading-[1.5]">Paste a prompt. Claude, Copilot, Gemini — any of them — sets it up for you.</div>
          </button>
        </div>

        <div className="relative z-[1]">
          {tab === "npx" && (
            <>
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] text-[#4a4a55] tracking-[0.16em] uppercase mb-[10px]">Run this in your terminal:</div>
              <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[14px_16px] font-['JetBrains_Mono',monospace] text-[13px] text-[#f4f4f6] leading-[1.55] overflow-auto flex items-center gap-[10px]">
                <span className="font-bold shrink-0" style={{ color: accent }}>$</span>
                <code>{npxCmd}</code>
              </div>
              <div className="mt-[12px] flex gap-[10px] flex-wrap font-['JetBrains_Mono',monospace] text-[11.5px] text-[#4a4a55]">
                <span>Requires Node 20+</span>
                <span className="text-[rgba(255,255,255,0.14)]">·</span>
                <span>macOS · Linux · Windows (WSL)</span>
              </div>
            </>
          )}
          {tab === "ai" && (
            <>
              <div className="font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] font-bold text-[11px] text-[#4a4a55] tracking-[0.16em] uppercase mb-[10px]">Paste this into your coding agent:</div>
              <div className="bg-[#0d0d0d] border border-[rgba(255,255,255,0.08)] rounded-[10px] p-[14px_16px] font-['JetBrains_Mono',monospace] text-[12.5px] text-[#f4f4f6] leading-[1.55] overflow-auto max-h-[260px]">
                <pre className="m-0 whitespace-pre-wrap break-words"><code>{aiPrompt}</code></pre>
              </div>
              <div className="mt-[12px] flex gap-[10px] flex-wrap font-['JetBrains_Mono',monospace] text-[11.5px] text-[#4a4a55]">
                <span>Works with Claude Code, Copilot, Gemini CLI, Cursor, Aider…</span>
              </div>
            </>
          )}

          <div className="mt-[20px] flex gap-[10px] items-center flex-wrap">
            <button
              className="appearance-none border-0 p-[12px_20px] rounded-[9px] text-white font-inherit font-semibold text-[14px] transition-transform duration-150 hover:-translate-y-[1px]"
              onClick={copy}
              style={{ background: accent, boxShadow: `0 8px 28px -10px ${accent}99` }}>
              {copied ? "✓ Copied" : (tab === "npx" ? "Copy command" : "Copy prompt")}
            </button>
            <a className="p-[12px_18px] rounded-[9px] border border-[rgba(255,255,255,0.14)] text-[#f4f4f6] font-medium text-[14px] inline-flex items-center gap-[8px] transition-colors duration-150 hover:bg-[rgba(255,255,255,.04)]" href="#">
              <span className="text-[14px]" style={{ color: accent }}>★</span> Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterCTA({ accent, onCTA }) {
  return (
    <section className="relative pt-[140px] text-center z-[2]">
      <div className="relative z-[2]">
        <h2 className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[clamp(32px,4.2vw,54px)] leading-[1.04] tracking-[-0.03em] text-[#f4f4f6] max-w-[16ch] mx-auto mb-[40px] text-balance">
          Stop describing pixels.<br />
          <span style={{ color: accent }}>Start shipping them.</span>
        </h2>
        <div className="inline-flex gap-[12px] flex-wrap justify-center">
          <button className="appearance-none border-0 inline-flex items-center gap-[10px] text-[17px] font-semibold text-white px-[28px] py-[16px] rounded-[10px] transition-transform duration-150 hover:-translate-y-[1px] group" onClick={onCTA} data-install style={{ background: accent, boxShadow: `0 12px 40px -10px ${accent}99` }}>
            Install now
            <span className="transition-transform duration-200 group-hover:translate-x-[3px]">→</span>
          </button>
          <a className="appearance-none border-0 inline-flex items-center gap-[8px] text-[17px] font-medium text-[#f4f4f6] px-[28px] py-[16px] rounded-[10px] bg-[rgba(255,255,255,.06)] transition-colors duration-150 hover:bg-[rgba(255,255,255,.10)]" href="#">
            <span className="text-[14px]" style={{ color: accent }}>★</span>
            Star on GitHub
          </a>
        </div>
        <div className="mt-[24px] flex justify-center">
          <div className="inline-flex items-center gap-[8px] font-['JetBrains_Mono',monospace] text-[12px] text-[#7c7c88] px-[14px] py-[7px] rounded-full bg-[rgba(255,255,255,0.05)] mt-[24px]">
            <span className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite]" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
            <span>open source · MIT · runs on your machine</span>
          </div>
        </div>
      </div>
      <div className="relative z-[3] mt-[140px] px-[40px] py-[32px] pb-[20px] max-w-[1240px] mx-auto grid grid-cols-1 text-center md:text-left md:grid-cols-[auto_1fr_auto] gap-[16px] md:gap-[32px] items-center text-[13px] text-[#7c7c88] max-md:py-[40px] max-md:px-[20px] max-md:pb-[24px] before:content-[''] before:absolute before:-left-[50vw] before:-right-[50vw] before:top-0 before:-bottom-[100px] before:bg-gradient-to-b before:from-transparent before:to-[#070707] before:to-60% before:z-[-1] before:pointer-events-none after:content-[''] after:absolute after:left-0 after:right-0 after:top-0 after:h-[1px] after:bg-[rgba(255,255,255,0.08)]">
        <div className="h-[9px] opacity-50 font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[16px] leading-[9px] flex items-center justify-center">PROTOVIBE</div>
        <div className="flex gap-[24px] justify-center text-[#7c7c88]">
          <a className="hover:text-[#f4f4f6] cursor-pointer">Docs</a><a className="hover:text-[#f4f4f6] cursor-pointer">Changelog</a><a className="hover:text-[#f4f4f6] cursor-pointer">GitHub</a><a className="hover:text-[#f4f4f6] cursor-pointer">Discord</a><a className="hover:text-[#f4f4f6] cursor-pointer">X</a>
        </div>
        <div className="text-[12px]">© 2026 Protovibe Labs · Made with unreasonable care</div>
      </div>
    </section>
  );
}

// --- Main App ---

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [installOpen, setInstallOpen] = useState(false);
  useReveal();

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  useEffect(() => {
    const handler = (e) => {
      const el = e.target.closest('[data-install]');
      if (el) { e.preventDefault(); setInstallOpen(true); }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const parts = splitHeadline(t.headline);

  return (
    <div className="bg-[#070707] text-[#c8c8d0] font-[system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] text-[16px] leading-[1.55] antialiased min-h-screen overflow-x-hidden relative" style={{ textRendering: 'optimizeLegibility' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Grain */}
      <div className="fixed inset-0 pointer-events-none z-[1] mix-blend-overlay opacity-100" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.018) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-[20px] py-[14px] md:px-[40px] md:py-[18px] bg-gradient-to-b from-[#050509eb] via-[#05050999] to-transparent backdrop-blur-[8px]">
        <div className="h-[15px] font-[Syne,ui-sans-serif,system-ui,sans-serif] font-bold text-[20px] leading-[15px] flex items-center text-white">PROTOVIBE</div>
        <div className="hidden md:flex gap-[28px] text-[14px] text-[#7c7c88] ml-auto mr-[24px]">
          <a href="#agents" className="hover:text-[#f4f4f6]">Agents</a>
          <a href="#how" className="hover:text-[#f4f4f6]">How it works</a>
          <a href="#features" className="hover:text-[#f4f4f6]">Features</a>
          <a href="#faq" className="hover:text-[#f4f4f6]">FAQ</a>
          <a href="#" className="hover:text-[#f4f4f6]">GitHub</a>
        </div>
        <a className="appearance-none border-0 bg-[#f4f4f6] text-[#000] text-[13px] font-semibold px-[14px] py-[8px] rounded-[8px] transition-all duration-150 hover:-translate-y-[1px] hover:bg-white cursor-pointer" data-install>Install now</a>
      </nav>

      {/* Layout Shell */}
      <div className="relative z-[2] max-w-[1240px] mx-auto px-[20px] md:px-[40px]">
        {/* Hero */}
        <section className="relative pt-[60px] pb-[80px] text-center">
          <h1 className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out font-[Syne,ui-sans-serif,system-ui,sans-serif] font-extrabold text-[clamp(44px,6.6vw,84px)] leading-[0.98] text-[#f4f4f6] mt-[24px] max-w-[14ch] mx-auto text-balance tracking-tighter">
            {parts.before}
            <span style={{ color: t.accent }}>{parts.accent}</span>
            {parts.after}
          </h1>
          <p className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out text-[clamp(16px,1.3vw,19px)] text-[#c8c8d0] max-w-[52ch] text-pretty mt-6 mx-auto">
            Protovibe is an open-source, AI-first design tool for pros who
            vibe-code but refuse to ship sloppy pixels. Bring your own agent —
            Copilot, Claude Code, Gemini, Cursor, whatever. It runs on your
            machine. Your code. Your design system. Your rules.
          </p>
          <div className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out flex gap-[12px] mt-[36px] flex-wrap justify-center">
            <button
              className="appearance-none border-0 inline-flex items-center gap-[10px] text-[15px] font-semibold text-white px-[22px] py-[13px] rounded-[10px] transition-transform duration-150 hover:-translate-y-[1px] group"
              data-install
              style={{ background: t.accent, boxShadow: `0 8px 32px -8px ${t.accent}99` }}>
              Install now
              <span className="transition-transform duration-200 group-hover:translate-x-[3px]">→</span>
            </button>
            <a className="appearance-none border-0 inline-flex items-center gap-[8px] text-[15px] font-medium text-[#f4f4f6] px-[20px] py-[13px] rounded-[10px] bg-[rgba(255,255,255,.06)] transition-colors duration-150 hover:bg-[rgba(255,255,255,.10)]" href="#">
              <span className="text-[14px]" style={{ color: t.accent }}>★</span>
              Star on GitHub
              <span className="font-['JetBrains_Mono',monospace] text-[12px] text-[#7c7c88] ml-[4px] pl-[10px] border-l border-[rgba(255,255,255,0.14)]">4.2k</span>
            </a>
          </div>
          <div className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out mt-[24px] flex justify-center">
            <div className="inline-flex items-center gap-[8px] font-['JetBrains_Mono',monospace] text-[12px] text-[#7c7c88] px-[14px] py-[7px] rounded-full bg-[rgba(255,255,255,0.05)] mt-[24px]">
              <span className="w-[6px] h-[6px] rounded-full animate-[pulse-custom_2.4s_ease-in-out_infinite]" style={{ background: t.accent, boxShadow: `0 0 12px ${t.accent}` }} />
              <span>open source · MIT · runs on your machine</span>
            </div>
          </div>

          <div className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out relative mt-[72px] mx-auto max-w-[1140px] px-[20px]">
            <div className="absolute left-[-30%] right-[-30%] top-[-75%] bottom-[5%] z-0 blur-[130px] opacity-[0.78] pointer-events-none animate-[glow-breathe_10s_ease-in-out_infinite]" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 18%, #000 50%, #000 100%)' }}>
              <div className="absolute left-[5%] top-[18%] w-[55%] h-[78%] rounded-full opacity-95" style={{ background: 'radial-gradient(circle, oklch(0.58 0.19 265), transparent 70%)' }} />
              <div className="absolute right-[5%] top-[14%] w-[55%] h-[82%] rounded-full opacity-90" style={{ background: 'radial-gradient(circle, oklch(0.54 0.16 305), oklch(0.48 0.13 285) 50%, transparent 75%)' }} />
              <div className="absolute left-[30%] top-[8%] w-[40%] h-[60%] rounded-full opacity-65" style={{ background: 'radial-gradient(circle, oklch(0.58 0.13 335), transparent 70%)' }} />
            </div>
            <ProtovibeMockup accent={t.accent} />
          </div>
        </section>

        {/* Powered by */}
        <PoweredBy accent={t.accent} />

        {/* Testimonial */}
        <section className="pv-reveal opacity-0 translate-y-4 transition-all duration-700 ease-out max-w-[880px] mx-auto py-[64px] px-0 sm:py-[96px] sm:px-[20px] grid grid-cols-1 sm:grid-cols-[56px_1fr] gap-[16px] sm:gap-x-[28px] sm:gap-y-[32px] items-start">
          <span className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-extrabold text-[64px] sm:text-[88px] leading-none opacity-85 pointer-events-none select-none sm:-mt-[14px] self-start" style={{ color: t.accent }} aria-hidden="true">“</span>
          <div className="flex flex-col gap-[32px]">
            <p className="font-[Syne,ui-sans-serif,system-ui,sans-serif] font-semibold text-[clamp(22px,2.4vw,32px)] leading-[1.35] tracking-[-0.02em] text-[#f4f4f6] m-0 text-balance">
              Protovibe combines the best parts of <em className="not-italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-semibold" style={{ color: t.accent }}>Webflow</em>, <em className="not-italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-semibold" style={{ color: t.accent }}>Figma</em> and <em className="not-italic font-[Syne,ui-sans-serif,system-ui,sans-serif] font-semibold" style={{ color: t.accent }}>vibe-coding</em> — letting me achieve consistent results when working on complex products and design systems.
            </p>
            <div className="flex items-center gap-[14px] pt-[4px]">
              <div className="w-[44px] h-[44px] rounded-full bg-[rgba(255,255,255,0.10)] text-[#c8c8d0] flex items-center justify-center font-semibold text-[14px] shrink-0">HD</div>
              <div className="flex flex-col gap-[2px]">
                <div className="text-[#f4f4f6] font-semibold text-[15px]">Head of Design</div>
                <div className="text-[#7c7c88] text-[13px]">Protovibe Team</div>
              </div>
            </div>
          </div>
        </section>

        <ProblemSolution accent={t.accent} />
        <BYOAgent accent={t.accent} />
        <HowItWorks accent={t.accent} />
        <FeatureGrid accent={t.accent} />

        {/* Finale Wrapper */}
        <section className="relative pt-[80px]">
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[1500px] pointer-events-none blur-[140px] opacity-[0.45] z-0" style={{ background: 'radial-gradient(ellipse 45% 35% at 25% 75%, oklch(0.58 0.19 265), transparent 70%), radial-gradient(ellipse 45% 35% at 75% 75%, oklch(0.54 0.16 305), transparent 70%), radial-gradient(ellipse 55% 30% at 50% 60%, oklch(0.52 0.13 290), transparent 70%), radial-gradient(ellipse 70% 25% at 50% 95%, oklch(0.50 0.12 280), transparent 75%)' }} />
          <div className="relative z-[2]">
            <FAQ accent={t.accent} />
          </div>
          <FooterCTA accent={t.accent} onCTA={() => setInstallOpen(true)} />
        </section>
      </div>

      <InstallModal accent={t.accent} open={installOpen} onClose={() => setInstallOpen(false)} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent color" />
        <TweakColor label="Hex" value={t.accent} onChange={(v) => setTweak('accent', v)} />
        <div className="flex gap-[6px] flex-wrap">
          {ACCENT_PRESETS.map((p) => (
            <button key={p.value} title={p.label} onClick={() => setTweak('accent', p.value)}
              className="w-[28px] h-[22px] rounded-[5px] cursor-pointer p-0"
              style={{ background: p.value, border: t.accent.toLowerCase() === p.value.toLowerCase() ? '2px solid rgba(0,0,0,.6)' : '1px solid rgba(0,0,0,.15)' }} />
          ))}
        </div>
        <TweakSection label="Headline" />
        <div className="flex flex-col gap-[5px]">
          <div className="flex justify-between items-baseline text-[rgba(41,38,27,.72)]"><span className="font-medium">Copy</span></div>
          <textarea
            value={t.headline}
            onChange={(e) => setTweak('headline', e.target.value)}
            rows={3}
            className="w-full p-[8px_10px] border border-[rgba(0,0,0,.1)] rounded-[7px] bg-[rgba(255,255,255,.6)] font-inherit text-inherit resize-y outline-none focus:border-[rgba(0,0,0,.25)] focus:bg-[rgba(255,255,255,.85)]" />
          <div className="text-[rgba(41,38,27,.5)] text-[10px] mt-[2px]">
            Wrap the part you want colored with *asterisks*.
          </div>
        </div>
      </TweaksPanel>
    </div>
  );
}