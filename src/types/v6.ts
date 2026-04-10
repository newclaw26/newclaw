// ============================================================================
// NewClaw V6 Type Definitions — FROZEN CONTRACT v3.0
// Last frozen: 2026-04-10
// Any changes require A-team + B-team bilateral confirmation
// See: docs/ab-integration-strategy.md Section 11.3
// ============================================================================
//
// NewClaw V6 - Three-Core Sovereign Autonomous Promotion Framework
// Complete Type System
// ============================================================================

// ---------------------------------------------------------------------------
// Layer 0: Constitutional Layer
// ---------------------------------------------------------------------------

export interface ConstitutionalGoal {
  id: string
  phase: string
  description: string
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}

export interface Milestone {
  id: string
  label: string
  criteria: string
  completed: boolean
  completedAt?: string
}

export interface Constraint {
  id: string
  category: 'legal' | 'system' | 'host' | 'ethical'
  description: string
  enforceable: boolean
  severity: 'hard' | 'soft'
}

export interface ValuePriority {
  id: string
  dimension: 'revenue' | 'risk' | 'quality' | 'reuse' | 'speed' | 'compliance'
  weight: number // 0-100
  description: string
}

export interface AuthorityRule {
  id: string
  actionPattern: string
  permissionLevel: PermissionLevel
  requiredApprovals: ApprovalRequirement[]
  description: string
}

export type ApprovalRequirement = 'ai1' | 'ai2' | 'ai3' | 'human' | 'dual-sign'

export interface DoneCriteria {
  id: string
  taskPattern: string
  criteria: string[]
  verificationMethod: 'automated' | 'manual' | 'peer-review'
}

export interface Constitution {
  goals: ConstitutionalGoal[]
  constraints: Constraint[]
  values: ValuePriority[]
  authority: AuthorityRule[]
  done: DoneCriteria[]
  version: string
  lastModified: string
}

// ---------------------------------------------------------------------------
// Layer 1: Trinity AI Unit Layer
// ---------------------------------------------------------------------------

export type TrinityRole = 'ai1-expander' | 'ai2-auditor' | 'ai3-governor'

export interface TrinityAgent {
  role: TrinityRole
  displayName: string
  status: 'idle' | 'thinking' | 'executing' | 'blocked' | 'error'
  currentTask?: string
  lastOutput?: TrinityOutput
  stats: AgentStats
}

export interface AgentStats {
  tasksCompleted: number
  tasksBlocked: number
  avgResponseTime: number
  lastActiveAt?: string
}

export interface TrinityOutput {
  id: string
  role: TrinityRole
  type: TrinityOutputType
  content: string
  metadata: Record<string, unknown>
  timestamp: string
  taskId: string
}

export type TrinityOutputType =
  | 'task-draft'         // AI-1: task proposals
  | 'playbook'           // AI-1: execution playbooks
  | 'market-suggestion'  // AI-1: market listing suggestions
  | 'audit-opinion'      // AI-2: audit findings
  | 'risk-report'        // AI-2: risk analysis
  | 'evidence-tag'       // AI-2: evidence classification
  | 'counterfactual'     // AI-2: counterfactual analysis
  | 'task-charter'       // AI-3: approved task charter
  | 'budget-batch'       // AI-3: budget allocation
  | 'listing-confirm'    // AI-3: market listing confirmation
  | 'outcome-submit'     // AI-3: outcome submission

export interface TrinityTask {
  id: string
  title: string
  description: string
  phase: TrinityPhase
  priority: number // 1-10
  createdBy: TrinityRole
  assignedTo: TrinityRole[]
  status: TaskStatus
  outputs: TrinityOutput[]
  permissionLevel: PermissionLevel
  createdAt: string
  updatedAt: string
  completedAt?: string
  outcomeId?: string
}

export type TrinityPhase = 'proposal' | 'audit' | 'approval' | 'execution' | 'review' | 'settled'
export type TaskStatus = 'draft' | 'pending-audit' | 'pending-approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'blocked' | 'cancelled'

// ---------------------------------------------------------------------------
// Layer 2: Governance Ledger Layer
// ---------------------------------------------------------------------------

// Evidence Ledger
export interface EvidenceEntry {
  id: string
  conclusion: string
  source: string
  grade: EvidenceGrade
  verifier: TrinityRole | 'human'
  expiresAt?: string
  taskId: string
  tags: string[]
  timestamp: string
}

export type EvidenceGrade = 'H1' | 'H2' | 'H3' | 'H4'
// H1: Reproducible, machine-verified
// H2: Multi-source corroborated
// H3: Single-source, expert-reviewed
// H4: Unverified hypothesis

