import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  StubProvider,
  OllamaProvider,
  OpenAIProvider,
  ProviderRegistry,
  TRINITY_PROMPTS,
  createDefaultRegistry,
  _resetStubCounter,
} from '@/lib/v6/llm-provider'

import type { LLMProvider, LLMResponse } from '@/lib/v6/llm-provider'

// ============================================================================
// 1. StubProvider
// ============================================================================

describe('StubProvider', () => {
  beforeEach(() => {
    _resetStubCounter()
  })

  it('is always available', async () => {
    const stub = new StubProvider()
    expect(await stub.isAvailable()).toBe(true)
  })

  it('returns role-aware markdown for ai1-expander system prompt', async () => {
    const stub = new StubProvider()
    const res = await stub.generate('build feature', TRINITY_PROMPTS['ai1-expander'])
    // Expander responses contain strategy/execution keywords
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(100)
  })

  it('returns role-aware markdown for ai2-auditor system prompt', async () => {
    const stub = new StubProvider()
    const res = await stub.generate('review code', TRINITY_PROMPTS['ai2-auditor'])
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(100)
  })

  it('returns role-aware markdown for ai3-governor system prompt', async () => {
    const stub = new StubProvider()
    const res = await stub.generate('approve budget', TRINITY_PROMPTS['ai3-governor'])
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(100)
  })

  it('defaults to governor when system prompt has no role keyword', async () => {
    const stub = new StubProvider()
    const res = await stub.generate('test', 'generic system prompt')
    // Defaults to governor — should contain governance keywords
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(50)
  })

  it('returns non-zero token counts based on prompt/content length', async () => {
    const stub = new StubProvider()
    const prompt = 'test prompt text'
    const res = await stub.generate(prompt, TRINITY_PROMPTS['ai1-expander'])
    expect(res.tokensUsed.input).toBe(prompt.length)
    expect(res.tokensUsed.output).toBeGreaterThan(0)
    expect(res.model).toBe('stub-demo-v1')
    expect(res.durationMs).toBeGreaterThan(0)
  })

  it('cycles through multiple variants per role', async () => {
    const stub = new StubProvider()
    const sys = TRINITY_PROMPTS['ai1-expander']
    const res1 = await stub.generate('task 1', sys)
    const res2 = await stub.generate('task 2', sys)
    // Variants are deterministic round-robin, so consecutive calls differ
    expect(res1.content).not.toBe(res2.content)
  })

  it('has name = stub (demo)', () => {
    const stub = new StubProvider()
    expect(stub.name).toBe('stub (demo)')
  })
})

// ============================================================================
// 2. TRINITY_PROMPTS
// ============================================================================

describe('TRINITY_PROMPTS', () => {
  it('has prompts for all 3 trinity roles', () => {
    expect(TRINITY_PROMPTS['ai1-expander']).toBeDefined()
    expect(TRINITY_PROMPTS['ai2-auditor']).toBeDefined()
    expect(TRINITY_PROMPTS['ai3-governor']).toBeDefined()
  })

  it('ai1-expander prompt mentions expander role', () => {
    expect(TRINITY_PROMPTS['ai1-expander']).toContain('扩张者')
  })

  it('ai2-auditor prompt mentions auditor role', () => {
    expect(TRINITY_PROMPTS['ai2-auditor']).toContain('审计者')
  })

  it('ai3-governor prompt mentions governor role', () => {
    expect(TRINITY_PROMPTS['ai3-governor']).toContain('治理者')
  })

  it('all prompts are non-empty strings', () => {
    for (const role of ['ai1-expander', 'ai2-auditor', 'ai3-governor'] as const) {
      expect(typeof TRINITY_PROMPTS[role]).toBe('string')
      expect(TRINITY_PROMPTS[role].length).toBeGreaterThan(10)
    }
  })
})

// ============================================================================
// 3. ProviderRegistry
// ============================================================================

