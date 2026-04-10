import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Module imports (path aliases configured in vitest.config.ts)
// ---------------------------------------------------------------------------

import {
  createDefaultConstitution,
  validateConstitution,
  getPermissionLevelForAction,
  completeMilestone,
  updateValueWeights,
} from '@/lib/v6/constitution';

import {
  createTask,
  advanceTaskPhase,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
} from '@/lib/v6/engine';

import {
  createEmptyLedgers,
  addEvidence,
  getEvidenceByGrade,
  addValueAssessment,
  getBalance,
  getLedgerSummary,
  addLocalLedgerEntry,
} from '@/lib/v6/ledger';

import {
  generateOutcomeReport,
  evaluateOutcome,
  settleOutcome,
  createDefaultOracleRules,
} from '@/lib/v6/oracle';

import {
  createDefaultFuseMatrix,
  checkPermission,
  isFullyApproved,
  createPermissionRequest,
  addApproval,
} from '@/lib/v6/fuse-matrix';

import {
  createInitialNodeStatus,
  checkPromotionEligibility,
  promoteNode,
  STAGE_CONFIG,
} from '@/lib/v6/promotion';

import type {
  Constitution,
  GovernanceLedgers,
  TrinityTask,
  PermissionLevel,
} from '@/types/v6';

// ============================================================================
// 1. Constitution
// ============================================================================

describe('Constitution', () => {
  it('createDefaultConstitution returns valid constitution with goals', () => {
    const c = createDefaultConstitution();
    expect(c.goals.length).toBeGreaterThanOrEqual(1);
    expect(c.goals[0].milestones.length).toBeGreaterThanOrEqual(1);
    expect(c.version).toBe('6.0.0');
  });

  it('createDefaultConstitution returns constraints', () => {
    const c = createDefaultConstitution();
    expect(c.constraints.length).toBeGreaterThanOrEqual(1);
    expect(c.constraints.every(con => typeof con.id === 'string')).toBe(true);
  });

  it('createDefaultConstitution values sum to 100', () => {
    const c = createDefaultConstitution();
    const total = c.values.reduce((s, v) => s + v.weight, 0);
    expect(total).toBe(100);
  });

  it('createDefaultConstitution includes authority rules for L0 through L4', () => {
    const c = createDefaultConstitution();
    const levels = new Set(c.authority.map(a => a.permissionLevel));
    expect(levels.has('L0')).toBe(true);
    expect(levels.has('L1')).toBe(true);
    expect(levels.has('L2')).toBe(true);
    expect(levels.has('L3')).toBe(true);
    expect(levels.has('L4')).toBe(true);
  });

  it('validateConstitution returns no errors for a valid constitution', () => {
    const c = createDefaultConstitution();
    const errors = validateConstitution(c);
    expect(errors).toEqual([]);
  });

  it('validateConstitution catches missing goals', () => {
    const c = createDefaultConstitution();
    const bad: Constitution = { ...c, goals: [] };
    const errors = validateConstitution(bad);
    expect(errors).toContain('At least one goal is required');
  });

  it('validateConstitution catches wrong weight sums', () => {
    const c = createDefaultConstitution();
    const bad: Constitution = {
      ...c,
      values: c.values.map((v, i) => (i === 0 ? { ...v, weight: 99 } : v)),
    };
    const errors = validateConstitution(bad);
    expect(errors.some(e => e.includes('Value weights must sum to 100'))).toBe(true);
  });

  it('validateConstitution catches missing L4 rule', () => {
    const c = createDefaultConstitution();
    const bad: Constitution = {
      ...c,
      authority: c.authority.filter(a => a.permissionLevel !== 'L4'),
    };
    const errors = validateConstitution(bad);
    expect(errors).toContain('Missing authority rule for permission level L4');
  });

  it('getPermissionLevelForAction returns L0 for write-log', () => {
    const c = createDefaultConstitution();
    expect(getPermissionLevelForAction(c, 'write-log')).toBe('L0');
  });

  it('getPermissionLevelForAction returns L4 for bypass-constraint', () => {
    const c = createDefaultConstitution();
    expect(getPermissionLevelForAction(c, 'bypass-constraint')).toBe('L4');
  });

  it('getPermissionLevelForAction returns L0 default for unknown action', () => {
    const c = createDefaultConstitution();
    // BUG-14 fix: unmatched actions default to L0 (auto-execute) for internal simulation
    expect(getPermissionLevelForAction(c, 'totally-unknown-action')).toBe('L0');
  });

  it('completeMilestone marks the target milestone as completed', () => {
    const c = createDefaultConstitution();
    const goalId = c.goals[0].id;
    const milestoneId = c.goals[0].milestones[0].id;

    const updated = completeMilestone(c, goalId, milestoneId);
    const milestone = updated.goals[0].milestones.find(m => m.id === milestoneId);
    expect(milestone?.completed).toBe(true);
    expect(milestone?.completedAt).toBeDefined();
  });

  it('updateValueWeights throws when weights do not sum to 100', () => {
    const c = createDefaultConstitution();
    const badValues = c.values.map((v, i) => (i === 0 ? { ...v, weight: 1 } : v));
    expect(() => updateValueWeights(c, badValues)).toThrow('Value weights must sum to 100');
  });
});

