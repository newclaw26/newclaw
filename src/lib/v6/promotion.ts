// ============================================================================
// Layer 5: Node Promotion Pipeline
// ============================================================================

import type {
  NodeStage,
  NodeStatus,
  NodeMetrics,
  PromotionProgress,
  PromotionEvent,
  OutcomeReport,
  GovernanceLedgers,
  PermissionRequest,
  TrinityTask,
} from '@/types/v6'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Stage Definitions
// ---------------------------------------------------------------------------

export const STAGE_CONFIG: Record<NodeStage, {
  label: string
  description: string
  requirements: string[]
  minOutcomes: number
  minComplianceScore: number
  minReconciliationRate: number
  minStabilityScore: number
}> = {
  'stage-0': {
    label: '模拟节点',
    description: '仅限本地账本、模拟积分、模拟市场与模拟 PoP/PoO',
    requirements: [
      'Trinity pipeline operational',
      'Minimum 5 governance files active',
      'At least 3 completed tasks',
    ],
    minOutcomes: 3,
    minComplianceScore: 50,
    minReconciliationRate: 50,
    minStabilityScore: 50,
  },
  'stage-1': {
    label: '测试网节点',
    description: '测试网身份、测试市场成交、质押惩罚与僵尸节点归档演练',
    requirements: [
      'Stage 0 milestones completed',
      '10+ settled outcomes',
      'Compliance score >= 70',
      'No critical case law in last 7 days',
    ],
    minOutcomes: 10,
    minComplianceScore: 70,
    minReconciliationRate: 70,
    minStabilityScore: 60,
  },
  'stage-2': {
    label: '受限真实节点',
    description: '白名单市场、小额真实预算、真实结果需人类双签',
    requirements: [
      'Stage 1 milestones completed',
      '25+ settled outcomes',
      'Compliance score >= 80',
      'Reconciliation rate >= 85%',
      'Human approval rate >= 90%',
    ],
    minOutcomes: 25,
    minComplianceScore: 80,
    minReconciliationRate: 85,
    minStabilityScore: 75,
  },
  'stage-3': {
    label: '认证市场节点',
    description: '更大额度、信用达标后开放真实市场上架',
    requirements: [
      'Stage 2 milestones completed',
      '50+ settled outcomes',
      'Compliance score >= 90',
      'Reconciliation rate >= 95%',
      '30-day stability window',
    ],
    minOutcomes: 50,
    minComplianceScore: 90,
    minReconciliationRate: 95,
    minStabilityScore: 90,
  },
  'stage-4': {
    label: '联邦节点',
    description: '网络防御、争议仲裁、公共知识库治理',
    requirements: [
      'Stage 3 milestones completed',
      '100+ settled outcomes',
      'Perfect compliance score',
      'Active for 90+ days',
      'Community governance participation',
    ],
    minOutcomes: 100,
    minComplianceScore: 95,
    minReconciliationRate: 98,
    minStabilityScore: 95,
  },
}

// ---------------------------------------------------------------------------
// Node Status Factory
// ---------------------------------------------------------------------------

export function createInitialNodeStatus(): NodeStatus {
  const stage = 'stage-0'
  const config = STAGE_CONFIG[stage]

  return {
    currentStage: stage,
    stageLabel: config.label,
    stageDescription: config.description,
    promotionProgress: {
      outcomesRequired: config.minOutcomes,
      outcomesAchieved: 0,
      complianceScore: 0,
      reconciliationRate: 0,
      stabilityScore: 0,
      nextStageRequirements: STAGE_CONFIG['stage-1'].requirements,
      estimatedReadiness: 0,
    },
    history: [],
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalOutcomes: 0,
      settledOutcomes: 0,
      rejectedOutcomes: 0,
      uptime: 0,
      lastActivityAt: now(),
    },
  }
}

// ---------------------------------------------------------------------------
// Metrics Calculation
// ---------------------------------------------------------------------------

export function calculateNodeMetrics(
  outcomes: OutcomeReport[],
  _ledgers: GovernanceLedgers,
  _permissionRequests: PermissionRequest[],
  startTime: string,
  tasks: TrinityTask[] = []
): NodeMetrics {
  const settledOutcomes = outcomes.filter(o => o.settledAt).length
  const rejectedOutcomes = outcomes.filter(o => o.oracleVerdict === 'rejected').length
  const uptimeHours = (Date.now() - new Date(startTime).getTime()) / (1000 * 60 * 60)

  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    failedTasks: rejectedOutcomes,
    totalOutcomes: outcomes.length,
    settledOutcomes,
    rejectedOutcomes,
    uptime: Math.round(uptimeHours * 10) / 10,
    lastActivityAt: now(),
  }
}

