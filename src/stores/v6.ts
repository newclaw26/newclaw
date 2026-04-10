// ============================================================================
// V6 Zustand Store - Unified State Management
// ============================================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  V6SystemState,
  V6UIState,
  V6View,
  TrinityRole,
  TrinityTask,
  TaskStatus,
  PermissionLevel,
  EvidenceGrade,
  GovernanceLedgers,
  CaseLawEntry,
  DebtEntry,
  LocalLedgerEntry,
  V6Event,
  HostIdentity,
  EconomyStatus,
  BackendConnectionStatus,
} from '@/types/v6'
import {
  createDefaultConstitution,
  completeMilestone,
} from '@/lib/v6/constitution'
import {
  createTrinityAgents,
  createTask,
  advanceTaskPhase,
  failTask,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
  updateAgentStatus,
  recordAgentCompletion,
} from '@/lib/v6/engine'
import {
  createEmptyLedgers,
  addEvidence,
  addValueAssessment,
  addDebt,
  resolveDebt,
  addCaseLaw,
  addLocalLedgerEntry,
  refreshTemporalStatuses,
  getLedgerSummary,
} from '@/lib/v6/ledger'
import {
  createDefaultOracleRules,
  generateOutcomeReport,
  evaluateOutcome,
  settleOutcome,
  getOracleStats,
} from '@/lib/v6/oracle'
import {
  createDefaultFuseMatrix,
  createPermissionRequest,
  addApproval,
  resolveRequest,
  getPermissionStats,
} from '@/lib/v6/fuse-matrix'
import {
  createInitialNodeStatus,
  calculatePromotionProgress,
  checkPromotionEligibility,
  promoteNode,
  calculateNodeMetrics,
} from '@/lib/v6/promotion'
import {
  type MarketState,
  type PlaybookListing,
  type MarketOrder,
  createDemoMarket,
  createPlaybookListing,
  listPlaybook,
  purchasePlaybook,
  executePlaybook,
  recordMarketTransaction,
  getMarketStats,
} from '@/lib/v6/market'
import {
  fetchIdentity,
  fetchNewBBalance,
  fetchGenesisStatus,
} from '@/lib/v6/adapter'

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export interface V6Store extends V6SystemState {
  // UI State
  ui: V6UIState
  events: V6Event[]
  initialized: boolean
  startTime: string

  // Onboarding
  onboardingStep: number    // 0-5, 0 = not started
  onboardingComplete: boolean
  setOnboardingStep: (step: number) => void
  completeOnboarding: () => void

  // Identity & Economy (from adapter)
  identity: HostIdentity | null
  economy: EconomyStatus | null
  backendStatus: BackendConnectionStatus

  // Identity/Economy Actions
  loadIdentity: () => Promise<void>
  loadEconomy: () => Promise<void>
  checkBackend: () => Promise<void>

  // Initialization
  initialize: () => void
  reset: () => void

  // UI Actions
  setActiveView: (view: V6View) => void
  selectTask: (taskId: string | undefined) => void
  setLedgerType: (type: keyof GovernanceLedgers) => void
  setTaskFilter: (filter: TaskStatus | 'all') => void
  toggleTrinityPanel: (role: TrinityRole) => void

  // Task Actions
  createNewTask: (title: string, description: string, permissionLevel?: PermissionLevel) => TrinityTask
  submitProposal: (taskId: string, content: string) => void
  submitAudit: (taskId: string, findings: string, riskLevel?: 'low' | 'medium' | 'high' | 'critical') => void
  submitApproval: (taskId: string, approved: boolean, budget?: number) => void
  completeTask: (taskId: string, result: string, evidenceGrade: EvidenceGrade) => void
  failTaskById: (taskId: string, reason: string) => void

  // Ledger Actions
  addEvidenceEntry: (conclusion: string, source: string, grade: EvidenceGrade, taskId: string, tags?: string[]) => void
  addValueEntry: (taskId: string, goalAlignment: number, revenue: number, cost: number, risk: number) => void
  addDebtEntry: (category: DebtEntry['category'], description: string, impact: DebtEntry['impact']) => void
  resolveDebtEntry: (debtId: string) => void
  addCaseLawEntry: (category: CaseLawEntry['category'], title: string, description: string, severity: CaseLawEntry['severity'], taskIds: string[]) => void
  addLedgerEntry: (type: LocalLedgerEntry['type'], amount: number, currency: LocalLedgerEntry['currency'], taskId: string, description: string) => void

  // Permission Actions
  requestPermission: (taskId: string, role: TrinityRole, level: PermissionLevel, action: string) => void
  approvePermission: (requestId: string, approver: TrinityRole | 'human', reason?: string) => void
  denyPermission: (requestId: string, approver: TrinityRole | 'human', reason?: string) => void

  // Node Actions
  checkPromotion: () => { eligible: boolean; reasons: string[] }
  promote: () => boolean
  refreshMetrics: () => void

  // Market Actions
  market: MarketState
  listPlaybookFromTask: (taskId: string, price: number, category: string) => PlaybookListing | null
  buyPlaybook: (listingId: string) => MarketOrder | null
  executeMarketPlaybook: (orderId: string, result: string) => void
  getMarketStats: () => ReturnType<typeof getMarketStats>

  // Constitution Actions
  completeMilestoneById: (goalId: string, milestoneId: string) => void

  // Computed
  getFilteredTasks: () => TrinityTask[]
  getLedgerSummary: () => ReturnType<typeof getLedgerSummary>
  getOracleStats: () => ReturnType<typeof getOracleStats>
  getPermissionStats: () => ReturnType<typeof getPermissionStats>
}

