// Source of the node preload written into the toolchain shim dir and required
// (via NODE_OPTIONS) into every child node process. Kept in its own pure module
// — no electron imports — so the regression test in test/shim-argv.test.cjs can
// exercise the EXACT bytes the app ships.
//
// Why it exists: our `node` is Electron in ELECTRON_RUN_AS_NODE mode, so
// process.versions.electron stays set. yargs' hideBin() (wrangler, and many
// other CLIs) then thinks it's a bundled Electron app and slices argv at 1
// instead of 2, leaking the script path into the parsed args. Marking the
// process as defaultApp flips that detection back to the normal node slice.
module.exports = `if (process.versions && process.versions.electron && !process.defaultApp) {
  try { Object.defineProperty(process, 'defaultApp', { value: true, configurable: true }); }
  catch (e) { try { process.defaultApp = true; } catch (e2) {} }
}
`;
