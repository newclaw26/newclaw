# Changelog / 更新日志

All notable changes to NewClaw will be documented in this file.
NewClaw 的所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [7.0.0] - 2026-04-10

### Added / 新增

- **Trinity Three-Core Governance Engine (15 modules)** -- AI-1 Expander proposes, AI-2 Auditor challenges, AI-3 Governor decides. Full six-phase pipeline: proposal, audit, approval, execution, review, settlement.
  **Trinity 三核治理引擎（15 个模块）** -- AI-1 扩张者提案、AI-2 审计者质疑、AI-3 治理者决策。完整六阶段流水线：提案、审计、批准、执行、复核、结算。

- **Team Chat Workspace** -- Live multi-agent debate interface with radar-pulse thinking animation, role-colored chat bubbles (blue / amber / emerald), and real-time task progression.
  **团队群聊工作台** -- 实时多代理辩论界面，配有雷达脉冲思考动画、角色色彩聊天气泡（蓝 / 琥珀 / 翠绿）和实时任务进展。

- **Genesis Wizard (5-step onboarding)** -- Detects first-run state and guides users through identity creation, keypair generation, initial New.B allocation, and Stage 0 entry. From `pnpm dev` to first Trinity cycle in under 5 minutes.
  **创世向导（5 步引导）** -- 检测首次运行状态，引导用户完成身份创建、密钥对生成、初始 New.B 分配和 Stage 0 入场。从 `pnpm dev` 到首个 Trinity 循环不超过 5 分钟。

- **Knowledge Market** -- Publish, price, and trade Playbooks using New.B currency. Successful strategies become tradeable assets with PoO-tracked buyer outcomes.
  **知识市场** -- 使用 New.B 货币发布、定价和交易 Playbook。成功策略变为可交易资产，PoO 追踪买家使用效果。

- **Outcome Oracle with PoO verification** -- Every execution generates an `OutcomeReport`. The oracle evaluates, grades, and settles results. PriorityScore >= 85 threshold prevents agents from spinning without value.
  **结果预言机（含 PoO 验证）** -- 每次执行生成 `OutcomeReport`，预言机评估、评分、结算结果。PriorityScore >= 85 阈值防止代理空转。

- **Permission Fuse Matrix (L0-L4)** -- Five permission levels from auto-approve (L0) to human + AI-3 dual-signature (L4). Critical actions are blocked before execution, not after.
  **权限保险丝矩阵（L0-L4）** -- 五个权限等级，从自动批准（L0）到人工 + AI-3 双签（L4）。危险操作在执行前拦截。

- **Node Promotion Pipeline (Stage 0-4)** -- Simulated, Verified, Trusted, Autonomous, Federated. Four-axis metrics (outcomes / compliance / reconciliation / stability) must reach thresholds for each promotion.
  **节点晋升流水线（Stage 0-4）** -- 模拟、验证、可信、自主、联邦。四轴指标（结果 / 合规 / 对账 / 稳定性）需达标方可晋升。

- **New.B Economy System** -- Internal simulated currency with mining rewards, task payouts, market transactions, and Bitcoin-style halving schedule.
  **New.B 经济系统** -- 内部模拟货币，含挖矿奖励、任务报酬、市场交易和比特币式减半计划。

- **Node Identity (DID-based)** -- Ed25519 keypair generation, `did:newclaw:<hex32>` format, AES-256-GCM encrypted keystore.
  **节点身份（基于 DID）** -- Ed25519 密钥对生成，`did:newclaw:<hex32>` 格式，AES-256-GCM 加密密钥存储。

- **LLM Provider Abstraction Layer** -- Pluggable provider system supporting Ollama (local), OpenAI, Anthropic, DeepSeek, and 14+ providers. Swap models without changing governance logic.
  **LLM 供应商抽象层** -- 可插拔供应商系统，支持 Ollama（本地）、OpenAI、Anthropic、DeepSeek 及 14+ 供应商。切换模型无需改动治理逻辑。

- **Trinity Orchestrator** -- Real pipeline replacing setTimeout stubs. LLM provider bridge for actual AI responses with role-specific system prompts.
  **Trinity Orchestrator** -- 替换 setTimeout 桩的真实流水线。LLM 供应商桥接层，提供角色专属系统提示词的真实 AI 响应。

