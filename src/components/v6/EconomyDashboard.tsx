// ============================================================================
// 经济系统仪表盘 - 显示余额 / PoO 分数 / 减半进度 / 验证统计
// ============================================================================

import { memo } from 'react'

// TODO: 当适配器代理集成 EconomyStatus 类型后，从 @/types/v6 导入并替换此本地定义
interface EconomyStatus {
  newBBalance: number         // New.B 余额
  simBalance: number          // SIM 余额
  marketSimBalance?: number   // 市场 SIM 余额（来自 market store）
  pooPriorityScore: number    // PoO 优先级分数 (0-100)
  halvingEpoch: number        // 当前减半纪元
  halvingProgress: number     // 减半进度百分比 (0-100)
  verifiedOutcomes: number    // 已验证结果数
  rejectedOutcomes: number    // 已拒绝结果数
}

interface EconomyDashboardProps {
  economy: EconomyStatus
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'bg-green-500'
  if (value >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export const EconomyDashboard = memo<EconomyDashboardProps>(function EconomyDashboard({ economy }) {
  const totalOutcomes = economy.verifiedOutcomes + economy.rejectedOutcomes
  const verifiedRate = totalOutcomes > 0
    ? Math.round((economy.verifiedOutcomes / totalOutcomes) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* 余额区域 */}
      <div className="grid grid-cols-3 gap-4">
        {/* New.B 余额 */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] text-gray-500 mb-2">New.B 余额</div>
          <div className="text-3xl font-mono font-semibold text-amber-400">
            {economy.newBBalance.toLocaleString('zh-CN')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">主要通证</div>
        </div>

        {/* SIM 余额（经济系统） */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] text-gray-500 mb-2">SIM 余额</div>
          <div className="text-3xl font-mono font-semibold text-cyan-400">
            {economy.simBalance.toLocaleString('zh-CN')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">结算信用</div>
        </div>

        {/* 市场 SIM 余额 */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] text-gray-500 mb-2">市场 SIM</div>
          <div className="text-3xl font-mono font-semibold text-emerald-400">
            {(economy.marketSimBalance ?? 0).toLocaleString('zh-CN')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">知识市场信用</div>
        </div>
      </div>

      {/* PoO 优先级分数 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-400">PoO 优先级分数</div>
          <span className={`text-sm font-mono font-semibold ${
            economy.pooPriorityScore >= 80 ? 'text-green-400' :
            economy.pooPriorityScore >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {economy.pooPriorityScore}%
          </span>
        </div>
        <div
          className="h-2 rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={economy.pooPriorityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`PoO 优先级分数 ${economy.pooPriorityScore}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(economy.pooPriorityScore)}`}
            style={{ width: `${economy.pooPriorityScore}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>低优先级</span>
          <span>高优先级</span>
        </div>
      </div>

      {/* 减半进度 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-400">减半进度</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 font-mono">
              纪元 {economy.halvingEpoch}
            </span>
            <span className="text-sm font-mono font-semibold text-purple-400">
              {economy.halvingProgress}%
            </span>
          </div>
        </div>
        <div
          className="h-2 rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={economy.halvingProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`减半进度 纪元 ${economy.halvingEpoch}，已完成 ${economy.halvingProgress}%`}
        >
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-300"
            style={{ width: `${economy.halvingProgress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>纪元开始</span>
          <span>下一次减半</span>
        </div>
      </div>

      {/* 验证统计 */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold text-gray-400 mb-3">结果验证统计</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-black/20 rounded-md p-3 text-center">
            <div className="text-xl font-mono font-semibold text-green-400">{economy.verifiedOutcomes}</div>
            <div className="text-[10px] text-gray-500 mt-1">已验证</div>
          </div>
          <div className="bg-black/20 rounded-md p-3 text-center">
            <div className="text-xl font-mono font-semibold text-red-400">{economy.rejectedOutcomes}</div>
            <div className="text-[10px] text-gray-500 mt-1">已拒绝</div>
          </div>
          <div className="bg-black/20 rounded-md p-3 text-center">
            <div className="text-xl font-mono font-semibold text-blue-400">{verifiedRate}%</div>
            <div className="text-[10px] text-gray-500 mt-1">通过率</div>
          </div>
        </div>

        {/* 可视化比例条 */}
        {totalOutcomes > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/10">
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${verifiedRate}%` }}
                aria-hidden="true"
              />
              <div
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${100 - verifiedRate}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
              <span>已验证 {economy.verifiedOutcomes}</span>
              <span>已拒绝 {economy.rejectedOutcomes}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
