import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import type { GovernanceLedgers } from '@/types/v6'
import { createEmptyLedgers, addEvidence, addDebt, addTemporalEntry } from '@/lib/v6/ledger'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  exportAsFiles,
  importFromFiles,
  entropyGC,
  saveGovernanceToDisk,
  loadGovernanceFromDisk,
  setStorageOverride,
  computeChecksum,
  computeHMAC,
} from '@/lib/v6/governance-persistence'

// ---------------------------------------------------------------------------
// In-memory Storage mock (Node.js v22+ globalThis.localStorage lacks methods)
// ---------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number { return this.store.size }

  clear(): void { this.store.clear() }

  getItem(key: string): string | null { return this.store.get(key) ?? null }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] ?? null
  }

  removeItem(key: string): void { this.store.delete(key) }

  setItem(key: string, value: string): void { this.store.set(key, value) }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ledger with representative data across all ledger types. */
function buildPopulatedLedgers(): GovernanceLedgers {
  let ledgers = createEmptyLedgers()

  // Evidence
  ledgers = addEvidence(ledgers, 'Test conclusion 1', 'unit-test', 'H1', 'ai1-expander', 'task-1', ['tag-a'])
  ledgers = addEvidence(ledgers, 'Test conclusion 2', 'unit-test', 'H3', 'ai2-auditor', 'task-2', ['tag-b'])

  // Debt
  ledgers = addDebt(ledgers, 'tech-debt', 'Some deferred work', 'medium', 'task-1', '2026-05-01')

  // Temporal
  const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  ledgers = addTemporalEntry(ledgers, 'ev-1', past, future, '7d', [])

  return ledgers
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Governance Persistence', () => {
  const memStorage = new MemoryStorage()

  beforeEach(() => {
    memStorage.clear()
    setStorageOverride(memStorage)
  })

  afterAll(() => {
    setStorageOverride(null)
  })

  // -------------------------------------------------------------------------
  // 1. localStorage round-trip
  // -------------------------------------------------------------------------

  describe('localStorage persistence', () => {
    it('saves and loads ledgers with identical data', () => {
      const original = buildPopulatedLedgers()
      saveToLocalStorage(original)

      const loaded = loadFromLocalStorage()
      expect(loaded).not.toBeNull()

      expect(loaded!.evidence).toHaveLength(original.evidence.length)
      expect(loaded!.debt).toHaveLength(original.debt.length)
      expect(loaded!.temporal).toHaveLength(original.temporal.length)
      expect(loaded!.evidence[0].conclusion).toBe(original.evidence[0].conclusion)
      expect(loaded!.evidence[0].grade).toBe(original.evidence[0].grade)
    })

    it('returns null when no data has been saved', () => {
      const loaded = loadFromLocalStorage()
      expect(loaded).toBeNull()
    })

    it('clearLocalStorage removes all persisted data', () => {
      const original = buildPopulatedLedgers()
      saveToLocalStorage(original)
      expect(loadFromLocalStorage()).not.toBeNull()

      clearLocalStorage()
      expect(loadFromLocalStorage()).toBeNull()
    })

    it('handles empty ledgers correctly', () => {
      const empty = createEmptyLedgers()
      saveToLocalStorage(empty)

      const loaded = loadFromLocalStorage()
      // Empty arrays are still valid -- version marker means we stored something
      // but all arrays are empty, so foundAny will be false
      // Actually the empty arrays serialize to '[]' which parses back fine.
      // The foundAny check: JSON.parse('[]') is a valid array,
      // and raw is the string '[]' which is truthy. So foundAny = true.
      expect(loaded).not.toBeNull()
      expect(loaded!.evidence).toHaveLength(0)
      expect(loaded!.debt).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // 1b. Integrity checksum
  // -------------------------------------------------------------------------

  describe('integrity checksum', () => {
    it('computeChecksum returns consistent values', () => {
      const data = '{"test": true}'
      expect(computeChecksum(data)).toBe(computeChecksum(data))
    })

    it('computeChecksum returns different values for different inputs', () => {
      expect(computeChecksum('aaa')).not.toBe(computeChecksum('bbb'))
    })

    it('detects tampered localStorage data and returns null for that entry', () => {
      const original = buildPopulatedLedgers()
      saveToLocalStorage(original)

      // Tamper with the evidence entry in localStorage
      const storageKey = 'newclaw:governance:evidence'
      const raw = memStorage.getItem(storageKey)!
      const envelope = JSON.parse(raw)
      envelope.data = '[{"conclusion":"HACKED","grade":"H1"}]'
      // Keep old checksum (now mismatched)
      memStorage.setItem(storageKey, JSON.stringify(envelope))

      // Suppress console.warn during test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const loaded = loadFromLocalStorage()

      // Evidence should be empty (tampered), but other ledgers should load fine
      expect(loaded).not.toBeNull()
      expect(loaded!.evidence).toHaveLength(0) // integrity check failed
      expect(loaded!.debt).toHaveLength(original.debt.length) // untampered

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('integrity check failed for "evidence"'),
      )
      warnSpy.mockRestore()
    })

    it('stored envelope has data and checksum fields', () => {
      const original = buildPopulatedLedgers()
      saveToLocalStorage(original)

      const raw = memStorage.getItem('newclaw:governance:evidence')!
      const envelope = JSON.parse(raw)
      expect(envelope).toHaveProperty('data')
      expect(envelope).toHaveProperty('checksum')
      expect(typeof envelope.data).toBe('string')
      expect(typeof envelope.checksum).toBe('string')
    })

    it('checksum matches on valid round-trip', () => {
      const original = buildPopulatedLedgers()
      saveToLocalStorage(original)

      const raw = memStorage.getItem('newclaw:governance:evidence')!
      const envelope = JSON.parse(raw)
      expect(computeChecksum(envelope.data)).toBe(envelope.checksum)
    })
  })

  // -------------------------------------------------------------------------
  // 1c. computeHMAC
  // -------------------------------------------------------------------------

  describe('computeHMAC', () => {
    it('returns consistent values for same data and key', () => {
      const data = '{"balance": 100}'
      const key = 'secret-key'
      expect(computeHMAC(data, key)).toBe(computeHMAC(data, key))
    })

    it('returns different values for different keys', () => {
      const data = '{"balance": 100}'
      expect(computeHMAC(data, 'key-a')).not.toBe(computeHMAC(data, 'key-b'))
    })

    it('returns different values for different data with same key', () => {
      const key = 'shared-key'
      expect(computeHMAC('aaa', key)).not.toBe(computeHMAC('bbb', key))
    })

    it('differs from plain checksum (key matters)', () => {
      const data = '{"balance": 100}'
      const hmac = computeHMAC(data, 'my-secret')
      const checksum = computeChecksum(data)
      expect(hmac).not.toBe(checksum)
    })

    it('handles empty data', () => {
      const result = computeHMAC('', 'key')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles empty key', () => {
      const result = computeHMAC('data', '')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles very long keys (truncated internally)', () => {
      const longKey = 'a'.repeat(200)
      const result = computeHMAC('data', longKey)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns a hex string', () => {
      const result = computeHMAC('test-data', 'test-key')
      // computeChecksum returns hex (possibly with leading minus for negative)
      expect(result).toMatch(/^-?[0-9a-f]+$/)
    })
  })

  // -------------------------------------------------------------------------
  // 2. exportAsFiles / importFromFiles round-trip
  // -------------------------------------------------------------------------

  describe('file export and import', () => {
    it('exports all 6 canonical files', () => {
      const ledgers = buildPopulatedLedgers()
      const files = exportAsFiles(ledgers)

      expect(Object.keys(files)).toHaveLength(6)
      expect(files).toHaveProperty('EVIDENCE.jsonl')
      expect(files).toHaveProperty('VALUE.json')
      expect(files).toHaveProperty('DEBT.json')
      expect(files).toHaveProperty('TEMPORAL.json')
      expect(files).toHaveProperty('CASELAW.json')
      expect(files).toHaveProperty('LEDGER_LOCAL.jsonl')
    })

    it('EVIDENCE.jsonl uses newline-delimited JSON format', () => {
      const ledgers = buildPopulatedLedgers()
      const files = exportAsFiles(ledgers)
      const lines = files['EVIDENCE.jsonl'].trim().split('\n')

      expect(lines).toHaveLength(2) // two evidence entries
      // Each line should be valid JSON
      for (const line of lines) {
        expect(() => JSON.parse(line)).not.toThrow()
      }
    })

    it('VALUE.json uses pretty-printed JSON array format', () => {
      const ledgers = buildPopulatedLedgers()
      const files = exportAsFiles(ledgers)

      const parsed = JSON.parse(files['VALUE.json'])
      expect(Array.isArray(parsed)).toBe(true)
    })

    it('round-trips export -> import with data integrity', () => {
      const original = buildPopulatedLedgers()
      const files = exportAsFiles(original)
      const restored = importFromFiles(files)

      expect(restored.evidence).toHaveLength(original.evidence.length)
      expect(restored.debt).toHaveLength(original.debt.length)
      expect(restored.temporal).toHaveLength(original.temporal.length)
      expect(restored.evidence[0].conclusion).toBe(original.evidence[0].conclusion)
      expect(restored.debt[0].description).toBe(original.debt[0].description)
    })

    it('importFromFiles handles missing files gracefully', () => {
      const partial: Record<string, string> = {
        'EVIDENCE.jsonl': JSON.stringify({ conclusion: 'test', grade: 'H1' }) + '\n',
      }
      const ledgers = importFromFiles(partial)

      expect(ledgers.evidence).toHaveLength(1)
      expect(ledgers.debt).toHaveLength(0)
      expect(ledgers.value).toHaveLength(0)
    })

    it('importFromFiles handles invalid JSON gracefully', () => {
      const corrupt: Record<string, string> = {
        'EVIDENCE.jsonl': 'not valid json at all',
        'VALUE.json': '[{"taskId": "ok"}]',
      }
      const ledgers = importFromFiles(corrupt)

      // Evidence should be empty (invalid JSONL)
      expect(ledgers.evidence).toHaveLength(0)
      // Value should parse correctly
      expect(ledgers.value).toHaveLength(1)
    })
  })

  // -------------------------------------------------------------------------
  // 3. Entropy GC
  // -------------------------------------------------------------------------

  describe('entropyGC', () => {
    it('removes expired temporal entries beyond maxAge', () => {
      let ledgers = createEmptyLedgers()

      const longPast = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const expired = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()

      // Entry 1: expired 10 days ago (beyond 7-day default maxAge)
      ledgers = addTemporalEntry(ledgers, 'ev-old', longPast, expired, '7d', [])
      // Entry 2: expires in the future (should survive)
      ledgers = addTemporalEntry(ledgers, 'ev-new', longPast, future, '7d', [])

      expect(ledgers.temporal).toHaveLength(2)

      const cleaned = entropyGC(ledgers)
      expect(cleaned.temporal).toHaveLength(1)
      expect(cleaned.temporal[0].conclusionId).toBe('ev-new')
    })

    it('removes expired evidence entries beyond maxAge', () => {
      let ledgers = createEmptyLedgers()

      const oldExpiry = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      ledgers = addEvidence(ledgers, 'Old conclusion', 'test', 'H4', 'ai1-expander', 'task-old', [], oldExpiry)
      ledgers = addEvidence(ledgers, 'Permanent conclusion', 'test', 'H1', 'ai1-expander', 'task-perm', [])

      expect(ledgers.evidence).toHaveLength(2)

      const cleaned = entropyGC(ledgers)
      expect(cleaned.evidence).toHaveLength(1)
      expect(cleaned.evidence[0].conclusion).toBe('Permanent conclusion')
    })

    it('preserves evidence without expiresAt (permanent entries)', () => {
      let ledgers = createEmptyLedgers()
      ledgers = addEvidence(ledgers, 'Permanent', 'test', 'H1', 'ai1-expander', 'task-1', [])

      const cleaned = entropyGC(ledgers)
      expect(cleaned.evidence).toHaveLength(1)
    })

    it('does not modify debt, value, caseLaw, or localLedger', () => {
      const ledgers = buildPopulatedLedgers()
      const cleaned = entropyGC(ledgers)

      expect(cleaned.debt).toEqual(ledgers.debt)
      expect(cleaned.value).toEqual(ledgers.value)
      expect(cleaned.caseLaw).toEqual(ledgers.caseLaw)
      expect(cleaned.localLedger).toEqual(ledgers.localLedger)
    })

    it('respects custom maxAge parameter', () => {
      let ledgers = createEmptyLedgers()

      // Temporal entry that expired 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ledgers = addTemporalEntry(ledgers, 'ev-recent', past, twoDaysAgo, '7d', [])

      // With default 7-day maxAge, the entry expired 2 days ago but cutoff is 7 days
      // so (now - 7d) is 7 days ago. The entry expired 2 days ago, which is > cutoff.
      // => should be kept
      const withDefault = entropyGC(ledgers)
      expect(withDefault.temporal).toHaveLength(1)

      // With 1-day maxAge, cutoff is 1 day ago. Entry expired 2 days ago < cutoff.
      // => should be removed
      const withShort = entropyGC(ledgers, 1 * 24 * 60 * 60 * 1000)
      expect(withShort.temporal).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // 4. Disk persistence (stub / signature tests)
  // -------------------------------------------------------------------------

  describe('disk persistence stubs', () => {
    it('saveGovernanceToDisk returns file path mapping', () => {
      const ledgers = buildPopulatedLedgers()
      const result = saveGovernanceToDisk(ledgers, '/tmp/governance')

      expect(Object.keys(result).length).toBe(6)
      expect(result).toHaveProperty('/tmp/governance/EVIDENCE.jsonl')
      expect(result).toHaveProperty('/tmp/governance/VALUE.json')
    })

    it('loadGovernanceFromDisk returns empty ledgers in browser context', () => {
      const loaded = loadGovernanceFromDisk('/tmp/governance')
      expect(loaded.evidence).toHaveLength(0)
      expect(loaded.debt).toHaveLength(0)
      expect(loaded.temporal).toHaveLength(0)
    })
  })
})
