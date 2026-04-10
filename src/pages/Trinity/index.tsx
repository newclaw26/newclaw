// ============================================================================
// Trinity 仪表盘 - V6 治理主界面（中文版）
//
// BROWSER SAFETY: All V6 code (this file, components/v6/*, lib/v6/*, stores/v6)
// is verified to NEVER access window.electron directly. The adapter.ts
// fetchSandboxStatus uses 'electron' in window (safe in-check, no dereference).
// The browser-mode crash from App.tsx line 145 (window.electron.ipcRenderer.on)
// is outside V6 scope and must be fixed in the host app separately.
// ============================================================================

import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react'
import { useV6Store, type V6Store } from '@/stores/v6'
import { TrinityPanel } from '@/components/v6/TrinityPanel'
import { LedgerTable } from '@/components/v6/LedgerTable'
import { FuseMatrix } from '@/components/v6/FuseMatrix'
import { PromotionPipeline } from '@/components/v6/PromotionPipeline'
import { IdentityCard } from '@/components/v6/IdentityCard'
import { EconomyDashboard } from '@/components/v6/EconomyDashboard'
import { TeamChatView } from '@/components/v6/TeamChatView'
import GenesisWizard from '@/components/onboarding/GenesisWizard'
import { createDefaultRegistry } from '@/lib/v6/llm-provider'
import { runFullTrinityPipeline } from '@/lib/v6/trinity-orchestrator'
import type { V6View, BackendConnectionStatus } from '@/types/v6'

const NAV_ITEMS: { view: V6View; label: string; icon: string }[] = [
  { view: 'team-chat', label: '团队群聊', icon: '💬' },
  { view: 'dashboard', label: '仪表盘', icon: '⚡' },
  { view: 'market', label: '知识市场', icon: '🏪' },
  { view: 'ledgers', label: '治理账本', icon: '📋' },
  { view: 'oracle', label: '结果预言机', icon: '🔮' },
  { view: 'permissions', label: '权限矩阵', icon: '🔒' },
  { view: 'node-status', label: '节点晋升', icon: '🌐' },
  { view: 'identity', label: '节点身份', icon: '🔑' },
  { view: 'economy', label: '经济系统', icon: '💰' },
]

const PHASE_LABELS: Record<string, string> = {
  proposal: '提案', audit: '审计', approval: '审批', execution: '执行', review: '复核', settled: '已结算',
}

const STATUS_LABELS: Record<string, string> = {
  draft: '草案', 'pending-audit': '待审计', 'pending-approval': '待审批', approved: '已批准',
  executing: '执行中', completed: '已完成', failed: '失败', blocked: '阻塞', cancelled: '已取消',
}

const VERDICT_LABELS: Record<string, string> = {
  settleable: '可结算', 'pending-review': '待复核', rejected: '已拒绝', expired: '已过期', disputed: '争议中',
}

// BUG-11 fix: safe date/time formatting utilities for corrupted timestamps
function safeTime(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString()
}
function safeDate(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleString()
}

export default function TrinityPage() {
  const onboardingComplete = useV6Store(s => s.onboardingComplete)

  if (!onboardingComplete) {
    return <GenesisWizard />
  }

  return <TrinityDashboard />
}

