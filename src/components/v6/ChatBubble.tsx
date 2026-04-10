// ============================================================================
// 聊天气泡 - 团队群聊消息组件（中文版）
// ============================================================================

import { memo, useState, useCallback } from 'react'
import type { TrinityRole } from '@/types/v6'

export interface ChatBubbleProps {
  role: TrinityRole | 'user' | 'system'
  displayName: string
  content: string
  timestamp: string
  outputType?: string
  tokenInfo?: { input: number; output: number; cached?: number }
  isThinking?: boolean
  onCopy?: () => void
  onQuote?: (content: string) => void
}

const ROLE_STYLE: Record<string, { icon: string; border: string; bg: string; name: string; align: 'left' | 'right' | 'center' }> = {
  'ai1-expander': { icon: '🎯', border: 'border-l-4 border-blue-500', bg: 'bg-blue-950/30', name: 'text-blue-400', align: 'left' },
  'ai2-auditor':  { icon: '🛡️', border: 'border-l-4 border-amber-500', bg: 'bg-amber-950/30', name: 'text-amber-400', align: 'left' },
  'ai3-governor': { icon: '⚖️', border: 'border-l-4 border-emerald-500', bg: 'bg-emerald-950/30', name: 'text-emerald-400', align: 'left' },
  'user':         { icon: '👤', border: 'border-r-4 border-purple-500', bg: 'bg-purple-950/30', name: 'text-purple-400', align: 'right' },
  'system':       { icon: '⚙️', border: '', bg: 'bg-white/[0.03]', name: 'text-gray-500', align: 'center' },
}

const OUTPUT_TYPE_LABELS: Record<string, string> = {
  'task-draft': '任务草案', 'playbook': '剧本', 'market-suggestion': '市场建议',
  'audit-opinion': '审计意见', 'risk-report': '风险报告', 'evidence-tag': '证据标注', 'counterfactual': '反事实分析',
  'task-charter': '任务授权', 'budget-batch': '预算批次', 'listing-confirm': '上架确认', 'outcome-submit': '结果提交',
}

function safeTime(s?: string): string {
  if (!s) return '--'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString()
}

/**
 * Lightweight markdown-to-HTML converter for chat content.
 * Handles headers, bold, inline code, and list items.
 * Output is used with dangerouslySetInnerHTML only after the
 * existing sanitizeLLMOutput has already cleaned the input.
 */
function renderMarkdown(text: string): string {
  // Sanitize: strip any raw HTML tags that might remain
  let html = text.replace(/<[^>]*>/g, '')
  // Headers (process ### before ## to avoid double-matching)
  html = html.replace(/^### (.+)$/gm, '<h4 class="text-xs font-semibold text-gray-300 mt-2 mb-1">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="text-sm font-semibold text-gray-200 mt-3 mb-1">$1</h3>')
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-200">$1</strong>')
  // Inline code
  html = html.replace(/`(.+?)`/g, '<code class="bg-black/30 px-1 rounded text-xs">$1</code>')
  // List items
  html = html.replace(/^- (.+)$/gm, '<li class="text-xs text-gray-400 ml-3">$1</li>')
  // Table rows (basic: | col | col | -> skip, just leave as text)
  // Line breaks
  html = html.replace(/\n/g, '<br/>')
  return html
}

export const ChatBubble = memo(function ChatBubble({
  role,
  displayName,
  content,
  timestamp,
  outputType,
  tokenInfo,
  onCopy,
  onQuote,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)
  const style = ROLE_STYLE[role] ?? ROLE_STYLE['system']

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 1500)
    })
  }, [content, onCopy])

  const handleQuote = useCallback(() => {
    onQuote?.(content)
  }, [content, onQuote])

  // System messages: centered, compact
  if (role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className={`${style.bg} rounded-md px-4 py-1.5 max-w-md`}>
          <p className="text-[10px] text-gray-500 text-center">{content}</p>
        </div>
      </div>
    )
  }

  // User messages: right-aligned
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className={`${style.border} ${style.bg} rounded-lg max-w-[70%] min-w-[200px]`}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">{style.icon}</span>
              <span className={`text-xs font-semibold ${style.name}`}>{displayName}</span>
            </div>
          </div>
          {/* Content */}
          <div className="px-3 py-1.5">
            <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">{content}</p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/5">
            <span className="text-[10px] text-gray-500 font-mono">{safeTime(timestamp)}</span>
            <div className="flex items-center gap-1">
              <button onClick={handleCopy} className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors" aria-label="复制">
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // AI agent messages: left-aligned
  const typeLabel = outputType ? (OUTPUT_TYPE_LABELS[outputType] ?? outputType) : undefined

  return (
    <div className="flex justify-start mb-3">
      <div className={`${style.border} ${style.bg} rounded-lg max-w-[70%] min-w-[240px]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm">{style.icon}</span>
            <span className={`text-xs font-semibold ${style.name}`}>{displayName}</span>
          </div>
          {typeLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
              {typeLabel}
            </span>
          )}
        </div>
        {/* Content — rendered as lightweight markdown */}
        <div className="px-3 py-1.5">
          <div
            className="text-sm text-gray-300 break-words [&>h3]:leading-snug [&>h4]:leading-snug [&>li]:list-disc"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-white/5">
          <span className="text-[10px] text-gray-500 font-mono">{safeTime(timestamp)}</span>
          {tokenInfo && (
            <span className="text-[10px] text-gray-500 font-mono">
              in:{tokenInfo.input} out:{tokenInfo.output}
              {tokenInfo.cached != null && ` cached:${tokenInfo.cached}`}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors" aria-label="复制">
              {copied ? '已复制' : '复制'}
            </button>
            <button onClick={handleQuote} className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors" aria-label="引用">
              引用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
