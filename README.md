<p align="center">
  <img src="src/assets/logo.svg" width="96" height="96" alt="NewClaw Logo" />
</p>

<h1 align="center">NewClaw</h1>

<p align="center">
  <strong>The AI agent framework where agents have identity, governance, and economy &mdash; not just prompts.</strong><br/>
  Three AI cores debate every decision in real-time. One proposes. One audits. One decides.
</p>

<p align="center">
  <a href="https://github.com/newclaw26/newclaw/stargazers"><img src="https://img.shields.io/github/stars/newclaw26/newclaw?style=social" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/tests-508_passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/engine_modules-7/7_complete-blue" alt="Engine" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <a href="https://discord.com/invite/84Kex3GGAh"><img src="https://img.shields.io/discord/1399603591471435907?logo=discord&labelColor=%235462eb&logoColor=%23f5f5f5&color=%235462eb" alt="Discord" /></a>
</p>

<p align="center">
  <a href="https://newclaw26.github.io/newclaw/demo/"><strong>Live Demo</strong></a> &bull;
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#key-features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#comparison">Comparison</a> &bull;
  <a href="README.zh-CN.md">中文文档</a>
</p>

---

> If this project interests you, a GitHub star helps others find it. Thank you.

---

## Live Demo

**Try it now, no install needed:** [https://newclaw26.github.io/newclaw/demo/](https://newclaw26.github.io/newclaw/demo/)

The demo runs the Trinity engine in-browser: watch AI-1, AI-2, and AI-3 debate a task, consult the governance ledgers, check permissions, and settle an outcome — all in real time.

---

## Quick Start

```bash
git clone https://github.com/newclaw26/newclaw.git
cd newclaw
pnpm install && pnpm run dev
```

First launch shows the Genesis Wizard. Click "Generate Keypair" to create your node identity, receive 100 New.B, and enter the Trinity dashboard at Stage 0. **From `pnpm dev` to your first completed Trinity cycle: under 5 minutes.**

System requirements: Node.js 22+, pnpm 9+, macOS 12+ / Windows 10+ / Ubuntu 22.04+

---

## What is NewClaw?

Most AI agent frameworks let you chain prompts. NewClaw gives your agents:

- A **constitution** they must follow
- **Six governance ledgers** for tamper-evident audit trails
- A **permission fuse matrix** (L0&ndash;L4) that blocks dangerous actions *before* they execute
- An **internal economy** where successful knowledge gets traded using New.B currency
- A **5-stage promotion pipeline** from Simulated to Federated

The Trinity Engine runs three AI cores on every task: AI-1 Expander proposes, AI-2 Auditor challenges, AI-3 Governor decides. Every task passes through a six-phase pipeline: proposal &rarr; audit &rarr; approval &rarr; execution &rarr; review &rarr; settled.

---

## Key Features

- **Trinity Three-Core Engine** &mdash; AI-1, AI-2, AI-3 debate in a live Team Chat interface with radar-pulse animation and role-colored bubbles (blue / amber / emerald).

- **Six Governance Ledgers** &mdash; Evidence (H1&ndash;H4 graded), Value, Debt, Temporal, CaseLaw, Local. Append-only with SHA-256 hash chain.

- **Outcome Oracle with PoO** &mdash; Every execution generates an `OutcomeReport`. PriorityScore &ge; 85 threshold prevents agents from spinning without value.

- **L0&ndash;L4 Permission Fuse Matrix** &mdash; From auto-approve (L0) to human + AI-3 dual-signature (L4). Critical actions are blocked before execution, not after.

- **Node Promotion Pipeline (Stage 0&ndash;4)** &mdash; Simulated &rarr; Verified &rarr; Trusted &rarr; Autonomous &rarr; Federated. Four metrics must reach thresholds for each stage.

- **Knowledge Market** &mdash; Publish successful Playbooks, set prices in New.B, trade with other nodes. PoO tracks buyer outcomes.

- **New.B Economy with Halving** &mdash; Internal simulated currency with mining rewards, task payouts, market transactions, and Bitcoin-style halving.

- **Node Identity (DID-based)** &mdash; Ed25519 keypair, `did:newclaw:<hex32>` format, AES-256-GCM encrypted keystore.

- **LLM Provider Abstraction** &mdash; Pluggable support for Ollama (local), OpenAI, Anthropic, DeepSeek, and 14+ providers. Swap models without changing governance logic.

---

## Architecture

```
+===================================================================+
|            UI Layer  (React 19 + Zustand + Tailwind)              |
|  TeamChat | Dashboard | Market | Ledgers | Oracle | Permissions   |
|  NodeStatus | Identity | Economy                                  |
+===========================|=======================================+
                            | useV6Store (Zustand persist)
+===========================|=======================================+
|            Adapter Layer  (adapter.ts)                            |
|  fetchIdentity | fetchNewBBalance | fetchPooStats | syncBackend   |
+===========================|=======================================+
                            | IPC / HTTP + Bearer Token
+===========================|=======================================+
|            Host API  (Electron Main)                              |
|  Express Router: /api/trinity/*  (40+ endpoints)                  |
+===========================|=======================================+
                            |
+------+--------+--------+--------+-----------+-----------+---------+
| Const | Engine | Ledger | Oracle | FuseMatrix | Promotion | Market |
| itut  |  .ts   |  .ts   |  .ts   |    .ts     |    .ts    |  .ts  |
| ion   |  329L  |  279L  |  227L  |    258L    |    315L   |  285L |
|  143L | 11 fn  | 14 fn  |  6 fn  |   10 fn    |    7 fn   |  9 fn |
+------+--------+--------+--------+-----------+-----------+---------+
                            |
+===================================================================+
|            Persistence                                            |
|  localStorage (S0) | File JSON/JSONL (S1) | On-chain hash (S2+)  |
+===================================================================+
```

**7 engine modules, 65+ exported functions, 508 tests passing.**

---

## Comparison

| Capability | **NewClaw** | LangChain | AutoGPT | CrewAI |
|---|---|---|---|---|
| Governance model | Three-branch: propose / audit / decide + constitutional constraints | None | None | Role-based, no checks |
| Audit trail | 6 typed ledgers + H1&ndash;H4 evidence grading + SHA-256 hash chain | Unstructured logs | Unstructured logs | Basic task logs |
| Sandbox isolation | Docker (network-none, CPU/mem limits, 30s timeout) with fallback | None | Docker (limited) | None |
| Permission system | L0&ndash;L4 fuse matrix, human dual-sign at L4 | None | None | None |
| Outcome verification | Oracle + PoO (Proof of Outcome) + auto-settlement | None | None | None |
| Agent economy | New.B currency + knowledge market + halving | None | None | None |
| Agent identity | DID-based Ed25519 + encrypted keystore | None | None | None |
| Evolution path | 5-stage promotion pipeline (Simulated to Federated) | None | None | None |

---

## For Developers

### Engine API

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

### Key Files

| File | Purpose |
|---|---|
| `src/lib/v6/engine.ts` | Trinity three-core pipeline (329 lines, 11 functions) |
| `src/lib/v6/ledger.ts` | Six governance ledgers CRUD (279 lines, 14 functions) |
| `src/lib/v6/oracle.ts` | Outcome Oracle + PoO verification (227 lines, 6 functions) |
| `src/lib/v6/fuse-matrix.ts` | L0&ndash;L4 permission fuse system (258 lines, 10 functions) |
| `src/lib/v6/promotion.ts` | Stage 0&ndash;4 node promotion (315 lines, 7 functions) |
| `src/lib/v6/market.ts` | Knowledge market + Playbook trading (285 lines, 9 functions) |
| `src/lib/v6/constitution.ts` | Constitutional constraints (143 lines, 8 functions) |
| `src/lib/v6/trinity-orchestrator.ts` | LLM provider bridge |
| `src/types/v6.ts` | Shared type contract |
| `docs/NewClaw-v7.0-spec.md` | Full v7.0 engineering specification |

### Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 40+ |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (persist) |
| Build | Vite 7 + pnpm |
| Test | Vitest + Playwright |
| Animation | Framer Motion |
| AI Runtime | OpenClaw 2026.4 |

### Test Suite

```bash
pnpm test              # 508 tests, <30s
pnpm test:coverage     # Coverage report
pnpm run test:e2e      # Electron E2E smoke tests
```

---

## Roadmap

### Shipped (V7.0)

- [x] Trinity three-core engine (7 modules, all tested)
- [x] Team Chat with live AI debate
- [x] Six governance ledgers
- [x] L0&ndash;L4 permission fuse matrix
- [x] Outcome Oracle + PoO
- [x] Knowledge market
- [x] Node promotion pipeline (Stage 0&ndash;4)
- [x] New.B economy with halving
- [x] LLM provider abstraction (14+ providers)
- [x] 508 tests passing

### In Progress (V7.x)

- [ ] Docker sandbox execution
- [ ] Real LLM orchestration (replace stubs)
- [ ] IPC channel layer (15+ channels)
- [ ] Backend persistence (file JSON/JSONL)

### Future (V8+)

- [ ] Dual-node communication and swarm expansion
- [ ] Real New.B token economy (on-chain)
- [ ] Dutch auction for knowledge market
- [ ] Federation debt clearing

---

## Contributing

```bash
# Fork the repo, then:
git clone https://github.com/<you>/newclaw.git
cd newclaw
pnpm install
pnpm test        # Make sure 508 tests pass before opening a PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Questions? Join the [Discord](https://discord.com/invite/84Kex3GGAh).

---

## License

MIT &mdash; see [LICENSE](LICENSE).

---

<p align="center">
  If NewClaw solves a real problem for you, a star on GitHub goes a long way.<br/>
  <a href="https://github.com/newclaw26/newclaw/stargazers">Star this repo</a>
</p>
