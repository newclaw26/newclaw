// ============================================================================
// Layer 2+: Governance Persistence Layer
// ============================================================================
//
// Adds FILE PERSISTENCE on top of the in-memory GovernanceLedgers
// defined in ledger.ts.
//
// Absorbs patterns from A-team GovernanceManager (electron/governance/index.ts):
//   - EVIDENCE.jsonl  -> evidence[]
//   - VALUE.json      -> value[]
//   - DEBT.md data    -> debt[]
//   - TEMPORAL.json   -> temporal[]
//   - CASELAW.md data -> caseLaw[]
//   - LEDGER_LOCAL.jsonl -> localLedger[]
//
// Browser MVP: localStorage as "disk" simulation.
// Future: real file I/O via Electron IPC or download API.
// ============================================================================

import type { GovernanceLedgers, TemporalEntry, EvidenceEntry } from '@/types/v6'
import { createEmptyLedgers } from '@/lib/v6/ledger'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = 'newclaw:governance:'

/**
 * Get a working localStorage implementation.
 *
 * Node.js v22+ exposes a global `localStorage` stub that lacks `setItem`
 * and `getItem` methods, which can shadow jsdom's fully functional
 * implementation in vitest/jsdom environments. This helper validates
 * that the storage object actually has the required methods.
 *
 * Allows injection via `_storageOverride` for testing in environments
 * where neither browser nor jsdom localStorage is available.
 */
let _storageOverride: Storage | null = null

/** Inject a custom Storage implementation (for testing). */
export function setStorageOverride(storage: Storage | null): void {
  _storageOverride = storage
}

function getStorage(): Storage | null {
  if (_storageOverride) return _storageOverride

  try {
    if (typeof window !== 'undefined' && window.localStorage &&
        typeof window.localStorage.setItem === 'function') {
      return window.localStorage
    }
  } catch {
    // SSR or restricted context
  }

  // Fallback: check bare global (works in real browsers)
  try {
    if (typeof localStorage !== 'undefined' &&
        typeof localStorage.setItem === 'function') {
      return localStorage
    }
  } catch {
    // Not available
  }

  return null
}

// ---------------------------------------------------------------------------
// Integrity Checksum
// ---------------------------------------------------------------------------

/**
 * Compute a simple hash checksum for tamper detection on localStorage data.
 * Not cryptographic — just catches accidental corruption or casual DevTools edits.
 */
export function computeChecksum(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0
  }
  return hash.toString(16)
}

/**
 * Compute a keyed HMAC-like hash for integrity verification.
 *
 * This is a synchronous simulation of HMAC using the djb2-variant hash
 * with a secret key mixed in. It follows the HMAC construction:
 *   HMAC(key, data) = H((key XOR opad) || H((key XOR ipad) || data))
 * where H is the djb2 hash, ipad = 0x36, opad = 0x5c.
 *
 * NOT cryptographically secure — production should upgrade to
 * Web Crypto API HMAC-SHA256 (async). Sufficient for MVP tamper detection
 * against casual DevTools edits and accidental corruption.
 */
export function computeHMAC(data: string, key: string): string {
  // Pad or truncate key to 64 chars
  const blockSize = 64
  let keyPadded = key
  if (keyPadded.length > blockSize) {
    keyPadded = computeChecksum(keyPadded)
  }
  keyPadded = keyPadded.padEnd(blockSize, '\0')

  // Build inner and outer padded keys
  let innerInput = ''
  let outerPrefix = ''
  for (let i = 0; i < blockSize; i++) {
    const keyByte = keyPadded.charCodeAt(i)
    innerInput += String.fromCharCode(keyByte ^ 0x36)
    outerPrefix += String.fromCharCode(keyByte ^ 0x5c)
  }

  // Inner hash: H(ipad_key || data)
  const innerHash = computeChecksum(innerInput + data)

  // Outer hash: H(opad_key || inner_hash)
  const outerHash = computeChecksum(outerPrefix + innerHash)

  return outerHash
}

/** Canonical file names for each ledger type (mirrors A-team file layout). */
const LEDGER_FILES: Record<keyof GovernanceLedgers, string> = {
  evidence: 'EVIDENCE.jsonl',
  value: 'VALUE.json',
  debt: 'DEBT.json',
  temporal: 'TEMPORAL.json',
  caseLaw: 'CASELAW.json',
  localLedger: 'LEDGER_LOCAL.jsonl',
}

