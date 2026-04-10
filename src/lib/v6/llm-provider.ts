// ============================================================================
// LLM Provider Abstraction Layer — Backend-Agnostic AI Interface
// Enables Trinity pipeline to swap between Stub, Ollama, OpenAI, or any
// OpenAI-compatible backend without changing orchestration logic.
// ============================================================================

import type { TrinityRole } from '@/types/v6'

// ---------------------------------------------------------------------------
// Core Interfaces
// ---------------------------------------------------------------------------

/** Backend-agnostic LLM provider contract. */
export interface LLMProvider {
  /** Human-readable provider name (e.g. 'ollama', 'openai', 'stub'). */
  name: string
  /** Send a prompt + system prompt and receive a structured response. */
  generate(prompt: string, systemPrompt: string, options?: LLMOptions): Promise<LLMResponse>
  /** Return true if this provider is reachable / configured. */
  isAvailable(): Promise<boolean>
}

/** Generation options forwarded to the underlying model. */
export interface LLMOptions {
  /** Sampling temperature (0 = deterministic, 1 = creative). */
  temperature?: number
  /** Maximum tokens in the response. */
  maxTokens?: number
  /** Request timeout in milliseconds. */
  timeout?: number
}

/** Normalised response envelope returned by every provider. */
export interface LLMResponse {
  /** The model's text output. */
  content: string
  /** Token usage counters. */
  tokensUsed: { input: number; output: number }
  /** Model identifier as reported by the backend. */
  model: string
  /** Wall-clock duration of the generation call in milliseconds. */
  durationMs: number
}

// ---------------------------------------------------------------------------
// Trinity Role Prompts
// ---------------------------------------------------------------------------

/**
 * Role-specific system prompts for the three Trinity agents.
 * These define the personality, mandate, and output schema for each AI core.
 */
export const TRINITY_PROMPTS: Record<TrinityRole, string> = {
  'ai1-expander': [
    '你是 AI-1 扩张者。你的职责是发现机会、生成策略、产出可执行方案。',
    '输出格式：1) 机会分析 2) 策略建议 3) 执行步骤 4) 预期收益与风险',
  ].join('\n'),

  'ai2-auditor': [
    '你是 AI-2 审计者。你的职责是冷酷审核代码安全、财务风险，防止幻觉亏损。',
    '输出格式：1) 风险识别 2) 证据等级评估(H1-H4) 3) 审计意见 4) 通过/阻止建议',
  ].join('\n'),

  'ai3-governor': [
    '你是 AI-3 治理者。你的职责是最终决策、预算审批、信用管理。',
    '输出格式：1) 成本评估 2) 预算分配 3) 批准/拒绝决定 4) 理由',
  ].join('\n'),
}

// ---------------------------------------------------------------------------
// StubProvider — realistic role-aware demo responses
// ---------------------------------------------------------------------------

