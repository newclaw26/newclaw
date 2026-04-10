import { describe, it, expect, vi } from 'vitest'

import {
  buildPrompt,
  generateRoleResponse,
  runFullTrinityPipeline,
  createDefaultOrchestratorConfig,
  sanitizeLLMOutput,
} from '@/lib/v6/trinity-orchestrator'
// Types imported for reference — used implicitly by test assertions
// import type { RoleResponse, OrchestratorPipelineResult } from '@/lib/v6/trinity-orchestrator'
import { StubProvider, TRINITY_PROMPTS, _resetStubCounter } from '@/lib/v6/llm-provider'
import type { LLMProvider, LLMResponse } from '@/lib/v6/llm-provider'
import type { TrinityTask, TrinityRole } from '@/types/v6'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal TrinityTask for testing. */
function makeTask(overrides: Partial<TrinityTask> = {}): TrinityTask {
  return {
    id: 'task-001',
    title: '测试任务',
    description: '这是一个测试任务的描述',
    phase: 'proposal',
    priority: 5,
    createdBy: 'ai1-expander',
    assignedTo: ['ai1-expander'],
    status: 'draft',
    outputs: [],
    permissionLevel: 'L0',
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
    ...overrides,
  }
}

/** A spy-capable LLM provider that records every call. */
function createSpyProvider(
  response: Partial<LLMResponse> = {},
): LLMProvider & { calls: Array<{ prompt: string; system: string; opts: unknown }> } {
  const calls: Array<{ prompt: string; system: string; opts: unknown }> = []
  return {
    name: 'spy',
    calls,
    async generate(prompt, system, opts) {
      calls.push({ prompt, system, opts })
      return {
        content: response.content ?? `[spy] ${prompt.slice(0, 40)}`,
        tokensUsed: response.tokensUsed ?? { input: 10, output: 20 },
        model: response.model ?? 'spy-model',
        durationMs: response.durationMs ?? 42,
      }
    },
    async isAvailable() {
      return true
    },
  }
}

// ============================================================================
// 1. buildPrompt
// ============================================================================

describe('buildPrompt', () => {
  it('builds ai1-expander prompt with title and description', () => {
    const task = makeTask({ title: 'Alpha', description: 'Build feature X' })
    const prompt = buildPrompt('ai1-expander', task)
    expect(prompt).toContain('任务标题: Alpha')
    expect(prompt).toContain('任务描述: Build feature X')
    expect(prompt).toContain('请生成执行提案')
  })

  it('builds ai2-auditor prompt with proposal content from outputs', () => {
    const task = makeTask({
      outputs: [
        {
          id: 'out-1',
          role: 'ai1-expander',
          type: 'task-draft',
          content: '提案内容：扩展用户系统',
          metadata: {},
          timestamp: '2026-04-10T00:00:00.000Z',
          taskId: 'task-001',
        },
      ],
    })
    const prompt = buildPrompt('ai2-auditor', task)
    expect(prompt).toContain('任务: 测试任务')
    expect(prompt).toContain('提案内容: 提案内容：扩展用户系统')
    expect(prompt).toContain('请进行风险审计')
  })

  it('builds ai2-auditor prompt with empty proposal when no task-draft output', () => {
    const task = makeTask({ outputs: [] })
    const prompt = buildPrompt('ai2-auditor', task)
    expect(prompt).toContain('提案内容: ')
    expect(prompt).toContain('请进行风险审计')
  })

  it('builds ai3-governor prompt with audit opinion from outputs', () => {
    const task = makeTask({
      outputs: [
        {
          id: 'out-2',
          role: 'ai2-auditor',
          type: 'audit-opinion',
          content: '低风险，建议通过',
          metadata: {},
          timestamp: '2026-04-10T00:00:00.000Z',
          taskId: 'task-001',
        },
      ],
    })
    const prompt = buildPrompt('ai3-governor', task)
    expect(prompt).toContain('任务: 测试任务')
    expect(prompt).toContain('审计意见: 低风险，建议通过')
    expect(prompt).toContain('请做出批准/拒绝决定')
  })

  it('appends context when provided', () => {
    const task = makeTask()
    const prompt = buildPrompt('ai1-expander', task, '紧急任务')
    expect(prompt).toContain('附加上下文: 紧急任务')
  })

  it('omits context line when context is undefined', () => {
    const task = makeTask()
    const prompt = buildPrompt('ai1-expander', task)
    expect(prompt).not.toContain('附加上下文')
  })
})

