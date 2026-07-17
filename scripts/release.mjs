#!/usr/bin/env node
// Cut a new SIGNED source auto-update release — and, optionally, the Electron shell.
//
//   npm run release              # tag source-v<managerVersion> (auto-suffixed if taken)
//   npm run release -- 1.2.3     # tag source-v1.2.3
//   npm run release -- source-v1.2.3
//   npm run release -- --bump all       # bump+commit+push, then tag & release
//   npm run release -- --bump template  # (manager|template|all)
//   npm run release -- --no-push # do everything locally, push nothing (you push later)
//   npm run release -- --message "fix: x"  # override the auto commit message
//   npm run release -- --dry-run # show what would happen, create/push nothing
//
//   # ── Electron shell ──────────────────────────────────────────────────────────
//   npm run release -- --shell               # bump the shell, re-cut source, release both
//   npm run release -- --shell --bump all    # bump manager+template+shell, release both
//   npm run release -- --shell --bump shell  # same as bare --shell: bump only the shell
//
// The shell never ships alone: `--shell` always also cuts the source release, so a
// user who takes a new shell also gets a matching, signed source bundle. It also
// always bumps the shell (the shell tag must equal electron/package.json and so
// can't auto-suffix like source tags). Source can still be released on its own
// (omit --shell) — that skips the costly macOS build, saving Actions minutes.
//
// A dirty working tree (or a --bump) is committed automatically with a
// "Release <tag> (manager X, template Y)" message — override it with --message.
//
// This creates and pushes a `source-v*` git tag (and, with --shell, a `shell-v*`
// tag). Each triggers its own workflow — .github/workflows/source-release.yml and
// electron-release.yml — and BOTH PAUSE for your approval in the GitHub UI (the
// `release-signing` environment's required reviewer) before they sign and publish.
// Pushing the tags is safe and reversible until you approve. See SECURITY.md.
//
// The shell tag must match electron/package.json exactly (electron-builder
// publishes under that version), so unlike source it cannot auto-suffix — if
// shell-v<version> already exists you must bump the shell first (--bump shell/all,
// or `npm run bump:shell`).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPO_SLUG = 'Protovibe-Studio/protovibe-studio'
const git = (...args) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim()

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const noPush = args.includes('--no-push')
const shell = args.includes('--shell') || args.includes('--electron')
const bumpIdx = args.indexOf('--bump')
const bumpTarget = bumpIdx !== -1 ? args[bumpIdx + 1] : null
const msgIdx = Math.max(args.indexOf('--message'), args.indexOf('-m'))
const commitMessage = msgIdx !== -1 ? args[msgIdx + 1] : null
// Flag values (after --bump / --message) must not be mistaken for the positional version.
const consumed = new Set([bumpIdx + 1, msgIdx + 1].filter((i) => i > 0))
const explicit = args.find((a, i) => !a.startsWith('--') && !consumed.has(i))

function die(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1) }

if (bumpTarget && !['manager', 'template', 'all', 'shell'].includes(bumpTarget)) {
  die('--bump must be one of: manager, template, all, shell')
}
if (bumpTarget && explicit) die('Use either --bump <target> or an explicit version, not both.')
if (msgIdx !== -1 && !commitMessage) die('--message/-m requires a message, e.g. --message "fix: ..."')
// The shell versions independently and its release piggybacks on the source one.
if (bumpTarget === 'shell' && !shell) {
  die('--bump shell only makes sense with --shell (the shell release drags the source one along).')
}
// The shell always ships with a *full* source release, so a shell bump must pair
// with an `all` source bump (or a shell-only bump that re-cuts source unchanged).
if (shell && bumpTarget && !['all', 'shell'].includes(bumpTarget)) {
  die('With --shell the bump target must be "all" or "shell" — the shell always ships alongside a full source release.')
}

// ── Preflight: the client must have a real signing key embedded, else the
//    release it verifies would be unusable. ────────────────────────────────────
const { KEY_CONFIGURED } = await import('../protovibe-project-manager/server/release-verify.js')
if (!KEY_CONFIGURED) {
  die('No signing key is configured (server/release-verify.js still holds the placeholder).\n' +
      '  Run: node scripts/gen-signing-key.mjs  — then paste the PUBLIC key and commit.')
}

// Works on whatever branch you're on (electron-shell today, main later) — the
// branch is resolved at runtime and the signing workflow triggers off the tag.
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
const pkgVersion = (rel) => JSON.parse(readFileSync(path.join(REPO_ROOT, rel), 'utf-8')).version
let unpushedCommit = false // a local release commit that --no-push left for you to push

// What we'll bump: the source scope (--bump) plus the shell whenever --shell is
// set. --shell always bumps the shell because its tag can't auto-suffix (it must
// equal electron/package.json), so a shell release needs a fresh version.
const bumpFiles = []
if (bumpTarget) bumpFiles.push(bumpTarget)
if (shell && !bumpFiles.includes('shell')) bumpFiles.push('shell')

// A bump always creates changes; a dirty tree is swept into the release commit.
// CI builds from the tagged commit, so anything left uncommitted would be invisible.
const dirty = !!git('status', '--porcelain')
const willCommit = dirty || bumpFiles.length > 0
if (branch === 'HEAD' && willCommit && !noPush) {
  die('Detached HEAD — check out a branch before creating a release commit, or use --no-push.')
}

function tagExists(t) {
  if (git('tag', '--list', t)) return true
  try { return !!git('ls-remote', '--tags', 'origin', t) } catch { return false }
}

// ── Apply the version bump first, so versions + tag reflect it ────────────────
if (bumpFiles.length && !dryRun) {
  console.log(`Bumping ${bumpFiles.join(' + ')} ...`)
  execFileSync('node', [path.join(REPO_ROOT, 'scripts/bump-version.mjs'), ...bumpFiles], { cwd: REPO_ROOT, stdio: 'inherit' })
}

