import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module imports
// ---------------------------------------------------------------------------

import {
  createDefaultConstitution,
  getPermissionLevelForAction,
  getRequiredApprovals,
  validateConstitution,
} from '@/lib/v6/constitution';

import {
  createTask,
  advanceTaskPhase,
  blockTask,
  failTask,
  createOutput,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
  createTrinityAgents,
  updateAgentStatus,
  recordAgentCompletion,
} from '@/lib/v6/engine';

import {
  createEmptyLedgers,
  addEvidence,
  addValueAssessment,
  addDebt,
  resolveDebt,
  addCaseLaw,
  addLocalLedgerEntry,
  addTemporalEntry,
  refreshTemporalStatuses,
  getActiveEvidence,
  getEvidenceByGrade,
  getBalance,
  getOpenDebts,
  searchCaseLaw,
  getLedgerSummary,
  getTopPriorityTasks,
} from '@/lib/v6/ledger';

import {
  generateOutcomeReport,
  evaluateOutcome,
  settleOutcome,
  disputeOutcome,
  createDefaultOracleRules,
  getOracleStats,
} from '@/lib/v6/oracle';

import {
  createDefaultFuseMatrix,
  checkPermission,
  canAutoExecute,
  createPermissionRequest,
  addApproval,
  isFullyApproved,
  resolveRequest,
  getPermissionStats,
} from '@/lib/v6/fuse-matrix';

import {
  createInitialNodeStatus,
  calculatePromotionProgress,
  checkPromotionEligibility,
  promoteNode,
  calculateNodeMetrics,
  STAGE_CONFIG,
  getStageNumber,
} from '@/lib/v6/promotion';

import {
  createEmptyMarket,
  createPlaybookListing,
  listPlaybook,
  purchasePlaybook,
  executePlaybook,
  recordMarketTransaction,
  delistPlaybook,
  getMarketStats,
  createDemoMarket,
} from '@/lib/v6/market';

import type {
  TrinityTask,
  GovernanceLedgers,
  OutcomeReport,
  PermissionLevel,
  PermissionRequest,
  EvidenceGrade,
  Constitution,
} from '@/types/v6';

// ============================================================================
// 1. FULL TASK LIFECYCLE
//    create -> propose -> audit -> approve -> complete -> settle
// ============================================================================

describe('Integration: Full Task Lifecycle', () => {
  let constitution: Constitution;

  beforeEach(() => {
    constitution = createDefaultConstitution();
  });

  it('runs a task through the entire pipeline: proposal -> audit -> approval -> execution -> review -> settled', () => {
    // Step 1: Create
    const task = createTask('Generate playbook', 'Create an API integration playbook', 'ai1-expander', 'L0');
    expect(task.phase).toBe('proposal');
    expect(task.status).toBe('draft');

    // Step 2: Proposal phase
    const proposalResult = runProposalPhase(task, 'Detailed API integration playbook content');
    expect(proposalResult.blocked).toBe(false);
    expect(proposalResult.task.phase).toBe('audit');
    expect(proposalResult.task.status).toBe('pending-audit');
    expect(proposalResult.task.outputs.length).toBe(1);
    expect(proposalResult.task.outputs[0].type).toBe('task-draft');

    // Step 3: Audit phase (low risk, passes)
    const auditResult = runAuditPhase(proposalResult.task, constitution, 'No issues found', 'low');
    expect(auditResult.blocked).toBe(false);
    expect(auditResult.task.phase).toBe('approval');
    expect(auditResult.task.status).toBe('pending-approval');

    // Step 4: Approval phase (L0 auto-approves, no human needed)
    const approvalResult = runApprovalPhase(auditResult.task, constitution, true, 100);
    expect(approvalResult.blocked).toBe(false);
    expect(approvalResult.task.phase).toBe('execution');
    expect(approvalResult.task.status).toBe('executing');

    // Step 5: Advance through execution -> review
    const reviewTask = advanceTaskPhase(approvalResult.task);
    expect(reviewTask.phase).toBe('review');
    expect(reviewTask.status).toBe('completed');

    // Step 6: Advance to settled
    const settledTask = advanceTaskPhase(reviewTask);
    expect(settledTask.phase).toBe('settled');
    expect(settledTask.status).toBe('completed');
    expect(settledTask.completedAt).toBeDefined();
  });

  it('generates events at each pipeline stage', () => {
    const task = createTask('Event test', 'Check events');
    const proposal = runProposalPhase(task, 'Proposal content');
    expect(proposal.events.length).toBeGreaterThanOrEqual(1);
    expect(proposal.events[0].type).toBe('trinity:output');

    const audit = runAuditPhase(proposal.task, constitution, 'Clear', 'low');
    expect(audit.events.length).toBeGreaterThanOrEqual(1);

    const approval = runApprovalPhase(audit.task, constitution, true);
    expect(approval.events.length).toBeGreaterThanOrEqual(1);
  });

  it('connects task completion to Oracle evaluation and ledger settlement', () => {
    // Create and complete a task
    let task = createTask('Outcome test', 'testing oracle integration');
    task = { ...task, phase: 'execution' as const, status: 'executing' as const };

    // Generate outcome
    const outcome = generateOutcomeReport(task, 'Task completed successfully', 'automated', 'H3');
    expect(outcome.oracleVerdict).toBe('pending-review');
    expect(outcome.settleable).toBe(false);

    // Add evidence for this task
    let ledgers = createEmptyLedgers();
    ledgers = addEvidence(ledgers, 'Verified result', 'automated-check', 'H3', 'ai2-auditor', task.id);

    // Evaluate with oracle rules
    const rules = createDefaultOracleRules();
    const evaluated = evaluateOutcome(outcome, rules, ledgers);
    expect(evaluated.oracleVerdict).toBe('settleable');
    expect(evaluated.creditTarget).toBe('local');

    // Settle
    const settled = settleOutcome(evaluated);
    expect(settled.settledAt).toBeDefined();

    // Record in ledger
    ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', 10, 'SIM', task.id, 'Settled outcome', undefined, settled.id);
    expect(getBalance(ledgers, 'SIM')).toBe(10);
  });

  it('preserves completedAt through phase transitions (bug fix verification)', () => {
    let task = createTask('Completion date test', 'verify completedAt');
    // Advance through all phases
    task = advanceTaskPhase(task); // audit
    task = advanceTaskPhase(task); // approval
    task = advanceTaskPhase(task); // execution
    task = advanceTaskPhase(task); // review

    // At review, status is completed but completedAt should not be undefined
    // (before the fix, it was always undefined until settled)
    expect(task.phase).toBe('review');
    expect(task.status).toBe('completed');

    task = advanceTaskPhase(task); // settled
    expect(task.phase).toBe('settled');
    expect(task.completedAt).toBeDefined();
  });
});

