<p align="center">
  <img src="../src/assets/logo.svg" width="96" height="96" alt="NewClaw Logo" />
</p>

<h1 align="center">NewClaw V6 Trinity</h1>

<p align="center">
  <strong>The first AI framework where agents have identity, economy, and governance -- not just prompts.</strong><br/>
  <strong>首个让 AI 代理拥有身份、经济与治理的框架 -- 不只是提示词。</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-508_passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/engine_modules-7/7_complete-blue" alt="Engine" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <a href="https://discord.com/invite/84Kex3GGAh"><img src="https://img.shields.io/discord/1399603591471435907?logo=discord&labelColor=%235462eb&logoColor=%23f5f5f5&color=%235462eb" alt="Discord" /></a>
</p>

<p align="center">
  <a href="#quick-start--快速开始">Quick Start</a> &bull;
  <a href="#key-features--核心功能">Features</a> &bull;
  <a href="#architecture--系统架构">Architecture</a> &bull;
  <a href="#comparison--框架对比">Comparison</a> &bull;
  <a href="#roadmap--路线图">Roadmap</a> &bull;
  <a href="#contributing--参与贡献">Contributing</a>
</p>

---

## What is NewClaw? / NewClaw 是什么？

Most AI agent frameworks let you chain prompts. NewClaw gives your agents a **constitution** to follow, **six governance ledgers** for audit trails, a **permission fuse matrix** that blocks dangerous actions before they happen, and an **internal economy** where successful knowledge gets traded. Three AI cores debate every decision in real-time -- one proposes, one audits, one governs.

大多数 AI 代理框架只能串联提示词。NewClaw 给代理一部**宪法**来遵守、**六本治理账本**来审计、一套**权限保险丝矩阵**在危险行动发生前拦截、以及一个成功经验可被交易的**内部经济系统**。三个 AI 核心对每一个决策进行实时辩论 -- 一个提案、一个审计、一个治理。

---

## Trinity Dashboard / Trinity 仪表盘

The Trinity interface has **9 views** accessible from the sidebar:

Trinity 界面提供侧边栏可达的 **9 个视图**：

| View / 视图 | What you see / 你会看到什么 |
|---|---|
| **Team Chat** / 团队群聊 | AI-1, AI-2, AI-3 debating in real-time chat bubbles with radar-pulse thinking animation. Enter a task and watch three agents argue, audit, and decide. / AI-1、AI-2、AI-3 在实时聊天气泡中辩论，配有雷达脉冲思考动画。输入任务，观看三个代理争辩、审计、决策。 |
| **Dashboard** / 仪表盘 | Six stat cards, three engine panels showing `idle/thinking/blocked` status, task creation form, and live event stream. / 六张统计卡片、三个引擎面板显示 `idle/thinking/blocked` 状态、任务创建表单、实时事件流。 |
| **Knowledge Market** / 知识市场 | Browse, price, and trade Playbooks. Successful strategies become tradeable assets. / 浏览、定价、交易 Playbook。成功策略变为可交易资产。 |
| **Governance Ledgers** / 治理账本 | Six tabbed ledgers: Evidence, Value, Debt, Temporal, CaseLaw, Local transactions. / 六个标签页账本：证据、价值、债务、时效、判例、本地交易。 |
| **Outcome Oracle** / 结果预言机 | PoO (Proof of Outcome) verification dashboard with verdict tracking. / PoO（结果证明）验证仪表盘，含裁决追踪。 |
| **Permission Matrix** / 权限矩阵 | L0--L4 fuse grid with pending approval queue. L3+ requires human confirmation. / L0--L4 保险丝网格，含待审批队列。L3+ 需人工确认。 |
| **Node Promotion** / 节点晋升 | Four-axis progress bars (outcomes / compliance / reconciliation / stability) tracking Stage 0 to 4. / 四轴进度条追踪 Stage 0 到 4 的晋升进度。 |
| **Node Identity** / 节点身份 | DID-based identity card with Ed25519 keypair and stage badge. / 基于 DID 的身份卡片，含 Ed25519 密钥对和阶段徽章。 |
| **Economy** / 经济系统 | New.B balance, halving schedule, mining rewards, and transaction history. / New.B 余额、减半计划、挖矿奖励和交易历史。 |

