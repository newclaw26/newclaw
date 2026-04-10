// ============================================================================
// Governance Scoring & Role Rotation Engine
// ============================================================================
//
// Productizes the CEO+Audit governance mechanism that produced 95.3 avg score
// across 10 rounds with zero defects.  Every Trinity node gets this
// automatically: six-dimension scoring, merit-based term calculation, and
// deterministic role rotation.
//
// Pure functions, immutable data, no side effects.
// ============================================================================

import type {
  GovernanceActorId,
  GovernanceDimensions,
  GovernanceScore,
  RotationState,
} from '@/types/v6'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dimension ceiling map for validation. */
const DIMENSION_CEILINGS: Record<keyof GovernanceDimensions, number> = {
  taskCompletion: 25,
  deliveryQuality: 25,
  planValue: 15,
  efficiency: 15,
  strategicJudgment: 10,
  riskControl: 10,
}

/** Ordered list of all three governance actor IDs. */
const ALL_ACTORS: readonly GovernanceActorId[] = ['ai1', 'ai2', 'ai3'] as const

/** Default initial term length when no scores exist yet. */
const DEFAULT_TERM_LENGTH = 10

/** Minimum possible term length regardless of score. */
const MIN_TERM_LENGTH = 5

/** Maximum possible term length regardless of score. */
const MAX_TERM_LENGTH = 30

// ---------------------------------------------------------------------------
// Dimension Validation
// ---------------------------------------------------------------------------

/**
 * Clamp a single dimension value to [0, ceiling].
 * Rounds to nearest integer -- fractional scores are not meaningful
 * at this granularity.
 */
function clampDimension(value: number, ceiling: number): number {
  return Math.round(Math.min(Math.max(value, 0), ceiling))
}

/**
 * Validate and clamp all six dimensions, returning a normalized copy.
 * Every value is guaranteed to be in [0, ceiling] after this call.
 */
export function validateDimensions(raw: GovernanceDimensions): GovernanceDimensions {
  return {
    taskCompletion: clampDimension(raw.taskCompletion, DIMENSION_CEILINGS.taskCompletion),
    deliveryQuality: clampDimension(raw.deliveryQuality, DIMENSION_CEILINGS.deliveryQuality),
    planValue: clampDimension(raw.planValue, DIMENSION_CEILINGS.planValue),
    efficiency: clampDimension(raw.efficiency, DIMENSION_CEILINGS.efficiency),
    strategicJudgment: clampDimension(raw.strategicJudgment, DIMENSION_CEILINGS.strategicJudgment),
    riskControl: clampDimension(raw.riskControl, DIMENSION_CEILINGS.riskControl),
  }
}

/**
 * Sum all six dimensions into a total score (0-100).
 */
export function sumDimensions(dims: GovernanceDimensions): number {
  return (
    dims.taskCompletion +
    dims.deliveryQuality +
    dims.planValue +
    dims.efficiency +
    dims.strategicJudgment +
    dims.riskControl
  )
}

// ---------------------------------------------------------------------------
// Score Creation
// ---------------------------------------------------------------------------

/**
 * Create a new GovernanceScore.
 *
 * Dimensions are validated and clamped automatically.
 * The `total` field is always the exact sum of clamped dimensions --
 * callers cannot override it.
 */
export function createScore(
  scorer: GovernanceActorId,
  target: GovernanceActorId,
  round: number,
  dimensions: GovernanceDimensions,
  notes: string = '',
): GovernanceScore {
  const validated = validateDimensions(dimensions)
  return {
    round,
    timestamp: new Date().toISOString(),
    scorer,
    target,
    dimensions: validated,
    total: sumDimensions(validated),
    notes,
  }
}

// ---------------------------------------------------------------------------
// Score Aggregation
// ---------------------------------------------------------------------------

/**
 * Compute the arithmetic mean of the `total` field across the given scores.
 *
 * If `lastN` is provided, only the most recent N scores (by array order)
 * are included.  Returns 0 for an empty input.
 */
export function getAverageScore(
  scores: GovernanceScore[],
  lastN?: number,
): number {
  if (scores.length === 0) return 0

  const slice = lastN !== undefined && lastN > 0
    ? scores.slice(-lastN)
    : scores

  if (slice.length === 0) return 0

  const sum = slice.reduce((acc, s) => acc + s.total, 0)
  return sum / slice.length
}

/**
 * Get all scores where a specific actor was the target.
 */
export function getScoresForTarget(
  scores: GovernanceScore[],
  target: GovernanceActorId,
): GovernanceScore[] {
  return scores.filter(s => s.target === target)
}

/**
 * Get all scores given by a specific scorer.
 */
export function getScoresByScorer(
  scores: GovernanceScore[],
  scorer: GovernanceActorId,
): GovernanceScore[] {
  return scores.filter(s => s.scorer === scorer)
}

// ---------------------------------------------------------------------------
// Term Length Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the maximum rounds a CEO can serve based on their average score.
 *
 * Formula:  base + bonus
 *   base  = 10 rounds (everyone gets at least this)
 *   bonus = max(0, (avgScore/10 - 9) * 10)
 *
 * This means:
 *   avgScore  90  ->  10 + 0  = 10 rounds
 *   avgScore  95  ->  10 + 5  = 15 rounds
 *   avgScore 100  ->  10 + 10 = 20 rounds
 *   avgScore  80  ->  10 + 0  = 10 rounds (bonus floors at 0)
 *
 * The result is clamped to [MIN_TERM_LENGTH, MAX_TERM_LENGTH].
 */
