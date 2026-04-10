// ============================================================================
// Trinity Orchestrator — Bridge between Trinity Engine and LLM Provider
// Replaces hardcoded string outputs with real LLM-generated responses.
// This is a NEW layer that sits on top of the existing engine.ts pipeline.
// ============================================================================

import type { LLMProvider } from './llm-provider'
import { TRINITY_PROMPTS, StubProvider } from './llm-provider'
import type { TrinityRole, TrinityTask } from '@/types/v6'

// ---------------------------------------------------------------------------
// LLM Output Sanitization
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags and script content from LLM output before store injection.
 * Prevents XSS if raw content is ever rendered in the UI.
 */
export function sanitizeLLMOutput(content: string): string {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface OrchestratorConfig {
  provider: LLMProvider
  /** If true, `runFullTrinityPipeline` runs all three phases sequentially. */
  autoRun: boolean
}

// ---------------------------------------------------------------------------
// Single-Phase Response
// ---------------------------------------------------------------------------

export interface RoleResponse {
  content: string
  tokensUsed: { input: number; output: number }
  durationMs: number
}

// ---------------------------------------------------------------------------
// Full Pipeline Result
// ---------------------------------------------------------------------------

export interface OrchestratorPipelineResult {
  proposal: string
  audit: string
  decision: string
  totalTokens: { input: number; output: number }
  totalDurationMs: number
}

// ---------------------------------------------------------------------------
// Prompt Builder (exported for testability)
// ---------------------------------------------------------------------------

export function buildPrompt(
  role: TrinityRole,
  task: TrinityTask,
  context?: string,
): string {
  const contextLine = context ? `\n附加上下文: ${context}` : ''

  switch (role) {
    case 'ai1-expander':
      return `任务标题: ${task.title}\n任务描述: ${task.description}${contextLine}\n\n请生成执行提案。`

    case 'ai2-auditor': {
      const proposal =
        task.outputs.find((o) => o.type === 'task-draft')?.content ?? ''
      return `任务: ${task.title}\n提案内容: ${proposal}${contextLine}\n\n请进行风险审计。`
    }

    case 'ai3-governor': {
      const audit =
        task.outputs.find((o) => o.type === 'audit-opinion')?.content ?? ''
      return `任务: ${task.title}\n审计意见: ${audit}${contextLine}\n\n请做出批准/拒绝决定。`
    }
  }
}

// ---------------------------------------------------------------------------
// Single Role Invocation
// ---------------------------------------------------------------------------

/**
 * Run a single Trinity phase through the LLM.
 *
 * Temperature is intentionally role-specific:
 *   - ai2-auditor uses 0.3 (conservative, factual)
 *   - ai1-expander and ai3-governor use 0.7 (creative, decisive)
 */
export async function generateRoleResponse(
  provider: LLMProvider,
  role: TrinityRole,
  task: TrinityTask,
  context?: string,
): Promise<RoleResponse> {
  const systemPrompt = TRINITY_PROMPTS[role]
  const userPrompt = buildPrompt(role, task, context)

  const response = await provider.generate(userPrompt, systemPrompt, {
    temperature: role === 'ai2-auditor' ? 0.3 : 0.7,
    maxTokens: 500,
    timeout: 30_000,
  })

  return {
    content: sanitizeLLMOutput(response.content),
    tokensUsed: response.tokensUsed,
    durationMs: response.durationMs,
  }
}

// ---------------------------------------------------------------------------
// Full Pipeline Orchestration
// ---------------------------------------------------------------------------

/**
 * Run the complete three-phase Trinity pipeline for a task:
 *   1. AI-1 Expander  -> proposal
 *   2. AI-2 Auditor   -> audit
 *   3. AI-3 Governor  -> decision
 *
 * Each phase receives the output of previous phases through the task's
 * `outputs` array. To enable this, we construct intermediate `TrinityTask`
 * snapshots with accumulated outputs.
 *
 * Optional `callbacks` let the UI observe progress in real time.
 */
export async function runFullTrinityPipeline(
  provider: LLMProvider,
  taskTitle: string,
  taskDescription: string,
  callbacks?: {
    onPhaseStart?: (role: TrinityRole) => void
    onPhaseComplete?: (
      role: TrinityRole,
      content: string,
      tokens: { input: number; output: number },
    ) => void
  },
): Promise<OrchestratorPipelineResult> {
  const totalTokens = { input: 0, output: 0 }
  let totalDurationMs = 0

  // Minimal task shell — just enough for prompt building.
  // The real TrinityTask in the store is managed separately.
  const task: TrinityTask = {
    id: '',
    title: taskTitle,
    description: taskDescription,
    phase: 'proposal',
    priority: 5,
    createdBy: 'ai1-expander',
    assignedTo: ['ai1-expander'],
    status: 'draft',
    outputs: [],
    permissionLevel: 'L0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Phase 1: Proposal (AI-1 Expander)
  callbacks?.onPhaseStart?.('ai1-expander')
  const proposalRes = await generateRoleResponse(provider, 'ai1-expander', task)
  totalTokens.input += proposalRes.tokensUsed.input
  totalTokens.output += proposalRes.tokensUsed.output
  totalDurationMs += proposalRes.durationMs
  callbacks?.onPhaseComplete?.(
    'ai1-expander',
    proposalRes.content,
    proposalRes.tokensUsed,
  )

  // Inject proposal output so the auditor can reference it
  task.outputs.push({
    id: 'orchestrator-proposal',
    role: 'ai1-expander',
    type: 'task-draft',
    content: proposalRes.content,
    metadata: {},
    timestamp: new Date().toISOString(),
    taskId: task.id,
  })

  // Phase 2: Audit (AI-2 Auditor)
  callbacks?.onPhaseStart?.('ai2-auditor')
  const auditRes = await generateRoleResponse(provider, 'ai2-auditor', task)
  totalTokens.input += auditRes.tokensUsed.input
  totalTokens.output += auditRes.tokensUsed.output
  totalDurationMs += auditRes.durationMs
  callbacks?.onPhaseComplete?.(
    'ai2-auditor',
    auditRes.content,
    auditRes.tokensUsed,
  )

  // Inject audit output so the governor can reference it
  task.outputs.push({
    id: 'orchestrator-audit',
    role: 'ai2-auditor',
    type: 'audit-opinion',
    content: auditRes.content,
    metadata: {},
    timestamp: new Date().toISOString(),
    taskId: task.id,
  })

  // Phase 3: Decision (AI-3 Governor)
  callbacks?.onPhaseStart?.('ai3-governor')
  const decisionRes = await generateRoleResponse(
    provider,
    'ai3-governor',
    task,
  )
  totalTokens.input += decisionRes.tokensUsed.input
  totalTokens.output += decisionRes.tokensUsed.output
  totalDurationMs += decisionRes.durationMs
  callbacks?.onPhaseComplete?.(
    'ai3-governor',
    decisionRes.content,
    decisionRes.tokensUsed,
  )

  return {
    proposal: sanitizeLLMOutput(proposalRes.content),
    audit: sanitizeLLMOutput(auditRes.content),
    decision: sanitizeLLMOutput(decisionRes.content),
    totalTokens,
    totalDurationMs,
  }
}

// ---------------------------------------------------------------------------
// Default Orchestrator Factory
// ---------------------------------------------------------------------------

/**
 * Create an orchestrator config with the StubProvider for
 * zero-latency development. Replace with a real provider
 * (via ProviderRegistry) when an LLM backend is available.
 */
export function createDefaultOrchestratorConfig(): OrchestratorConfig {
  return {
    provider: new StubProvider(),
    autoRun: false,
  }
}