// ============================================================================
// 2. generateRoleResponse
// ============================================================================

describe('generateRoleResponse', () => {
  it('calls the provider with correct system prompt for ai1-expander', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai1-expander', task)

    expect(spy.calls).toHaveLength(1)
    expect(spy.calls[0].system).toBe(TRINITY_PROMPTS['ai1-expander'])
  })

  it('calls the provider with correct system prompt for ai2-auditor', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai2-auditor', task)

    expect(spy.calls[0].system).toBe(TRINITY_PROMPTS['ai2-auditor'])
  })

  it('calls the provider with correct system prompt for ai3-governor', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai3-governor', task)

    expect(spy.calls[0].system).toBe(TRINITY_PROMPTS['ai3-governor'])
  })

  it('uses temperature 0.3 for auditor, 0.7 for others', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai2-auditor', task)
    const auditorOpts = spy.calls[0].opts as { temperature: number }
    expect(auditorOpts.temperature).toBe(0.3)

    await generateRoleResponse(spy, 'ai1-expander', task)
    const expanderOpts = spy.calls[1].opts as { temperature: number }
    expect(expanderOpts.temperature).toBe(0.7)

    await generateRoleResponse(spy, 'ai3-governor', task)
    const governorOpts = spy.calls[2].opts as { temperature: number }
    expect(governorOpts.temperature).toBe(0.7)
  })

  it('sets maxTokens to 500 and timeout to 30000', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai1-expander', task)

    const opts = spy.calls[0].opts as { maxTokens: number; timeout: number }
    expect(opts.maxTokens).toBe(500)
    expect(opts.timeout).toBe(30_000)
  })

  it('returns content, tokensUsed, and durationMs from provider', async () => {
    const spy = createSpyProvider({
      content: '详细的执行提案',
      tokensUsed: { input: 50, output: 100 },
      durationMs: 250,
    })
    const task = makeTask()

    const result = await generateRoleResponse(spy, 'ai1-expander', task)

    expect(result.content).toBe('详细的执行提案')
    expect(result.tokensUsed).toEqual({ input: 50, output: 100 })
    expect(result.durationMs).toBe(250)
  })

  it('passes context to buildPrompt', async () => {
    const spy = createSpyProvider()
    const task = makeTask()

    await generateRoleResponse(spy, 'ai1-expander', task, '高优先级')

    expect(spy.calls[0].prompt).toContain('附加上下文: 高优先级')
  })

  it('propagates provider errors', async () => {
    const failProvider: LLMProvider = {
      name: 'fail',
      async generate() {
        throw new Error('LLM connection refused')
      },
      async isAvailable() {
        return false
      },
    }
    const task = makeTask()

    await expect(
      generateRoleResponse(failProvider, 'ai1-expander', task),
    ).rejects.toThrow('LLM connection refused')
  })
})

// ============================================================================
// 3. runFullTrinityPipeline (with StubProvider)
// ============================================================================