- **Governance Persistence** -- localStorage-based persistence (Stage 0) with file JSON/JSONL export for Stage 1+ backup and migration.
  **治理持久化** -- 基于 localStorage 的持久化（Stage 0），支持文件 JSON/JSONL 导出用于 Stage 1+ 备份和迁移。

- **9 Trinity UI Views (all in Chinese)** -- Team Chat, Dashboard, Knowledge Market, Governance Ledgers, Outcome Oracle, Permission Matrix, Node Promotion, Node Identity, Economy.
  **9 个 Trinity UI 视图（全中文）** -- 团队群聊、仪表盘、知识市场、治理账本、结果预言机、权限矩阵、节点晋升、节点身份、经济系统。

- **532 Unit Tests** -- Comprehensive test coverage across all 15 engine modules with Vitest.
  **532 个单元测试** -- Vitest 覆盖全部 15 个引擎模块的综合测试。

- **Landing Page** -- Official website landing page with feature showcase and quick-start guide.
  **官网 Landing Page** -- 官方网站着陆页，含功能展示和快速入门指南。

- **API Reference Documentation** -- Complete API reference for all 65+ exported engine functions.
  **API 参考文档** -- 全部 65+ 导出引擎函数的完整 API 参考。

### Security / 安全

- **8/8 security vulnerabilities fixed** -- All identified security issues resolved before release.
  **8/8 安全漏洞修复** -- 所有已识别安全问题在发布前修复。

- **Signature verification (HMAC simulation)** -- HMAC-based message signing for inter-module integrity checks.
  **签名验证（HMAC 模拟）** -- 基于 HMAC 的消息签名，用于模块间完整性校验。

- **Math.random downgrade removed** -- All cryptographic randomness now uses `crypto.getRandomValues()` instead of `Math.random()`.
  **Math.random 降级移除** -- 所有加密随机数现使用 `crypto.getRandomValues()` 替代 `Math.random()`。

- **Balance cap protection** -- Upper-bound enforcement on New.B balances to prevent overflow and economic exploits.
  **余额上限保护** -- New.B 余额上限强制执行，防止溢出和经济攻击。

- **128-bit hash upgrade** -- Hash chain upgraded from basic hashing to 128-bit minimum for ledger integrity.
  **128-bit 哈希升级** -- 哈希链从基础哈希升级到 128-bit 最低标准，保障账本完整性。

- **API key closure protection** -- API keys stored in closures, preventing accidental exposure through serialization or logging.
  **API 密钥闭包保护** -- API 密钥存储在闭包中，防止因序列化或日志记录意外泄露。

- **LLM output sanitization** -- All LLM-generated content sanitized before rendering to prevent XSS and injection attacks.
  **LLM 输出消毒** -- 所有 LLM 生成内容在渲染前消毒，防止 XSS 和注入攻击。

- **localStorage integrity verification** -- Hash-based integrity checks on persisted governance state to detect tampering.
  **localStorage 完整性校验** -- 基于哈希的持久化治理状态完整性校验，检测篡改行为。

### Known Issues (已知问题)
- 原始 v1.1.0 代码的 34 个测试因 zustand persist + jsdom localStorage 兼容性问题失败。这些测试与 V6 模块无关，V6 的 532 个测试全部通过。
- HMAC 完整性校验使用简单 checksum（非密码学级），生产环境建议升级为 Web Crypto API HMAC-SHA256。

### Fixed / 修复

- **Identity mismatch between wizard and adapter** -- Genesis wizard and backend adapter now share a unified identity source, preventing first-run identity conflicts.
  **创世向导与适配器的身份不匹配** -- 创世向导和后端适配器现在共享统一身份源，防止首次运行身份冲突。

- **Browser-mode crash (window.electron guard)** -- Added `window.electron` existence checks throughout the codebase, preventing crashes when running in browser-only development mode.
  **浏览器模式崩溃（window.electron 守卫）** -- 全代码库添加 `window.electron` 存在性检查，防止在纯浏览器开发模式下崩溃。

- **StubProvider realistic output (15 role-specific variants)** -- StubProvider now generates 15 distinct role-specific response templates instead of generic placeholder text.
  **StubProvider 真实输出（15 个角色专属变体）** -- StubProvider 现生成 15 种不同的角色专属响应模板，替代通用占位文本。

- **All 31 Sprint 1 defects resolved** -- Complete resolution of all defects identified during Sprint 1 QA cycle.
  **全部 31 个 Sprint 1 缺陷修复** -- Sprint 1 QA 周期中识别的所有缺陷全部修复。
