// ============================================================================
// NewClaw V6 - New.B Economy Engine (Browser-Compatible)
//
// Ported from A-team NewBEngine (class-based, Node.js fs/crypto)
// to B-team functional style (pure functions, localStorage persistence).
//
// Implements Section 4 of NewClaw v6.0 Spec:
//   - Genesis activation (100 New.B)
//   - PoO mining rewards with deflationary halving
//   - Spend / receive transfers
//   - Priority Score (PoO score) calculation
//   - Halving epoch tracking
//
// HMAC integrity verification (C-04) — implemented with synchronous
// djb2-based HMAC simulation. Production should upgrade to Web Crypto API
// HMAC-SHA256 (see governance-persistence.ts computeHMAC docs).
// ============================================================================

import type { EconomyStatus } from '@/types/v6'
import { computeHMAC } from '@/lib/v6/governance-persistence'

// ─── Constants (mirrored from A-team NewBEngine) ────────────────────────────

const GENESIS_BALANCE = 100
const INITIAL_REWARD_RATE = 10
const HALVING_INTERVAL = 100 // rewards halve every 100 issued rewards
const MINIMUM_REWARD = 0.01
const STORAGE_KEY = 'newclaw:economy:state'

/**
 * [H-02] Security fix: hard cap on any single incoming amount to prevent
 * unbounded inflation via receive() or issueReward(). Any transaction
 * exceeding this limit is rejected.
 */
const MAX_SINGLE_AMOUNT = 10_000

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EconomyTransaction {
  id: string
  timestamp: string
  type: 'genesis' | 'poo_reward' | 'spend' | 'receive'
  amount: number
  balance: number
  description: string
  reference?: string
}

export interface MiningConfig {
  baseReward: number
  halvingInterval: number
  minimumReward: number
  rewardsIssuedThisEpoch: number
  totalRewardsIssued: number
}

export interface EconomyState {
  balance: number
  totalEarned: number
  totalSpent: number
  halvingEpoch: number
  currentRewardRate: number
  mining: MiningConfig
  transactions: EconomyTransaction[]
  createdAt: string
  lastUpdated: string
}

export interface HalvingInfo {
  epoch: number
  progress: number            // 0-100 percent toward next halving
  rewardsUntilNextHalving: number
  currentRewardRate: number
  nextRewardRate: number      // what reward becomes after next halving
}

