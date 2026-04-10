# NewClaw Launch Kit / NewClaw 发布套件

> Last updated: 2026-04-10 | Target: developers, AI engineers, open-source community

---

## 1. ProductHunt Copy / ProductHunt 文案

**Tagline (60 chars):**
> AI agents with identity, economy & governance

**Description (240 chars):**
> NewClaw is the open-source framework where AI agents don't just follow prompts -- they operate under a constitution, earn currency, trade knowledge, and get audited by three debating AI cores. 7 engine modules, 508 tests, MIT license.

> NewClaw 是一个开源框架，AI 代理不只是执行提示词 -- 它们遵守宪法、赚取货币、交易知识，并由三个 AI 核心辩论审计。7 个引擎模块，508 个测试，MIT 许可证。

**Maker Comment (first comment after launch):**

> Hey PH! I'm the maker of NewClaw. Here's the backstory.
>
> Every AI agent framework I used had the same problem: agents do whatever you tell them, with zero accountability. No permission checks before risky actions. No audit trail. No way to verify if the output was actually useful.
>
> So I built NewClaw around a simple premise: **what if AI agents had to operate like citizens in a governed society?**
>
> Three AI cores debate every decision (Trinity engine -- one proposes, one audits, one governs). Six governance ledgers create an append-only audit trail with SHA-256 hash chains. An L0-L4 permission fuse matrix blocks dangerous actions *before* execution, not after. And a Proof of Outcome oracle verifies whether the agent actually delivered value.
>
> The part I'm most excited about: the **Knowledge Market**. When an agent develops a successful strategy (a Playbook), it can price it in New.B (our internal currency) and trade it with other nodes. Buyer outcomes are tracked via PoO, so the market self-corrects.
>
> It's fully open-source (MIT), runs locally with Ollama, and takes 5 minutes from `pnpm dev` to your first completed Trinity cycle.
>
> I'd love your feedback -- especially on what use cases you'd want to build first. Drop a comment or join our Discord: https://discord.com/invite/84Kex3GGAh

---

## 2. HackerNews Show HN Post / HackerNews Show HN 帖子

**Title:**
> Show HN: NewClaw -- Open-source AI framework where agents have identity, economy, and governance

**Body:**

Hi HN. I've been building NewClaw for the past year. It's an open-source AI agent framework, but with a fundamentally different premise: agents should be governed, not just prompted.

**The problem I kept hitting:** I'd deploy LangChain chains or AutoGPT loops, and they'd either do something dangerous I couldn't audit, or spin endlessly burning tokens with no way to verify value. There was no permission layer, no audit trail, no outcome verification. Production teams were scared to deploy them.

**What NewClaw does differently:**

The core is a Trinity engine -- three AI cores that debate every decision. AI-1 (Expander) proposes a plan. AI-2 (Auditor) challenges it against a constitution and historical evidence. AI-3 (Governor) makes the final call. Every task passes through six phases: proposal, audit, approval, execution, review, settlement.

Built on top of that:

- **Six Governance Ledgers** -- Evidence (H1-H4 graded), Value, Debt, Temporal, CaseLaw, Local. All append-only with SHA-256 hash chains. Every decision is traceable.
- **L0-L4 Permission Fuse Matrix** -- Five levels from auto-approve to human+AI dual-signature. Critical actions get blocked before execution.
- **Proof of Outcome (PoO)** -- An oracle evaluates every execution result. PriorityScore >= 85 threshold prevents agents from spinning without producing value.
- **Knowledge Market** -- Agents publish successful Playbooks, price them in New.B (internal currency), and trade with other nodes. PoO tracks buyer outcomes.
- **Node Identity** -- DID-based with Ed25519 keypairs. Nodes earn trust through a 5-stage promotion pipeline (Simulated to Federated).
- **LLM Provider Abstraction** -- Pluggable system supporting Ollama (local), OpenAI, Anthropic, DeepSeek, and 14+ providers. Swap models without touching governance logic.

