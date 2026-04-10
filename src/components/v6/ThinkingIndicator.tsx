// ============================================================================
// 思考指示器 - 雷达扫描风格加载动画（中文版）
// ============================================================================

import { memo } from 'react'
import type { TrinityRole } from '@/types/v6'

interface ThinkingIndicatorProps {
  role: TrinityRole
  label: string
}

const ROLE_COLOR: Record<TrinityRole, { gradient: string; text: string; glow: string }> = {
  'ai1-expander': {
    gradient: 'conic-gradient(from 0deg, transparent 0deg, rgba(59, 130, 246, 0.6) 60deg, transparent 120deg)',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]',
  },
  'ai2-auditor': {
    gradient: 'conic-gradient(from 0deg, transparent 0deg, rgba(245, 158, 11, 0.6) 60deg, transparent 120deg)',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  },
  'ai3-governor': {
    gradient: 'conic-gradient(from 0deg, transparent 0deg, rgba(16, 185, 129, 0.6) 60deg, transparent 120deg)',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  },
}

export const ThinkingIndicator = memo(function ThinkingIndicator({ role, label }: ThinkingIndicatorProps) {
  const color = ROLE_COLOR[role]

  return (
    <div className="flex items-center gap-3 py-2 px-3">
      {/* Radar sweep circle */}
      <div className={`relative w-10 h-10 rounded-full ${color.glow}`}>
        {/* Background ring */}
        <div className="absolute inset-0 rounded-full border border-white/10" />
        {/* Radar sweep */}
        <div
          className="absolute inset-0 rounded-full animate-[radar-sweep_2s_linear_infinite]"
          style={{ background: color.gradient }}
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full ${
            role === 'ai1-expander' ? 'bg-blue-400' :
            role === 'ai2-auditor' ? 'bg-amber-400' :
            'bg-emerald-400'
          }`} />
        </div>
      </div>
      {/* Label */}
      <span className={`text-xs ${color.text} animate-pulse`}>
        {label} 正在思考...
      </span>

      {/* Inject keyframes via inline style tag */}
      <style>{`
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
})
