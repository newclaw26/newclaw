// ============================================================================
// Genesis Wizard - Onboarding Flow (5-Step)
//
// Full-screen overlay for first-time users. Guides through:
//   Step 1: Welcome + value proposition
//   Step 2: Auto-generate node identity (DID)
//   Step 3: Genesis economy reward (100 New.B)
//   Step 4: First Trinity pipeline task
//   Step 5: Completion summary
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { useV6Store } from '@/stores/v6'
import { generateIdentity } from '@/lib/v6/identity'
import { seedIdentityCache } from '@/lib/v6/adapter'
import {
  createEconomyState,
  saveEconomyState,
  getOrCreateEconomyState,
  issueReward,
  saveEconomyState as persistEconomy,
} from '@/lib/v6/economy'
import { createDefaultRegistry } from '@/lib/v6/llm-provider'
import { runFullTrinityPipeline } from '@/lib/v6/trinity-orchestrator'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 1 | 2 | 3 | 4 | 5

interface PipelinePhase {
  key: string
  label: string
  status: 'pending' | 'active' | 'done'
}

// ---------------------------------------------------------------------------
// Step Indicator Dots
// ---------------------------------------------------------------------------

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4" role="group" aria-label="向导进度">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isCurrent = step === current
        const isDone = step < current
        return (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isCurrent
                ? 'bg-purple-500 w-3 h-3'
                : isDone
                  ? 'bg-purple-400/60'
                  : 'bg-white/10'
            }`}
            aria-label={`步骤 ${step}${isCurrent ? ' (当前)' : isDone ? ' (已完成)' : ''}`}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="text-6xl" aria-hidden="true">&#128009;</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          欢迎来到 NewClaw
        </h1>
        <p className="text-lg text-gray-400">
          第一个让 AI 代理拥有身份、经济和治理的框架
        </p>
      </div>
      <button
        onClick={onNext}
        className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        开始创世
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Identity Generation
// ---------------------------------------------------------------------------

function StepIdentity({
  onNext,
}: {
  onNext: () => void
}) {
  const [generating, setGenerating] = useState(true)
  const [identity, setLocalIdentity] = useState<{
    nodeId: string
    publicKey: string
    address: string
  } | null>(null)
  const didGenerate = useRef(false)

  useEffect(() => {
    if (didGenerate.current) return
    didGenerate.current = true

    const timer = setTimeout(() => {
      const id = generateIdentity()
      // Seed the adapter cache so loadIdentity() returns this same identity
      seedIdentityCache(id)
      // Write to store
      useV6Store.setState({ identity: id })
      setLocalIdentity({
        nodeId: id.nodeId,
        publicKey: id.publicKey,
        address: id.address,
      })
      setGenerating(false)
    }, 1200)

    return () => clearTimeout(timer)
  }, [])

  const truncateKey = (key: string) => {
    if (key.length <= 24) return key
    return key.slice(0, 16) + '...' + key.slice(-8)
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      {generating ? (
        <>
          <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-lg text-gray-300">正在生成节点身份...</p>
        </>
      ) : identity ? (
        <>
          <div className="text-4xl" aria-hidden="true">&#128273;</div>
          <h2 className="text-2xl font-bold text-white">节点身份已生成</h2>
          <div className="w-full rounded-xl bg-white/5 border border-white/10 p-5 text-left space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">节点 DID</div>
              <div className="font-mono text-sm text-emerald-400 break-all">{identity.nodeId}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">公钥</div>
              <div className="font-mono text-sm text-gray-300">{truncateKey(identity.publicKey)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">地址</div>
              <div className="font-mono text-sm text-gray-300">{truncateKey(identity.address)}</div>
            </div>
          </div>
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950"
          >
            下一步
          </button>
        </>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Economy Genesis Reward
// ---------------------------------------------------------------------------

function StepEconomy({ onNext }: { onNext: () => void }) {
  const [displayBalance, setDisplayBalance] = useState(0)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    // Initialize the economy state with genesis reward
    const state = createEconomyState()
    saveEconomyState(state)

    // Count-up animation: 0 -> 100
    const duration = 1200
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayBalance(Math.round(eased * 100))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [])

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <h2 className="text-2xl font-bold text-white">创世奖励</h2>
      <div className="space-y-1">
        <div className="text-6xl font-mono font-bold text-amber-400">
          {displayBalance.toFixed(0)}
        </div>
        <div className="text-xl text-amber-400/70 font-semibold">New.B</div>
      </div>
      <p className="text-sm text-gray-400">
        Genesis Node 创世奖励 -- 完成任务可获取更多
      </p>
      <button
        onClick={onNext}
        className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        领取并继续
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: First Task (Trinity Pipeline)
// ---------------------------------------------------------------------------

const DEFAULT_TASK_TITLE = '我的第一个 Trinity 任务：分析 NewClaw 的核心优势'

const PIPELINE_PHASES: PipelinePhase[] = [
  { key: 'proposal', label: '提案', status: 'pending' },
  { key: 'audit', label: '审计', status: 'pending' },
  { key: 'approval', label: '审批', status: 'pending' },
  { key: 'complete', label: '完成', status: 'pending' },
]

function StepFirstTask({ onNext }: { onNext: () => void }) {
  const [taskTitle, setTaskTitle] = useState(DEFAULT_TASK_TITLE)
  const [running, setRunning] = useState(false)
  const [phases, setPhases] = useState<PipelinePhase[]>(PIPELINE_PHASES)
  const [result, setResult] = useState<string | null>(null)
  const abortRef = useRef(false)

  const updatePhase = useCallback((key: string, status: PipelinePhase['status']) => {
    setPhases(prev =>
      prev.map(p => (p.key === key ? { ...p, status } : p)),
    )
  }, [])

  const handleRun = useCallback(async () => {
    if (running || !taskTitle.trim()) return
    setRunning(true)
    abortRef.current = false

    const store = useV6Store.getState()
    const task = store.createNewTask(taskTitle.trim(), taskTitle.trim())

    // Phase 1: Proposal
    updatePhase('proposal', 'active')

    try {
      const registry = createDefaultRegistry()
      const provider = await registry.getBestAvailable()

      const pipelineResult = await runFullTrinityPipeline(
        provider,
        taskTitle.trim(),
        taskTitle.trim(),
        {
          onPhaseComplete: (role, content) => {
            if (abortRef.current) return
            if (role === 'ai1-expander') {
              useV6Store.getState().submitProposal(task.id, content)
              updatePhase('proposal', 'done')
              updatePhase('audit', 'active')
            } else if (role === 'ai2-auditor') {
              useV6Store.getState().submitAudit(task.id, content, 'low')
              updatePhase('audit', 'done')
              updatePhase('approval', 'active')
            } else if (role === 'ai3-governor') {
              useV6Store.getState().submitApproval(task.id, true, 0)
              updatePhase('approval', 'done')
              updatePhase('complete', 'active')
            }
          },
        },
      )

      if (!abortRef.current) {
        useV6Store.getState().completeTask(task.id, pipelineResult.proposal, 'H3')
        useV6Store.getState().refreshMetrics()

        // Issue economy reward for the task
        const econ = getOrCreateEconomyState()
        const rewardResult = issueReward(econ, task.id)
        if (rewardResult.ok) {
          persistEconomy(rewardResult.value.state)
        }

        updatePhase('complete', 'done')
        setResult(pipelineResult.proposal)

        // Auto-advance after a brief pause
        setTimeout(() => {
          if (!abortRef.current) onNext()
        }, 1500)
      }
    } catch (err) {
      console.error('Onboarding pipeline failed:', err)
      if (!abortRef.current) {
        useV6Store.getState().failTaskById(task.id, String(err))
        // Still allow proceeding on error
        updatePhase('proposal', 'done')
        updatePhase('audit', 'done')
        updatePhase('approval', 'done')
        updatePhase('complete', 'done')
        setResult('任务执行出错，但你可以继续完成创世流程。')
        setTimeout(() => {
          if (!abortRef.current) onNext()
        }, 2000)
      }
    } finally {
      setRunning(false)
    }
  }, [running, taskTitle, onNext, updatePhase])

  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  return (
    <div className="flex flex-col items-center text-center space-y-5">
      <h2 className="text-2xl font-bold text-white">运行第一个任务</h2>
      <div className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-left space-y-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">任务描述</span>
          <input
            type="text"
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            disabled={running}
            className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
          />
        </label>
        {!running && !result && (
          <button
            onClick={handleRun}
            disabled={!taskTitle.trim()}
            className="w-full py-2.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            运行三核流水线
          </button>
        )}
      </div>

      {/* Pipeline progress */}
      {(running || result) && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between gap-1">
            {phases.map((phase, i) => (
              <div key={phase.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${
                      phase.status === 'done'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : phase.status === 'active'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 animate-pulse'
                          : 'bg-white/5 text-gray-600 border border-white/10'
                    }`}
                  >
                    {phase.status === 'done' ? '\u2713' : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 ${
                    phase.status === 'done'
                      ? 'text-emerald-400'
                      : phase.status === 'active'
                        ? 'text-purple-400'
                        : 'text-gray-600'
                  }`}>
                    {phase.label}
                  </span>
                </div>
                {i < phases.length - 1 && (
                  <div
                    className={`h-px flex-1 mx-1 transition-colors duration-300 ${
                      phase.status === 'done' ? 'bg-emerald-500/40' : 'bg-white/10'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          {running && (
            <p className="text-xs text-gray-500 animate-pulse">流水线运行中...</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5: Completion
// ---------------------------------------------------------------------------

function StepComplete({ onFinish }: { onFinish: () => void }) {
  const identity = useV6Store(s => s.identity)
  const tasks = useV6Store(s => s.tasks)
  const lastTask = tasks.length > 0 ? tasks[tasks.length - 1] : null

  // Read actual balance from persisted economy state instead of hardcoding "100"
  const actualBalance = (() => {
    const econ = getOrCreateEconomyState()
    return econ.balance
  })()

  const truncate = (s: string, len: number) =>
    s.length <= len ? s : s.slice(0, len) + '...'

  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="text-5xl">&#127881;</div>
      <h2 className="text-2xl font-bold text-white">创世完成！</h2>
      <div className="w-full rounded-xl bg-white/5 border border-white/10 p-5 text-left space-y-3">
        {identity && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">节点 ID</div>
            <div className="font-mono text-xs text-emerald-400 break-all">
              {truncate(identity.nodeId, 48)}
            </div>
          </div>
        )}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">余额</div>
          <div className="font-mono text-lg text-amber-400">{actualBalance} New.B</div>
        </div>
        {lastTask && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">首个任务</div>
            <div className="text-xs text-gray-300">{lastTask.title}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              状态: {lastTask.status === 'completed' ? '已完成' : lastTask.status}
            </div>
          </div>
        )}
      </div>
      <button
        onClick={onFinish}
        className="w-full px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        进入控制台
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard Container
// ---------------------------------------------------------------------------

export default function GenesisWizard() {
  const step = useV6Store(s => s.onboardingStep) as WizardStep | 0
  const setStep = useV6Store(s => s.setOnboardingStep)
  const complete = useV6Store(s => s.completeOnboarding)

  // Initialize to step 1 on mount if at step 0
  useEffect(() => {
    if (step === 0) {
      setStep(1)
    }
  }, [step, setStep])

  const currentStep = (step === 0 ? 1 : step) as WizardStep

  const goNext = useCallback(() => {
    const next = Math.min(currentStep + 1, 5) as WizardStep
    setStep(next)
  }, [currentStep, setStep])

  const handleFinish = useCallback(() => {
    complete()
  }, [complete])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-label="创世向导"
    >
      <div className="w-full max-w-lg mx-4 flex flex-col">
        <div className="rounded-xl bg-white/5 border border-white/10 p-8">
          {currentStep === 1 && <StepWelcome onNext={goNext} />}
          {currentStep === 2 && <StepIdentity onNext={goNext} />}
          {currentStep === 3 && <StepEconomy onNext={goNext} />}
          {currentStep === 4 && <StepFirstTask onNext={goNext} />}
          {currentStep === 5 && <StepComplete onFinish={handleFinish} />}
        </div>
        <ProgressDots current={currentStep} total={5} />
      </div>
    </div>
  )
}
