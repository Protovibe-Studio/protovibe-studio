#!/usr/bin/env node
// Download + verify the latest signed source release and extract it, so callers
// (e.g. download-newest-version.sh) never apply unverified code. Uses the same
// embedded public key as the in-app updater via release-verify.js.
//
//   node scripts/fetch-verified-release.mjs --dest <dir>
//     → verifies signature + artifact hash, extracts the source, and prints JSON:
//       { "srcRoot": "...", "managerVersion": "...", "templateVersion": "..." }
//     → exits non-zero on ANY verification failure.
//
// Env:
//   PROTOVIBE_GITHUB_TOKEN / GITHUB_TOKEN   optional, for private repos
//   PROTOVIBE_RELEASE_DIR                    offline mode: a local dir containing
//                                            manifest.json, manifest.json.sig and
//                                            the artifact (used for testing/air-gap)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { verifyManifest, sha256Hex } from '../protovibe-project-manager/server/release-verify.js'

const REPO = 'Protovibe-Studio/protovibe-studio'
const TAG_PREFIX = 'source-v'

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
function fail(msg) { console.error(`error: ${msg}`); process.exit(1) }

function ghHeaders(accept) {
  const h = { Accept: accept, 'User-Agent': 'protovibe-updater' }
  const token = process.env.PROTOVIBE_GITHUB_TOKEN || process.env.GITHUB_TOKEN
  if (token) h.Authorization = `Bearer ${token}`
  return h
}
async function ghAssetBytes(asset) {
  const res = await fetch(asset.url, { headers: ghHeaders('application/octet-stream'), redirect: 'follow' })
  if (!res.ok) fail(`downloading ${asset.name}: GitHub returned ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Returns { manifestBuf, sigText, artifactBuf } from GitHub Releases or a local dir.
async function loadRelease() {
  const localDir = process.env.PROTOVIBE_RELEASE_DIR
  if (localDir) {
    const manifestBuf = fs.readFileSync(path.join(localDir, 'manifest.json'))
    const sigText = fs.readFileSync(path.join(localDir, 'manifest.json.sig'), 'utf-8')
    const artifact = JSON.parse(manifestBuf.toString()).artifact
    const artifactBuf = fs.readFileSync(path.join(localDir, artifact))
    return { manifestBuf, sigText, artifactBuf }
  }
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers: ghHeaders('application/vnd.github+json') })
  if (!res.ok) fail(`listing releases: GitHub returned ${res.status}`)
  const releases = await res.json()
  const release = (Array.isArray(releases) ? releases : []).find((r) =>
    !r.draft && !r.prerelease && typeof r.tag_name === 'string' && r.tag_name.startsWith(TAG_PREFIX) &&
    (r.assets || []).some((a) => a.name === 'manifest.json') &&
    (r.assets || []).some((a) => a.name === 'manifest.json.sig'))
  if (!release) fail('no signed source release found')
  const byName = new Map((release.assets || []).map((a) => [a.name, a]))
  const manifestBuf = await ghAssetBytes(byName.get('manifest.json'))
  const sigText = (await ghAssetBytes(byName.get('manifest.json.sig'))).toString('utf-8')
  const manifestArtifact = JSON.parse(manifestBuf.toString()).artifact
  const artAsset = byName.get(manifestArtifact)
  if (!artAsset) fail(`manifest references missing artifact "${manifestArtifact}"`)
  const artifactBuf = await ghAssetBytes(artAsset)
  return { manifestBuf, sigText, artifactBuf }
}

const dest = path.resolve(arg('dest', fs.mkdtempSync(path.join(os.tmpdir(), 'protovibe-verified-'))))

let manifest
const { manifestBuf, sigText, artifactBuf } = await loadRelease()
try {
  manifest = verifyManifest(manifestBuf, sigText) // throws unless signature is valid
} catch (e) {
  fail(`signature verification failed: ${e.message}`)
}
if (sha256Hex(artifactBuf) !== String(manifest.artifactSha256 || '').toLowerCase()) {
  fail('artifact hash does not match the signed manifest')
}

fs.mkdirSync(dest, { recursive: true })
const zipPath = path.join(dest, manifest.artifact)
fs.writeFileSync(zipPath, artifactBuf)
const extractDir = path.join(dest, 'extract')
fs.mkdirSync(extractDir, { recursive: true })
execFileSync('unzip', ['-o', '-q', zipPath, '-d', extractDir])

// Locate the folder that holds both workspaces.
let srcRoot = null
for (const ent of fs.readdirSync(extractDir, { withFileTypes: true })) {
  if (!ent.isDirectory()) continue
  const c = path.join(extractDir, ent.name)
  if (fs.existsSync(path.join(c, 'protovibe-project-manager')) && fs.existsSync(path.join(c, 'protovibe-project-template'))) { srcRoot = c; break }
}
if (!srcRoot) fail('verified archive did not contain the expected folders')

console.log(JSON.stringify({ srcRoot, managerVersion: manifest.managerVersion, templateVersion: manifest.templateVersion }))
