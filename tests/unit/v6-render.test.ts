// ============================================================================
// V6 Render Data Contract Tests
//
// Verifies that the data shapes returned by store/adapter functions are
// compatible with what the UI components expect. No React rendering or
// jsdom DOM manipulation -- pure data contract verification.
//
// Contract definitions:
//   IdentityCard expects: { nodeId, publicKey, address, createdAt, locked }
//   EconomyDashboard expects: { newBBalance, simBalance, pooPriorityScore,
//     halvingEpoch, halvingProgress, totalMined, verifiedOutcomes, rejectedOutcomes }
// ============================================================================

import { describe, it, expect } from 'vitest'

import { generateIdentity } from '@/lib/v6/identity'
import {
  createEconomyState,
  getEconomyStatus,
  issueReward,
} from '@/lib/v6/economy'
import { fetchIdentity, fetchNewBBalance } from '@/lib/v6/adapter'
import type { HostIdentity, EconomyStatus } from '@/types/v6'

// ---------------------------------------------------------------------------
// IdentityCard Data Contract
// ---------------------------------------------------------------------------

describe('IdentityCard data contract', () => {
  /**
   * The IdentityCard UI component renders these fields:
   *   - nodeId:    displayed as the node's DID identifier
   *   - publicKey: shown in a copyable field
   *   - address:   the derived blockchain address
   *   - createdAt: formatted as a human-readable timestamp
   *   - locked:    boolean mapped from isLocked, drives lock/unlock badge
   */

  it('generateIdentity() returns all fields required by IdentityCard', () => {
    const identity = generateIdentity()

    // Required fields
    expect(identity).toHaveProperty('nodeId')
    expect(identity).toHaveProperty('publicKey')
    expect(identity).toHaveProperty('address')
    expect(identity).toHaveProperty('createdAt')
    expect(identity).toHaveProperty('isLocked')
  })

  it('nodeId is a non-empty string in DID format', () => {
    const identity = generateIdentity()
    expect(typeof identity.nodeId).toBe('string')
    expect(identity.nodeId.length).toBeGreaterThan(0)
    expect(identity.nodeId).toMatch(/^did:newclaw:/)
  })

  it('publicKey is a 64-char hex string (32 bytes)', () => {
    const identity = generateIdentity()
    expect(typeof identity.publicKey).toBe('string')
    expect(identity.publicKey).toMatch(/^[0-9a-f]{64}$/)
  })

  it('address is a non-empty string starting with ncw1', () => {
    const identity = generateIdentity()
    expect(typeof identity.address).toBe('string')
    expect(identity.address).toMatch(/^ncw1/)
  })

  it('createdAt is a valid ISO 8601 timestamp string', () => {
    const identity = generateIdentity()
    expect(typeof identity.createdAt).toBe('string')
    const parsed = new Date(identity.createdAt)
    expect(parsed.getTime()).not.toBeNaN()
  })

  it('isLocked is a boolean (maps to IdentityCard "locked" prop)', () => {
    const identity = generateIdentity()
    expect(typeof identity.isLocked).toBe('boolean')
  })

  it('adapter fetchIdentity() returns same shape as generateIdentity()', async () => {
    const adapterResult: HostIdentity = await fetchIdentity()

    expect(adapterResult).toHaveProperty('nodeId')
    expect(adapterResult).toHaveProperty('publicKey')
    expect(adapterResult).toHaveProperty('address')
    expect(adapterResult).toHaveProperty('createdAt')
    expect(adapterResult).toHaveProperty('isLocked')

    expect(typeof adapterResult.nodeId).toBe('string')
    expect(typeof adapterResult.publicKey).toBe('string')
    expect(typeof adapterResult.address).toBe('string')
    expect(typeof adapterResult.createdAt).toBe('string')
    expect(typeof adapterResult.isLocked).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// EconomyDashboard Data Contract
// ---------------------------------------------------------------------------

describe('EconomyDashboard data contract', () => {
  /**
   * The EconomyDashboard UI component renders these fields:
   *   - newBBalance:       primary balance display
   *   - simBalance:        secondary SIM credit display
   *   - pooPriorityScore:  mapped from pooScore, 0-100 gauge
   *   - halvingEpoch:      current epoch number
   *   - halvingProgress:   0-100 progress bar
   *   - totalMined:        cumulative mining stat
   *   - verifiedOutcomes:  mapped from pooVerified
   *   - rejectedOutcomes:  mapped from pooRejected
   *
   * The EconomyStatus type uses camelCase field names (pooScore, pooVerified,
   * pooRejected) which the UI maps to its display props.
   */

  it('getEconomyStatus() returns all fields required by EconomyDashboard', () => {
    const state = createEconomyState()
    const status: EconomyStatus = getEconomyStatus(state)

    // Required fields (using EconomyStatus property names)
    expect(status).toHaveProperty('newbBalance')      // -> newBBalance
    expect(status).toHaveProperty('simBalance')
    expect(status).toHaveProperty('pooScore')          // -> pooPriorityScore
    expect(status).toHaveProperty('halvingEpoch')
    expect(status).toHaveProperty('halvingProgress')
    expect(status).toHaveProperty('totalMined')
    expect(status).toHaveProperty('pooVerified')       // -> verifiedOutcomes
    expect(status).toHaveProperty('pooRejected')       // -> rejectedOutcomes
  })

  it('all fields are numeric types', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)

    expect(typeof status.newbBalance).toBe('number')
    expect(typeof status.simBalance).toBe('number')
    expect(typeof status.pooScore).toBe('number')
    expect(typeof status.halvingEpoch).toBe('number')
    expect(typeof status.halvingProgress).toBe('number')
    expect(typeof status.totalMined).toBe('number')
    expect(typeof status.pooVerified).toBe('number')
    expect(typeof status.pooRejected).toBe('number')
  })

  it('pooScore is within 0-100 range for UI gauge', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)

    expect(status.pooScore).toBeGreaterThanOrEqual(0)
    expect(status.pooScore).toBeLessThanOrEqual(100)
  })

  it('halvingProgress is within 0-100 range for UI progress bar', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)

    expect(status.halvingProgress).toBeGreaterThanOrEqual(0)
    expect(status.halvingProgress).toBeLessThanOrEqual(100)
  })

  it('newbBalance reflects genesis amount on fresh state', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)

    expect(status.newbBalance).toBe(100)
  })

  it('pooVerified increments with issued rewards', () => {
    let state = createEconomyState()
    for (let i = 0; i < 3; i++) {
      const result = issueReward(state, `task-${i}`)
      if (!result.ok) throw new Error(result.error)
      state = result.value.state
    }

    const status = getEconomyStatus(state)
    expect(status.pooVerified).toBe(3)
  })

  it('adapter fetchNewBBalance() returns same shape as getEconomyStatus()', async () => {
    const adapterResult: EconomyStatus = await fetchNewBBalance()

    expect(adapterResult).toHaveProperty('newbBalance')
    expect(adapterResult).toHaveProperty('simBalance')
    expect(adapterResult).toHaveProperty('pooScore')
    expect(adapterResult).toHaveProperty('halvingEpoch')
    expect(adapterResult).toHaveProperty('halvingProgress')
    expect(adapterResult).toHaveProperty('totalMined')
    expect(adapterResult).toHaveProperty('pooVerified')
    expect(adapterResult).toHaveProperty('pooRejected')

    expect(typeof adapterResult.newbBalance).toBe('number')
    expect(typeof adapterResult.simBalance).toBe('number')
    expect(typeof adapterResult.pooScore).toBe('number')
    expect(typeof adapterResult.halvingEpoch).toBe('number')
    expect(typeof adapterResult.halvingProgress).toBe('number')
    expect(typeof adapterResult.totalMined).toBe('number')
    expect(typeof adapterResult.pooVerified).toBe('number')
    expect(typeof adapterResult.pooRejected).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// Cross-module data flow integrity
// ---------------------------------------------------------------------------

describe('Cross-module data flow', () => {
  it('generateIdentity shape satisfies HostIdentity type contract', () => {
    const identity = generateIdentity()
    // Exhaustive key check against HostIdentity interface
    const expectedKeys: Array<keyof HostIdentity> = [
      'nodeId',
      'publicKey',
      'address',
      'createdAt',
      'isLocked',
    ]

    for (const key of expectedKeys) {
      expect(identity).toHaveProperty(key)
      expect(identity[key]).toBeDefined()
    }
  })

  it('getEconomyStatus shape satisfies EconomyStatus type contract', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)

    const expectedKeys: Array<keyof EconomyStatus> = [
      'newbBalance',
      'simBalance',
      'halvingEpoch',
      'halvingProgress',
      'totalMined',
      'pooScore',
      'pooVerified',
      'pooRejected',
    ]

    for (const key of expectedKeys) {
      expect(status).toHaveProperty(key)
      expect(status[key]).toBeDefined()
      expect(typeof status[key]).toBe('number')
    }
  })

  it('no extra unexpected properties in identity output', () => {
    const identity = generateIdentity()
    const keys = Object.keys(identity)
    // HostIdentity has exactly 5 properties
    expect(keys).toHaveLength(5)
    expect(keys).toContain('nodeId')
    expect(keys).toContain('publicKey')
    expect(keys).toContain('address')
    expect(keys).toContain('createdAt')
    expect(keys).toContain('isLocked')
  })

  it('no extra unexpected properties in economy status output', () => {
    const state = createEconomyState()
    const status = getEconomyStatus(state)
    const keys = Object.keys(status)
    // EconomyStatus has exactly 8 properties
    expect(keys).toHaveLength(8)
    expect(keys).toContain('newbBalance')
    expect(keys).toContain('simBalance')
    expect(keys).toContain('halvingEpoch')
    expect(keys).toContain('halvingProgress')
    expect(keys).toContain('totalMined')
    expect(keys).toContain('pooScore')
    expect(keys).toContain('pooVerified')
    expect(keys).toContain('pooRejected')
  })
})
