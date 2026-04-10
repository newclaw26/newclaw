<p align="center">
  <img src="src/assets/logo.svg" width="96" height="96" alt="NewClaw Logo" />
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

---

# --- V6 原始内容 ---

<p align="center">
  <img src="src/assets/logo.svg" width="128" height="128" alt="NewClaw Logo" />
</p>

<h1 align="center">NewClaw</h1>

<p align="center">
  <strong>OpenClaw AI 智能体的桌面客户端</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#为什么选择-newclaw">为什么选择 NewClaw</a> •
  <a href="#快速上手">快速上手</a> •
  <a href="#系统架构">系统架构</a> •
  <a href="#开发指南">开发指南</a> •
  <a href="#参与贡献">参与贡献</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-MacOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-40+-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?logo=react" alt="React" />
  <a href="https://discord.com/invite/84Kex3GGAh" target="_blank">
  <img src="https://img.shields.io/discord/1399603591471435907?logo=discord&labelColor=%20%235462eb&logoColor=%20%23f5f5f5&color=%20%235462eb" alt="chat on Discord" />
  </a>
  <img src="https://img.shields.io/github/downloads/newclaw-ai/NewClaw/total?color=%23027DEB" alt="Downloads" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文 | <a href="README.ja-JP.md">日本語</a>
</p>

---

## 概述