// ============================================================================
// 2. Engine
// ============================================================================

describe('Engine', () => {
  it('createTask creates a task with correct defaults', () => {
    const task = createTask('Test Task', 'A simple test');
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('A simple test');
    expect(task.phase).toBe('proposal');
    expect(task.status).toBe('draft');
    expect(task.priority).toBe(5);
    expect(task.createdBy).toBe('ai1-expander');
    expect(task.permissionLevel).toBe('L0');
    expect(task.outputs).toEqual([]);
    expect(task.id).toBeDefined();
  });

  it('advanceTaskPhase transitions proposal to audit', () => {
    const task = createTask('Test', 'desc');
    const next = advanceTaskPhase(task);
    expect(next.phase).toBe('audit');
    expect(next.status).toBe('pending-audit');
  });

  it('advanceTaskPhase transitions through full pipeline', () => {
    let task = createTask('Pipeline', 'full flow');
    const expectedPhases: Array<{ phase: string; status: string }> = [
      { phase: 'audit', status: 'pending-audit' },
      { phase: 'approval', status: 'pending-approval' },
      { phase: 'execution', status: 'executing' },
      { phase: 'review', status: 'completed' },
      { phase: 'settled', status: 'completed' },
    ];

    for (const expected of expectedPhases) {
      task = advanceTaskPhase(task);
      expect(task.phase).toBe(expected.phase);
      expect(task.status).toBe(expected.status);
    }
  });

  it('advanceTaskPhase does not advance past settled', () => {
    let task = createTask('Terminal', 'test');
    // Advance all the way to settled
    for (let i = 0; i < 6; i++) task = advanceTaskPhase(task);
    const stuck = advanceTaskPhase(task);
    expect(stuck.phase).toBe('settled');
  });

  it('runProposalPhase adds output and advances to audit', () => {
    const task = createTask('Propose', 'proposal test');
    const result = runProposalPhase(task, 'Here is my proposal');
    expect(result.blocked).toBe(false);
    expect(result.task.phase).toBe('audit');
    expect(result.task.outputs.length).toBe(1);
    expect(result.task.outputs[0].type).toBe('task-draft');
    expect(result.events.length).toBeGreaterThanOrEqual(1);
  });

  it('runAuditPhase blocks on critical risk', () => {
    const constitution = createDefaultConstitution();
    let task = createTask('Safe Task', 'no risk');
    task = advanceTaskPhase(task); // move to audit

    const result = runAuditPhase(task, constitution, 'Extremely dangerous', 'critical');
    expect(result.blocked).toBe(true);
    expect(result.task.status).toBe('blocked');
  });

  it('runAuditPhase blocks on L4 actions', () => {
    const constitution = createDefaultConstitution();
    // Title matching an L4 pattern
    let task = createTask('bypass-constraint operation', 'forbidden');
    task = advanceTaskPhase(task); // move to audit

    const result = runAuditPhase(task, constitution, 'Audit complete', 'low');
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('L4');
  });

  it('runAuditPhase advances on low risk', () => {
    const constitution = createDefaultConstitution();
    let task = createTask('write-log entry', 'safe action');
    task = advanceTaskPhase(task); // move to audit

    const result = runAuditPhase(task, constitution, 'All clear', 'low');
    expect(result.blocked).toBe(false);
    expect(result.task.phase).toBe('approval');
  });

  it('runApprovalPhase blocks when denied', () => {
    const constitution = createDefaultConstitution();
    let task = createTask('Denied Task', 'will be denied');
    task = advanceTaskPhase(task); // audit
    task = advanceTaskPhase(task); // approval

    const result = runApprovalPhase(task, constitution, false);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('denied');
  });

  it('runApprovalPhase requires human for L3 permission level', () => {
    const constitution = createDefaultConstitution();
    let task = createTask('real-wallet transfer', 'high risk');
    task = { ...task, permissionLevel: 'L3' as PermissionLevel };
    task = advanceTaskPhase(task); // audit
    task = advanceTaskPhase(task); // approval

    const result = runApprovalPhase(task, constitution, true, 1000);
    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('human');
    expect(result.permissionRequired).toBe('L3');
  });
});

