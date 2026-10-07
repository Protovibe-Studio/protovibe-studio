// Runs inside every iframe that hosts the app (index.html, components.html,
// sketchpad.html) as a Vite module — including spec thumbnails and the dev
// specs viewer, which load index.html too.
//
// A document can never unload an ES module. Every HMR update imports fresh
// `?t=…` URLs for the changed module and everything up to its HMR boundary
// (often the Tailwind stylesheet as well), and each version's source text and
// compiled code stay alive until the document itself goes away. One edit costs
// a few hundred KB per frame; over hours of agent edits that piles up into
// gigabytes, multiplied by every live frame — the Specs tab keeps a full copy
// of the app running per visible thumbnail.
//
// The only way to hand that memory back is to reload the document. So this
// module tallies the bytes HMR has loaded into this document and, once past a
// budget, turns the next hot update into a full reload of this frame — the
// same thing Vite does for an edit it can't hot-swap, so the user sees a
// refresh exactly when they expect the canvas to change anyway.

const MB = 1024 * 1024;
// The editing canvases reload rarely, so a refresh seldom interrupts work.
const CANVAS_BUDGET_BYTES = 350 * MB;
// Spec frames are passive previews and there can be many of them, so they
// recycle much sooner.
const SPEC_FRAME_BUDGET_BYTES = 32 * MB;
// While the user is typing into the frame, the reload waits — up to this many
// times the budget, after which memory wins.
const HARD_LIMIT_FACTOR = 2;
// Resource Timing reports 0 bytes in rare cases (e.g. an opaque response);
// count such a module as a typical small one rather than as free.
const FALLBACK_MODULE_BYTES = 16 * 1024;
// Vite stamps every module URL it re-imports for HMR with `t=<timestamp>`.
const HMR_URL = /[?&]t=\d/;

const hot = import.meta.hot;

if (hot && typeof PerformanceObserver !== 'undefined') {
  const budget = window.name.startsWith('pv-spec-') ? SPEC_FRAME_BUDGET_BYTES : CANVAS_BUDGET_BYTES;
  let loadedBytes = 0;
  // Start counting at the first hot update. A document that loads after
  // earlier edits imports their `?t=` URLs too, but only once — that is not
  // growth, and counting it could make a fresh frame reload straight away.
  let firstUpdateAt = Infinity;
  let reloading = false;

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
      if (entry.startTime < firstUpdateAt || !HMR_URL.test(entry.name)) continue;
      loadedBytes += entry.decodedBodySize || FALLBACK_MODULE_BYTES;
    }
  }).observe({ type: 'resource' });

  const isTyping = () => {
    const el = document.activeElement as HTMLElement | null;
    return !!el && (el.isContentEditable || el.matches('input, textarea, select'));
  };

  hot.on('vite:beforeUpdate', () => {
    if (firstUpdateAt === Infinity) firstUpdateAt = performance.now();
    if (reloading || loadedBytes < budget) return;
    if (isTyping() && loadedBytes < budget * HARD_LIMIT_FACTOR) return;
    reloading = true;
    console.info(
      `[protovibe] Hot updates have loaded ${Math.round(loadedBytes / MB)} MB of modules into this frame; ` +
        'reloading it to release that memory.',
    );
    window.location.reload();
  });
}
