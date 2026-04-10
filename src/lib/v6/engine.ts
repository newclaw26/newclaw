// ============================================================================
// Layer 1: Trinity AI Engine - Three-AI Orchestration
// ============================================================================

import type {
  TrinityRole,
  TrinityAgent,
  TrinityTask,
  TrinityOutput,
  TrinityPhase,
  TaskStatus,
  TrinityOutputType,
  PermissionLevel,
  Constitution,
  V6Event,
} from '@/types/v6'
import { getPermissionLevelForAction, getRequiredApprovals } from './constitution'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Agent Factory
// ---------------------------------------------------------------------------

export function createTrinityAgents(): Record<'ai1' | 'ai2' | 'ai3', TrinityAgent> {
  return {
    ai1: {
      role: 'ai1-expander',
      displayName: 'AI-1 扩张者',
      status: 'idle',
      stats: { tasksCompleted: 0, tasksBlocked: 0, avgResponseTime: 0 },
    },
    ai2: {
      role: 'ai2-auditor',
      displayName: 'AI-2 审计者',
      status: 'idle',
      stats: { tasksCompleted: 0, tasksBlocked: 0, avgResponseTime: 0 },
    },
    ai3: {
      role: 'ai3-governor',
      displayName: 'AI-3 治理者',
      status: 'idle',
      stats: { tasksCompleted: 0, tasksBlocked: 0, avgResponseTime: 0 },
    },
  }
}

// ---------------------------------------------------------------------------
// Task Lifecycle
// ---------------------------------------------------------------------------

export function createTask(
  title: string,
  description: string,
  createdBy: TrinityRole = 'ai1-expander',
  permissionLevel: PermissionLevel = 'L0'
): TrinityTask {
  return {
    id: generateId(),
    title,
    description,
    phase: 'proposal',
    priority: 5,
    createdBy,
    assignedTo: [createdBy],
    status: 'draft',
    outputs: [],
    permissionLevel,
    createdAt: now(),
    updatedAt: now(),
  }
}

export function advanceTaskPhase(task: TrinityTask): TrinityTask {
  const phaseTransitions: Record<TrinityPhase, { next: TrinityPhase; status: TaskStatus; assignTo: TrinityRole[] }> = {
    'proposal': { next: 'audit', status: 'pending-audit', assignTo: ['ai2-auditor'] },
    'audit': { next: 'approval', status: 'pending-approval', assignTo: ['ai3-governor'] },
    'approval': { next: 'execution', status: 'executing', assignTo: ['ai1-expander'] },
    'execution': { next: 'review', status: 'completed', assignTo: ['ai2-auditor', 'ai3-governor'] },
    'review': { next: 'settled', status: 'completed', assignTo: [] },
    'settled': { next: 'settled', status: 'completed', assignTo: [] },
  }

  const transition = phaseTransitions[task.phase]
  if (!transition || task.phase === 'settled') return task

  return {
    ...task,
    phase: transition.next,
    status: transition.status,
    assignedTo: transition.assignTo,
    updatedAt: now(),
    completedAt: transition.next === 'settled' ? now() : task.completedAt,
  }
}

export function blockTask(task: TrinityTask, reason: string): TrinityTask {
  return {
    ...task,
    status: 'blocked',
    updatedAt: now(),
    outputs: [
      ...task.outputs,
      createOutput(task.id, 'ai2-auditor', 'audit-opinion', `BLOCKED: ${reason}`),
    ],
  }
}

export function failTask(task: TrinityTask, reason: string): TrinityTask {
  return {
    ...task,
    status: 'failed',
    phase: 'review',
    updatedAt: now(),
    outputs: [
      ...task.outputs,
      createOutput(task.id, 'ai2-auditor', 'risk-report', `FAILED: ${reason}`),
    ],
  }
}

// ---------------------------------------------------------------------------
// Output Generation
// ---------------------------------------------------------------------------

export function createOutput(
  taskId: string,
  role: TrinityRole,
  type: TrinityOutputType,
  content: string,
  metadata: Record<string, unknown> = {}
): TrinityOutput {
  return {
    id: generateId(),
    role,
    type,
    content,
    metadata,
    timestamp: now(),
    taskId,
  }
}

// ---------------------------------------------------------------------------
// Trinity Pipeline Orchestration
// ---------------------------------------------------------------------------

export interface PipelineResult {
  task: TrinityTask
  events: V6Event[]
  permissionRequired?: PermissionLevel
  blocked: boolean
  reason?: string
}

export function runProposalPhase(task: TrinityTask, proposalContent: string): PipelineResult {
  const output = createOutput(task.id, 'ai1-expander', 'task-draft', proposalContent)
  const updatedTask: TrinityTask = {
    ...task,
    outputs: [...task.outputs, output],
    updatedAt: now(),
  }

  const events: V6Event[] = [{
    id: generateId(),
    type: 'trinity:output',
    payload: output,
    timestamp: now(),
    source: 'ai1-expander',
  }]

  return { task: advanceTaskPhase(updatedTask), events, blocked: false }
}