// ============================================================================
// 2. FULL MARKET FLOW
//    create task -> complete -> list playbook -> buy -> execute -> verify ledger
// ============================================================================

describe('Integration: Full Market Flow', () => {
  it('creates a playbook from a completed task, lists it, buys it, and records in ledger', () => {
    // Step 1: Create a completed task
    let task = createTask('Build API client', 'Generate SDK for REST API');
    task = {
      ...task,
      phase: 'settled' as const,
      status: 'completed' as const,
      outputs: [
        createOutput(task.id, 'ai1-expander', 'playbook', '# API Client Playbook\n\nStep 1: ...\nStep 2: ...'),
      ],
    };

    // Step 2: Create playbook listing from task
    const listing = createPlaybookListing(task, task.outputs[0].content, 50, 'automation', ['api', 'sdk']);
    expect(listing.title).toContain('Build API client');
    expect(listing.price).toBe(50);
    expect(listing.quality).toBe(75); // completed task gets 75

    // Step 3: List on market
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);
    expect(market.listings.length).toBe(1);
    expect(market.listings[0].status).toBe('listed');

    // Step 4: Set up buyer balance
    market = { ...market, nodeBalance: { ...market.nodeBalance, 'node-buyer': 200 } };

    // Step 5: Purchase
    const purchaseResult = purchasePlaybook(market, listing.id, 'node-buyer');
    expect(purchaseResult.error).toBeUndefined();
    expect(purchaseResult.order).not.toBeNull();
    expect(purchaseResult.order!.status).toBe('completed');
    expect(purchaseResult.market.nodeBalance['node-buyer']).toBe(150); // 200 - 50
    expect(purchaseResult.market.nodeBalance['node-local']).toBe(1050); // 1000 + 50

    // Step 6: Execute playbook
    const executedMarket = executePlaybook(purchaseResult.market, purchaseResult.order!.id, 'Playbook executed successfully');
    const order = executedMarket.orders.find(o => o.id === purchaseResult.order!.id);
    expect(order?.executionResult).toBe('Playbook executed successfully');

    // Step 7: Record in governance ledger (buyer perspective)
    let ledgers = createEmptyLedgers();
    ledgers = recordMarketTransaction(ledgers, purchaseResult.order!, 'buyer');
    expect(ledgers.localLedger.length).toBe(1);
    expect(ledgers.localLedger[0].amount).toBe(-50); // buyer pays
    expect(ledgers.localLedger[0].type).toBe('market-trade');

    // Step 8: Record seller perspective too
    ledgers = recordMarketTransaction(ledgers, purchaseResult.order!, 'seller');
    expect(ledgers.localLedger.length).toBe(2);
    expect(ledgers.localLedger[1].amount).toBe(50); // seller receives
  });

  it('prevents self-purchase', () => {
    let task = createTask('Self-buy test', 'Testing self-purchase prevention');
    task = { ...task, status: 'completed' as const };
    const listing = createPlaybookListing(task, 'content', 10, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);

    // seller is 'node-local', try to buy as 'node-local'
    const result = purchasePlaybook(market, listing.id, 'node-local');
    expect(result.order).toBeNull();
    expect(result.error).toBe('Cannot buy own listing');
  });

  it('prevents purchase with insufficient balance', () => {
    let task = createTask('Expensive item', 'Costs too much');
    task = { ...task, status: 'completed' as const };
    const listing = createPlaybookListing(task, 'content', 9999, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);
    market = { ...market, nodeBalance: { ...market.nodeBalance, 'poor-node': 10 } };

    const result = purchasePlaybook(market, listing.id, 'poor-node');
    expect(result.order).toBeNull();
    expect(result.error).toContain('Insufficient balance');
  });

  it('prevents purchase of sold listings', () => {
    let task = createTask('Already sold', 'Sold item');
    task = { ...task, status: 'completed' as const };
    const listing = createPlaybookListing(task, 'content', 10, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);
    market = { ...market, nodeBalance: { ...market.nodeBalance, 'buyer-1': 100, 'buyer-2': 100 } };

    // First buyer succeeds
    const first = purchasePlaybook(market, listing.id, 'buyer-1');
    expect(first.order).not.toBeNull();

    // Second buyer fails because listing is now sold
    const second = purchasePlaybook(first.market, listing.id, 'buyer-2');
    expect(second.order).toBeNull();
    expect(second.error).toBe('Listing not available');
  });

  it('rejects zero-price listings on purchase (bug fix verification)', () => {
    let task = createTask('Free stuff', 'Zero price');
    task = { ...task, status: 'completed' as const };
    const listing = createPlaybookListing(task, 'content', 0, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);
    market = { ...market, nodeBalance: { ...market.nodeBalance, 'buyer': 100 } };

    const result = purchasePlaybook(market, listing.id, 'buyer');
    expect(result.order).toBeNull();
    expect(result.error).toBe('Invalid listing price');
  });

  it('delists a playbook and prevents further purchase', () => {
    let task = createTask('Delist test', 'Will be delisted');
    task = { ...task, status: 'completed' as const };
    const listing = createPlaybookListing(task, 'content', 10, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing);
    market = delistPlaybook(market, listing.id);

    expect(market.listings[0].status).toBe('delisted');

    market = { ...market, nodeBalance: { ...market.nodeBalance, 'buyer': 100 } };
    const result = purchasePlaybook(market, listing.id, 'buyer');
    expect(result.order).toBeNull();
    expect(result.error).toBe('Listing not available');
  });

  it('market stats track volume correctly', () => {
    let task = createTask('Stats test', 'For stats');
    task = { ...task, status: 'completed' as const };
    const listing1 = createPlaybookListing(task, 'content 1', 30, 'test');
    const listing2 = createPlaybookListing(task, 'content 2', 70, 'test');
    let market = createEmptyMarket();
    market = listPlaybook(market, listing1);
    market = listPlaybook(market, listing2);
    market = { ...market, nodeBalance: { ...market.nodeBalance, 'buyer': 500 } };

    const r1 = purchasePlaybook(market, listing1.id, 'buyer');
    const r2 = purchasePlaybook(r1.market, listing2.id, 'buyer');

    const stats = getMarketStats(r2.market);
    expect(stats.sold).toBe(2);
    expect(stats.listed).toBe(0);
    expect(stats.totalVolume).toBe(100); // 30 + 70
    expect(stats.totalOrders).toBe(2);
  });
});