/** Pre-written response variants per Trinity role. */
const STUB_RESPONSES: Record<TrinityRole, string[]> = {
  'ai1-expander': [
    '## 执行方案\n\n### 1. 机会分析\n该任务具有高价值潜力，与当前阶段目标高度对齐。经初步评估，核心需求明确，技术路径可行。\n\n### 2. 策略建议\n建议采用渐进式实现路径，先完成核心功能验证，再扩展边缘场景。优先保证主流程的稳定性与可测试性。\n\n### 3. 执行步骤\n1) 环境准备与依赖检查\n2) 核心逻辑实现与接口定义\n3) 单元测试覆盖（目标 >80%）\n4) 集成验证与回归测试\n\n### 4. 预期收益\n- 预期完成时间: 2小时\n- 风险等级: 低\n- GoalFit 评分: 85/100',

    '## 策略提案\n\n经过分析，本任务的最优路径如下：\n\n**核心思路**: 利用现有模块的组合能力，避免重复造轮子，最大化复用率。\n\n**具体步骤**:\n1. 复用 Oracle 模块的评估逻辑作为基础框架\n2. 扩展 Market 模块支持新的交易类型\n3. 通过 PoO 验证确保结果可信且可追溯\n4. 部署到模拟环境进行压力测试\n\n**风险点**: 需要确保与权限矩阵的 L2 级别兼容，建议提前与审计者确认边界条件。\n\n**GoalFit**: 82/100',

    '## 扩张分析报告\n\n### 任务评估\n本次任务属于核心功能扩展类型，具有较高的战略价值。\n\n### 推荐方案\n采用模块化架构，将功能拆分为三个独立子模块：\n- **数据层**: 负责状态持久化与查询优化\n- **逻辑层**: 封装业务规则与验证流程\n- **接口层**: 对外暴露标准化 API\n\n### 执行时间线\n| 阶段 | 时间 | 交付物 |\n|------|------|--------|\n| 设计 | 30min | 架构文档 |\n| 实现 | 90min | 可运行代码 |\n| 验证 | 30min | 测试报告 |\n\n### 收益预测\n- GoalFit: 88/100\n- 复用率: 高\n- 技术债务: 无新增',

    '## 机会挖掘\n\n### 当前态势\n系统运行稳定，资源利用率处于健康区间。本次提案聚焦于功能增量而非重构。\n\n### 方案设计\n**路径一（推荐）**: 增量式开发\n- 在现有架构上扩展新能力\n- 改动范围小，风险可控\n- 预计 GoalFit: 90/100\n\n**路径二**: 重构式升级\n- 重新设计底层数据流\n- 改动范围大，收益长期\n- 预计 GoalFit: 75/100\n\n### 建议\n推荐路径一，理由：投入产出比最优，且与当前冲刺目标对齐。',

    '## 提案：功能实现规划\n\n### 目标对齐\n本任务直接服务于阶段性里程碑，优先级为 P1。\n\n### 技术路线\n1. **接口设计** — 定义输入输出契约，确保向后兼容\n2. **核心实现** — 采用策略模式，支持未来扩展\n3. **测试矩阵** — 覆盖正常流、异常流、边界条件\n4. **文档同步** — 更新 API 文档与集成指南\n\n### 风险矩阵\n| 风险项 | 概率 | 影响 | 缓解措施 |\n|--------|------|------|----------|\n| 接口变更 | 低 | 中 | 版本化管理 |\n| 性能退化 | 低 | 高 | 基准测试 |\n\n### 评估\n- GoalFit: 87/100\n- 建议立即启动',
  ],

  'ai2-auditor': [
    '## 审计报告\n\n### 风险识别\n- ✅ 代码逻辑: 无明显缺陷，控制流清晰\n- ✅ 安全边界: 权限调用在 L0-L1 范围内，未触及敏感区域\n- ⚠️ 边缘情况: 需要补充空输入与异常数据的防御处理\n\n### 证据等级评估\n本次评估基于 H3 级证据（单源专家审核），建议后续补充 H2 级交叉验证。\n\n### 审计意见\n方案整体可行，逻辑结构合理。建议补充边缘情况处理后执行。\n\n**结论: 通过（附条件）**',

    '## 风控审查\n\n### 1. 安全审计\n- 无越权操作风险，所有调用均在授权范围内\n- 数据流符合治理账本规范，无信息泄露路径\n- 无外部依赖注入风险\n\n### 2. 证据等级\n- H3: 基于代码静态分析\n- 建议补充 H2 级动态测试验证\n\n### 3. 风险评估\n- 财务风险: 低（模拟积分范围内，无真实资产暴露）\n- 技术风险: 低（改动范围有限，回滚成本低）\n- 合规风险: 无\n\n**结论: 审计通过，建议执行**',

    '## 安全与合规审查\n\n### 代码质量\n- 可读性: 良好，命名规范一致\n- 可维护性: 模块化程度足够\n- 测试覆盖: 需要补充边界用例\n\n### 风险清单\n| 编号 | 风险描述 | 等级 | 状态 |\n|------|----------|------|------|\n| R-01 | 空值未处理 | 低 | 需修复 |\n| R-02 | 并发竞态 | 无 | 通过 |\n| R-03 | 权限越界 | 无 | 通过 |\n\n### 证据等级: H3\n基于静态分析与逻辑推演，未发现阻断性问题。\n\n### 最终判定\n**通过** — 建议修复 R-01 后进入执行阶段。',

    '## 审计意见书\n\n### 审查范围\n本次审计覆盖提案的技术可行性、安全合规性及财务影响三个维度。\n\n### 技术评估\n- 架构设计合理，符合系统演进方向\n- 接口定义清晰，向后兼容性良好\n- 无引入新技术债务的风险\n\n### 安全评估\n- 权限模型: L0-L1，在安全边界内\n- 数据隔离: 满足要求\n- 攻击面: 未增加\n\n### 财务评估\n- 执行成本: 0 SIM（内部资源）\n- ROI 预期: 正向\n\n### 证据等级: H3\n\n**审计结论: 无条件通过**',

    '## 风险分析报告\n\n### 一、系统性风险\n未检测到系统性风险。本次变更属于局部优化，不影响核心架构稳定性。\n\n### 二、操作风险\n- 实施复杂度: 低\n- 回滚难度: 低（可在 5 分钟内完成回滚）\n- 依赖风险: 无新增外部依赖\n\n### 三、合规审查\n所有操作均在 L0 权限范围内，无需额外授权。\n\n### 四、证据链\n- 等级: H3（专家审核）\n- 完整性: 提案文档齐全\n- 可追溯性: 满足治理账本要求\n\n### 五、审计结论\n**✅ 通过** — 风险可控，建议按计划执行。',
  ],

  'ai3-governor': [
    '## 治理决定\n\n### 1. 成本评估\n- 预算消耗: 0 SIM（纯内部操作）\n- 资源占用: 低，不影响其他任务执行\n\n### 2. 预算分配\n本任务归类为 L0 自动执行级别，无需额外预算审批。\n\n### 3. 决定\n**✅ 批准执行**\n\n### 4. 理由\n- GoalFit 评分达标（85/100）\n- 审计已通过，无阻断性问题\n- 风险在可接受范围内\n- 与阶段目标高度对齐\n\n信用记录已更新，执行编号已分配。',

    '## 财务治理意见\n\n### 批准状态: ✅ 已批准\n\n**预算**: 0 SIM（内部任务，无外部成本）\n**权限等级**: L0（自动执行）\n**审计状态**: 已通过\n\n### 决策依据\n1. 提案质量评分合格\n2. 审计报告未发现阻断性问题\n3. 资源需求在授权范围内\n\n本任务满足执行标准，批准进入执行阶段。结果将由 Oracle 验证后记入信用账本。',

    '## 治理裁决\n\n### 综合评估\n| 维度 | 评分 | 状态 |\n|------|------|------|\n| 战略对齐 | 高 | ✅ |\n| 风险可控 | 是 | ✅ |\n| 预算合规 | 是 | ✅ |\n| 审计通过 | 是 | ✅ |\n\n### 裁决结果\n**✅ 批准执行**\n\n### 执行约束\n- 权限上限: L1\n- 预算上限: 0 SIM\n- 超时阈值: 标准\n\n### 后续跟踪\n执行完成后需提交 Oracle 验证，结果自动记入治理账本。',

    '## 最终治理决定\n\n### 审批流程\n1. ✅ 提案已收到（AI-1 扩张者）\n2. ✅ 审计已完成（AI-2 审计者）— 通过\n3. ✅ 治理审批（AI-3 治理者）— 本阶段\n\n### 成本分析\n- 直接成本: 0 SIM\n- 间接成本: 可忽略\n- 预算剩余: 充足\n\n### 决定\n**批准执行** — 全部条件已满足。\n\n### 信用影响\n成功完成后将为执行者增加正向信用记录。',

    '## 治理批复\n\n### 一、决策摘要\n经过三阶段审议（提案-审计-治理），本任务各项指标均满足执行标准。\n\n### 二、批准详情\n- **批准等级**: L0 自动执行\n- **预算影响**: 零额外支出\n- **有效期**: 当前冲刺周期内\n\n### 三、执行指令\n**✅ 批准** — 授权立即执行。\n\n### 四、监控要求\n- Oracle 验证: 必需\n- 治理账本记录: 自动\n- 异常上报阈值: 标准\n\n执行编号已生成，信用追踪已激活。',
  ],
}