describe('runFullTrinityPipeline', () => {
  it('runs all three phases and returns proposal, audit, decision', async () => {
    _resetStubCounter()
    const stub = new StubProvider()
    const result = await runFullTrinityPipeline(stub, '构建支付模块', '实现支付网关集成')

    // Stub now returns realistic role-aware markdown
    expect(result.proposal).toContain('##')
    expect(result.audit).toContain('##')
    expect(result.decision).toContain('##')
    expect(result.proposal.length).toBeGreaterThan(50)
    expect(result.audit.length).toBeGreaterThan(50)
    expect(result.decision.length).toBeGreaterThan(50)
  })

  it('accumulates total tokens across phases', async () => {
    const spy = createSpyProvider({
      tokensUsed: { input: 10, output: 20 },
    })
    const result = await runFullTrinityPipeline(spy, 'Task A', 'Desc A')

    // 3 phases x (10 + 20) = 30 input, 60 output
    expect(result.totalTokens.input).toBe(30)
    expect(result.totalTokens.output).toBe(60)
  })

  it('accumulates total duration across phases', async () => {
    const spy = createSpyProvider({ durationMs: 100 })
    const result = await runFullTrinityPipeline(spy, 'Task B', 'Desc B')

    expect(result.totalDurationMs).toBe(300) // 3 phases x 100ms
  })

  it('passes proposal output to auditor via task.outputs', async () => {
    const spy = createSpyProvider()
    await runFullTrinityPipeline(spy, 'Task C', 'Desc C')

    // The second call (auditor) should receive a prompt containing the proposal
    const auditorPrompt = spy.calls[1].prompt
    expect(auditorPrompt).toContain('提案内容:')
  })

  it('passes audit output to governor via task.outputs', async () => {
    const spy = createSpyProvider()
    await runFullTrinityPipeline(spy, 'Task D', 'Desc D')

    // The third call (governor) should receive a prompt containing the audit
    const governorPrompt = spy.calls[2].prompt
    expect(governorPrompt).toContain('审计意见:')
  })

  it('fires onPhaseStart for each phase in correct order', async () => {
    const stub = new StubProvider()
    const phases: TrinityRole[] = []

    await runFullTrinityPipeline(stub, 'Task E', 'Desc E', {
      onPhaseStart: (role) => phases.push(role),
    })

    expect(phases).toEqual(['ai1-expander', 'ai2-auditor', 'ai3-governor'])
  })

  it('fires onPhaseComplete for each phase with content and tokens', async () => {
    const spy = createSpyProvider({
      tokensUsed: { input: 5, output: 15 },
    })
    const completed: Array<{
      role: TrinityRole
      content: string
      tokens: { input: number; output: number }
    }> = []

    await runFullTrinityPipeline(spy, 'Task F', 'Desc F', {
      onPhaseComplete: (role, content, tokens) =>
        completed.push({ role, content, tokens }),
    })

    expect(completed).toHaveLength(3)
    expect(completed[0].role).toBe('ai1-expander')
    expect(completed[1].role).toBe('ai2-auditor')
    expect(completed[2].role).toBe('ai3-governor')
    expect(completed[0].tokens).toEqual({ input: 5, output: 15 })
    expect(completed[0].content).toBeTruthy()
  })

  it('uses correct system prompts for each phase', async () => {
    const spy = createSpyProvider()
    await runFullTrinityPipeline(spy, 'Task G', 'Desc G')

    expect(spy.calls[0].system).toBe(TRINITY_PROMPTS['ai1-expander'])
    expect(spy.calls[1].system).toBe(TRINITY_PROMPTS['ai2-auditor'])
    expect(spy.calls[2].system).toBe(TRINITY_PROMPTS['ai3-governor'])
  })

  it('propagates error from first phase', async () => {
    const failProvider: LLMProvider = {
      name: 'fail',
      async generate() {
        throw new Error('Phase 1 failure')
      },
      async isAvailable() {
        return false
      },
    }

    await expect(
      runFullTrinityPipeline(failProvider, 'Task H', 'Desc H'),
    ).rejects.toThrow('Phase 1 failure')
  })

  it('works without callbacks (optional parameter)', async () => {
    const stub = new StubProvider()
    // Should not throw
    const result = await runFullTrinityPipeline(stub, 'Task I', 'Desc I')
    expect(result.proposal).toBeDefined()
    expect(result.audit).toBeDefined()
    expect(result.decision).toBeDefined()
  })
})

