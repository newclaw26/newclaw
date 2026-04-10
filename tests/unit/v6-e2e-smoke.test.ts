// ============================================================================
// NewClaw V6 — Comprehensive E2E Smoke Test
//
// Validates the FULL system across all 13 engine modules in a single
// simulated user session: Genesis -> Constitution -> Task Pipeline ->
// PoO -> Economy -> Market -> Oracle -> Permissions -> Persistence ->
// Node Metrics -> Entropy GC -> Adapter Chain.
//
// 20+ test cases proving the entire system works end-to-end.
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Module 1: Identity
import {
  generateIdentity,
  signMessage,
  verifySignature,
  deriveAddress,
} from '@/lib/v6/identity';

// Module 2: Economy
import {
  createEconomyState,
  issueReward,
  spend,
  receive,
  getHalvingInfo,
  calculatePooScore,
  getEconomyStatus,
} from '@/lib/v6/economy';

// Module 3: PoO Verifier
import {
  createPooState,
  submitForVerification,
  finalizeVerification,
  calculatePriorityScore,
  getPooStats,
  meetsExecutionThreshold,
  scoreToEvidenceGrade,
  evidenceGradeToScore,
} from '@/lib/v6/poo-verifier';

// Module 4: Constitution
import {
  createDefaultConstitution,
  validateConstitution,
  getPermissionLevelForAction,
  getRequiredApprovals,
  addGoal,
  addConstraint,
  updateValueWeights,
  completeMilestone,
} from '@/lib/v6/constitution';

// Module 5: Engine (Trinity Pipeline)
import {
  createTask,
  advanceTaskPhase,
  createTrinityAgents,
  createOutput,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
  updateAgentStatus,
  recordAgentCompletion,
  blockTask,
  failTask,
} from '@/lib/v6/engine';

// Module 6: Ledger
import {
  createEmptyLedgers,
  addEvidence,
  addValueAssessment,
  addDebt,
  resolveDebt,
  addLocalLedgerEntry,
  addTemporalEntry,
  addCaseLaw,
  getActiveEvidence,
  getEvidenceByGrade,
  getBalance,
  getLedgerSummary,
  refreshTemporalStatuses,
  getOpenDebts,
  searchCaseLaw,
} from '@/lib/v6/ledger';

// Module 7: Oracle
import {
  generateOutcomeReport,
  evaluateOutcome,
  settleOutcome,
  createDefaultOracleRules,
  getOracleStats,
  disputeOutcome,
} from '@/lib/v6/oracle';

// Module 8: Fuse Matrix (Permissions)
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

// Module 9: Promotion
import {
  createInitialNodeStatus,
  calculateNodeMetrics,
  calculatePromotionProgress,
  checkPromotionEligibility,
  promoteNode,
  STAGE_CONFIG,
} from '@/lib/v6/promotion';

// Module 10: Market
import {
  createEmptyMarket,
  createPlaybookListing,
  listPlaybook,
  purchasePlaybook,
  recordMarketTransaction,
  getMarketStats,
  executePlaybook,
} from '@/lib/v6/market';

// Module 11: Governance Persistence
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  exportAsFiles,
  importFromFiles,
  entropyGC,
  setStorageOverride,
} from '@/lib/v6/governance-persistence';

// Module 12: Adapter
import {
  fetchIdentity,
  fetchGenesisStatus,
  fetchNewBBalance,
  fetchPooStats,
  fetchSandboxStatus,
  setAdapterPooState,
} from '@/lib/v6/adapter';

// ============================================================================
// In-memory Storage for test isolation
// ============================================================================

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem(key: string) { return store.get(key) ?? null; },
    setItem(key: string, value: string) { store.set(key, value); },
    removeItem(key: string) { store.delete(key); },
    clear() { store.clear(); },
    key(index: number) { return Array.from(store.keys())[index] ?? null; },
    get length() { return store.size; },
  };
}

// ============================================================================
// Shared session state — accumulated across the ordered describe blocks.
// ============================================================================