---

## Key Features / 核心功能

- **Trinity Three-Core Engine** -- AI-1 Expander proposes, AI-2 Auditor challenges, AI-3 Governor decides. Every task passes through `proposal -> audit -> approval -> execution -> review -> settled`. / **Trinity 三核引擎** -- AI-1 扩张者提案、AI-2 审计者质疑、AI-3 治理者决策。每个任务经过六阶段流水线。

- **Team Chat with Live AI Debate** -- Watch all three agents think and respond in a group chat interface with radar-pulse animation and color-coded bubbles (blue / amber / emerald). / **实时 AI 辩论团队群聊** -- 在群聊界面观看三个代理思考和回应，配有雷达脉冲动画和角色色彩气泡。

- **Six Governance Ledgers** -- Evidence (H1--H4 graded), Value (priority-scored), Debt (categorized), Temporal (expiry-tracked), CaseLaw (precedent-based), Local (economic). Append-only with SHA-256 hash chain. / **六本治理账本** -- 证据（H1--H4 分级）、价值（优先级评分）、债务（分类管理）、时效（过期追踪）、判例（先例驱动）、本地交易。只追加写入，SHA-256 哈希链。

- **Outcome Oracle with PoO** -- Every execution generates an `OutcomeReport`. The oracle evaluates, grades, and settles results on-chain. PriorityScore >= 85 threshold prevents agents from spinning without value. / **结果预言机与 PoO** -- 每次执行生成 `OutcomeReport`，预言机评估、评分、结算结果。PriorityScore >= 85 阈值防止代理空转。

- **L0--L4 Permission Fuse Matrix** -- Five permission levels from auto-approve (L0) to human + AI-3 dual-signature (L4). Critical actions are blocked before execution, not after. / **L0--L4 权限保险丝矩阵** -- 五个权限等级，从自动批准（L0）到人工 + AI-3 双签（L4）。危险操作在执行前拦截。

- **Node Promotion Pipeline (Stage 0-4)** -- Simulated -> Verified -> Trusted -> Autonomous -> Federated. Four metrics must reach thresholds for each promotion. / **节点晋升流水线（Stage 0-4）** -- 模拟 -> 验证 -> 可信 -> 自主 -> 联邦。四项指标需达标方可晋升。

- **Knowledge Market** -- Publish successful Playbooks, set prices in New.B, trade with other nodes. PoO tracks buyer outcomes. / **知识市场** -- 发布成功 Playbook，用 New.B 定价，与其他节点交易。PoO 追踪买家使用效果。

- **New.B Economy with Halving** -- Internal simulated currency with mining rewards, task payouts, market transactions, and Bitcoin-style halving schedule. / **New.B 经济系统（含减半）** -- 内部模拟货币，含挖矿奖励、任务报酬、市场交易和比特币式减半计划。

- **Node Identity (DID-based)** -- Ed25519 keypair generation, `did:newclaw:<hex32>` format, AES-256-GCM encrypted keystore. / **节点身份（基于 DID）** -- Ed25519 密钥对生成，`did:newclaw:<hex32>` 格式，AES-256-GCM 加密密钥存储。

- **LLM Provider Abstraction** -- Pluggable provider system supporting Ollama (local), OpenAI, Anthropic, DeepSeek, and 14+ providers. Swap models without changing any governance logic. / **LLM 供应商抽象** -- 可插拔供应商系统，支持 Ollama（本地）、OpenAI、Anthropic、DeepSeek 及 14+ 供应商。切换模型无需改动治理逻辑。

---

## Quick Start / 快速开始

```bash
git clone https://github.com/newclaw26/newclaw.git
cd newclaw
pnpm install
pnpm run dev
# Click "V6 Trinity" in the sidebar -> Start your first task
# 点击侧边栏 "V6 Trinity" -> 开始你的第一个任务
```

**System requirements / 系统要求**: Node.js 22+, pnpm 9+, macOS 12+ / Windows 10+ / Ubuntu 22.04+

