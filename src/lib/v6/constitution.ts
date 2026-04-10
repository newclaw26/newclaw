// ============================================================================
// Layer 0: Constitutional File Management
// ============================================================================

import type {
  Constitution,
  ConstitutionalGoal,
  Constraint,
  ValuePriority,
  AuthorityRule,
  PermissionLevel,
} from '@/types/v6'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export function createDefaultConstitution(): Constitution {
  return {
    version: '6.0.0',
    lastModified: now(),
    goals: [
      {
        id: generateId(),
        phase: 'MVP',
        description: 'Build a minimal three-AI node that can run governance flows with simulated credits',
        milestones: [
          { id: generateId(), label: 'Trinity node operational', criteria: 'AI-1, AI-2, AI-3 can process tasks through proposal→audit→approval pipeline', completed: false },
          { id: generateId(), label: 'Ledger system active', criteria: 'EVIDENCE, VALUE, LEDGER_LOCAL recording entries correctly', completed: false },
          { id: generateId(), label: 'Outcome Oracle functional', criteria: 'Can generate and validate OUTCOME_REPORT from completed tasks', completed: false },
          { id: generateId(), label: 'Permission fuse enforced', criteria: 'L0-L4 permission levels correctly gate actions', completed: false },
        ],
        createdAt: now(),
        updatedAt: now(),
      },
    ],
    constraints: [
      { id: generateId(), category: 'system', description: 'No direct access to real wallets in Stage 0-1', enforceable: true, severity: 'hard' },
      { id: generateId(), category: 'system', description: 'All outcomes must pass Oracle validation before credit entry', enforceable: true, severity: 'hard' },
      { id: generateId(), category: 'host', description: 'Human retains veto power over all L3+ actions', enforceable: true, severity: 'hard' },
      { id: generateId(), category: 'ethical', description: 'No circumvention of permission fuse matrix', enforceable: true, severity: 'hard' },
      { id: generateId(), category: 'legal', description: 'Comply with local data protection regulations', enforceable: true, severity: 'hard' },
      { id: generateId(), category: 'system', description: 'Low-grade evidence (H4) cannot enter main state directly', enforceable: true, severity: 'soft' },
    ],
    values: [
      { id: generateId(), dimension: 'quality', weight: 30, description: 'Code and output quality over speed' },
      { id: generateId(), dimension: 'risk', weight: 25, description: 'Minimize risk exposure at each stage' },
      { id: generateId(), dimension: 'reuse', weight: 20, description: 'Favor reusable playbooks and knowledge' },
      { id: generateId(), dimension: 'revenue', weight: 15, description: 'Simulated credit accumulation potential' },
      { id: generateId(), dimension: 'compliance', weight: 10, description: 'Adherence to constitutional constraints' },
    ],
    authority: [
      { id: generateId(), actionPattern: 'write-log|update-playbook|generate-draft', permissionLevel: 'L0', requiredApprovals: [], description: 'Pure internal actions auto-execute' },
      { id: generateId(), actionPattern: 'read-query|sandbox-test|simulate-order', permissionLevel: 'L1', requiredApprovals: ['ai2'], description: 'Restricted external read actions need AI-2 audit' },
      { id: generateId(), actionPattern: 'testnet-transfer|small-purchase|low-risk-api', permissionLevel: 'L2', requiredApprovals: ['ai2', 'ai3'], description: 'Low-value real actions need AI-2 + AI-3' },
      { id: generateId(), actionPattern: 'real-wallet|external-contract|real-listing', permissionLevel: 'L3', requiredApprovals: ['ai2', 'ai3', 'human'], description: 'High-risk real actions need AI-2 + AI-3 + human dual-sign' },
      { id: generateId(), actionPattern: 'bypass-constraint|expand-permission|delete-ledger', permissionLevel: 'L4', requiredApprovals: [], description: 'Permanently forbidden actions - never approved' },
    ],
    done: [
      { id: generateId(), taskPattern: 'playbook-generation', criteria: ['Playbook is syntactically valid', 'Passes AI-2 audit', 'Has evidence references'], verificationMethod: 'automated' },
      { id: generateId(), taskPattern: 'market-listing', criteria: ['Price validated', 'Risk assessment completed', 'Budget approved by AI-3'], verificationMethod: 'peer-review' },
      { id: generateId(), taskPattern: 'outcome-settlement', criteria: ['Oracle verdict is settleable', 'Reconciliation hash valid', 'Evidence grade >= H2'], verificationMethod: 'automated' },
    ],
  }
}

export function addGoal(constitution: Constitution, goal: Omit<ConstitutionalGoal, 'id' | 'createdAt' | 'updatedAt'>): Constitution {
  return {
    ...constitution,
    goals: [...constitution.goals, { ...goal, id: generateId(), createdAt: now(), updatedAt: now() }],
    lastModified: now(),
  }
}

export function addConstraint(constitution: Constitution, constraint: Omit<Constraint, 'id'>): Constitution {
  return {
    ...constitution,
    constraints: [...constitution.constraints, { ...constraint, id: generateId() }],
    lastModified: now(),
  }
}

export function updateValueWeights(constitution: Constitution, values: ValuePriority[]): Constitution {
  const total = values.reduce((sum, v) => sum + v.weight, 0)
  if (total !== 100) {
    throw new Error(`Value weights must sum to 100, got ${total}`)
  }
  return { ...constitution, values, lastModified: now() }
}

export function getPermissionLevelForAction(constitution: Constitution, action: string): PermissionLevel {
  const words = action.toLowerCase().split(/\s+/)
  for (const rule of constitution.authority) {
    const patterns = rule.actionPattern.split('|')
    if (patterns.some(p => words.some(w => w === p || w.startsWith(p + '-')))) {
      return rule.permissionLevel
    }
  }
  return 'L0' // BUG-14 fix: default to auto-execute for unmatched internal simulation tasks
}

export function getRequiredApprovals(constitution: Constitution, level: PermissionLevel): AuthorityRule['requiredApprovals'] {
  const rule = constitution.authority.find(r => r.permissionLevel === level)
  return rule?.requiredApprovals ?? ['human']
}

export function completeMilestone(constitution: Constitution, goalId: string, milestoneId: string): Constitution {
  return {
    ...constitution,
    goals: constitution.goals.map(g =>
      g.id === goalId
        ? {
            ...g,
            updatedAt: now(),
            milestones: g.milestones.map(m =>
              m.id === milestoneId ? { ...m, completed: true, completedAt: now() } : m
            ),
          }
        : g
    ),
    lastModified: now(),
  }
}

export function validateConstitution(constitution: Constitution): string[] {
  const errors: string[] = []

  if (constitution.goals.length === 0) errors.push('At least one goal is required')
  if (constitution.constraints.length === 0) errors.push('At least one constraint is required')

  const totalWeight = constitution.values.reduce((s, v) => s + v.weight, 0)
  if (totalWeight !== 100) errors.push(`Value weights must sum to 100, got ${totalWeight}`)

  const levels = new Set(constitution.authority.map(a => a.permissionLevel))
  const requiredLevels: PermissionLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4']
  for (const l of requiredLevels) {
    if (!levels.has(l)) errors.push(`Missing authority rule for permission level ${l}`)
  }

  const l4 = constitution.authority.find(a => a.permissionLevel === 'L4')
  if (l4 && l4.requiredApprovals.length > 0) errors.push('L4 actions must have empty approvals (permanently forbidden)')

  return errors
}