// In a real run the bump above already touched disk, so these read the new
// versions. In --dry-run nothing was written, so project the +1 patch that
// bump-version.mjs would apply — otherwise the previewed tags/versions (and the
// shell-tag collision check) would be off by one from what a real run produces.
const bumped = new Set(bumpFiles)
const nextPatch = (v) => {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)$/)
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : v
}
const readVersion = (rel, ...targets) => {
  const v = pkgVersion(rel)
  return dryRun && targets.some((t) => bumped.has(t)) ? nextPatch(v) : v
}
const managerVersion = readVersion('protovibe-project-manager/package.json', 'manager', 'all')
const templateVersion = readVersion('protovibe-project-template/package.json', 'template', 'all')
const shellVersion = shell ? readVersion('electron/package.json', 'shell') : null

// ── Resolve the source tag ────────────────────────────────────────────────────
function normalizeTag(v) {
  const s = String(v).trim()
  return s.startsWith('source-v') ? s : `source-v${s.replace(/^v/, '')}`
}

let tag = normalizeTag(explicit || managerVersion)
if (!explicit) {
  // Auto-suffix so a re-release (e.g. a fix that didn't bump versions) still cuts.
  let candidate = tag
  let n = 2
  while (tagExists(candidate)) candidate = `${tag}-r${n++}`
  tag = candidate
} else if (tagExists(tag)) {
  die(`Tag ${tag} already exists. Pick another version or bump first (npm run bump:*).`)
}

// ── Resolve the shell tag ─────────────────────────────────────────────────────
// electron-builder publishes under electron/package.json's version and the
// workflow asserts shell-v<version> matches it, so this tag cannot auto-suffix.
let shellTag = null
if (shell) {
  shellTag = `shell-v${shellVersion}`
  if (tagExists(shellTag)) {
    die(`Tag ${shellTag} already exists — the shell tag must match electron/package.json exactly.\n` +
        `  Bump the shell first: npm run bump:shell  (or add --bump all / --bump shell).`)
  }
}

// Auto commit message carries "Release" + the version (via the tag) unless the
// caller overrode it with --message.
const shellSuffix = shell ? `, shell ${shellVersion}` : ''
const commitMsg = commitMessage || `Release ${tag} (manager ${managerVersion}, template ${templateVersion}${shellSuffix})`
const tagMsg = `Protovibe source release ${tag} (manager ${managerVersion}, template ${templateVersion})`

console.log(`Branch:   ${branch}`)
console.log(`Versions: manager ${managerVersion}, template ${templateVersion}${shell ? `, shell ${shellVersion}` : ''}`)
console.log(`Tag:      ${tag}${shellTag ? `  +  ${shellTag}` : ''}`)

if (dryRun) {
  if (bumpFiles.length) console.log(`(dry run) would bump ${bumpFiles.join(' + ')}.`)
  if (willCommit) console.log(`(dry run) would commit "${commitMsg}"${noPush ? ' (local only)' : ` and push to ${branch}`}.`)
  console.log('(dry run — no tag created or pushed)')
  console.log(`Would run: git tag -a ${tag} -m "${tagMsg}" && git push origin ${tag}`)
  if (shellTag) console.log(`Would run: git tag -a ${shellTag} -m "Protovibe shell release ${shellTag}" && git push origin ${shellTag}`)
  process.exit(0)
}

// ── Commit the working tree (auto message unless --message) ──────────────────
if (willCommit) {
  git('add', '-A')
  // `git diff --cached --quiet` exits non-zero when something is staged.
  let hasStaged = false
  try { git('diff', '--cached', '--quiet') } catch { hasStaged = true }
  if (hasStaged) {
    git('commit', '-m', commitMsg)
    console.log(`Committed: ${commitMsg}`)
    if (noPush) {
      unpushedCommit = true
      console.log('(not pushed — --no-push)')
    } else {
      console.log(`Pushing ${branch} ...`)
      git('push', 'origin', branch)
    }
  } else {
    console.log('Nothing to commit — skipping commit step.')
  }
}

// ── Create the tag(s) ─────────────────────────────────────────────────────────
git('tag', '-a', tag, '-m', tagMsg)
if (shellTag) git('tag', '-a', shellTag, '-m', `Protovibe shell release ${shellTag}`)

if (noPush) {
  console.log(`\n✔ Created tag${shellTag ? 's' : ''} ${tag}${shellTag ? ` and ${shellTag}` : ''} locally (not pushed — --no-push).`)
  console.log('   Push them yourself when ready to trigger the signing workflow(s):')
  if (unpushedCommit) console.log(`     git push origin ${branch}`)
  console.log(`     git push origin ${tag}`)
  if (shellTag) console.log(`     git push origin ${shellTag}`)
  process.exit(0)
}

// ── Push the tag(s) ───────────────────────────────────────────────────────────
// Roll back any local tags we made so a failed push never leaves dangling tags.
const rollbackTags = () => {
  for (const t of [tag, shellTag].filter(Boolean)) {
    try { git('tag', '-d', t) } catch {}
  }
}
try {
  git('push', 'origin', tag)
  if (shellTag) git('push', 'origin', shellTag)
} catch (e) {
  rollbackTags()
  die(`Failed to push tag: ${e.message}`)
}

console.log(`\n✔ Pushed ${tag}${shellTag ? ` and ${shellTag}` : ''}. The signing workflow${shellTag ? 's are' : ' is'} now waiting for your approval:`)
console.log(`   https://github.com/${REPO_SLUG}/actions`)
console.log('   Approve the "release-signing" deployment to sign and publish.')
