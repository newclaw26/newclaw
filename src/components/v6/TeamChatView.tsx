// ============================================================================
// 团队群聊视图 - Trinity 三核对话界面（中文版）
// ============================================================================

import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useV6Store } from '@/stores/v6'
import { ChatBubble } from '@/components/v6/ChatBubble'
import { ThinkingIndicator } from '@/components/v6/ThinkingIndicator'
import { createDefaultRegistry } from '@/lib/v6/llm-provider'
import { runFullTrinityPipeline } from '@/lib/v6/trinity-orchestrator'
import type { TrinityOutput, TrinityRole } from '@/types/v6'

const ROLE_DISPLAY: Record<TrinityRole, string> = {
  'ai1-expander': 'AI-1 扩张者',
  'ai2-auditor': 'AI-2 审计者',
  'ai3-governor': 'AI-3 治理者',
}

export const TeamChatView = memo(function TeamChatView() {
  const tasks = useV6Store(s => s.tasks)
  const trinity = useV6Store(s => s.trinity)
  const createNewTask = useV6Store(s => s.createNewTask)
  const submitProposal = useV6Store(s => s.submitProposal)
  const submitAudit = useV6Store(s => s.submitAudit)
  const submitApproval = useV6Store(s => s.submitApproval)
  const completeTask = useV6Store(s => s.completeTask)
  const refreshMetrics = useV6Store(s => s.refreshMetrics)

  const [inputText, setInputText] = useState('')
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)

  // Signal any in-flight pipeline to stop on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  // Collect all outputs from all tasks, grouped by task, sorted by timestamp
  const chatItems = useMemo(() => {
    const items: Array<
      | { kind: 'divider'; taskId: string; taskTitle: string; taskIndex: number }
      | { kind: 'output'; output: TrinityOutput; taskTitle: string }
    > = []

    tasks.forEach((task, index) => {
      if (task.outputs.length === 0) return
      items.push({ kind: 'divider', taskId: task.id, taskTitle: task.title, taskIndex: index + 1 })
      // Sort outputs within task by timestamp
      const sorted = [...task.outputs].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      sorted.forEach(output => {
        items.push({ kind: 'output', output, taskTitle: task.title })
      })
    })

    return items
  }, [tasks])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatItems.length])

  // Detect thinking agents
  const thinkingAgents = useMemo(() => {
    const agents: { role: TrinityRole; label: string }[] = []
    if (trinity.ai1.status === 'thinking' || trinity.ai1.status === 'executing') {
      agents.push({ role: 'ai1-expander', label: ROLE_DISPLAY['ai1-expander'] })
    }
    if (trinity.ai2.status === 'thinking' || trinity.ai2.status === 'executing') {
      agents.push({ role: 'ai2-auditor', label: ROLE_DISPLAY['ai2-auditor'] })
    }
    if (trinity.ai3.status === 'thinking' || trinity.ai3.status === 'executing') {
      agents.push({ role: 'ai3-governor', label: ROLE_DISPLAY['ai3-governor'] })
    }
    return agents
  }, [trinity.ai1.status, trinity.ai2.status, trinity.ai3.status])

  const handleSend = useCallback(async () => {
    const title = inputText.trim()
    if (!title || pipelineRunning) return

    setPipelineRunning(true)
    abortRef.current = false
    const task = createNewTask(title, title)

    setInputText('')

    try {
      const registry = createDefaultRegistry()
      const provider = await registry.getBestAvailable()

      const result = await runFullTrinityPipeline(provider, title, title, {
        onPhaseComplete: (role, content) => {
          if (abortRef.current) return
          if (role === 'ai1-expander') {
            submitProposal(task.id, content)
          } else if (role === 'ai2-auditor') {
            submitAudit(task.id, content, 'low')
          } else if (role === 'ai3-governor') {
            submitApproval(task.id, true, 0)
          }
        },
      })

      if (!abortRef.current) {
        completeTask(task.id, result.proposal, 'H3')
        refreshMetrics()
      }
    } catch (error) {
      console.error('Trinity pipeline failed:', error)
      if (!abortRef.current) {
        useV6Store.getState().failTaskById(task.id, String(error))
      }
    } finally {
      setPipelineRunning(false)
    }
  }, [inputText, pipelineRunning, createNewTask, submitProposal, submitAudit, submitApproval, completeTask, refreshMetrics])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleQuote = useCallback((content: string) => {
    setInputText(prev => {
      const quote = `> ${content.slice(0, 60)}${content.length > 60 ? '...' : ''}\n`
      return prev ? `${prev}\n${quote}` : quote
    })
  }, [])

  const isEmpty = tasks.length === 0

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-4xl mb-4">💬</span>
            <h2 className="text-sm font-semibold text-gray-400 mb-2">团队群聊</h2>
            <p className="text-xs text-gray-500 max-w-xs">
              开始你的第一个 Trinity 任务，在下方输入任务标题
            </p>
          </div>
        ) : (
          <>
            {chatItems.map((item) => {
              if (item.kind === 'divider') {
                return (
                  <div key={`divider-${item.taskId}`} className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] text-gray-500 px-2 py-1 rounded bg-white/[0.03] font-mono">
                      任务 #{item.taskIndex} · {item.taskTitle}
                    </span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                )
              }

              const { output } = item
              return (
                <ChatBubble
                  key={output.id}
                  role={output.role}
                  displayName={ROLE_DISPLAY[output.role] ?? output.role}
                  content={output.content}
                  timestamp={output.timestamp}
                  outputType={output.type}
                  onQuote={handleQuote}
                />
              )
            })}
          </>
        )}

        {/* Thinking indicators */}
        {thinkingAgents.map(agent => (
          <ThinkingIndicator key={agent.role} role={agent.role} label={agent.label} />
        ))}
      </div>

      {/* Input bar */}
      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pipelineRunning ? '流水线运行中...' : '输入任务标题，按 Enter 发送...'}
            disabled={pipelineRunning}
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || pipelineRunning}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="发送"
          >
            {pipelineRunning ? '运行中' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
})
