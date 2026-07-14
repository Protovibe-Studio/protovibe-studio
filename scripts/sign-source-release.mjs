#!/usr/bin/env node
// Build + sign a Protovibe source auto-update release.
//
//   PROTOVIBE_SIGNING_KEY="$(cat key.pem)" node scripts/sign-source-release.mjs --out dist-release --tag source-v1.0.12
//
// Produces, in the --out dir:
//   protovibe-source.zip   the manager + template source (no node_modules/dist/.git)
//   manifest.json          { managerVersion, templateVersion, artifact, artifactSha256, ... }
//   manifest.json.sig      detached Ed25519 signature (base64) over manifest.json
//
// The matching PUBLIC key is embedded in the client (server/release-verify.js),
// which verifies manifest.json.sig before trusting or applying anything. The
// signing key is read from PROTOVIBE_SIGNING_KEY (PEM contents) or the file named
// by PROTOVIBE_SIGNING_KEY_FILE — it must never be committed.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WORKSPACES = ['protovibe-project-manager', 'protovibe-project-template']
const ARTIFACT_NAME = 'protovibe-source.zip'
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.git', '.mac-installer', 'bundle-staging', 'pnpm-staging'])

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function loadPrivateKey() {
  const inline = process.env.PROTOVIBE_SIGNING_KEY
  const file = process.env.PROTOVIBE_SIGNING_KEY_FILE
  const pem = inline || (file ? fs.readFileSync(file, 'utf-8') : null)
  if (!pem || !pem.trim()) {
    console.error('error: set PROTOVIBE_SIGNING_KEY (PEM contents) or PROTOVIBE_SIGNING_KEY_FILE.')
    process.exit(1)
  }
  const key = crypto.createPrivateKey(pem)
  if (key.asymmetricKeyType !== 'ed25519') {
    console.error(`error: signing key must be Ed25519, got ${key.asymmetricKeyType}.`)
    process.exit(1)
  }
  return key
}

function readVersion(ws) {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ws, 'package.json'), 'utf-8'))
  if (typeof pkg.version !== 'string') throw new Error(`${ws}/package.json has no version`)
  return pkg.version
}

// Stage a workspace into dest, skipping excluded dirs and junk files.
function stage(src, dest) {
  fs.cpSync(src, dest, {
    recursive: true,
    filter: (p) => {
      const base = path.basename(p)
      if (EXCLUDE_DIRS.has(base)) return false
      if (base.endsWith('.log') || base === '.DS_Store') return false
      return true
    },
  })
}

const outDir = path.resolve(arg('out', path.join(REPO_ROOT, 'dist-release')))
const tag = arg('tag', null)

const privateKey = loadPrivateKey()
const managerVersion = readVersion('protovibe-project-manager')
const templateVersion = readVersion('protovibe-project-template')

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'protovibe-sign-'))
try {
  // Stage both workspaces under a single top-level folder so the client's
  // findExtractedRoot() locates them after extraction.
  const rootName = 'protovibe-source'
  const stagingRoot = path.join(tmp, rootName)
  for (const ws of WORKSPACES) stage(path.join(REPO_ROOT, ws), path.join(stagingRoot, ws))

  const zipPath = path.join(outDir, ARTIFACT_NAME)
  // -X strips extra file attributes for a leaner, more stable archive.
  execFileSync('zip', ['-r', '-X', '-q', zipPath, rootName], { cwd: tmp, stdio: 'inherit' })

  const zipBuf = fs.readFileSync(zipPath)
  const artifactSha256 = crypto.createHash('sha256').update(zipBuf).digest('hex')

  const manifest = {
    schema: 1,
    managerVersion,
    templateVersion,
    artifact: ARTIFACT_NAME,
    artifactSha256,
    tag,
    createdAt: new Date().toISOString(),
  }
  // Sign the EXACT bytes we publish, so the client verifies byte-for-byte.
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
  const signature = crypto.sign(null, manifestBytes, privateKey)

  fs.writeFileSync(path.join(outDir, 'manifest.json'), manifestBytes)
  fs.writeFileSync(path.join(outDir, 'manifest.json.sig'), signature.toString('base64') + '\n')

  console.log(`Signed release ready in ${outDir}`)
  console.log(`  manager ${managerVersion}, template ${templateVersion}`)
  console.log(`  ${ARTIFACT_NAME} sha256 ${artifactSha256}`)
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