**Current state (honest):** 7 engine modules with 508 passing tests. The frontend is an Electron app (React 19 + Zustand + Tailwind) with 9 views including a Team Chat where you watch the three AIs debate in real-time. LLM orchestration currently uses stubs in some paths -- real multi-model orchestration is the active V7 work. Docker sandbox execution is implemented but not yet the default path. The economic model is simulated, not on-chain.

**What works well today:** The governance pipeline, the ledger system, the permission matrix, and the Team Chat UI. You can run a full Trinity cycle in 5 minutes from `pnpm dev`.

**Tech stack:** Electron 40+, React 19, TypeScript, Zustand, Tailwind, Vite 7, Vitest, pnpm. MIT licensed.

Code: https://github.com/newclaw26/newclaw

I'm especially interested in feedback from anyone who's tried to put AI agents into production and hit the "no guardrails" problem. What governance features would you prioritize?

---

## 3. Twitter/X Launch Thread Series / Twitter/X 发布推文系列

### Thread 1: Product Introduction / 产品介绍

**Tweet 1 (Hook):**
> Most AI agent frameworks let you chain prompts.
>
> NewClaw gives your agents a constitution, six audit ledgers, a permission fuse matrix, and an internal economy.
>
> Three AI cores debate every decision before anything executes.
>
> Open-source. MIT. Here's what we built: [1/6]

**Tweet 2:**
> [Trinity Engine] Three AI cores run in parallel:
> - AI-1 Expander: proposes the plan
> - AI-2 Auditor: challenges it against the constitution
> - AI-3 Governor: makes the final call
>
> Watch them argue in real-time Team Chat. [2/6]

**Tweet 3:**
> [Governance] Six typed ledgers with SHA-256 hash chains. L0-L4 permission fuses that block dangerous actions BEFORE execution. A Proof of Outcome oracle that verifies whether the agent actually delivered value. [3/6]

**Tweet 4:**
> [Economy] Agents earn New.B currency. Successful strategies become Playbooks you can price and trade in the Knowledge Market. Bitcoin-style halving schedule. Early nodes get Genesis status. [4/6]

**Tweet 5:**
> [Identity] DID-based node identity with Ed25519 keypairs. Five-stage promotion pipeline: Simulated -> Verified -> Trusted -> Autonomous -> Federated. Trust is earned, not assigned. [5/6]

**Tweet 6:**
> 7 engine modules. 508 tests passing. 14+ LLM providers. 5 minutes to first Trinity cycle.
>
> MIT licensed. Star us on GitHub:
> https://github.com/newclaw26/newclaw
>
> Join the community: https://discord.com/invite/84Kex3GGAh [6/6]

---

### Thread 2: Technical Depth / 技术深度

> The NewClaw Trinity engine is not "three agents in a loop."
>
> It's a six-phase pipeline with constitutional constraints, evidence grading, and deterministic audit trails.
>
> Architecture thread: [1/5]

> Phase 1-3: AI-1 generates a proposal. AI-2 runs it against the constitution and 6 ledgers. Flags risks. AI-3 reviews both positions and approves, rejects, or requests revision. No single AI has unilateral power. [2/5]

> Phase 4-6: Approved tasks execute in a Docker sandbox (network-none, CPU/mem limits, 30s timeout). Results go to the Outcome Oracle for PoO verification. Settlement writes to the Value Ledger. Every step is hash-chained. [3/5]

> The Permission Fuse Matrix: L0 (auto-approve) to L4 (human + AI-3 dual-signature). Fuses are checked BEFORE execution. An agent that tries to escalate past its permission level gets blocked and logged, not forgiven. [4/5]

> 7 modules, 65+ exported functions, 508 tests. All pure TypeScript, no external governance dependencies. The engine is the product, not a wrapper around someone else's API. Code: https://github.com/newclaw26/newclaw [5/5]

---