describe('ProviderRegistry', () => {
  it('falls back to StubProvider when no providers are registered', async () => {
    const registry = new ProviderRegistry()
    const provider = await registry.getBestAvailable()
    expect(provider.name).toBe('stub (demo)')
  })

  it('falls back to StubProvider when all registered providers are unavailable', async () => {
    const registry = new ProviderRegistry()

    const unavailable: LLMProvider = {
      name: 'dead-provider',
      generate: async () => ({ content: '', tokensUsed: { input: 0, output: 0 }, model: '', durationMs: 0 }),
      isAvailable: async () => false,
    }

    registry.register(unavailable)
    const provider = await registry.getBestAvailable()
    expect(provider.name).toBe('stub (demo)')
  })

  it('returns the first available provider', async () => {
    const registry = new ProviderRegistry()

    const slow: LLMProvider = {
      name: 'slow',
      generate: async () => ({ content: '', tokensUsed: { input: 0, output: 0 }, model: '', durationMs: 0 }),
      isAvailable: async () => false,
    }

    const fast: LLMProvider = {
      name: 'fast',
      generate: async () => ({ content: 'fast response', tokensUsed: { input: 1, output: 1 }, model: 'fast-v1', durationMs: 10 }),
      isAvailable: async () => true,
    }

    registry.register(slow)
    registry.register(fast)

    const provider = await registry.getBestAvailable()
    expect(provider.name).toBe('fast')
  })

  it('respects registration order priority', async () => {
    const registry = new ProviderRegistry()

    const alpha: LLMProvider = {
      name: 'alpha',
      generate: async () => ({ content: '', tokensUsed: { input: 0, output: 0 }, model: '', durationMs: 0 }),
      isAvailable: async () => true,
    }

    const beta: LLMProvider = {
      name: 'beta',
      generate: async () => ({ content: '', tokensUsed: { input: 0, output: 0 }, model: '', durationMs: 0 }),
      isAvailable: async () => true,
    }

    registry.register(alpha)
    registry.register(beta)

    const provider = await registry.getBestAvailable()
    expect(provider.name).toBe('alpha') // first registered wins
  })

  it('listProviders returns registered names', () => {
    const registry = new ProviderRegistry()
    registry.register(new StubProvider())
    expect(registry.listProviders()).toEqual(['stub (demo)'])
  })
})

// ============================================================================
// 4. OllamaProvider (mocked fetch)
// ============================================================================

describe('OllamaProvider', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('isAvailable returns false when server is unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const ollama = new OllamaProvider()
    expect(await ollama.isAvailable()).toBe(false)
  })

  it('isAvailable returns true when server responds ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    const ollama = new OllamaProvider()
    expect(await ollama.isAvailable()).toBe(true)
  })

  it('isAvailable returns false when server responds with error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const ollama = new OllamaProvider()
    expect(await ollama.isAvailable()).toBe(false)
  })

  it('generate calls correct endpoint with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: 'test response from ollama',
        model: 'llama3',
        prompt_eval_count: 10,
        eval_count: 20,
        total_duration: 500_000_000, // 500ms in nanoseconds
      }),
    })
    globalThis.fetch = mockFetch

    const ollama = new OllamaProvider('http://localhost:11434', 'llama3')
    const res = await ollama.generate('hello', 'system', { temperature: 0.5 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:11434/api/generate')
    expect(opts.method).toBe('POST')

    const body = JSON.parse(opts.body)
    expect(body.model).toBe('llama3')
    expect(body.prompt).toBe('hello')
    expect(body.system).toBe('system')
    expect(body.options.temperature).toBe(0.5)

    expect(res.content).toBe('test response from ollama')
    expect(res.tokensUsed.input).toBe(10)
    expect(res.tokensUsed.output).toBe(20)
    expect(res.model).toBe('llama3')
    expect(res.durationMs).toBe(500)
  })

  it('generate throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    const ollama = new OllamaProvider()
    await expect(ollama.generate('test', 'sys')).rejects.toThrow('Ollama error: 503')
  })

  it('has name = ollama', () => {
    const ollama = new OllamaProvider()
    expect(ollama.name).toBe('ollama')
  })
})

