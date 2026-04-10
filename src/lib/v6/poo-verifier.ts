// ============================================================================
// NewClaw V6 - Proof of Outcome (PoO) Verifier
//
// Functional-style PoO verification module adapted from A-team's class-based
// PoOVerifier (electron/poo/index.ts). Implements Section 5 of the v6.0 spec.
//
// Whitepaper Priority Score Formula:
//   PriorityScore = (GoalFit*0.35 + PoO_Outcome*0.35 + EvidenceLevel*0.2)
//                   / (Cost + DebtImpact*0.1)
//   Score >= 85 => Execute and reward New.B
//   Score <  85 => Discard + stake deduction
// ============================================================================

import type { EvidenceGrade } from '@/types/v6'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreComponents {
  goalFit: number        // 0-100: alignment with current GOAL
  pooOutcome: number     // 0-100: measured outcome from sandbox
  evidenceLevel: number  // 0-100: H1=100, H2=75, H3=50, H4=25
  cost: number           // 0-100: resource cost (inverted in formula)
  debtImpact: number     // 0-100: technical debt created
}

export type PooTaskStatus = 'pending' | 'verified' | 'rejected'

export interface PooTask {
  id: string
  title: string
  description: string
  proposedBy: string
  status: PooTaskStatus
  priorityScore?: number
  scoreComponents?: ScoreComponents
  evidenceGrade?: EvidenceGrade
  createdAt: string
  finalizedAt?: string
}

export interface PooState {
  tasks: Map<string, PooTask>
  config: PooConfig
}

export interface PooConfig {
  executionThreshold: number   // default 85
  discardThreshold: number     // default 40
}

export interface PooStats {
  totalTasks: number
  verified: number
  rejected: number
  pending: number
  score: number // average priority score across scored tasks
}

// ---------------------------------------------------------------------------
// Evidence Grade Mapping
// ---------------------------------------------------------------------------

const EVIDENCE_GRADE_SCORE: Record<EvidenceGrade, number> = {
  H1: 100,
  H2: 75,
  H3: 50,
  H4: 25,
}

// ---------------------------------------------------------------------------
// State Factory
// ---------------------------------------------------------------------------

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

/**
 * Create initial PoO verifier state.
 */