// ============================================================================
// 3. Ledger
// ============================================================================

describe('Ledger', () => {
  it('createEmptyLedgers returns 6 empty arrays', () => {
    const ledgers = createEmptyLedgers();
    expect(ledgers.evidence).toEqual([]);
    expect(ledgers.value).toEqual([]);
    expect(ledgers.debt).toEqual([]);
    expect(ledgers.temporal).toEqual([]);
    expect(ledgers.caseLaw).toEqual([]);
    expect(ledgers.localLedger).toEqual([]);
  });

  it('addEvidence adds entry with correct fields', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'Test conclusion', 'unit-test', 'H2', 'ai2-auditor', 'task-1', ['test']);

    expect(ledgers.evidence.length).toBe(1);
    const entry = ledgers.evidence[0];
    expect(entry.conclusion).toBe('Test conclusion');
    expect(entry.source).toBe('unit-test');
    expect(entry.grade).toBe('H2');
    expect(entry.verifier).toBe('ai2-auditor');
    expect(entry.taskId).toBe('task-1');
    expect(entry.tags).toEqual(['test']);
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeDefined();
  });

  it('getEvidenceByGrade filters by minimum grade', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'Low', 'src', 'H4', 'ai2-auditor', 't1');
    ledgers = addEvidence(ledgers, 'Mid', 'src', 'H3', 'ai2-auditor', 't2');
    ledgers = addEvidence(ledgers, 'High', 'src', 'H2', 'ai2-auditor', 't3');
    ledgers = addEvidence(ledgers, 'Best', 'src', 'H1', 'ai2-auditor', 't4');

    const h2Plus = getEvidenceByGrade(ledgers, 'H2');
    expect(h2Plus.length).toBe(2); // H1 and H2 only

    const h3Plus = getEvidenceByGrade(ledgers, 'H3');
    expect(h3Plus.length).toBe(3); // H1, H2, H3

    const allGrades = getEvidenceByGrade(ledgers, 'H4');
    expect(allGrades.length).toBe(4);
  });

  it('addValueAssessment calculates priority', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addValueAssessment(ledgers, 'task-1', 80, 200, 100, 20);

    expect(ledgers.value.length).toBe(1);
    const entry = ledgers.value[0];
    expect(entry.taskId).toBe('task-1');
    expect(entry.priority).toBeGreaterThan(0);
    expect(entry.priority).toBeLessThanOrEqual(100);
  });

  it('getBalance sums correctly', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', 100, 'SIM', 't1', 'earn');
    ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', 50, 'SIM', 't2', 'earn');
    ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', -30, 'SIM', 't3', 'spend');
    ledgers = addLocalLedgerEntry(ledgers, 'testnet-settle', 200, 'TEST', 't4', 'settle');

    expect(getBalance(ledgers, 'SIM')).toBe(120);
    expect(getBalance(ledgers, 'TEST')).toBe(200);
    expect(getBalance(ledgers, 'REAL')).toBe(0);
  });

  it('getLedgerSummary returns correct counts', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'E1', 'src', 'H1', 'ai2-auditor', 't1');
    ledgers = addEvidence(ledgers, 'E2', 'src', 'H3', 'ai2-auditor', 't2');
    ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', 50, 'SIM', 't1', 'credit');

    const summary = getLedgerSummary(ledgers);
    expect(summary.evidenceCount).toBe(2);
    expect(summary.highGradeEvidence).toBe(1); // only H1
    expect(summary.transactionCount).toBe(1);
    expect(summary.simBalance).toBe(50);
    expect(summary.testBalance).toBe(0);
  });
});