// ---------------------------------------------------------------------------
// BUG-13 fix: cap events array at 200 entries
const MAX_EVENTS = 200
const capEvents = (events: V6Event[]): V6Event[] =>
  events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events

// Store Implementation
// ---------------------------------------------------------------------------

export const useV6Store = create<V6Store>()(
  persist(
    (set, get) => ({
      // Initial State
      constitution: createDefaultConstitution(),
      trinity: createTrinityAgents(),
      tasks: [],
      ledgers: createEmptyLedgers(),
      outcomes: [],
      oracleRules: createDefaultOracleRules(),
      permissionMatrix: createDefaultFuseMatrix(),
      permissionRequests: [],
      nodeStatus: createInitialNodeStatus(),
      ui: {
        activeView: 'dashboard',
        trinityExpanded: { 'ai1-expander': true, 'ai2-auditor': true, 'ai3-governor': true },
        taskFilter: 'all',
      },
      market: createDemoMarket(),
      identity: null,
      economy: null,
      backendStatus: 'disconnected' as BackendConnectionStatus,
      onboardingStep: 0,
      onboardingComplete: false,
      events: [],
      initialized: false,
      startTime: new Date().toISOString(),

      // ------ Onboarding ------

      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingComplete: true, onboardingStep: 5 }),

      // ------ Initialization ------

      initialize: () => {
        if (get().initialized) return
        set({ initialized: true, startTime: new Date().toISOString() })
      },

      reset: () => {
        set({
          constitution: createDefaultConstitution(),
          trinity: createTrinityAgents(),
          tasks: [],
          ledgers: createEmptyLedgers(),
          outcomes: [],
          oracleRules: createDefaultOracleRules(),
          permissionMatrix: createDefaultFuseMatrix(),
          permissionRequests: [],
          nodeStatus: createInitialNodeStatus(),
          market: createDemoMarket(), // fix: reset market too
          identity: null,
          economy: null,
          backendStatus: 'disconnected' as BackendConnectionStatus,
          onboardingStep: 0,
          onboardingComplete: false,
          events: [],
          initialized: true,
          startTime: new Date().toISOString(),
        })
      },

      // ------ Identity & Economy Actions ------

      loadIdentity: async () => {
        // If the store already has an identity (e.g. from the onboarding wizard),
        // skip the adapter call to prevent generating a second, different identity.
        if (get().identity) return
        try {
          const identity = await fetchIdentity()
          set({ identity })
        } catch { set({ identity: null }) }
      },

      loadEconomy: async () => {
        try {
          const economy = await fetchNewBBalance()
          set({ economy })
        } catch { set({ economy: null }) }
      },

      checkBackend: async () => {
        set({ backendStatus: 'connecting' })
        try {
          await fetchGenesisStatus()
          set({ backendStatus: 'connected' })
        } catch { set({ backendStatus: 'error' }) }
      },

      // ------ UI Actions ------

      setActiveView: (view) => set(s => ({ ui: { ...s.ui, activeView: view } })),
      selectTask: (taskId) => set(s => ({
        ui: { ...s.ui, selectedTaskId: taskId },  // BUG-05 fix: don't switch to nonexistent view
      })),
      setLedgerType: (type) => set(s => ({ ui: { ...s.ui, selectedLedgerType: type } })),
      setTaskFilter: (filter) => set(s => ({ ui: { ...s.ui, taskFilter: filter } })),
      toggleTrinityPanel: (role) => set(s => ({
        ui: {
          ...s.ui,
          trinityExpanded: { ...s.ui.trinityExpanded, [role]: !s.ui.trinityExpanded[role] },
        },
      })),

      // ------ Task Actions ------

      createNewTask: (title, description, permissionLevel = 'L0') => {
        const task = createTask(title, description, 'ai1-expander', permissionLevel)
        set(s => ({
          tasks: [...s.tasks, task],
          trinity: { ...s.trinity, ai1: updateAgentStatus(s.trinity.ai1, 'thinking', task.id) },
          events: capEvents([...s.events, { id: crypto.randomUUID(), type: 'task:created' as const, payload: task, timestamp: new Date().toISOString(), source: 'ai1-expander' as const }]),
        }))
        return task
      },

      submitProposal: (taskId, content) => {
        const state = get()
        const task = state.tasks.find(t => t.id === taskId)
        if (!task) return

        const result = runProposalPhase(task, content)
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? result.task : t),
          trinity: {
            ...s.trinity,
            ai1: recordAgentCompletion(s.trinity.ai1, 500),
            ai2: updateAgentStatus(s.trinity.ai2, 'thinking', taskId),
          },
          events: capEvents([...s.events, ...result.events]),
        }))
      },

      submitAudit: (taskId, findings, riskLevel = 'low') => {
        const state = get()
        const task = state.tasks.find(t => t.id === taskId)
        if (!task) return

        const result = runAuditPhase(task, state.constitution, findings, riskLevel)
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? result.task : t),
          trinity: {
            ...s.trinity,
            ai2: recordAgentCompletion(s.trinity.ai2, 800),
            ai3: result.blocked ? s.trinity.ai3 : updateAgentStatus(s.trinity.ai3, 'thinking', taskId),
          },
          events: capEvents([...s.events, ...result.events]),
        }))
      },

      submitApproval: (taskId, approved, budget) => {
        const state = get()
        const task = state.tasks.find(t => t.id === taskId)
        if (!task) return

        const result = runApprovalPhase(task, state.constitution, approved, budget)
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? result.task : t),
          trinity: {
            ...s.trinity,
            ai3: recordAgentCompletion(s.trinity.ai3, 300),
            ai1: result.blocked ? s.trinity.ai1 : updateAgentStatus(s.trinity.ai1, 'executing', taskId),
          },
          events: capEvents([...s.events, ...result.events]),
        }))
      },

      completeTask: (taskId, result, evidenceGrade) => {
        const state = get()
        const task = state.tasks.find(t => t.id === taskId)
        if (!task) return
        // BUG-06 fix: only complete tasks in execution phase
        if (task.phase !== 'execution' && task.status !== 'executing') return

        // Generate outcome report
        const outcome = generateOutcomeReport(task, result, 'trinity-pipeline', evidenceGrade)
        const evaluatedOutcome = evaluateOutcome(outcome, state.oracleRules, state.ledgers)

        // Settle if possible
        const finalOutcome = evaluatedOutcome.settleable ? settleOutcome(evaluatedOutcome) : evaluatedOutcome

        // Advance task to completion
        const completedTask = advanceTaskPhase({ ...task, phase: 'execution', status: 'completed', outcomeId: finalOutcome.id })

        // Add ledger entries
        let updatedLedgers = addEvidence(state.ledgers, result, 'trinity-pipeline', evidenceGrade, 'ai2-auditor', taskId, ['auto-generated'])
        if (finalOutcome.settleable) {
          updatedLedgers = addLocalLedgerEntry(updatedLedgers, 'sim-credit', 10, 'SIM', taskId, `Settled outcome: ${task.title}`, undefined, finalOutcome.id)
        }

        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? completedTask : t),
          outcomes: [...s.outcomes, finalOutcome],
          ledgers: updatedLedgers,
          trinity: {
            ai1: recordAgentCompletion(s.trinity.ai1, 1000),
            ai2: updateAgentStatus(s.trinity.ai2, 'idle'),
            ai3: updateAgentStatus(s.trinity.ai3, 'idle'),
          },
          events: capEvents([...s.events, {
            id: crypto.randomUUID(),
            type: finalOutcome.settleable ? 'outcome:settled' as const : 'outcome:generated' as const,
            payload: finalOutcome,
            timestamp: new Date().toISOString(),
            source: 'oracle' as const,
          }]),
        }))
      },

      failTaskById: (taskId, reason) => {
        const task = get().tasks.find(t => t.id === taskId)
        if (!task) return

        const failedTask = failTask(task, reason)
        set(s => ({
          tasks: s.tasks.map(t => t.id === taskId ? failedTask : t),
          ledgers: addCaseLaw(s.ledgers, 'failure', `Task failed: ${task.title}`, reason, 'moderate', [taskId]),
          events: capEvents([...s.events, { id: crypto.randomUUID(), type: 'task:failed' as const, payload: { taskId, reason }, timestamp: new Date().toISOString(), source: 'system' as const }]),
        }))
      },

      // ------ Ledger Actions ------

      addEvidenceEntry: (conclusion, source, grade, taskId, tags = []) => {
        set(s => ({ ledgers: addEvidence(s.ledgers, conclusion, source, grade, 'ai2-auditor', taskId, tags) }))
      },

      addValueEntry: (taskId, goalAlignment, revenue, cost, risk) => {
        set(s => ({ ledgers: addValueAssessment(s.ledgers, taskId, goalAlignment, revenue, cost, risk) }))
      },

      addDebtEntry: (category, description, impact) => {
        set(s => ({ ledgers: addDebt(s.ledgers, category, description, impact, 'current-sprint', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()) }))
      },

      resolveDebtEntry: (debtId) => {
        set(s => ({ ledgers: resolveDebt(s.ledgers, debtId) }))
      },

      addCaseLawEntry: (category, title, description, severity, taskIds) => {
        set(s => ({ ledgers: addCaseLaw(s.ledgers, category, title, description, severity, taskIds) }))
      },

      addLedgerEntry: (type, amount, currency, taskId, description) => {
        set(s => ({ ledgers: addLocalLedgerEntry(s.ledgers, type, amount, currency, taskId, description) }))
      },

      // ------ Permission Actions ------

      requestPermission: (taskId, role, level, action) => {
        const request = createPermissionRequest(taskId, role, level, action, `Permission request for ${action}`)
        set(s => ({ permissionRequests: [...s.permissionRequests, request] }))
      },

      approvePermission: (requestId, approver, reason) => {
        set(s => ({
          permissionRequests: s.permissionRequests.map(r =>
            r.id === requestId
              ? resolveRequest(addApproval(r, approver, 'approve', reason), s.permissionMatrix)
              : r
          ),
        }))
      },

      denyPermission: (requestId, approver, reason) => {
        set(s => ({
          permissionRequests: s.permissionRequests.map(r =>
            r.id === requestId
              ? resolveRequest(addApproval(r, approver, 'deny', reason), s.permissionMatrix)
              : r
          ),
        }))
      },

      // ------ Node Actions ------

      checkPromotion: () => {
        const s = get()
        return checkPromotionEligibility(s.nodeStatus, s.outcomes, s.ledgers, s.permissionRequests)
      },

      promote: () => {
        const s = get()
        const { eligible } = checkPromotionEligibility(s.nodeStatus, s.outcomes, s.ledgers, s.permissionRequests)
        if (!eligible) return false
        set({ nodeStatus: promoteNode(s.nodeStatus) })
        return true
      },

      refreshMetrics: () => {
        const s = get()
        const metrics = calculateNodeMetrics(s.outcomes, s.ledgers, s.permissionRequests, s.startTime, s.tasks)
        const progress = calculatePromotionProgress(s.nodeStatus, s.outcomes, s.ledgers, s.permissionRequests)
        set({
          nodeStatus: { ...s.nodeStatus, metrics, promotionProgress: progress },
          ledgers: refreshTemporalStatuses(s.ledgers),
        })
      },

      // ------ Market ------

      listPlaybookFromTask: (taskId, price, category) => {
        const task = get().tasks.find(t => t.id === taskId)
        if (!task || task.status !== 'completed') return null
        const content = task.outputs.map(o => o.content).join('\n\n')
        const listing = createPlaybookListing(task, content, price, category)
        set(s => ({ market: listPlaybook(s.market, listing) }))
        return listing
      },

      buyPlaybook: (listingId) => {
        const { market: result, order, error } = purchasePlaybook(get().market, listingId, 'node-local')
        if (!order || error) return null
        // BUG-09 fix: record both buyer and seller sides of the transaction
        let updatedLedgers = recordMarketTransaction(get().ledgers, order, 'buyer')
        updatedLedgers = recordMarketTransaction(updatedLedgers, order, 'seller')
        set({ market: result, ledgers: updatedLedgers })
        return order
      },

      executeMarketPlaybook: (orderId, result) => {
        set(s => ({ market: executePlaybook(s.market, orderId, result) }))
      },

      getMarketStats: () => getMarketStats(get().market),

      // ------ Constitution ------

      completeMilestoneById: (goalId, milestoneId) => {
        set(s => ({ constitution: completeMilestone(s.constitution, goalId, milestoneId) }))
      },

      // ------ Computed ------

      getFilteredTasks: () => {
        const { tasks, ui } = get()
        if (ui.taskFilter === 'all') return tasks
        return tasks.filter(t => t.status === ui.taskFilter)
      },

      getLedgerSummary: () => getLedgerSummary(get().ledgers),
      getOracleStats: () => getOracleStats(get().outcomes),
      getPermissionStats: () => getPermissionStats(get().permissionRequests),
    }),
    {
      name: 'newclaw-v6-store',
      version: 3, // M1: added identity + economy fields
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted: unknown, version: number) => {
        // If schema version mismatches, reset to defaults
        if (version < 2) return {} // will merge with defaults
        // v2 -> v3: identity/economy are nullable, just pass through
        if (version < 3) return persisted as Record<string, unknown>
        return persisted as Record<string, unknown>
      },
      partialize: (state) => ({
        constitution: state.constitution,
        trinity: state.trinity, // BUG-03 fix: persist agent stats
        tasks: state.tasks,
        ledgers: state.ledgers,
        outcomes: state.outcomes,
        permissionRequests: state.permissionRequests,
        permissionMatrix: state.permissionMatrix, // BUG-03 fix: persist fuse state
        nodeStatus: state.nodeStatus,
        market: state.market,
        identity: state.identity,
        economy: state.economy,
        onboardingStep: state.onboardingStep,
        onboardingComplete: state.onboardingComplete,
        startTime: state.startTime,
        initialized: state.initialized,
      }),
    }
  )
)
