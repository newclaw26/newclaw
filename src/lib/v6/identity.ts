// ============================================================================
// NewClaw V6 - Identity Module (Browser-Compatible)
//
// Ported from A-team IdentityManager (electron/identity/index.ts) to
// functional style for B-team renderer process.
//
// A-team original: class-based IdentityManager with Node.js crypto,
//   disk-based keystore, Ed25519 via generateKeyPairSync, AES-256-GCM
//   encrypted private key storage.
//
// B-team adaptation: pure functions, Web Crypto API where available,
//   simulated crypto for MVP (marked with TODO for real implementation).
//
// Implements Section 3 of NewClaw v6.0 Spec: Genesis Sequence
// ============================================================================

import type { HostIdentity } from '@/types/v6'

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Generate cryptographically random hex string using Web Crypto API.
 * Throws if crypto.getRandomValues is unavailable — never falls back to
 * Math.random, which is predictable and unsuitable for key material.
 *
 * [H-01] Security fix: removed Math.random fallback.
 */
function randomHex(bytes: number): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(bytes)
    crypto.getRandomValues(buf)
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  throw new Error(
    'Secure random number generator not available. ' +
    'crypto.getRandomValues is required for key generation.',
  )
}

/**
 * Deterministic non-cryptographic hash with 128-bit internal state.
 *
 * [H-03] Security fix: expanded from 64-bit (2x 32-bit words) to
 * 128-bit (4x 32-bit words) to reduce trivial collision probability
 * from ~2^32 to ~2^64. Each word uses a distinct FNV-style prime and
 * seed to maximize state mixing.
 *
 * WARNING — MVP ONLY: This is NOT a cryptographic hash function. It must
 * be replaced with SHA-256 (via Web Crypto API crypto.subtle.digest) before
 * production use. The 128-bit state is adequate for simulation identity
 * derivation but is NOT safe for signature schemes, integrity checks,
 * or any adversarial context.
 *
 * TODO: Replace with real Web Crypto API digest:
 *   const buf = new TextEncoder().encode(input);
 *   const hash = await crypto.subtle.digest('SHA-256', buf);
 *   return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
 */
function simpleHash(input: string): string {
  // Four independent 32-bit state words with distinct seeds
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  let h3 = 0x9e3779b9  // golden ratio fractional bits
  let h4 = 0x517cc1b7  // distinct prime seed

  // Absorb input bytes into all four state words with distinct primes
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)  // FNV prime variant 1
    h2 = Math.imul(h2 ^ ch, 1597334677)  // FNV prime variant 2
    h3 = Math.imul(h3 ^ ch, 2246822507)  // avalanche prime 1
    h4 = Math.imul(h4 ^ ch, 3266489909)  // avalanche prime 2
  }

  // Avalanche: mix state words to ensure full diffusion
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 16), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 16), 3266489909)
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2654435761)
  h3 ^= Math.imul(h4 ^ (h4 >>> 16), 1597334677)
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2654435761)
  h4 ^= Math.imul(h3 ^ (h3 >>> 16), 1597334677)

  // Cross-mix between the two pairs for full 128-bit entanglement
  h1 ^= h3 >>> 5
  h2 ^= h4 >>> 7
  h3 ^= h1 >>> 11
  h4 ^= h2 >>> 13

  const w1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const w2 = (h2 >>> 0).toString(16).padStart(8, '0')
  const w3 = (h3 >>> 0).toString(16).padStart(8, '0')
  const w4 = (h4 >>> 0).toString(16).padStart(8, '0')

  // Build 64 hex chars (256-bit output) by cascading additional rounds
  let result = w1 + w2 + w3 + w4 // 32 hex chars from 128-bit core
  for (let round = 0; round < 2; round++) {
    h1 = Math.imul(h1 ^ (round + 1), 2654435761) >>> 0
    h2 = Math.imul(h2 ^ (round + 1), 1597334677) >>> 0
    h3 = Math.imul(h3 ^ (round + 1), 2246822507) >>> 0
    h4 = Math.imul(h4 ^ (round + 1), 3266489909) >>> 0
    result += h1.toString(16).padStart(8, '0')
    result += h2.toString(16).padStart(8, '0')
    result += h3.toString(16).padStart(8, '0')
    result += h4.toString(16).padStart(8, '0')
  }
  return result.slice(0, 64)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a new host identity (Genesis Sequence).
 *
 * A-team equivalent: IdentityManager.generateGenesis()
 *   - Ed25519 keypair via generateKeyPairSync
 *   - nodeId = 'NC-' + SHA-256(pubkey).slice(0,20).hex
 *   - Private key encrypted with AES-256-GCM and stored on disk
 *
 * B-team MVP: simulated keypair using crypto.getRandomValues.
 * The nodeId uses DID format (did:newclaw:<hex>) per B-team HostIdentity spec.
 *
 * TODO: Replace with real Ed25519 via Web Crypto API or electron main process IPC:
 *   const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
 *   const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
 */