// ============================================================================
// 3b. sanitizeLLMOutput
// ============================================================================

describe('sanitizeLLMOutput', () => {
  it('strips script tags and their content', () => {
    const dirty = 'Hello<script>alert("xss")</script>World'
    expect(sanitizeLLMOutput(dirty)).toBe('HelloWorld')
  })

  it('strips HTML tags but preserves inner text', () => {
    const dirty = '<b>bold</b> and <a href="http://evil.com">link</a>'
    expect(sanitizeLLMOutput(dirty)).toBe('bold and link')
  })

  it('handles multiline script tags', () => {
    const dirty = 'before<script type="text/javascript">\nconsole.log("bad")\n</script>after'
    expect(sanitizeLLMOutput(dirty)).toBe('beforeafter')
  })

  it('passes through clean text unchanged', () => {
    const clean = '这是正常的中文内容，没有HTML标签'
    expect(sanitizeLLMOutput(clean)).toBe(clean)
  })

  it('trims whitespace', () => {
    expect(sanitizeLLMOutput('  hello  ')).toBe('hello')
  })

  it('strips nested tags', () => {
    const dirty = '<div><p>内容</p></div>'
    expect(sanitizeLLMOutput(dirty)).toBe('内容')
  })
})

describe('generateRoleResponse sanitizes LLM output', () => {
  it('removes HTML from provider response before returning', async () => {
    const htmlProvider: LLMProvider = {
      name: 'html-injector',
      async generate() {
        return {
          content: '正常文本<script>alert("xss")</script><b>加粗</b>',
          tokensUsed: { input: 10, output: 20 },
          model: 'test',
          durationMs: 1,
        }
      },
      async isAvailable() { return true },
    }
    const task = makeTask()
    const result = await generateRoleResponse(htmlProvider, 'ai1-expander', task)
    expect(result.content).toBe('正常文本加粗')
    expect(result.content).not.toContain('<script>')
    expect(result.content).not.toContain('<b>')
  })
})

// ============================================================================
// 4. createDefaultOrchestratorConfig
// ============================================================================

describe('createDefaultOrchestratorConfig', () => {
  it('returns config with StubProvider', () => {
    const config = createDefaultOrchestratorConfig()
    expect(config.provider.name).toBe('stub (demo)')
  })

  it('defaults autoRun to false', () => {
    const config = createDefaultOrchestratorConfig()
    expect(config.autoRun).toBe(false)
  })

  it('provider is functional and generates responses', async () => {
    _resetStubCounter()
    const config = createDefaultOrchestratorConfig()
    const res = await config.provider.generate('test', TRINITY_PROMPTS['ai1-expander'])
    // Stub now returns realistic role-aware markdown
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(50)
  })
})

// ============================================================================
// 5. Integration: StubProvider -> full pipeline -> content validation
// ============================================================================

describe('StubProvider integration', () => {
  it('full pipeline produces non-empty content for all phases', async () => {
    const stub = new StubProvider()
    const result = await runFullTrinityPipeline(
      stub,
      '市场调研项目',
      '调研目标市场并生成报告',
    )

    expect(result.proposal.length).toBeGreaterThan(0)
    expect(result.audit.length).toBeGreaterThan(0)
    expect(result.decision.length).toBeGreaterThan(0)
  })

  it('proposal prompt includes the task title', async () => {
    const spy = createSpyProvider()
    await runFullTrinityPipeline(spy, '数据分析', '分析用户行为数据')

    expect(spy.calls[0].prompt).toContain('数据分析')
    expect(spy.calls[0].prompt).toContain('分析用户行为数据')
  })

  it('full pipeline makes exactly 3 LLM calls', async () => {
    const spy = createSpyProvider()
    await runFullTrinityPipeline(spy, 'T', 'D')

    expect(spy.calls).toHaveLength(3)
  })
})
