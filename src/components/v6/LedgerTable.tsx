// ============================================================================
// 治理账本数据表组件（中文版）
// ============================================================================

import type { GovernanceLedgers, EvidenceEntry, ValueEntry, DebtEntry, CaseLawEntry, LocalLedgerEntry, TemporalEntry } from '@/types/v6'

// BUG-11 fix: safe date formatting for corrupted timestamps
function safeDate(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleString()
}
function safeDateShort(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleDateString()
}

interface LedgerTableProps {
  ledgers: GovernanceLedgers
  selectedType: keyof GovernanceLedgers
  onTypeChange: (type: keyof GovernanceLedgers) => void
}

const LEDGER_TABS: { key: keyof GovernanceLedgers; label: string; icon: string }[] = [
  { key: 'evidence', label: '证据', icon: '📋' },
  { key: 'value', label: '价值', icon: '💎' },
  { key: 'debt', label: '债务', icon: '⚠️' },
  { key: 'temporal', label: '时效', icon: '⏱️' },
  { key: 'caseLaw', label: '判例', icon: '⚖️' },
  { key: 'localLedger', label: '本地账本', icon: '📊' },
]

const EMPTY_LABELS: Record<string, string> = {
  evidence: '证据账本', value: '价值账本', debt: '债务账本',
  temporal: '时效账本', caseLaw: '判例库', localLedger: '本地账本',
}