// Value Ledger
export interface ValueEntry {
  id: string
  taskId: string
  goalAlignment: number    // 0-100
  expectedRevenue: number  // simulated units
  resourceCost: number     // simulated units
  riskExposure: number     // 0-100
  priority: number         // calculated
  timestamp: string
}

// Debt Ledger
export interface DebtEntry {
  id: string
  category: 'deferred-task' | 'local-optimization' | 'strategic-debt' | 'tech-debt'
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  deferredFrom: string
  reviewDate: string
  resolved: boolean
  resolvedAt?: string
  timestamp: string
}

// Temporal Ledger
export interface TemporalEntry {
  id: string
  conclusionId: string
  effectiveAt: string
  expiresAt: string
  reviewCycle: string // e.g., "7d", "30d"
  dependencies: string[]
  status: 'active' | 'expired' | 'pending-review'
  timestamp: string
}

// CaseLaw Ledger
export interface CaseLawEntry {
  id: string
  category: 'failure' | 'circuit-break' | 'rollback' | 'dispute' | 'resolution'
  title: string
  description: string
  rootCause?: string
  resolution?: string
  lessonsLearned: string[]
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  relatedTaskIds: string[]
  timestamp: string
}

// Local Ledger (Economic)
export interface LocalLedgerEntry {
  id: string
  type: 'sim-credit' | 'testnet-settle' | 'real-settle' | 'market-trade'
  amount: number
  currency: 'SIM' | 'TEST' | 'REAL' | 'NEW.B'
  counterparty?: string
  taskId: string
  outcomeId?: string
  description: string
  timestamp: string
}

export interface GovernanceLedgers {
  evidence: EvidenceEntry[]
  value: ValueEntry[]
  debt: DebtEntry[]
  temporal: TemporalEntry[]
  caseLaw: CaseLawEntry[]
  localLedger: LocalLedgerEntry[]
}

// ---------------------------------------------------------------------------
// Layer 3: Outcome Oracle Layer
// ---------------------------------------------------------------------------

export interface OutcomeReport {
  id: string
  taskId: string
  taskType: string
  expectedGoal: string
  actualResult: string
  verificationMethod: string
  evidenceGrade: EvidenceGrade
  expiresAt?: string
  settleable: boolean
  reconciliationHash: string
  creditTarget: CreditTarget
  oracleVerdict: OracleVerdict
  createdAt: string
  settledAt?: string
}

export type CreditTarget = 'local' | 'testnet' | 'mainnet' | 'rejected'
export type OracleVerdict = 'settleable' | 'pending-review' | 'rejected' | 'expired' | 'disputed'

export interface OracleRule {
  id: string
  condition: string
  minEvidenceGrade: EvidenceGrade
  minVerifications: number
  requiredFields: string[]
  creditTarget: CreditTarget
  description: string
}

// ---------------------------------------------------------------------------
// Layer 4: Permission Fuse Matrix
// ---------------------------------------------------------------------------

export type PermissionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4'

export interface PermissionFuse {
  level: PermissionLevel
  category: string
  description: string
  examples: string[]
  approvalRequirements: ApprovalRequirement[]
  autoExecute: boolean
  enabled: boolean
}

export interface PermissionRequest {
  id: string
  taskId: string
  requestedBy: TrinityRole
  level: PermissionLevel
  action: string
  description: string
  status: 'pending' | 'approved' | 'denied' | 'expired'
  approvals: PermissionApproval[]
  createdAt: string
  resolvedAt?: string
}

export interface PermissionApproval {
  approver: TrinityRole | 'human'
  decision: 'approve' | 'deny'
  reason?: string
  timestamp: string
}

// ---------------------------------------------------------------------------
// Layer 5: Node Promotion Pipeline
// ---------------------------------------------------------------------------

export type NodeStage = 'stage-0' | 'stage-1' | 'stage-2' | 'stage-3' | 'stage-4'

export interface NodeStatus {
  currentStage: NodeStage
  stageLabel: string
  stageDescription: string
  promotionProgress: PromotionProgress
  history: PromotionEvent[]
  metrics: NodeMetrics
}

export interface PromotionProgress {
  outcomesRequired: number
  outcomesAchieved: number
  complianceScore: number   // 0-100
  reconciliationRate: number // 0-100
  stabilityScore: number    // 0-100
  nextStageRequirements: string[]
  estimatedReadiness: number // 0-100
}

export interface PromotionEvent {
  id: string
  fromStage: NodeStage
  toStage: NodeStage
  reason: string
  timestamp: string
}

export interface NodeMetrics {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  totalOutcomes: number
  settledOutcomes: number
  rejectedOutcomes: number
  uptime: number // hours
  lastActivityAt: string
}

// ---------------------------------------------------------------------------
// V6 System State (Root)
// ---------------------------------------------------------------------------

