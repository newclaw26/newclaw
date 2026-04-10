// ============================================================================
// 治理评分仪表盘 (Governance Scoring Dashboard)
//
// Displays the CEO+Audit governance scoring mechanism:
//   1. Current rotation status (CEO / Auditor / round progress)
//   2. Latest score card with six-dimension horizontal bars
//   3. Score history chart (last 10 rounds, pure CSS)
//   4. Running average with trend indicator
//   5. Term calculator (avg score -> term length)
//   6. Rotation countdown / early-rotation warning
//
// Uses mock data via createInitialRotation + sample scores.
// ============================================================================

import { useMemo } from 'react'
import type {
  GovernanceActorId,
  GovernanceDimensions,
  GovernanceScore,
  RotationState,
} from '@/types/v6'
import {
  createInitialRotation,
  createScore,
  recordRound,
  getAverageScore,
  getScoresForTarget,
  calculateTermLength,
  shouldRotate,
  DIMENSION_CEILINGS,
} from '@/lib/v6/governance-scoring'

// ---------------------------------------------------------------------------
// Actor display names (Chinese)
// ---------------------------------------------------------------------------

const ACTOR_LABELS: Record<GovernanceActorId, string> = {
  ai1: 'AI-1 (扩展者)',
  ai2: 'AI-2 (审计者)',
  ai3: 'AI-3 (治理者)',
}

const ACTOR_SHORT: Record<GovernanceActorId, string> = {
  ai1: 'AI-1',
  ai2: 'AI-2',
  ai3: 'AI-3',
}

// ---------------------------------------------------------------------------
// Dimension labels (Chinese)
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<keyof GovernanceDimensions, string> = {
  taskCompletion: '任务完成度',
  deliveryQuality: '交付质量',
  planValue: '规划价值',
  efficiency: '执行效率',
  strategicJudgment: '战略判断',
  riskControl: '风险控制',
}

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

function createMockRotationState(): RotationState {
  let state = createInitialRotation()

  const mockScores: Array<{ dims: GovernanceDimensions; notes: string }> = [
    { dims: { taskCompletion: 24, deliveryQuality: 23, planValue: 14, efficiency: 13, strategicJudgment: 9, riskControl: 9 }, notes: '首轮执行出色' },
    { dims: { taskCompletion: 25, deliveryQuality: 24, planValue: 15, efficiency: 14, strategicJudgment: 10, riskControl: 9 }, notes: '接近完美交付' },
    { dims: { taskCompletion: 23, deliveryQuality: 22, planValue: 13, efficiency: 12, strategicJudgment: 8, riskControl: 8 }, notes: '效率略有下降' },
    { dims: { taskCompletion: 25, deliveryQuality: 25, planValue: 14, efficiency: 15, strategicJudgment: 9, riskControl: 10 }, notes: '零缺陷交付' },
    { dims: { taskCompletion: 24, deliveryQuality: 24, planValue: 15, efficiency: 14, strategicJudgment: 10, riskControl: 8 }, notes: '战略判断优秀' },
    { dims: { taskCompletion: 22, deliveryQuality: 21, planValue: 12, efficiency: 11, strategicJudgment: 7, riskControl: 7 }, notes: '复杂任务降速' },
    { dims: { taskCompletion: 25, deliveryQuality: 24, planValue: 14, efficiency: 14, strategicJudgment: 9, riskControl: 9 }, notes: '恢复高水平' },
    { dims: { taskCompletion: 24, deliveryQuality: 25, planValue: 15, efficiency: 13, strategicJudgment: 10, riskControl: 10 }, notes: '最佳质量轮次' },
    { dims: { taskCompletion: 23, deliveryQuality: 23, planValue: 13, efficiency: 14, strategicJudgment: 8, riskControl: 9 }, notes: '稳定执行' },
    { dims: { taskCompletion: 25, deliveryQuality: 24, planValue: 14, efficiency: 15, strategicJudgment: 9, riskControl: 9 }, notes: '效率最优轮次' },
  ]

  for (let i = 0; i < mockScores.length; i++) {
    const score = createScore(
      state.currentAuditor,
      state.currentCEO,
      i + 1,
      mockScores[i].dims,
      mockScores[i].notes,
    )
    state = recordRound(state, score)
  }

  return state
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 90) return '#a78bfa' // purple
  if (score >= 70) return '#fbbf24' // amber
  return '#ef4444'                  // red
}

