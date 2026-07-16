#!/usr/bin/env node
// Build-time step: download the dugite-native git distribution for the target
// mac arch and stage it into git-staging/, which electron-builder packs as
// Resources/git. Bundling git into the app (instead of the manager's runtime
// download in server/git-engine.js) means every nested git binary gets swept
// into the Developer ID signing + notarization pass, so a fresh Mac never runs
// an unsigned git and never triggers the Xcode Command Line Tools install
// dialog on first clone.
//
// The URL + checksum below MUST stay in sync with the matching entry in
// protovibe-project-manager/server/git-engine.js (GIT_MANIFEST). The shell only
// ships darwin-arm64, so only that arch is staged here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { pipeline } = require('node:stream/promises');

// dugite-native release v2.53.0-3, darwin-arm64 (keep in sync with git-engine.js).
const GIT_VERSION = '2.53.0';
const ASSET = {
  url: 'https://github.com/desktop/dugite-native/releases/download/v2.53.0-3/dugite-native-v2.53.0-f49d009-macOS-arm64.tar.gz',
  checksum: 'e561cfc80c755e6f3e938653e81efcd025c9827a5b76dd42778b1159b3fab437',
};

const STAGING = path.resolve(__dirname, '..', 'git-staging');
const GIT_BINARY = path.join(STAGING, 'bin', 'git');

async function main() {
  if (fs.existsSync(GIT_BINARY)) {
    console.log(`git already staged at ${STAGING} (delete git-staging/ to refetch)`);
    return;
  }

  fs.rmSync(STAGING, { recursive: true, force: true });
  fs.mkdirSync(STAGING, { recursive: true });

  const archivePath = path.join(STAGING, 'git.tar.gz');
  console.log(`Downloading git ${GIT_VERSION} (darwin-arm64)...`);
  const res = await fetch(ASSET.url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: server returned ${res.status}`);
  }
  await pipeline(res.body, fs.createWriteStream(archivePath));

  const digest = await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(archivePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
  if (digest !== ASSET.checksum) {
    throw new Error(`Checksum mismatch for git tarball (expected ${ASSET.checksum}, got ${digest}).`);
  }
  console.log('Checksum OK.');

  // bsdtar (macOS) preserves the tree's hardlinks (git-core subcommands are
  // hardlinks to the git binary), so codesign signs each once via its inode.
  execFileSync('tar', ['-xzf', archivePath, '-C', STAGING], { stdio: 'inherit' });
  fs.rmSync(archivePath, { force: true });

  if (!fs.existsSync(GIT_BINARY)) {
    throw new Error(`Extraction did not produce ${GIT_BINARY}.`);
  }
  console.log(`git staged at ${STAGING}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
