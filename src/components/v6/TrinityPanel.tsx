// ============================================================================
// 三核面板 - 单个AI角色显示（中文版）
// ============================================================================

import type { TrinityAgent, TrinityTask, TrinityRole } from '@/types/v6'

// BUG-11 fix: safe time formatting for corrupted timestamps
function safeTime(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString()
}

interface TrinityPanelProps {
  agent: TrinityAgent
  tasks: TrinityTask[]
  expanded: boolean
  onToggle: () => void
  onAction?: (taskId: string, action: string) => void
}

const ROLE_CONFIG: Record<TrinityRole, { icon: string; color: string; bgColor: string; borderColor: string; label: string; desc: string }> = {
  'ai1-expander': { icon: '🎯', color: 'text-blue-400', bgColor: 'bg-blue-950/40', borderColor: 'border-blue-800/50', label: 'AI-1 扩张者', desc: '策略生成与执行' },
  'ai2-auditor': { icon: '🛡️', color: 'text-amber-400', bgColor: 'bg-amber-950/40', borderColor: 'border-amber-800/50', label: 'AI-2 审计者', desc: '风控审计与证据标注' },
  'ai3-governor': { icon: '⚖️', color: 'text-emerald-400', bgColor: 'bg-emerald-950/40', borderColor: 'border-emerald-800/50', label: 'AI-3 治理者', desc: '预算审批与信用提交' },
}

const STATUS_INDICATOR: Record<TrinityAgent['status'], { color: string; label: string; pulse: boolean }> = {
  idle: { color: 'bg-gray-500', label: '空闲', pulse: false },
  thinking: { color: 'bg-yellow-500', label: '思考中', pulse: true },
  executing: { color: 'bg-blue-500', label: '执行中', pulse: true },
  blocked: { color: 'bg-red-500', label: '阻塞', pulse: false },
  error: { color: 'bg-red-600', label: '错误', pulse: false },
}

const TASK_STATUS_LABELS: Record<string, string> = {
  draft: '草案', 'pending-audit': '待审计', 'pending-approval': '待审批', approved: '已批准',
  executing: '执行中', completed: '已完成', failed: '失败', blocked: '阻塞', cancelled: '已取消',
}

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  'task-draft': '任务草案', playbook: '剧本', 'market-suggestion': '市场建议',
  'audit-opinion': '审计意见', 'risk-report': '风险报告', 'evidence-tag': '证据标注', counterfactual: '反事实分析',
  'task-charter': '任务授权', 'budget-batch': '预算批次', 'listing-confirm': '上架确认', 'outcome-submit': '结果提交',
}

export function TrinityPanel({ agent, tasks, expanded, onToggle, onAction }: TrinityPanelProps) {
  const config = ROLE_CONFIG[agent.role]
  const statusInfo = STATUS_INDICATOR[agent.status]
  const assignedTasks = tasks.filter(t => t.assignedTo.includes(agent.role))
  const recentOutputs = tasks.flatMap(t => t.outputs).filter(o => o.role === agent.role).slice(-3)

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden transition-all duration-200`}>
      <button aria-expanded={expanded} aria-label={`展开 ${config.label} 面板`} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="text-left">
            <div className={`font-semibold ${config.color}`}>{config.label}</div>
            <div className="text-xs text-gray-400">{config.desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-gray-400">{statusInfo.label}</span>
          </div>
          <svg aria-hidden="true" className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          <div className="flex gap-4 pt-3 text-xs">
            <div><span className="text-gray-500">已完成</span><span className="ml-1 text-white font-mono">{agent.stats.tasksCompleted}</span></div>
            <div><span className="text-gray-500">被阻塞</span><span className="ml-1 text-white font-mono">{agent.stats.tasksBlocked}</span></div>
            <div><span className="text-gray-500">平均耗时</span><span className="ml-1 text-white font-mono">{agent.stats.avgResponseTime}ms</span></div>
          </div>

          {agent.currentTask && (
            <div className="bg-black/20 rounded-md p-2">
              <div className="text-xs text-gray-500 mb-1">当前任务</div>
              <div className="text-sm text-gray-300 truncate">{tasks.find(t => t.id === agent.currentTask)?.title ?? agent.currentTask}</div>
            </div>
          )}

          {assignedTasks.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">已分配任务 ({assignedTasks.length})</div>
              <div className="space-y-1">
                {assignedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between bg-black/20 rounded px-2 py-1.5 cursor-pointer hover:bg-black/30 transition-colors" onClick={() => onAction?.(task.id, 'select')}>
                    <span className="text-xs text-gray-300 truncate flex-1">{task.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${getStatusStyle(task.status)}`}>{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentOutputs.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-2">最近输出</div>
              <div className="space-y-1">
                {recentOutputs.map(output => (
                  <div key={output.id} className="bg-black/20 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-mono">{OUTPUT_TYPE_LABELS[output.type] ?? output.type}</span>
                      <span className="text-[10px] text-gray-400">{safeTime(output.timestamp)}</span>
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">{output.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function getStatusStyle(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300', 'pending-audit': 'bg-amber-900/50 text-amber-400',
    'pending-approval': 'bg-purple-900/50 text-purple-400', approved: 'bg-blue-900/50 text-blue-400',
    executing: 'bg-cyan-900/50 text-cyan-400', completed: 'bg-green-900/50 text-green-400',
    failed: 'bg-red-900/50 text-red-400', blocked: 'bg-red-900/50 text-red-300', cancelled: 'bg-gray-800 text-gray-500',
  }
  return map[status] ?? 'bg-gray-700 text-gray-400'
}
