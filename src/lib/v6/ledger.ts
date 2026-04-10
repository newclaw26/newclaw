// ============================================================================
// Layer 2: Governance Ledger Management
// ============================================================================

import type {
  GovernanceLedgers,
  EvidenceEntry,
  EvidenceGrade,
  ValueEntry,
  DebtEntry,
  TemporalEntry,
  CaseLawEntry,
  LocalLedgerEntry,
  TrinityRole,
} from '@/types/v6'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Empty Ledger Factory
// ---------------------------------------------------------------------------

export function createEmptyLedgers(): GovernanceLedgers {
  return {
    evidence: [],
    value: [],
    debt: [],
    temporal: [],
    caseLaw: [],
    localLedger: [],
  }
}

// ---------------------------------------------------------------------------
// Evidence Ledger (EVIDENCE.jsonl)
// ---------------------------------------------------------------------------

export function addEvidence(
  ledgers: GovernanceLedgers,
  conclusion: string,
  source: string,
  grade: EvidenceGrade,
  verifier: TrinityRole | 'human',
  taskId: string,
  tags: string[] = [],
  expiresAt?: string
): GovernanceLedgers {
  const entry: EvidenceEntry = {
    id: generateId(),
    conclusion,
    source,
    grade,
    verifier,
    expiresAt,
    taskId,
    tags,
    timestamp: now(),
  }
  return { ...ledgers, evidence: [...ledgers.evidence, entry] }
}

export function getActiveEvidence(ledgers: GovernanceLedgers): EvidenceEntry[] {
  // BUG-10 fix: use proper Date comparison instead of ISO string comparison
  return ledgers.evidence.filter(e => !e.expiresAt || new Date(e.expiresAt).getTime() > Date.now())
}

export function getEvidenceByGrade(ledgers: GovernanceLedgers, minGrade: EvidenceGrade): EvidenceEntry[] {
  const gradeOrder: Record<EvidenceGrade, number> = { H1: 4, H2: 3, H3: 2, H4: 1 }
  const minLevel = gradeOrder[minGrade]
  return ledgers.evidence.filter(e => gradeOrder[e.grade] >= minLevel)
}

// ---------------------------------------------------------------------------
// Value Ledger (VALUE.json)
// ---------------------------------------------------------------------------

export function addValueAssessment(
  ledgers: GovernanceLedgers,
  taskId: string,
  goalAlignment: number,
  expectedRevenue: number,
  resourceCost: number,
  riskExposure: number
): GovernanceLedgers {
  const priority = calculatePriority(goalAlignment, expectedRevenue, resourceCost, riskExposure)
  const entry: ValueEntry = {
    id: generateId(),
    taskId,
    goalAlignment,
    expectedRevenue,
    resourceCost,
    riskExposure,
    priority,
    timestamp: now(),
  }
  return { ...ledgers, value: [...ledgers.value, entry] }
}