// ============================================================================
// 5. OpenAIProvider (mocked fetch)
// ============================================================================

describe('OpenAIProvider', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('isAvailable returns true when API key is set', async () => {
    const provider = new OpenAIProvider(() => 'sk-test-key')
    expect(await provider.isAvailable()).toBe(true)
  })

  it('isAvailable returns false when API key is empty', async () => {
    const provider = new OpenAIProvider(() => '')
    expect(await provider.isAvailable()).toBe(false)
  })

  it('generate calls chat/completions with correct structure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'openai response' } }],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
        model: 'gpt-4o-mini',
      }),
    })
    globalThis.fetch = mockFetch

    const provider = new OpenAIProvider(() => 'sk-test', 'https://api.openai.com/v1', 'gpt-4o-mini')
    const res = await provider.generate('question', 'you are helpful', { maxTokens: 500 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')

    const body = JSON.parse(opts.body)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.messages).toEqual([
      { role: 'system', content: 'you are helpful' },
      { role: 'user', content: 'question' },
    ])
    expect(body.max_tokens).toBe(500)

    expect(opts.headers['Authorization']).toBe('Bearer sk-test')

    expect(res.content).toBe('openai response')
    expect(res.tokensUsed.input).toBe(15)
    expect(res.tokensUsed.output).toBe(25)
    expect(res.model).toBe('gpt-4o-mini')
    expect(res.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('generate throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    const provider = new OpenAIProvider(() => 'bad-key')
    await expect(provider.generate('test', 'sys')).rejects.toThrow('OpenAI error: 401')
  })

  it('has name = openai', () => {
    const provider = new OpenAIProvider(() => 'key')
    expect(provider.name).toBe('openai')
  })

  it('fetches API key at call time, not construction time', async () => {
    let currentKey = 'key-v1'
    const provider = new OpenAIProvider(() => currentKey)

    // Change the key after construction
    currentKey = 'key-v2'

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'response' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
        model: 'gpt-4o-mini',
      }),
    })
    globalThis.fetch = mockFetch

    await provider.generate('test', 'sys')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['Authorization']).toBe('Bearer key-v2')
  })
})

// ============================================================================
// 6. createDefaultRegistry
// ============================================================================

describe('createDefaultRegistry', () => {
  it('returns a ProviderRegistry instance', () => {
    const registry = createDefaultRegistry()
    expect(registry).toBeInstanceOf(ProviderRegistry)
  })

  it('contains ollama and stub providers', () => {
    const registry = createDefaultRegistry()
    const names = registry.listProviders()
    expect(names).toContain('ollama')
    expect(names).toContain('stub (demo)')
  })

  it('ollama is registered before stub (priority order)', () => {
    const registry = createDefaultRegistry()
    const names = registry.listProviders()
    expect(names.indexOf('ollama')).toBeLessThan(names.indexOf('stub (demo)'))
  })

  it('falls back to stub when ollama is unreachable', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const registry = createDefaultRegistry()
    const provider = await registry.getBestAvailable()
    expect(provider.name).toBe('stub (demo)')

    globalThis.fetch = originalFetch
  })

  it('returned registry can generate via fallback stub', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const registry = createDefaultRegistry()
    const provider = await registry.getBestAvailable()
    const res = await provider.generate('test prompt', TRINITY_PROMPTS['ai1-expander'])
    // Stub now returns realistic markdown with role-specific content
    expect(res.content).toContain('##')
    expect(res.content.length).toBeGreaterThan(100)
    expect(res.model).toBe('stub-demo-v1')

    globalThis.fetch = originalFetch
  })
})
