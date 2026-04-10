// ============================================================================
// Layer 3: Outcome Oracle - Result Validation & Settlement
// ============================================================================

import type {
  OutcomeReport,
  OracleRule,
  OracleVerdict,
  CreditTarget,
  EvidenceGrade,
  TrinityTask,
  GovernanceLedgers,
} from '@/types/v6'
import { getEvidenceByGrade } from './ledger'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Default Oracle Rules
// ---------------------------------------------------------------------------

export function createDefaultOracleRules(): OracleRule[] {
  return [
    {
      id: generateId(),
      condition: 'Local simulation credit',
      minEvidenceGrade: 'H3',
      minVerifications: 1,
      requiredFields: ['taskId', 'actualResult', 'verificationMethod'],
      creditTarget: 'local',
      description: 'Results with at least H3 evidence can enter local credit system',
    },
    {
      id: generateId(),
      condition: 'Testnet credit settlement',
      minEvidenceGrade: 'H2',
      minVerifications: 2,
      requiredFields: ['taskId', 'actualResult', 'verificationMethod', 'reconciliationHash'],
      creditTarget: 'testnet',
      description: 'Multi-verified H2+ results can enter testnet credit',
    },
    {
      id: generateId(),
      condition: 'Mainnet credit settlement',
      minEvidenceGrade: 'H1',
      minVerifications: 3,
      requiredFields: ['taskId', 'actualResult', 'verificationMethod', 'reconciliationHash', 'evidenceGrade'],
      creditTarget: 'mainnet',
      description: 'Machine-verified H1 results with 3+ verifications can enter mainnet credit',
    },
  ]
}

// ---------------------------------------------------------------------------
// Outcome Report Generation
// ---------------------------------------------------------------------------

export function generateOutcomeReport(
  task: TrinityTask,
  actualResult: string,
  verificationMethod: string,
  evidenceGrade: EvidenceGrade
): OutcomeReport {
  const reconciliationHash = computeReconciliationHash(task.id, actualResult, evidenceGrade)

  return {
    id: generateId(),
    taskId: task.id,
    taskType: inferTaskType(task),
    expectedGoal: task.description,
    actualResult,
    verificationMethod,
    evidenceGrade,
    settleable: false,
    reconciliationHash,
    creditTarget: 'rejected',
    oracleVerdict: 'pending-review',
    createdAt: now(),
  }
}

// ---------------------------------------------------------------------------
// Oracle Verdict Engine
// ---------------------------------------------------------------------------

export function evaluateOutcome(
  outcome: OutcomeReport,
  rules: OracleRule[],
  ledgers: GovernanceLedgers
): OutcomeReport {
  // Check for expiry
  if (outcome.expiresAt && new Date(outcome.expiresAt) < new Date()) {
    return { ...outcome, oracleVerdict: 'expired', settleable: false, creditTarget: 'rejected' }
  }

  // Evaluate against rules (from most restrictive to least)
  const sortedRules = [...rules].sort((a, b) => {
    const order: Record<CreditTarget, number> = { mainnet: 3, testnet: 2, local: 1, rejected: 0 }
    return order[b.creditTarget] - order[a.creditTarget]
  })

  // Find the highest credit target this outcome qualifies for
  let bestTarget: CreditTarget = 'rejected'
  let verdict: OracleVerdict = 'rejected'

  for (const rule of sortedRules) {
    if (meetsRule(outcome, rule, ledgers)) {
      bestTarget = rule.creditTarget
      verdict = 'settleable'
      break
    }
  }

  return {
    ...outcome,
    creditTarget: bestTarget,
    oracleVerdict: verdict,
    settleable: verdict === 'settleable',
  }
}

function meetsRule(outcome: OutcomeReport, rule: OracleRule, ledgers: GovernanceLedgers): boolean {
  // Check evidence grade
  const gradeOrder: Record<EvidenceGrade, number> = { H1: 4, H2: 3, H3: 2, H4: 1 }
  if (gradeOrder[outcome.evidenceGrade] < gradeOrder[rule.minEvidenceGrade]) {
    return false
  }

  // Check required fields
  for (const field of rule.requiredFields) {
    const value = outcome[field as keyof OutcomeReport]
    if (value === undefined || value === null || value === '') {
      return false
    }
  }

  // Check verification count (non-expired evidence entries for this task)
  // BUG-10 fix: use proper Date comparison instead of ISO string comparison
  const taskEvidence = ledgers.evidence.filter(
    e => e.taskId === outcome.taskId && (!e.expiresAt || new Date(e.expiresAt).getTime() > Date.now())
  )
  const verificationCount = taskEvidence.length
  if (verificationCount < rule.minVerifications) {
    return false
  }

  // Check evidence quality
  const qualifiedEvidence = getEvidenceByGrade(
    { ...ledgers, evidence: taskEvidence },
    rule.minEvidenceGrade
  )
  if (qualifiedEvidence.length < rule.minVerifications) {
    return false
  }

  return true
}

// ---------------------------------------------------------------------------
// Settlement
// ---------------------------------------------------------------------------

export function settleOutcome(outcome: OutcomeReport): OutcomeReport {
  if (!outcome.settleable || outcome.oracleVerdict !== 'settleable') {
    throw new Error(`Outcome ${outcome.id} is not settleable (verdict: ${outcome.oracleVerdict})`)
  }
  return {
    ...outcome,
    settledAt: now(),
  }
}

export function disputeOutcome(outcome: OutcomeReport, reason: string): OutcomeReport {
  return {
    ...outcome,
    oracleVerdict: 'disputed',
    settleable: false,
    reconciliationHash: `DISPUTED:${reason}:${outcome.reconciliationHash}`,
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function getOracleStats(outcomes: OutcomeReport[]) {
  const total = outcomes.length
  const settled = outcomes.filter(o => o.settledAt).length
  const settleable = outcomes.filter(o => o.settleable).length
  const rejected = outcomes.filter(o => o.oracleVerdict === 'rejected').length
  const disputed = outcomes.filter(o => o.oracleVerdict === 'disputed').length
  const pending = outcomes.filter(o => o.oracleVerdict === 'pending-review').length

  const byTarget = {
    local: outcomes.filter(o => o.creditTarget === 'local').length,
    testnet: outcomes.filter(o => o.creditTarget === 'testnet').length,
    mainnet: outcomes.filter(o => o.creditTarget === 'mainnet').length,
  }

  return { total, settled, settleable, rejected, disputed, pending, byTarget }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function computeReconciliationHash(taskId: string, result: string, grade: EvidenceGrade): string {
  // Deterministic hash for MVP - in production, use SHA-256
  const data = `${taskId}:${result}:${grade}`
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `0x${Math.abs(hash).toString(16).padStart(16, '0')}`
}

function inferTaskType(task: TrinityTask): string {
  const title = task.title.toLowerCase()
  if (title.includes('playbook')) return 'playbook-generation'
  if (title.includes('market') || title.includes('listing')) return 'market-listing'
  if (title.includes('audit')) return 'audit-review'
  if (title.includes('code') || title.includes('implement')) return 'code-implementation'
  return 'general-task'
}