// ============================================================================
// 4. Oracle
// ============================================================================

describe('Oracle', () => {
  function makeSettledTask(): TrinityTask {
    const task = createTask('Test outcome', 'testing oracle');
    return { ...task, phase: 'review' as const, status: 'completed' as const };
  }

  it('generateOutcomeReport creates a report with a hash', () => {
    const task = makeSettledTask();
    const report = generateOutcomeReport(task, 'Task succeeded', 'automated', 'H2');

    expect(report.taskId).toBe(task.id);
    expect(report.actualResult).toBe('Task succeeded');
    expect(report.verificationMethod).toBe('automated');
    expect(report.evidenceGrade).toBe('H2');
    expect(report.reconciliationHash).toBeDefined();
    expect(report.reconciliationHash.startsWith('0x')).toBe(true);
    expect(report.oracleVerdict).toBe('pending-review');
    expect(report.settleable).toBe(false);
  });

  it('evaluateOutcome returns rejected when evidence is insufficient', () => {
    const task = makeSettledTask();
    const report = generateOutcomeReport(task, 'Result', 'automated', 'H4');
    const rules = createDefaultOracleRules();
    const ledgers = createEmptyLedgers(); // no evidence at all

    const evaluated = evaluateOutcome(report, rules, ledgers);
    expect(evaluated.oracleVerdict).toBe('rejected');
    expect(evaluated.settleable).toBe(false);
    expect(evaluated.creditTarget).toBe('rejected');
  });

  it('evaluateOutcome returns settleable when criteria met for local', () => {
    const task = makeSettledTask();
    const report = generateOutcomeReport(task, 'Good result', 'automated', 'H3');
    const rules = createDefaultOracleRules();

    // Add enough evidence to meet the local rule (minVerifications: 1, minGrade: H3)
    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'verified', 'test', 'H3', 'ai2-auditor', task.id);

    const evaluated = evaluateOutcome(report, rules, ledgers);
    expect(evaluated.oracleVerdict).toBe('settleable');
    expect(evaluated.settleable).toBe(true);
    expect(evaluated.creditTarget).toBe('local');
  });

  it('settleOutcome throws on non-settleable outcomes', () => {
    const task = makeSettledTask();
    const report = generateOutcomeReport(task, 'Result', 'automated', 'H4');
    // report.settleable is false by default
    expect(() => settleOutcome(report)).toThrow('not settleable');
  });

  it('settleOutcome succeeds for a settleable outcome', () => {
    const task = makeSettledTask();
    const report = generateOutcomeReport(task, 'Good result', 'automated', 'H3');
    const rules = createDefaultOracleRules();

    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'proof', 'test', 'H3', 'ai2-auditor', task.id);

    const evaluated = evaluateOutcome(report, rules, ledgers);
    const settled = settleOutcome(evaluated);
    expect(settled.settledAt).toBeDefined();
  });
});

// ============================================================================
// 5. Fuse Matrix
// ============================================================================