export function createPooState(config?: Partial<PooConfig>): PooState {
  return {
    tasks: new Map(),
    config: {
      executionThreshold: 85,
      discardThreshold: 40,
      ...config,
    },
  }
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Submit an outcome for PoO verification.
 * Creates a pending entry that must later be finalized.
 *
 * Returns [updatedState, createdTask].
 */
export function submitForVerification(
  state: PooState,
  task: { title: string; description: string; proposedBy: string },
  outcome: { scoreComponents: ScoreComponents; evidenceGrade?: EvidenceGrade }
): [PooState, PooTask] {
  const id = generateId()
  const priorityScore = calculatePriorityScore(
    outcome.scoreComponents.goalFit,
    outcome.scoreComponents.pooOutcome,
    outcome.scoreComponents.evidenceLevel,
    outcome.scoreComponents.cost,
    outcome.scoreComponents.debtImpact,
  )

  const pooTask: PooTask = {
    id,
    title: task.title,
    description: task.description,
    proposedBy: task.proposedBy,
    status: 'pending',
    priorityScore,
    scoreComponents: outcome.scoreComponents,
    evidenceGrade: outcome.evidenceGrade,
    createdAt: now(),
  }

  const newTasks = new Map(state.tasks)
  newTasks.set(id, pooTask)

  return [{ ...state, tasks: newTasks }, pooTask]
}

/**
 * Calculate PoO Priority Score using the whitepaper formula:
 *
 *   PriorityScore = ((GoalFit * 0.35) + (PoO_Outcome * 0.35) + (EvidenceLevel * 0.2))
 *                   / (Cost + DebtImpact * 0.1)
 *
 * Score is normalized to the 0-100 range.
 * All inputs are expected in 0-100 range.
 */
export function calculatePriorityScore(
  goalFit: number,
  pooOutcome: number,
  evidenceLevel: number,
  cost: number,
  debtImpact: number,
): number {
  const numerator =
    (goalFit * 0.35) +
    (pooOutcome * 0.35) +
    (evidenceLevel * 0.2)

  // Enforce minimum cost to prevent score gaming via zero-cost input [L-01]
  const safeCost = Math.max(cost, 1)
  const safeDebt = Math.max(debtImpact, 0)
  const denominator = Math.max(1, safeCost + safeDebt * 0.1)

  // Scale to 0-100, clamp
  const raw = (numerator / denominator) * 100
  const score = Math.min(100, Math.max(0, raw))

  return Math.round(score * 100) / 100
}

/**
 * Finalize a pending verification as verified or rejected.
 *
 * Returns [updatedState, finalizedTask].
 * Throws if the task does not exist or is not in pending status.
 */
export function finalizeVerification(
  state: PooState,
  taskId: string,
  passed: boolean,
): [PooState, PooTask] {
  const existing = state.tasks.get(taskId)
  if (!existing) {
    throw new Error(`PoO task ${taskId} not found`)
  }
  if (existing.status !== 'pending') {
    throw new Error(`PoO task ${taskId} is already finalized (status: ${existing.status})`)
  }

  const finalized: PooTask = {
    ...existing,
    status: passed ? 'verified' : 'rejected',
    finalizedAt: now(),
  }

  const newTasks = new Map(state.tasks)
  newTasks.set(taskId, finalized)

  return [{ ...state, tasks: newTasks }, finalized]
}

/**
 * Get aggregate PoO statistics.
 */
export function getPooStats(state: PooState): PooStats {
  const tasks = Array.from(state.tasks.values())
  const scored = tasks.filter(t => t.priorityScore != null)
  const avgScore = scored.length > 0
    ? scored.reduce((sum, t) => sum + (t.priorityScore ?? 0), 0) / scored.length
    : 0

  return {
    totalTasks: tasks.length,
    verified: tasks.filter(t => t.status === 'verified').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    score: Math.round(avgScore * 100) / 100,
  }
}

// ---------------------------------------------------------------------------
// Oracle Integration
// ---------------------------------------------------------------------------

/**
 * Derive an EvidenceGrade from a PoO priority score.
 * Used to feed finalized PoO results into the OutcomeReport evidence system.
 *
 *   score >= 85 => H1 (machine-verified, reproducible)
 *   score >= 65 => H2 (multi-source corroborated)
 *   score >= 40 => H3 (single-source, expert-reviewed)
 *   score <  40 => H4 (unverified hypothesis)
 */
export function scoreToEvidenceGrade(score: number): EvidenceGrade {
  if (score >= 85) return 'H1'
  if (score >= 65) return 'H2'
  if (score >= 40) return 'H3'
  return 'H4'
}

/**
 * Build an OutcomeReport-compatible evidence grade from a finalized PoO task.
 * This connects PoO verification to the Oracle's evidence pipeline.
 *
 * Returns the evidence grade or null if the task is not finalized.
 */
export function getOutcomeEvidenceGrade(state: PooState, taskId: string): EvidenceGrade | null {
  const task = state.tasks.get(taskId)
  if (!task || task.status === 'pending') return null
  if (task.status === 'rejected') return 'H4'
  return scoreToEvidenceGrade(task.priorityScore ?? 0)
}

/**
 * Check whether a score meets the whitepaper execution threshold (>= 85).
 */
export function meetsExecutionThreshold(
  score: number,
  threshold?: number,
): boolean {
  return score >= (threshold ?? 85)
}

/**
 * Get the evidence score for a given grade.
 */
export function evidenceGradeToScore(grade: EvidenceGrade): number {
  return EVIDENCE_GRADE_SCORE[grade]
}