let identity: ReturnType<typeof generateIdentity>;
let economyState: ReturnType<typeof createEconomyState>;
let constitution: ReturnType<typeof createDefaultConstitution>;
let ledgers: ReturnType<typeof createEmptyLedgers>;
let task: ReturnType<typeof createTask>;
let completedTask: ReturnType<typeof createTask>; // after pipeline finishes
let pooState: ReturnType<typeof createPooState>;
let fuseMatrix: ReturnType<typeof createDefaultFuseMatrix>;
let marketState: ReturnType<typeof createEmptyMarket>;
let nodeStatus: ReturnType<typeof createInitialNodeStatus>;
let memStorage: Storage;

describe('NewClaw V6 — Full E2E Smoke Test (13 Modules)', () => {
  // ────────────────────────────────────────────────────────────────────────
  // Setup: fresh state for the entire session
  // ────────────────────────────────────────────────────────────────────────

  beforeEach(() => {
    // Ensure clean localStorage between runs
    try { localStorage.clear(); } catch { /* noop in restricted envs */ }
  });

  afterEach(() => {
    try { localStorage.clear(); } catch { /* noop */ }
  });

  // ========================================================================
  // 1. GENESIS — Identity + Economy bootstrap
  // ========================================================================

  describe('1. Genesis: Identity & Economy Bootstrap', () => {
    it('1a. generates a valid DID identity', () => {
      identity = generateIdentity();

      expect(identity.nodeId).toMatch(/^did:newclaw:[0-9a-f]{40}$/);
      expect(identity.publicKey).toHaveLength(64);
      expect(identity.address).toMatch(/^ncw1[0-9a-f]{38}$/);
      expect(identity.isLocked).toBe(false);
      expect(identity.createdAt).toBeTruthy();
    });

    it('1b. creates economy state with 100 New.B genesis balance', () => {
      economyState = createEconomyState();

      expect(economyState.balance).toBe(100);
      expect(economyState.totalEarned).toBe(100);
      expect(economyState.totalSpent).toBe(0);
      expect(economyState.halvingEpoch).toBe(0);
      expect(economyState.currentRewardRate).toBe(10);
      expect(economyState.transactions).toHaveLength(1);
      expect(economyState.transactions[0].type).toBe('genesis');
    });

    it('1c. identity signing and verification round-trip', () => {
      const message = 'Genesis handshake';
      const sig = signMessage(identity.publicKey, message);

      expect(sig).toHaveLength(64);
      expect(verifySignature(identity.publicKey, message, sig)).toBe(true);
    });

    it('1d. address derivation is deterministic', () => {
      const addr1 = deriveAddress(identity.publicKey);
      const addr2 = deriveAddress(identity.publicKey);

      expect(addr1).toBe(addr2);
      expect(addr1).toBe(identity.address);
    });
  });

  // ========================================================================
  // 2. CONSTITUTION — Load, validate, verify authority rules
  // ========================================================================

  describe('2. Constitution: Default Load & Validation', () => {
    it('2a. loads default constitution with 5 authority rules', () => {
      constitution = createDefaultConstitution();

      expect(constitution.authority).toHaveLength(5);
      const levels = constitution.authority.map(a => a.permissionLevel);
      expect(levels).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
    });

    it('2b. value weights sum to 100', () => {
      const totalWeight = constitution.values.reduce((s, v) => s + v.weight, 0);
      expect(totalWeight).toBe(100);
    });

    it('2c. passes validation with zero errors', () => {
      const errors = validateConstitution(constitution);
      expect(errors).toEqual([]);
    });

    it('2d. L4 actions are permanently forbidden', () => {
      const l4 = constitution.authority.find(a => a.permissionLevel === 'L4');
      expect(l4).toBeDefined();
      expect(l4!.requiredApprovals).toEqual([]);
    });

    it('2e. permission level lookup resolves correctly', () => {
      expect(getPermissionLevelForAction(constitution, 'write-log')).toBe('L0');
      expect(getPermissionLevelForAction(constitution, 'read-query')).toBe('L1');
      expect(getPermissionLevelForAction(constitution, 'testnet-transfer')).toBe('L2');
      expect(getPermissionLevelForAction(constitution, 'real-wallet')).toBe('L3');
      expect(getPermissionLevelForAction(constitution, 'bypass-constraint')).toBe('L4');
    });
  });

  // ========================================================================
  // 3. TASK PIPELINE — Proposal -> Audit -> Approval -> Completion
  // ========================================================================

  describe('3. Task Pipeline: Full Lifecycle', () => {
    it('3a. creates a task in proposal phase', () => {
      task = createTask(
        'Generate playbook for E2E testing',
        'Create comprehensive test suite covering all V6 modules',
        'ai1-expander',
        'L0',
      );

      expect(task.phase).toBe('proposal');
      expect(task.status).toBe('draft');
      expect(task.createdBy).toBe('ai1-expander');
    });

    it('3b. runs proposal phase (AI-1 expander)', () => {
      const result = runProposalPhase(task, 'Proposed: comprehensive E2E test playbook');

      expect(result.blocked).toBe(false);
      expect(result.task.phase).toBe('audit');
      expect(result.task.status).toBe('pending-audit');
      expect(result.events).toHaveLength(1);
      task = result.task;
    });

    it('3c. runs audit phase (AI-2 auditor)', () => {
      const result = runAuditPhase(task, constitution, 'Low risk, well-structured proposal', 'low');

      expect(result.blocked).toBe(false);
      expect(result.task.phase).toBe('approval');
      expect(result.task.status).toBe('pending-approval');
      task = result.task;
    });

    it('3d. runs approval phase (AI-3 governor)', () => {
      const result = runApprovalPhase(task, constitution, true, 50);

      expect(result.blocked).toBe(false);
      expect(result.task.phase).toBe('execution');
      expect(result.task.status).toBe('executing');
      task = result.task;
    });

    it('3e. advances through execution to completed', () => {
      // execution -> review
      task = advanceTaskPhase(task);
      expect(task.phase).toBe('review');
      expect(task.status).toBe('completed');

      // review -> settled
      task = advanceTaskPhase(task);
      expect(task.phase).toBe('settled');
      expect(task.status).toBe('completed');

      completedTask = task;
    });

    it('3f. settled task does not advance further', () => {
      const again = advanceTaskPhase(completedTask);
      expect(again.phase).toBe('settled');
    });
  });

  // ========================================================================
  // 4. PoO VERIFICATION — Score calculation & threshold check
  // ========================================================================

  describe('4. PoO Verification: Priority Score', () => {
    it('4a. calculates priority score >= 85 for high-quality outcome', () => {
      pooState = createPooState();

      const [updatedState, pooTask] = submitForVerification(
        pooState,
        {
          title: completedTask.title,
          description: completedTask.description,
          proposedBy: 'ai1-expander',
        },
        {
          scoreComponents: {
            goalFit: 95,
            pooOutcome: 90,
            evidenceLevel: 100,
            cost: 1,
            debtImpact: 0,
          },
          evidenceGrade: 'H1',
        },
      );

      pooState = updatedState;

      expect(pooTask.priorityScore).toBeDefined();
      expect(pooTask.priorityScore!).toBeGreaterThanOrEqual(85);
      expect(meetsExecutionThreshold(pooTask.priorityScore!)).toBe(true);
    });

    it('4b. finalizes verification as verified', () => {
      const taskId = Array.from(pooState.tasks.keys())[0];
      const [updatedState, finalized] = finalizeVerification(pooState, taskId, true);

      pooState = updatedState;
      expect(finalized.status).toBe('verified');
      expect(finalized.finalizedAt).toBeTruthy();
    });

    it('4c. PoO stats reflect verified task', () => {
      const stats = getPooStats(pooState);

      expect(stats.totalTasks).toBe(1);
      expect(stats.verified).toBe(1);
      expect(stats.rejected).toBe(0);
      expect(stats.pending).toBe(0);
    });

    it('4d. evidence grade derived from score matches H1', () => {
      const taskId = Array.from(pooState.tasks.keys())[0];
      const pooTask = pooState.tasks.get(taskId)!;
      const grade = scoreToEvidenceGrade(pooTask.priorityScore!);

      expect(grade).toBe('H1');
      expect(evidenceGradeToScore('H1')).toBe(100);
    });
  });

  // ========================================================================
  // 5. ECONOMY REWARD — Issue PoO reward, verify balance
  // ========================================================================

  describe('5. Economy Reward: PoO Mining', () => {
    it('5a. issues PoO reward and increases balance', () => {
      const balanceBefore = economyState.balance;
      const result = issueReward(economyState, completedTask.id);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      economyState = result.value.state;
      expect(economyState.balance).toBe(balanceBefore + 10); // default reward = 10
      expect(result.value.transaction.type).toBe('poo_reward');
    });

    it('5b. halving info is consistent', () => {
      const info = getHalvingInfo(economyState);

      expect(info.epoch).toBe(0);
      expect(info.currentRewardRate).toBe(10);
      expect(info.rewardsUntilNextHalving).toBeLessThanOrEqual(100);
      expect(info.nextRewardRate).toBe(5); // 10 / 2
    });

    it('5c. economy status builds correctly', () => {
      const status = getEconomyStatus(economyState);

      expect(status.newbBalance).toBe(110);
      expect(status.halvingEpoch).toBe(0);
      expect(status.pooVerified).toBe(1); // one reward tx
    });
  });

  // ========================================================================
  // 6. MARKET TRADE — List playbook, purchase, verify ledger entries
  // ========================================================================

  describe('6. Market Trade: Playbook Listing & Purchase', () => {
    it('6a. creates and lists a playbook from completed task', () => {
      marketState = createEmptyMarket();
      const listing = createPlaybookListing(
        completedTask,
        '# E2E Test Playbook\n\nStep-by-step guide...',
        50,
        'testing',
        ['e2e', 'v6'],
      );

      expect(listing.quality).toBe(75); // completed task quality
      expect(listing.status).toBe('listed');

      marketState = listPlaybook(marketState, listing);
      expect(marketState.listings).toHaveLength(1);
    });

    it('6b. buyer purchases playbook and balance decreases', () => {
      // Give buyer some balance
      marketState = {
        ...marketState,
        nodeBalance: { ...marketState.nodeBalance, 'node-buyer': 200 },
      };

      const listingId = marketState.listings[0].id;
      const { market, order, error } = purchasePlaybook(marketState, listingId, 'node-buyer');

      expect(error).toBeUndefined();
      expect(order).not.toBeNull();
      expect(order!.status).toBe('completed');
      expect(market.nodeBalance['node-buyer']).toBe(150); // 200 - 50
      expect(market.nodeBalance['node-local']).toBe(1050); // 1000 + 50

      marketState = market;
    });

    it('6c. ledger records both buyer and seller entries', () => {
      ledgers = createEmptyLedgers();
      const order = marketState.orders[0];

      ledgers = recordMarketTransaction(ledgers, order, 'buyer');
      ledgers = recordMarketTransaction(ledgers, order, 'seller');

      expect(ledgers.localLedger).toHaveLength(2);

      const buyerEntry = ledgers.localLedger.find(e => e.amount < 0);
      const sellerEntry = ledgers.localLedger.find(e => e.amount > 0);

      expect(buyerEntry).toBeDefined();
      expect(sellerEntry).toBeDefined();
      expect(buyerEntry!.amount).toBe(-50);
      expect(sellerEntry!.amount).toBe(50);
    });

    it('6d. market stats reflect the trade', () => {
      const stats = getMarketStats(marketState);

      expect(stats.sold).toBe(1);
      expect(stats.totalVolume).toBe(50);
      expect(stats.totalOrders).toBe(1);
    });
  });

  // ========================================================================
  // 7. ORACLE SETTLEMENT — Generate report, evaluate, settle
  // ========================================================================

  describe('7. Oracle Settlement: Outcome Validation', () => {
    it('7a. generates outcome report from completed task', () => {
      const report = generateOutcomeReport(
        completedTask,
        'All 13 modules tested and passing',
        'Automated E2E test suite',
        'H2',
      );

      expect(report.oracleVerdict).toBe('pending-review');
      expect(report.settleable).toBe(false);
      expect(report.reconciliationHash).toMatch(/^0x[0-9a-f]+$/);
    });

    it('7b. evaluates outcome to local credit target', () => {
      // Add evidence entries so the oracle rule is satisfied
      ledgers = addEvidence(
        ledgers,
        'E2E test passed',
        'vitest runner',
        'H2',
        'ai2-auditor',
        completedTask.id,
        ['e2e'],
      );
      ledgers = addEvidence(
        ledgers,
        'Code review approved',
        'ai3-governor review',
        'H2',
        'ai3-governor',
        completedTask.id,
        ['review'],
      );

      const rules = createDefaultOracleRules();
      let report = generateOutcomeReport(
        completedTask,
        'All 13 modules tested and passing',
        'Automated E2E test suite',
        'H2',
      );

      report = evaluateOutcome(report, rules, ledgers);

      // H2 + 2 verifications => meets testnet rule
      expect(report.oracleVerdict).toBe('settleable');
      expect(report.settleable).toBe(true);
      expect(report.creditTarget).toBe('testnet');
    });

    it('7c. settles the outcome and records settledAt', () => {
      const rules = createDefaultOracleRules();
      let report = generateOutcomeReport(
        completedTask,
        'All 13 modules tested and passing',
        'Automated E2E test suite',
        'H2',
      );
      report = evaluateOutcome(report, rules, ledgers);
      const settled = settleOutcome(report);

      expect(settled.settledAt).toBeTruthy();
    });

    it('7d. oracle stats accumulate correctly', () => {
      const rules = createDefaultOracleRules();
      let report = generateOutcomeReport(
        completedTask,
        'Test result',
        'Automated',
        'H2',
      );
      report = evaluateOutcome(report, rules, ledgers);
      const settled = settleOutcome(report);

      const stats = getOracleStats([settled]);

      expect(stats.total).toBe(1);
      expect(stats.settled).toBe(1);
      expect(stats.byTarget.testnet).toBe(1);
    });
  });

  // ========================================================================
  // 8. PERMISSION FLOW — L3 multi-party approval chain
  // ========================================================================

  describe('8. Permission Flow: L3 Multi-Party Approval', () => {
    it('8a. creates L3 permission request', () => {
      fuseMatrix = createDefaultFuseMatrix();
      const request = createPermissionRequest(
        completedTask.id,
        'ai1-expander',
        'L3',
        'real-wallet transaction',
        'Deploy contract to mainnet',
      );

      expect(request.status).toBe('pending');
      expect(request.level).toBe('L3');
      expect(request.approvals).toHaveLength(0);
    });

    it('8b. AI-2 approves, still pending', () => {
      let request = createPermissionRequest(
        completedTask.id,
        'ai1-expander',
        'L3',
        'real-wallet transaction',
        'Deploy contract to mainnet',
      );

      request = addApproval(request, 'ai2-auditor', 'approve', 'Risk assessment passed');

      expect(request.approvals).toHaveLength(1);
      expect(isFullyApproved(request, fuseMatrix)).toBe(false);
    });

    it('8c. AI-2 + AI-3 + human approval => fully approved', () => {
      let request = createPermissionRequest(
        completedTask.id,
        'ai1-expander',
        'L3',
        'real-wallet transaction',
        'Deploy contract to mainnet',
      );

      request = addApproval(request, 'ai2-auditor', 'approve', 'Audit clear');
      request = addApproval(request, 'ai3-governor', 'approve', 'Budget approved');
      request = addApproval(request, 'human', 'approve', 'Human dual-sign confirmed');

      expect(isFullyApproved(request, fuseMatrix)).toBe(true);

      request = resolveRequest(request, fuseMatrix);
      expect(request.status).toBe('approved');
      expect(request.resolvedAt).toBeTruthy();
    });

    it('8d. L0 auto-executes without approval', () => {
      expect(canAutoExecute(fuseMatrix, 'L0')).toBe(true);
      expect(canAutoExecute(fuseMatrix, 'L3')).toBe(false);
    });

    it('8e. L4 is always forbidden', () => {
      const check = checkPermission(fuseMatrix, 'L4');

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain('permanently forbidden');
    });
  });

  // ========================================================================
  // 9. GOVERNANCE PERSISTENCE — Save & load from localStorage
  // ========================================================================

  describe('9. Governance Persistence: localStorage Round-Trip', () => {
    it('9a. saves ledgers to localStorage', () => {
      memStorage = createMemoryStorage();
      setStorageOverride(memStorage);

      // Ledgers already have evidence + local ledger entries from earlier steps
      saveToLocalStorage(ledgers);

      const loaded = loadFromLocalStorage();
      expect(loaded).not.toBeNull();

      setStorageOverride(null);
    });

    it('9b. loaded data matches saved data (evidence count)', () => {
      memStorage = createMemoryStorage();
      setStorageOverride(memStorage);

      saveToLocalStorage(ledgers);
      const loaded = loadFromLocalStorage()!;

      expect(loaded.evidence).toHaveLength(ledgers.evidence.length);
      expect(loaded.localLedger).toHaveLength(ledgers.localLedger.length);

      setStorageOverride(null);
    });

    it('9c. export/import file round-trip preserves data', () => {
      const files = exportAsFiles(ledgers);

      expect(files['EVIDENCE.jsonl']).toBeDefined();
      expect(files['VALUE.json']).toBeDefined();
      expect(files['LEDGER_LOCAL.jsonl']).toBeDefined();

      const reimported = importFromFiles(files);

      expect(reimported.evidence).toHaveLength(ledgers.evidence.length);
      expect(reimported.localLedger).toHaveLength(ledgers.localLedger.length);
    });

    it('9d. clearLocalStorage removes all data', () => {
      memStorage = createMemoryStorage();
      setStorageOverride(memStorage);

      saveToLocalStorage(ledgers);
      clearLocalStorage();

      const loaded = loadFromLocalStorage();
      expect(loaded).toBeNull();

      setStorageOverride(null);
    });
  });

  // ========================================================================
  // 10. NODE METRICS — Refresh & promotion eligibility
  // ========================================================================

  describe('10. Node Metrics: Refresh & Promotion', () => {
    it('10a. creates initial node status at stage-0', () => {
      nodeStatus = createInitialNodeStatus();

      expect(nodeStatus.currentStage).toBe('stage-0');
      expect(nodeStatus.metrics.totalTasks).toBe(0);
    });

    it('10b. calculates metrics from tasks and outcomes', () => {
      const rules = createDefaultOracleRules();
      let report = generateOutcomeReport(
        completedTask,
        'Outcome result',
        'Automated',
        'H2',
      );
      report = evaluateOutcome(report, rules, ledgers);
      const settled = settleOutcome(report);

      const metrics = calculateNodeMetrics(
        [settled],
        ledgers,
        [],
        new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        [completedTask],
      );

      expect(metrics.totalTasks).toBe(1);
      expect(metrics.completedTasks).toBe(1);
      expect(metrics.settledOutcomes).toBe(1);
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it('10c. promotion eligibility check returns reasons', () => {
      const { eligible, reasons } = checkPromotionEligibility(
        nodeStatus,
        [], // no outcomes yet for nodeStatus
        ledgers,
        [],
      );

      // Not yet eligible: needs more outcomes
      expect(eligible).toBe(false);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('10d. stage config is defined for all 5 stages', () => {
      const stages = ['stage-0', 'stage-1', 'stage-2', 'stage-3', 'stage-4'] as const;

      for (const stage of stages) {
        const config = STAGE_CONFIG[stage];
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
        expect(config.minOutcomes).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ========================================================================
  // 11. ENTROPY GC — Expired evidence cleanup
  // ========================================================================

  describe('11. Entropy GC: Evidence & Temporal Cleanup', () => {
    it('11a. expired evidence is removed by GC', () => {
      let gcLedgers = createEmptyLedgers();

      // Add evidence that expired 30 days ago
      const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      gcLedgers = addEvidence(
        gcLedgers,
        'Old finding',
        'old-test',
        'H3',
        'ai2-auditor',
        'task-old',
        ['expired'],
        expiredDate,
      );

      // Add current evidence (no expiry)
      gcLedgers = addEvidence(
        gcLedgers,
        'Current finding',
        'new-test',
        'H1',
        'ai2-auditor',
        'task-new',
        ['current'],
      );

      expect(gcLedgers.evidence).toHaveLength(2);

      // Run GC with 7-day max age
      const cleaned = entropyGC(gcLedgers);

      // Expired evidence (30 days ago) should be removed; current kept
      expect(cleaned.evidence).toHaveLength(1);
      expect(cleaned.evidence[0].conclusion).toBe('Current finding');
    });

    it('11b. expired temporal entries are removed by GC', () => {
      let gcLedgers = createEmptyLedgers();

      const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      gcLedgers = addTemporalEntry(
        gcLedgers,
        'conclusion-old',
        expiredDate,
        expiredDate, // already expired
        '7d',
      );
      gcLedgers = addTemporalEntry(
        gcLedgers,
        'conclusion-new',
        new Date().toISOString(),
        futureDate,
        '30d',
      );

      expect(gcLedgers.temporal).toHaveLength(2);

      const cleaned = entropyGC(gcLedgers);

      expect(cleaned.temporal).toHaveLength(1);
      expect(cleaned.temporal[0].conclusionId).toBe('conclusion-new');
    });

    it('11c. permanent ledger types are unaffected by GC', () => {
      let gcLedgers = createEmptyLedgers();

      gcLedgers = addDebt(gcLedgers, 'tech-debt', 'Old debt', 'low', 'task-1', '2025-01-01');
      gcLedgers = addCaseLaw(
        gcLedgers,
        'failure',
        'Old failure',
        'Something broke',
        'minor',
        ['task-1'],
      );

      const cleaned = entropyGC(gcLedgers);

      expect(cleaned.debt).toHaveLength(1);
      expect(cleaned.caseLaw).toHaveLength(1);
    });
  });

  // ========================================================================
  // 12. ADAPTER CHAIN — All 5 adapter functions return correct shapes
  // ========================================================================

  describe('12. Adapter Chain: All 5 Adapter Functions', () => {
    it('12a. fetchIdentity returns valid HostIdentity', async () => {
      const id = await fetchIdentity();

      expect(id.nodeId).toMatch(/^did:newclaw:/);
      expect(id.publicKey).toHaveLength(64);
      expect(id.address).toMatch(/^ncw1/);
      expect(typeof id.isLocked).toBe('boolean');
    });

    it('12b. fetchGenesisStatus returns genesis shape', async () => {
      const status = await fetchGenesisStatus();

      expect(typeof status.isComplete).toBe('boolean');
      expect(typeof status.hasIdentity).toBe('boolean');
      expect(typeof status.hasEconomy).toBe('boolean');
    });

    it('12c. fetchNewBBalance returns EconomyStatus shape', async () => {
      const status = await fetchNewBBalance();

      expect(typeof status.newbBalance).toBe('number');
      expect(typeof status.simBalance).toBe('number');
      expect(typeof status.halvingEpoch).toBe('number');
      expect(typeof status.pooScore).toBe('number');
    });

    it('12d. fetchPooStats returns PoO stats shape', async () => {
      setAdapterPooState(pooState);
      const stats = await fetchPooStats();

      expect(typeof stats.totalTasks).toBe('number');
      expect(typeof stats.verified).toBe('number');
      expect(typeof stats.rejected).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.score).toBe('number');
    });

    it('12e. fetchSandboxStatus returns engine info', async () => {
      const status = await fetchSandboxStatus();

      expect(typeof status.available).toBe('boolean');
      expect(['docker', 'subprocess', 'none']).toContain(status.engine);
    });
  });

  // ========================================================================
  // 13. CROSS-MODULE INTEGRATION — End-to-end data flow
  // ========================================================================

  describe('13. Cross-Module Integration: Data Flows', () => {
    it('13a. full task -> PoO -> reward -> market pipeline', () => {
      // Create fresh state for the integration run
      let eco = createEconomyState();
      let poo = createPooState();
      let mkt = createEmptyMarket();
      let ldg = createEmptyLedgers();
      const con = createDefaultConstitution();

      // Step 1: Create and complete a task
      let t = createTask('Integration test playbook', 'Full pipeline test');
      const p1 = runProposalPhase(t, 'Proposal content');
      t = p1.task;
      const p2 = runAuditPhase(t, con, 'Looks good', 'low');
      t = p2.task;
      const p3 = runApprovalPhase(t, con, true, 10);
      t = p3.task;
      t = advanceTaskPhase(t); // execution -> review
      t = advanceTaskPhase(t); // review -> settled

      expect(t.phase).toBe('settled');

      // Step 2: Submit to PoO
      const [pooUpdated, pooTask] = submitForVerification(poo, {
        title: t.title,
        description: t.description,
        proposedBy: 'ai1-expander',
      }, {
        scoreComponents: {
          goalFit: 90,
          pooOutcome: 95,
          evidenceLevel: 100,
          cost: 1,
          debtImpact: 0,
        },
        evidenceGrade: 'H1',
      });
      poo = pooUpdated;

      expect(pooTask.priorityScore!).toBeGreaterThanOrEqual(85);

      // Step 3: Finalize PoO and issue reward
      const [pooFinal] = finalizeVerification(poo, pooTask.id, true);
      poo = pooFinal;

      const rewardResult = issueReward(eco, t.id);
      expect(rewardResult.ok).toBe(true);
      if (rewardResult.ok) eco = rewardResult.value.state;

      expect(eco.balance).toBe(110); // 100 genesis + 10 reward

      // Step 4: List playbook on market
      const listing = createPlaybookListing(t, 'Playbook content', 25, 'testing');
      mkt = listPlaybook(mkt, listing);

      // Step 5: Purchase and record in ledger
      mkt = { ...mkt, nodeBalance: { ...mkt.nodeBalance, 'node-remote': 100 } };
      const { market: mktAfter, order } = purchasePlaybook(mkt, listing.id, 'node-remote');
      mkt = mktAfter;

      expect(order).not.toBeNull();
      ldg = recordMarketTransaction(ldg, order!, 'buyer');
      ldg = recordMarketTransaction(ldg, order!, 'seller');

      expect(ldg.localLedger).toHaveLength(2);
      expect(getBalance(ldg, 'SIM')).toBe(0); // -25 + 25 = 0 net
    });

    it('13b. trinity agent stats update correctly', () => {
      const agents = createTrinityAgents();
      let ai1 = agents.ai1;

      ai1 = updateAgentStatus(ai1, 'executing', 'task-123');
      expect(ai1.status).toBe('executing');
      expect(ai1.currentTask).toBe('task-123');

      ai1 = recordAgentCompletion(ai1, 150);
      expect(ai1.status).toBe('idle');
      expect(ai1.stats.tasksCompleted).toBe(1);
      expect(ai1.stats.avgResponseTime).toBe(150);
    });

    it('13c. ledger summary aggregates all sub-ledgers', () => {
      let summaryLedgers = createEmptyLedgers();

      summaryLedgers = addEvidence(summaryLedgers, 'Test', 'source', 'H1', 'ai2-auditor', 'task-1', []);
      summaryLedgers = addValueAssessment(summaryLedgers, 'task-1', 80, 100, 20, 10);
      summaryLedgers = addDebt(summaryLedgers, 'tech-debt', 'Test debt', 'low', 'task-1', '2026-12-31');
      summaryLedgers = addLocalLedgerEntry(summaryLedgers, 'sim-credit', 50, 'SIM', 'task-1', 'Test credit');
      summaryLedgers = addCaseLaw(summaryLedgers, 'failure', 'Test case', 'Something happened', 'minor', ['task-1']);

      const summary = getLedgerSummary(summaryLedgers);

      expect(summary.evidenceCount).toBe(1);
      expect(summary.valueAssessments).toBe(1);
      expect(summary.totalDebts).toBe(1);
      expect(summary.openDebts).toBe(1);
      expect(summary.caseLawEntries).toBe(1);
      expect(summary.transactionCount).toBe(1);
      expect(summary.simBalance).toBe(50);
    });

    it('13d. economy spend and receive flows', () => {
      let eco = createEconomyState(); // 100 New.B

      const spendResult = spend(eco, 30, 'Purchase playbook');
      expect(spendResult.ok).toBe(true);
      if (spendResult.ok) eco = spendResult.value.state;
      expect(eco.balance).toBe(70);

      const receiveResult = receive(eco, 15, 'Market sale');
      expect(receiveResult.ok).toBe(true);
      if (receiveResult.ok) eco = receiveResult.value.state;
      expect(eco.balance).toBe(85);

      // Cannot spend more than balance
      const overSpend = spend(eco, 100, 'Too much');
      expect(overSpend.ok).toBe(false);
    });

    it('13e. dispute outcome prevents settlement', () => {
      const rules = createDefaultOracleRules();
      let report = generateOutcomeReport(
        completedTask,
        'Disputed result',
        'Manual review',
        'H2',
      );
      report = evaluateOutcome(report, rules, ledgers);
      report = disputeOutcome(report, 'Evidence contradicted');

      expect(report.oracleVerdict).toBe('disputed');
      expect(report.settleable).toBe(false);
      expect(() => settleOutcome(report)).toThrow();
    });
  });
});
