#!/usr/bin/env node
// Cut a new SIGNED source auto-update release.
//
//   npm run release              # tag source-v<managerVersion> (auto-suffixed if taken)
//   npm run release -- 1.2.3     # tag source-v1.2.3
//   npm run release -- source-v1.2.3
//   npm run release -- --bump all       # bump+commit+push, then tag & release
//   npm run release -- --bump template  # (manager|template|all)
//   npm run release -- --message "fix: x"   # commit the working tree, then tag & release
//   npm run release -- --message "fix: x" --no-push  # commit + tag locally, push nothing
//   npm run release -- --no-push # do everything locally, push nothing (you push later)
//   npm run release -- --dry-run # show what would happen, create/push nothing
//
// This creates and pushes a `source-v*` git tag, which triggers
// .github/workflows/source-release.yml. That job PAUSES for your approval in the
// GitHub UI (the `release-signing` environment's required reviewer) before it
// signs and publishes — so pushing the tag is safe and reversible until you
// approve. See SECURITY.md.
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
const bumpIdx = args.indexOf('--bump')
const bumpTarget = bumpIdx !== -1 ? args[bumpIdx + 1] : null
const msgIdx = Math.max(args.indexOf('--message'), args.indexOf('-m'))
const commitMessage = msgIdx !== -1 ? args[msgIdx + 1] : null
// Flag values (after --bump / --message) must not be mistaken for the positional version.
const consumed = new Set([bumpIdx + 1, msgIdx + 1].filter((i) => i > 0))
const explicit = args.find((a, i) => !a.startsWith('--') && !consumed.has(i))

function die(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1) }

if (bumpTarget && !['manager', 'template', 'all'].includes(bumpTarget)) {
  die('--bump must be one of: manager, template, all')
}
if (bumpTarget && explicit) die('Use either --bump <target> or an explicit version, not both.')
if (msgIdx !== -1 && !commitMessage) die('--message/-m requires a message, e.g. --message "fix: ..."')

// ── Preflight ────────────────────────────────────────────────────────────────
// 1) The client must have a real signing key embedded, or the release it verifies
//    would be unusable.
const { KEY_CONFIGURED } = await import('../protovibe-project-manager/server/release-verify.js')
if (!KEY_CONFIGURED) {
  die('No signing key is configured (server/release-verify.js still holds the placeholder).\n' +
      '  Run: node scripts/gen-signing-key.mjs  — then paste the PUBLIC key and commit.')
}

// 2) Clean tree — CI builds from the tagged commit, so uncommitted work is invisible
//    unless we commit it here (via --message and/or --bump).
const dirty = !!git('status', '--porcelain')
const willCommit = !!commitMessage || !!bumpTarget
if (dirty && !willCommit) {
  die('Working tree is not clean. Commit your changes first, or pass --message "<msg>" ' +
      'to commit them as part of the release (add --no-push to push nothing).')
}
if (dirty && bumpTarget && !commitMessage) {
  die('Working tree has changes beyond a version bump. Commit them first, or add ' +
      '--message "<msg>" to fold them into the release commit.')
}

// Works on whatever branch you're on (electron-shell today, main later) — the
// branch is resolved at runtime and the signing workflow triggers off the tag,
// not any specific branch.
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch === 'HEAD' && willCommit && !noPush) {
  die('Detached HEAD — check out a branch before creating a release commit, or use --no-push.')
}
const pkgVersion = (rel) => JSON.parse(readFileSync(path.join(REPO_ROOT, rel), 'utf-8')).version
let unpushedCommit = false // a local release commit that --no-push left for you to push

// Optionally bump versions and/or commit the working tree, then push — unless
// --no-push, in which case everything stays local for you to push later.
if (dryRun) {
  if (bumpTarget) console.log(`(dry run) would bump ${bumpTarget}.`)
  if (willCommit) console.log(`(dry run) would commit ${noPush ? '(local only)' : `and push to ${branch}`}.`)
} else {
  if (bumpTarget) {
    console.log(`Bumping ${bumpTarget} ...`)
    execFileSync('node', [path.join(REPO_ROOT, 'scripts/bump-version.mjs'), bumpTarget], { cwd: REPO_ROOT, stdio: 'inherit' })
  }
  if (willCommit) {
    git('add', '-A')
    // `git diff --cached --quiet` exits non-zero when something is staged.
    let hasStaged = false
    try { git('diff', '--cached', '--quiet') } catch { hasStaged = true }
    if (hasStaged) {
      const m = pkgVersion('protovibe-project-manager/package.json')
      const t = pkgVersion('protovibe-project-template/package.json')
      const finalMsg = commitMessage || `Release: bump ${bumpTarget} (manager ${m}, template ${t})`
      git('commit', '-m', finalMsg)
      if (noPush) {
        unpushedCommit = true
        console.log('Committed locally (not pushed — --no-push).')
      } else {
        console.log(`Pushing ${branch} ...`)
        git('push', 'origin', branch)
      }
    } else {
      console.log('Nothing to commit — skipping commit step.')
    }
  }
}

const managerVersion = pkgVersion('protovibe-project-manager/package.json')
const templateVersion = pkgVersion('protovibe-project-template/package.json')

// ── Resolve a unique tag ─────────────────────────────────────────────────────
function normalizeTag(v) {
  const s = String(v).trim()
  return s.startsWith('source-v') ? s : `source-v${s.replace(/^v/, '')}`
}
function tagExists(tag) {
  if (git('tag', '--list', tag)) return true
  try { return !!git('ls-remote', '--tags', 'origin', tag) } catch { return false }
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

const message = `Protovibe source release ${tag} (manager ${managerVersion}, template ${templateVersion})`

console.log(`Branch:   ${branch}`)
console.log(`Versions: manager ${managerVersion}, template ${templateVersion}`)
console.log(`Tag:      ${tag}`)

if (dryRun) {
  console.log('\n(dry run — no tag created or pushed)')
  console.log(`Would run: git tag -a ${tag} -m "${message}" && git push origin ${tag}`)
  process.exit(0)
}

// ── Create the tag ───────────────────────────────────────────────────────────
git('tag', '-a', tag, '-m', message)

if (noPush) {
  console.log(`\n✔ Created tag ${tag} locally (not pushed — --no-push).`)
  console.log('   Push it yourself when ready to trigger the signing workflow:')
  if (unpushedCommit) console.log(`     git push origin ${branch}`)
  console.log(`     git push origin ${tag}`)
  process.exit(0)
}

// ── Push the tag ─────────────────────────────────────────────────────────────
try {
  git('push', 'origin', tag)
} catch (e) {
  // Roll back the local tag so a failed push doesn't leave a dangling tag.
  try { git('tag', '-d', tag) } catch {}
  die(`Failed to push tag: ${e.message}`)
}

console.log(`\n✔ Pushed ${tag}. The signing workflow is now waiting for your approval:`)
console.log(`   https://github.com/${REPO_SLUG}/actions`)
console.log('   Approve the "release-signing" deployment to sign and publish.')
