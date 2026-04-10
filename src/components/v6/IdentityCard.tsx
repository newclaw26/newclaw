// ============================================================================
// 节点身份卡片 - 显示 DID / 公钥 / 创建时间 / 锁定状态
// ============================================================================

import { memo, useCallback, useState } from 'react'
import type { HostIdentity } from '@/types/v6'

interface IdentityCardProps {
  identity: HostIdentity
}

export const IdentityCard = memo<IdentityCardProps>(function IdentityCard({ identity }) {
  const [copied, setCopied] = useState<'nodeId' | 'publicKey' | null>(null)

  const handleCopy = useCallback((field: 'nodeId' | 'publicKey', value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {
      // 静默处理复制失败
    })
  }, [])

  const truncatedKey = identity.publicKey.length > 24
    ? `${identity.publicKey.slice(0, 12)}...${identity.publicKey.slice(-12)}`
    : identity.publicKey

  const formattedDate = (() => {
    const d = new Date(identity.createdAt)
    return isNaN(d.getTime()) ? '--' : d.toLocaleString('zh-CN')
  })()

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400">节点身份信息</h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${identity.isLocked ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`}
            aria-label={identity.isLocked ? '已锁定' : '未锁定'}
            title={identity.isLocked ? '已锁定' : '未锁定'}
          />
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            identity.isLocked
              ? 'bg-green-900/30 text-green-400'
              : 'bg-amber-900/30 text-amber-400'
          }`}>
            {identity.isLocked ? '已锁定' : '未锁定'}
          </span>
        </div>
      </div>

      {/* 节点 ID */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">节点 ID (DID)</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-gray-300 bg-black/30 rounded-md px-3 py-2 truncate select-all">
            {identity.nodeId}
          </code>
          <button
            className="flex-shrink-0 px-2 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-gray-200 text-xs transition-colors"
            onClick={() => handleCopy('nodeId', identity.nodeId)}
            aria-label="复制节点 ID"
            title="复制节点 ID"
          >
            {copied === 'nodeId' ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* 公钥 */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">公钥</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-gray-300 bg-black/30 rounded-md px-3 py-2 truncate">
            {truncatedKey}
          </code>
          <button
            className="flex-shrink-0 px-2 py-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-gray-200 text-xs transition-colors"
            onClick={() => handleCopy('publicKey', identity.publicKey)}
            aria-label="复制公钥"
            title="复制公钥"
          >
            {copied === 'publicKey' ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      {/* 创建时间 */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-500">创建时间</div>
        <div className="text-sm font-mono text-gray-300 bg-black/30 rounded-md px-3 py-2">
          {formattedDate}
        </div>
      </div>

      {/* 锁定状态详情 */}
      <div className="rounded-md bg-black/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{identity.isLocked ? '🔒' : '🔓'}</span>
          <span className="text-xs text-gray-400">
            {identity.isLocked
              ? '身份已锁定 — 密钥对已安全存储，无法修改'
              : '身份未锁定 — 密钥对尚未完成安全绑定'}
          </span>
        </div>
      </div>
    </div>
  )
})
