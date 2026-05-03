import { useState, useEffect } from 'react';
import { SiteNav } from '@/SiteNav';
import { InstallModal } from '@/App';
import { InfoBoxBanner } from '@/components/ui/info-box-banner'
import { Icon } from '@/components/ui/icon'
import { Callout } from '@/components/ui/callout'

type Section = { id: string; title: string };

const SECTIONS: Section[] = [
  { id: 'new-project', title: 'Creating a new project' },
  { id: 'shortcuts', title: 'Keyboard shortcuts' },
  { id: 'design-system', title: 'Adjusting the design system' },
  { id: 'ai-agents', title: 'Working with AI agents' },
  { id: 'app-tab', title: 'Working in the App tab' },
  { id: 'traversing', title: 'Traversing the tree' },
  { id: 'styling-components', title: 'Styling components' },
  { id: 'creating-components', title: 'Creating new components' },
  { id: 'sketchpad', title: 'Working in the Sketchpad' },
  { id: 'styling-elements', title: 'Styling individual elements' },
  { id: 'responsive', title: 'Responsive design' },
  { id: 'prompts', title: 'Prompts and context' },
  { id: 'publishing', title: 'Publishing to Cloudflare' },
  { id: 'collaboration', title: 'Collaboration' },
  { id: 'updating', title: 'Updating to new version' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
  { id: 'technical', title: 'Under the hood' },
  { id: 'license', title: 'License' },
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

function InlineCode({ children }: { children: string }) {
  return (
    <code className="font-mono text-[13px] px-[6px] py-[1px] rounded bg-background-sunken text-foreground-strong">
      {children}
    </code>
  );
}

const MODIFIER_ICONS: Record<string, string> = {
  cmd: 'apple-keyboard-command',
  command: 'apple-keyboard-command',
  shift: 'apple-keyboard-shift',
  option: 'apple-keyboard-option',
  alt: 'apple-keyboard-option',
  ctrl: 'apple-keyboard-control',
  control: 'apple-keyboard-control',
  enter: 'keyboard-return',
  return: 'keyboard-return',
  tab: 'keyboard-tab',
  esc: 'keyboard-esc',
  arrowup: 'arrow-up',
  arrowdown: 'arrow-down',
  arrowleft: 'arrow-left',
  arrowright: 'arrow-right',
};

function Shortcut({ keys }: { keys: string[] }) {
  return (
    <kbd className="inline-flex items-center gap-[4px] align-middle font-mono text-[13px] px-[8px] py-[3px] rounded border border-border-default bg-background-sunken text-foreground-strong">
      {keys.map((key, i) => {
        const normalized = key.toLowerCase().replace(/\s+/g, '');
        const iconSymbol = MODIFIER_ICONS[normalized];
        return iconSymbol ? (
          <Icon key={i} iconSymbol={iconSymbol} size="sm" />
        ) : (
          <span key={i}>{key}</span>
        );
      })}
    </kbd>
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

      <div className="relative z-[2] mx-auto px-[20px] md:px-[40px] max-w-[1340px] grid grid-cols-1 md:grid-cols-[240px_1fr] gap-[40px] md:gap-[60px] py-[40px] md:py-[60px]">
        <aside className="md:sticky md:top-[80px] self-start">
          <div className="font-bold text-[12px] tracking-[0.18em] uppercase mb-[16px] text-foreground-tertiary pl-2">
            Docs
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
        <article data-pv-block="ar01x9" className="max-w-[760px] flex flex-col gap-[72px]">
          {/* pv-editable-zone-start:zn02k4 */}
            {/* pv-block-start:hd0301 */}
            <header data-pv-block="hd0301" className="flex flex-col gap-[12px]">
              {/* pv-editable-zone-start:zhdr01 */}
                {/* pv-block-start:hd0501 */}
                <h1 data-pv-block="hd0501" className="font-secondary font-bold text-[clamp(32px,4vw,48px)] leading-[1.05] tracking-[-0.02em] text-foreground-strong m-0">
                  Protovibe Studio documentation
                </h1>
                {/* pv-block-end:hd0501 */}
                {/* pv-block-start:pp0601 */}
                <p data-pv-block="pp0601" className="text-foreground-secondary text-[16px] leading-[1.6] max-w-[64ch]">
                  A guided tour through Protovibe — from spinning up a project to shipping it to the web.
                </p>
                {/* pv-block-end:pp0601 */}
              {/* pv-editable-zone-end:zhdr01 */}
            </header>
            {/* pv-block-end:hd0301 */}

            {/* Creating a new project */}
            {/* pv-block-start:s1np01 */}
            <section data-pv-block="s1np01" id="new-project" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z1np01 */}
                {/* pv-block-start:h1np02 */}
                <h2 data-pv-block="h1np02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">
                  Creating and running projects
                </h2>
                {/* pv-block-end:h1np02 */}
                {/* pv-block-start:0i9rzn */}
                <div data-pv-block="0i9rzn" className="flex flex-col gap-2">
                  {/* pv-editable-zone-start:9rrk2c */}
                  {/* pv-block-start:p1np04 */}
                  <p data-pv-block="p1np04" className="text-foreground-secondary leading-[1.7]">
                    In Protovibe your projects is just a folder with code. To start visualy design it you need to run the development server, but you can do it without terminal. Open Protovibe and pick New project. You will be asked for a folder and a project name. Protovibe scaffolds a project template for you.
                  </p>
                  {/* pv-block-end:p1np04 */}
                  {/* pv-block-start:504clx */}
                  <p data-pv-block="504clx" className="text-foreground-secondary leading-[1.7]">
                    Once the project is ready, click the "Open Protovibe editor" to start designing. When you're done you can stop the project.
                  </p>
                  {/* pv-block-end:504clx */}
                  {/* pv-editable-zone-end:9rrk2c */}
                </div>
                {/* pv-block-end:0i9rzn */}


                {/* pv-block-start:aa6cp6 */}
                <div data-pv-block="aa6cp6" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-063250.png')] bg-contain bg-center bg-no-repeat aspect-[1117/807]" />
                {/* pv-block-end:aa6cp6 */}
              {/* pv-editable-zone-end:z1np01 */}
            </section>
            {/* pv-block-end:s1np01 */}

            {/* Keyboard shortcuts */}
            {/* pv-block-start:s2ks01 */}
            <section data-pv-block="s2ks01" id="shortcuts" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z2ks01 */}
                {/* pv-block-start:h2ks02 */}
                <h2 data-pv-block="h2ks02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Keyboard shortcuts</h2>
                {/* pv-block-end:h2ks02 */}
                {/* pv-block-start:p2ks03 */}
                <p data-pv-block="p2ks03" className="text-foreground-secondary leading-[1.7]">
                  Once you get used to these shortcuts, designing in Protovibe starts to feel like playing a video game — you can add, traverse, and delete elements without ever touching the mouse.
                </p>
                {/* pv-block-end:p2ks03 */}
                {/* pv-block-start:u2ks04 */}
                <ul data-pv-block="u2ks04" className="flex flex-col gap-[10px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:z2ksu1 */}
                    {/* pv-block-start:x4g68p */}
                    <div data-pv-block="x4g68p" className="flex flex-col gap-2 mb-4">
                      {/* pv-editable-zone-start:mb5b6m */}
                      {/* pv-block-start:zhzizo */}
                      <h3 data-pv-block="zhzizo" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                        Classic shortcuts
                      </h3>
                      {/* pv-block-end:zhzizo */}
                      {/* pv-block-start:l2ks10 */}
                      <li data-pv-block="l2ks10"><Shortcut keys={['cmd', 'Z']} /> <Shortcut keys={['cmd', 'shift', 'Z']} /> — undo and redo. Protovibe is editing real files, so undo also rolls back the source.</li>
                      {/* pv-block-end:l2ks10 */}
                      {/* pv-block-start:l2ks06 */}
                      <li data-pv-block="l2ks06"><Shortcut keys={['cmd', 'C']} /> <Shortcut keys={['cmd', 'V']} /> <Shortcut keys={['cmd', 'X']} /> — copy, paste, cut the selected element. Paste drops the element <em>inside</em> the current selection.</li>
                      {/* pv-block-end:l2ks06 */}
                      {/* pv-block-start:l2ks6b */}
                      <li data-pv-block="l2ks6b"><Shortcut keys={['cmd', 'shift', 'V']} /> — paste <strong className="text-foreground-strong">after</strong> the selected element (as the next sibling). Useful when you want the new element <em>next to</em> the current one rather than inside it.</li>
                      {/* pv-block-end:l2ks6b */}
                      {/* pv-block-start:l2ks07 */}
                      <li data-pv-block="l2ks07"><Shortcut keys={['cmd', 'D']} /> — duplicate the selection in place.</li>
                      {/* pv-block-end:l2ks07 */}
                      {/* pv-block-start:tpz88z */}
                      <li data-pv-block="tpz88z"><Shortcut keys={['Backspace']} /> — delete the selected element.</li>
                      {/* pv-block-end:tpz88z */}
                      {/* pv-block-start:tpzaaa */}
                      <li data-pv-block="tpzaaa"><Shortcut keys={['shift', 'Click']} /> — multi-select elements to delete multiple or wrap.</li>
                      {/* pv-block-end:tpzaaa */}
                      {/* pv-block-start:wra91x */}
                      <li data-pv-block="wra91x"><Shortcut keys={['shift', 'A']} /> — wrap the selected elements into a new container. Select multiple elements first with <Shortcut keys={['shift', 'Click']} />, then press <Shortcut keys={['shift', 'A']} /> to group them inside a fresh <InlineCode>div</InlineCode>.</li>
                      {/* pv-block-end:wra91x */}
                      {/* pv-block-start:u7i818 */}
                      <li data-pv-block="u7i818"><Shortcut keys={['[']} /> <Shortcut keys={[']']} /> — move the selected element up or down among its siblings.</li>
                      {/* pv-block-end:u7i818 */}
                      {/* pv-block-start:12q9p9 */}
                      <li data-pv-block="12q9p9"><Shortcut keys={['Space']} /> (hold) — pan the canvas in the Sketchpad.</li>
                      {/* pv-block-end:12q9p9 */}
                      {/* pv-editable-zone-end:mb5b6m */}
                    </div>
                    {/* pv-block-end:x4g68p */}


                    {/* pv-block-start:lsvjjd */}
                    <div data-pv-block="lsvjjd" className="flex flex-col gap-2 mb-4">
                      {/* pv-editable-zone-start:ozc8sa */}
                      {/* pv-block-start:jdnkn6 */}
                      <h3 data-pv-block="jdnkn6" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                        Navigating what is selected on page
                      </h3>
                      {/* pv-block-end:jdnkn6 */}
                      {/* pv-block-start:l2ks05 */}
                      <li data-pv-block="l2ks05"><Shortcut keys={['W']} /> <Shortcut keys={['A']} /> <Shortcut keys={['S']} /> <Shortcut keys={['D']} /> — move the selection to parent, child, previous, next, through the element tree.</li>
                      {/* pv-block-end:l2ks05 */}
                      {/* pv-editable-zone-end:ozc8sa */}
                    </div>
                    {/* pv-block-end:lsvjjd */}

                    {/* pv-block-start:3o6eam */}
                    <div data-pv-block="3o6eam" className="flex flex-col gap-2">
                      {/* pv-editable-zone-start:rmp78c */}
                      {/* pv-block-start:xnh34c */}
                      <h3 data-pv-block="xnh34c" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                        Adding elements vie keyboard shortcuts
                      </h3>
                      {/* pv-block-end:xnh34c */}
                      {/* pv-block-start:l2ks7a */}
                      <li data-pv-block="l2ks7a"><Shortcut keys={['cmd', 'E']} /> — open <strong className="text-foreground-strong">Add element</strong> to insert a new element <em>inside</em> the current selection. Only works when the selected element is a container that allows children (see the frame below).</li>
                      {/* pv-block-end:l2ks7a */}
                      {/* pv-block-start:l2ks7b */}
                      <li data-pv-block="l2ks7b"><Shortcut keys={['cmd', 'shift', 'E']} /> — <strong className="text-foreground-strong">Add element after</strong>: insert a new element as the next sibling of the current selection. The fastest way to chain new items in a list or row.</li>
                      {/* pv-block-end:l2ks7b */}
                      {/* pv-editable-zone-end:rmp78c */}
                    </div>
                    {/* pv-block-end:3o6eam */}

                  {/* pv-editable-zone-end:z2ksu1 */}
                </ul>
                {/* pv-block-end:u2ks04 */}
                {/* pv-block-start:i2ks0b */}
                <Callout data-pv-block="i2ks0b" variant="info" title="Why can't I add an element somewhere?">
                  <p>Sometimes <Shortcut keys={['cmd', 'E']} /> does nothing, or "Add element" is not visible. That's because the selected element doesn't have the special markers Protovibe needs to know <em>where</em> a new child can safely be inserted.</p>
                  <p className="mt-[10px]">Ask your coding agent to "add a <InlineCode>pv-editable-zone</InlineCode> to this container so I can drop elements inside." Once the zone is there, <Shortcut keys={['cmd', 'E']} /> works normally.</p>
                </Callout>
                {/* pv-block-end:i2ks0b */}
              {/* pv-editable-zone-end:z2ks01 */}
            </section>
            {/* pv-block-end:s2ks01 */}

            {/* Adjusting the design system */}
            {/* pv-block-start:s3ds01 */}
            <section data-pv-block="s3ds01" id="design-system" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z3ds01 */}
                {/* pv-block-start:h3ds02 */}
                <h2 data-pv-block="h3ds02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Adjusting the design system</h2>
                {/* pv-block-end:h3ds02 */}
                {/* pv-block-start:p3ds03 */}
                <p data-pv-block="p3ds03" className="text-foreground-secondary leading-[1.7]">
                  Open the <strong className="text-foreground-strong">Design System</strong> tab to edit your color tokens, radii, fonts, and spacing scale. Changes flow through every component instantly — there are no styles to "republish".
                </p>
                {/* pv-block-end:p3ds03 */}
                {/* pv-block-start:uwdfpk */}
                <div data-pv-block="uwdfpk" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-063925.png')] bg-contain bg-center bg-no-repeat aspect-[279/488] m-auto w-60" />
                {/* pv-block-end:uwdfpk */}
                {/* pv-block-start:h3ds04 */}
                <h3 data-pv-block="h3ds04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Editing colors</h3>
                {/* pv-block-end:h3ds04 */}
                {/* pv-block-start:p3ds05 */}
                <p data-pv-block="p3ds05" className="text-foreground-secondary leading-[1.7]">
                  Each color is a <em>semantic token</em> — for example <InlineCode>background-primary</InlineCode> or <InlineCode>foreground-secondary</InlineCode>. Click any swatch to change its value. The whole app picks up the new color in place because every component refers to the token, not a raw hex.
                </p>
                {/* pv-block-end:p3ds05 */}
                {/* pv-block-start:p3ds5a */}
                <p data-pv-block="p3ds5a" className="text-foreground-secondary leading-[1.7]">
                  Protovibe ships with most of the tokens you'll need out of the box — backgrounds, foregrounds, borders, primary/destructive/warning roles, and a few hover/active variants. For most projects you'll just retune the values, not add new ones.
                </p>
                {/* pv-block-end:p3ds5a */}
                {/* pv-block-start:t1zo6j */}
                <div data-pv-block="t1zo6j" className="flex flex-row justify-center gap-10 items-start">
                  {/* pv-editable-zone-start:8wztcx */}
                  {/* pv-block-start:vgepiw */}
                  <div data-pv-block="vgepiw" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-064043.png')] bg-contain bg-center bg-no-repeat aspect-[139/211] w-60" />
                  {/* pv-block-end:vgepiw */}
                  {/* pv-block-start:78n58d */}
                  <div data-pv-block="78n58d" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-064320.png')] bg-contain bg-center bg-no-repeat aspect-[303/602] w-60" />
                  {/* pv-block-end:78n58d */}
                  {/* pv-editable-zone-end:8wztcx */}
                </div>
                {/* pv-block-end:t1zo6j */}

                {/* pv-block-start:h3lm01 */}
                <h3 data-pv-block="h3lm01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Light and dark mode</h3>
                {/* pv-block-end:h3lm01 */}
                {/* pv-block-start:p3lm02 */}
                <p data-pv-block="p3lm02" className="text-foreground-secondary leading-[1.7]">
                  Every token has a light and dark value, so you design the app in both modes at the same time. Flip between them any time using the mode toggle in the <strong className="text-foreground-strong">
                    bottom left
                  </strong> — it switches both the app preview and the components grid.
                </p>
                {/* pv-block-end:p3lm02 */}
                {/* pv-block-start:h3ds5b */}
                <h3 data-pv-block="h3ds5b" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">How to add new colors?</h3>
                {/* pv-block-end:h3ds5b */}
                {/* pv-block-start:p3ds5c */}
                <p data-pv-block="p3ds5c" className="text-foreground-secondary leading-[1.7]">
                  The Design System tab lets you <em>edit</em> existing tokens, but it can't yet create new ones from scratch. Tokens live in your project's CSS file as variables, and adding a new one means writing a small piece of code.
                </p>
                {/* pv-block-end:p3ds5c */}
                {/* pv-block-start:a3ds5d */}
                <Callout data-pv-block="a3ds5d" variant="agent">
                  Ask your coding agent something like "add a new color token called <InlineCode>background-accent</InlineCode> and wire it through the design system." It'll add the variable to <InlineCode>index.css</InlineCode> and the matching <InlineCode>@theme</InlineCode> block. Once that's done, the new token shows up in Protovibe's color pickers and you can edit its value visually like any other.
                </Callout>
                {/* pv-block-end:a3ds5d */}
                {/* pv-block-start:h3ds06 */}
                <h3 data-pv-block="h3ds06" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">How to create gradients?</h3>
                {/* pv-block-end:h3ds06 */}
                {/* pv-block-start:p3ds07 */}
                <p data-pv-block="p3ds07" className="text-foreground-secondary leading-[1.7]">
                  Gradients are stored as a special kind of color token: any token whose name starts with <InlineCode>gradient-</InlineCode> (for example <InlineCode>gradient-hero</InlineCode>) is treated as a gradient instead of a flat color. Protovibe automatically switches the swatch editor into gradient mode for those, letting you pick stops, direction, and opacity visually.
                </p>
                {/* pv-block-end:p3ds07 */}
                {/* pv-block-start:p3ds08 */}
                <p data-pv-block="p3ds08" className="text-foreground-secondary leading-[1.7]">
                  Once saved, the gradient appears in any background-color picker just like a normal token. The prefix is the only thing that distinguishes gradients from solid colors.
                </p>
                {/* pv-block-end:p3ds08 */}
                {/* pv-block-start:3b6kxr */}
                <div data-pv-block="3b6kxr" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:0epxue */}
                  {/* pv-block-start:ptl297 */}
                  <div data-pv-block="ptl297" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-064832.png')] bg-contain bg-center bg-no-repeat aspect-[307/577] w-60" />
                  {/* pv-block-end:ptl297 */}
                  {/* pv-editable-zone-end:0epxue */}
                </div>
                {/* pv-block-end:3b6kxr */}

                {/* pv-block-start:a3ds5e */}
                <Callout data-pv-block="a3ds5e" variant="agent">
                  To add a brand-new gradient token, ask your coding agent: "add a new color token called <InlineCode>gradient-hero</InlineCode>." Once the token exists, return to the Design System tab and edit the gradient stops visually — no code needed for the actual colors.
                </Callout>
                {/* pv-block-end:a3ds5e */}

                {/* pv-block-start:h3sh01 */}
                <h3 data-pv-block="h3sh01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Adjusting shadows</h3>
                {/* pv-block-end:h3sh01 */}
                {/* pv-block-start:p3sh02 */}
                <p data-pv-block="p3sh02" className="text-foreground-secondary leading-[1.7]">
                  Shadow tokens (<InlineCode>shadow-sm</InlineCode>, <InlineCode>shadow-md</InlineCode>, <InlineCode>shadow-lg</InlineCode>, …) work the same way as colors — edit one, and every component using it updates. Click any shadow swatch to open Protovibe's <strong className="text-foreground-strong">built-in shadow editor</strong>.
                </p>
                {/* pv-block-end:p3sh02 */}
                {/* pv-block-start:p3sh03 */}
                <p data-pv-block="p3sh03" className="text-foreground-secondary leading-[1.7]">
                  Instead of fiddling with a single blur and offset, the editor lets you stack multiple soft layers — exactly the trick designers use to get those expensive-looking, smooth shadows you see on premium product sites. Tune layer color, opacity, blur, spread, and vertical offset for each, and preview the result live as you drag.
                </p>
                {/* pv-block-end:p3sh03 */}
                {/* pv-block-start:p3sh04 */}
                <p data-pv-block="p3sh04" className="text-foreground-secondary leading-[1.7]">
                  Tip: a beautiful shadow almost always combines a tight, dark layer for contact with a wider, fainter layer for ambient light. Start there and adjust to taste.
                </p>
                {/* pv-block-end:p3sh04 */}

                {/* pv-block-start:h3ot01 */}
                <h3 data-pv-block="h3ot01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Editing other tokens</h3>
                {/* pv-block-end:h3ot01 */}
                {/* pv-block-start:p3ot02 */}
                <p data-pv-block="p3ot02" className="text-foreground-secondary leading-[1.7]">
                  The Design System tab also exposes the rest of your visual scale — and they all work the same way: edit a value, and the whole app updates wherever the token is used.
                </p>
                {/* pv-block-end:p3ot02 */}
                {/* pv-block-start:u3ot03 */}
                <ul data-pv-block="u3ot03" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:z3ot03 */}
                    {/* pv-block-start:l3ot04 */}
                    <li data-pv-block="l3ot04"><strong className="text-foreground-strong">Font size</strong> — the typography scale (<InlineCode>text-sm</InlineCode>, <InlineCode>text-base</InlineCode>, <InlineCode>text-lg</InlineCode>, headings…). Retune the steps to make your app feel tighter or more airy across the board.</li>
                    {/* pv-block-end:l3ot04 */}
                    {/* pv-block-start:l3ot05 */}
                    <li data-pv-block="l3ot05"><strong className="text-foreground-strong">Letter spacing</strong> — tracking values used by display headings, all-caps labels, and body text.</li>
                    {/* pv-block-end:l3ot05 */}
                    {/* pv-block-start:l3ot06 */}
                    <li data-pv-block="l3ot06"><strong className="text-foreground-strong">Line height</strong> — the leading scale that controls vertical rhythm for paragraphs and headings.</li>
                    {/* pv-block-end:l3ot06 */}
                    {/* pv-block-start:l3ot07 */}
                    <li data-pv-block="l3ot07"><strong className="text-foreground-strong">Border radius</strong> — corner roundness from <InlineCode>rounded-sm</InlineCode> up to <InlineCode>rounded-full</InlineCode>. One of the strongest brand-shaping levers.</li>
                    {/* pv-block-end:l3ot07 */}
                    {/* pv-block-start:l3ot08 */}
                    <li data-pv-block="l3ot08"><strong className="text-foreground-strong">Spacing</strong> — the base spacing unit that drives padding, margin, and gap utilities everywhere.</li>
                    {/* pv-block-end:l3ot08 */}
                    {/* pv-block-start:l3ot09 */}
                    <li data-pv-block="l3ot09"><strong className="text-foreground-strong">Fonts</strong> — the primary and secondary typeface families used by your app.</li>
                    {/* pv-block-end:l3ot09 */}
                    {/* pv-block-start:jjj5ce */}
                    <div data-pv-block="jjj5ce" className="flex flex-col gap-2 items-center pt-4">
                      {/* pv-editable-zone-start:f94ktb */}
                      {/* pv-block-start:bvp9fn */}
                      <div data-pv-block="bvp9fn" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-064554.png')] bg-contain bg-center bg-no-repeat aspect-[271/420] w-60" />
                      {/* pv-block-end:bvp9fn */}
                      {/* pv-editable-zone-end:f94ktb */}
                    </div>
                    {/* pv-block-end:jjj5ce */}

                  {/* pv-editable-zone-end:z3ot03 */}
                </ul>
                {/* pv-block-end:u3ot03 */}

                {/* pv-block-start:h3cf01 */}
                <h3 data-pv-block="h3cf01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">How to add a custom font?</h3>
                {/* pv-block-end:h3cf01 */}
                {/* pv-block-start:p3cf02 */}
                <p data-pv-block="p3cf02" className="text-foreground-secondary leading-[1.7]">
                  The font picker shows a curated list of the most common Google Fonts so you can scroll, preview, and pick. If the font you want isn't in the list, don't worry — the picker also accepts <strong className="text-foreground-strong">any Google Font name</strong> typed in directly. Paste the exact name (for example <InlineCode>Fraunces</InlineCode> or <InlineCode>Bricolage Grotesque</InlineCode>) and Protovibe will load it for you.
                </p>
                {/* pv-block-end:p3cf02 */}
                {/* pv-block-start:c3cf03 */}
                <Callout data-pv-block="c3cf03" variant="info" title="What if it's not on Google Fonts?">
                  Custom typefaces from foundries like Pangram or Klim need to be self-hosted. Ask your coding agent to "add a custom font with these <InlineCode>.woff2</InlineCode> files and wire it as the primary font" — once it's in the project, it shows up in the font picker like any other.
                </Callout>
                {/* pv-block-end:c3cf03 */}
                {/* pv-block-start:4uwkgw */}
                <div data-pv-block="4uwkgw" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:gvft6n */}
                  {/* pv-block-start:nnwvie */}
                  <div data-pv-block="nnwvie" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065024.png')] bg-contain bg-center bg-no-repeat aspect-[275/502] w-60" />
                  {/* pv-block-end:nnwvie */}
                  {/* pv-editable-zone-end:gvft6n */}
                </div>
                {/* pv-block-end:4uwkgw */}

              {/* pv-editable-zone-end:z3ds01 */}
            </section>
            {/* pv-block-end:s3ds01 */}

            {/* Working with AI agents */}
            {/* pv-block-start:said01 */}
            <section data-pv-block="said01" id="ai-agents" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zaid01 */}
                {/* pv-block-start:haid02 */}
                <h2 data-pv-block="haid02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Working with AI agents</h2>
                {/* pv-block-end:haid02 */}
                {/* pv-block-start:paid03 */}
                <p data-pv-block="paid03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe works nicely next to AI coding tools. You stay in the canvas designing, and an agent can pick up the same project folder to make code changes you don't want to do by hand.
                </p>
                {/* pv-block-end:paid03 */}
                {/* pv-block-start:dllipy */}
                <div data-pv-block="dllipy" className="flex flex-col gap-4">
                  {/* pv-editable-zone-start:k956o1 */}
                  {/* pv-block-start:q8zc7z */}
                  <h3 data-pv-block="q8zc7z" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                    General advice
                  </h3>
                  {/* pv-block-end:q8zc7z */}
                  {/* pv-block-start:b6grh3 */}
                  <InfoBoxBanner data-pv-block="b6grh3" icon="Info" heading="Don't edit while the agent is writing" secondaryText="Try not to move or restyle things in the canvas while the agent is mid-task. Both Protovibe and the agent save to the same files, and saving on top of each other can scramble what the agent is writing. Wait until it finishes, then take over." color="warning" showCloseButton={false}>
                    {/* pv-editable-zone-start:junk4q */}
                    {/* pv-editable-zone-end:junk4q */}
                  </InfoBoxBanner>
                  {/* pv-block-end:b6grh3 */}
                  {/* pv-block-start:paid07 */}
                  <p data-pv-block="paid07" className="text-foreground-secondary leading-[1.7]">
                    A few small habits that make agents much more useful:
                  </p>
                  {/* pv-block-end:paid07 */}
                  {/* pv-block-start:uaid08 */}
                  <ul data-pv-block="uaid08" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-disc pl-[24px] m-0">
                    {/* pv-editable-zone-start:zaid08 */}
                      {/* pv-block-start:laid09 */}
                      <li data-pv-block="laid09">Use the <strong className="text-foreground-strong">Prompts</strong> panel to copy what you've selected — the agent does much better when it knows exactly which thing on the screen you mean.</li>
                      {/* pv-block-end:laid09 */}
                      {/* pv-block-start:laid10 */}
                      <li data-pv-block="laid10">Tick <strong className="text-foreground-strong">"Include Protovibe instructions"</strong> if the agent will be writing new layout code, so the canvas can still open it afterwards.</li>
                      {/* pv-block-end:laid10 */}
                      {/* pv-block-start:laid11 */}
                      <li data-pv-block="laid11">Let the agent finish before you start clicking around. If you really need to step in, stop it first.</li>
                      {/* pv-block-end:laid11 */}
                      {/* pv-block-start:laid12 */}
                      <li data-pv-block="laid12">If something looks wrong, just press <Shortcut keys={['cmd', 'Z']} />. Undo rolls back both your changes and the agent's, so you can always get back to a working state.</li>
                      {/* pv-block-end:laid12 */}
                    {/* pv-editable-zone-end:zaid08 */}
                  </ul>
                  {/* pv-block-end:uaid08 */}
                  {/* pv-editable-zone-end:k956o1 */}
                </div>
                {/* pv-block-end:dllipy */}

                {/* pv-block-start:m32r8w */}
                <div data-pv-block="m32r8w" className="flex flex-col gap-4">
                  {/* pv-editable-zone-start:bsxn12 */}
                  {/* pv-block-start:haid04 */}
                  <h3 data-pv-block="haid04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Claude Cowork</h3>
                  {/* pv-block-end:haid04 */}
                  {/* pv-block-start:paid05 */}
                  <p data-pv-block="paid05" className="text-foreground-secondary leading-[1.7]">
                    Yes, you can run <strong className="text-foreground-strong">Claude Cowork</strong> at the same time as Protovibe. Open it on the same project folder and it will see your changes as you make them. It's handy when you want to ask for a tweak in plain English instead of hunting for the right control.
                  </p>
                  {/* pv-block-end:paid05 */}
                  {/* pv-editable-zone-end:bsxn12 */}
                </div>
                {/* pv-block-end:m32r8w */}

              {/* pv-editable-zone-end:zaid01 */}
            </section>
            {/* pv-block-end:said01 */}

            {/* Working in the App tab */}
            {/* pv-block-start:s4at01 */}
            <section data-pv-block="s4at01" id="app-tab" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z4at01 */}
                {/* pv-block-start:h4at02 */}
                <h2 data-pv-block="h4at02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Working in the App tab</h2>
                {/* pv-block-end:h4at02 */}
                {/* pv-block-start:p4at03 */}
                <p data-pv-block="p4at03" className="text-foreground-secondary leading-[1.7]">
                  The App tab shows your live application exactly as users will see it. There is one rule that surprises everyone on day one:
                </p>
                {/* pv-block-end:p4at03 */}
                {/* pv-block-start:cgdqqr */}
                <InfoBoxBanner data-pv-block="cgdqqr" icon="Info" heading="Double-click to interact" secondaryText="Single click selects an element. Double click interacts with the page — opens menus, follows links, types into inputs." color="info" showCloseButton={false}>
                  {/* pv-editable-zone-start:s3epy1 */}
                  {/* pv-editable-zone-end:s3epy1 */}
                </InfoBoxBanner>
                {/* pv-block-end:cgdqqr */}
                {/* pv-block-start:p4at05 */}
                <p data-pv-block="p4at05" className="text-foreground-secondary leading-[1.7]">
                  This is the opposite of a normal browser, but it lets you select things <em>through</em> interactive widgets. Want to style a button? Click it once. Want to actually press it and see what happens? Double click.
                </p>
                {/* pv-block-end:p4at05 */}
              {/* pv-editable-zone-end:z4at01 */}
            </section>
            {/* pv-block-end:s4at01 */}

            {/* Traversing */}
            {/* pv-block-start:s5tv01 */}
            <section data-pv-block="s5tv01" id="traversing" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z5tv01 */}
                {/* pv-block-start:h5tv02 */}
                <h2 data-pv-block="h5tv02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">
                  Traversing the tree instead of layers
                </h2>
                {/* pv-block-end:h5tv02 */}
                {/* pv-block-start:p5tv03 */}
                <p data-pv-block="p5tv03" className="text-foreground-secondary leading-[1.7]">
                  Once something is selected, you almost never need the mouse to navigate. Use <Shortcut keys={['W']} /> <Shortcut keys={['A']} /> <Shortcut keys={['S']} /> <Shortcut keys={['D']} /> to walk through the element tree:
                </p>
                {/* pv-block-end:p5tv03 */}
                {/* pv-block-start:y7do49 */}
                <Callout data-pv-block="y7do49" variant="info" title="What is traversing?">
                  Traversing means moving the selection through the element tree with the keyboard instead of clicking. Your page is a nested structure — sections contain rows, rows contain cards, cards contain text. Traversing lets you walk this tree: jump to the parent, dive into a child, hop sideways to the next sibling.
                </Callout>
                {/* pv-block-end:y7do49 */}
                {/* pv-block-start:u5tv04 */}
                <ul data-pv-block="u5tv04" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:z5tvu1 */}
                    {/* pv-block-start:l5tv05 */}
                    <li data-pv-block="l5tv05"><Shortcut keys={['W']} /> — go up to the parent (the container that wraps the current element).</li>
                    {/* pv-block-end:l5tv05 */}
                    {/* pv-block-start:l5tv06 */}
                    <li data-pv-block="l5tv06"><Shortcut keys={['S']} /> — go down into the first child.</li>
                    {/* pv-block-end:l5tv06 */}
                    {/* pv-block-start:l5tv07 */}
                    <li data-pv-block="l5tv07"><Shortcut keys={['A']} /> / <Shortcut keys={['D']} /> — move to the previous or next sibling at the same level.</li>
                    {/* pv-block-end:l5tv07 */}
                  {/* pv-editable-zone-end:z5tvu1 */}
                </ul>
                {/* pv-block-end:u5tv04 */}
                {/* pv-block-start:p5tv08 */}
                <p data-pv-block="p5tv08" className="text-foreground-secondary leading-[1.7]">
                  Example: you've selected a piece of text inside a card. Press <Shortcut keys={['W']} /> to jump to the card itself. Press <Shortcut keys={['D']} /> to hop to the next card in the row. Press <Shortcut keys={['S']} /> to dive into that card's content. It is much faster than aiming with the cursor, especially in dense layouts.
                </p>
                {/* pv-block-end:p5tv08 */}
              {/* pv-editable-zone-end:z5tv01 */}
            </section>
            {/* pv-block-end:s5tv01 */}

            {/* Styling components */}
            {/* pv-block-start:s6sc01 */}
            <section data-pv-block="s6sc01" id="styling-components" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z6sc01 */}
                {/* pv-block-start:h6sc02 */}
                <h2 data-pv-block="h6sc02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Styling components</h2>
                {/* pv-block-end:h6sc02 */}
                {/* pv-block-start:p6sc03 */}
                <p data-pv-block="p6sc03" className="text-foreground-secondary leading-[1.7]">
                  Components like <InlineCode>Button</InlineCode> or <InlineCode>Card</InlineCode> are the reusable building blocks of your app. To edit one, open the <strong className="text-foreground-strong">Components</strong> tab and pick it from the list.
                </p>
                {/* pv-block-end:p6sc03 */}
                {/* pv-block-start:h6sc04 */}
                <h3 data-pv-block="h6sc04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">The components matrix</h3>
                {/* pv-block-end:h6sc04 */}
                {/* pv-block-start:p6sc05 */}
                <p data-pv-block="p6sc05" className="text-foreground-secondary leading-[1.7]">
                  Each component opens into a <strong className="text-foreground-strong">matrix</strong> — every meaningful combination of its props rendered side by side. So a Button matrix shows <em>solid / ghost</em> × <em>small / medium / large</em> × <em>enabled / disabled</em> in a single grid. It's both a preview and a sanity check: if one cell looks wrong, you can spot it immediately.
                </p>
                {/* pv-block-end:p6sc05 */}
                {/* pv-block-start:26wyba */}
                <div data-pv-block="26wyba" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065133.png')] bg-contain bg-center bg-no-repeat aspect-[818/483]" />
                {/* pv-block-end:26wyba */}
                {/* pv-block-start:h6sc06 */}
                <h3 data-pv-block="h6sc06" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Hiding combinations that don't make sense</h3>
                {/* pv-block-end:h6sc06 */}
                {/* pv-block-start:p6sc07 */}
                <p data-pv-block="p6sc07" className="text-foreground-secondary leading-[1.7]">
                  Some prop combinations are nonsense — an "icon-only" button with no icon picked, for example. Those are filtered out by a small list called <InlineCode>invalidCombinations</InlineCode> in the component file. It's just a list of "if these props are set this way, don't render this cell." If you ever notice the matrix showing a broken state that you want hidden, ask your coding agent to "add it to <InlineCode>invalidCombinations</InlineCode>" and it'll disappear from the preview.
                </p>
                {/* pv-block-end:p6sc07 */}
                {/* pv-block-start:h6sc08 */}
                <h3 data-pv-block="h6sc08" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">"Which state to style"</h3>
                {/* pv-block-end:h6sc08 */}
                {/* pv-block-start:p6sc09 */}
                <p data-pv-block="p6sc09" className="text-foreground-secondary leading-[1.7]">
                  This is the most important control in the components view. By default, any change you make applies to <strong className="text-foreground-strong">every variant of the component</strong>. That's usually what you want — give every Button the same border radius.
                </p>
                {/* pv-block-end:p6sc09 */}
                {/* pv-block-start:p6sc10 */}
                <p data-pv-block="p6sc10" className="text-foreground-secondary leading-[1.7]">
                  But sometimes you want a change to only apply to one specific state. To style a <em>large</em> button without touching the small or medium ones:
                </p>
                {/* pv-block-end:p6sc10 */}
                {/* pv-block-start:o6sc11 */}
                <ol data-pv-block="o6sc11" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-decimal pl-[20px]">
                  {/* pv-editable-zone-start:z6scu1 */}
                    {/* pv-block-start:l6sc12 */}
                    <li data-pv-block="l6sc12">Click any Button in the matrix to select it.</li>
                    {/* pv-block-end:l6sc12 */}
                    {/* pv-block-start:l6sc13 */}
                    <li data-pv-block="l6sc13">In the right panel, find <strong className="text-foreground-strong">Which state to style</strong> and choose <InlineCode>size: lg</InlineCode>.</li>
                    {/* pv-block-end:l6sc13 */}
                    {/* pv-block-start:l6sc14 */}
                    <li data-pv-block="l6sc14">Edit styles. The new values will only apply when <InlineCode>size</InlineCode> is <InlineCode>lg</InlineCode>; the rest of the matrix stays untouched.</li>
                    {/* pv-block-end:l6sc14 */}
                  {/* pv-editable-zone-end:z6scu1 */}
                </ol>
                {/* pv-block-end:o6sc11 */}
                {/* pv-block-start:4dvb4q */}
                <div data-pv-block="4dvb4q" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065214.png')] bg-contain bg-center bg-no-repeat aspect-[1112/713]" />
                {/* pv-block-end:4dvb4q */}
                {/* pv-block-start:h6sc16 */}
                <h3 data-pv-block="h6sc16" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">What does "Unset" mean?</h3>
                {/* pv-block-end:h6sc16 */}
                {/* pv-block-start:p6sc17 */}
                <p data-pv-block="p6sc17" className="text-foreground-secondary leading-[1.7]">
                  Most style fields have an <strong className="text-foreground-strong">Unset</strong> option. Picking it doesn't mean "set to zero" or "set to default" — it means <em>don't add a style for this property at all</em>. The element keeps whatever it inherits from the default variant (or from the browser, if there's nothing else).
                </p>
                {/* pv-block-end:p6sc17 */}
                {/* pv-block-start:p6sc18 */}
                <p data-pv-block="p6sc18" className="text-foreground-secondary leading-[1.7]">
                  Use Unset when you want a variant to fall back to the base. For example: a large button might override the padding, but you'd Unset its background color so it shares the same color as small and medium.
                </p>
                {/* pv-block-end:p6sc18 */}
                {/* pv-block-start:k2x239 */}
                <div data-pv-block="k2x239" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:uy5y8h */}
                  {/* pv-block-start:gpyddh */}
                  <div data-pv-block="gpyddh" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065315.png')] bg-contain bg-center bg-no-repeat aspect-[279/311] w-60" />
                  {/* pv-block-end:gpyddh */}
                  {/* pv-editable-zone-end:uy5y8h */}
                </div>
                {/* pv-block-end:k2x239 */}

              {/* pv-editable-zone-end:z6sc01 */}
            </section>
            {/* pv-block-end:s6sc01 */}

            {/* Creating new components */}
            {/* pv-block-start:scnc01 */}
            <section data-pv-block="scnc01" id="creating-components" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zcnc01 */}
                {/* pv-block-start:hcnc02 */}
                <h2 data-pv-block="hcnc02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Creating new components</h2>
                {/* pv-block-end:hcnc02 */}
                {/* pv-block-start:pcnc03 */}
                <p data-pv-block="pcnc03" className="text-foreground-secondary leading-[1.7]">
                  In a traditional design tool, building reusable components means planning a system upfront — naming things, defining variants, locking in a structure. With AI in the loop you don't need any of that. Start messy, then promote things to components when a pattern shows up. Below are the three workflows that work best.
                </p>
                {/* pv-block-end:pcnc03 */}

                {/* pv-block-start:hcnc04 */}
                <h3 data-pv-block="hcnc04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Sketch first, then convert</h3>
                {/* pv-block-end:hcnc04 */}
                {/* pv-block-start:pcnc05 */}
                <p data-pv-block="pcnc05" className="text-foreground-secondary leading-[1.7]">
                  This is the smoothest path for components with a clear visual identity (cards, badges, callouts). Design the basic shape in the <strong className="text-foreground-strong">Sketchpad</strong> first — drop in raw elements, get the layout, colors, and proportions right. Don't worry about props or reusability yet.
                </p>
                {/* pv-block-end:pcnc05 */}
                {/* pv-block-start:ocnc06 */}
                <ol data-pv-block="ocnc06" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-decimal pl-[20px]">
                  {/* pv-editable-zone-start:zcnc06 */}
                    {/* pv-block-start:lcnc07 */}
                    <li data-pv-block="lcnc07">In the Sketchpad, build the component visually until you're happy with how it looks.</li>
                    {/* pv-block-end:lcnc07 */}
                    {/* pv-block-start:lcnc08 */}
                    <li data-pv-block="lcnc08">Select the root element of the design.</li>
                    {/* pv-block-end:lcnc08 */}
                    {/* pv-block-start:lcnc09 */}
                    <li data-pv-block="lcnc09">Open the <strong className="text-foreground-strong">Prompts</strong> tab and ask the coding agent to "convert this selection into a reusable component." It'll extract the JSX, decide which props to expose, and register a <InlineCode>pvConfig</InlineCode> so the component shows up in the Components list.</li>
                    {/* pv-block-end:lcnc09 */}
                    {/* pv-block-start:lcnc10 */}
                    <li data-pv-block="lcnc10">Verify the component appears in the Components matrix and works as expected.</li>
                    {/* pv-block-end:lcnc10 */}
                  {/* pv-editable-zone-end:zcnc06 */}
                </ol>
                {/* pv-block-end:ocnc06 */}
                {/* pv-block-start:xkzg21 */}
                <div data-pv-block="xkzg21" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:iu04um */}
                  {/* pv-block-start:06d5tt */}
                  <div data-pv-block="06d5tt" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065459.png')] bg-contain bg-center bg-no-repeat aspect-[343/677] w-70" />
                  {/* pv-block-end:06d5tt */}
                  {/* pv-editable-zone-end:iu04um */}
                </div>
                {/* pv-block-end:xkzg21 */}
                {/* pv-block-start:ccnc11 */}
                <Callout data-pv-block="ccnc11" variant="info" title="Clear context before promoting to a component">
                  Before asking the agent to convert a selection into a component, clear its context (start a fresh thread or use the agent's "new conversation" action). Component extraction is a precise, file-touching task — old context can drag in unrelated assumptions and produce a messier result. Empty context, fresh prompt, clean component.
                </Callout>
                {/* pv-block-end:ccnc11 */}


                {/* pv-block-start:hcnc12 */}
                <h3 data-pv-block="hcnc12" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Ask AI to scaffold a component, then style</h3>
                {/* pv-block-end:hcnc12 */}
                {/* pv-block-start:pcnc13 */}
                <p data-pv-block="pcnc13" className="text-foreground-secondary leading-[1.7]">
                  When you know roughly what the component should be ("a stat card with an icon, label, value, and trend"), skip the sketch and ask the agent directly. It'll create the file, register the <InlineCode>pvConfig</InlineCode>, and seed sensible defaults. Once the component exists, drop it onto a page and tune the styling visually in the inspector and the components matrix.
                </p>
                {/* pv-block-end:pcnc13 */}

                {/* pv-block-start:hcnc14 */}
                <h3 data-pv-block="hcnc14" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Build the page first, extract components later</h3>
                {/* pv-block-end:hcnc14 */}
                {/* pv-block-start:pcnc15 */}
                <p data-pv-block="pcnc15" className="text-foreground-secondary leading-[1.7]">
                  This is the workflow that breaks the most with classic design tools — and the one AI makes effortless. Just build the page with raw, duplicated blocks. Three feature cards? Copy-paste the same div three times and edit the contents. Don't plan, don't extract, don't think about reusability.
                </p>
                {/* pv-block-end:pcnc15 */}
                {/* pv-block-start:pcnc16 */}
                <p data-pv-block="pcnc16" className="text-foreground-secondary leading-[1.7]">
                  Later, when the page feels right, select the section containing the duplicates and ask the agent: "extract the repeated cards in this section into a reusable component." It'll find the pattern, build the component, and replace the duplicates with instances — all while keeping the page visually identical.
                </p>
                {/* pv-block-end:pcnc16 */}
                {/* pv-block-start:pcnc17 */}
                <p data-pv-block="pcnc17" className="text-foreground-secondary leading-[1.7]">
                  The big shift: components stop being something you plan, and start being something you <em>notice</em> after the fact. Build first, abstract later — the agent handles the refactor.
                </p>
                {/* pv-block-end:pcnc17 */}

                {/* pv-block-start:hcnc18 */}
                <h3 data-pv-block="hcnc18" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Where do components live?</h3>
                {/* pv-block-end:hcnc18 */}
                {/* pv-block-start:pcnc19 */}
                <p data-pv-block="pcnc19" className="text-foreground-secondary leading-[1.7]">
                  Protovibe only scans the <InlineCode>src/components/ui/</InlineCode> folder for reusable components. Anything in there shows up in the Components tab, the components matrix, and the "Add element" picker. If your coding agent saves a component anywhere else (a local helper next to a page, for example), it won't appear in those places.
                </p>
                {/* pv-block-end:pcnc19 */}
                {/* pv-block-start:kpxzog */}
                <div data-pv-block="kpxzog" className="flex flex-col gap-2 items-center pb-7">
                  {/* pv-editable-zone-start:23va7r */}
                  {/* pv-block-start:1cjct6 */}
                  <div data-pv-block="1cjct6" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065646.png')] bg-contain bg-center bg-no-repeat aspect-[15/16] w-60" />
                  {/* pv-block-end:1cjct6 */}
                  {/* pv-editable-zone-end:23va7r */}
                </div>
                {/* pv-block-end:kpxzog */}

                {/* pv-block-start:pcnc20 */}
                <p data-pv-block="pcnc20" className="text-foreground-secondary leading-[1.7]">
                  That's not always a bug. <strong className="text-foreground-strong">Local components</strong> — small bits of JSX you only use on one page — are often cleaner kept next to the page that uses them. They don't pollute the global components list, and they keep the page file readable. If a component is only ever going to live on the dashboard, it can stay in <InlineCode>Dashboard.tsx</InlineCode>.
                </p>
                {/* pv-block-end:pcnc20 */}
                {/* pv-block-start:6i4aw4 */}
                <div data-pv-block="6i4aw4" className="flex gap-2 flex-row items-start">
                  {/* pv-editable-zone-start:rw2rd5 */}
                  {/* pv-block-start:ccnc21 */}
                  <Callout data-pv-block="ccnc21" variant="info" title="Styling components that aren't in src/components/ui/">
                    {/* pv-editable-zone-start:t3m8p1 */}
                      {/* pv-block-start:q7r2s5 */}
                      <p data-pv-block="q7r2s5">You can still style local components visually — you just need to point Protovibe at the right file. In the right sidebar, find the <strong className="text-foreground-strong">Source files</strong> section and switch between the available files.</p>
                      {/* pv-block-end:q7r2s5 */}
                      {/* pv-block-start:w9e4f6 */}
                      <p data-pv-block="w9e4f6" className="mt-[10px]">There will usually be two: one is the <em>call site</em> (the page where the component is used) and the other is the <em>component definition</em> (the actual component code). Editing styles on the call site changes how the instance looks here; editing the definition changes the component everywhere it's used.</p>
                      {/* pv-block-end:w9e4f6 */}
                      {/* pv-block-start:h1j5k8 */}
                      <p data-pv-block="h1j5k8" className="mt-[10px]">It takes a moment to get used to the file switch, but once it clicks the workflow is fast — and it lets you keep small, page-specific components co-located instead of forcing everything into the global UI folder.</p>
                      {/* pv-block-end:h1j5k8 */}
                      {/* pv-block-start:rs5egp */}
                      <div data-pv-block="rs5egp" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-065814.png')] bg-contain bg-center bg-no-repeat aspect-[283/153] w-60 mt-3" />
                      {/* pv-block-end:rs5egp */}
                    {/* pv-editable-zone-end:t3m8p1 */}
                  </Callout>
                  {/* pv-block-end:ccnc21 */}
                  {/* pv-editable-zone-end:rw2rd5 */}
                </div>
                {/* pv-block-end:6i4aw4 */}

              {/* pv-editable-zone-end:zcnc01 */}
            </section>
            {/* pv-block-end:scnc01 */}

            {/* Sketchpad */}
            {/* pv-block-start:s7sk01 */}
            <section data-pv-block="s7sk01" id="sketchpad" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z7sk01 */}
                {/* pv-block-start:h7sk02 */}
                <h2 data-pv-block="h7sk02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Working in the Sketchpad</h2>
                {/* pv-block-end:h7sk02 */}
                {/* pv-block-start:p7sk03 */}
                <p data-pv-block="p7sk03" className="text-foreground-secondary leading-[1.7]">
                  The Sketchpad is the free-form canvas — closer to Figma than to a browser. Selection rules here are flipped to match what classic design tools do:
                </p>
                {/* pv-block-end:p7sk03 */}
                {/* pv-block-start:u7sk04 */}
                <ul data-pv-block="u7sk04" className="flex flex-col gap-[10px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:z7sku1 */}
                    {/* pv-block-start:l7sk05 */}
                    <li data-pv-block="l7sk05"><strong className="text-foreground-strong">Single click</strong> selects the top-level frame. <strong className="text-foreground-strong">Double click</strong> drills one level deeper into a child.</li>
                    {/* pv-block-end:l7sk05 */}
                    {/* pv-block-start:l7sk06 */}
                    <li data-pv-block="l7sk06">Hold <Shortcut keys={['cmd']} /> and click to jump straight to the deepest element under the cursor — no double-click chain needed.</li>
                    {/* pv-block-end:l7sk06 */}
                    {/* pv-block-start:l7sk07 */}
                    <li data-pv-block="l7sk07">Hold <Shortcut keys={['Space']} /> to pan the canvas with the mouse.</li>
                    {/* pv-block-end:l7sk07 */}
                    {/* pv-block-start:l7sk08 */}
                    <li data-pv-block="l7sk08">Drag a marquee across empty space to multi-select everything inside the rectangle.</li>
                    {/* pv-block-end:l7sk08 */}
                    {/* pv-block-start:l7sk09 */}
                    <li data-pv-block="l7sk09">Hold <Shortcut keys={['option']} /> (Option / Alt) and drag a selection to duplicate it. The new copy follows the cursor.</li>
                    {/* pv-block-end:l7sk09 */}
                  {/* pv-editable-zone-end:z7sku1 */}
                </ul>
                {/* pv-block-end:u7sk04 */}
              {/* pv-editable-zone-end:z7sk01 */}
            </section>
            {/* pv-block-end:s7sk01 */}

            {/* Styling individual elements */}
            {/* pv-block-start:s8se01 */}
            <section data-pv-block="s8se01" id="styling-elements" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z8se01 */}
                {/* pv-block-start:h8se02 */}
                <h2 data-pv-block="h8se02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Styling individual elements</h2>
                {/* pv-block-end:h8se02 */}
                {/* pv-block-start:p8se03 */}
                <p data-pv-block="p8se03" className="text-foreground-secondary leading-[1.7]">
                  Select any element on the canvas and the <strong className="text-foreground-strong">right inspector</strong> opens with everything you can change — layout, spacing, typography, colors, borders, effects. Drag the values, type in numbers, or pick tokens from the dropdown.
                </p>
                {/* pv-block-end:p8se03 */}
                {/* pv-block-start:h8se04 */}
                <h3 data-pv-block="h8se04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">When the inspector doesn't have what you need</h3>
                {/* pv-block-end:h8se04 */}
                {/* pv-block-start:p8se05 */}
                <p data-pv-block="p8se05" className="text-foreground-secondary leading-[1.7]">
                  The inspector intentionally doesn't expose every CSS property. Instead of cluttering the UI with rare features (clip-path, animation timing functions, blend modes…), Protovibe leaves them to your <strong className="text-foreground-strong">coding agent</strong>. Just describe what you want — "make this button shimmer on hover" — and the agent will write the styles for you. You don't need to know the CSS.
                </p>
                {/* pv-block-end:p8se05 */}
                {/* pv-block-start:h8se06 */}
                <h3 data-pv-block="h8se06" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">The applied classes list</h3>
                {/* pv-block-end:h8se06 */}
                {/* pv-block-start:p8se07 */}
                <p data-pv-block="p8se07" className="text-foreground-secondary leading-[1.7]">
                  At the bottom of the inspector you'll see the <strong className="text-foreground-strong">list of classes</strong> currently applied to the element. It's the source of truth for what's actually on the DOM. Use it for two things: debugging ("why does this look weird?" — read the classes), and surgical tweaks the visual fields don't cover (you can edit the string directly).
                </p>
                {/* pv-block-end:p8se07 */}
                {/* pv-block-start:owe82u */}
                <div data-pv-block="owe82u" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:nolfz9 */}
                  {/* pv-block-start:sgq4xi */}
                  <div data-pv-block="sgq4xi" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070312.png')] bg-contain bg-center bg-no-repeat aspect-[140/123] w-80" />
                  {/* pv-block-end:sgq4xi */}
                  {/* pv-editable-zone-end:nolfz9 */}
                </div>
                {/* pv-block-end:owe82u */}

                {/* pv-block-start:h8se08 */}
                <h3 data-pv-block="h8se08" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Open in VS Code</h3>
                {/* pv-block-end:h8se08 */}
                {/* pv-block-start:p8se09 */}
                <p data-pv-block="p8se09" className="text-foreground-secondary leading-[1.7]">
                  Every element header has an <strong className="text-foreground-strong">Open in VS Code</strong> button. It jumps your editor straight to the line of source for the selected element. Most days you won't need it — but when the visual editor gets stuck on something unusual (a tricky conditional, an exotic component), opening the file and editing it directly is always the escape hatch.
                </p>
                {/* pv-block-end:p8se09 */}
                {/* pv-block-start:y92azk */}
                <div data-pv-block="y92azk" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:6sde38 */}
                  {/* pv-block-start:jpy9os */}
                  <div data-pv-block="jpy9os" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070325.png')] bg-contain bg-center bg-no-repeat aspect-[281/214] w-80" />
                  {/* pv-block-end:jpy9os */}
                  {/* pv-editable-zone-end:6sde38 */}
                </div>
                {/* pv-block-end:y92azk */}


                {/* pv-block-start:h8sh01 */}
                <h3 data-pv-block="h8sh01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Styling hover</h3>
                {/* pv-block-end:h8sh01 */}
                {/* pv-block-start:p8sh02 */}
                <p data-pv-block="p8sh02" className="text-foreground-secondary leading-[1.7]">
                  By default, anything you change in the inspector applies to the resting state. To style what happens on hover, switch the state first.
                </p>
                {/* pv-block-end:p8sh02 */}
                {/* pv-block-start:5vkh23 */}
                <div data-pv-block="5vkh23" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:yhrshm */}
                  {/* pv-block-start:3stvdl */}
                  <div data-pv-block="3stvdl" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070343.png')] bg-contain bg-center bg-no-repeat aspect-[17/15] w-70" />
                  {/* pv-block-end:3stvdl */}
                  {/* pv-editable-zone-end:yhrshm */}
                </div>
                {/* pv-block-end:5vkh23 */}

                {/* pv-block-start:o8sh03 */}
                <ol data-pv-block="o8sh03" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-decimal pl-[20px]">
                  {/* pv-editable-zone-start:z8sh03 */}
                    {/* pv-block-start:l8sh04 */}
                    <li data-pv-block="l8sh04">Select the element you want to style.</li>
                    {/* pv-block-end:l8sh04 */}
                    {/* pv-block-start:l8sh05 */}
                    <li data-pv-block="l8sh05">In the inspector, find <strong className="text-foreground-strong">Which state to style</strong> and pick <InlineCode>hover</InlineCode>.</li>
                    {/* pv-block-end:l8sh05 */}
                    {/* pv-block-start:l8sh06 */}
                    <li data-pv-block="l8sh06">Change any style — background, text color, shadow, scale. The new values only apply when the cursor is over the element.</li>
                    {/* pv-block-end:l8sh06 */}
                  {/* pv-editable-zone-end:z8sh03 */}
                </ol>
                {/* pv-block-end:o8sh03 */}
                {/* pv-block-start:p8sh07 */}
                <p data-pv-block="p8sh07" className="text-foreground-secondary leading-[1.7]">
                  To preview the hover, just move your cursor over the element on the canvas.
                </p>
                {/* pv-block-end:p8sh07 */}

                {/* pv-block-start:h8tt01 */}
                <h3 data-pv-block="h8tt01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">How to add tooltips</h3>
                {/* pv-block-end:h8tt01 */}
                {/* pv-block-start:p8tt02 */}
                <p data-pv-block="p8tt02" className="text-foreground-secondary leading-[1.7]">
                  Tooltips are a single field in the inspector sidebar — there's no special component to wrap things in. Select any element, find the <strong className="text-foreground-strong">Tooltip</strong> field, and type the text you want to appear on hover. That's it.
                </p>
                {/* pv-block-end:p8tt02 */}
                {/* pv-block-start:p8tt03 */}
                <p data-pv-block="p8tt03" className="text-foreground-secondary leading-[1.7]">
                  Clear the field to remove the tooltip. The tooltip styling matches your design system automatically.
                </p>
                {/* pv-block-end:p8tt03 */}
                {/* pv-block-start:xah8os */}
                <div data-pv-block="xah8os" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070405.png')] bg-contain bg-center bg-no-repeat aspect-[55/23] w-70 m-auto" />
                {/* pv-block-end:xah8os */}

                {/* pv-block-start:h8im01 */}
                <h3 data-pv-block="h8im01" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Adding images</h3>
                {/* pv-block-end:h8im01 */}
                {/* pv-block-start:p8im02 */}
                <p data-pv-block="p8im02" className="text-foreground-secondary leading-[1.7]">
                  There are two ways to drop an image onto the canvas, and both end up the same way: as a background image on the selected element.
                </p>
                {/* pv-block-end:p8im02 */}
                {/* pv-block-start:7n3ir7 */}
                <div data-pv-block="7n3ir7" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070425.png')] bg-contain bg-center bg-no-repeat aspect-[281/225] w-70 m-auto" />
                {/* pv-block-end:7n3ir7 */}
                {/* pv-block-start:u8im03 */}
                <ul data-pv-block="u8im03" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:z8im03 */}
                    {/* pv-block-start:l8im04 */}
                    <li data-pv-block="l8im04"><strong className="text-foreground-strong">From the inspector</strong> — open the <strong className="text-foreground-strong">Background image</strong> field in the sidebar and pick a file.</li>
                    {/* pv-block-end:l8im04 */}
                    {/* pv-block-start:l8im05 */}
                    <li data-pv-block="l8im05"><strong className="text-foreground-strong">Paste from clipboard</strong> — copy any image (a screenshot, a Figma frame, a PNG from your browser) and hit <Shortcut keys={['cmd', 'V']} /> on the canvas. Protovibe compresses the image automatically and applies it as a background.</li>
                    {/* pv-block-end:l8im05 */}
                  {/* pv-editable-zone-end:z8im03 */}
                </ul>
                {/* pv-block-end:u8im03 */}
                {/* pv-block-start:p8im06 */}
                <p data-pv-block="p8im06" className="text-foreground-secondary leading-[1.7]">
                  By default, Protovibe sets the size mode to <strong className="text-foreground-strong">Fit</strong> and matches the element's aspect ratio to the image — so it shows the whole picture without cropping or distortion. That's almost always what you want for hero shots, screenshots, and product images.
                </p>
                {/* pv-block-end:p8im06 */}
                {/* pv-block-start:p8im07 */}
                <p data-pv-block="p8im07" className="text-foreground-secondary leading-[1.7]">
                  Need something different? Switch the size mode to <strong className="text-foreground-strong">Cover</strong> for a fill-the-frame look (the image will be cropped to fit), or set the aspect ratio manually in the <strong className="text-foreground-strong">Size</strong> panel for full control over the container's shape.
                </p>
                {/* pv-block-end:p8im07 */}
              {/* pv-editable-zone-end:z8se01 */}
            </section>
            {/* pv-block-end:s8se01 */}

            {/* Responsive */}
            {/* pv-block-start:s9rs01 */}
            <section data-pv-block="s9rs01" id="responsive" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:z9rs01 */}
                {/* pv-block-start:h9rs02 */}
                <h2 data-pv-block="h9rs02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Responsive design</h2>
                {/* pv-block-end:h9rs02 */}
                {/* pv-block-start:p9rs03 */}
                <p data-pv-block="p9rs03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe is built on Tailwind, which is <strong className="text-foreground-strong">mobile-first</strong>. That means the styles you set with no breakpoint apply to <em>every</em> screen size, including the smallest. Bigger screens then layer on top.
                </p>
                {/* pv-block-end:p9rs03 */}
                {/* pv-block-start:p9rs04 */}
                <p data-pv-block="p9rs04" className="text-foreground-secondary leading-[1.7]">
                  Concretely, to make a grid that's one column on mobile and three columns on desktop:
                </p>
                {/* pv-block-end:p9rs04 */}
                {/* pv-block-start:o9rs05 */}
                <ol data-pv-block="o9rs05" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-decimal pl-[20px]">
                  {/* pv-editable-zone-start:z9rsu1 */}
                    {/* pv-block-start:l9rs06 */}
                    <li data-pv-block="l9rs06">With <strong className="text-foreground-strong">no breakpoint selected</strong>, set the layout to one column. This is your mobile baseline.</li>
                    {/* pv-block-end:l9rs06 */}
                    {/* pv-block-start:l9rs07 */}
                    <li data-pv-block="l9rs07">Open <strong className="text-foreground-strong">Which state to style</strong> and pick <InlineCode>Screen width above</InlineCode> (or whichever breakpoint matches your "tablet up" target).</li>
                    {/* pv-block-end:l9rs07 */}
                    {/* pv-block-start:l9rs08 */}
                    <li data-pv-block="l9rs08">Now change the layout to three columns. This override only kicks in above that width.</li>
                    {/* pv-block-end:l9rs08 */}
                  {/* pv-editable-zone-end:z9rsu1 */}
                </ol>
                {/* pv-block-end:o9rs05 */}
                {/* pv-block-start:5sil4x */}
                <div data-pv-block="5sil4x" className="flex flex-col gap-2 justify-center items-center">
                  {/* pv-editable-zone-start:1b19hy */}
                  {/* pv-block-start:ltkx1e */}
                  <div data-pv-block="ltkx1e" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-071056.png')] bg-contain bg-center bg-no-repeat aspect-[286/245] w-70" />
                  {/* pv-block-end:ltkx1e */}
                  {/* pv-editable-zone-end:1b19hy */}
                </div>
                {/* pv-block-end:5sil4x */}
                {/* pv-block-start:p9rs09 */}
                <p data-pv-block="p9rs09" className="text-foreground-secondary leading-[1.7]">
                  To preview the small-screen result, click the <strong className="text-foreground-strong">Mobile preview</strong> button above the page. The canvas resizes to a phone-width frame so you can verify the mobile layout without resizing the window. Or just open the preview in a new tab and test in Chrome mobile preview.
                </p>
                {/* pv-block-end:p9rs09 */}
                {/* pv-block-start:0o9v1z */}
                <div data-pv-block="0o9v1z" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070442.png')] bg-contain bg-center bg-no-repeat aspect-[1665/434]" />
                {/* pv-block-end:0o9v1z */}

              {/* pv-editable-zone-end:z9rs01 */}
            </section>
            {/* pv-block-end:s9rs01 */}

            {/* Prompts */}
            {/* pv-block-start:sapr01 */}
            <section data-pv-block="sapr01" id="prompts" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zapr01 */}
                {/* pv-block-start:hapr02 */}
                <h2 data-pv-block="hapr02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Prompts and context</h2>
                {/* pv-block-end:hapr02 */}
                {/* pv-block-start:papr03 */}
                <p data-pv-block="papr03" className="text-foreground-secondary leading-[1.7]">
                  When you ask your coding agent to do something, it works better with <em>context</em> — knowing which element you mean, what file it lives in, and what the surrounding code looks like.
                </p>
                {/* pv-block-end:papr03 */}
                {/* pv-block-start:u0tha9 */}
                <div data-pv-block="u0tha9" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:g7nwu1 */}
                  {/* pv-block-start:rzxjwj */}
                  <div data-pv-block="rzxjwj" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-071215.png')] bg-contain bg-center bg-no-repeat aspect-[285/343] w-60" />
                  {/* pv-block-end:rzxjwj */}
                  {/* pv-editable-zone-end:g7nwu1 */}
                </div>
                {/* pv-block-end:u0tha9 */}
                {/* pv-block-start:papr04 */}
                <p data-pv-block="papr04" className="text-foreground-secondary leading-[1.7]">
                  The <strong className="text-foreground-strong">Prompts</strong> panel lets you copy the context of any selection straight into your clipboard. Pick the elements you want to discuss, hit copy, paste into your agent. The agent now knows exactly which nodes you're talking about.
                </p>
                {/* pv-block-end:papr04 */}
                {/* pv-block-start:papr05 */}
                <p data-pv-block="papr05" className="text-foreground-secondary leading-[1.7]">
                  For tricky cases where the agent keeps breaking Protovibe rules — wrong block IDs, missing zones, incorrect tokens — tick the <strong className="text-foreground-strong">"Include Protovibe instructions"</strong> checkbox before copying. It will paste the full engineering ruleset into your prompt. Verbose, yes, but it virtually eliminates "the agent removed my pv-block tags" moments.
                </p>
                {/* pv-block-end:papr05 */}

              {/* pv-editable-zone-end:zapr01 */}
            </section>
            {/* pv-block-end:sapr01 */}

            {/* Publishing */}
            {/* pv-block-start:sbpb01 */}
            <section data-pv-block="sbpb01" id="publishing" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zbpb01 */}
                {/* pv-block-start:hbpb02 */}
                <h2 data-pv-block="hbpb02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Publishing to Cloudflare</h2>
                {/* pv-block-end:hbpb02 */}
                {/* pv-block-start:pbpb03 */}
                <p data-pv-block="pbpb03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe ships your project to the web through Cloudflare Pages. The first time you click <strong className="text-foreground-strong">Publish</strong>, you'll be asked to log in to your Cloudflare account — this is a one-time setup and your credentials stay on your machine.
                </p>
                {/* pv-block-end:pbpb03 */}
                {/* pv-block-start:pbpb04 */}
                <p data-pv-block="pbpb04" className="text-foreground-secondary leading-[1.7]">
                  Behind the scenes Protovibe runs Cloudflare's <InlineCode>wrangler</InlineCode> command in a background terminal. You don't have to interact with it, but if a publish fails the terminal log shows up in the Project Manager so you can see what went wrong (or paste it to your coding agent for help).
                </p>
                {/* pv-block-end:pbpb04 */}
                {/* pv-block-start:pbpb05 */}
                <p data-pv-block="pbpb05" className="text-foreground-secondary leading-[1.7]">
                  After the first successful publish you'll get a live URL. Subsequent publishes update the same site in seconds.
                </p>
                {/* pv-block-end:pbpb05 */}
                {/* pv-block-start:2pz7m9 */}
                <div data-pv-block="2pz7m9" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070526.png')] bg-contain bg-center bg-no-repeat aspect-[351/214] w-80 m-auto" />
                {/* pv-block-end:2pz7m9 */}
              {/* pv-editable-zone-end:zbpb01 */}
            </section>
            {/* pv-block-end:sbpb01 */}

            {/* Collaboration */}
            {/* pv-block-start:scol01 */}
            <section data-pv-block="scol01" id="collaboration" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zcol01 */}
                {/* pv-block-start:hcol02 */}
                <h2 data-pv-block="hcol02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Collaboration</h2>
                {/* pv-block-end:hcol02 */}
                {/* pv-block-start:pcol03 */}
                <p data-pv-block="pcol03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe is a place to design — not where your team's real production app lives. Think of what you build here as a very precise, working reference: a React project with real layout, spacing, components, and tokens that someone else can read and use.
                </p>
                {/* pv-block-end:pcol03 */}
                {/* pv-block-start:li3k95 */}
                <div data-pv-block="li3k95" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:abd911 */}
                  {/* pv-block-start:511hom */}
                  <div data-pv-block="511hom" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070536.png')] bg-contain bg-center bg-no-repeat aspect-[395/391] w-90" />
                  {/* pv-block-end:511hom */}
                  {/* pv-editable-zone-end:abd911 */}
                </div>
                {/* pv-block-end:li3k95 */}

                {/* pv-block-start:pcol03b */}
                <p data-pv-block="pcol03b" className="text-foreground-secondary leading-[1.7]">
                  And because it's a normal folder of files, you can share it the same way developers already share code — with <strong className="text-foreground-strong">Git</strong> (GitHub, GitLab, etc.) or even just by zipping up the folder and sending it over.
                </p>
                {/* pv-block-end:pcol03b */}
                {/* pv-block-start:pcol04 */}
                <p data-pv-block="pcol04" className="text-foreground-secondary leading-[1.7]">
                  Why this is useful:
                </p>
                {/* pv-block-end:pcol04 */}
                {/* pv-block-start:ucol05 */}
                <ul data-pv-block="ucol05" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-disc pl-[24px] m-0">
                  {/* pv-editable-zone-start:zcol05 */}
                    {/* pv-block-start:lcol06 */}
                    <li data-pv-block="lcol06"><strong className="text-foreground-strong">A spec that actually runs.</strong> Instead of writing a long doc or annotating a Figma frame, you hand over working code. There's no "did I describe this padding correctly?" — it's right there.</li>
                    {/* pv-block-end:lcol06 */}
                    {/* pv-block-start:lcol07 */}
                    <li data-pv-block="lcol07"><strong className="text-foreground-strong">A perfect input for AI agents.</strong> A developer's AI agent can read your Protovibe code directly. That's far more precise than any written spec — the agent sees the exact components, classes, and structure you intended.</li>
                    {/* pv-block-end:lcol07 */}
                    {/* pv-block-start:lcol08 */}
                    <li data-pv-block="lcol08"><strong className="text-foreground-strong">Real history.</strong> If you use Git, every change is saved as a step you can go back to or compare against — handy when you want to show what changed between two designs.</li>
                    {/* pv-block-end:lcol08 */}
                    {/* pv-block-start:lcol09 */}
                    <li data-pv-block="lcol09"><strong className="text-foreground-strong">No lock-in.</strong> Your project is your project. Protovibe doesn't keep your work hostage — the folder is yours to keep, share, or throw away.</li>
                    {/* pv-block-end:lcol09 */}
                  {/* pv-editable-zone-end:zcol05 */}
                </ul>
                {/* pv-block-end:ucol05 */}
                {/* pv-block-start:hcol10 */}
                <h3 data-pv-block="hcol10" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Use case: handing a design to a developer</h3>
                {/* pv-block-end:hcol10 */}
                {/* pv-block-start:pcol11 */}
                <p data-pv-block="pcol11" className="text-foreground-secondary leading-[1.7]">
                  You design a screen in Protovibe and share the folder with a developer. They don't have to copy your work into their real codebase by hand — they point their AI agent at your Protovibe project and say "build this in our app, matching the layout and spacing." The agent has the actual code in front of it, so the result is much closer to what you drew than a written brief would ever get.
                </p>
                {/* pv-block-end:pcol11 */}
                {/* pv-block-start:hcol12 */}
                <h3 data-pv-block="hcol12" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Use case: marketing and designer working together</h3>
                {/* pv-block-end:hcol12 */}
                {/* pv-block-start:pcol13 */}
                <p data-pv-block="pcol13" className="text-foreground-secondary leading-[1.7]">
                  Someone in marketing sketches a landing page in Protovibe and shares the folder. A designer opens the same project and polishes it by hand — nudging paddings, fixing border radius, swapping a font weight, tweaking colours. The result is a clean, hand-tuned reference that a developer (or their AI agent) can then turn into the real page.
                </p>
                {/* pv-block-end:pcol13 */}
              {/* pv-editable-zone-end:zcol01 */}
            </section>
            {/* pv-block-end:scol01 */}

            {/* Updating to new version */}
            {/* pv-block-start:supd01 */}
            <section data-pv-block="supd01" id="updating" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zupd01 */}
                {/* pv-block-start:hupd02 */}
                <h2 data-pv-block="hupd02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Updating to new version</h2>
                {/* pv-block-end:hupd02 */}
                {/* pv-block-start:pupd03 */}
                <p data-pv-block="pupd03" className="text-foreground-secondary leading-[1.7]">
                  When a new version of Protovibe is available on GitHub, you will see a prompt in the project manager. From there you can choose whether to update the Protovibe shell across your projects or skip it for now.
                </p>
                {/* pv-block-end:pupd03 */}
                {/* pv-block-start:hqcngc */}
                <div data-pv-block="hqcngc" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:lvfrgq */}
                  {/* pv-block-start:v43rqs */}
                  <div data-pv-block="v43rqs" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-072412.png')] bg-contain bg-center bg-no-repeat aspect-[351/343] w-70" />
                  {/* pv-block-end:v43rqs */}
                  {/* pv-editable-zone-end:lvfrgq */}
                </div>
                {/* pv-block-end:hqcngc */}

                {/* pv-block-start:pupd04 */}
                <p data-pv-block="pupd04" className="text-foreground-secondary leading-[1.7]">
                  If you prefer not to update all projects at once, you can click <strong className="text-foreground-strong">Update plugin</strong> individually per project to pull the latest source from the <span className="font-mono text-sm bg-background-tertiary px-1 rounded">protovibe-project-template</span> folder. In most cases the easiest path is to tick <strong className="text-foreground-strong">Update Protovibe shell in all projects</strong> — it keeps everything in sync in one step. And if anything looks off, git undo has you covered.
                </p>
                {/* pv-block-end:pupd04 */}
                {/* pv-block-start:co5ex1 */}
                <div data-pv-block="co5ex1" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-072727.png')] bg-contain bg-center bg-no-repeat aspect-[720/161]" />
                {/* pv-block-end:co5ex1 */}
              {/* pv-editable-zone-end:zupd01 */}
            </section>
            {/* pv-block-end:supd01 */}

            {/* Troubleshooting */}
            {/* pv-block-start:strb01 */}
            <section data-pv-block="strb01" id="troubleshooting" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:ztrb01 */}
                {/* pv-block-start:htrb02 */}
                <h2 data-pv-block="htrb02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Troubleshooting</h2>
                {/* pv-block-end:htrb02 */}
                {/* pv-block-start:ptrb03 */}
                <p data-pv-block="ptrb03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe edits real source code, so the occasional weird state is expected — a half-applied change, a component that won't render, a canvas that's gone blank. Here's the order to try things in.
                </p>
                {/* pv-block-end:ptrb03 */}
                {/* pv-block-start:sgo8z1 */}
                <div data-pv-block="sgo8z1" className="flex flex-col gap-4">
                  {/* pv-editable-zone-start:axav9w */}
                  {/* pv-block-start:htrb04 */}
                  <h3 data-pv-block="htrb04" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                    When you undo but it does nothing
                  </h3>
                  {/* pv-block-end:htrb04 */}
                  {/* pv-block-start:ptrb06 */}
                  <p data-pv-block="ptrb06" className="text-foreground-secondary leading-[1.7]">
                    Protovibe works on React app Hot Module Reloading. Sometimes this does not work - the file is undone, but you won't see changes. Then just <b>refresh Protovibe app</b> and everything should be back to normal.
                  </p>
                  {/* pv-block-end:ptrb06 */}
                  {/* pv-editable-zone-end:axav9w */}
                </div>
                {/* pv-block-end:sgo8z1 */}

                {/* pv-block-start:p0xod5 */}
                <div data-pv-block="p0xod5" className="flex flex-col gap-4">
                  {/* pv-editable-zone-start:axav9w */}
                  {/* pv-block-start:egfa8n */}
                  <h3 data-pv-block="egfa8n" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">
                    When the app crashes
                  </h3>
                  {/* pv-block-end:egfa8n */}
                  {/* pv-block-start:zz88wk */}
                  <p data-pv-block="zz88wk" className="text-foreground-secondary leading-[1.7]">
                    Hit <Shortcut keys={['cmd', 'Z']} />. Because Protovibe writes directly to your files, undo also rolls back the source — so the move that broke the app is reversed and the canvas comes back to life. Keep undoing until you're back to a known-good state.
                  </p>
                  {/* pv-block-end:zz88wk */}
                  {/* pv-block-start:8cgzc1 */}
                  <p data-pv-block="8cgzc1" className="text-foreground-secondary leading-[1.7]">
                    If undo doesn't help, ask your coding agent. Two prompts that work well: "the app just crashed after I did X — please diagnose and fix," or "I was trying to do X but the editor wouldn't let me — please do it in code." The agent has full access to the source and can usually fix in seconds what the visual editor can't.
                  </p>
                  {/* pv-block-end:8cgzc1 */}
                  {/* pv-editable-zone-end:axav9w */}
                </div>
                {/* pv-block-end:p0xod5 */}

                {/* pv-block-start:9ybrxk */}
                <div data-pv-block="9ybrxk" className="flex flex-col gap-2 items-center">
                  {/* pv-editable-zone-start:xxeegc */}
                  {/* pv-block-start:s7ckzg */}
                  <div data-pv-block="s7ckzg" className="bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-070557.png')] bg-contain bg-center bg-no-repeat aspect-[119/95] w-60" />
                  {/* pv-block-end:s7ckzg */}
                  {/* pv-editable-zone-end:xxeegc */}
                </div>
                {/* pv-block-end:9ybrxk */}

                {/* pv-block-start:htrb07 */}
                <h3 data-pv-block="htrb07" className="font-secondary font-bold text-[20px] leading-[1.2] text-foreground-strong m-0 mt-[24px]">Reporting bugs</h3>
                {/* pv-block-end:htrb07 */}
                {/* pv-block-start:ptrb08 */}
                <p data-pv-block="ptrb08" className="text-foreground-secondary leading-[1.7]">
                  We're an indie team of just a few people, so bugs do slip through. If you hit one we'd love to hear about it — a quick description (what you were doing, what happened, what you expected) is enough to get us started.
                </p>
                {/* pv-block-end:ptrb08 */}
                {/* pv-block-start:utrb09 */}
                <ul data-pv-block="utrb09" className="flex flex-col gap-[8px] text-foreground-secondary leading-[1.7] list-none p-0 m-0">
                  {/* pv-editable-zone-start:ztrb09 */}
                    {/* pv-block-start:ltrb10 */}
                    <li data-pv-block="ltrb10">Email us at <a href="mailto:protovibe.studio@gmail.com" className="text-foreground-primary underline">protovibe.studio@gmail.com</a>.</li>
                    {/* pv-block-end:ltrb10 */}
                    {/* pv-block-start:ltrb11 */}
                    <li data-pv-block="ltrb11">Or open an issue on <a href="https://github.com/Protovibe-Studio/protovibe-studio/issues" className="text-foreground-primary underline">GitHub</a>.</li>
                    {/* pv-block-end:ltrb11 */}
                  {/* pv-editable-zone-end:ztrb09 */}
                </ul>
                {/* pv-block-end:utrb09 */}
                {/* pv-block-start:ptrb12 */}
                <p data-pv-block="ptrb12" className="text-foreground-secondary leading-[1.7]">
                  Thank you for your patience while we polish things.
                </p>
                {/* pv-block-end:ptrb12 */}
              {/* pv-editable-zone-end:ztrb01 */}
            </section>
            {/* pv-block-end:strb01 */}

            {/* Technical */}
            {/* pv-block-start:sctc01 */}
            <section data-pv-block="sctc01" id="technical" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zctc01 */}
                {/* pv-block-start:hctc02 */}
                <h2 data-pv-block="hctc02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">Under the hood (for the curious)</h2>
                {/* pv-block-end:hctc02 */}
                {/* pv-block-start:pctc03 */}
                <p data-pv-block="pctc03" className="text-foreground-secondary leading-[1.7]">
                  You don't need any of this to use Protovibe — but if you ever open a source file you'll see two unfamiliar things.
                </p>
                {/* pv-block-end:pctc03 */}
                {/* pv-block-start:f1kx7u */}
                <div data-pv-block="f1kx7u" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-071906.png')] bg-contain bg-center bg-no-repeat aspect-[1658/1061]" />
                {/* pv-block-end:f1kx7u */}
                {/* pv-block-start:pctc04 */}
                <p data-pv-block="pctc04" className="text-foreground-secondary leading-[1.7]">
                  <strong className="text-foreground-strong"><InlineCode>pv-editable-zone</InlineCode> and <InlineCode>pv-block</InlineCode> comments.</strong> These are markers Protovibe writes around every reorderable element. They tell the canvas which JSX nodes are independent units and which container they belong to. Without them, the visual editor wouldn't know how to cut, copy, or move things.
                </p>
                {/* pv-block-end:pctc04 */}
                {/* pv-block-start:pctc05 */}
                <p data-pv-block="pctc05" className="text-foreground-secondary leading-[1.7]">
                  <strong className="text-foreground-strong"><InlineCode>pvConfig</InlineCode> exports.</strong> Each reusable component has a small config object describing its props, default content, and how it should appear in the components matrix. This is what powers the inspector and the matrix preview.
                </p>
                {/* pv-block-end:pctc05 */}
                {/* pv-block-start:cqkp00 */}
                <div data-pv-block="cqkp00" className="w-full bg-[url('/src/images/from-protovibe/screenshot-2026-05-03-at-072956.png')] bg-contain bg-center bg-no-repeat aspect-[1107/724]" />
                {/* pv-block-end:cqkp00 */}
                {/* pv-block-start:pctc06 */}
                <p data-pv-block="pctc06" className="text-foreground-secondary leading-[1.7]">
                  The full ruleset for both lives in <InlineCode>PROTOVIBE_AGENTS.md</InlineCode> on GitHub. If you ever ask a coding agent to scaffold or refactor a component, point it at that file — it's the canonical reference. <a href="https://github.com/Protovibe-Studio/protovibe-studio/blob/main/projects/landing-page/plugins/protovibe/PROTOVIBE_AGENTS.md" className="text-foreground-primary underline">Read PROTOVIBE_AGENTS.md →</a>
                </p>
                {/* pv-block-end:pctc06 */}
              {/* pv-editable-zone-end:zctc01 */}
            </section>
            {/* pv-block-end:sctc01 */}

            {/* License */}
            {/* pv-block-start:slic01 */}
            <section data-pv-block="slic01" id="license" className="flex flex-col gap-[16px] scroll-mt-[80px]">
              {/* pv-editable-zone-start:zlic01 */}
                {/* pv-block-start:hlic02 */}
                <h2 data-pv-block="hlic02" className="font-secondary font-bold text-[28px] leading-[1.15] tracking-[-0.01em] text-foreground-strong m-0">
                  Open-source License
                </h2>
                {/* pv-block-end:hlic02 */}
                {/* pv-block-start:plic03 */}
                <p data-pv-block="plic03" className="text-foreground-secondary leading-[1.7]">
                  Protovibe is free to use for building and exporting your own projects — personal, commercial, client work, all of it. The code you create is yours.
                </p>
                {/* pv-block-end:plic03 */}
                {/* pv-block-start:plic04 */}
                <p data-pv-block="plic04" className="text-foreground-secondary leading-[1.7]">
                  The one thing you can't do is embed the Protovibe editor itself inside a commercial web-builder product. If that's what you're after, get in touch about a commercial license at <a href="mailto:protovibe.studio@gmail.com" className="text-foreground-primary underline">protovibe.studio@gmail.com</a>.
                </p>
                {/* pv-block-end:plic04 */}
                {/* pv-block-start:plic05 */}
                <p data-pv-block="plic05" className="text-foreground-secondary leading-[1.7]">
                  <a href="https://github.com/Protovibe-Studio/protovibe-studio/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-foreground-primary underline">Read the full license on GitHub →</a>
                </p>
                {/* pv-block-end:plic05 */}
              {/* pv-editable-zone-end:zlic01 */}
            </section>
            {/* pv-block-end:slic01 */}

          {/* pv-editable-zone-end:zn02k4 */}
        </article>
        {/* pv-block-end:ar01x9 */}
      </div>

      <InstallModal open={installOpen} onClose={() => setInstallOpen(false)} />
    </div>
  );
}