// ---------------------------------------------------------------------------
// Disk Persistence (Node.js / Electron — future use)
// ---------------------------------------------------------------------------

/**
 * Save all governance ledgers to disk as individual files.
 *
 * Designed for Electron main-process context where `fs` is available.
 * Each ledger is serialized to its canonical file.
 *
 * @param ledgers  - The current in-memory governance ledgers.
 * @param basePath - Directory path to write governance files into.
 *
 * NOTE: In browser context this is a no-op. Use saveToLocalStorage() instead.
 * This function signature exists so A-team can wire it to real fs calls
 * via IPC without changing the interface.
 */
export function saveGovernanceToDisk(
  ledgers: GovernanceLedgers,
  basePath: string,
): Record<string, string> {
  const files: Record<string, string> = {}

  for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
    const filename = LEDGER_FILES[key]
    const filepath = `${basePath}/${filename}`
    const content = serializeLedger(key, ledgers[key])
    files[filepath] = content
  }

  return files
}

/**
 * Load governance ledgers from disk files.
 *
 * Designed for Electron main-process context where `fs` is available.
 * Returns empty ledgers if files are missing.
 *
 * @param basePath - Directory path containing governance files.
 *
 * NOTE: In browser context this returns empty ledgers.
 * Use loadFromLocalStorage() instead for browser persistence.
 */
export function loadGovernanceFromDisk(basePath: string): GovernanceLedgers {
  // Browser context: return empty ledgers (no fs access).
  // A-team will replace with real fs.readFileSync calls.
  void basePath
  return createEmptyLedgers()
}

// ---------------------------------------------------------------------------
// LocalStorage Persistence (Browser MVP)
// ---------------------------------------------------------------------------

/**
 * Save all governance ledgers to localStorage.
 *
 * Each ledger type is stored under its own key to allow
 * granular reads and partial updates.
 */
export function saveToLocalStorage(ledgers: GovernanceLedgers): void {
  const storage = getStorage()
  if (!storage) return

  try {
    for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
      const storageKey = STORAGE_KEY_PREFIX + key
      const data = JSON.stringify(ledgers[key])
      const envelope = JSON.stringify({ data, checksum: computeChecksum(data) })
      storage.setItem(storageKey, envelope)
    }
    // Also store a version marker for migration safety
    storage.setItem(STORAGE_KEY_PREFIX + '_version', '1')
  } catch {
    // localStorage may be unavailable or full -- fail silently
  }
}

/**
 * Load governance ledgers from localStorage.
 *
 * Returns null if no governance data has been persisted yet.
 * Returns partial data merged with empty defaults if only some
 * ledger types are present.
 */
export function loadFromLocalStorage(): GovernanceLedgers | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const version = storage.getItem(STORAGE_KEY_PREFIX + '_version')
    if (!version) return null

    const ledgers = createEmptyLedgers()
    let foundAny = false

    for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
      const storageKey = STORAGE_KEY_PREFIX + key
      const raw = storage.getItem(storageKey)
      if (raw) {
        // Parse the integrity envelope
        let data: string
        try {
          const envelope = JSON.parse(raw) as { data?: string; checksum?: string }
          if (envelope && typeof envelope.data === 'string' && typeof envelope.checksum === 'string') {
            // Verify checksum
            if (computeChecksum(envelope.data) !== envelope.checksum) {
              console.warn(`[governance] integrity check failed for "${key}" — data may be tampered`)
              continue // skip corrupted entry, leave as empty array
            }
            data = envelope.data
          } else {
            // Legacy format (pre-checksum): accept raw JSON but log warning
            console.warn(`[governance] legacy format detected for "${key}" — no integrity envelope`)
            data = raw
          }
        } catch {
          // Not valid JSON envelope — treat as legacy raw data
          console.warn(`[governance] legacy format detected for "${key}" — no integrity envelope`)
          data = raw
        }

        foundAny = true
        ;(ledgers[key] as unknown[]) = JSON.parse(data)
      }
    }

    return foundAny ? ledgers : null
  } catch {
    return null
  }
}

/**
 * Clear all governance data from localStorage.
 */