/** Deterministic index counter for round-robin variant selection. */
let _stubCallIndex = 0

/**
 * Reset the stub call counter (exposed for tests).
 * @internal
 */
export function _resetStubCounter(): void {
  _stubCallIndex = 0
}

export class StubProvider implements LLMProvider {
  name = 'stub (demo)'

  async generate(prompt: string, systemPrompt: string): Promise<LLMResponse> {
    // Detect role from system prompt keywords
    const role: TrinityRole = systemPrompt.includes('扩张者')
      ? 'ai1-expander'
      : systemPrompt.includes('审计者')
        ? 'ai2-auditor'
        : 'ai3-governor'

    const variants = STUB_RESPONSES[role]
    const content = variants[_stubCallIndex++ % variants.length]

    // Simulate realistic latency (300-800ms)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))

    return {
      content,
      tokensUsed: { input: prompt.length, output: content.length },
      model: 'stub-demo-v1',
      durationMs: 300 + Math.random() * 500,
    }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }
}

// ---------------------------------------------------------------------------
// OllamaProvider — local inference via Ollama HTTP API
// ---------------------------------------------------------------------------

export class OllamaProvider implements LLMProvider {
  name = 'ollama'

  constructor(
    private baseUrl: string = 'http://localhost:11434',
    private model: string = 'llama3',
  ) {}