export function LedgerTable({ ledgers, selectedType, onTypeChange }: LedgerTableProps) {
  const entries = ledgers[selectedType]
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 bg-black/20 rounded-lg p-1">
        {LEDGER_TABS.map(tab => (
          <button key={tab.key} role="tab" aria-selected={selectedType === tab.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${selectedType === tab.key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`} onClick={() => onTypeChange(tab.key)}>
            <span>{tab.icon}</span><span>{tab.label}</span>
            <span className="text-[10px] text-gray-400 font-mono ml-1">{ledgers[tab.key].length}</span>
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">{EMPTY_LABELS[selectedType]}暂无数据</div>
        ) : (
          <div className="overflow-x-auto">
            {selectedType === 'evidence' && <EvidenceTable entries={entries as EvidenceEntry[]} />}
            {selectedType === 'value' && <ValueTable entries={entries as ValueEntry[]} />}
            {selectedType === 'debt' && <DebtTable entries={entries as DebtEntry[]} />}
            {selectedType === 'temporal' && <TemporalTable entries={entries as TemporalEntry[]} />}
            {selectedType === 'caseLaw' && <CaseLawTable entries={entries as CaseLawEntry[]} />}
            {selectedType === 'localLedger' && <LocalLedgerTable entries={entries as LocalLedgerEntry[]} />}
          </div>
        )}
      </div>
    </div>
  )
}

const GRADE_COLORS: Record<string, string> = { H1: 'text-green-400 bg-green-900/30', H2: 'text-blue-400 bg-blue-900/30', H3: 'text-amber-400 bg-amber-900/30', H4: 'text-red-400 bg-red-900/30' }
const IMPACT_COLORS: Record<string, string> = { low: 'text-gray-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400' }
const IMPACT_ZH: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '严重' }
const SEVERITY_ZH: Record<string, string> = { minor: '轻微', moderate: '中等', major: '重大', critical: '严重' }
const STATUS_ZH: Record<string, string> = { active: '生效中', expired: '已过期', 'pending-review': '待复核' }
const STATUS_COLORS: Record<string, string> = { active: 'text-green-400 bg-green-900/30', expired: 'text-red-400 bg-red-900/30', 'pending-review': 'text-amber-400 bg-amber-900/30' }
const VERIFIER_ZH: Record<string, string> = { 'ai1-expander': 'AI-1', 'ai2-auditor': 'AI-2', 'ai3-governor': 'AI-3', human: '人类' }
const CATEGORY_ZH: Record<string, string> = { 'deferred-task': '延后任务', 'local-optimization': '局部优化', 'strategic-debt': '战略债务', 'tech-debt': '技术债务', failure: '失败', 'circuit-break': '熔断', rollback: '回滚', dispute: '争议', resolution: '解决' }
const TX_TYPE_ZH: Record<string, string> = { 'sim-credit': '模拟积分', 'testnet-settle': '测试网结算', 'real-settle': '真实结算', 'market-trade': '市场交易' }

function EvidenceTable({ entries }: { entries: EvidenceEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">证据账本</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">等级</th><th className="px-3 py-2 font-medium">结论</th>
        <th className="px-3 py-2 font-medium">来源</th><th className="px-3 py-2 font-medium">验证者</th><th className="px-3 py-2 font-medium">时间</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${GRADE_COLORS[e.grade]}`}>{e.grade}</span></td>
          <td className="px-3 py-2 text-gray-300 max-w-[300px] truncate">{e.conclusion}</td>
          <td className="px-3 py-2 text-gray-500">{e.source}</td>
          <td className="px-3 py-2 text-gray-500">{VERIFIER_ZH[e.verifier] ?? e.verifier}</td>
          <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(e.timestamp)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function ValueTable({ entries }: { entries: ValueEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">价值账本</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">优先级</th><th className="px-3 py-2 font-medium">目标对齐</th>
        <th className="px-3 py-2 font-medium">预期收益</th><th className="px-3 py-2 font-medium">资源成本</th>
        <th className="px-3 py-2 font-medium">风险敞口</th><th className="px-3 py-2 font-medium">时间</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="px-3 py-2"><PriorityBar value={e.priority} /></td>
          <td className="px-3 py-2 text-gray-300 font-mono">{e.goalAlignment}%</td>
          <td className="px-3 py-2 text-green-400 font-mono">+{e.expectedRevenue}</td>
          <td className="px-3 py-2 text-red-400 font-mono">-{e.resourceCost}</td>
          <td className="px-3 py-2 text-amber-400 font-mono">{e.riskExposure}%</td>
          <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(e.timestamp)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function DebtTable({ entries }: { entries: DebtEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">债务账本</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">状态</th><th className="px-3 py-2 font-medium">类别</th>
        <th className="px-3 py-2 font-medium">描述</th><th className="px-3 py-2 font-medium">影响</th><th className="px-3 py-2 font-medium">复核日期</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${e.resolved ? 'opacity-50' : ''}`}>
          <td className="px-3 py-2">{e.resolved ? <span className="text-green-400">✓ 已解决</span> : <span className="text-amber-400">○ 待处理</span>}</td>
          <td className="px-3 py-2 text-gray-400">{CATEGORY_ZH[e.category] ?? e.category}</td>
          <td className="px-3 py-2 text-gray-300 max-w-[300px] truncate">{e.description}</td>
          <td className={`px-3 py-2 font-medium ${IMPACT_COLORS[e.impact]}`}>{IMPACT_ZH[e.impact] ?? e.impact}</td>
          <td className="px-3 py-2 text-gray-400 font-mono">{safeDateShort(e.reviewDate)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function TemporalTable({ entries }: { entries: TemporalEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">时效账本</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">状态</th><th className="px-3 py-2 font-medium">结论ID</th>
        <th className="px-3 py-2 font-medium">生效时间</th><th className="px-3 py-2 font-medium">失效时间</th><th className="px-3 py-2 font-medium">复核周期</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] ${STATUS_COLORS[e.status]}`}>{STATUS_ZH[e.status] ?? e.status}</span></td>
          <td className="px-3 py-2 text-gray-300 font-mono">{e.conclusionId.slice(0, 8)}</td>
          <td className="px-3 py-2 text-gray-500 font-mono">{safeDateShort(e.effectiveAt)}</td>
          <td className="px-3 py-2 text-gray-500 font-mono">{safeDateShort(e.expiresAt)}</td>
          <td className="px-3 py-2 text-gray-500">{e.reviewCycle}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function CaseLawTable({ entries }: { entries: CaseLawEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">判例库</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">严重度</th><th className="px-3 py-2 font-medium">类别</th>
        <th className="px-3 py-2 font-medium">标题</th><th className="px-3 py-2 font-medium">教训</th><th className="px-3 py-2 font-medium">时间</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className={`px-3 py-2 font-medium ${IMPACT_COLORS[e.severity]}`}>{SEVERITY_ZH[e.severity] ?? e.severity}</td>
          <td className="px-3 py-2 text-gray-400">{CATEGORY_ZH[e.category] ?? e.category}</td>
          <td className="px-3 py-2 text-gray-300 max-w-[250px] truncate">{e.title}</td>
          <td className="px-3 py-2 text-gray-500">{e.lessonsLearned.length} 条教训</td>
          <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(e.timestamp)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function LocalLedgerTable({ entries }: { entries: LocalLedgerEntry[] }) {
  return (
    <table className="w-full text-xs">
      <caption className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">本地账本</caption>
      <thead><tr className="border-b border-white/5 text-gray-500 text-left">
        <th className="px-3 py-2 font-medium">类型</th><th className="px-3 py-2 font-medium">金额</th>
        <th className="px-3 py-2 font-medium">币种</th><th className="px-3 py-2 font-medium">描述</th><th className="px-3 py-2 font-medium">时间</th>
      </tr></thead>
      <tbody>{entries.map(e => (
        <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
          <td className="px-3 py-2 text-gray-400">{TX_TYPE_ZH[e.type] ?? e.type}</td>
          <td className={`px-3 py-2 font-mono ${e.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{e.amount >= 0 ? '+' : ''}{e.amount}</td>
          <td className="px-3 py-2 text-gray-300 font-mono">{e.currency}</td>
          <td className="px-3 py-2 text-gray-500 max-w-[300px] truncate">{e.description}</td>
          <td className="px-3 py-2 text-gray-400 font-mono">{safeDate(e.timestamp)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function PriorityBar({ value }: { value: number }) {
  const color = value >= 70 ? '#22c55e' : value >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="优先级">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-gray-400">{value}</span>
    </div>
  )
}