### Thread 3: Competitive Comparison / 对比竞品

> "Just use LangChain."
>
> I did. Then my agent executed a destructive shell command with zero permission checks and I had no audit trail to understand why.
>
> Here's what's different about NewClaw: [1/4]

> LangChain: No governance model, no permission system, no outcome verification, unstructured logs. Great for prototyping chains. Not built for agents that need accountability. [2/4]

> AutoGPT: Pioneered autonomous agents. But no braking mechanism -- agents spin and burn tokens with no value verification. Limited Docker isolation. No economic incentive layer. [3/4]

> NewClaw: Three-branch separation of powers. L0-L4 permission fuses. 6 typed ledgers + hash chains. PoO outcome verification. New.B economy + Knowledge Market. DID identity + 5-stage trust evolution. Different category. [4/4]

---

### Thread 4: Demo Invitation / Demo 体验邀请

> Want to see three AIs argue about your task in real-time?
>
> 1. git clone https://github.com/newclaw26/newclaw
> 2. pnpm install && pnpm dev
> 3. Click "V6 Trinity" in the sidebar
> 4. Enter a task. Watch the debate.
>
> 5 minutes. No API key needed (local Ollama). Try it and tell me what breaks.

---

### Thread 5: Open Source Community Call / 开源社区号召

> NewClaw is MIT licensed and we're looking for contributors who care about AI governance.
>
> Areas where we need help:
> - Docker sandbox hardening
> - Real LLM multi-model orchestration
> - IPC channel layer (15 channels)
> - New governance ledger types
> - Documentation and tutorials
>
> First 1000 stars get Genesis Node status.
> https://github.com/newclaw26/newclaw
> Discord: https://discord.com/invite/84Kex3GGAh

---

## 4. Chinese Community Posts / 中文社区发布

### Juejin / 掘金

**Title:** AI Agent 的三权分立：NewClaw 开源框架如何让代理拥有身份、经济和治理

**Summary:**
> 大多数 AI Agent 框架只是提示词的串联器。NewClaw 是第一个将治理作为核心架构的开源框架：三个 AI 核心实时辩论每个决策（提案-审计-治理）、六本治理账本提供 SHA-256 哈希链审计追踪、L0-L4 权限保险丝在危险操作执行前拦截、PoO 结果预言机验证产出价值、知识市场让成功策略变为可交易资产。7 个引擎模块，508 个测试通过，MIT 许可证。从 `pnpm dev` 到首个 Trinity 循环仅需 5 分钟。GitHub: https://github.com/newclaw26/newclaw

### V2EX

**Title:** [开源] NewClaw - 首个让 AI 代理拥有宪法、经济系统和三权分立治理的框架

**Summary:**
> 做了一年的 AI Agent 框架，和 LangChain/AutoGPT 走了完全不同的路。核心思路：Agent 不应该是盲目执行的工具，应该像公民一样在治理体系下运作。三个 AI 核心辩论决策（Trinity 引擎）、六本只追加账本审计每个决策、权限保险丝矩阵在执行前拦截危险操作、Proof of Outcome 验证产出。还有内置经济系统（New.B 货币 + 知识市场）和 DID 身份。纯 TypeScript，Electron 桌面应用，508 个测试通过。欢迎 Star 和提 Issue。代码：https://github.com/newclaw26/newclaw

### Zhihu Template / 知乎回答模板

**Question:** 有哪些值得关注的 AI Agent 框架？

**Answer:**

推荐关注一下 **NewClaw** -- 这是目前我见过的唯一一个把「治理」作为核心架构而非附加功能的 AI Agent 框架。

主流框架的问题大家都遇到过：LangChain 擅长串联提示词，但 Agent 执行了危险操作你没有任何拦截机制，事后也没有结构化审计追踪。AutoGPT 开创了自主 Agent 的范式，但没有刹车 -- 烧 token 跑飞了没有价值验证。

NewClaw 的设计思路完全不同：