export function calculateTermLength(avgScore: number): number {
  const base = DEFAULT_TERM_LENGTH
  const bonus = Math.max(0, (avgScore / 10 - 9) * 10)
  const raw = Math.round(base + bonus)
  return Math.min(Math.max(raw, MIN_TERM_LENGTH), MAX_TERM_LENGTH)
}

// ---------------------------------------------------------------------------
// Rotation Logic
// ---------------------------------------------------------------------------

/**
 * Create the initial rotation state.
 *
 * AI-1 starts as CEO, AI-2 starts as auditor.  This mirrors the
 * "CEO-A + Audit-B" pattern that proved effective in practice.
 */
export function createInitialRotation(): RotationState {
  return {
    currentCEO: 'ai1',
    currentAuditor: 'ai2',
    roundsInCurrentTerm: 0,
    maxRoundsInTerm: DEFAULT_TERM_LENGTH,
    scoreHistory: [],
  }
}

/**
 * Check whether a role rotation is needed.
 *
 * Rotation triggers when the CEO has served `maxRoundsInTerm` rounds.
 * A rotation also triggers if the CEO's recent average score drops
 * below 70 (performance-based early rotation).
 */
export function shouldRotate(state: RotationState): boolean {
  // Term expiry
  if (state.roundsInCurrentTerm >= state.maxRoundsInTerm) {
    return true
  }

  // Performance-based early rotation: if CEO scored below 70 avg over last 3 rounds
  const ceoScores = getScoresForTarget(state.scoreHistory, state.currentCEO)
  if (ceoScores.length >= 3) {
    const recentAvg = getAverageScore(ceoScores, 3)
    if (recentAvg < 70) {
      return true
    }
  }

  return false
}

/**
 * Determine the third actor who is neither CEO nor auditor.
 */
export function getThirdActor(
  ceo: GovernanceActorId,
  auditor: GovernanceActorId,
): GovernanceActorId {
  const third = ALL_ACTORS.find(a => a !== ceo && a !== auditor)
  // Defensive: should never be undefined with exactly 3 actors
  return third ?? 'ai3'
}

/**
 * Execute a role rotation, returning the new RotationState.
 *
 * Rotation order:
 *   - The current auditor becomes the new CEO.
 *   - The third agent (neither current CEO nor auditor) becomes the new auditor.
 *   - The outgoing CEO moves to the observer/third position.
 *
 * The new term length is recalculated from the new CEO's recent scores.
 */
export function rotateRoles(state: RotationState): RotationState {
  const newCEO = state.currentAuditor
  const newAuditor = getThirdActor(state.currentCEO, state.currentAuditor)

  // Calculate term length for the incoming CEO based on their past scores
  const newCEOScores = getScoresForTarget(state.scoreHistory, newCEO)
  const avgScore = newCEOScores.length > 0
    ? getAverageScore(newCEOScores, 5)
    : 90 // default assumption for new CEOs

  return {
    currentCEO: newCEO,
    currentAuditor: newAuditor,
    roundsInCurrentTerm: 0,
    maxRoundsInTerm: calculateTermLength(avgScore),
    scoreHistory: state.scoreHistory,
  }
}

/**
 * Record a completed round: append the score, increment the round counter,
 * and recalculate the term length based on the latest scores.
 *
 * Does NOT auto-rotate.  Call `shouldRotate()` after this to check
 * whether a rotation is due, then call `rotateRoles()` if needed.
 */
export function recordRound(
  state: RotationState,
  score: GovernanceScore,
): RotationState {
  const updatedHistory = [...state.scoreHistory, score]

  // Recalculate term length based on CEO's updated score history
  const ceoScores = getScoresForTarget(updatedHistory, state.currentCEO)
  const avgScore = ceoScores.length > 0
    ? getAverageScore(ceoScores, 5)
    : 90

  return {
    ...state,
    roundsInCurrentTerm: state.roundsInCurrentTerm + 1,
    maxRoundsInTerm: calculateTermLength(avgScore),
    scoreHistory: updatedHistory,
  }
}

// ---------------------------------------------------------------------------
// Mapping Helpers  (GovernanceActorId <-> TrinityRole)
// ---------------------------------------------------------------------------

import type { TrinityRole } from '@/types/v6'

const ACTOR_TO_ROLE: Record<GovernanceActorId, TrinityRole> = {
  ai1: 'ai1-expander',
  ai2: 'ai2-auditor',
  ai3: 'ai3-governor',
}

const ROLE_TO_ACTOR: Record<TrinityRole, GovernanceActorId> = {
  'ai1-expander': 'ai1',
  'ai2-auditor': 'ai2',
  'ai3-governor': 'ai3',
}

/**
 * Convert a short GovernanceActorId to the full TrinityRole.
 */
export function actorToRole(actor: GovernanceActorId): TrinityRole {
  return ACTOR_TO_ROLE[actor]
}

/**
 * Convert a full TrinityRole to the short GovernanceActorId.
 */
export function roleToActor(role: TrinityRole): GovernanceActorId {
  return ROLE_TO_ACTOR[role]
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { DIMENSION_CEILINGS, ALL_ACTORS, DEFAULT_TERM_LENGTH, MIN_TERM_LENGTH, MAX_TERM_LENGTH }
