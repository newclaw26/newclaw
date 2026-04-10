/**
 * V6 Functional Verification Tests
 *
 * End-to-end tests that exercise every user-facing feature through
 * the Zustand store (useV6Store).  Each suite corresponds to a view
 * in the NewClaw V6 Trinity interface.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock zustand/middleware so the persist wrapper becomes a transparent
// pass-through.  This avoids localStorage issues in the test environment
// while still exercising all real store logic.
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual<typeof import('zustand/middleware')>('zustand/middleware');
  return {
    ...actual,
    persist: (fn: Function) => fn,
    createJSONStorage: () => undefined,
  };
});

import { useV6Store } from '@/stores/v6';
import { searchCaseLaw, getBalance } from '@/lib/v6/ledger';
import { createDemoMarket } from '@/lib/v6/market';
import type { EvidenceGrade } from '@/types/v6';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Full reset including market (which the store's reset() omits).
 */
function resetStore() {
  useV6Store.getState().reset();
  useV6Store.setState({ market: createDemoMarket() });
}

/** Shortcut to get current store state. */
function state() {
  return useV6Store.getState();
}

/**
 * Run a task through the full pipeline:
 *   create -> proposal -> audit -> approval -> complete
 *
 * The store's completeTask evaluates the outcome BEFORE adding new evidence.
 * To obtain a settleable outcome the evidence ledger must already contain at
 * least one entry at `evidenceGrade` for the task.  This helper pre-populates
 * that evidence when the grade is H3 or better.
 */
function runFullPipeline(
  title: string,
  evidenceGrade: EvidenceGrade = 'H3',
): string {
  const task = state().createNewTask(title, `Description for ${title}`);
  state().submitProposal(task.id, `Proposal content for ${title}`);
  state().submitAudit(task.id, 'All clear', 'low');
  state().submitApproval(task.id, true, 100);

  // Pre-populate evidence so the oracle can settle (local rule: 1x H3+)
  if (evidenceGrade !== 'H4') {
    state().addEvidenceEntry(`Pre-verification for ${title}`, 'pipeline', evidenceGrade, task.id, ['pre-verify']);
  }

  state().completeTask(task.id, `Result of ${title}`, evidenceGrade);
  return task.id;
}

// ============================================================================
// Suite 1: Dashboard - Task Creation & Pipeline Flow
// ============================================================================

