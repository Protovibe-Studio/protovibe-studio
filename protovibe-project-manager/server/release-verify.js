// Ed25519 verification for signed auto-update releases.
//
// The in-app updater (vite.config.js) pulls the manager/template source from a
// GitHub Release. Before anything is downloaded or applied, the release's
// signed manifest is verified against the PUBLIC key embedded below. The matching
// PRIVATE key never lives in the repo: it is held by the maintainer and stored as
// the GitHub Actions secret PROTOVIBE_SIGNING_KEY, bound to the protected
// `release-signing` environment whose deployment requires a manual (passkey)
// approval. A compromise of the git repo alone therefore cannot ship malware —
// an attacker would also need the offline signing key.
//
// Pure Node `crypto` (Ed25519) — no third-party dependency, works on macOS/Windows.

import crypto from 'node:crypto'

// The value below is a PLACEHOLDER (a throwaway key whose private half was
// discarded). Until it is replaced, the app treats updates as unconfigured and
// refuses them. Generate your real pair with `node scripts/gen-signing-key.mjs`
// and paste the printed public key here.
const PLACEHOLDER_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAH9iClqAqlT8xZimC1wzotbmoEMpC/iGeFxO4IpadVlk=
-----END PUBLIC KEY-----`

// ── Replace this constant with your generated public key ─────────────────────
export const PUBLIC_KEY_PEM = PLACEHOLDER_PUBLIC_KEY_PEM

// True once a real signing key has been installed. Callers must refuse updates
// (fail closed) while this is false rather than silently reporting "up to date".
export const KEY_CONFIGURED = PUBLIC_KEY_PEM.trim() !== PLACEHOLDER_PUBLIC_KEY_PEM.trim()

export function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

// Verify a detached Ed25519 signature over `dataBuf`. Never throws — returns a
// boolean so callers fail closed on malformed keys/signatures.
export function verifyDetached(dataBuf, signatureBuf, publicKeyPem = PUBLIC_KEY_PEM) {
  try {
    const key = crypto.createPublicKey(publicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519') return false
    return crypto.verify(null, dataBuf, key, signatureBuf)
  } catch {
    return false
  }
}

// Verify a release manifest's detached base64 signature and return the parsed
// manifest. Throws on ANY failure (unconfigured key, bad signature, bad JSON) so
// the updater never proceeds on unverified content.
export function verifyManifest(manifestBuf, signatureB64, publicKeyPem = PUBLIC_KEY_PEM) {
  if (!KEY_CONFIGURED) {
    throw new Error('Update signing key is not configured (placeholder public key still in place).')
  }
  const sig = Buffer.from(String(signatureB64 ?? '').trim(), 'base64')
  if (sig.length === 0) throw new Error('Release signature is empty.')
  if (!verifyDetached(manifestBuf, sig, publicKeyPem)) {
    throw new Error('Release manifest signature is invalid.')
  }
  let manifest
  try {
    manifest = JSON.parse(manifestBuf.toString('utf-8'))
  } catch {
    throw new Error('Release manifest is not valid JSON.')
  }
  if (!manifest || typeof manifest !== 'object') throw new Error('Release manifest is empty.')
  return manifest
}
