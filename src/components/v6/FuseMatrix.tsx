// ============================================================================
// 权限保险丝矩阵可视化（中文版）
// ============================================================================

import type { PermissionFuse, PermissionRequest } from '@/types/v6'
import { getLevelColor } from '@/lib/v6/fuse-matrix'

interface FuseMatrixProps {
  matrix: PermissionFuse[]
  requests: PermissionRequest[]
  onApprove?: (requestId: string) => void
  onDeny?: (requestId: string) => void
}

const APPROVER_LABELS: Record<string, string> = {
  ai1: 'AI-1', ai2: 'AI-2', ai3: 'AI-3', human: '👤 人类', 'dual-sign': '👤 人类双签',
  'ai1-expander': 'AI-1', 'ai2-auditor': 'AI-2', 'ai3-governor': 'AI-3',
}

export function FuseMatrix({ matrix, requests, onApprove, onDeny }: FuseMatrixProps) {
  const pendingRequests = requests.filter(r => r.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {matrix.map(fuse => <FuseRow key={fuse.level} fuse={fuse} />)}
      </div>

      {pendingRequests.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">待审批请求 ({pendingRequests.length})</h3>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <PendingRequestCard key={req.id} request={req} onApprove={onApprove} onDeny={onDeny} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FuseRow({ fuse }: { fuse: PermissionFuse }) {
  const color = getLevelColor(fuse.level)
  const isActive = fuse.enabled && fuse.level !== 'L4'
  const isForbidden = fuse.level === 'L4'

  const CATEGORY_ZH: Record<string, string> = {
    'Pure Internal': '纯内部操作', 'Restricted External': '受限外部操作',
    'Low-Value Real': '低额真实操作', 'High-Risk Real': '高风险真实操作',
    'Permanently Forbidden': '永久禁止操作',
  }

  const EXAMPLE_ZH: Record<string, string> = {
    'Write log entries': '写入日志', 'Update playbook drafts': '更新剧本草案',
    'Generate analysis drafts': '生成分析草案', 'Internal state updates': '内部状态更新',
    'Read-only API queries': '只读API查询', 'Sandbox testing': '沙盒测试',
    'Simulated order placement': '模拟下单', 'Public data retrieval': '公开数据获取',
    'Testnet token transfers': '测试网转账', 'Small purchases (<$10)': '小额购买（<$10）',
    'Low-risk API calls': '低风险API调用', 'Test environment deployments': '测试环境部署',
    'Real wallet transactions': '真实钱包交易', 'External contract signing': '外部合约签署',
    'Real market listings': '真实市场上架', 'Production deployments': '生产环境部署',
    'Bypass constitutional constraints': '绕过宪法约束', 'Self-escalate permissions': '自我提权',
    'Transfer host master wallet': '转移宿主主钱包', 'Delete critical ledgers': '删除关键账本',
  }

  const DESC_ZH: Record<string, string> = {
    'Internal operations that have no external effect': '无外部影响的内部操作',
    'Read-only external operations in sandbox environments': '沙盒环境中的只读外部操作',
    'Small real-value operations with limited blast radius': '爆炸半径有限的小额真实操作',
    'Significant real-value operations requiring human oversight': '需要人类监督的重大真实操作',
    'Actions that are never allowed under any circumstances': '任何情况下都不允许的操作',
  }

  return (
    <div className={`flex items-stretch rounded-lg border transition-all ${
      isForbidden ? 'border-red-900/50 bg-red-950/20 opacity-60'
        : isActive ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-50'
    }`}>
      <div className="w-16 flex-shrink-0 flex items-center justify-center rounded-l-lg font-mono font-bold text-sm"
        style={{ backgroundColor: color + '20', color }}>
        {fuse.level}
      </div>
      <div className="flex-1 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-200">{CATEGORY_ZH[fuse.category] ?? fuse.category}</span>
          {fuse.autoExecute && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">自动</span>}
          {isForbidden && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400">禁止</span>}
        </div>
        <div className="text-xs text-gray-500 mb-2">{DESC_ZH[fuse.description] ?? fuse.description}</div>
        <div className="flex flex-wrap gap-1">
          {fuse.examples.slice(0, 3).map((ex) => (
            <span key={ex} className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 text-gray-500">{EXAMPLE_ZH[ex] ?? ex}</span>
          ))}
        </div>
      </div>
      <div className="w-32 flex-shrink-0 flex items-center justify-center px-2">
        {fuse.approvalRequirements.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-center">
            {fuse.approvalRequirements.map((req) => (
              <span key={req} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{APPROVER_LABELS[req] ?? req}</span>
            ))}
          </div>
        ) : isForbidden ? (
          <span className="text-xs text-red-500">🚫 永不</span>
        ) : (
          <span className="text-xs text-green-500">✓ 自动</span>
        )}
      </div>
    </div>
  )
}

function PendingRequestCard({ request, onApprove, onDeny }: {
  request: PermissionRequest; onApprove?: (id: string) => void; onDeny?: (id: string) => void
}) {
  const color = getLevelColor(request.level)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-800/30 bg-amber-950/20 px-4 py-3">
      <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: color + '20', color }}>
        {request.level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-200 truncate">{request.action}</div>
        <div className="text-xs text-gray-500">
          请求者：{APPROVER_LABELS[request.requestedBy] ?? request.requestedBy} · {new Date(request.createdAt).toLocaleTimeString()}
        </div>
        {request.approvals.length > 0 && (
          <div className="flex gap-1 mt-1">
            {request.approvals.map((a) => (
              <span key={`${a.approver}-${a.timestamp}`} className={`text-[10px] px-1 rounded ${a.decision === 'approve' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                {APPROVER_LABELS[a.approver] ?? a.approver}: {a.decision === 'approve' ? '批准' : '拒绝'}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button aria-label={`批准 ${request.action}`} className="px-3 py-1.5 rounded-md bg-green-900/40 text-green-400 text-xs hover:bg-green-900/60 transition-colors" onClick={() => onApprove?.(request.id)}>批准</button>
        <button aria-label={`拒绝 ${request.action}`} className="px-3 py-1.5 rounded-md bg-red-900/40 text-red-400 text-xs hover:bg-red-900/60 transition-colors" onClick={() => onDeny?.(request.id)}>拒绝</button>
      </div>
    </div>
  )
}