export function clearLocalStorage(): void {
  const storage = getStorage()
  if (!storage) return

  try {
    for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
      storage.removeItem(STORAGE_KEY_PREFIX + key)
    }
    storage.removeItem(STORAGE_KEY_PREFIX + '_version')
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// File Export (for download / future real file persistence)
// ---------------------------------------------------------------------------

/**
 * Export all governance ledgers as a filename -> content mapping.
 *
 * Returns a Record where keys are canonical filenames (EVIDENCE.jsonl, etc.)
 * and values are the serialized content ready to be written to disk or
 * offered as a browser download.
 *
 * JSONL files (evidence, localLedger) use newline-delimited JSON.
 * JSON files (value, debt, temporal, caseLaw) use pretty-printed JSON.
 */
export function exportAsFiles(ledgers: GovernanceLedgers): Record<string, string> {
  const files: Record<string, string> = {}

  for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
    const filename = LEDGER_FILES[key]
    files[filename] = serializeLedger(key, ledgers[key])
  }

  return files
}

/**
 * Import governance ledgers from a filename -> content mapping.
 *
 * Inverse of exportAsFiles(). Parses each file and assembles
 * a GovernanceLedgers object.
 *
 * Missing files are filled with empty arrays.
 * Invalid JSON in any file causes that ledger to be empty (not throw).
 */
export function importFromFiles(files: Record<string, string>): GovernanceLedgers {
  const ledgers = createEmptyLedgers()

  for (const key of Object.keys(LEDGER_FILES) as Array<keyof GovernanceLedgers>) {
    const filename = LEDGER_FILES[key]
    const content = files[filename]
    if (!content) continue

    try {
      ;(ledgers[key] as unknown[]) = deserializeLedger(key, content)
    } catch {
      // Invalid content -- leave as empty array
    }
  }

  return ledgers
}

// ---------------------------------------------------------------------------
// Entropy-Reduction Garbage Collection
// ---------------------------------------------------------------------------

/**
 * Entropy-reduction GC: removes expired temporal entries and compresses
 * old evidence that has passed its expiration date.
 *
 * Mirrors A-team GovernanceManager.runEntropyGC() but operates on
 * the in-memory ledger structure.
 *
 * @param ledgers - Current governance ledgers (immutable input).
 * @param maxAgeMs - Maximum age in milliseconds for temporal entries.
 *                   Defaults to 7 days (604800000 ms), matching A-team behavior.
 * @returns New GovernanceLedgers with expired entries removed/compressed.
 */
export function entropyGC(
  ledgers: GovernanceLedgers,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000,
): GovernanceLedgers {
  const cutoff = Date.now() - maxAgeMs

  // 1. Remove expired temporal entries
  const activeTemporals = ledgers.temporal.filter((t: TemporalEntry) => {
    const expiresTime = new Date(t.expiresAt).getTime()
    // Keep entries that haven't expired yet, or expired recently (within maxAge)
    return expiresTime > cutoff
  })

  // 2. Compress expired evidence entries
  //    - Keep entries that are still active (no expiresAt or not yet expired)
  //    - Remove entries whose expiresAt is older than the cutoff
  const activeEvidence = ledgers.evidence.filter((e: EvidenceEntry) => {
    if (!e.expiresAt) return true // no expiry = permanent
    return new Date(e.expiresAt).getTime() > cutoff
  })

  // 3. Value, debt, caseLaw, localLedger are permanent records -- no GC

  return {
    ...ledgers,
    evidence: activeEvidence,
    temporal: activeTemporals,
  }
}

// ---------------------------------------------------------------------------
// Internal Serialization Helpers
// ---------------------------------------------------------------------------

/**
 * Serialize a single ledger type to its file format.
 * JSONL types get newline-delimited JSON; others get pretty JSON.
 */
function serializeLedger(key: keyof GovernanceLedgers, entries: unknown[]): string {
  const isJsonl = key === 'evidence' || key === 'localLedger'
  if (isJsonl) {
    return entries.map(e => JSON.stringify(e)).join('\n') + (entries.length > 0 ? '\n' : '')
  }
  return JSON.stringify(entries, null, 2)
}

/**
 * Deserialize file content back to an array of entries.
 * Handles both JSONL (newline-delimited) and regular JSON array formats.
 */
function deserializeLedger(key: keyof GovernanceLedgers, content: string): unknown[] {
  const isJsonl = key === 'evidence' || key === 'localLedger'
  if (isJsonl) {
    const lines = content.trim().split('\n').filter(l => l.trim().length > 0)
    return lines.map(line => JSON.parse(line))
  }
  return JSON.parse(content)
}
