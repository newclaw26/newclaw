/**
 * V6 Proof-of-Outcome (PoO) Verifier Tests
 *
 * Exercises the functional PoO module: scoring formula, task lifecycle,
 * stats aggregation, Oracle integration, and whitepaper threshold logic.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createPooState,
  submitForVerification,
  calculatePriorityScore,
  finalizeVerification,
  getPooStats,
  scoreToEvidenceGrade,
  getOutcomeEvidenceGrade,
  meetsExecutionThreshold,
  evidenceGradeToScore,
  type PooState,
  type ScoreComponents,
} from '@/lib/v6/poo-verifier'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeComponents(overrides?: Partial<ScoreComponents>): ScoreComponents {
  return {
    goalFit: 80,
    pooOutcome: 80,
    evidenceLevel: 80,
    cost: 10,
    debtImpact: 10,
    ...overrides,
  }
}

function submitSample(
  state: PooState,
  overrides?: Partial<ScoreComponents>,
): [PooState, ReturnType<typeof submitForVerification>[1]] {
  return submitForVerification(
    state,
    { title: 'Test task', description: 'A test', proposedBy: 'AI-1' },
    { scoreComponents: makeComponents(overrides), evidenceGrade: 'H2' },
  )
}

// ===========================================================================
// Tests
// ===========================================================================

describe('calculatePriorityScore', () => {
  it('returns value in 0-100 range', () => {
    const score = calculatePriorityScore(50, 50, 50, 50, 50)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 0-100 for all-zero inputs', () => {
    const score = calculatePriorityScore(0, 0, 0, 0, 0)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 0-100 for all-100 inputs', () => {
    const score = calculatePriorityScore(100, 100, 100, 100, 100)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('high goalFit + high pooOutcome = high score (when cost is moderate)', () => {
    // Use moderate cost (80) so scores don't both clamp to 100
    const highScore = calculatePriorityScore(95, 95, 90, 80, 10)
    const lowScore = calculatePriorityScore(20, 20, 20, 80, 10)
    expect(highScore).toBeGreaterThan(lowScore)
    expect(highScore).toBeGreaterThan(60)
  })

  it('high cost significantly reduces score', () => {
    // numerator for both = 80*0.35 + 80*0.35 + 80*0.2 = 72
    // lowCost denom = max(1, 50 + 5*0.1) = 50.5  => raw = (72/50.5)*100 = 142.57 => clamped 100
    // highCost denom = max(1, 90 + 5*0.1) = 90.5  => raw = (72/90.5)*100 = 79.56
    // Use higher cost baseline so lowCost doesn't clamp:
    const lowCost = calculatePriorityScore(50, 50, 50, 50, 5)
    const highCost = calculatePriorityScore(50, 50, 50, 95, 5)
    expect(lowCost).toBeGreaterThan(highCost)
    // ratio: lowCost uses denom ~50.5, highCost uses denom ~95.5 => ratio ~1.89
    // Just verify cost impact is meaningful (> 1.5x difference)
    expect(lowCost / highCost).toBeGreaterThan(1.5)
  })

  it('high debtImpact reduces score', () => {
    // Use high enough cost base so the scores don't both clamp to 100
    // numerator = 80*0.35 + 80*0.35 + 80*0.2 = 72
    // lowDebt denom = max(1, 80 + 0*0.1) = 80 => raw = (72/80)*100 = 90
    // highDebt denom = max(1, 80 + 100*0.1) = 90 => raw = (72/90)*100 = 80
    const lowDebt = calculatePriorityScore(80, 80, 80, 80, 0)
    const highDebt = calculatePriorityScore(80, 80, 80, 80, 100)
    expect(lowDebt).toBeGreaterThan(highDebt)
  })

  it('follows the whitepaper formula precisely', () => {
    // Manual calculation:
    //   numerator = (80*0.35) + (70*0.35) + (60*0.2) = 28 + 24.5 + 12 = 64.5
    //   denominator = max(1, 20 + 30*0.1) = max(1, 23) = 23
    //   raw = (64.5 / 23) * 100 = 280.43...
    //   clamped = min(100, max(0, 280.43)) = 100
    const score = calculatePriorityScore(80, 70, 60, 20, 30)
    // With these inputs the numerator/denominator ratio * 100 exceeds 100, so it clamps
    expect(score).toBeLessThanOrEqual(100)

    // Now with higher cost so it doesn't clamp:
    //   numerator = (50*0.35) + (50*0.35) + (50*0.2) = 17.5 + 17.5 + 10 = 45
    //   denominator = max(1, 60 + 20*0.1) = max(1, 62) = 62
    //   raw = (45 / 62) * 100 = 72.58...
    const precise = calculatePriorityScore(50, 50, 50, 60, 20)
    expect(precise).toBeCloseTo(72.58, 0)
  })

  it('never returns NaN', () => {
    const score = calculatePriorityScore(0, 0, 0, 0, 0)
    expect(Number.isNaN(score)).toBe(false)
  })

  it('[L-01] prevents score gaming via zero-cost input', () => {
    // Setting cost=0 and debtImpact=0 should NOT allow max score.
    // With safeCost=1 floor, denominator is at least 1, preventing
    // trivial numerator/denominator ratio exploitation.
    const gamed = calculatePriorityScore(100, 100, 100, 0, 0)
    const honest = calculatePriorityScore(100, 100, 100, 1, 0)
    // Both should produce the same result since cost=0 is floored to 1
    expect(gamed).toBe(honest)
    // Score should be 90*100 = 9000 clamped to 100 with denom=1
    // numerator = 100*0.35 + 100*0.35 + 100*0.2 = 90, denom=1, raw=9000 => 100
    expect(gamed).toBe(100)
  })

  it('[L-01] cost=0 behaves identically to cost=1', () => {
    // Verify the floor is applied uniformly
    const withZero = calculatePriorityScore(50, 50, 50, 0, 10)
    const withOne = calculatePriorityScore(50, 50, 50, 1, 10)
    expect(withZero).toBe(withOne)
  })
})

describe('submitForVerification', () => {
  let state: PooState

  beforeEach(() => {
    state = createPooState()
  })

  it('creates a pending entry', () => {
    const [newState, task] = submitSample(state)
    expect(task.status).toBe('pending')
    expect(task.title).toBe('Test task')
    expect(task.proposedBy).toBe('AI-1')
    expect(task.id).toBeTruthy()
    expect(newState.tasks.has(task.id)).toBe(true)
  })

  it('assigns a priority score on submission', () => {
    const [, task] = submitSample(state)
    expect(task.priorityScore).toBeDefined()
    expect(task.priorityScore).toBeGreaterThanOrEqual(0)
    expect(task.priorityScore).toBeLessThanOrEqual(100)
  })

  it('stores score components', () => {
    const comps = makeComponents({ goalFit: 99, cost: 5 })
    const [, task] = submitForVerification(
      state,
      { title: 'X', description: 'Y', proposedBy: 'AI-2' },
      { scoreComponents: comps },
    )
    expect(task.scoreComponents).toEqual(comps)
  })

  it('stores evidence grade when provided', () => {
    const [, task] = submitForVerification(
      state,
      { title: 'X', description: 'Y', proposedBy: 'AI-1' },
      { scoreComponents: makeComponents(), evidenceGrade: 'H1' },
    )
    expect(task.evidenceGrade).toBe('H1')
  })

  it('does not mutate original state', () => {
    const sizeBefore = state.tasks.size
    submitSample(state)
    expect(state.tasks.size).toBe(sizeBefore)
  })
})

describe('finalizeVerification', () => {
  let state: PooState
  let taskId: string

  beforeEach(() => {
    state = createPooState()
    const [s, task] = submitSample(state)
    state = s
    taskId = task.id
  })

  it('moves task to verified when passed=true', () => {
    const [newState, task] = finalizeVerification(state, taskId, true)
    expect(task.status).toBe('verified')
    expect(task.finalizedAt).toBeTruthy()
    expect(newState.tasks.get(taskId)?.status).toBe('verified')
  })

  it('moves task to rejected when passed=false', () => {
    const [newState, task] = finalizeVerification(state, taskId, false)
    expect(task.status).toBe('rejected')
    expect(task.finalizedAt).toBeTruthy()
    expect(newState.tasks.get(taskId)?.status).toBe('rejected')
  })

  it('throws for unknown task id', () => {
    expect(() => finalizeVerification(state, 'nonexistent', true)).toThrow('not found')
  })

  it('throws for already finalized task', () => {
    const [s2] = finalizeVerification(state, taskId, true)
    expect(() => finalizeVerification(s2, taskId, false)).toThrow('already finalized')
  })

  it('does not mutate original state', () => {
    const statusBefore = state.tasks.get(taskId)?.status
    finalizeVerification(state, taskId, true)
    expect(state.tasks.get(taskId)?.status).toBe(statusBefore)
  })
})

describe('getPooStats', () => {
  let state: PooState

  beforeEach(() => {
    state = createPooState()
  })

  it('returns zeroes for empty state', () => {
    const stats = getPooStats(state)
    expect(stats).toEqual({
      totalTasks: 0,
      verified: 0,
      rejected: 0,
      pending: 0,
      score: 0,
    })
  })

  it('counts pending tasks correctly', () => {
    const [s1] = submitSample(state)
    const [s2] = submitSample(s1)
    const stats = getPooStats(s2)
    expect(stats.totalTasks).toBe(2)
    expect(stats.pending).toBe(2)
    expect(stats.verified).toBe(0)
    expect(stats.rejected).toBe(0)
  })

  it('counts verified and rejected correctly', () => {
    const [s1, t1] = submitSample(state)
    const [s2, t2] = submitSample(s1)
    const [s3, t3] = submitSample(s2)

    const [s4] = finalizeVerification(s3, t1.id, true)
    const [s5] = finalizeVerification(s4, t2.id, false)

    const stats = getPooStats(s5)
    expect(stats.totalTasks).toBe(3)
    expect(stats.verified).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.pending).toBe(1)
  })

  it('computes average score across scored tasks', () => {
    // Submit two tasks with different score inputs
    const [s1] = submitForVerification(
      state,
      { title: 'T1', description: 'D1', proposedBy: 'AI-1' },
      { scoreComponents: makeComponents({ goalFit: 90, pooOutcome: 90, evidenceLevel: 90, cost: 10, debtImpact: 10 }) },
    )
    const [s2] = submitForVerification(
      s1,
      { title: 'T2', description: 'D2', proposedBy: 'AI-2' },
      { scoreComponents: makeComponents({ goalFit: 30, pooOutcome: 30, evidenceLevel: 30, cost: 10, debtImpact: 10 }) },
    )

    const stats = getPooStats(s2)
    expect(stats.score).toBeGreaterThan(0)
    expect(stats.score).toBeLessThanOrEqual(100)
  })
})

describe('whitepaper threshold (>= 85)', () => {
  it('meetsExecutionThreshold returns true for score >= 85', () => {
    expect(meetsExecutionThreshold(85)).toBe(true)
    expect(meetsExecutionThreshold(100)).toBe(true)
    expect(meetsExecutionThreshold(85.01)).toBe(true)
  })

  it('meetsExecutionThreshold returns false for score < 85', () => {
    expect(meetsExecutionThreshold(84.99)).toBe(false)
    expect(meetsExecutionThreshold(0)).toBe(false)
    expect(meetsExecutionThreshold(84)).toBe(false)
  })

  it('allows custom threshold override', () => {
    expect(meetsExecutionThreshold(60, 50)).toBe(true)
    expect(meetsExecutionThreshold(40, 50)).toBe(false)
  })

  it('high-quality task with low cost meets the 85 threshold', () => {
    // goalFit=95 pooOutcome=95 evidence=100 cost=1 debt=1
    // numerator = 95*0.35 + 95*0.35 + 100*0.2 = 33.25 + 33.25 + 20 = 86.5
    // denominator = max(1, 1 + 1*0.1) = 1.1
    // raw = (86.5 / 1.1) * 100 = 7863.6... => clamped to 100
    const score = calculatePriorityScore(95, 95, 100, 1, 1)
    expect(meetsExecutionThreshold(score)).toBe(true)
  })
})

describe('Oracle integration', () => {
  it('scoreToEvidenceGrade maps correctly', () => {
    expect(scoreToEvidenceGrade(85)).toBe('H1')
    expect(scoreToEvidenceGrade(100)).toBe('H1')
    expect(scoreToEvidenceGrade(65)).toBe('H2')
    expect(scoreToEvidenceGrade(84)).toBe('H2')
    expect(scoreToEvidenceGrade(40)).toBe('H3')
    expect(scoreToEvidenceGrade(64)).toBe('H3')
    expect(scoreToEvidenceGrade(0)).toBe('H4')
    expect(scoreToEvidenceGrade(39)).toBe('H4')
  })

  it('getOutcomeEvidenceGrade returns null for pending tasks', () => {
    let state = createPooState()
    const [s, task] = submitSample(state)
    expect(getOutcomeEvidenceGrade(s, task.id)).toBeNull()
  })

  it('getOutcomeEvidenceGrade returns H4 for rejected tasks', () => {
    let state = createPooState()
    const [s1, task] = submitSample(state)
    const [s2] = finalizeVerification(s1, task.id, false)
    expect(getOutcomeEvidenceGrade(s2, task.id)).toBe('H4')
  })

  it('getOutcomeEvidenceGrade returns grade based on score for verified tasks', () => {
    let state = createPooState()
    // High-scoring task should yield H1
    const [s1, task] = submitForVerification(
      state,
      { title: 'X', description: 'Y', proposedBy: 'AI-1' },
      { scoreComponents: makeComponents({ goalFit: 95, pooOutcome: 95, evidenceLevel: 100, cost: 1, debtImpact: 1 }) },
    )
    const [s2] = finalizeVerification(s1, task.id, true)
    const grade = getOutcomeEvidenceGrade(s2, task.id)
    expect(grade).toBe('H1')
  })

  it('evidenceGradeToScore returns expected values', () => {
    expect(evidenceGradeToScore('H1')).toBe(100)
    expect(evidenceGradeToScore('H2')).toBe(75)
    expect(evidenceGradeToScore('H3')).toBe(50)
    expect(evidenceGradeToScore('H4')).toBe(25)
  })
})

describe('createPooState', () => {
  it('creates empty state with default config', () => {
    const state = createPooState()
    expect(state.tasks.size).toBe(0)
    expect(state.config.executionThreshold).toBe(85)
    expect(state.config.discardThreshold).toBe(40)
  })

  it('accepts config overrides', () => {
    const state = createPooState({ executionThreshold: 90 })
    expect(state.config.executionThreshold).toBe(90)
    expect(state.config.discardThreshold).toBe(40) // default preserved
  })
})
