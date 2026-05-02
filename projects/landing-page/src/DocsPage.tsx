import { useState, useEffect } from 'react';
import { SiteNav } from '@/SiteNav';
import { InstallModal } from '@/App';

type Section = { id: string; title: string };

const SECTIONS: Section[] = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'installation', title: 'Installation' },
  { id: 'first-project', title: 'Your first project' },
  { id: 'editing-components', title: 'Editing components' },
  { id: 'pv-blocks', title: 'pv-blocks explained' },
  { id: 'styling', title: 'Styling rules' },
  { id: 'shipping', title: 'Shipping your app' },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>(ids[0]);
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids.join(',')]);
  return active;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-background-sunken border border-border-default rounded p-[16px] overflow-x-auto text-[13px] leading-[1.6]">
      <code className="font-mono text-foreground-strong">{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  const [installOpen, setInstallOpen] = useState(false);
  const activeId = useActiveSection(SECTIONS.map((s) => s.id));

  useEffect(() => {
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const el = target.closest('[data-install]');
      if (el) {
        e.preventDefault();
        setInstallOpen(true);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div data-theme="dark" className="bg-background-default text-foreground-default text-[16px] leading-[1.55] antialiased min-h-screen relative">
      <SiteNav />

      <div className="relative z-[2] mx-auto px-[20px] md:px-[40px] max-w-[1340px] grid grid-cols-1 md:grid-cols-[220px_1fr] gap-[40px] md:gap-[60px] py-[40px] md:py-[60px]">
        <aside className="md:sticky md:top-[80px] self-start">
          <div className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-primary">
            Documentation
          </div>
          <nav className="flex flex-col gap-[6px]">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                data-active={activeId === s.id}
                className="text-[14px] text-foreground-secondary py-[6px] px-[10px] rounded transition-colors hover:text-foreground-strong hover:bg-background-secondary data-[active=true]:text-foreground-strong data-[active=true]:bg-background-secondary data-[active=true]:font-semibold"
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* pv-block-start:ar01x9 */}
        <article data-pv-block="ar01x9" className="max-w-[760px] flex flex-col gap-[40px]">
          {/* pv-editable-zone-start:zn02k4 */}
            {/* pv-block-start:hd0301 */}
            <header data-pv-block="hd0301" className="flex flex-col gap-[12px]">
              {/* pv-editable-zone-start:zhdr01 */}
                {/* pv-block-start:dv0401 */}
                <div data-pv-block="dv0401" className="font-bold text-[12px] tracking-[0.18em] uppercase text-foreground-primary">Docs</div>
                {/* pv-block-end:dv0401 */}
                {/* pv-block-start:hd0501 */}
                <h1 data-pv-block="hd0501" className="font-secondary font-bold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.02em] text-foreground-strong m-0">
                  Protovibe Studio documentation
                </h1>
                {/* pv-block-end:hd0501 */}
                {/* pv-block-start:pp0601 */}
                <p data-pv-block="pp0601" className="text-foreground-secondary text-[16px] leading-[1.6] max-w-[64ch]">
                  Everything you need to set up Protovibe, design on the canvas, and ship a real React app.
                </p>
                {/* pv-block-end:pp0601 */}
              {/* pv-editable-zone-end:zhdr01 */}
            </header>
            {/* pv-block-end:hd0301 */}

            {/* pv-block-start:sc0701 */}
            <section data-pv-block="sc0701" id="introduction" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin0701 */}
                {/* pv-block-start:hd0801 */}
                <h2 data-pv-block="hd0801" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Introduction</h2>
                {/* pv-block-end:hd0801 */}
                {/* pv-block-start:pp0901 */}
                <p data-pv-block="pp0901" className="text-foreground-secondary leading-[1.7]">
                  Protovibe is an AST-based visual builder. Instead of generating throwaway markup, it reads and writes your real React source on disk. Everything you see on the canvas maps to a node in your component tree.
                </p>
                {/* pv-block-end:pp0901 */}
                {/* pv-block-start:pp1001 */}
                <p data-pv-block="pp1001" className="text-foreground-secondary leading-[1.7]">
                  The docs below walk you through getting a project running, the conventions Protovibe relies on, and how to ship.
                </p>
                {/* pv-block-end:pp1001 */}
              {/* pv-editable-zone-end:zin0701 */}
            </section>
            {/* pv-block-end:sc0701 */}

            {/* pv-block-start:h4suah */}
            <section data-pv-block="h4suah" id="introduction" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin0701 */}
                {/* pv-block-start:p9u1y9 */}
                <h2 data-pv-block="p9u1y9" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Introduction</h2>
                {/* pv-block-end:p9u1y9 */}
                {/* pv-block-start:wlx9sk */}
                <p data-pv-block="wlx9sk" className="text-foreground-secondary leading-[1.7]">
                  Protovibe is an AST-based visual builder. Instead of generating throwaway markup, it reads and writes your real React source on disk. Everything you see on the canvas maps to a node in your component tree.
                </p>
                {/* pv-block-end:wlx9sk */}
                {/* pv-block-start:9v8thh */}
                <p data-pv-block="9v8thh" className="text-foreground-secondary leading-[1.7]">
                  The docs below walk you through getting a project running, the conventions Protovibe relies on, and how to ship.
                </p>
                {/* pv-block-end:9v8thh */}
              {/* pv-editable-zone-end:zin0701 */}
            </section>
            {/* pv-block-end:h4suah */}

            {/* pv-block-start:sc1601 */}
            <section data-pv-block="sc1601" id="first-project" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin1601 */}
                {/* pv-block-start:hd1701 */}
                <h2 data-pv-block="hd1701" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Your first project</h2>
                {/* pv-block-end:hd1701 */}
                {/* pv-block-start:pp1801 */}
                <p data-pv-block="pp1801" className="text-foreground-secondary leading-[1.7]">
                  Open the project folder in your editor and run:
                </p>
                {/* pv-block-end:pp1801 */}
                {/* pv-block-start:cb1901 */}
                <CodeBlock data-pv-block="cb1901">{`pnpm dev`}</CodeBlock>
                {/* pv-block-end:cb1901 */}
                {/* pv-block-start:pp2001 */}
                <p data-pv-block="pp2001" className="text-foreground-secondary leading-[1.7]">
                  Protovibe attaches to your running Vite dev server. Any change you make on the canvas writes directly to a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">.tsx</code> file.
                </p>
                {/* pv-block-end:pp2001 */}
                {/* pv-block-start:im2101 */}
                <div data-pv-block="im2101" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-01-at-191643.png')] bg-contain bg-center bg-no-repeat aspect-[664/401] rounded border border-border-default" role="img" aria-label="Protovibe canvas screenshot" />
                {/* pv-block-end:im2101 */}
              {/* pv-editable-zone-end:zin1601 */}
            </section>
            {/* pv-block-end:sc1601 */}

            {/* pv-block-start:sc2201 */}
            <section data-pv-block="sc2201" id="editing-components" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin2201 */}
                {/* pv-block-start:hd2301 */}
                <h2 data-pv-block="hd2301" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Editing components</h2>
                {/* pv-block-end:hd2301 */}
                {/* pv-block-start:pp2401 */}
                <p data-pv-block="pp2401" className="text-foreground-secondary leading-[1.7]">
                  Components live in <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">src/components/ui/</code>. Each editable component exports a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pvConfig</code> describing its props, default content, and import path.
                </p>
                {/* pv-block-end:pp2401 */}
                {/* pv-block-start:cb2501 */}
                <CodeBlock data-pv-block="cb2501">{`export const pvConfig = {
  name: 'Button',
  componentId: 'Button',
  displayName: 'Button',
  importPath: '@/components/ui/button',
  defaultContent: <PvDefaultContent />,
  props: {
    variant: { type: 'select', options: ['default', 'ghost'] },
    label: { type: 'string' },
  },
};`}</CodeBlock>
                {/* pv-block-end:cb2501 */}
              {/* pv-editable-zone-end:zin2201 */}
            </section>
            {/* pv-block-end:sc2201 */}

            {/* pv-block-start:sc2601 */}
            <section data-pv-block="sc2601" id="pv-blocks" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin2601 */}
                {/* pv-block-start:hd2701 */}
                <h2 data-pv-block="hd2701" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">pv-blocks explained</h2>
                {/* pv-block-end:hd2701 */}
                {/* pv-block-start:pp2801 */}
                <p data-pv-block="pp2801" className="text-foreground-secondary leading-[1.7]">
                  Every element you should be able to reorder, copy, or delete on the canvas is wrapped in a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pv-block</code> comment pair, and lives inside a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pv-editable-zone</code>.
                </p>
                {/* pv-block-end:pp2801 */}
                {/* pv-block-start:cb2901 */}
                <CodeBlock data-pv-block="cb2901">{`{/* pv-editable-zone-start:x1y2z3 */}
  {/* pv-block-start:a4b5c6 */}
  <h2 data-pv-block="a4b5c6">Heading</h2>
  {/* pv-block-end:a4b5c6 */}
{/* pv-editable-zone-end:x1y2z3 */}`}</CodeBlock>
                {/* pv-block-end:cb2901 */}
              {/* pv-editable-zone-end:zin2601 */}
            </section>
            {/* pv-block-end:sc2601 */}

            {/* pv-block-start:sc3001 */}
            <section data-pv-block="sc3001" id="styling" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin3001 */}
                {/* pv-block-start:hd3101 */}
                <h2 data-pv-block="hd3101" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Styling rules</h2>
                {/* pv-block-end:hd3101 */}
                {/* pv-block-start:pp3201 */}
                <p data-pv-block="pp3201" className="text-foreground-secondary leading-[1.7]">
                  Use static Tailwind class strings only. Express variants with <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">data-*</code> attributes so the inspector can read the active state from the DOM.
                </p>
                {/* pv-block-end:pp3201 */}
                {/* pv-block-start:cb3301 */}
                <CodeBlock data-pv-block="cb3301">{`<button
  data-variant={variant}
  data-size={size}
  className={cn('base-classes data-[variant=ghost]:bg-transparent', className)}
/>`}</CodeBlock>
                {/* pv-block-end:cb3301 */}
              {/* pv-editable-zone-end:zin3001 */}
            </section>
            {/* pv-block-end:sc3001 */}

            {/* pv-block-start:sc3401 */}
            <section data-pv-block="sc3401" id="shipping" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zin3401 */}
                {/* pv-block-start:hd3501 */}
                <h2 data-pv-block="hd3501" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Shipping your app</h2>
                {/* pv-block-end:hd3501 */}
                {/* pv-block-start:pp3601 */}
                <p data-pv-block="pp3601" className="text-foreground-secondary leading-[1.7]">
                  Run <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pnpm build</code>. The output in <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">dist/</code> is a fully static, prerendered site you can drop on any CDN.
                </p>
                {/* pv-block-end:pp3601 */}
                {/* pv-block-start:pp3701 */}
                <p data-pv-block="pp3701" className="text-foreground-secondary leading-[1.7]">
                  Cloudflare Pages, Netlify, and Vercel all work with zero configuration.
                </p>
                {/* pv-block-end:pp3701 */}
              {/* pv-editable-zone-end:zin3401 */}
            </section>
            {/* pv-block-end:sc3401 */}
          {/* pv-editable-zone-end:zn02k4 */}
        </article>
        {/* pv-block-end:ar01x9 */}
      </div>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}