**First run / 首次运行**: The app detects no identity and shows a genesis wizard. Click "Generate Keypair" to create your node identity, receive 100 New.B, and enter the dashboard at Stage 0. From `pnpm dev` to your first completed Trinity cycle: under 5 minutes. / 应用检测到无身份后显示创世向导。点击"生成密钥对"创建节点身份，获得 100 New.B，以 Stage 0 进入仪表盘。从 `pnpm dev` 到完成首个 Trinity 循环：不超过 5 分钟。

---

## Architecture / 系统架构

```
+===================================================================+
|            UI Layer / 用户界面层  (React 19 + Zustand + Tailwind)  |
|  TeamChat | Dashboard | Market | Ledgers | Oracle | Permissions   |
|  NodeStatus | Identity | Economy                                  |
+===========================|=======================================+
                            | useV6Store (Zustand persist)
+===========================|=======================================+
|            Adapter Layer / 适配器层  (adapter.ts)                  |
|  fetchIdentity | fetchNewBBalance | fetchPooStats | syncBackend   |
+===========================|=======================================+
                            | IPC / HTTP + Bearer Token
+===========================|=======================================+
|            Host API / 宿主 API  (Electron Main)                   |
|  Express Router: /api/trinity/*  (40+ endpoints)                  |
+===========================|=======================================+
                            |
+------+--------+--------+------+-----------+-----------+-----------+
| Const | Engine | Ledger | Oracle | FuseMatrix | Promotion | Market |
| ituti |  .ts   |  .ts   |  .ts   |    .ts     |    .ts    |  .ts   |
| on.ts |  329L  |  279L  |  227L  |    258L    |    315L   |  285L  |
|  143L | 11 fn  | 14 fn  |  6 fn  |   10 fn    |    7 fn   |  9 fn  |
+------+--------+--------+--------+-----------+-----------+-----------+
                            |
+===========================|=======================================+
|            Persistence / 持久化层                                  |
|  localStorage(S0) | File JSON/JSONL(S1) | On-chain hash(S2+)     |
+===========================|=======================================+
                            |
+===========================|=======================================+
|  Docker Sandbox | LLM API (Ollama/OpenAI) | Blockchain | Swarm   |
+===================================================================+
```

**7 engine modules, 65+ exported functions, 508 tests passing.** / **7 个引擎模块，65+ 导出函数，508 个测试通过。**

---

## Comparison / 框架对比

| Capability | **NewClaw** | LangChain | AutoGPT | CrewAI |
|---|---|---|---|---|
| **Governance model** / 治理模型 | Three-branch separation (propose / audit / decide) + constitutional constraints | None | None | Role-based, no checks & balances |
| **Audit trail** / 审计追踪 | 6 typed ledgers + H1--H4 evidence grading + SHA-256 hash chain | Unstructured logs | Unstructured logs | Basic task logs |
| **Sandbox isolation** / 沙盒隔离 | Docker (network-none, CPU/mem limits, 30s timeout) with graceful fallback | None | Docker (limited) | None |
| **Permission system** / 权限系统 | L0--L4 fuse matrix with human dual-sign at L4 | None | None | None |
| **Outcome verification** / 结果验证 | Oracle + PoO (Proof of Outcome) + auto-settlement | None | None | None |
| **Agent economy** / 代理经济 | New.B currency + knowledge market + halving + staking | None | None | None |
| **Agent identity** / 代理身份 | DID-based Ed25519 + encrypted keystore | None | None | None |
| **Evolution path** / 进化路径 | 5-stage promotion pipeline (Simulated to Federated) | None | None | None |

---

## For Developers / 开发者指南

### Engine API / 引擎 API

```typescript
import {
  createTask,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
} from '@newclaw/engine'

const task = createTask('Optimize database queries', 'Reduce p95 latency by 40%')
const proposal = runProposalPhase(task, aiGeneratedContent)
const audit = runAuditPhase(proposal.task, constitution, findings, 'medium')
const decision = runApprovalPhase(audit.task, constitution, true, 50)
```

### Test Suite / 测试套件

```bash
pnpm test              # 508 tests, <30s
pnpm test:coverage     # Coverage report
pnpm run test:e2e      # Electron E2E smoke tests
```

### Key Files / 关键文件

