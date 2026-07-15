#!/usr/bin/env node
// Generate an Ed25519 signing key pair for Protovibe auto-update releases.
//
//   node scripts/gen-signing-key.mjs
//
// Prints the PUBLIC key — paste it into
//   protovibe-project-manager/server/release-verify.js  (PUBLIC_KEY_PEM)
// and the PRIVATE key — store it as the GitHub Actions secret
//   PROTOVIBE_SIGNING_KEY
// bound to the protected `release-signing` environment. Keep the private key
// offline (a password manager / hardware-backed store) and NEVER commit it.
import crypto from 'node:crypto'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim()
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim()

const line = '─'.repeat(72)
console.log(line)
console.log('PUBLIC KEY  →  paste into server/release-verify.js (PUBLIC_KEY_PEM)')
console.log(line)
console.log(pub)
console.log()
console.log(line)
console.log('PRIVATE KEY →  GitHub secret PROTOVIBE_SIGNING_KEY (keep offline, never commit)')
console.log(line)
console.log(priv)
