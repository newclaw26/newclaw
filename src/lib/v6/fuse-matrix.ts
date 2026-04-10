// ============================================================================
// Layer 4: Permission Fuse Matrix
// ============================================================================

import type {
  PermissionFuse,
  PermissionLevel,
  PermissionRequest,
  PermissionApproval,
  TrinityRole,
} from '@/types/v6'

const generateId = () => crypto.randomUUID()
const now = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// Default Permission Matrix
// ---------------------------------------------------------------------------

export function createDefaultFuseMatrix(): PermissionFuse[] {
  return [
    {
      level: 'L0',
      category: 'Pure Internal',
      description: 'Internal operations that have no external effect',
      examples: ['Write log entries', 'Update playbook drafts', 'Generate analysis drafts', 'Internal state updates'],
      approvalRequirements: [],
      autoExecute: true,
      enabled: true,
    },
    {
      level: 'L1',
      category: 'Restricted External',
      description: 'Read-only external operations in sandbox environments',
      examples: ['Read-only API queries', 'Sandbox testing', 'Simulated order placement', 'Public data retrieval'],
      approvalRequirements: ['ai2'],
      autoExecute: false,
      enabled: true,
    },
    {
      level: 'L2',
      category: 'Low-Value Real',
      description: 'Small real-value operations with limited blast radius',
      examples: ['Testnet token transfers', 'Small purchases (<$10)', 'Low-risk API calls', 'Test environment deployments'],
      approvalRequirements: ['ai2', 'ai3'],
      autoExecute: false,
      enabled: true,
    },
    {
      level: 'L3',
      category: 'High-Risk Real',
      description: 'Significant real-value operations requiring human oversight',
      examples: ['Real wallet transactions', 'External contract signing', 'Real market listings', 'Production deployments'],
      approvalRequirements: ['ai2', 'ai3', 'human'],
      autoExecute: false,
      enabled: true,
    },
    {
      level: 'L4',
      category: 'Permanently Forbidden',
      description: 'Actions that are never allowed under any circumstances',
      examples: ['Bypass constitutional constraints', 'Self-escalate permissions', 'Transfer host master wallet', 'Delete critical ledgers'],
      approvalRequirements: [],
      autoExecute: false,
      enabled: false, // permanently disabled
    },
  ]
}

// ---------------------------------------------------------------------------
// Permission Check Engine
// ---------------------------------------------------------------------------

export function checkPermission(
  matrix: PermissionFuse[],
  level: PermissionLevel
): { allowed: boolean; fuse: PermissionFuse; reason: string } {
  const fuse = matrix.find(f => f.level === level)
  if (!fuse) {
    return { allowed: false, fuse: createDefaultFuseMatrix()[4], reason: `Unknown permission level: ${level}` }
  }

  if (level === 'L4') {
    return { allowed: false, fuse, reason: 'L4 actions are permanently forbidden' }
  }

  if (!fuse.enabled) {
    return { allowed: false, fuse, reason: `Permission level ${level} is currently disabled` }
  }

  if (fuse.autoExecute) {
    return { allowed: true, fuse, reason: 'Auto-execute permitted' }
  }

  return { allowed: false, fuse, reason: `Requires approval: ${fuse.approvalRequirements.join(', ')}` }
}

export function canAutoExecute(matrix: PermissionFuse[], level: PermissionLevel): boolean {
  const { allowed, fuse } = checkPermission(matrix, level)
  return allowed && fuse.autoExecute
}

// ---------------------------------------------------------------------------
// Permission Request Management
// ---------------------------------------------------------------------------

export function createPermissionRequest(
  taskId: string,
  requestedBy: TrinityRole,
  level: PermissionLevel,
  action: string,
  description: string
): PermissionRequest {
  return {
    id: generateId(),
    taskId,
    requestedBy,
    level,
    action,
    description,
    status: 'pending',
    approvals: [],
    createdAt: now(),
  }
}