export type EconomyResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateTxId(): string {
  return `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function timestamp(): string {
  return new Date().toISOString()
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Create a fresh economy state with genesis balance (100 New.B).
 */
export function createEconomyState(): EconomyState {
  const now = timestamp()
  const genesisTx: EconomyTransaction = {
    id: `TX-GENESIS-${Date.now()}`,
    timestamp: now,
    type: 'genesis',
    amount: GENESIS_BALANCE,
    balance: GENESIS_BALANCE,
    description: 'Genesis activation reward — welcome to the swarm',
  }

  return {
    balance: GENESIS_BALANCE,
    totalEarned: GENESIS_BALANCE,
    totalSpent: 0,
    halvingEpoch: 0,
    currentRewardRate: INITIAL_REWARD_RATE,
    mining: {
      baseReward: INITIAL_REWARD_RATE,
      halvingInterval: HALVING_INTERVAL,
      minimumReward: MINIMUM_REWARD,
      rewardsIssuedThisEpoch: 0,
      totalRewardsIssued: 0,
    },
    transactions: [genesisTx],
    createdAt: now,
    lastUpdated: now,
  }
}

/**
 * Issue a Proof-of-Outcome reward. Applies halving automatically when the
 * epoch threshold is crossed.
 *
 * The `amount` parameter is informational only for the transaction log; the
 * actual reward is determined by the current mining config reward rate
 * (matching A-team behavior where the rate is authoritative).
 */
export function issueReward(
  state: EconomyState,
  taskId: string,
  _amount?: number,
): EconomyResult<{ state: EconomyState; transaction: EconomyTransaction }> {
  // [H-02] Cap check: reject if current reward rate exceeds safety limit
  if (state.mining.baseReward > MAX_SINGLE_AMOUNT) {
    return { ok: false, error: `Reward rate ${state.mining.baseReward} exceeds maximum allowed amount of ${MAX_SINGLE_AMOUNT}` }
  }

  const mining = { ...state.mining }

  // Increment counters
  mining.rewardsIssuedThisEpoch++
  mining.totalRewardsIssued++

  let halvingEpoch = state.halvingEpoch
  let currentRewardRate = state.currentRewardRate

  // Check halving threshold
  if (mining.rewardsIssuedThisEpoch >= mining.halvingInterval) {
    mining.rewardsIssuedThisEpoch = 0
    mining.baseReward = Math.max(mining.minimumReward, mining.baseReward / 2)
    halvingEpoch++
    currentRewardRate = mining.baseReward
  }

  const reward = mining.baseReward
  const newBalance = state.balance + reward
  const now = timestamp()

  const tx: EconomyTransaction = {
    id: generateTxId(),
    timestamp: now,
    type: 'poo_reward',
    amount: reward,
    balance: newBalance,
    description: `PoO reward for task ${taskId}`,
    reference: taskId,
  }

  const newState: EconomyState = {
    ...state,
    balance: newBalance,
    totalEarned: state.totalEarned + reward,
    halvingEpoch,
    currentRewardRate,
    mining,
    transactions: [...state.transactions, tx],
    lastUpdated: now,
  }

  return { ok: true, value: { state: newState, transaction: tx } }
}

/**
 * Spend (deduct) New.B from balance.
 */
export function spend(
  state: EconomyState,
  amount: number,
  description: string,
): EconomyResult<{ state: EconomyState; transaction: EconomyTransaction }> {
  if (amount <= 0) {
    return { ok: false, error: 'Spend amount must be positive' }
  }
  if (state.balance < amount) {
    return { ok: false, error: `Insufficient balance: have ${state.balance}, need ${amount}` }
  }

  const newBalance = state.balance - amount
  const now = timestamp()

  const tx: EconomyTransaction = {
    id: generateTxId(),
    timestamp: now,
    type: 'spend',
    amount: -amount,
    balance: newBalance,
    description,
  }

  const newState: EconomyState = {
    ...state,
    balance: newBalance,
    totalSpent: state.totalSpent + amount,
    transactions: [...state.transactions, tx],
    lastUpdated: now,
  }

  return { ok: true, value: { state: newState, transaction: tx } }
}

/**
 * Receive New.B from an external source.
 */
export function receive(
  state: EconomyState,
  amount: number,
  source: string,
): EconomyResult<{ state: EconomyState; transaction: EconomyTransaction }> {
  if (amount <= 0) {
    return { ok: false, error: 'Receive amount must be positive' }
  }
  // [H-02] Cap check: reject amounts exceeding safety limit
  if (amount > MAX_SINGLE_AMOUNT) {
    return { ok: false, error: `Receive amount ${amount} exceeds maximum allowed amount of ${MAX_SINGLE_AMOUNT}` }
  }

  const newBalance = state.balance + amount
  const now = timestamp()

  const tx: EconomyTransaction = {
    id: generateTxId(),
    timestamp: now,
    type: 'receive',
    amount,
    balance: newBalance,
    description: `Received from ${source}`,
    reference: source,
  }

  const newState: EconomyState = {
    ...state,
    balance: newBalance,
    totalEarned: state.totalEarned + amount,
    transactions: [...state.transactions, tx],
    lastUpdated: now,
  }

  return { ok: true, value: { state: newState, transaction: tx } }
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Get halving schedule info: current epoch, progress toward next halving,
 * and projected next reward rate.
 */
export function getHalvingInfo(state: EconomyState): HalvingInfo {
  const { mining, halvingEpoch, currentRewardRate } = state
  const progress = (mining.rewardsIssuedThisEpoch / mining.halvingInterval) * 100
  const rewardsUntilNextHalving = mining.halvingInterval - mining.rewardsIssuedThisEpoch
  const nextRewardRate = Math.max(mining.minimumReward, currentRewardRate / 2)

  return {
    epoch: halvingEpoch,
    progress,
    rewardsUntilNextHalving,
    currentRewardRate,
    nextRewardRate,
  }
}

/**
 * Calculate the Proof-of-Outcome Priority Score.
 *
 * Formula from whitepaper Section 4.3:
 *   score = (verified / total) * 100 * (1 - rejected / total)
 *
 * Returns 0-100 clamped integer.
 */
export function calculatePooScore(
  verified: number,
  rejected: number,
  total: number,
): number {
  if (total <= 0) return 0
  const verifiedRatio = verified / total
  const penaltyFactor = 1 - (rejected / total)
  const raw = verifiedRatio * 100 * penaltyFactor
  return Math.max(0, Math.min(100, Math.round(raw)))
}

/**
 * Build the EconomyStatus shape consumed by the UI (matches @/types/v6).
 */
export function getEconomyStatus(state: EconomyState): EconomyStatus {
  const halvingInfo = getHalvingInfo(state)

  // Derive PoO stats from transaction history
  const pooTxs = state.transactions.filter(tx => tx.type === 'poo_reward')
  const pooVerified = pooTxs.length
  // In MVP we track rejections as zero since the engine only records
  // successful rewards. A future PoO verifier will feed rejected counts.
  const pooRejected = 0
  const totalTasks = pooVerified + pooRejected

  return {
    newbBalance: state.balance,
    simBalance: 0, // SIM ledger is separate — see ledger.ts getBalance()
    halvingEpoch: halvingInfo.epoch,
    halvingProgress: halvingInfo.progress,
    totalMined: state.totalEarned,
    pooScore: calculatePooScore(pooVerified, pooRejected, totalTasks),
    pooVerified,
    pooRejected,
  }
}

// ─── File Export / Import ───────────────────────────────────────────────────

/**
 * Export economy state as a JSON string for file persistence.
 *
 * Returns a pretty-printed JSON representation of the full economy state,
 * suitable for saving to disk or offering as a browser download.
 *
 * Mirrors governance-persistence.ts exportAsFiles() pattern but for
 * the single economy state object.
 */
export function exportEconomyAsFile(state: EconomyState): string {
  return JSON.stringify(state, null, 2)
}

/**
 * Import economy state from a JSON string (e.g. loaded from a file).
 *
 * Performs basic structural validation: the parsed object must have a
 * numeric `balance` field. Returns null if the JSON is malformed or
 * does not meet the minimum shape requirement.
 *
 * Mirrors governance-persistence.ts importFromFiles() error handling.
 */
export function importEconomyFromFile(json: string): EconomyState | null {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed.balance !== 'number') return null
    return parsed as EconomyState
  } catch {
    return null
  }
}

// ─── Persistence (localStorage with HMAC integrity) ────────────────────────

/**
 * Default HMAC key for economy state integrity verification.
 * In production, derive from node identity or inject via config.
 */
const ECONOMY_HMAC_KEY = 'newclaw:economy:v7-integrity-key'

/**
 * Save economy state to localStorage with HMAC integrity envelope.
 *
 * The persisted format is: { data: string, hmac: string }
 * where `hmac` is computed over `data` using a keyed HMAC simulation.
 */
export function saveEconomyState(state: EconomyState): void {
  try {
    const data = JSON.stringify(state)
    const hmac = computeHMAC(data, ECONOMY_HMAC_KEY)
    const envelope = JSON.stringify({ data, hmac })
    localStorage.setItem(STORAGE_KEY, envelope)
  } catch {
    // localStorage may be unavailable in SSR / tests — fail silently
  }
}

/**
 * Load economy state from localStorage with HMAC verification.
 *
 * Returns null if:
 *   - No state is persisted
 *   - HMAC verification fails (data tampered)
 *   - JSON parse fails
 *
 * On tamper detection, logs a warning and returns null so the caller
 * can fall back to creating fresh state.
 */
export function loadEconomyState(): EconomyState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    // Try to parse as HMAC envelope
    let data: string
    try {
      const envelope = JSON.parse(raw) as { data?: string; hmac?: string }
      if (envelope && typeof envelope.data === 'string' && typeof envelope.hmac === 'string') {
        // Verify HMAC
        const expectedHmac = computeHMAC(envelope.data, ECONOMY_HMAC_KEY)
        if (envelope.hmac !== expectedHmac) {
          console.warn('[economy] HMAC integrity check failed — data may be tampered, returning null')
          return null
        }
        data = envelope.data
      } else {
        // Legacy format (pre-HMAC): accept but log warning
        console.warn('[economy] legacy format detected — no HMAC envelope, accepting raw data')
        data = raw
      }
    } catch {
      // Not valid JSON envelope — treat as legacy raw data
      console.warn('[economy] legacy format detected — no HMAC envelope, accepting raw data')
      data = raw
    }

    const parsed = JSON.parse(data)
    if (typeof parsed.balance !== 'number') return null
    return parsed as EconomyState
  } catch {
    return null
  }
}

/**
 * Load existing state or create a fresh genesis state.
 */
export function getOrCreateEconomyState(): EconomyState {
  const existing = loadEconomyState()
  if (existing) return existing
  const fresh = createEconomyState()
  saveEconomyState(fresh)
  return fresh
}