describe('Fuse Matrix', () => {
  it('createDefaultFuseMatrix has 5 levels', () => {
    const matrix = createDefaultFuseMatrix();
    expect(matrix.length).toBe(5);
    const levels = matrix.map(f => f.level);
    expect(levels).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
  });

  it('checkPermission returns allowed:true for L0', () => {
    const matrix = createDefaultFuseMatrix();
    const result = checkPermission(matrix, 'L0');
    expect(result.allowed).toBe(true);
    expect(result.fuse.autoExecute).toBe(true);
  });

  it('checkPermission returns forbidden for L4', () => {
    const matrix = createDefaultFuseMatrix();
    const result = checkPermission(matrix, 'L4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('permanently forbidden');
  });

  it('checkPermission requires approval for L1', () => {
    const matrix = createDefaultFuseMatrix();
    const result = checkPermission(matrix, 'L1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('approval');
  });

  it('isFullyApproved checks all required approvals for L2', () => {
    const matrix = createDefaultFuseMatrix();
    let request = createPermissionRequest('task-1', 'ai1-expander', 'L2', 'testnet-transfer', 'Move test tokens');

    // Not approved yet
    expect(isFullyApproved(request, matrix)).toBe(false);

    // L2 approvalRequirements are ['ai2', 'ai3'] (ApprovalRequirement short names).
    // addApproval types its approver as TrinityRole | 'human', but isFullyApproved
    // matches against the short-form ApprovalRequirement values. We cast to satisfy
    // both the runtime matching and the TypeScript signature.
    request = addApproval(request, 'ai2' as TrinityRole, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(false);

    request = addApproval(request, 'ai3' as TrinityRole, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(true);
  });

  it('isFullyApproved requires human for L3', () => {
    const matrix = createDefaultFuseMatrix();
    let request = createPermissionRequest('task-2', 'ai1-expander', 'L3', 'real-wallet', 'Send funds');

    // L3 requires ['ai2', 'ai3', 'human']
    request = addApproval(request, 'ai2' as TrinityRole, 'approve');
    request = addApproval(request, 'ai3' as TrinityRole, 'approve');
    // Still missing human
    expect(isFullyApproved(request, matrix)).toBe(false);

    request = addApproval(request, 'human', 'approve');
    expect(isFullyApproved(request, matrix)).toBe(true);
  });

  it('addApproval with deny immediately denies the request', () => {
    let request = createPermissionRequest('task-3', 'ai1-expander', 'L1', 'read-query', 'Read data');
    request = addApproval(request, 'ai2-auditor', 'deny', 'Too risky');
    expect(request.status).toBe('denied');
    expect(request.resolvedAt).toBeDefined();
  });
});

// ============================================================================
// 6. Promotion
// ============================================================================

describe('Promotion', () => {
  it('createInitialNodeStatus starts at stage-0', () => {
    const status = createInitialNodeStatus();
    expect(status.currentStage).toBe('stage-0');
    expect(status.stageLabel).toBe('模拟节点');
    expect(status.history).toEqual([]);
    expect(status.metrics.totalTasks).toBe(0);
    expect(status.promotionProgress.outcomesAchieved).toBe(0);
  });

  it('STAGE_CONFIG has all 5 stages defined', () => {
    const stages = Object.keys(STAGE_CONFIG);
    expect(stages).toEqual(['stage-0', 'stage-1', 'stage-2', 'stage-3', 'stage-4']);
  });

  it('checkPromotionEligibility returns not eligible when scores too low', () => {
    const status = createInitialNodeStatus();
    const outcomes: never[] = [];
    const ledgers = createEmptyLedgers();
    const requests: never[] = [];

    const result = checkPromotionEligibility(status, outcomes, ledgers, requests);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some(r => r.includes('outcomes'))).toBe(true);
  });

  it('promoteNode advances to next stage', () => {
    const status = createInitialNodeStatus();
    const promoted = promoteNode(status);
    expect(promoted.currentStage).toBe('stage-1');
    expect(promoted.stageLabel).toBe('测试网节点');
    expect(promoted.history.length).toBe(1);
    expect(promoted.history[0].fromStage).toBe('stage-0');
    expect(promoted.history[0].toStage).toBe('stage-1');
  });

  it('promoteNode does not advance past stage-4', () => {
    let status = createInitialNodeStatus();
    // Promote through all stages
    for (let i = 0; i < 5; i++) {
      status = promoteNode(status);
    }
    expect(status.currentStage).toBe('stage-4');
    const stuck = promoteNode(status);
    expect(stuck.currentStage).toBe('stage-4');
    expect(stuck.history.length).toBe(status.history.length); // no new event
  });
});
