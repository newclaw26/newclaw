// ============================================================================
// V6 Adapter Integration Tests
// Validates adapter→Store→UI data-shape contract WITHOUT React rendering.
// Pure data-layer assertions against the stub adapter functions.
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  fetchIdentity,
  fetchNewBBalance,
  fetchGenesisStatus,
  fetchPooStats,
  fetchSandboxStatus,
} from '@/lib/v6/adapter'

// ---------------------------------------------------------------------------
// fetchIdentity
// ---------------------------------------------------------------------------

describe('fetchIdentity', () => {
  it('returns valid HostIdentity shape', async () => {
    const result = await fetchIdentity()
    expect(result.nodeId).toMatch(/^did:newclaw:/)
    expect(result.publicKey).toBeTruthy()
    expect(typeof result.isLocked).toBe('boolean')
    expect(result.createdAt).toBeTruthy()
  })

  it('nodeId is a 40+ character DID string', async () => {
    const result = await fetchIdentity()
    // did:newclaw: prefix (12 chars) + hex payload
    expect(result.nodeId.length).toBeGreaterThanOrEqual(12)
    expect(result.nodeId.startsWith('did:newclaw:')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// fetchNewBBalance
// ---------------------------------------------------------------------------

describe('fetchNewBBalance', () => {
  it('returns valid EconomyStatus shape', async () => {
    const result = await fetchNewBBalance()
    expect(result.newbBalance).toBeGreaterThanOrEqual(0)
    expect(result.pooScore).toBeGreaterThanOrEqual(0)
    expect(result.pooScore).toBeLessThanOrEqual(100)
    expect(result.halvingProgress).toBeGreaterThanOrEqual(0)
    expect(result.halvingProgress).toBeLessThanOrEqual(100)
  })

  it('contains required numeric fields', async () => {
    const result = await fetchNewBBalance()
    expect(typeof result.newbBalance).toBe('number')
    expect(typeof result.simBalance).toBe('number')
    expect(typeof result.halvingEpoch).toBe('number')
    expect(typeof result.totalMined).toBe('number')
    expect(typeof result.pooVerified).toBe('number')
    expect(typeof result.pooRejected).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// fetchGenesisStatus
// ---------------------------------------------------------------------------

describe('fetchGenesisStatus', () => {
  it('returns boolean fields', async () => {
    const result = await fetchGenesisStatus()
    expect(typeof result.isComplete).toBe('boolean')
    expect(typeof result.hasIdentity).toBe('boolean')
    expect(typeof result.hasEconomy).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// fetchPooStats
// ---------------------------------------------------------------------------

describe('fetchPooStats', () => {
  it('returns consistent counts', async () => {
    const result = await fetchPooStats()
    expect(result.verified + result.rejected).toBeLessThanOrEqual(result.totalTasks)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('all fields are non-negative integers', async () => {
    const result = await fetchPooStats()
    expect(Number.isInteger(result.totalTasks)).toBe(true)
    expect(Number.isInteger(result.verified)).toBe(true)
    expect(Number.isInteger(result.rejected)).toBe(true)
    expect(result.totalTasks).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// fetchSandboxStatus
// ---------------------------------------------------------------------------

describe('fetchSandboxStatus', () => {
  it('returns valid engine type', async () => {
    const result = await fetchSandboxStatus()
    expect(['docker', 'subprocess', 'none']).toContain(result.engine)
  })

  it('available is a boolean', async () => {
    const result = await fetchSandboxStatus()
    expect(typeof result.available).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Cross-adapter performance check
// ---------------------------------------------------------------------------

describe('Adapter performance', () => {
  it('all adapters resolve within 500ms', async () => {
    const start = Date.now()
    await Promise.all([
      fetchIdentity(),
      fetchNewBBalance(),
      fetchGenesisStatus(),
      fetchPooStats(),
      fetchSandboxStatus(),
    ])
    expect(Date.now() - start).toBeLessThan(500)
  })
})