export function addApproval(
  request: PermissionRequest,
  approver: TrinityRole | 'human',
  decision: 'approve' | 'deny',
  reason?: string
): PermissionRequest {
  const approval: PermissionApproval = {
    approver,
    decision,
    reason,
    timestamp: now(),
  }

  const updatedApprovals = [...request.approvals, approval]

  // Check if any denial immediately denies the request
  if (decision === 'deny') {
    return {
      ...request,
      approvals: updatedApprovals,
      status: 'denied',
      resolvedAt: now(),
    }
  }

  return {
    ...request,
    approvals: updatedApprovals,
  }
}

export function isFullyApproved(
  request: PermissionRequest,
  matrix: PermissionFuse[]
): boolean {
  const fuse = matrix.find(f => f.level === request.level)
  if (!fuse) return false

  const required = fuse.approvalRequirements
  const approvedBy = new Set(
    request.approvals
      .filter(a => a.decision === 'approve')
      .map(a => a.approver)
  )

  // Normalize: ApprovalRequirement 'ai2' must match TrinityRole 'ai2-auditor'
  // Bidirectional map: short -> long AND long -> short for matching flexibility
  const roleMap: Record<string, TrinityRole | 'human'> = {
    'ai1': 'ai1-expander',
    'ai2': 'ai2-auditor',
    'ai3': 'ai3-governor',
    'human': 'human',
  }
  const reverseMap: Record<string, string> = {
    'ai1-expander': 'ai1',
    'ai2-auditor': 'ai2',
    'ai3-governor': 'ai3',
    'human': 'human',
  }

  // BUG-15 fix: remove unsafe cast; use bidirectional roleMap matching instead
  return required.every(req => {
    if (req === 'dual-sign') return approvedBy.has('human')
    const normalizedRole: TrinityRole | 'human' = roleMap[req] ?? 'human'
    const shortForm = reverseMap[normalizedRole] ?? req
    return approvedBy.has(normalizedRole) || approvedBy.has(shortForm as TrinityRole | 'human')
  })
}

export function resolveRequest(
  request: PermissionRequest,
  matrix: PermissionFuse[]
): PermissionRequest {
  if (request.status !== 'pending') return request

  if (isFullyApproved(request, matrix)) {
    return { ...request, status: 'approved', resolvedAt: now() }
  }

  const hasDenial = request.approvals.some(a => a.decision === 'deny')
  if (hasDenial) {
    return { ...request, status: 'denied', resolvedAt: now() }
  }

  return request
}

// ---------------------------------------------------------------------------
// Fuse Matrix Analytics
// ---------------------------------------------------------------------------

export function getPermissionStats(requests: PermissionRequest[]) {
  return {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    denied: requests.filter(r => r.status === 'denied').length,
    expired: requests.filter(r => r.status === 'expired').length,
    byLevel: {
      L0: requests.filter(r => r.level === 'L0').length,
      L1: requests.filter(r => r.level === 'L1').length,
      L2: requests.filter(r => r.level === 'L2').length,
      L3: requests.filter(r => r.level === 'L3').length,
      L4: requests.filter(r => r.level === 'L4').length,
    },
    approvalRate: requests.length > 0
      ? Math.round((requests.filter(r => r.status === 'approved').length / requests.length) * 100)
      : 0,
  }
}

export function getLevelLabel(level: PermissionLevel): string {
  const labels: Record<PermissionLevel, string> = {
    L0: 'Auto-Execute',
    L1: 'Audit Required',
    L2: 'Dual Approval',
    L3: 'Human Sign-off',
    L4: 'Forbidden',
  }
  return labels[level]
}

export function getLevelColor(level: PermissionLevel): string {
  const colors: Record<PermissionLevel, string> = {
    L0: '#22c55e', // green
    L1: '#3b82f6', // blue
    L2: '#f59e0b', // amber
    L3: '#ef4444', // red
    L4: '#1f2937', // dark
  }
  return colors[level]
}