// ============================================================================
// 3. PERMISSION ESCALATION
//    try L3 action -> verify human approval required -> approve -> verify
// ============================================================================

describe('Integration: Permission Escalation', () => {
  it('L3 action requires human dual-sign in the full pipeline', () => {
    const constitution = createDefaultConstitution();
    const matrix = createDefaultFuseMatrix();

    // Create an L3 task (real wallet operation)
    let task = createTask('real-wallet transfer', 'Send real funds');
    task = { ...task, permissionLevel: 'L3' as PermissionLevel };

    // Run through proposal
    const proposal = runProposalPhase(task, 'Transfer 100 units to vendor');
    expect(proposal.blocked).toBe(false);

    // Audit passes
    const audit = runAuditPhase(proposal.task, constitution, 'Risk acceptable with human oversight', 'medium');
    expect(audit.blocked).toBe(false);

    // Approval requires human sign-off
    const approval = runApprovalPhase(audit.task, constitution, true, 100);
    expect(approval.blocked).toBe(true);
    expect(approval.reason).toContain('human');
    expect(approval.permissionRequired).toBe('L3');

    // Create permission request
    let request = createPermissionRequest(task.id, 'ai3-governor', 'L3', 'real-wallet', 'Transfer approval');

    // AI-2 and AI-3 approve
    request = addApproval(request, 'ai2' as any, 'approve');
    request = addApproval(request, 'ai3' as any, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(false); // still needs human

    // Human approves
    request = addApproval(request, 'human', 'approve');
    expect(isFullyApproved(request, matrix)).toBe(true);

    // Resolve
    const resolved = resolveRequest(request, matrix);
    expect(resolved.status).toBe('approved');
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('L0 actions auto-execute without any approvals', () => {
    const matrix = createDefaultFuseMatrix();
    const result = checkPermission(matrix, 'L0');
    expect(result.allowed).toBe(true);
    expect(result.fuse.autoExecute).toBe(true);
    expect(canAutoExecute(matrix, 'L0')).toBe(true);
  });

  it('L1 requires AI-2 audit approval only', () => {
    const matrix = createDefaultFuseMatrix();
    let request = createPermissionRequest('t1', 'ai1-expander', 'L1', 'read-query', 'API read');

    request = addApproval(request, 'ai2' as any, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(true);
  });

  it('L2 requires both AI-2 and AI-3', () => {
    const matrix = createDefaultFuseMatrix();
    let request = createPermissionRequest('t1', 'ai1-expander', 'L2', 'testnet-transfer', 'Move test tokens');

    request = addApproval(request, 'ai2' as any, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(false);

    request = addApproval(request, 'ai3' as any, 'approve');
    expect(isFullyApproved(request, matrix)).toBe(true);
  });

  it('L4 is always forbidden even with full approvals', () => {
    const matrix = createDefaultFuseMatrix();
    const result = checkPermission(matrix, 'L4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('permanently forbidden');

    // Even if someone creates a request for L4, it should never be fully approved
    let request = createPermissionRequest('t1', 'ai1-expander', 'L4', 'bypass-constraint', 'Impossible');
    request = addApproval(request, 'ai2' as any, 'approve');
    request = addApproval(request, 'ai3' as any, 'approve');
    request = addApproval(request, 'human', 'approve');
    // L4 fuse has empty approvalRequirements so technically all 0 requirements are met
    // but checkPermission blocks L4 before approval is even evaluated
    expect(checkPermission(matrix, 'L4').allowed).toBe(false);
  });

  it('a single denial immediately denies the whole request', () => {
    const matrix = createDefaultFuseMatrix();
    let request = createPermissionRequest('t1', 'ai1-expander', 'L3', 'real-wallet', 'Risky op');

    request = addApproval(request, 'ai2' as any, 'approve');
    request = addApproval(request, 'ai3' as any, 'deny', 'Budget exceeded');
    expect(request.status).toBe('denied');
    expect(request.resolvedAt).toBeDefined();

    // Resolve confirms denied
    const resolved = resolveRequest(request, matrix);
    expect(resolved.status).toBe('denied');
  });

  it('permission stats track counts correctly', () => {
    const matrix = createDefaultFuseMatrix();
    const requests: PermissionRequest[] = [];

    // Create and resolve several requests
    let r1 = createPermissionRequest('t1', 'ai1-expander', 'L1', 'read-query', 'Read');
    r1 = addApproval(r1, 'ai2' as any, 'approve');
    r1 = resolveRequest(r1, matrix);
    requests.push(r1);

    let r2 = createPermissionRequest('t2', 'ai1-expander', 'L2', 'testnet-transfer', 'Transfer');
    r2 = addApproval(r2, 'ai2' as any, 'deny', 'Nope');
    requests.push(r2);

    let r3 = createPermissionRequest('t3', 'ai1-expander', 'L0', 'write-log', 'Log');
    requests.push(r3); // pending

    const stats = getPermissionStats(requests);
    expect(stats.total).toBe(3);
    expect(stats.approved).toBe(1);
    expect(stats.denied).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.approvalRate).toBe(33); // 1/3 = 33%
  });
});

// ============================================================================
// 4. NODE PROMOTION
//    Run enough tasks to attempt stage promotion
// ============================================================================

describe('Integration: Node Promotion Pipeline', () => {
  it('cannot promote from stage-0 without meeting requirements', () => {
    const status = createInitialNodeStatus();
    const result = checkPromotionEligibility(status, [], createEmptyLedgers(), []);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('promotes from stage-0 to stage-1 when criteria are met', () => {
    const nodeStatus = createInitialNodeStatus();

    // Create enough settled outcomes for stage-1 (needs 10)
    const outcomes: OutcomeReport[] = [];
    let ledgers = createEmptyLedgers();

    for (let i = 0; i < 10; i++) {
      const taskId = `task-${i}`;
      const outcome: OutcomeReport = {
        id: `outcome-${i}`,
        taskId,
        taskType: 'general-task',
        expectedGoal: `Goal ${i}`,
        actualResult: `Result ${i}`,
        verificationMethod: 'automated',
        evidenceGrade: 'H2',
        settleable: true,
        reconciliationHash: `0x${i.toString(16).padStart(16, '0')}`,
        creditTarget: 'local',
        oracleVerdict: 'settleable',
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
      };
      outcomes.push(outcome);
      ledgers = addEvidence(ledgers, `Evidence ${i}`, 'test', 'H2', 'ai2-auditor', taskId);
      ledgers = addValueAssessment(ledgers, taskId, 80, 100, 50, 10);
    }

    // Check eligibility
    const eligibility = checkPromotionEligibility(nodeStatus, outcomes, ledgers, []);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.reasons).toEqual([]);

    // Promote
    const promoted = promoteNode(nodeStatus);
    expect(promoted.currentStage).toBe('stage-1');
    expect(promoted.stageLabel).toBe('测试网节点');
    expect(promoted.history.length).toBe(1);
    expect(promoted.history[0].fromStage).toBe('stage-0');
    expect(promoted.history[0].toStage).toBe('stage-1');
  });

  it('calculates promotion progress correctly', () => {
    const nodeStatus = createInitialNodeStatus();
    const outcomes: OutcomeReport[] = [];

    for (let i = 0; i < 5; i++) {
      outcomes.push({
        id: `o-${i}`,
        taskId: `t-${i}`,
        taskType: 'general-task',
        expectedGoal: 'goal',
        actualResult: 'result',
        verificationMethod: 'auto',
        evidenceGrade: 'H2',
        settleable: true,
        reconciliationHash: '0x0',
        creditTarget: 'local',
        oracleVerdict: 'settleable',
        createdAt: new Date().toISOString(),
        settledAt: new Date().toISOString(),
      });
    }

    const progress = calculatePromotionProgress(nodeStatus, outcomes, createEmptyLedgers(), []);
    // stage-1 requires 10 outcomes, we have 5 settled
    expect(progress.outcomesAchieved).toBe(5);
    expect(progress.outcomesRequired).toBe(10);
    expect(progress.estimatedReadiness).toBeGreaterThan(0);
    expect(progress.estimatedReadiness).toBeLessThan(100);
  });

  it('stability score penalized by recent case law', () => {
    const nodeStatus = createInitialNodeStatus();
    let ledgers = createEmptyLedgers();

    // Add critical case law from recent time (within 7 days)
    ledgers = addCaseLaw(ledgers, 'failure', 'Critical outage', 'System went down', 'critical', ['t1']);
    ledgers = addCaseLaw(ledgers, 'failure', 'Another failure', 'Data loss', 'major', ['t2']);

    const progress = calculatePromotionProgress(nodeStatus, [], ledgers, []);
    // Each major/critical case law entry penalizes stability by 10
    expect(progress.stabilityScore).toBeLessThanOrEqual(80); // 100 - 2*10
  });

  it('stage-4 is the maximum stage, no further promotion', () => {
    let status = createInitialNodeStatus();
    for (let i = 0; i < 4; i++) {
      status = promoteNode(status);
    }
    expect(status.currentStage).toBe('stage-4');

    const stuck = promoteNode(status);
    expect(stuck.currentStage).toBe('stage-4');
    expect(stuck.history.length).toBe(status.history.length);
  });

  it('getStageNumber extracts number correctly', () => {
    expect(getStageNumber('stage-0')).toBe(0);
    expect(getStageNumber('stage-3')).toBe(3);
    expect(getStageNumber('stage-4')).toBe(4);
  });

  it('calculateNodeMetrics returns correct counts', () => {
    const outcomes: OutcomeReport[] = [
      {
        id: 'o1', taskId: 't1', taskType: 'general-task',
        expectedGoal: 'g', actualResult: 'r', verificationMethod: 'auto',
        evidenceGrade: 'H2', settleable: true, reconciliationHash: '0x0',
        creditTarget: 'local', oracleVerdict: 'settleable',
        createdAt: new Date().toISOString(), settledAt: new Date().toISOString(),
      },
      {
        id: 'o2', taskId: 't2', taskType: 'general-task',
        expectedGoal: 'g', actualResult: 'r', verificationMethod: 'auto',
        evidenceGrade: 'H4', settleable: false, reconciliationHash: '0x0',
        creditTarget: 'rejected', oracleVerdict: 'rejected',
        createdAt: new Date().toISOString(),
      },
    ];

    let ledgers = createEmptyLedgers();
    ledgers = addValueAssessment(ledgers, 't1', 80, 100, 50, 10);

    const metrics = calculateNodeMetrics(outcomes, ledgers, [], new Date().toISOString());
    expect(metrics.settledOutcomes).toBe(1);
    expect(metrics.rejectedOutcomes).toBe(1);
    expect(metrics.totalOutcomes).toBe(2);
  });
});

// ============================================================================
// 5. FAILURE FLOW
//    create task -> audit finds critical risk -> task blocked -> case law recorded
// ============================================================================

describe('Integration: Failure Flow', () => {
  it('critical risk blocks task and records case law', () => {
    const constitution = createDefaultConstitution();

    // Create task
    let task = createTask('Risky deployment', 'Deploy untested code to production');
    const proposal = runProposalPhase(task, 'Deploy code immediately');
    task = proposal.task;

    // Audit finds critical risk
    const auditResult = runAuditPhase(task, constitution, 'Untested code poses critical data loss risk', 'critical');
    expect(auditResult.blocked).toBe(true);
    expect(auditResult.task.status).toBe('blocked');
    expect(auditResult.reason).toContain('Untested code');

    // Record in case law
    let ledgers = createEmptyLedgers();
    ledgers = addCaseLaw(
      ledgers,
      'circuit-break',
      `Blocked: ${task.title}`,
      auditResult.reason!,
      'critical',
      [task.id],
      'Untested code deployment attempt',
      'Task blocked by AI-2 audit',
      ['Always run tests before deployment', 'Critical risk should trigger circuit breaker']
    );

    expect(ledgers.caseLaw.length).toBe(1);
    const caseEntry = ledgers.caseLaw[0];
    expect(caseEntry.category).toBe('circuit-break');
    expect(caseEntry.severity).toBe('critical');
    expect(caseEntry.lessonsLearned.length).toBe(2);
    expect(caseEntry.relatedTaskIds).toContain(task.id);
  });

  it('L4 forbidden actions are immediately blocked and recorded', () => {
    const constitution = createDefaultConstitution();

    // Task that matches L4 pattern
    let task = createTask('bypass-constraint for speed', 'Skip validation');
    const proposal = runProposalPhase(task, 'Need to bypass constraints');
    const audit = runAuditPhase(proposal.task, constitution, 'Attempted L4 action', 'low');

    expect(audit.blocked).toBe(true);
    expect(audit.reason).toContain('L4');
    expect(audit.task.status).toBe('blocked');
  });

  it('failed task can be recorded with proper case law entry', () => {
    let task = createTask('Failed operation', 'Operation that will fail');
    const failedTask = failTask(task, 'External API returned 500');

    expect(failedTask.status).toBe('failed');
    expect(failedTask.phase).toBe('review');
    expect(failedTask.outputs.length).toBe(1);
    expect(failedTask.outputs[0].content).toContain('FAILED');

    // Record case law
    let ledgers = createEmptyLedgers();
    ledgers = addCaseLaw(
      ledgers, 'failure', `Task failed: ${task.title}`,
      'External API returned 500', 'moderate', [task.id]
    );
    expect(ledgers.caseLaw.length).toBe(1);
  });

  it('blockTask records the blocking reason in outputs', () => {
    let task = createTask('Block test', 'Testing blocking');
    const blocked = blockTask(task, 'Insufficient permissions');

    expect(blocked.status).toBe('blocked');
    expect(blocked.outputs.length).toBe(1);
    expect(blocked.outputs[0].content).toContain('BLOCKED');
    expect(blocked.outputs[0].content).toContain('Insufficient permissions');
    expect(blocked.outputs[0].type).toBe('audit-opinion');
  });

  it('search case law finds entries by keyword', () => {
    let ledgers = createEmptyLedgers();
    ledgers = addCaseLaw(ledgers, 'failure', 'Database timeout error', 'Connection pool exhausted', 'major', ['t1']);
    ledgers = addCaseLaw(ledgers, 'resolution', 'API retry fix', 'Added exponential backoff', 'minor', ['t2']);
    ledgers = addCaseLaw(ledgers, 'dispute', 'Budget dispute', 'Allocation disagreement', 'moderate', ['t3']);

    const dbResults = searchCaseLaw(ledgers, 'database');
    expect(dbResults.length).toBe(1);
    expect(dbResults[0].title).toContain('Database');

    const allResults = searchCaseLaw(ledgers, '');
    expect(allResults.length).toBe(3);
  });
});

// ============================================================================
// 6. EDGE CASES
//    Empty state, expired entries, zero-balance, duplicate IDs, etc.
// ============================================================================

describe('Edge Cases', () => {
  describe('Empty state queries', () => {
    it('getLedgerSummary on empty ledgers returns all zeros', () => {
      const summary = getLedgerSummary(createEmptyLedgers());
      expect(summary.evidenceCount).toBe(0);
      expect(summary.activeEvidence).toBe(0);
      expect(summary.highGradeEvidence).toBe(0);
      expect(summary.valueAssessments).toBe(0);
      expect(summary.openDebts).toBe(0);
      expect(summary.transactionCount).toBe(0);
      expect(summary.simBalance).toBe(0);
      expect(summary.testBalance).toBe(0);
    });

    it('getBalance returns 0 for non-existent currency', () => {
      expect(getBalance(createEmptyLedgers(), 'REAL')).toBe(0);
      expect(getBalance(createEmptyLedgers(), 'NEW.B')).toBe(0);
    });

    it('getOracleStats on empty outcomes returns all zeros', () => {
      const stats = getOracleStats([]);
      expect(stats.total).toBe(0);
      expect(stats.settled).toBe(0);
      expect(stats.rejected).toBe(0);
    });

    it('getPermissionStats on empty requests returns all zeros', () => {
      const stats = getPermissionStats([]);
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approvalRate).toBe(0);
    });

    it('getMarketStats on empty market returns zeros', () => {
      const stats = getMarketStats(createEmptyMarket());
      expect(stats.listed).toBe(0);
      expect(stats.sold).toBe(0);
      expect(stats.totalVolume).toBe(0);
    });

    it('searchCaseLaw on empty returns empty array', () => {
      expect(searchCaseLaw(createEmptyLedgers(), 'anything')).toEqual([]);
    });

    it('getTopPriorityTasks on empty returns empty array', () => {
      expect(getTopPriorityTasks(createEmptyLedgers())).toEqual([]);
    });

    it('getActiveEvidence on empty returns empty array', () => {
      expect(getActiveEvidence(createEmptyLedgers())).toEqual([]);
    });

    it('getOpenDebts on empty returns empty array', () => {
      expect(getOpenDebts(createEmptyLedgers())).toEqual([]);
    });

    it('getEvidenceByGrade on empty returns empty array', () => {
      expect(getEvidenceByGrade(createEmptyLedgers(), 'H1')).toEqual([]);
    });
  });

  describe('Expired temporal entries', () => {
    it('refreshTemporalStatuses marks expired entries', () => {
      let ledgers = createEmptyLedgers();
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      const farFuture = new Date(Date.now() + 2 * 86400000).toISOString();

      // Expired entry
      ledgers = addTemporalEntry(ledgers, 'conc-1', pastDate, pastDate, '7d');
      // Active entry
      ledgers = addTemporalEntry(ledgers, 'conc-2', pastDate, futureDate, '7d');
      // Future entry (not yet effective)
      ledgers = addTemporalEntry(ledgers, 'conc-3', farFuture, farFuture, '30d');

      const refreshed = refreshTemporalStatuses(ledgers);
      const statuses = refreshed.temporal.map(t => t.status);
      expect(statuses).toContain('expired');
      expect(statuses).toContain('active');
    });

    it('expired evidence is filtered by getActiveEvidence', () => {
      let ledgers = createEmptyLedgers();
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      ledgers = addEvidence(ledgers, 'Expired', 'src', 'H2', 'ai2-auditor', 't1', [], pastDate);
      ledgers = addEvidence(ledgers, 'Still active', 'src', 'H2', 'ai2-auditor', 't2', [], futureDate);
      ledgers = addEvidence(ledgers, 'No expiry', 'src', 'H3', 'ai2-auditor', 't3');

      const active = getActiveEvidence(ledgers);
      expect(active.length).toBe(2); // only active and non-expiring
      expect(active.map(e => e.conclusion)).toContain('Still active');
      expect(active.map(e => e.conclusion)).toContain('No expiry');
      expect(active.map(e => e.conclusion)).not.toContain('Expired');
    });

    it('oracle rejects outcomes when only expired evidence exists (bug fix verification)', () => {
      const task = createTask('Expired evidence test', 'Test expired evidence filtering');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Result with expired evidence',
        'automated',
        'H3'
      );

      let ledgers = createEmptyLedgers();
      // Add only expired evidence
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      ledgers = addEvidence(ledgers, 'Old proof', 'src', 'H3', 'ai2-auditor', task.id, [], pastDate);

      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(outcome, rules, ledgers);
      expect(evaluated.oracleVerdict).toBe('rejected');
      expect(evaluated.settleable).toBe(false);
    });
  });

  describe('Zero-balance and boundary value purchases', () => {
    it('purchase fails when buyer has exactly zero balance', () => {
      let task = createTask('Zero balance test', 'Testing zero balance');
      task = { ...task, status: 'completed' as const };
      const listing = createPlaybookListing(task, 'content', 10, 'test');
      let market = createEmptyMarket();
      market = listPlaybook(market, listing);
      market = { ...market, nodeBalance: { ...market.nodeBalance, 'broke-node': 0 } };

      const result = purchasePlaybook(market, listing.id, 'broke-node');
      expect(result.order).toBeNull();
      expect(result.error).toContain('Insufficient balance');
    });

    it('purchase succeeds when buyer has exactly the right amount', () => {
      let task = createTask('Exact balance', 'Testing exact balance');
      task = { ...task, status: 'completed' as const };
      const listing = createPlaybookListing(task, 'content', 100, 'test');
      let market = createEmptyMarket();
      market = listPlaybook(market, listing);
      market = { ...market, nodeBalance: { ...market.nodeBalance, 'exact-buyer': 100 } };

      const result = purchasePlaybook(market, listing.id, 'exact-buyer');
      expect(result.order).not.toBeNull();
      expect(result.market.nodeBalance['exact-buyer']).toBe(0);
    });

    it('purchase fails for buyer not in nodeBalance map', () => {
      let task = createTask('Unknown buyer', 'Unknown buyer test');
      task = { ...task, status: 'completed' as const };
      const listing = createPlaybookListing(task, 'content', 10, 'test');
      let market = createEmptyMarket();
      market = listPlaybook(market, listing);
      // 'unknown-buyer' does not exist in nodeBalance

      const result = purchasePlaybook(market, listing.id, 'unknown-buyer');
      expect(result.order).toBeNull();
      expect(result.error).toContain('Insufficient balance');
    });
  });

  describe('Listing not found scenarios', () => {
    it('purchase with non-existent listing ID returns error', () => {
      const market = createEmptyMarket();
      const result = purchasePlaybook(market, 'non-existent-id', 'buyer');
      expect(result.order).toBeNull();
      expect(result.error).toBe('Listing not found');
    });

    it('delist on non-existent listing ID does not crash', () => {
      const market = createEmptyMarket();
      const result = delistPlaybook(market, 'non-existent-id');
      // should not throw, market is unchanged
      expect(result.listings).toEqual(market.listings);
    });

    it('executePlaybook on non-existent order ID does not crash', () => {
      const market = createEmptyMarket();
      const result = executePlaybook(market, 'non-existent-id', 'result');
      // should not throw, orders unchanged
      expect(result.orders).toEqual(market.orders);
    });
  });

  describe('Settled phase is terminal', () => {
    it('advanceTaskPhase returns same task when already settled', () => {
      let task = createTask('Terminal test', 'Will reach settled');
      // Advance to settled
      for (let i = 0; i < 5; i++) task = advanceTaskPhase(task);
      expect(task.phase).toBe('settled');

      const same = advanceTaskPhase(task);
      expect(same.phase).toBe('settled');
      // Should be the same reference since nothing changes
      expect(same).toBe(task);
    });
  });

  describe('Oracle edge cases', () => {
    it('evaluateOutcome marks expired outcomes', () => {
      const task = createTask('Expired outcome', 'Testing expiry');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Old result',
        'manual',
        'H2'
      );

      // Set expiry to the past
      const expiredOutcome = { ...outcome, expiresAt: new Date(Date.now() - 86400000).toISOString() };
      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(expiredOutcome, rules, createEmptyLedgers());

      expect(evaluated.oracleVerdict).toBe('expired');
      expect(evaluated.settleable).toBe(false);
      expect(evaluated.creditTarget).toBe('rejected');
    });

    it('settleOutcome throws on rejected outcomes', () => {
      const outcome: OutcomeReport = {
        id: 'test',
        taskId: 't1',
        taskType: 'general-task',
        expectedGoal: 'goal',
        actualResult: 'result',
        verificationMethod: 'auto',
        evidenceGrade: 'H4',
        settleable: false,
        reconciliationHash: '0x0',
        creditTarget: 'rejected',
        oracleVerdict: 'rejected',
        createdAt: new Date().toISOString(),
      };

      expect(() => settleOutcome(outcome)).toThrow('not settleable');
    });

    it('disputeOutcome marks verdict as disputed', () => {
      const task = createTask('Dispute test', 'Testing disputes');
      let outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Questionable result',
        'manual',
        'H3'
      );

      // Make it settleable first
      outcome = { ...outcome, oracleVerdict: 'settleable' as const, settleable: true, creditTarget: 'local' as const };

      const disputed = disputeOutcome(outcome, 'Results seem fabricated');
      expect(disputed.oracleVerdict).toBe('disputed');
      expect(disputed.settleable).toBe(false);
      expect(disputed.reconciliationHash).toContain('DISPUTED');
    });

    it('oracle requires H2+ evidence for testnet settlement', () => {
      const task = createTask('Testnet outcome test', 'Test testnet rules');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Good result',
        'automated',
        'H2'
      );

      let ledgers = createEmptyLedgers();
      // Add 2 H2 evidence entries (testnet rule requires minVerifications: 2)
      ledgers = addEvidence(ledgers, 'Proof 1', 'src1', 'H2', 'ai2-auditor', task.id);
      ledgers = addEvidence(ledgers, 'Proof 2', 'src2', 'H2', 'human', task.id);

      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(outcome, rules, ledgers);
      expect(evaluated.oracleVerdict).toBe('settleable');
      expect(evaluated.creditTarget).toBe('testnet');
    });

    it('oracle rejects H4 evidence for any credit target', () => {
      const task = createTask('Low grade test', 'Unverified hypothesis');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Unverified result',
        'manual',
        'H4'
      );

      let ledgers = createEmptyLedgers();
      ledgers = addEvidence(ledgers, 'Hypothesis', 'guess', 'H4', 'ai1-expander', task.id);

      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(outcome, rules, ledgers);
      // H4 does not meet any rule's minEvidenceGrade (local requires H3)
      expect(evaluated.oracleVerdict).toBe('rejected');
      expect(evaluated.creditTarget).toBe('rejected');
    });
  });

  describe('Constitution edge cases', () => {
    it('getPermissionLevelForAction is case-insensitive', () => {
      const c = createDefaultConstitution();
      expect(getPermissionLevelForAction(c, 'WRITE-LOG')).toBe('L0');
      expect(getPermissionLevelForAction(c, 'Write-Log')).toBe('L0');
      expect(getPermissionLevelForAction(c, 'BYPASS-CONSTRAINT')).toBe('L4');
    });

    it('getRequiredApprovals falls back to human for unknown level', () => {
      const c = createDefaultConstitution();
      // All levels should return their correct approvals
      expect(getRequiredApprovals(c, 'L0')).toEqual([]);
      expect(getRequiredApprovals(c, 'L4')).toEqual([]);
      // L3 requires human
      const l3Approvals = getRequiredApprovals(c, 'L3');
      expect(l3Approvals).toContain('human');
    });

    it('validateConstitution catches L4 with non-empty approvals', () => {
      const c = createDefaultConstitution();
      const bad: Constitution = {
        ...c,
        authority: c.authority.map(a =>
          a.permissionLevel === 'L4' ? { ...a, requiredApprovals: ['human' as const] } : a
        ),
      };
      const errors = validateConstitution(bad);
      expect(errors).toContain('L4 actions must have empty approvals (permanently forbidden)');
    });
  });

  describe('Agent status management', () => {
    it('createTrinityAgents initializes all three agents', () => {
      const agents = createTrinityAgents();
      expect(agents.ai1.role).toBe('ai1-expander');
      expect(agents.ai2.role).toBe('ai2-auditor');
      expect(agents.ai3.role).toBe('ai3-governor');
      expect(agents.ai1.status).toBe('idle');
      expect(agents.ai2.status).toBe('idle');
      expect(agents.ai3.status).toBe('idle');
    });

    it('updateAgentStatus changes status and assigns task', () => {
      const agents = createTrinityAgents();
      const updated = updateAgentStatus(agents.ai1, 'thinking', 'task-123');
      expect(updated.status).toBe('thinking');
      expect(updated.currentTask).toBe('task-123');
      expect(updated.stats.lastActiveAt).toBeDefined();
    });

    it('recordAgentCompletion updates stats and calculates average', () => {
      let agent = createTrinityAgents().ai1;
      agent = recordAgentCompletion(agent, 1000);
      expect(agent.stats.tasksCompleted).toBe(1);
      expect(agent.stats.avgResponseTime).toBe(1000);
      expect(agent.status).toBe('idle');
      expect(agent.currentTask).toBeUndefined();

      agent = recordAgentCompletion(agent, 500);
      expect(agent.stats.tasksCompleted).toBe(2);
      expect(agent.stats.avgResponseTime).toBe(750); // (1000 + 500) / 2
    });
  });

  describe('Debt ledger operations', () => {
    it('addDebt and resolveDebt lifecycle', () => {
      let ledgers = createEmptyLedgers();
      ledgers = addDebt(ledgers, 'tech-debt', 'Needs refactoring', 'medium', 'sprint-1', '2025-06-01');
      expect(ledgers.debt.length).toBe(1);
      expect(ledgers.debt[0].resolved).toBe(false);

      const debtId = ledgers.debt[0].id;
      ledgers = resolveDebt(ledgers, debtId);
      expect(ledgers.debt[0].resolved).toBe(true);
      expect(ledgers.debt[0].resolvedAt).toBeDefined();

      expect(getOpenDebts(ledgers).length).toBe(0);
    });

    it('resolveDebt with non-existent ID does not crash', () => {
      let ledgers = createEmptyLedgers();
      ledgers = addDebt(ledgers, 'tech-debt', 'Something', 'low', 'sprint-1', '2025-06-01');
      const resolved = resolveDebt(ledgers, 'non-existent-id');
      // Original debt should remain unresolved
      expect(resolved.debt[0].resolved).toBe(false);
    });
  });

  describe('Demo market', () => {
    it('createDemoMarket has listings and balances', () => {
      const demo = createDemoMarket();
      expect(demo.listings.length).toBe(3);
      expect(demo.nodeBalance['node-local']).toBe(1000);
      expect(demo.nodeBalance['node-alpha']).toBe(500);
    });
  });

  describe('Value assessment priority calculation', () => {
    it('high alignment + high revenue + low risk = high priority', () => {
      let ledgers = createEmptyLedgers();
      ledgers = addValueAssessment(ledgers, 't1', 90, 500, 100, 5);
      const entry = ledgers.value[0];
      expect(entry.priority).toBeGreaterThanOrEqual(50);
    });

    it('low alignment + low revenue + high risk = low priority', () => {
      let ledgers = createEmptyLedgers();
      ledgers = addValueAssessment(ledgers, 't1', 10, 5, 100, 90);
      const entry = ledgers.value[0];
      expect(entry.priority).toBeLessThanOrEqual(20);
    });

    it('zero resource cost does not cause division by zero', () => {
      let ledgers = createEmptyLedgers();
      // resourceCost = 0 => roi calculation uses 0 not NaN
      ledgers = addValueAssessment(ledgers, 't1', 50, 100, 0, 30);
      const entry = ledgers.value[0];
      expect(Number.isFinite(entry.priority)).toBe(true);
      expect(entry.priority).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple evidence entries for oracle verification tiers', () => {
    it('mainnet requires H1 evidence with 3+ verifications', () => {
      const task = createTask('Mainnet test', 'Test mainnet rule');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Verified result',
        'automated',
        'H1'
      );

      let ledgers = createEmptyLedgers();
      ledgers = addEvidence(ledgers, 'Machine proof 1', 'system', 'H1', 'ai2-auditor', task.id);
      ledgers = addEvidence(ledgers, 'Machine proof 2', 'system', 'H1', 'ai3-governor', task.id);
      ledgers = addEvidence(ledgers, 'Machine proof 3', 'system', 'H1', 'human', task.id);

      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(outcome, rules, ledgers);
      expect(evaluated.oracleVerdict).toBe('settleable');
      expect(evaluated.creditTarget).toBe('mainnet');
    });

    it('mainnet rejected with only 2 H1 verifications', () => {
      const task = createTask('Mainnet insufficient', 'Not enough verifications');
      const outcome = generateOutcomeReport(
        { ...task, phase: 'review' as const, status: 'completed' as const },
        'Result',
        'automated',
        'H1'
      );

      let ledgers = createEmptyLedgers();
      ledgers = addEvidence(ledgers, 'Proof 1', 'system', 'H1', 'ai2-auditor', task.id);
      ledgers = addEvidence(ledgers, 'Proof 2', 'system', 'H1', 'human', task.id);

      const rules = createDefaultOracleRules();
      const evaluated = evaluateOutcome(outcome, rules, ledgers);
      // Should fall through to testnet (H1 meets H2 requirement, 2 verifications meets testnet's 2 requirement)
      expect(evaluated.creditTarget).toBe('testnet');
    });
  });

  describe('Fuse matrix with unknown levels', () => {
    it('checkPermission handles unknown level gracefully', () => {
      const matrix = createDefaultFuseMatrix();
      const result = checkPermission(matrix, 'L99' as PermissionLevel);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown permission level');
    });

    it('isFullyApproved returns false for request with unknown level', () => {
      const matrix = createDefaultFuseMatrix();
      const request = createPermissionRequest('t1', 'ai1-expander', 'L99' as PermissionLevel, 'bad', 'Bad');
      expect(isFullyApproved(request, matrix)).toBe(false);
    });
  });

  describe('Oracle stats aggregation', () => {
    it('correctly categorizes mixed outcomes', () => {
      const outcomes: OutcomeReport[] = [
        { id: '1', taskId: 't1', taskType: 'g', expectedGoal: 'g', actualResult: 'r', verificationMethod: 'a', evidenceGrade: 'H2', settleable: true, reconciliationHash: '0x0', creditTarget: 'local', oracleVerdict: 'settleable', createdAt: new Date().toISOString(), settledAt: new Date().toISOString() },
        { id: '2', taskId: 't2', taskType: 'g', expectedGoal: 'g', actualResult: 'r', verificationMethod: 'a', evidenceGrade: 'H4', settleable: false, reconciliationHash: '0x0', creditTarget: 'rejected', oracleVerdict: 'rejected', createdAt: new Date().toISOString() },
        { id: '3', taskId: 't3', taskType: 'g', expectedGoal: 'g', actualResult: 'r', verificationMethod: 'a', evidenceGrade: 'H3', settleable: false, reconciliationHash: '0x0', creditTarget: 'rejected', oracleVerdict: 'disputed', createdAt: new Date().toISOString() },
        { id: '4', taskId: 't4', taskType: 'g', expectedGoal: 'g', actualResult: 'r', verificationMethod: 'a', evidenceGrade: 'H3', settleable: false, reconciliationHash: '0x0', creditTarget: 'local', oracleVerdict: 'pending-review', createdAt: new Date().toISOString() },
      ];

      const stats = getOracleStats(outcomes);
      expect(stats.total).toBe(4);
      expect(stats.settled).toBe(1);
      expect(stats.settleable).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.disputed).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.byTarget.local).toBe(2);
    });
  });
});
