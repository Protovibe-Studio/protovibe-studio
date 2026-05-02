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

        <article className="max-w-[760px] flex flex-col gap-[40px]">
          <header className="flex flex-col gap-[12px]">
            <div className="font-bold text-[12px] tracking-[0.18em] uppercase text-foreground-primary">Docs</div>
            <h1 className="font-secondary font-bold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.02em] text-foreground-strong m-0">
              Protovibe documentation
            </h1>
            <p className="text-foreground-secondary text-[16px] leading-[1.6] max-w-[64ch]">
              Everything you need to set up Protovibe, design on the canvas, and ship a real React app.
            </p>
          </header>

          <section id="introduction" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Introduction</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Protovibe is an AST-based visual builder. Instead of generating throwaway markup, it reads and writes your real React source on disk. Everything you see on the canvas maps to a node in your component tree.
            </p>
            <p className="text-foreground-secondary leading-[1.7]">
              The docs below walk you through getting a project running, the conventions Protovibe relies on, and how to ship.
            </p>
          </section>

          <section id="installation" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Installation</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              On macOS, paste the install command into your terminal. On Windows, download the ZIP and run the bundled <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">install.bat</code>.
            </p>
            <CodeBlock>{`curl -fsSL https://protovibe.studio/install.sh | bash`}</CodeBlock>
            <p className="text-foreground-secondary leading-[1.7]">
              The script installs Node, pnpm, and a starter Protovibe project in a folder of your choice.
            </p>
          </section>

          <section id="first-project" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Your first project</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Open the project folder in your editor and run:
            </p>
            <CodeBlock>{`pnpm dev`}</CodeBlock>
            <p className="text-foreground-secondary leading-[1.7]">
              Protovibe attaches to your running Vite dev server. Any change you make on the canvas writes directly to a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">.tsx</code> file.
            </p>
            <div className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-01-at-191643.png')] bg-contain bg-center bg-no-repeat aspect-[664/401] rounded border border-border-default" role="img" aria-label="Protovibe canvas screenshot" />
          </section>

          <section id="editing-components" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Editing components</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Components live in <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">src/components/ui/</code>. Each editable component exports a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pvConfig</code> describing its props, default content, and import path.
            </p>
            <CodeBlock>{`export const pvConfig = {
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
          </section>

          <section id="pv-blocks" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">pv-blocks explained</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Every element you should be able to reorder, copy, or delete on the canvas is wrapped in a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pv-block</code> comment pair, and lives inside a <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pv-editable-zone</code>.
            </p>
            <CodeBlock>{`{/* pv-editable-zone-start:x1y2z3 */}
  {/* pv-block-start:a4b5c6 */}
  <h2 data-pv-block="a4b5c6">Heading</h2>
  {/* pv-block-end:a4b5c6 */}
{/* pv-editable-zone-end:x1y2z3 */}`}</CodeBlock>
          </section>

          <section id="styling" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Styling rules</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Use static Tailwind class strings only. Express variants with <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">data-*</code> attributes so the inspector can read the active state from the DOM.
            </p>
            <CodeBlock>{`<button
  data-variant={variant}
  data-size={size}
  className={cn('base-classes data-[variant=ghost]:bg-transparent', className)}
/>`}</CodeBlock>
          </section>

          <section id="shipping" className="flex flex-col gap-[16px] scroll-mt-[80px]">
            <h2 className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Shipping your app</h2>
            <p className="text-foreground-secondary leading-[1.7]">
              Run <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">pnpm build</code>. The output in <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">dist/</code> is a fully static, prerendered site you can drop on any CDN.
            </p>
            <p className="text-foreground-secondary leading-[1.7]">
              Cloudflare Pages, Netlify, and Vercel all work with zero configuration.
            </p>
          </section>
        </article>
      </div>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}