| File | Purpose / 用途 |
|---|---|
| `src/lib/v6/engine.ts` | Trinity three-core pipeline (329 lines, 11 functions) / Trinity 三核流水线 |
| `src/lib/v6/ledger.ts` | Six governance ledgers CRUD (279 lines, 14 functions) / 六本治理账本 CRUD |
| `src/lib/v6/oracle.ts` | Outcome Oracle + PoO verification (227 lines, 6 functions) / 结果预言机 + PoO 验证 |
| `src/lib/v6/fuse-matrix.ts` | L0--L4 permission fuse system (258 lines, 10 functions) / L0--L4 权限保险丝 |
| `src/lib/v6/promotion.ts` | Stage 0--4 node promotion (315 lines, 7 functions) / Stage 0--4 节点晋升 |
| `src/lib/v6/market.ts` | Knowledge market + Playbook trading (285 lines, 9 functions) / 知识市场 |
| `src/lib/v6/constitution.ts` | Constitutional constraints (143 lines, 8 functions) / 宪法约束 |
| `src/lib/v6/trinity-orchestrator.ts` | LLM provider bridge for real AI responses / LLM 供应商桥接层 |
| `src/types/v6.ts` | Shared type contract (A/B team) / 共享类型契约 |
| `docs/NewClaw-v7.0-spec.md` | Full v7.0 engineering specification / 完整 v7.0 工程规格说明书 |

### Tech Stack / 技术栈

| Layer / 层 | Technology / 技术 |
|---|---|
| Desktop | Electron 40+ |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (persist) |
| Build | Vite 7 + pnpm |
| Test | Vitest + Playwright |
| Animation | Framer Motion |
| AI Runtime | OpenClaw 2026.4 |

---

## Roadmap / 路线图

### Shipped (V6) / 已交付

- [x] Trinity three-core engine (7 modules, all tested) / Trinity 三核引擎
- [x] Team Chat with live AI debate / 团队群聊实时 AI 辩论
- [x] Six governance ledgers / 六本治理账本
- [x] L0--L4 permission fuse matrix / 权限保险丝矩阵
- [x] Outcome Oracle + PoO / 结果预言机
- [x] Knowledge market / 知识市场
- [x] Node promotion pipeline / 节点晋升流水线
- [x] New.B economy / New.B 经济系统
- [x] LLM provider abstraction / LLM 供应商抽象
- [x] 508 tests passing / 508 个测试通过

### In Progress (V7) / 进行中

- [ ] DID-based node identity with Ed25519 keystore / 基于 DID 的节点身份
- [ ] Docker sandbox execution / Docker 沙盒执行
- [ ] Real LLM orchestration (replace setTimeout stubs) / 真实 LLM 编排
- [ ] IPC channel layer (15+ channels) / IPC 通道层
- [ ] Backend persistence (file JSON/JSONL) / 后端持久化

### Future (V8+) / 未来版本

- [ ] Dual-node communication and swarm expansion / 双节点通信与蜂群扩展
- [ ] Real New.B token economy (on-chain) / 真实 New.B 代币经济
- [ ] Dutch auction for knowledge market / 知识市场荷兰拍卖
- [ ] Federation debt clearing / 联邦债务清算
- [ ] Prophet mining / 先知挖矿

---

## Contributing / 参与贡献

We welcome contributions from the community. / 我们欢迎社区贡献。

```bash
# Fork, then:
git clone https://github.com/<you>/newclaw.git
cd newclaw
pnpm install
pnpm test                 # Make sure 508 tests pass / 确保 508 个测试通过
# Create a branch, make changes, open a PR
```

**Guidelines / 规范**:
- Follow existing code style (ESLint + Prettier) / 遵循现有代码风格
- Write tests for new features / 为新功能编写测试
- Every code sample in docs must run without modification / 文档中的代码示例必须可直接运行
- Keep commits atomic with clear descriptions / 保持提交原子化，描述清晰

**Community / 社区**:
[Discord](https://discord.com/invite/84Kex3GGAh) &bull;
[Email](mailto:public@valuecell.ai)

---

## License / 许可证

MIT -- free to use, modify, and distribute. / MIT -- 自由使用、修改和分发。

<p align="center">
  <sub>Built by the ValueCell team / 由 ValueCell 团队构建</sub>
</p>
