// ============================================================================
// 节点晋升流水线可视化（中文版）
// ============================================================================

import type { NodeStatus, NodeStage } from '@/types/v6'
import { getStageColor } from '@/lib/v6/promotion'

interface PromotionPipelineProps {
  nodeStatus: NodeStatus
  _onCheckPromotion?: () => { eligible: boolean; reasons: string[] }
  _onPromote?: () => boolean
}

const STAGE_ZH: Record<NodeStage, string> = {
  'stage-0': '模拟节点', 'stage-1': '测试网节点', 'stage-2': '受限真实节点',
  'stage-3': '认证市场节点', 'stage-4': '联邦节点',
}

const REQ_ZH: Record<string, string> = {
  'Trinity pipeline operational': '三核流水线已运行',
  'Minimum 5 governance files active': '至少5个治理文件激活',
  'At least 3 completed tasks': '至少3个已完成任务',
  'Stage 0 milestones completed': 'Stage 0 里程碑已完成',
  '10+ settled outcomes': '10+ 已结算结果',
  'Compliance score >= 70': '合规分数 >= 70',
  'No critical case law in last 7 days': '最近7天无严重判例',
  'Stage 1 milestones completed': 'Stage 1 里程碑已完成',
  '25+ settled outcomes': '25+ 已结算结果',
  'Compliance score >= 80': '合规分数 >= 80',
  'Reconciliation rate >= 85%': '对账率 >= 85%',
  'Human approval rate >= 90%': '人类批准率 >= 90%',
  'Stage 2 milestones completed': 'Stage 2 里程碑已完成',
  '50+ settled outcomes': '50+ 已结算结果',
  'Compliance score >= 90': '合规分数 >= 90',
  'Reconciliation rate >= 95%': '对账率 >= 95%',
  '30-day stability window': '30天稳定窗口',
  'Stage 3 milestones completed': 'Stage 3 里程碑已完成',
  '100+ settled outcomes': '100+ 已结算结果',
  'Perfect compliance score': '完美合规分数',
  'Active for 90+ days': '活跃90天以上',
  'Community governance participation': '参与社区治理',
  'Maximum stage reached': '已达最高阶段',
}

export function PromotionPipeline({ nodeStatus }: PromotionPipelineProps) {
  const stages: NodeStage[] = ['stage-0', 'stage-1', 'stage-2', 'stage-3', 'stage-4']
  const currentIdx = stages.indexOf(nodeStatus.currentStage)
  const { promotionProgress: progress, metrics } = nodeStatus

  return (
    <div className="space-y-6">
      {/* 阶段进度条 */}
      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          {stages.map((stage, idx) => {
            const color = getStageColor(stage)
            const isActive = idx === currentIdx
            const isPast = idx < currentIdx
            const isFuture = idx > currentIdx
            return (
              <div key={stage} className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2 transition-all ${isActive ? 'scale-110 shadow-lg' : isPast ? 'opacity-80' : 'opacity-40'}`}
                  style={{ backgroundColor: isPast || isActive ? color + '30' : 'transparent', borderColor: color, color: isPast || isActive ? color : color + '60', boxShadow: isActive ? `0 0 20px ${color}40` : 'none' }}>
                  {isPast ? '✓' : idx}
                </div>
                <div className={`text-xs mt-2 text-center max-w-[80px] ${isActive ? 'text-white font-semibold' : isFuture ? 'text-gray-400' : 'text-gray-400'}`}>
                  {STAGE_ZH[stage]}
                </div>
              </div>
            )
          })}
        </div>
        <div className="absolute top-5 left-[40px] right-[40px] h-0.5 bg-gray-800 -z-0" role="progressbar" aria-valuenow={Math.round((currentIdx / (stages.length - 1)) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="阶段进度">
          <div className="h-full transition-all duration-500" style={{ width: `${(currentIdx / (stages.length - 1)) * 100}%`, background: `linear-gradient(to right, ${getStageColor('stage-0')}, ${getStageColor(nodeStatus.currentStage)})` }} />
        </div>
      </div>

      {/* 当前阶段信息 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStageColor(nodeStatus.currentStage) }} />
          <h3 className="text-sm font-semibold text-white">{STAGE_ZH[nodeStatus.currentStage]}</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">{nodeStatus.stageDescription}</p>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="已结算结果" value={`${progress.outcomesAchieved} / ${progress.outcomesRequired}`} percent={Math.min(100, (progress.outcomesAchieved / Math.max(1, progress.outcomesRequired)) * 100)} color="#3b82f6" />
          <MetricCard label="合规分数" value={`${progress.complianceScore}%`} percent={progress.complianceScore} color="#22c55e" />
          <MetricCard label="对账率" value={`${progress.reconciliationRate}%`} percent={progress.reconciliationRate} color="#f59e0b" />
          <MetricCard label="稳定性" value={`${progress.stabilityScore}%`} percent={progress.stabilityScore} color="#8b5cf6" />
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">晋升就绪度</span>
            <span className="text-xs font-mono text-white">{progress.estimatedReadiness}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress.estimatedReadiness} aria-valuemin={0} aria-valuemax={100} aria-label="晋升就绪度">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${progress.estimatedReadiness}%`,
              background: progress.estimatedReadiness >= 80 ? 'linear-gradient(to right, #22c55e, #86efac)' : progress.estimatedReadiness >= 50 ? 'linear-gradient(to right, #f59e0b, #fcd34d)' : 'linear-gradient(to right, #ef4444, #fca5a5)',
            }} />
          </div>
        </div>
      </div>

      {/* 节点指标 */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="任务" value={metrics.totalTasks} />
        <MiniStat label="已完成" value={metrics.completedTasks} color="text-green-400" />
        <MiniStat label="失败" value={metrics.failedTasks} color="text-red-400" />
        <MiniStat label="运行时长" value={`${metrics.uptime}h`} />
      </div>

      {/* 下阶段要求 */}
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">下阶段晋升条件</h4>
        <ul className="space-y-1">
          {progress.nextStageRequirements.map((req) => (
            <li key={req} className="text-xs text-gray-500 flex items-start gap-2">
              <span className="text-gray-700 mt-0.5">○</span>
              {REQ_ZH[req] ?? req}
            </li>
          ))}
        </ul>
      </div>

      {/* 晋升历史 */}
      {nodeStatus.history.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-2">晋升历史</h4>
          <div className="space-y-1">
            {nodeStatus.history.map(event => (
              <div key={event.id} className="flex items-center gap-2 text-xs">
                <span className="text-gray-400 font-mono">{new Date(event.timestamp).toLocaleDateString()}</span>
                <span className="text-gray-500">→</span>
                <span style={{ color: getStageColor(event.toStage) }}>{STAGE_ZH[event.toStage]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div className="bg-black/20 rounded-md p-3">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-mono text-white mb-2">{value}</div>
      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white/5 rounded-md p-2 text-center">
      <div className={`text-lg font-mono font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  )
}