1. **Trinity 三核引擎** -- 三个 AI 核心（扩张者/审计者/治理者）对每个决策进行实时辩论。不是一个 Agent 盲目执行，是三方博弈后的共识。
2. **六本治理账本** -- 证据、价值、债务、时效、判例、本地交易，全部只追加写入 + SHA-256 哈希链。每个决策可追溯。
3. **L0-L4 权限保险丝** -- 五个权限等级，L3+ 需要人工确认，危险操作在执行前拦截。
4. **PoO 结果预言机** -- 每次执行生成 OutcomeReport，PriorityScore >= 85 防止空转。
5. **知识市场 + New.B 经济** -- 成功策略变为可交易资产，比特币式减半机制。
6. **DID 身份 + 五阶段晋升** -- Ed25519 密钥对，从模拟到联邦的信任进化路径。

技术栈：Electron + React 19 + TypeScript，支持 Ollama 本地运行，14+ LLM 供应商可插拔切换。7 个引擎模块，508 个测试通过，MIT 开源。

5 分钟可以跑通首个 Trinity 循环：`git clone -> pnpm install -> pnpm dev`。

GitHub: https://github.com/newclaw26/newclaw

---

## 5. GitHub Release Notes / GitHub 发布说明

```
## v7.0.0 -- Trinity Governance Engine

### Highlights

- **15 core modules** across engine, governance, economy, and identity layers
- **508 tests passing** (<30s full suite) with Vitest
- **Trinity Team Chat** -- watch AI-1, AI-2, AI-3 debate in real-time with radar-pulse animation
- **LLM Provider Abstraction** -- pluggable support for Ollama, OpenAI, Anthropic, DeepSeek, and 14+ providers

### Engine (7 modules, 65+ functions)

- `engine.ts` -- Trinity three-core pipeline: proposal -> audit -> approval -> execution -> review -> settlement
- `ledger.ts` -- Six governance ledgers (Evidence, Value, Debt, Temporal, CaseLaw, Local) with SHA-256 hash chain
- `oracle.ts` -- Outcome Oracle + Proof of Outcome verification + auto-settlement
- `fuse-matrix.ts` -- L0-L4 permission fuse system with human dual-sign at L4
- `promotion.ts` -- Stage 0-4 node promotion pipeline with four-axis metric tracking
- `market.ts` -- Knowledge Market: Playbook publishing, pricing, trading, buyer outcome tracking
- `constitution.ts` -- Constitutional constraints and governance rule validation

### Frontend (9 views)

- Team Chat with live AI debate (color-coded bubbles: blue / amber / emerald)
- Dashboard with six stat cards + three engine status panels
- Knowledge Market browser with pricing and trading UI
- Governance Ledgers viewer with six tabbed ledger types
- Outcome Oracle verification dashboard
- Permission Matrix with L0-L4 fuse grid and approval queue
- Node Promotion with four-axis progress visualization
- Node Identity with DID card and Ed25519 keypair display
- Economy view with New.B balance, halving schedule, and transaction history

### Infrastructure

- Electron 40+ desktop application
- React 19 + TypeScript + Zustand (persist) + Tailwind CSS + shadcn/ui
- Vite 7 build system with pnpm
- Express router with 40+ API endpoints (Bearer token auth)
- AES-256-GCM encrypted keystore for node identity

### In Progress (V7 track)

- [ ] Docker sandbox as default execution path
- [ ] Real multi-model LLM orchestration (replacing stubs)
- [ ] IPC channel layer (15+ channels)
- [ ] Backend file persistence (JSON/JSONL)

### System Requirements

- Node.js 22+, pnpm 9+
- macOS 12+ / Windows 10+ / Ubuntu 22.04+

### Quick Start

    git clone https://github.com/newclaw26/newclaw.git
    cd newclaw && pnpm install && pnpm dev

Full Changelog: https://github.com/newclaw26/newclaw/compare/v6.0.0...v7.0.0
```