export function generateIdentity(): HostIdentity {
  // Simulate Ed25519 public key (32 bytes = 64 hex chars)
  const publicKey = randomHex(32)

  // Derive nodeId from public key hash (mirrors A-team: SHA-256 → first 20 bytes → hex)
  // A-team format: 'NC-' + hash.slice(0,20).hex
  // B-team format: 'did:newclaw:' + hash.slice(0,20).hex (per HostIdentity interface)
  const pubKeyHash = simpleHash(publicKey)
  const nodeId = 'did:newclaw:' + pubKeyHash.slice(0, 40) // 20 bytes = 40 hex chars

  // Derive blockchain-style address
  const address = deriveAddress(publicKey)

  return {
    nodeId,
    publicKey,
    address,
    createdAt: new Date().toISOString(),
    isLocked: false,
  }
}

/**
 * Sign a message with a key (simulation mode uses publicKey).
 *
 * A-team equivalent: IdentityManager.sign()
 *   - Uses Node.js crypto.sign(null, Buffer.from(data), privateKey)
 *   - Returns signature as hex string
 *
 * TODO: Replace with real Ed25519 signing via Web Crypto API:
 *   const sig = await crypto.subtle.sign('Ed25519', privateKey, new TextEncoder().encode(message));
 *   return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
 *
 * [C-01] Security fix: MVP simulation uses hash(key + ':sign:' + message)
 * so that verifySignature can recompute the same hash using the same key.
 * In simulation mode, pass the *publicKey* as the signing key so that
 * verify (which only has the publicKey) can recompute the signature.
 *
 * When migrating to real Ed25519, this function will take the privateKey
 * and verifySignature will use the corresponding publicKey natively.
 */
export function signMessage(key: string, message: string): string {
  return simpleHash(key + ':sign:' + message)
}

/**
 * Verify a signature against a public key and message.
 *
 * A-team note: original IdentityManager did not expose verify — only sign.
 * This is a B-team addition for completeness.
 *
 * TODO: Replace with real Ed25519 verification via Web Crypto API:
 *   const valid = await crypto.subtle.verify('Ed25519', publicKey, sigBuf, msgBuf);
 *
 * [C-01] Security fix: recomputes hash(publicKey + ':sign:' + message) and
 * compares against the provided signature. Rejects forged or mismatched
 * signatures instead of accepting any hex string.
 */
export function verifySignature(
  publicKey: string,
  message: string,
  signature: string,
): boolean {
  if (!signature || !publicKey || !message) return false
  if (!/^[0-9a-f]+$/i.test(signature)) return false
  const expected = simpleHash(publicKey + ':sign:' + message)
  return signature === expected
}

/**
 * Export public identity info as a JSON string for file persistence.
 *
 * SECURITY: Only exports public fields (nodeId, publicKey, address, createdAt).
 * The private key (if any) and lock status are intentionally excluded to prevent
 * accidental key material leakage via file export.
 *
 * Mirrors governance-persistence.ts exportAsFiles() pattern.
 */
export function exportIdentityAsFile(identity: HostIdentity): string {
  return JSON.stringify(
    {
      nodeId: identity.nodeId,
      publicKey: identity.publicKey,
      address: identity.address,
      createdAt: identity.createdAt,
    },
    null,
    2,
  )
}

/**
 * Derive a blockchain-style address from a public key.
 *
 * A-team equivalent: 'NC-' + SHA-256(publicKey).slice(0,20).hex
 * B-team format: 'ncw1' + hash(publicKey) truncated to bech32-like length
 *
 * Produces consistent output for the same publicKey input.
 */
export function deriveAddress(publicKey: string): string {
  const hash = simpleHash('addr:' + publicKey)
  return 'ncw1' + hash.slice(0, 38) // 42 chars total, bech32-like
}
