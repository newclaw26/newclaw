// ============================================================================
// V6 Identity Module Tests
//
// Validates the browser-compatible identity module ported from A-team's
// IdentityManager. Tests cover shape contracts, uniqueness guarantees,
// and deterministic derivation.
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  generateIdentity,
  signMessage,
  verifySignature,
  deriveAddress,
  exportIdentityAsFile,
} from '@/lib/v6/identity'

// ---------------------------------------------------------------------------
// generateIdentity
// ---------------------------------------------------------------------------

describe('generateIdentity', () => {
  it('returns valid HostIdentity shape', () => {
    const identity = generateIdentity()
    expect(identity).toHaveProperty('nodeId')
    expect(identity).toHaveProperty('publicKey')
    expect(identity).toHaveProperty('address')
    expect(identity).toHaveProperty('createdAt')
    expect(identity).toHaveProperty('isLocked')
    expect(typeof identity.isLocked).toBe('boolean')
    expect(identity.isLocked).toBe(false)
  })

  it('nodeId is in DID format (did:newclaw:...)', () => {
    const identity = generateIdentity()
    expect(identity.nodeId).toMatch(/^did:newclaw:[0-9a-f]{40}$/)
  })

  it('publicKey is non-empty hex string (64 chars = 32 bytes)', () => {
    const identity = generateIdentity()
    expect(identity.publicKey).toMatch(/^[0-9a-f]{64}$/)
  })

  it('address starts with ncw1 prefix', () => {
    const identity = generateIdentity()
    expect(identity.address).toMatch(/^ncw1[0-9a-f]+$/)
  })

  it('createdAt is a valid ISO 8601 timestamp', () => {
    const identity = generateIdentity()
    const parsed = new Date(identity.createdAt)
    expect(parsed.getTime()).not.toBeNaN()
    // Should be within last 5 seconds
    expect(Date.now() - parsed.getTime()).toBeLessThan(5000)
  })

  it('two generated identities have different IDs', () => {
    const a = generateIdentity()
    const b = generateIdentity()
    expect(a.nodeId).not.toBe(b.nodeId)
    expect(a.publicKey).not.toBe(b.publicKey)
    expect(a.address).not.toBe(b.address)
  })

  it('generates 100 unique identities without collision', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(generateIdentity().nodeId)
    }
    expect(ids.size).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// deriveAddress
// ---------------------------------------------------------------------------

describe('deriveAddress', () => {
  it('produces consistent output for the same publicKey', () => {
    const pubKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    const addr1 = deriveAddress(pubKey)
    const addr2 = deriveAddress(pubKey)
    expect(addr1).toBe(addr2)
  })

  it('produces different addresses for different keys', () => {
    const a = deriveAddress('aaaa' + '0'.repeat(60))
    const b = deriveAddress('bbbb' + '0'.repeat(60))
    expect(a).not.toBe(b)
  })

  it('starts with ncw1 prefix', () => {
    const addr = deriveAddress('ff'.repeat(32))
    expect(addr.startsWith('ncw1')).toBe(true)
  })

  it('has consistent length (42 characters)', () => {
    const addr = deriveAddress('00'.repeat(32))
    expect(addr.length).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// signMessage / verifySignature
// ---------------------------------------------------------------------------

describe('signMessage', () => {
  it('returns a hex string', () => {
    const sig = signMessage('private-key-hex', 'hello world')
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })

  it('produces deterministic signatures for same key+message', () => {
    const sig1 = signMessage('key-a', 'msg-1')
    const sig2 = signMessage('key-a', 'msg-1')
    expect(sig1).toBe(sig2)
  })

  it('produces different signatures for different messages', () => {
    const sig1 = signMessage('key-a', 'msg-1')
    const sig2 = signMessage('key-a', 'msg-2')
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different keys', () => {
    const sig1 = signMessage('key-a', 'msg-1')
    const sig2 = signMessage('key-b', 'msg-1')
    expect(sig1).not.toBe(sig2)
  })
})

describe('verifySignature', () => {
  it('accepts a valid signature produced by signMessage with same key', () => {
    // [C-01] sign and verify must use the same key in simulation mode
    const key = 'shared-pubkey-hex'
    const sig = signMessage(key, 'msg')
    const valid = verifySignature(key, 'msg', sig)
    expect(valid).toBe(true)
  })

  it('rejects signature produced with a different key', () => {
    // [C-01] This previously passed because verify accepted any hex
    const sig = signMessage('key-a', 'msg')
    const valid = verifySignature('key-b', 'msg', sig)
    expect(valid).toBe(false)
  })

  it('rejects signature for a different message', () => {
    const key = 'shared-key'
    const sig = signMessage(key, 'original-msg')
    const valid = verifySignature(key, 'tampered-msg', sig)
    expect(valid).toBe(false)
  })

  it('rejects empty signature', () => {
    expect(verifySignature('pubkey', 'msg', '')).toBe(false)
  })

  it('rejects non-hex signature', () => {
    expect(verifySignature('pubkey', 'msg', 'not-hex-zzz!!!')).toBe(false)
  })

  it('rejects a random hex string that was not produced by signMessage', () => {
    // [C-01] This previously passed because verify accepted any hex
    const forgedSig = 'deadbeef'.repeat(8)
    expect(verifySignature('pubkey', 'msg', forgedSig)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Integration: generateIdentity → deriveAddress consistency
// ---------------------------------------------------------------------------

describe('Identity ↔ Address integration', () => {
  it('identity.address matches deriveAddress(identity.publicKey)', () => {
    const identity = generateIdentity()
    const reDerived = deriveAddress(identity.publicKey)
    expect(identity.address).toBe(reDerived)
  })
})

// ---------------------------------------------------------------------------
// exportIdentityAsFile
// ---------------------------------------------------------------------------

describe('exportIdentityAsFile', () => {
  it('returns valid JSON string', () => {
    const identity = generateIdentity()
    const json = exportIdentityAsFile(identity)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('is pretty-printed (contains newlines and indentation)', () => {
    const identity = generateIdentity()
    const json = exportIdentityAsFile(identity)
    expect(json).toContain('\n')
    expect(json).toContain('  ')
  })

  it('includes only public fields (nodeId, publicKey, address, createdAt)', () => {
    const identity = generateIdentity()
    const json = exportIdentityAsFile(identity)
    const parsed = JSON.parse(json)

    expect(parsed).toHaveProperty('nodeId')
    expect(parsed).toHaveProperty('publicKey')
    expect(parsed).toHaveProperty('address')
    expect(parsed).toHaveProperty('createdAt')

    // Must NOT include isLocked or any private key material
    expect(parsed).not.toHaveProperty('isLocked')
    expect(parsed).not.toHaveProperty('privateKey')
  })

  it('exported values match source identity', () => {
    const identity = generateIdentity()
    const json = exportIdentityAsFile(identity)
    const parsed = JSON.parse(json)

    expect(parsed.nodeId).toBe(identity.nodeId)
    expect(parsed.publicKey).toBe(identity.publicKey)
    expect(parsed.address).toBe(identity.address)
    expect(parsed.createdAt).toBe(identity.createdAt)
  })

  it('has exactly 4 keys (no extra fields leaked)', () => {
    const identity = generateIdentity()
    const json = exportIdentityAsFile(identity)
    const parsed = JSON.parse(json)

    expect(Object.keys(parsed)).toHaveLength(4)
  })
})