export interface V6SystemState {
  constitution: Constitution
  trinity: {
    ai1: TrinityAgent
    ai2: TrinityAgent
    ai3: TrinityAgent
  }
  tasks: TrinityTask[]
  ledgers: GovernanceLedgers
  outcomes: OutcomeReport[]
  oracleRules: OracleRule[]
  permissionMatrix: PermissionFuse[]
  permissionRequests: PermissionRequest[]
  nodeStatus: NodeStatus
}

// ---------------------------------------------------------------------------
// UI State Types
// ---------------------------------------------------------------------------

export type V6View = 'team-chat' | 'dashboard' | 'market' | 'ledgers' | 'oracle' | 'permissions' | 'node-status' | 'task-detail' | 'identity' | 'economy'

export interface V6UIState {
  activeView: V6View
  selectedTaskId?: string
  selectedLedgerType?: keyof GovernanceLedgers
  trinityExpanded: Record<TrinityRole, boolean>
  taskFilter: TaskStatus | 'all'
}

// ---------------------------------------------------------------------------
// Event Types (for real-time updates)
// ---------------------------------------------------------------------------

export interface V6Event {
  id: string
  type: V6EventType
  payload: unknown
  timestamp: string
  source: TrinityRole | 'system' | 'oracle' | 'fuse'
}

export type V6EventType =
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'task:failed'
  | 'trinity:output'
  | 'trinity:status-change'
  | 'ledger:entry-added'
  | 'outcome:generated'
  | 'outcome:settled'
  | 'permission:requested'
  | 'permission:resolved'
  | 'node:promoted'
  | 'node:metrics-updated'

// ---------------------------------------------------------------------------
// Identity Types (A-team will implement, B-team defines interface)
// ---------------------------------------------------------------------------

export interface HostIdentity {
  nodeId: string          // DID format: did:newclaw:<hex32>
  publicKey: string       // Ed25519 public key hex
  address: string         // derived blockchain address
  createdAt: string
  isLocked: boolean
}

// ---------------------------------------------------------------------------
// Economy Types
// ---------------------------------------------------------------------------

export interface EconomyStatus {
  newbBalance: number     // New.B balance in smallest unit
  simBalance: number      // SIM credits
  halvingEpoch: number    // current halving epoch
  halvingProgress: number // 0-100% progress to next halving
  totalMined: number
  pooScore: number        // PoO Priority Score (0-100)
  pooVerified: number     // verified outcomes count
  pooRejected: number
}

// ---------------------------------------------------------------------------
// Sandbox Types
// ---------------------------------------------------------------------------

export interface SandboxConfig {
  image: string
  networkMode: 'none' | 'restricted' | 'host'
  cpuLimit: number
  memoryLimitMB: number
  timeoutSeconds: number
  readonlyMounts: string[]
  env: Record<string, string>
}

export interface SandboxResult {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  resourceUsage: { cpuPercent: number; memoryMB: number }
}

// ---------------------------------------------------------------------------
// Backend Connection State
// ---------------------------------------------------------------------------

export type BackendConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// ---------------------------------------------------------------------------
// Governance Scoring & Role Rotation (CEO+Audit mechanism)
// ---------------------------------------------------------------------------

/** Short identifiers for the three Trinity agents in scoring context. */
export type GovernanceActorId = 'ai1' | 'ai2' | 'ai3'

/**
 * Six-dimension scoring rubric applied by one agent to another after each
 * governance round.  Total always equals the sum of all six dimension scores.
 *
 * Dimension ceilings:
 *   taskCompletion    0-25   (did the work get done?)
 *   deliveryQuality   0-25   (how good was it?)
 *   planValue         0-15   (strategic value of the plan)
 *   efficiency        0-15   (resource usage / time)
 *   strategicJudgment 0-10   (trade-off quality)
 *   riskControl       0-10   (risk identification & mitigation)
 */
export interface GovernanceScore {
  round: number
  timestamp: string
  scorer: GovernanceActorId
  target: GovernanceActorId
  dimensions: GovernanceDimensions
  total: number               // 0-100 (sum of dimensions)
  notes: string
}

export interface GovernanceDimensions {
  taskCompletion: number      // 0-25
  deliveryQuality: number     // 0-25
  planValue: number           // 0-15
  efficiency: number          // 0-15
  strategicJudgment: number   // 0-10
  riskControl: number         // 0-10
}

/**
 * Tracks the current CEO/auditor assignment and rotation schedule.
 *
 * Role rotation is merit-based: high-scoring CEOs earn longer terms.
 * When a term expires the auditor becomes the new CEO and a fresh
 * auditor is selected from the remaining agent.
 */
export interface RotationState {
  currentCEO: GovernanceActorId
  currentAuditor: GovernanceActorId
  roundsInCurrentTerm: number
  maxRoundsInTerm: number     // calculated from recent scores
  scoreHistory: GovernanceScore[]
}