function calculatePriority(
  goalAlignment: number,
  expectedRevenue: number,
  resourceCost: number,
  riskExposure: number
): number {
  // Weighted scoring: alignment * 0.4 + roi * 0.3 - risk * 0.3
  const roi = resourceCost > 0 ? (expectedRevenue / resourceCost) * 50 : 0
  const score = goalAlignment * 0.4 + Math.min(roi, 100) * 0.3 - riskExposure * 0.3
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getTopPriorityTasks(ledgers: GovernanceLedgers, limit = 10): ValueEntry[] {
  return [...ledgers.value].sort((a, b) => b.priority - a.priority).slice(0, limit)
}

// ---------------------------------------------------------------------------
// Debt Ledger (DEBT.md)
// ---------------------------------------------------------------------------

export function addDebt(
  ledgers: GovernanceLedgers,
  category: DebtEntry['category'],
  description: string,
  impact: DebtEntry['impact'],
  deferredFrom: string,
  reviewDate: string
): GovernanceLedgers {
  const entry: DebtEntry = {
    id: generateId(),
    category,
    description,
    impact,
    deferredFrom,
    reviewDate,
    resolved: false,
    timestamp: now(),
  }
  return { ...ledgers, debt: [...ledgers.debt, entry] }
}

export function resolveDebt(ledgers: GovernanceLedgers, debtId: string): GovernanceLedgers {
  return {
    ...ledgers,
    debt: ledgers.debt.map(d =>
      d.id === debtId ? { ...d, resolved: true, resolvedAt: now() } : d
    ),
  }
}

export function getOpenDebts(ledgers: GovernanceLedgers): DebtEntry[] {
  return ledgers.debt.filter(d => !d.resolved)
}

// ---------------------------------------------------------------------------
// Temporal Ledger (TEMPORAL.json)
// ---------------------------------------------------------------------------

export function addTemporalEntry(
  ledgers: GovernanceLedgers,
  conclusionId: string,
  effectiveAt: string,
  expiresAt: string,
  reviewCycle: string,
  dependencies: string[] = []
): GovernanceLedgers {
  const entry: TemporalEntry = {
    id: generateId(),
    conclusionId,
    effectiveAt,
    expiresAt,
    reviewCycle,
    dependencies,
    status: new Date(effectiveAt) <= new Date() ? 'active' : 'pending-review',
    timestamp: now(),
  }
  return { ...ledgers, temporal: [...ledgers.temporal, entry] }
}

export function refreshTemporalStatuses(ledgers: GovernanceLedgers): GovernanceLedgers {
  const currentTime = new Date()
  return {
    ...ledgers,
    temporal: ledgers.temporal.map(t => {
      if (new Date(t.expiresAt) < currentTime) return { ...t, status: 'expired' as const }
      if (new Date(t.effectiveAt) <= currentTime) return { ...t, status: 'active' as const }
      return t
    }),
  }
}

// ---------------------------------------------------------------------------
// CaseLaw Ledger (CASELAW.md)
// ---------------------------------------------------------------------------

export function addCaseLaw(
  ledgers: GovernanceLedgers,
  category: CaseLawEntry['category'],
  title: string,
  description: string,
  severity: CaseLawEntry['severity'],
  relatedTaskIds: string[],
  rootCause?: string,
  resolution?: string,
  lessonsLearned: string[] = []
): GovernanceLedgers {
  const entry: CaseLawEntry = {
    id: generateId(),
    category,
    title,
    description,
    rootCause,
    resolution,
    lessonsLearned,
    severity,
    relatedTaskIds,
    timestamp: now(),
  }
  return { ...ledgers, caseLaw: [...ledgers.caseLaw, entry] }
}

export function searchCaseLaw(ledgers: GovernanceLedgers, query: string): CaseLawEntry[] {
  const q = query.toLowerCase()
  return ledgers.caseLaw.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.lessonsLearned.some(l => l.toLowerCase().includes(q))
  )
}

// ---------------------------------------------------------------------------
// Local Ledger (LEDGER_LOCAL.jsonl)
// ---------------------------------------------------------------------------

export function addLocalLedgerEntry(
  ledgers: GovernanceLedgers,
  type: LocalLedgerEntry['type'],
  amount: number,
  currency: LocalLedgerEntry['currency'],
  taskId: string,
  description: string,
  counterparty?: string,
  outcomeId?: string
): GovernanceLedgers {
  const entry: LocalLedgerEntry = {
    id: generateId(),
    type,
    amount,
    currency,
    counterparty,
    taskId,
    outcomeId,
    description,
    timestamp: now(),
  }
  return { ...ledgers, localLedger: [...ledgers.localLedger, entry] }
}

export function getBalance(ledgers: GovernanceLedgers, currency: LocalLedgerEntry['currency']): number {
  return ledgers.localLedger
    .filter(e => e.currency === currency)
    .reduce((sum, e) => sum + e.amount, 0)
}

export function getLedgerSummary(ledgers: GovernanceLedgers) {
  return {
    evidenceCount: ledgers.evidence.length,
    activeEvidence: getActiveEvidence(ledgers).length,
    highGradeEvidence: getEvidenceByGrade(ledgers, 'H1').length,
    valueAssessments: ledgers.value.length,
    openDebts: getOpenDebts(ledgers).length,
    totalDebts: ledgers.debt.length,
    temporalEntries: ledgers.temporal.length,
    expiredTemporal: ledgers.temporal.filter(t => t.status === 'expired').length,
    caseLawEntries: ledgers.caseLaw.length,
    transactionCount: ledgers.localLedger.length,
    simBalance: getBalance(ledgers, 'SIM'),
    testBalance: getBalance(ledgers, 'TEST'),
  }
}
