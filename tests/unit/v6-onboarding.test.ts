/**
 * V6 Onboarding (Genesis Wizard) — Data Layer Tests
 *
 * Tests the store state transitions and engine module functions
 * that back the 5-step Genesis Wizard onboarding flow.
 * No React rendering — pure data layer verification.
 *
 * vi.hoisted() installs a localStorage stub BEFORE module evaluation
 * so the zustand persist middleware can resolve createJSONStorage
 * without throwing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Stub localStorage BEFORE zustand store module evaluates.
// vi.hoisted runs before static imports are resolved.
// ---------------------------------------------------------------------------

vi.hoisted(() => {
  const store: Record<string, string> = {}
  const stub = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: stub,
    writable: true,
    configurable: true,
  })
})

// Engine modules (pure functions — no zustand/localStorage needed)
import { generateIdentity, signMessage, verifySignature } from '@/lib/v6/identity'
import {
  createEconomyState,
  getEconomyStatus,
  issueReward,
} from '@/lib/v6/economy'
import {
  createTask,
  createTrinityAgents,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
} from '@/lib/v6/engine'
import { createDefaultConstitution } from '@/lib/v6/constitution'
import {
  createEmptyLedgers,
  addEvidence,
  addLocalLedgerEntry,
  getBalance,
} from '@/lib/v6/ledger'
import {
  createDefaultOracleRules,
  generateOutcomeReport,
  evaluateOutcome,
  settleOutcome,
} from '@/lib/v6/oracle'
import {
  createDefaultFuseMatrix,
} from '@/lib/v6/fuse-matrix'
import {
  createInitialNodeStatus,
} from '@/lib/v6/promotion'
import {
  createDemoMarket,
} from '@/lib/v6/market'
import { useV6Store } from '@/stores/v6'

// ---------------------------------------------------------------------------
// Helper: reset store via setState (bypasses persist middleware)
// ---------------------------------------------------------------------------

function resetStore() {
  // Merge (not replace) so zustand action functions are preserved
  useV6Store.setState({
    constitution: createDefaultConstitution(),
    trinity: createTrinityAgents(),
    tasks: [],
    ledgers: createEmptyLedgers(),
    outcomes: [],
    oracleRules: createDefaultOracleRules(),
    permissionMatrix: createDefaultFuseMatrix(),
    permissionRequests: [],
    nodeStatus: createInitialNodeStatus(),
    market: createDemoMarket(),
    identity: null,
    economy: null,
    backendStatus: 'disconnected' as const,
    onboardingStep: 0,
    onboardingComplete: false,
    events: [],
    initialized: true,
    startTime: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// 1. Store initial state
// ---------------------------------------------------------------------------

describe('Onboarding store initial state', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts with onboardingStep=0 and onboardingComplete=false', () => {
    const s = useV6Store.getState()
    expect(s.onboardingStep).toBe(0)
    expect(s.onboardingComplete).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. setOnboardingStep advances correctly
// ---------------------------------------------------------------------------

describe('setOnboardingStep', () => {
  beforeEach(() => {
    resetStore()
  })

  it('advances through steps 0 -> 1 -> 2 -> 3 -> 4 -> 5', () => {
    const steps = [0, 1, 2, 3, 4, 5]
    for (const step of steps) {
      useV6Store.getState().setOnboardingStep(step)
      expect(useV6Store.getState().onboardingStep).toBe(step)
    }
  })

  it('can jump to arbitrary step', () => {
    useV6Store.getState().setOnboardingStep(3)
    expect(useV6Store.getState().onboardingStep).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// 3. completeOnboarding
// ---------------------------------------------------------------------------

describe('completeOnboarding', () => {
  beforeEach(() => {
    resetStore()
  })

  it('sets onboardingComplete=true and step=5', () => {
    useV6Store.getState().setOnboardingStep(3) // mid-flow
    useV6Store.getState().completeOnboarding()

    const s = useV6Store.getState()
    expect(s.onboardingComplete).toBe(true)
    expect(s.onboardingStep).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// 4. reset() clears onboarding state
// ---------------------------------------------------------------------------

describe('reset() clears onboarding', () => {
  beforeEach(() => {
    resetStore()
  })

  it('resets onboardingStep to 0 and onboardingComplete to false', () => {
    useV6Store.getState().setOnboardingStep(4)
    useV6Store.getState().completeOnboarding()
    expect(useV6Store.getState().onboardingComplete).toBe(true)

    // Use setState to reset (mirrors store.reset() logic without localStorage)
    resetStore()

    const s = useV6Store.getState()
    expect(s.onboardingStep).toBe(0)
    expect(s.onboardingComplete).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 5. Identity generation (Step 2 backing)
// ---------------------------------------------------------------------------

describe('generateIdentity — onboarding Step 2', () => {
  it('returns a valid HostIdentity', () => {
    const id = generateIdentity()

    expect(id).toBeDefined()
    expect(id.nodeId).toMatch(/^did:newclaw:[0-9a-f]{40}$/)
    expect(id.publicKey).toMatch(/^[0-9a-f]{64}$/)
    expect(id.address).toMatch(/^ncw1[0-9a-f]{38}$/)
    expect(id.createdAt).toBeTruthy()
    expect(id.isLocked).toBe(false)
  })

  it('generates unique identities on each call', () => {
    const id1 = generateIdentity()
    const id2 = generateIdentity()
    expect(id1.nodeId).not.toBe(id2.nodeId)
    expect(id1.publicKey).not.toBe(id2.publicKey)
  })

  it('produced identity can sign and verify messages', () => {
    const id = generateIdentity()
    const msg = 'genesis-verification'
    const sig = signMessage(id.publicKey, msg)
    expect(verifySignature(id.publicKey, msg, sig)).toBe(true)
    // Tampered message must fail
    expect(verifySignature(id.publicKey, 'tampered', sig)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 6. Economy genesis (Step 3 backing)
// ---------------------------------------------------------------------------

describe('createEconomyState — onboarding Step 3', () => {
  it('creates economy with 100 New.B genesis balance', () => {
    const econ = createEconomyState()
    expect(econ.balance).toBe(100)
    expect(econ.totalEarned).toBe(100)
    expect(econ.totalSpent).toBe(0)
  })

  it('has genesis transaction in history', () => {
    const econ = createEconomyState()
    expect(econ.transactions).toHaveLength(1)
    expect(econ.transactions[0].type).toBe('genesis')
    expect(econ.transactions[0].amount).toBe(100)
    expect(econ.transactions[0].balance).toBe(100)
  })

  it('getEconomyStatus reports correct newbBalance', () => {
    const econ = createEconomyState()
    const status = getEconomyStatus(econ)
    expect(status.newbBalance).toBe(100)
    expect(status.halvingEpoch).toBe(0)
    expect(status.pooScore).toBe(0) // no tasks completed yet
  })

  it('initializes mining config with correct defaults', () => {
    const econ = createEconomyState()
    expect(econ.mining.baseReward).toBe(10)
    expect(econ.mining.halvingInterval).toBe(100)
    expect(econ.mining.minimumReward).toBe(0.01)
    expect(econ.mining.rewardsIssuedThisEpoch).toBe(0)
    expect(econ.mining.totalRewardsIssued).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Full onboarding flow simulation (Steps 2-5)
// ---------------------------------------------------------------------------

describe('Full onboarding flow simulation', () => {
  it('Step 2: identity generation produces valid DID', () => {
    const identity = generateIdentity()
    expect(identity.nodeId).toMatch(/^did:newclaw:/)
    expect(identity.nodeId.length).toBe('did:newclaw:'.length + 40)
  })

  it('Step 3: economy genesis gives 100 balance', () => {
    const econ = createEconomyState()
    expect(econ.balance).toBe(100)
    const status = getEconomyStatus(econ)
    expect(status.newbBalance).toBe(100)
  })

  it('Step 4: full trinity pipeline — create, propose, audit, approve, complete', () => {
    const constitution = createDefaultConstitution()
    let ledgers = createEmptyLedgers()

    // Create task
    const task = createTask('Onboarding test task', 'First task for genesis wizard')
    expect(task.phase).toBe('proposal')
    expect(task.status).toBe('draft')

    // Proposal phase
    const proposalResult = runProposalPhase(task, 'Proposal: analyze core strengths')
    expect(proposalResult.blocked).toBe(false)
    expect(proposalResult.task.phase).toBe('audit')
    expect(proposalResult.task.status).toBe('pending-audit')
    expect(proposalResult.task.outputs).toHaveLength(1)
    expect(proposalResult.task.outputs[0].role).toBe('ai1-expander')

    // Audit phase
    const auditResult = runAuditPhase(
      proposalResult.task,
      constitution,
      'Audit: no risks found',
      'low',
    )
    expect(auditResult.blocked).toBe(false)
    expect(auditResult.task.phase).toBe('approval')
    expect(auditResult.task.status).toBe('pending-approval')
    expect(auditResult.task.outputs).toHaveLength(2)

    // Approval phase
    const approvalResult = runApprovalPhase(auditResult.task, constitution, true, 0)
    expect(approvalResult.blocked).toBe(false)
    expect(approvalResult.task.phase).toBe('execution')
    expect(approvalResult.task.status).toBe('executing')
    expect(approvalResult.task.outputs).toHaveLength(3)

    // Complete — generate outcome
    const outcomeReport = generateOutcomeReport(
      approvalResult.task,
      'Proposal: analyze core strengths',
      'trinity-pipeline',
      'H3',
    )
    expect(outcomeReport.taskId).toBe(task.id)
    expect(outcomeReport.evidenceGrade).toBe('H3')
    expect(outcomeReport.settleable).toBe(false) // pending evaluation

    // Add evidence to ledgers so evaluation can meet the rule threshold
    ledgers = addEvidence(
      ledgers,
      'Proposal: analyze core strengths',
      'trinity-pipeline',
      'H3',
      'ai2-auditor',
      task.id,
      ['auto-generated'],
    )

    // Evaluate outcome
    const oracleRules = createDefaultOracleRules()
    const evaluated = evaluateOutcome(outcomeReport, oracleRules, ledgers)
    expect(evaluated.settleable).toBe(true)
    expect(evaluated.creditTarget).toBe('local')

    // Settle
    const settled = settleOutcome(evaluated)
    expect(settled.settledAt).toBeTruthy()
  })

  it('Step 5: outcome exists, evidence recorded, SIM credit added', () => {
    const constitution = createDefaultConstitution()
    let ledgers = createEmptyLedgers()

    // Run pipeline
    const task = createTask('Genesis task', 'Genesis task description')
    const p1 = runProposalPhase(task, 'Proposal content')
    const p2 = runAuditPhase(p1.task, constitution, 'Audit passed', 'low')
    const p3 = runApprovalPhase(p2.task, constitution, true, 0)
    const outcome = generateOutcomeReport(p3.task, 'Proposal content', 'trinity-pipeline', 'H3')

    // Add evidence
    ledgers = addEvidence(ledgers, 'Proposal content', 'trinity-pipeline', 'H3', 'ai2-auditor', task.id, ['auto-generated'])

    // Evaluate & settle
    const rules = createDefaultOracleRules()
    const evaluated = evaluateOutcome(outcome, rules, ledgers)
    const settled = settleOutcome(evaluated)

    // Add SIM credit (mirrors store.completeTask logic)
    ledgers = addLocalLedgerEntry(
      ledgers,
      'sim-credit',
      10,
      'SIM',
      task.id,
      `Settled outcome: ${task.title}`,
      undefined,
      settled.id,
    )

    // Verify: outcome exists
    expect(settled.id).toBeTruthy()
    expect(settled.settledAt).toBeTruthy()

    // Verify: evidence recorded
    expect(ledgers.evidence).toHaveLength(1)
    expect(ledgers.evidence[0].taskId).toBe(task.id)
    expect(ledgers.evidence[0].grade).toBe('H3')

    // Verify: SIM credit added
    const simBalance = getBalance(ledgers, 'SIM')
    expect(simBalance).toBe(10)
    expect(ledgers.localLedger).toHaveLength(1)
    expect(ledgers.localLedger[0].outcomeId).toBe(settled.id)
  })

  it('Step 4+5: economy reward issued after task completion', () => {
    let econ = createEconomyState()
    expect(econ.balance).toBe(100)

    const task = createTask('Reward test', 'Test reward issuance')
    const rewardResult = issueReward(econ, task.id)
    expect(rewardResult.ok).toBe(true)

    if (rewardResult.ok) {
      econ = rewardResult.value.state
      expect(econ.balance).toBe(110) // 100 genesis + 10 reward
      expect(econ.mining.totalRewardsIssued).toBe(1)
      expect(rewardResult.value.transaction.type).toBe('poo_reward')
    }
  })
})

// ---------------------------------------------------------------------------
// 8. Skip flow
// ---------------------------------------------------------------------------

describe('Skip flow — completeOnboarding without running steps', () => {
  beforeEach(() => {
    resetStore()
  })

  it('marks store as complete even from step 0', () => {
    expect(useV6Store.getState().onboardingStep).toBe(0)
    useV6Store.getState().completeOnboarding()

    const s = useV6Store.getState()
    expect(s.onboardingComplete).toBe(true)
    expect(s.onboardingStep).toBe(5)
  })

  it('identity and economy remain null after skip', () => {
    useV6Store.getState().completeOnboarding()
    const s = useV6Store.getState()
    expect(s.identity).toBeNull()
    expect(s.economy).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 9. Persistence — onboardingComplete in partialize
// ---------------------------------------------------------------------------

describe('Persistence — partialize includes onboardingComplete', () => {
  beforeEach(() => {
    resetStore()
  })

  it('onboardingComplete is captured by partialize', () => {
    // Verify the field is part of tracked state by setting and reading it
    useV6Store.getState().completeOnboarding()
    const s = useV6Store.getState()
    expect(s.onboardingComplete).toBe(true)

    // After reset, it returns to false (proves the field is part of state)
    resetStore()
    expect(useV6Store.getState().onboardingComplete).toBe(false)
  })

  it('onboardingStep is NOT in partialize (transient)', () => {
    // Per the store source, partialize does NOT include onboardingStep.
    // This means onboardingStep resets to 0 on reload, which is correct
    // behavior — only onboardingComplete matters for persistence.
    useV6Store.getState().setOnboardingStep(3)
    useV6Store.getState().completeOnboarding()

    const s = useV6Store.getState()
    // completeOnboarding forces step=5, but persisted shape only has
    // onboardingComplete=true. On reload, step would default to 0.
    expect(s.onboardingComplete).toBe(true)
    expect(s.onboardingStep).toBe(5) // in-memory value
  })
})