describe('Suite 1: Dashboard - Task Creation & Pipeline Flow', () => {
  beforeEach(resetStore);

  it('1.1 - createNewTask adds a task to store.tasks', () => {
    const task = state().createNewTask('Test Task', 'A description');

    const found = state().tasks.find(t => t.id === task.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Test Task');
    expect(found!.status).toBe('draft');
    expect(found!.phase).toBe('proposal');
  });

  it('1.2 - submitProposal advances task to pending-audit', () => {
    const task = state().createNewTask('Proposal Task', 'desc');
    state().submitProposal(task.id, 'My proposal content');

    const updated = state().tasks.find(t => t.id === task.id)!;
    expect(updated.phase).toBe('audit');
    expect(updated.status).toBe('pending-audit');
    expect(updated.outputs.length).toBeGreaterThanOrEqual(1);
    expect(updated.outputs.some(o => o.type === 'task-draft')).toBe(true);
  });

  it('1.3 - submitAudit advances task to pending-approval', () => {
    const task = state().createNewTask('Audit Task', 'desc');
    state().submitProposal(task.id, 'proposal');
    state().submitAudit(task.id, 'Audit findings OK', 'low');

    const updated = state().tasks.find(t => t.id === task.id)!;
    expect(updated.phase).toBe('approval');
    expect(updated.status).toBe('pending-approval');
    expect(updated.outputs.some(o => o.type === 'audit-opinion')).toBe(true);
  });

  it('1.4 - submitApproval advances task to executing', () => {
    const task = state().createNewTask('Approval Task', 'desc');
    state().submitProposal(task.id, 'proposal');
    state().submitAudit(task.id, 'findings', 'low');
    state().submitApproval(task.id, true, 500);

    const updated = state().tasks.find(t => t.id === task.id)!;
    expect(updated.phase).toBe('execution');
    expect(updated.status).toBe('executing');
    expect(updated.outputs.some(o => o.type === 'task-charter')).toBe(true);
  });

  it('1.5 - completeTask sets completed status, creates outcome, evidence, ledger entry, and increases SIM balance', () => {
    const taskId = runFullPipeline('Complete Pipeline');

    const completedTask = state().tasks.find(t => t.id === taskId)!;
    expect(completedTask.status).toBe('completed');

    // Outcome created
    expect(state().outcomes.length).toBeGreaterThanOrEqual(1);
    const outcome = state().outcomes.find(o => o.taskId === taskId);
    expect(outcome).toBeDefined();
    expect(outcome!.oracleVerdict).toBe('settleable');

    // Evidence entries (pre-populated + auto-generated)
    const evidenceForTask = state().ledgers.evidence.filter(e => e.taskId === taskId);
    expect(evidenceForTask.length).toBeGreaterThanOrEqual(2);

    // Local ledger entry (SIM credit) for settleable outcome
    const simEntries = state().ledgers.localLedger.filter(
      e => e.currency === 'SIM' && e.taskId === taskId,
    );
    expect(simEntries.length).toBeGreaterThanOrEqual(1);

    // SIM balance should increase
    const simBalance = getBalance(state().ledgers, 'SIM');
    expect(simBalance).toBeGreaterThan(0);
  });

  it('1.6 - full pipeline emits correct events', () => {
    runFullPipeline('Event Test');

    const events = state().events;
    // We expect at least: task:created, trinity:output (proposal), trinity:output (audit),
    // trinity:output (approval), outcome:settled
    expect(events.length).toBeGreaterThanOrEqual(4);

    const types = events.map(e => e.type);
    expect(types).toContain('task:created');
    expect(types).toContain('outcome:settled');
  });
});

// ============================================================================
// Suite 2: Market - Full Purchase Flow
// ============================================================================

describe('Suite 2: Market - Full Purchase Flow', () => {
  beforeEach(resetStore);

  it('2.1 - demo market initializes with 3 listings', () => {
    const listings = state().market.listings;
    expect(listings.length).toBe(3);
    expect(listings.every(l => l.status === 'listed')).toBe(true);
  });

  it('2.2 - buyPlaybook decreases balance, marks sold, creates order and ledger entry', () => {
    const listingId = state().market.listings[0].id;
    const listingPrice = state().market.listings[0].price;
    const balanceBefore = state().market.nodeBalance['node-local'];

    const order = state().buyPlaybook(listingId);
    expect(order).not.toBeNull();
    expect(order!.status).toBe('completed');

    // Balance decreased
    const balanceAfter = state().market.nodeBalance['node-local'];
    expect(balanceAfter).toBe(balanceBefore - listingPrice);

    // Listing marked sold
    const listing = state().market.listings.find(l => l.id === listingId)!;
    expect(listing.status).toBe('sold');

    // Order created
    const foundOrder = state().market.orders.find(o => o.id === order!.id);
    expect(foundOrder).toBeDefined();
    expect(foundOrder!.status).toBe('completed');

    // Ledger entry recorded as market-trade
    const tradeEntries = state().ledgers.localLedger.filter(e => e.type === 'market-trade');
    expect(tradeEntries.length).toBeGreaterThanOrEqual(1);
  });

  it('2.3 - executeMarketPlaybook records executionResult', () => {
    const listingId = state().market.listings[0].id;
    const order = state().buyPlaybook(listingId)!;
    expect(order).not.toBeNull();

    state().executeMarketPlaybook(order.id, 'Executed successfully with great results');

    const updatedOrder = state().market.orders.find(o => o.id === order.id)!;
    expect(updatedOrder.executionResult).toBe('Executed successfully with great results');
  });

  it('2.4 - buying same listing again fails', () => {
    const listingId = state().market.listings[0].id;
    const firstOrder = state().buyPlaybook(listingId);
    expect(firstOrder).not.toBeNull();

    // Second purchase of the same listing should fail (it is now 'sold')
    const secondOrder = state().buyPlaybook(listingId);
    expect(secondOrder).toBeNull();
  });

  it('2.5 - buying with insufficient balance fails', () => {
    // Find the most expensive listing
    const expensiveListing = [...state().market.listings].sort((a, b) => b.price - a.price)[0];

    // Artificially set balance to 1
    useV6Store.setState(s => ({
      market: {
        ...s.market,
        nodeBalance: { ...s.market.nodeBalance, 'node-local': 1 },
      },
    }));

    const order = state().buyPlaybook(expensiveListing.id);
    expect(order).toBeNull();
  });

  it('2.6 - create task, complete, list as playbook, verify it appears in market', () => {
    const taskId = runFullPipeline('Market Playbook Source');

    const listing = state().listPlaybookFromTask(taskId, 25, 'automation');
    expect(listing).not.toBeNull();
    expect(listing!.price).toBe(25);

    // Verify it appears in market listings
    const found = state().market.listings.find(l => l.id === listing!.id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('listed');
    expect(found!.sourceTaskId).toBe(taskId);
  });
});

// ============================================================================
// Suite 3: Ledger View - Data Integrity
// ============================================================================

describe('Suite 3: Ledger View - Data Integrity', () => {
  beforeEach(resetStore);

  it('3.1 - evidence entries appear in getLedgerSummary', () => {
    state().addEvidenceEntry('Conclusion A', 'source-a', 'H2', 'task-a', ['tag1']);
    state().addEvidenceEntry('Conclusion B', 'source-b', 'H3', 'task-b', ['tag2']);

    const summary = state().getLedgerSummary();
    expect(summary.evidenceCount).toBe(2);
    expect(summary.activeEvidence).toBe(2);
  });

  it('3.2 - value assessments calculate priority', () => {
    state().addValueEntry('task-1', 80, 200, 100, 20);
    state().addValueEntry('task-2', 50, 100, 200, 60);

    const summary = state().getLedgerSummary();
    expect(summary.valueAssessments).toBe(2);

    // Higher goal alignment + better ROI -> higher priority
    const v1 = state().ledgers.value.find(v => v.taskId === 'task-1')!;
    const v2 = state().ledgers.value.find(v => v.taskId === 'task-2')!;
    expect(v1.priority).toBeGreaterThan(v2.priority);
  });

  it('3.3 - debt add/resolve changes openDebts count', () => {
    state().addDebtEntry('tech-debt', 'Legacy code cleanup', 'medium');

    let summary = state().getLedgerSummary();
    expect(summary.openDebts).toBe(1);
    expect(summary.totalDebts).toBe(1);

    const debtId = state().ledgers.debt[0].id;
    state().resolveDebtEntry(debtId);

    summary = state().getLedgerSummary();
    expect(summary.openDebts).toBe(0);
    expect(summary.totalDebts).toBe(1); // still counts total
  });

  it('3.4 - case law entries are searchable', () => {
    state().addCaseLawEntry('failure', 'API Timeout Failure', 'External API timed out causing cascade', 'major', ['task-1']);
    state().addCaseLawEntry('resolution', 'Retry Strategy Added', 'Implemented exponential backoff', 'minor', ['task-1']);

    const timeoutResults = searchCaseLaw(state().ledgers, 'timeout');
    expect(timeoutResults.length).toBe(1);
    expect(timeoutResults[0].title).toBe('API Timeout Failure');

    const retryResults = searchCaseLaw(state().ledgers, 'retry');
    expect(retryResults.length).toBe(1);
    expect(retryResults[0].title).toBe('Retry Strategy Added');
  });

  it('3.5 - getBalance returns correct per-currency sums', () => {
    state().addLedgerEntry('sim-credit', 100, 'SIM', 'task-1', 'Credit 1');
    state().addLedgerEntry('sim-credit', 50, 'SIM', 'task-2', 'Credit 2');
    state().addLedgerEntry('sim-credit', -30, 'SIM', 'task-3', 'Debit 1');
    state().addLedgerEntry('testnet-settle', 200, 'TEST', 'task-4', 'Testnet settle');

    const summary = state().getLedgerSummary();
    expect(summary.simBalance).toBe(120);
    expect(summary.testBalance).toBe(200);
  });
});

// ============================================================================
// Suite 4: Oracle View - Verdict Accuracy
// ============================================================================

describe('Suite 4: Oracle View - Verdict Accuracy', () => {
  beforeEach(resetStore);

  it('4.1 - H3 evidence produces settleable verdict for local credit', () => {
    const taskId = runFullPipeline('H3 Evidence Task', 'H3');

    const outcome = state().outcomes.find(o => o.taskId === taskId)!;
    expect(outcome).toBeDefined();
    expect(outcome.oracleVerdict).toBe('settleable');
    expect(outcome.creditTarget).toBe('local');
    expect(outcome.settleable).toBe(true);
  });

  it('4.2 - H4 evidence produces rejected verdict (H4 too low for local)', () => {
    // runFullPipeline with H4 does NOT pre-populate evidence (H4 < H3 threshold)
    const taskId = runFullPipeline('H4 Evidence Task', 'H4');

    const outcome = state().outcomes.find(o => o.taskId === taskId)!;
    expect(outcome).toBeDefined();
    expect(outcome.oracleVerdict).toBe('rejected');
    expect(outcome.creditTarget).toBe('rejected');
    expect(outcome.settleable).toBe(false);
  });

  it('4.3 - multiple H2 evidence entries enable testnet credit eligibility', () => {
    // Create a task
    const task = state().createNewTask('Testnet Eligible', 'desc');

    // Pre-add 2 H2 evidence entries (testnet rule needs minVerifications: 2, H2+)
    state().addEvidenceEntry('Verification 1', 'source-1', 'H2', task.id, ['verified']);
    state().addEvidenceEntry('Verification 2', 'source-2', 'H2', task.id, ['verified']);

    // Run through pipeline
    state().submitProposal(task.id, 'proposal');
    state().submitAudit(task.id, 'findings', 'low');
    state().submitApproval(task.id, true, 100);
    state().completeTask(task.id, 'Result', 'H2');

    const outcome = state().outcomes.find(o => o.taskId === task.id)!;
    expect(outcome).toBeDefined();
    expect(outcome.oracleVerdict).toBe('settleable');
    // With 2 H2 evidence entries the testnet rule is met (H2+, 2+ verifications)
    expect(['testnet', 'local']).toContain(outcome.creditTarget);
  });

  it('4.4 - getOracleStats returns correct counts', () => {
    // Create one settled (with pre-evidence) and one rejected (H4, no pre-evidence)
    runFullPipeline('Settled Task', 'H3');
    runFullPipeline('Rejected Task', 'H4');

    const stats = state().getOracleStats();
    expect(stats.total).toBe(2);
    expect(stats.settled).toBeGreaterThanOrEqual(1);
    expect(stats.rejected).toBeGreaterThanOrEqual(1);
    expect(stats.total).toBe(stats.settled + stats.rejected + stats.pending + stats.disputed);
  });
});

// ============================================================================
// Suite 5: Permission Matrix - Approval Flow
// ============================================================================

describe('Suite 5: Permission Matrix - Approval Flow', () => {
  beforeEach(resetStore);

  it('5.1 - L0 permission auto-executes (no approval needed)', () => {
    const matrix = state().permissionMatrix;
    const l0 = matrix.find(f => f.level === 'L0')!;
    expect(l0.autoExecute).toBe(true);
    expect(l0.approvalRequirements).toEqual([]);
  });

  it('5.2 - L1 permission: ai2 approval makes it fully approved', () => {
    state().requestPermission('task-1', 'ai1-expander', 'L1', 'read-query data');

    const requestId = state().permissionRequests[0].id;

    // L1 requires ['ai2'] -- the store's approvePermission takes a TrinityRole
    state().approvePermission(requestId, 'ai2-auditor');

    const request = state().permissionRequests.find(r => r.id === requestId)!;
    expect(request.status).toBe('approved');
    expect(request.resolvedAt).toBeDefined();
  });

  it('5.3 - L3 permission: ai2 + ai3 not sufficient (needs human)', () => {
    state().requestPermission('task-2', 'ai1-expander', 'L3', 'real-wallet transfer');

    const requestId = state().permissionRequests[0].id;

    state().approvePermission(requestId, 'ai2-auditor');
    let request = state().permissionRequests.find(r => r.id === requestId)!;
    expect(request.status).toBe('pending');

    state().approvePermission(requestId, 'ai3-governor');
    request = state().permissionRequests.find(r => r.id === requestId)!;
    // Still pending because human approval is required
    expect(request.status).toBe('pending');
  });

  it('5.4 - L3 permission: ai2 + ai3 + human = fully approved', () => {
    state().requestPermission('task-3', 'ai1-expander', 'L3', 'real-wallet transfer');
    const requestId = state().permissionRequests[0].id;

    state().approvePermission(requestId, 'ai2-auditor');
    state().approvePermission(requestId, 'ai3-governor');
    state().approvePermission(requestId, 'human');

    const request = state().permissionRequests.find(r => r.id === requestId)!;
    expect(request.status).toBe('approved');
    expect(request.resolvedAt).toBeDefined();
  });

  it('5.5 - denying a permission sets status to denied', () => {
    state().requestPermission('task-4', 'ai1-expander', 'L1', 'sandbox-test');
    const requestId = state().permissionRequests[0].id;

    state().denyPermission(requestId, 'ai2-auditor', 'Too risky');

    const request = state().permissionRequests.find(r => r.id === requestId)!;
    expect(request.status).toBe('denied');
    expect(request.resolvedAt).toBeDefined();
    expect(request.approvals[0].decision).toBe('deny');
  });
});

// ============================================================================
// Suite 6: Node Promotion - Score Calculation
// ============================================================================

describe('Suite 6: Node Promotion - Score Calculation', () => {
  beforeEach(resetStore);

  it('6.1 - fresh state starts at stage-0', () => {
    expect(state().nodeStatus.currentStage).toBe('stage-0');
    expect(state().nodeStatus.metrics.totalTasks).toBe(0);
  });

  it('6.2 - running tasks through pipeline updates metrics after refreshMetrics', () => {
    runFullPipeline('Metric Task 1', 'H3');
    runFullPipeline('Metric Task 2', 'H3');

    state().refreshMetrics();

    const metrics = state().nodeStatus.metrics;
    expect(metrics.totalOutcomes).toBe(2);
    expect(metrics.settledOutcomes).toBe(2);
  });

  it('6.3 - promotion not eligible with insufficient outcomes', () => {
    // Stage-0 -> stage-1 needs 3+ settled outcomes
    runFullPipeline('Single Task', 'H3');
    state().refreshMetrics();

    const result = state().checkPromotion();
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some(r => r.includes('outcomes'))).toBe(true);
  });

  it('6.4 - compliance score calculated from permission requests', () => {
    // Add some approved and denied requests to affect compliance
    state().requestPermission('t1', 'ai1-expander', 'L1', 'action-1');
    state().requestPermission('t2', 'ai1-expander', 'L1', 'action-2');
    const req1Id = state().permissionRequests[0].id;
    const req2Id = state().permissionRequests[1].id;

    state().approvePermission(req1Id, 'ai2-auditor');
    state().denyPermission(req2Id, 'ai2-auditor', 'denied');

    state().refreshMetrics();

    // Compliance = (1 - denied/total) * 100 = (1 - 1/2) * 100 = 50
    const progress = state().nodeStatus.promotionProgress;
    expect(progress.complianceScore).toBe(50);
  });

  it('6.5 - stability score penalized by case law', () => {
    state().refreshMetrics();
    const basePenalty = state().nodeStatus.promotionProgress.stabilityScore;
    expect(basePenalty).toBe(100); // no case law, no debt

    // Add a major case law entry (recent = within 7 days, penalty = 10 per major/critical)
    state().addCaseLawEntry('failure', 'Major Bug', 'System crashed', 'major', ['t1']);
    state().refreshMetrics();

    const afterPenalty = state().nodeStatus.promotionProgress.stabilityScore;
    expect(afterPenalty).toBe(90);
  });
});

// ============================================================================
// Suite 7: Persistence & Reset
// ============================================================================

describe('Suite 7: Persistence & Reset', () => {
  it('7.1 - reset clears all tasks, outcomes, events, and ledgers', () => {
    // Create some state
    runFullPipeline('Pre-reset Task', 'H3');
    state().addDebtEntry('tech-debt', 'Some debt', 'low');
    state().requestPermission('t1', 'ai1-expander', 'L1', 'action');

    expect(state().tasks.length).toBeGreaterThan(0);
    expect(state().outcomes.length).toBeGreaterThan(0);
    expect(state().events.length).toBeGreaterThan(0);
    expect(state().ledgers.evidence.length).toBeGreaterThan(0);

    state().reset();

    expect(state().tasks).toEqual([]);
    expect(state().outcomes).toEqual([]);
    expect(state().events).toEqual([]);
    expect(state().ledgers.evidence).toEqual([]);
    expect(state().ledgers.debt).toEqual([]);
    expect(state().ledgers.localLedger).toEqual([]);
    expect(state().permissionRequests).toEqual([]);
  });

  it('7.2 - market resets to demo data with full resetStore helper', () => {
    // Modify market state
    state().buyPlaybook(state().market.listings[0].id);
    expect(state().market.orders.length).toBe(1);

    // resetStore includes market reset (store's own reset() omits market)
    resetStore();

    expect(state().market.listings.length).toBe(3);
    expect(state().market.listings.every(l => l.status === 'listed')).toBe(true);
    expect(state().market.orders).toEqual([]);
    expect(state().market.nodeBalance['node-local']).toBe(1000);
  });

  it('7.3 - constitution resets to defaults', () => {
    // Modify constitution
    const goalId = state().constitution.goals[0].id;
    const milestoneId = state().constitution.goals[0].milestones[0].id;
    state().completeMilestoneById(goalId, milestoneId);
    expect(state().constitution.goals[0].milestones[0].completed).toBe(true);

    state().reset();

    // After reset, milestones should all be not-completed (fresh defaults)
    const allMilestones = state().constitution.goals.flatMap(g => g.milestones);
    expect(allMilestones.every(m => m.completed === false)).toBe(true);
    expect(state().constitution.version).toBe('6.0.0');
  });
});