export function runAuditPhase(
  task: TrinityTask,
  constitution: Constitution,
  auditFindings: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
): PipelineResult {
  const auditOutput = createOutput(task.id, 'ai2-auditor', 'audit-opinion', auditFindings, { riskLevel })

  // Check if action needs higher permission
  const requiredLevel = getPermissionLevelForAction(constitution, task.title)
  if (requiredLevel === 'L4') {
    return {
      task: blockTask({ ...task, outputs: [...task.outputs, auditOutput] }, 'Action permanently forbidden (L4)'),
      events: [{
        id: generateId(),
        type: 'task:failed',
        payload: { taskId: task.id, reason: 'L4 forbidden action' },
        timestamp: now(),
        source: 'ai2-auditor',
      }],
      blocked: true,
      reason: 'Action permanently forbidden by permission fuse matrix (L4)',
    }
  }

  if (riskLevel === 'critical') {
    return {
      task: blockTask({ ...task, outputs: [...task.outputs, auditOutput] }, `Critical risk: ${auditFindings}`),
      events: [{
        id: generateId(),
        type: 'task:failed',
        payload: { taskId: task.id, reason: auditFindings },
        timestamp: now(),
        source: 'ai2-auditor',
      }],
      blocked: true,
      reason: auditFindings,
    }
  }

  const updatedTask: TrinityTask = {
    ...task,
    outputs: [...task.outputs, auditOutput],
    permissionLevel: requiredLevel,
    updatedAt: now(),
  }

  return {
    task: advanceTaskPhase(updatedTask),
    events: [{
      id: generateId(),
      type: 'trinity:output',
      payload: auditOutput,
      timestamp: now(),
      source: 'ai2-auditor',
    }],
    blocked: false,
    permissionRequired: requiredLevel,
  }
}

export function runApprovalPhase(
  task: TrinityTask,
  constitution: Constitution,
  approved: boolean,
  budgetAllocation?: number
): PipelineResult {
  const requiredApprovals = getRequiredApprovals(constitution, task.permissionLevel)
  const needsHuman = requiredApprovals.includes('human') || requiredApprovals.includes('dual-sign')

  if (!approved) {
    return {
      task: blockTask(task, 'Approval denied by AI-3 Governor'),
      events: [{
        id: generateId(),
        type: 'task:failed',
        payload: { taskId: task.id, reason: 'Approval denied' },
        timestamp: now(),
        source: 'ai3-governor',
      }],
      blocked: true,
      reason: 'Task approval denied by AI-3 financial governor',
    }
  }

  const charterOutput = createOutput(task.id, 'ai3-governor', 'task-charter', 'Task approved and chartered', {
    budgetAllocation: budgetAllocation ?? 0,
    permissionLevel: task.permissionLevel,
    needsHumanApproval: needsHuman,
  })

  const updatedTask: TrinityTask = {
    ...task,
    outputs: [...task.outputs, charterOutput],
    updatedAt: now(),
  }

  if (needsHuman) {
    return {
      task: { ...updatedTask, status: 'pending-approval' },
      events: [{
        id: generateId(),
        type: 'permission:requested',
        payload: { taskId: task.id, level: task.permissionLevel },
        timestamp: now(),
        source: 'ai3-governor',
      }],
      blocked: true,
      reason: `Requires human dual-sign approval (${task.permissionLevel})`,
      permissionRequired: task.permissionLevel,
    }
  }

  return {
    task: advanceTaskPhase(updatedTask),
    events: [{
      id: generateId(),
      type: 'trinity:output',
      payload: charterOutput,
      timestamp: now(),
      source: 'ai3-governor',
    }],
    blocked: false,
  }
}

// ---------------------------------------------------------------------------
// Agent Status Management
// ---------------------------------------------------------------------------

export function updateAgentStatus(
  agent: TrinityAgent,
  status: TrinityAgent['status'],
  currentTask?: string
): TrinityAgent {
  return {
    ...agent,
    status,
    currentTask,
    stats: {
      ...agent.stats,
      lastActiveAt: now(),
    },
  }
}

export function recordAgentCompletion(agent: TrinityAgent, responseTimeMs: number): TrinityAgent {
  const { tasksCompleted, avgResponseTime } = agent.stats
  const newAvg = (avgResponseTime * tasksCompleted + responseTimeMs) / (tasksCompleted + 1)
  return {
    ...agent,
    status: 'idle',
    currentTask: undefined,
    stats: {
      ...agent.stats,
      tasksCompleted: tasksCompleted + 1,
      avgResponseTime: Math.round(newAvg),
      lastActiveAt: now(),
    },
  }
}