function TrinityDashboard() {
  const store = useV6Store()
  const initialize = useV6Store(s => s.initialize)
  const refreshMetrics = useV6Store(s => s.refreshMetrics)
  const loadIdentity = useV6Store(s => s.loadIdentity)
  const loadEconomy = useV6Store(s => s.loadEconomy)
  const checkBackend = useV6Store(s => s.checkBackend)
  const backendStatus = useV6Store(s => s.backendStatus)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const abortRef = useRef(false)

  useEffect(() => {
    initialize()
    refreshMetrics()
    loadIdentity()
    loadEconomy()
    checkBackend()
    return () => {
      // Signal any in-flight pipeline to stop feeding the store
      abortRef.current = true
    }
  }, [initialize, refreshMetrics, loadIdentity, loadEconomy, checkBackend])

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || pipelineRunning) return
    setPipelineRunning(true)
    abortRef.current = false
    const title = newTaskTitle.trim()
    const desc = newTaskDesc.trim() || title
    const s = useV6Store.getState()
    const task = s.createNewTask(title, desc)

    setNewTaskTitle('')
    setNewTaskDesc('')

    try {
      const registry = createDefaultRegistry()
      const provider = await registry.getBestAvailable()

      const result = await runFullTrinityPipeline(provider, title, desc, {
        onPhaseComplete: (role, content) => {
          if (abortRef.current) return
          if (role === 'ai1-expander') {
            useV6Store.getState().submitProposal(task.id, content)
          } else if (role === 'ai2-auditor') {
            useV6Store.getState().submitAudit(task.id, content, 'low')
          } else if (role === 'ai3-governor') {
            useV6Store.getState().submitApproval(task.id, true, 0)
          }
        },
      })

      if (!abortRef.current) {
        useV6Store.getState().completeTask(task.id, result.proposal, 'H3')
        useV6Store.getState().refreshMetrics()
      }
    } catch (error) {
      console.error('Trinity pipeline failed:', error)
      if (!abortRef.current) {
        useV6Store.getState().failTaskById(task.id, String(error))
      }
    } finally {
      setPipelineRunning(false)
    }
  }, [newTaskTitle, newTaskDesc, pipelineRunning])

  return (
    <div className="flex flex-col h-full bg-gray-950">
      <nav aria-label="V6 导航" className="flex items-center justify-between border-b border-white/5 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#128009;</span>
          <h1 className="text-sm font-semibold text-white">NewClaw V6</h1>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-400 font-mono">
            {store.nodeStatus.stageLabel}
          </span>
          <ConnectionStatusDot status={backendStatus} />
        </div>
        <div role="tablist" className="flex gap-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.view}
              role="tab"
              aria-selected={store.ui.activeView === item.view}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                store.ui.activeView === item.view
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
              onClick={() => store.setActiveView(item.view)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto p-4">
        {store.ui.activeView === 'team-chat' && <TeamChatView />}
        {store.ui.activeView === 'dashboard' && <DashboardView store={store} newTaskTitle={newTaskTitle} newTaskDesc={newTaskDesc} setNewTaskTitle={setNewTaskTitle} setNewTaskDesc={setNewTaskDesc} onCreateTask={handleCreateTask} pipelineRunning={pipelineRunning} />}
        {store.ui.activeView === 'market' && <MarketView store={store} />}
        {store.ui.activeView === 'ledgers' && <LedgersView store={store} />}
        {store.ui.activeView === 'oracle' && <OracleView store={store} />}
        {store.ui.activeView === 'permissions' && <PermissionsView store={store} />}
        {store.ui.activeView === 'node-status' && <NodeStatusView store={store} />}
        {store.ui.activeView === 'identity' && <IdentityView />}
        {store.ui.activeView === 'economy' && <EconomyView store={store} />}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 仪表盘视图
// ---------------------------------------------------------------------------

const DashboardView = memo(function DashboardView({ store, newTaskTitle, newTaskDesc, setNewTaskTitle, setNewTaskDesc, onCreateTask, pipelineRunning }: {
  store: V6Store; newTaskTitle: string; newTaskDesc: string
  setNewTaskTitle: (s: string) => void; setNewTaskDesc: (s: string) => void; onCreateTask: () => void; pipelineRunning: boolean
}) {
  const summary = useMemo(() => store.getLedgerSummary(), [store])
  const oracleStats = useMemo(() => store.getOracleStats(), [store])
  const completedCount = useMemo(() => store.tasks.filter(t => t.status === 'completed').length, [store])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-6 gap-2">
        <StatCard label="任务总数" value={store.tasks.length} />
        <StatCard label="已完成" value={completedCount} color="text-green-400" />
        <StatCard label="结果报告" value={oracleStats.total} />
        <StatCard label="已结算" value={oracleStats.settled} color="text-blue-400" />
        <StatCard label="证据条目" value={summary.evidenceCount} />
        <StatCard label="模拟余额" value={summary.simBalance} color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">三核引擎</h2>
          <TrinityPanel agent={store.trinity.ai1} tasks={store.tasks} expanded={store.ui.trinityExpanded['ai1-expander']} onToggle={() => store.toggleTrinityPanel('ai1-expander')} onAction={(taskId) => store.selectTask(taskId)} />
          <TrinityPanel agent={store.trinity.ai2} tasks={store.tasks} expanded={store.ui.trinityExpanded['ai2-auditor']} onToggle={() => store.toggleTrinityPanel('ai2-auditor')} onAction={(taskId) => store.selectTask(taskId)} />
          <TrinityPanel agent={store.trinity.ai3} tasks={store.tasks} expanded={store.ui.trinityExpanded['ai3-governor']} onToggle={() => store.toggleTrinityPanel('ai3-governor')} onAction={(taskId) => store.selectTask(taskId)} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-xs font-semibold text-gray-400 mb-3">创建任务</h3>
            <input type="text" placeholder="任务标题..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 mb-2"
              onKeyDown={e => e.key === 'Enter' && onCreateTask()} />
            <textarea placeholder="描述（可选）..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none h-16 mb-2" />
            <button className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onCreateTask} disabled={!newTaskTitle.trim() || pipelineRunning}>
              {pipelineRunning ? '流水线运行中...' : '运行三核流水线'}
            </button>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">最近任务</h3>
            <div className="space-y-1">
              {store.tasks.slice(-8).reverse().map(task => (
                <div key={task.id} tabIndex={0} role="button" className="flex items-center justify-between bg-white/5 rounded-md px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => store.selectTask(task.id)} onKeyDown={e => e.key === 'Enter' && store.selectTask(task.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 truncate">{task.title}</div>
                    <div className="text-[10px] text-gray-400">{PHASE_LABELS[task.phase] ?? task.phase} · {safeTime(task.updatedAt)}</div>
                  </div>
                  <TaskStatusDot status={task.status} />
                </div>
              ))}
              {store.tasks.length === 0 && <div className="text-xs text-gray-400 text-center py-4">暂无任务</div>}
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">未解决债务</h3>
            <div className="text-2xl font-mono text-amber-400">{summary.openDebts}</div>
            <div className="text-[10px] text-gray-400 mt-1">共 {summary.totalDebts} 项</div>
          </div>
        </div>
      </div>

      {store.events.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">事件流</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {store.events.slice(-10).reverse().map((event) => (
              <div key={event.id} className="flex items-center gap-3 text-xs py-1.5 px-3 rounded bg-white/[0.02]">
                <span className="text-gray-400 font-mono w-16 flex-shrink-0">{safeTime(event.timestamp)}</span>
                <span className="text-gray-500">{event.source}</span>
                <span className="text-gray-400">{event.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// 治理账本视图
// ---------------------------------------------------------------------------

const LedgersView = memo(function LedgersView({ store }: { store: V6Store }) {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-sm font-semibold text-white mb-4">治理账本</h2>
      <LedgerTable ledgers={store.ledgers} selectedType={store.ui.selectedLedgerType ?? 'evidence'} onTypeChange={store.setLedgerType} />
    </div>
  )
})

// ---------------------------------------------------------------------------
// 结果预言机视图
// ---------------------------------------------------------------------------

const OracleView = memo(function OracleView({ store }: { store: V6Store }) {
  const stats = useMemo(() => store.getOracleStats(), [store])
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">结果预言机</h2>
      <div className="grid grid-cols-5 gap-2">
        <StatCard label="总计" value={stats.total} />
        <StatCard label="可结算" value={stats.settleable} color="text-green-400" />
        <StatCard label="已结算" value={stats.settled} color="text-blue-400" />
        <StatCard label="已拒绝" value={stats.rejected} color="text-red-400" />
        <StatCard label="待复核" value={stats.pending} color="text-amber-400" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
          <div className="text-lg font-mono text-gray-300">{stats.byTarget.local}</div>
          <div className="text-[10px] text-gray-500">本地信用</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
          <div className="text-lg font-mono text-blue-400">{stats.byTarget.testnet}</div>
          <div className="text-[10px] text-gray-500">测试网信用</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
          <div className="text-lg font-mono text-emerald-400">{stats.byTarget.mainnet}</div>
          <div className="text-[10px] text-gray-500">主网信用</div>
        </div>
      </div>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        {store.outcomes.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">暂无结果报告</div>
        ) : (
          <table className="w-full text-xs">
            <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">结果预言机报告</caption>
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-left">
                <th className="px-3 py-2 font-medium">裁定</th>
                <th className="px-3 py-2 font-medium">任务类型</th>
                <th className="px-3 py-2 font-medium">证据等级</th>
                <th className="px-3 py-2 font-medium">信用目标</th>
                <th className="px-3 py-2 font-medium">对账哈希</th>
                <th className="px-3 py-2 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {store.outcomes.map(o => (
                <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-3 py-2"><VerdictBadge verdict={o.oracleVerdict} /></td>
                  <td className="px-3 py-2 text-gray-300">{o.taskType}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono">{o.evidenceGrade}</td>
                  <td className="px-3 py-2 text-gray-400">{CREDIT_LABELS[o.creditTarget] ?? o.creditTarget}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{(o.reconciliationHash ?? '').slice(0, 12)}</td>
                  <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
})

const CREDIT_LABELS: Record<string, string> = { local: '本地', testnet: '测试网', mainnet: '主网', rejected: '已拒绝' }

// ---------------------------------------------------------------------------
// 权限矩阵视图
// ---------------------------------------------------------------------------

const PermissionsView = memo(function PermissionsView({ store }: { store: V6Store }) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">权限保险丝矩阵</h2>
      <FuseMatrix matrix={store.permissionMatrix} requests={store.permissionRequests}
        onApprove={(id) => store.approvePermission(id, 'human', '人工批准')}
        onDeny={(id) => store.denyPermission(id, 'human', '人工拒绝')} />
    </div>
  )
})

// ---------------------------------------------------------------------------
// 节点晋升视图
// ---------------------------------------------------------------------------

const NodeStatusView = memo(function NodeStatusView({ store }: { store: V6Store }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">节点晋升流水线</h2>
      <PromotionPipeline nodeStatus={store.nodeStatus} />
    </div>
  )
})

// ---------------------------------------------------------------------------
// 节点身份视图 -- wired to store.identity (safe access for concurrent merge)
// ---------------------------------------------------------------------------

const IdentityView = memo(function IdentityView() {
  const identity = useV6Store(s => s.identity)
  const loadIdentity = useV6Store(s => s.loadIdentity)
  const [loading, setLoading] = useState(!identity)

  useEffect(() => {
    if (!identity) {
      let cancelled = false
      loadIdentity().finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }
  }, [identity, loadIdentity])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">节点身份</h2>
      {loading ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center space-y-2">
          <div className="text-lg animate-spin inline-block">&#9881;</div>
          <div className="text-sm text-gray-400">正在加载节点身份...</div>
        </div>
      ) : identity ? (
        <IdentityCard identity={identity} />
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center space-y-2">
          <div className="text-lg">&#128273;</div>
          <div className="text-sm text-gray-400">节点身份加载失败</div>
          <div className="text-[10px] text-gray-500">请刷新页面重试</div>
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// 经济系统视图
// ---------------------------------------------------------------------------

const EconomyView = memo(function EconomyView({ store }: { store: V6Store }) {
  const economy = useV6Store(s => s.economy)
  const loadEconomy = useV6Store(s => s.loadEconomy)
  const marketSimBalance = useV6Store(s => s.market?.nodeBalance?.['node-local'] ?? 0)
  const [loading, setLoading] = useState(!economy)

  useEffect(() => {
    if (!economy) {
      let cancelled = false
      loadEconomy().finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }
  }, [economy, loadEconomy])

  // Fallback derivation from existing store data when economy slice is absent
  const oracleStats = useMemo(() => store.getOracleStats(), [store])
  const ledgerSummary = useMemo(() => store.getLedgerSummary(), [store])

  // Map EconomyStatus (v6 type) -> EconomyDashboard props
  const dashboardData = useMemo(() => {
    if (economy) {
      return {
        newBBalance: economy.newbBalance,
        simBalance: economy.simBalance,
        marketSimBalance,
        pooPriorityScore: economy.pooScore,
        halvingEpoch: economy.halvingEpoch,
        halvingProgress: economy.halvingProgress,
        verifiedOutcomes: economy.pooVerified,
        rejectedOutcomes: economy.pooRejected,
      }
    }
    // Fallback: derive from existing oracle / ledger stats
    return {
      newBBalance: 0,
      simBalance: ledgerSummary.simBalance,
      marketSimBalance,
      pooPriorityScore: Math.min(100, Math.round((oracleStats.settled / Math.max(1, oracleStats.total)) * 100)),
      halvingEpoch: 1,
      halvingProgress: Math.min(100, Math.round((oracleStats.total / 50) * 100)),
      verifiedOutcomes: oracleStats.settled,
      rejectedOutcomes: oracleStats.rejected,
    }
  }, [economy, oracleStats, ledgerSummary, marketSimBalance])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">经济系统</h2>
      {loading && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[10px] text-gray-400">
          正在加载经济数据...
        </div>
      )}
      <EconomyDashboard economy={dashboardData} />
    </div>
  )
})

// ---------------------------------------------------------------------------
// 知识市场视图
// ---------------------------------------------------------------------------

const MarketView = memo(function MarketView({ store }: { store: V6Store }) {
  const stats = useMemo(() => store.getMarketStats(), [store])
  const listings = useMemo(() => store.market.listings.filter(l => l.status === 'listed'), [store])
  const myOrders = store.market.orders

  const handleBuy = (listingId: string) => {
    const order = store.buyPlaybook(listingId)
    if (order) {
      store.executeMarketPlaybook(order.id, '剧本在模拟环境中执行成功')
      store.refreshMetrics()
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">知识市场</h2>
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="上架中" value={stats.listed} />
        <StatCard label="已售出" value={stats.sold} color="text-green-400" />
        <StatCard label="成交量" value={stats.totalVolume} color="text-cyan-400" />
        <StatCard label="账户余额" value={store.market.nodeBalance['node-local'] ?? 0} color="text-amber-400" />
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-400 mb-3">可购买的剧本</h3>
        <div className="grid gap-3">
          {listings.map(listing => (
            <div key={listing.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-200">{listing.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{listing.description}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-lg font-mono text-amber-400">{listing.price} <span className="text-xs text-gray-500">{listing.currency}</span></div>
                  <div className="text-[10px] text-gray-400">质量：{listing.quality}%</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">
                  {listing.tags.map(tag => (<span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">{tag}</span>))}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{listing.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400">卖方：{listing.seller}</span>
                  {listing.seller !== 'node-local' && (
                    <button className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors" onClick={() => handleBuy(listing.id)}>
                      购买并执行
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {listings.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">暂无上架剧本</div>}
        </div>
      </div>
      {myOrders.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 mb-3">订单历史</h3>
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-left">
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">价格</th>
                  <th className="px-3 py-2 font-medium">卖方</th>
                  <th className="px-3 py-2 font-medium">执行结果</th>
                  <th className="px-3 py-2 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.map(order => (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] ${order.status === 'completed' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>{STATUS_LABELS[order.status] ?? order.status}</span></td>
                    <td className="px-3 py-2 text-amber-400 font-mono">{order.price} {order.currency}</td>
                    <td className="px-3 py-2 text-gray-400">{order.seller}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{order.executionResult ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// 公共组件
// ---------------------------------------------------------------------------

const StatCard = memo(({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) => (
  <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
    <div className={`text-xl font-mono font-semibold ${color}`}>{value}</div>
    <div className="text-[10px] text-gray-500 mt-1">{label}</div>
  </div>
))
StatCard.displayName = 'StatCard'

const TaskStatusDot = memo(({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500', 'pending-audit': 'bg-amber-500', 'pending-approval': 'bg-purple-500',
    approved: 'bg-blue-500', executing: 'bg-cyan-500', completed: 'bg-green-500', failed: 'bg-red-500', blocked: 'bg-red-400',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-gray-500'}`} aria-label={STATUS_LABELS[status] ?? status} title={STATUS_LABELS[status] ?? status} />
})
TaskStatusDot.displayName = 'TaskStatusDot'

const VerdictBadge = memo(({ verdict }: { verdict: string }) => {
  const styles: Record<string, string> = {
    settleable: 'bg-green-900/30 text-green-400', 'pending-review': 'bg-amber-900/30 text-amber-400',
    rejected: 'bg-red-900/30 text-red-400', expired: 'bg-gray-800 text-gray-500', disputed: 'bg-purple-900/30 text-purple-400',
  }
  return <span className={`px-1.5 py-0.5 rounded text-[10px] ${styles[verdict] ?? 'bg-gray-800 text-gray-400'}`}>{VERDICT_LABELS[verdict] ?? verdict}</span>
})
VerdictBadge.displayName = 'VerdictBadge'

const CONNECTION_STATUS_CONFIG: Record<BackendConnectionStatus, { dot: string; label: string; bg: string; text: string }> = {
  connected:    { dot: 'bg-green-500',                    label: '已连接',  bg: 'bg-green-900/30', text: 'text-green-400' },
  connecting:   { dot: 'bg-amber-500 animate-pulse',      label: '连接中',  bg: 'bg-amber-900/30', text: 'text-amber-400' },
  error:        { dot: 'bg-red-500',                      label: '连接错误', bg: 'bg-red-900/30',   text: 'text-red-400' },
  disconnected: { dot: 'bg-gray-500',                     label: '未连接',  bg: 'bg-gray-800',     text: 'text-gray-400' },
}

const ConnectionStatusDot = memo(({ status }: { status: BackendConnectionStatus }) => {
  const cfg = CONNECTION_STATUS_CONFIG[status]
  return (
    <div className="flex items-center gap-1.5" title={cfg.label} aria-label={`连接状态: ${cfg.label}`}>
      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
    </div>
  )
})
ConnectionStatusDot.displayName = 'ConnectionStatusDot'