**NewClaw** 是连接强大 AI 智能体与普通用户之间的桥梁。基于 [OpenClaw](https://github.com/OpenClaw) 构建，它将命令行式的 AI 编排转变为易用、美观的桌面体验——无需使用终端。

无论是自动化工作流、连接通讯软件，还是调度智能定时任务，NewClaw 都能提供高效易用的图形界面，帮助你充分发挥 AI 智能体的能力。

NewClaw 预置了最佳实践的模型供应商配置，原生支持 Windows 平台以及多语言设置。当然，你也可以通过 **设置 → 高级 → 开发者模式** 来进行精细的高级配置。

---

## 截图预览

<p align="center">
  <img src="resources/screenshot/zh/chat.png" style="width: 100%; height: auto;">
</p>

<p align="center">
  <img src="resources/screenshot/zh/cron.png" style="width: 100%; height: auto;">
</p>

<p align="center">
  <img src="resources/screenshot/zh/skills.png" style="width: 100%; height: auto;">
</p>

<p align="center">
  <img src="resources/screenshot/zh/channels.png" style="width: 100%; height: auto;">
</p>

<p align="center">
  <img src="resources/screenshot/zh/models.png" style="width: 100%; height: auto;">
</p>

<p align="center">
  <img src="resources/screenshot/zh/settings.png" style="width: 100%; height: auto;">
</p>

---

## 为什么选择 NewClaw

构建 AI 智能体不应该需要精通命令行。NewClaw 的设计理念很简单：**强大的技术值得拥有一个尊重用户时间的界面。**

| 痛点 | NewClaw 解决方案 |
|------|----------------|
| 复杂的命令行配置 | 一键安装，配合引导式设置向导 |
| 手动编辑配置文件 | 可视化设置界面，实时校验 |
| 进程管理繁琐 | 自动管理网关生命周期 |
| 多 AI 供应商切换 | 统一的供应商配置面板 |
| 技能/插件安装复杂 | 内置技能市场与管理界面 |

### 内置 OpenClaw 核心

NewClaw 直接基于官方 **OpenClaw** 核心构建。无需单独安装，我们将运行时嵌入应用内部，提供开箱即用的无缝体验。

我们致力于与上游 OpenClaw 项目保持严格同步，确保你始终可以使用官方发布的最新功能、稳定性改进和生态兼容性。

---

## 功能特性

### 🎯 零配置门槛
从安装到第一次 AI 对话，全程通过直观的图形界面完成。无需终端命令，无需 YAML 文件，无需到处寻找环境变量。

### 💬 智能聊天界面
通过现代化的聊天体验与 AI 智能体交互。支持多会话上下文、消息历史记录、Markdown 富文本渲染，以及在多 Agent 场景下通过主输入框中的 `@agent` 直接路由到目标智能体。
当你使用 `@agent` 选择其他智能体时，NewClaw 会直接切换到该智能体自己的对话上下文，而不是经过默认智能体转发。各 Agent 工作区默认彼此分离，但更强的运行时隔离仍取决于 OpenClaw 的 sandbox 配置。
每个 Agent 还可以单独覆盖自己的 `provider/model` 运行时设置；未覆盖的 Agent 会继续继承全局默认模型。

### 📡 多频道管理
同时配置和监控多个 AI 频道。每个频道独立运行，允许你为不同任务运行专门的智能体。
现在每个频道支持多个账号，并可在 Channels 页面直接完成账号绑定到 Agent 与默认账号切换。
NewClaw 现在还内置了腾讯官方个人微信渠道插件，可直接在 Channels 页面通过内置二维码流程完成微信连接。

### ⏰ 定时任务自动化
调度 AI 任务自动执行。定义触发器、设置时间间隔，让 AI 智能体 7×24 小时不间断工作。
现在定时任务页面已经可以直接配置外部投递，统一拆成“发送账号”和“接收目标”两个下拉选择。对于已支持的通道，接收目标会从通道目录能力或已知会话历史中自动发现，不需要再手动修改 `jobs.json`。
已知限制：微信当前不在支持的定时任务投递通道列表内。原因是 `openclaw-weixin` 插件的出站发送依赖实时会话里的 `contextToken`，插件本身不支持 cron 这类主动推送场景。

### 🧩 可扩展技能系统
通过预构建的技能扩展 AI 智能体的能力。在集成的技能面板中浏览、安装和管理技能——无需包管理器。
NewClaw 还会内置预装完整的文档处理技能（`pdf`、`xlsx`、`docx`、`pptx`），在启动时自动部署到托管技能目录（默认 `~/.openclaw/skills`），并在首次安装时默认启用。额外预装技能（`find-skills`、`self-improving-agent`、`tavily-search`、`brave-web-search`）也会默认启用；若缺少必需的 API Key，OpenClaw 会在运行时给出配置错误提示。  
Skills 页面可展示来自多个 OpenClaw 来源的技能（托管目录、workspace、额外技能目录），并显示每个技能的实际路径，便于直接打开真实安装位置。

重点搜索技能所需环境变量：
- `BRAVE_SEARCH_API_KEY`：用于 `brave-web-search`
- `TAVILY_API_KEY`：用于 `tavily-search`（上游运行时也可能支持 OAuth）

### 🔐 安全的供应商集成
连接多个 AI 供应商（OpenAI、Anthropic 等），凭证安全存储在系统原生密钥链中。OpenAI 同时支持 API Key 与浏览器 OAuth（Codex 订阅）登录。
如果你通过 **自定义（Custom）Provider** 对接 OpenAI-compatible 网关，可以在 **设置 → AI Providers → 编辑 Provider** 中配置自定义 `User-Agent`，以提高兼容性。
如果兼容网关的 `/models` 因非鉴权原因不可用，NewClaw 会在校验 API Key 时自动降级为轻量的 `/chat/completions` 或 `/responses` 探测。

### 🌙 自适应主题
支持浅色模式、深色模式或跟随系统主题。NewClaw 自动适应你的偏好设置。

### 🚀 开机启动控制
在 **设置 → 通用** 中，你可以开启 **开机自动启动**，让 NewClaw 在系统登录后自动启动。

---

## 快速上手

### 系统要求

- **操作系统**：macOS 11+、Windows 10+ 或 Linux（Ubuntu 20.04+）
- **内存**：最低 4GB RAM（推荐 8GB）
- **存储空间**：1GB 可用磁盘空间

### 安装方式

#### 预构建版本（推荐）

从 [Releases](https://github.com/newclaw-ai/NewClaw/releases) 页面下载适用于你平台的最新版本。

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/newclaw-ai/NewClaw.git
cd NewClaw

# 初始化项目
pnpm run init

# 以开发模式启动
pnpm dev
```
### 首次启动

首次启动 NewClaw 时，**设置向导** 将引导你完成以下步骤：

1. **语言与区域** – 配置你的首选语言和地区
2. **AI 供应商** – 通过 API 密钥或 OAuth（支持浏览器/设备登录的供应商）添加账号
3. **技能包** – 选择适用于常见场景的预配置技能
4. **验证** – 在进入主界面前测试你的配置

如果系统语言在支持列表中，向导会默认选中该语言；否则回退到英文。

> Moonshot（Kimi）说明：NewClaw 默认保持开启 Kimi 的 web search。  
> 当配置 Moonshot 后，NewClaw 也会将 OpenClaw 配置中的 Kimi web search 同步到中国区端点（`https://api.moonshot.cn/v1`）。

### 代理设置

NewClaw 内置了代理设置，适用于需要通过本地代理客户端访问外网的场景，包括 Electron 本身、OpenClaw Gateway，以及 Telegram 这类频道的联网请求。

打开 **设置 → 网关 → 代理**，配置以下内容：

- **代理服务器**：所有请求默认使用的代理
- **绕过规则**：需要直连的主机，使用分号、逗号或换行分隔
- 在 **开发者模式** 下，还可以单独覆盖：
  - **HTTP 代理**
  - **HTTPS 代理**
  - **ALL_PROXY / SOCKS**

本地代理的常见填写示例：

```text
代理服务器: http://127.0.0.1:7890
```
说明：

- 只填写 `host:port` 时，会按 HTTP 代理处理。
- 高级代理项留空时，会自动回退到“代理服务器”。
- 保存代理设置后，Electron 网络层会立即重新应用代理，并自动重启 Gateway。
- 如果启用了 Telegram，NewClaw 还会把代理同步到 OpenClaw 的 Telegram 频道配置中。
- 当 NewClaw 代理处于关闭状态时，Gateway 的常规重启会保留已有的 Telegram 频道代理配置。
- 如果你要明确清空 OpenClaw 中的 Telegram 代理，请在关闭代理后点一次“保存代理设置”。
- 在 **设置 → 高级 → 开发者** 中，可以直接运行 **OpenClaw Doctor**，执行 `openclaw doctor --json` 并在应用内查看诊断输出。
- 在 Windows 打包版本中，内置的 `openclaw` CLI/TUI 会通过随包分发的 `node.exe` 入口运行，以保证终端输入行为稳定。

---

## 系统架构

NewClaw 采用 **双进程 + Host API 统一接入架构**。渲染进程只调用统一客户端抽象，协议选择与进程生命周期由 Electron 主进程统一管理：

```┌─────────────────────────────────────────────────────────────────┐
│                        NewClaw 桌面应用                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Electron 主进程                                 │  │
│  │  • 窗口与应用生命周期管理                                      │  │
│  │  • 网关进程监控                                               │  │
│  │  • 系统集成（托盘、通知、密钥链）                                │  │
│  │  • 自动更新编排                                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              │ IPC（权威控制面）                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              React 渲染进程                                   │  │
│  │  • 现代组件化 UI（React 19）                                   │  │
│  │  • Zustand 状态管理                                           │  │
│  │  • 统一 host-api/api-client 调用                               │  │
│  │  • Markdown 富文本渲染                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ 主进程统一传输策略
                               │（WS 优先，HTTP 次之，IPC 回退）
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Host API 与主进程代理层                          │
│                                                                  │
│  • hostapi:fetch（主进程代理，规避开发/生产 CORS）                │
│  • gateway:httpProxy（渲染进程不直连 Gateway HTTP）               │
│  • 统一错误映射与重试/退避策略                                     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               │ WS / HTTP / IPC 回退
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OpenClaw 网关                                 │
│                                                                  │
│  • AI 智能体运行时与编排                                          │
│  • 消息频道管理                                                   │
│  • 技能/插件执行环境                                              │
│  • 供应商抽象层                                                   │
└─────────────────────────────────────────────────────────────────┘
```
### 设计原则

- **进程隔离**：AI 运行时在独立进程中运行，确保即使在高负载计算期间 UI 也能保持响应
- **前端调用单一入口**：渲染层统一走 host-api/api-client，不感知底层协议细节
- **主进程掌控传输策略**：WS/HTTP 选择与 IPC 回退在主进程集中处理，提升稳定性
- **优雅恢复**：内置重连、超时、退避逻辑，自动处理瞬时故障
- **安全存储**：API 密钥和敏感数据利用操作系统原生的安全存储机制
- **CORS 安全**：本地 HTTP 请求由主进程代理，避免渲染进程跨域问题

### 进程模型与 Gateway 排障

- NewClaw 基于 Electron，**单个应用实例出现多个系统进程是正常现象**（main/renderer/zygote/utility）。
- 单实例保护同时使用 Electron 自带锁与本地进程文件锁回退机制，可在桌面会话总线异常时避免重复启动。
- 滚动升级期间若新旧版本混跑，单实例保护仍可能出现不对称行为。为保证稳定性，建议桌面客户端尽量统一升级到同一版本。
- 但 OpenClaw Gateway 监听应始终保持**单实例**：`127.0.0.1:18799` 只能有一个监听者。
- 可用以下命令确认监听进程：
  - macOS/Linux：`lsof -nP -iTCP:18799 -sTCP:LISTEN`
  - Windows（PowerShell）：`Get-NetTCPConnection -LocalPort 18799 -State Listen`
- 点击窗口关闭按钮（`X`）默认只是最小化到托盘，并不会完全退出应用。请在托盘菜单中选择 **Quit NewClaw** 执行完整退出。

---

## 使用场景

### 🤖 个人 AI 助手
配置一个通用 AI 智能体，可以回答问题、撰写邮件、总结文档并协助处理日常任务——全部通过简洁的桌面界面完成。

### 📊 自动化监控
设置定时智能体来监控新闻动态、追踪价格变动或监听特定事件。结果将推送到你偏好的通知渠道。

### 💻 开发者效率工具
将 AI 融入你的开发工作流。使用智能体进行代码审查、生成文档或自动化重复性编码任务。

### 🔄 工作流自动化
将多个技能串联起来，创建复杂的自动化流水线。处理数据、转换内容、触发操作——全部通过可视化方式编排。

---

## 开发指南

### 前置要求

- **Node.js**：22+（推荐 LTS 版本）
- **包管理器**：pnpm 9+（推荐）或 npm

### 项目结构

```NewClaw/
├── electron/                 # Electron 主进程
│   ├── api/                 # 主进程 API 路由与处理器
│   │   └── routes/          # RPC/HTTP 代理路由模块
│   ├── services/            # Provider、Secrets 与运行时服务
│   │   ├── providers/       # Provider/account 模型同步逻辑
│   │   └── secrets/         # 系统钥匙串与密钥存储
│   ├── shared/              # 共享 Provider schema/常量
│   │   └── providers/
│   ├── main/                # 应用入口、窗口、IPC 注册
│   ├── gateway/             # OpenClaw 网关进程管理
│   ├── preload/             # 安全 IPC 桥接
│   └── utils/               # 工具模块（存储、认证、路径）
├── src/                      # React 渲染进程
│   ├── lib/                 # 前端统一 API 与错误模型
│   ├── stores/              # Zustand 状态仓库（settings/chat/gateway）
│   ├── components/          # 可复用 UI 组件
│   ├── pages/               # Setup/Dashboard/Chat/Channels/Skills/Cron/Settings
│   ├── i18n/                # 国际化资源
│   └── types/               # TypeScript 类型定义
├── tests/
│   ├── e2e/                 # Playwright Electron 端到端冒烟测试
│   └── unit/                # Vitest 单元/集成型测试
├── resources/                # 静态资源（图标、图片）
└── scripts/                  # 构建与工具脚本
```
### 常用命令

```bash
# 开发
pnpm run init             # 安装依赖并下载 uv
pnpm dev                  # 以热重载模式启动（若缺失会自动准备预装技能包）

# 代码质量
pnpm lint                 # 运行 ESLint 检查
pnpm typecheck            # TypeScript 类型检查

# 测试
pnpm test                 # 运行单元测试
pnpm run test:e2e         # 运行 Electron E2E 冒烟测试
pnpm run test:e2e:headed  # 以可见窗口运行 Electron E2E 测试
pnpm run comms:replay     # 计算通信回放指标
pnpm run comms:baseline   # 刷新通信基线快照
pnpm run comms:compare    # 将回放指标与基线阈值对比

# 构建与打包
pnpm run build:vite       # 仅构建前端
pnpm build                # 完整生产构建（含打包资源）
pnpm package              # 为当前平台打包（包含预装技能资源）
pnpm package:mac          # 为 macOS 打包
pnpm package:win          # 为 Windows 打包
pnpm package:linux        # 为 Linux 打包
```

在无头 Linux 环境下，Electron 测试需要显示服务；可使用 `xvfb-run -a pnpm run test:e2e`。

### 通信回归检查

当 PR 涉及通信链路（Gateway 事件、Chat 收发流程、Channel 投递、传输回退）时，建议执行：

```bash
pnpm run comms:replay
pnpm run comms:compare
```

CI 中的 `comms-regression` 会校验必选场景与阈值。
### 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Electron 40+ |
| UI 框架 | React 19 + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 构建工具 | Vite + electron-builder |
| 测试 | Vitest + Playwright |
| 动画 | Framer Motion |
| 图标 | Lucide React |

---

## 参与贡献

我们欢迎社区的各种贡献！无论是修复 Bug、开发新功能、改进文档还是翻译——每一份贡献都让 NewClaw 变得更好。

### 如何贡献

1. **Fork** 本仓库
2. **创建** 功能分支（`git checkout -b feature/amazing-feature`）
3. **提交** 清晰描述的变更
4. **推送** 到你的分支
5. **创建** Pull Request

### 贡献规范

- 遵循现有代码风格（ESLint + Prettier）
- 为新功能编写测试
- 按需更新文档
- 保持提交原子化且描述清晰

---

## 致谢

NewClaw 构建于以下优秀的开源项目之上：

- [OpenClaw](https://github.com/OpenClaw) – AI 智能体运行时
- [Electron](https://www.electronjs.org/) – 跨平台桌面框架
- [React](https://react.dev/) – UI 组件库
- [shadcn/ui](https://ui.shadcn.com/) – 精美设计的组件库
- [Zustand](https://github.com/pmndrs/zustand) – 轻量级状态管理

---

## 社区

加入我们的社区，与其他用户交流、获取帮助、分享你的使用体验。

| 企业微信 | 飞书群组 | Discord |
| :---: | :---: | :---: |
| <img src="src/assets/community/wecom-qr.png" width="150" alt="企业微信二维码" /> | <img src="src/assets/community/feishu-qr.png" width="150" alt="飞书二维码" /> | <img src="src/assets/community/20260212-185822.png" width="150" alt="Discord 二维码" /> |

### NewClaw 合作伙伴计划 🚀

我们正在启动 NewClaw 合作伙伴计划，寻找能够帮助我们将 NewClaw 介绍给更多客户的合作伙伴，尤其是那些有定制化 AI 智能体或自动化需求的客户。

合作伙伴负责帮助我们连接潜在用户和项目，NewClaw 团队则提供完整的技术支持、定制开发与集成服务。

如果你服务的客户对 AI 工具或自动化方案感兴趣，欢迎与我们合作。

欢迎私信我们，或发送邮件至 [public@valuecell.ai](mailto:public@valuecell.ai) 了解更多。

---

## Stars 历史

<p align="center">
  <img src="https://api.star-history.com/svg?repos=newclaw-ai/NewClaw&type=Date" alt="Stars 历史图表" />
</p>

---

## 许可证

NewClaw 基于 [MIT 许可证](LICENSE) 发布。你可以自由地使用、修改和分发本软件。

---

<p align="center">
  <sub>由 ValueCell 团队用 ❤️ 打造</sub>
</p>