  async generate(prompt: string, systemPrompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const controller = new AbortController()
    const timeoutId = options?.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          system: systemPrompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            ...(options?.maxTokens ? { num_predict: options.maxTokens } : {}),
          },
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as {
        response: string
        model: string
        prompt_eval_count?: number
        eval_count?: number
        total_duration?: number
      }

      return {
        content: data.response,
        tokensUsed: {
          input: data.prompt_eval_count ?? 0,
          output: data.eval_count ?? 0,
        },
        model: data.model,
        durationMs: data.total_duration ? data.total_duration / 1e6 : 0,
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// OpenAIProvider — OpenAI Chat Completions API (also OpenRouter, Azure, etc.)
// ---------------------------------------------------------------------------

export class OpenAIProvider implements LLMProvider {
  name = 'openai'

  constructor(
    private getApiKey: () => string,
    private baseUrl: string = 'https://api.openai.com/v1',
    private model: string = 'gpt-4o-mini',
  ) {}

  async generate(prompt: string, systemPrompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const controller = new AbortController()
    const timeoutId = options?.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : undefined

    try {
      const start = Date.now()
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: options?.temperature ?? 0.7,
          ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>
        usage?: { prompt_tokens?: number; completion_tokens?: number }
        model: string
      }
      const elapsed = Date.now() - start

      return {
        content: data.choices[0].message.content,
        tokensUsed: {
          input: data.usage?.prompt_tokens ?? 0,
          output: data.usage?.completion_tokens ?? 0,
        },
        model: data.model,
        durationMs: elapsed,
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.getApiKey()
  }
}

// ---------------------------------------------------------------------------
// ProviderRegistry — ordered fallback chain
// ---------------------------------------------------------------------------

/**
 * Maintains an ordered list of LLM providers. The first available provider
 * in the chain is returned by `getBestAvailable()`. If nothing is reachable,
 * a StubProvider is returned as the final fallback.
 */
export class ProviderRegistry {
  private providers: LLMProvider[] = []

  /** Append a provider to the fallback chain. */
  register(provider: LLMProvider): void {
    this.providers.push(provider)
  }

  /** Return the first provider that reports itself as available. */
  async getBestAvailable(): Promise<LLMProvider> {
    for (const p of this.providers) {
      if (await p.isAvailable()) return p
    }
    return new StubProvider() // always fallback to stub
  }

  /** List all registered provider names (useful for diagnostics). */
  listProviders(): string[] {
    return this.providers.map(p => p.name)
  }
}

// ---------------------------------------------------------------------------
// Default Factory
// ---------------------------------------------------------------------------

/**
 * Create a registry pre-loaded with the standard fallback chain:
 *   Ollama (local) -> Stub (zero-cost simulation)
 *
 * OpenAI can be added at runtime when an API key is provided:
 *   registry.register(new OpenAIProvider(() => key))
 */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry()
  registry.register(new OllamaProvider())
  registry.register(new StubProvider())
  return registry
}