export function calculatePromotionProgress(
  nodeStatus: NodeStatus,
  outcomes: OutcomeReport[],
  ledgers: GovernanceLedgers,
  permissionRequests: PermissionRequest[]
): PromotionProgress {
  const nextStage = getNextStage(nodeStatus.currentStage)
  if (!nextStage) {
    return {
      ...nodeStatus.promotionProgress,
      estimatedReadiness: 100,
      nextStageRequirements: ['Maximum stage reached'],
    }
  }

  const nextConfig = STAGE_CONFIG[nextStage]
  const settledOutcomes = outcomes.filter(o => o.settledAt).length
  const totalOutcomes = outcomes.length

  // Compliance score: based on permission adherence
  const totalRequests = permissionRequests.length
  const deniedRequests = permissionRequests.filter(r => r.status === 'denied').length
  const complianceScore = totalRequests > 0
    ? Math.round((1 - deniedRequests / totalRequests) * 100)
    : 100

  // Reconciliation rate: settled / total outcomes
  const reconciliationRate = totalOutcomes > 0
    ? Math.round((settledOutcomes / totalOutcomes) * 100)
    : 0

  // Stability score: based on recent failure rate and debt load
  const recentCaseLaw = ledgers.caseLaw.filter(c => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    return c.timestamp > weekAgo && (c.severity === 'major' || c.severity === 'critical')
  })
  const openDebts = ledgers.debt.filter(d => !d.resolved)
  const stabilityPenalty = recentCaseLaw.length * 10 + openDebts.length * 5
  const stabilityScore = Math.max(0, 100 - stabilityPenalty)

  // Estimated readiness
  const outcomeProgress = Math.min(100, (settledOutcomes / nextConfig.minOutcomes) * 100)
  const complianceProgress = Math.min(100, (complianceScore / nextConfig.minComplianceScore) * 100)
  const reconProgress = Math.min(100, (reconciliationRate / nextConfig.minReconciliationRate) * 100)
  const stabilityProgress = Math.min(100, (stabilityScore / nextConfig.minStabilityScore) * 100)
  const estimatedReadiness = Math.round((outcomeProgress + complianceProgress + reconProgress + stabilityProgress) / 4)

  return {
    outcomesRequired: nextConfig.minOutcomes,
    outcomesAchieved: settledOutcomes,
    complianceScore,
    reconciliationRate,
    stabilityScore,
    nextStageRequirements: nextConfig.requirements,
    estimatedReadiness,
  }
}

// ---------------------------------------------------------------------------
// Promotion Engine
// ---------------------------------------------------------------------------

export function checkPromotionEligibility(
  nodeStatus: NodeStatus,
  outcomes: OutcomeReport[],
  ledgers: GovernanceLedgers,
  permissionRequests: PermissionRequest[]
): { eligible: boolean; reasons: string[] } {
  const nextStage = getNextStage(nodeStatus.currentStage)
  if (!nextStage) {
    return { eligible: false, reasons: ['Already at maximum stage'] }
  }

  const config = STAGE_CONFIG[nextStage]
  const progress = calculatePromotionProgress(nodeStatus, outcomes, ledgers, permissionRequests)
  const reasons: string[] = []

  if (progress.outcomesAchieved < config.minOutcomes) {
    reasons.push(`Need ${config.minOutcomes - progress.outcomesAchieved} more settled outcomes`)
  }
  if (progress.complianceScore < config.minComplianceScore) {
    reasons.push(`Compliance score ${progress.complianceScore}% < required ${config.minComplianceScore}%`)
  }
  if (progress.reconciliationRate < config.minReconciliationRate) {
    reasons.push(`Reconciliation rate ${progress.reconciliationRate}% < required ${config.minReconciliationRate}%`)
  }
  if (progress.stabilityScore < config.minStabilityScore) {
    reasons.push(`Stability score ${progress.stabilityScore}% < required ${config.minStabilityScore}%`)
  }

  return { eligible: reasons.length === 0, reasons }
}

export function promoteNode(nodeStatus: NodeStatus): NodeStatus {
  const nextStage = getNextStage(nodeStatus.currentStage)
  if (!nextStage) return nodeStatus

  const config = STAGE_CONFIG[nextStage]
  const nextNextStage = getNextStage(nextStage)

  const event: PromotionEvent = {
    id: generateId(),
    fromStage: nodeStatus.currentStage,
    toStage: nextStage,
    reason: `已满足晋升条件：${config.label}`,
    timestamp: now(),
  }

  return {
    ...nodeStatus,
    currentStage: nextStage,
    stageLabel: config.label,
    stageDescription: config.description,
    promotionProgress: {
      ...nodeStatus.promotionProgress,
      nextStageRequirements: nextNextStage
        ? STAGE_CONFIG[nextNextStage].requirements
        : ['Maximum stage reached'],
    },
    history: [...nodeStatus.history, event],
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getNextStage(current: NodeStage): NodeStage | null {
  const stages: NodeStage[] = ['stage-0', 'stage-1', 'stage-2', 'stage-3', 'stage-4']
  const idx = stages.indexOf(current)
  return idx < stages.length - 1 ? stages[idx + 1] : null
}

export function getStageNumber(stage: NodeStage): number {
  return parseInt(stage.split('-')[1])
}

export function getStageColor(stage: NodeStage): string {
  const colors: Record<NodeStage, string> = {
    'stage-0': '#6b7280', // gray
    'stage-1': '#3b82f6', // blue
    'stage-2': '#f59e0b', // amber
    'stage-3': '#22c55e', // green
    'stage-4': '#8b5cf6', // purple
  }
  return colors[stage]
}