function scoreBgClass(score: number): string {
  if (score >= 90) return 'bg-purple-900/30 text-purple-400'
  if (score >= 70) return 'bg-amber-900/30 text-amber-400'
  return 'bg-red-900/30 text-red-400'
}

function scoreBorderClass(score: number): string {
  if (score >= 90) return 'border-purple-500/30'
  if (score >= 70) return 'border-amber-500/30'
  return 'border-red-500/30'
}

function dimensionBarColor(value: number, ceiling: number): string {
  const pct = (value / ceiling) * 100
  if (pct >= 90) return '#a78bfa'
  if (pct >= 70) return '#fbbf24'
  return '#ef4444'
}

function trendIndicator(current: number, previous: number): string {
  const diff = current - previous
  if (diff > 0.5) return '\u2191'  // up arrow
  if (diff < -0.5) return '\u2193' // down arrow
  return '\u2192'                  // right arrow (stable)
}

function trendColor(current: number, previous: number): string {
  const diff = current - previous
  if (diff > 0.5) return 'text-green-400'
  if (diff < -0.5) return 'text-red-400'
  return 'text-gray-400'
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GovernanceScoreCard() {
  const state = useMemo(() => createMockRotationState(), [])

  const ceoScores = useMemo(
    () => getScoresForTarget(state.scoreHistory, state.currentCEO),
    [state],
  )

  const latestScore = useMemo(
    () => state.scoreHistory.length > 0
      ? state.scoreHistory[state.scoreHistory.length - 1]
      : null,
    [state],
  )

  const avgScore = useMemo(
    () => getAverageScore(ceoScores),
    [ceoScores],
  )

  const avgLast5 = useMemo(
    () => getAverageScore(ceoScores, 5),
    [ceoScores],
  )

  const avgPrev5 = useMemo(() => {
    if (ceoScores.length <= 5) return avgLast5
    const prevSlice = ceoScores.slice(-10, -5)
    return prevSlice.length > 0 ? getAverageScore(prevSlice) : avgLast5
  }, [ceoScores, avgLast5])

  const termLength = useMemo(
    () => calculateTermLength(avgLast5),
    [avgLast5],
  )

  const rotationNeeded = useMemo(
    () => shouldRotate(state),
    [state],
  )

  const last10Scores = useMemo(
    () => state.scoreHistory.slice(-10),
    [state],
  )

  // Consecutive rounds below 70 for early-rotation warning
  const consecutiveLow = useMemo(() => {
    let count = 0
    for (let i = ceoScores.length - 1; i >= 0; i--) {
      if (ceoScores[i].total < 70) count++
      else break
    }
    return count
  }, [ceoScores])

  const roundsRemaining = state.maxRoundsInTerm - state.roundsInCurrentTerm

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-sm font-semibold text-white">
        治理评分仪表盘
      </h2>

      {/* Section 1: Current Rotation Status */}
      <RotationStatusCard
        state={state}
        rotationNeeded={rotationNeeded}
      />

      {/* Section 2: Latest Score Card */}
      {latestScore && (
        <LatestScoreSection score={latestScore} />
      )}

      {/* Section 3: Score History Chart */}
      {last10Scores.length > 0 && (
        <ScoreHistoryChart scores={last10Scores} />
      )}

      {/* Bottom row: Average + Term Calculator + Countdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Section 4: Average Score */}
        <AverageScoreCard
          avg={avgScore}
          avgLast5={avgLast5}
          avgPrev5={avgPrev5}
          totalRounds={ceoScores.length}
        />

        {/* Section 5: Term Calculator */}
        <TermCalculatorCard
          avgScore={avgLast5}
          termLength={termLength}
        />

        {/* Section 6: Rotation Countdown */}
        <RotationCountdownCard
          roundsRemaining={roundsRemaining}
          consecutiveLow={consecutiveLow}
          rotationNeeded={rotationNeeded}
          maxRounds={state.maxRoundsInTerm}
          currentRound={state.roundsInCurrentTerm}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RotationStatusCard({
  state,
  rotationNeeded,
}: {
  state: RotationState
  rotationNeeded: boolean
}) {
  const thirdActor = (['ai1', 'ai2', 'ai3'] as GovernanceActorId[])
    .find(a => a !== state.currentCEO && a !== state.currentAuditor) ?? 'ai3'

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400">
          当前轮换状态
        </h3>
        {rotationNeeded ? (
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/30 text-red-400 font-medium">
            需要轮换
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-900/30 text-green-400 font-medium">
            正常运行
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <RoleCard
          role="CEO (执行长)"
          actor={state.currentCEO}
          accent="#a78bfa"
        />
        <RoleCard
          role="审计员"
          actor={state.currentAuditor}
          accent="#fbbf24"
        />
        <RoleCard
          role="观察者"
          actor={thirdActor}
          accent="#6b7280"
        />
      </div>

      {/* Round progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500">
            任期进度
          </span>
          <span className="text-[10px] font-mono text-gray-400">
            第 {state.roundsInCurrentTerm} / {state.maxRoundsInTerm} 轮
          </span>
        </div>
        <div
          className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={state.roundsInCurrentTerm}
          aria-valuemin={0}
          aria-valuemax={state.maxRoundsInTerm}
          aria-label="任期进度"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (state.roundsInCurrentTerm / state.maxRoundsInTerm) * 100)}%`,
              background: 'linear-gradient(to right, #a78bfa, #7c3aed)',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  role,
  actor,
  accent,
}: {
  role: string
  actor: GovernanceActorId
  accent: string
}) {
  return (
    <div
      className="rounded-md p-3 text-center"
      style={{ backgroundColor: accent + '10', border: `1px solid ${accent}30` }}
    >
      <div className="text-[10px] text-gray-500 mb-1">{role}</div>
      <div className="text-sm font-mono font-semibold" style={{ color: accent }}>
        {ACTOR_SHORT[actor]}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        {ACTOR_LABELS[actor]}
      </div>
    </div>
  )
}

function LatestScoreSection({ score }: { score: GovernanceScore }) {
  const dims = score.dimensions
  const dimKeys = Object.keys(DIMENSION_LABELS) as (keyof GovernanceDimensions)[]

  return (
    <div className={`rounded-lg border ${scoreBorderClass(score.total)} bg-white/5 p-4`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400">
          最新评分卡 (第{score.round}轮)
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">
            {ACTOR_SHORT[score.scorer]} {'\u2192'} {ACTOR_SHORT[score.target]}
          </span>
          <span
            className={`text-lg font-mono font-bold px-2 py-0.5 rounded ${scoreBgClass(score.total)}`}
          >
            {score.total}
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {dimKeys.map(key => {
          const value = dims[key]
          const ceiling = DIMENSION_CEILINGS[key]
          const pct = (value / ceiling) * 100
          const color = dimensionBarColor(value, ceiling)

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-400">
                  {DIMENSION_LABELS[key]}
                </span>
                <span className="text-[10px] font-mono text-gray-300">
                  {value}/{ceiling}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {score.notes && (
        <div className="mt-3 text-[10px] text-gray-500 italic">
          {score.notes}
        </div>
      )}
    </div>
  )
}

function ScoreHistoryChart({ scores }: { scores: GovernanceScore[] }) {
  const maxScore = 100
  const barMaxHeight = 120 // px

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-xs font-semibold text-gray-400 mb-4">
        评分历史 (最近{scores.length}轮)
      </h3>

      <div
        className="flex items-end justify-between gap-1.5"
        style={{ height: `${barMaxHeight + 24}px` }}
        role="img"
        aria-label={`评分历史图表，共${scores.length}轮`}
      >
        {scores.map((s, i) => {
          const heightPx = Math.max(4, (s.total / maxScore) * barMaxHeight)
          const color = scoreColor(s.total)

          return (
            <div
              key={`${s.round}-${i}`}
              className="flex flex-col items-center flex-1 min-w-0"
            >
              <span
                className="text-[9px] font-mono mb-1"
                style={{ color }}
              >
                {s.total}
              </span>
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${heightPx}px`,
                  backgroundColor: color,
                  minWidth: '16px',
                  opacity: 0.85,
                }}
                title={`第${s.round}轮: ${s.total}分 - ${s.notes}`}
              />
              <span className="text-[9px] text-gray-600 mt-1 font-mono">
                R{s.round}
              </span>
            </div>
          )
        })}
      </div>

      {/* Threshold lines legend */}
      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
        <span className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#a78bfa' }} />
          <span className="text-gray-500">{'\u2265'}90 优秀</span>
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#fbbf24' }} />
          <span className="text-gray-500">70-89 良好</span>
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-gray-500">&lt;70 预警</span>
        </span>
      </div>
    </div>
  )
}

function AverageScoreCard({
  avg,
  avgLast5,
  avgPrev5,
  totalRounds,
}: {
  avg: number
  avgLast5: number
  avgPrev5: number
  totalRounds: number
}) {
  const trend = trendIndicator(avgLast5, avgPrev5)
  const trendCls = trendColor(avgLast5, avgPrev5)

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-[10px] font-semibold text-gray-500 mb-2">
        运行均分
      </h3>
      <div className="flex items-baseline gap-2">
        <span
          className="text-2xl font-mono font-bold"
          style={{ color: scoreColor(avg) }}
        >
          {avg.toFixed(1)}
        </span>
        <span className={`text-lg ${trendCls}`}>
          {trend}
        </span>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        近5轮均分: {avgLast5.toFixed(1)}
      </div>
      <div className="text-[10px] text-gray-600">
        共 {totalRounds} 轮评分
      </div>
    </div>
  )
}

function TermCalculatorCard({
  avgScore,
  termLength,
}: {
  avgScore: number
  termLength: number
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-[10px] font-semibold text-gray-500 mb-2">
        任期计算
      </h3>
      <div className="text-2xl font-mono font-bold text-white">
        {termLength}
        <span className="text-xs text-gray-500 font-normal ml-1">轮</span>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        均分 {avgScore.toFixed(1)} {'\u2192'} base(10) + bonus({Math.max(0, Math.round((avgScore / 10 - 9) * 10))})
      </div>
      <div className="text-[10px] text-gray-600 mt-0.5">
        范围: 5-30轮
      </div>
    </div>
  )
}

function RotationCountdownCard({
  roundsRemaining,
  consecutiveLow,
  rotationNeeded,
  maxRounds,
  currentRound,
}: {
  roundsRemaining: number
  consecutiveLow: number
  rotationNeeded: boolean
  maxRounds: number
  currentRound: number
}) {
  if (rotationNeeded) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-4">
        <h3 className="text-[10px] font-semibold text-red-400 mb-2">
          轮换状态
        </h3>
        <div className="text-sm font-semibold text-red-400">
          需要立即轮换
        </div>
        <div className="text-[10px] text-red-400/70 mt-1">
          {currentRound >= maxRounds
            ? `任期已满 (${currentRound}/${maxRounds})`
            : `连续${consecutiveLow}轮低于70分`}
        </div>
      </div>
    )
  }

  if (consecutiveLow > 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4">
        <h3 className="text-[10px] font-semibold text-amber-400 mb-2">
          轮换倒计时
        </h3>
        <div className="text-2xl font-mono font-bold text-amber-400">
          {roundsRemaining}
          <span className="text-xs text-gray-500 font-normal ml-1">轮</span>
        </div>
        <div className="text-[10px] text-amber-400/70 mt-1">
          轮换条件: 连续3轮&lt;70 (当前{consecutiveLow}/3)
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h3 className="text-[10px] font-semibold text-gray-500 mb-2">
        轮换倒计时
      </h3>
      <div className="text-2xl font-mono font-bold text-purple-400">
        {roundsRemaining}
        <span className="text-xs text-gray-500 font-normal ml-1">轮</span>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        距离轮换还有 {roundsRemaining} 轮
      </div>
      <div className="text-[10px] text-gray-600 mt-0.5">
        轮换条件: 连续3轮&lt;70
      </div>
    </div>
  )
}
