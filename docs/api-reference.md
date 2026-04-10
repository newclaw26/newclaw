# NewClaw V6 Engine API Reference

> 14 模块 / 80+ 导出函数 / 三 AI 节点治理引擎完整接口

## 快速上手：核心函数串联示例

```typescript
import { createDefaultConstitution, getPermissionLevelForAction } from '@/lib/v6/constitution'
import { createTrinityAgents, createTask, runProposalPhase, runAuditPhase } from '@/lib/v6/engine'
import { createEmptyLedgers, addEvidence, getLedgerSummary } from '@/lib/v6/ledger'
import { generateOutcomeReport, evaluateOutcome } from '@/lib/v6/oracle'
import { createDefaultFuseMatrix, checkPermission } from '@/lib/v6/fuse-matrix'

// 1. 初始化宪法与三 AI 节点
const constitution = createDefaultConstitution()
const agents = createTrinityAgents()
// 2. 创建任务，推进流水线
const task = createTask('分析 API 集成', '自动化 REST API 测试流水线')
const { task: auditReady } = runProposalPhase(task, '使用 OpenAPI 自动生成客户端 SDK')
// 3. 审计阶段
const ledgers = createEmptyLedgers()
const { task: approved } = runAuditPhase(auditReady, constitution, '风险低，建议通过', 'low')
// 4. 检查权限
const level = getPermissionLevelForAction(constitution, '分析 API 集成')
const { allowed } = checkPermission(createDefaultFuseMatrix(), level)
// 5. 证据 -> 结果报告 -> Oracle 评估
const withEvidence = addEvidence(ledgers, 'API 测试通过', 'sandbox', 'H2', 'ai2-auditor', task.id)
const report = generateOutcomeReport(approved, 'SDK 生成完成', 'automated-test', 'H2')
const evaluated = evaluateOutcome(report, [], withEvidence)
console.log(getLedgerSummary(withEvidence))
```

---

## constitution.ts -- 宪法管理层 (Layer 0)

**`createDefaultConstitution(): Constitution`** -- 创建包含默认目标、约束、权重和权限规则的宪法实例。

**`addGoal(constitution, goal): Constitution`** -- 向宪法添加治理目标。`goal` 类型为 `Omit<ConstitutionalGoal, 'id'|'createdAt'|'updatedAt'>`。
```typescript
const updated = addGoal(constitution, { phase: 'MVP', description: '完成测试网', milestones: [] })
```

**`addConstraint(constitution, constraint): Constitution`** -- 添加治理约束条款。
```typescript
addConstraint(constitution, { category: 'system', description: '禁止直连主网', enforceable: true, severity: 'hard' })
```

**`updateValueWeights(constitution, values: ValuePriority[]): Constitution`** -- 更新价值权重。总和必须为 100，否则抛异常。

**`getPermissionLevelForAction(constitution, action: string): PermissionLevel`** -- 匹配操作文本返回权限等级 `L0`-`L4`。
```typescript
getPermissionLevelForAction(constitution, 'testnet-transfer 100 tokens') // => 'L2'
```

**`getRequiredApprovals(constitution, level): string[]`** -- 获取权限等级的审批人列表。

**`completeMilestone(constitution, goalId, milestoneId): Constitution`** -- 标记里程碑完成。

**`validateConstitution(constitution): string[]`** -- 校验宪法完整性，空数组 = 通过。

---

## engine.ts -- Trinity 三 AI 引擎 (Layer 1)

**`createTrinityAgents(): Record<'ai1'|'ai2'|'ai3', TrinityAgent>`** -- 创建扩张者、审计者、治理者三个代理。

**`createTask(title, description, createdBy?, permissionLevel?): TrinityTask`** -- 创建任务，初始阶段 `proposal`。`createdBy` 默认 `'ai1-expander'`，`permissionLevel` 默认 `'L0'`。

**`advanceTaskPhase(task): TrinityTask`** -- 推进阶段：proposal -> audit -> approval -> execution -> review -> settled。

**`blockTask(task, reason): TrinityTask`** -- 阻止任务，附带原因。

**`failTask(task, reason): TrinityTask`** -- 标记任务失败。

**`createOutput(taskId, role, type, content, metadata?): TrinityOutput`** -- 创建任务产出记录。

**`runProposalPhase(task, proposalContent): PipelineResult`** -- AI-1 生成方案，自动推进到审计阶段。返回 `{ task, events, blocked }`。

**`runAuditPhase(task, constitution, auditFindings, riskLevel?): PipelineResult`** -- AI-2 审核风险。`riskLevel='critical'` 自动阻断。返回含 `permissionRequired` 字段。

**`runApprovalPhase(task, constitution, approved, budgetAllocation?): PipelineResult`** -- AI-3 最终决策。L3 级需 human 双签。

**`updateAgentStatus(agent, status, currentTask?): TrinityAgent`** -- 更新代理状态。

**`recordAgentCompletion(agent, responseTimeMs): TrinityAgent`** -- 记录完成，更新滚动平均响应时间。

---

## ledger.ts -- 治理账本 (Layer 2)

**`createEmptyLedgers(): GovernanceLedgers`** -- 创建空的六本账本（evidence/value/debt/temporal/caseLaw/localLedger）。

**`addEvidence(ledgers, conclusion, source, grade, verifier, taskId, tags?, expiresAt?): GovernanceLedgers`** -- 添加证据。`grade`: `H1`|`H2`|`H3`|`H4`，`verifier`: `TrinityRole|'human'`。

**`getActiveEvidence(ledgers): EvidenceEntry[]`** -- 获取未过期证据。

**`getEvidenceByGrade(ledgers, minGrade): EvidenceEntry[]`** -- 按最低等级过滤。

**`addValueAssessment(ledgers, taskId, goalAlignment, expectedRevenue, resourceCost, riskExposure): GovernanceLedgers`** -- 添加价值评估，自动算优先级。

**`getTopPriorityTasks(ledgers, limit?): ValueEntry[]`** -- 获取优先级最高的任务（默认前 10）。

**`addDebt(ledgers, category, description, impact, deferredFrom, reviewDate): GovernanceLedgers`** -- 记录技术债务。

**`resolveDebt(ledgers, debtId): GovernanceLedgers`** -- 解决债务。

**`getOpenDebts(ledgers): DebtEntry[]`** -- 获取未解决债务。

**`addTemporalEntry(ledgers, conclusionId, effectiveAt, expiresAt, reviewCycle, deps?): GovernanceLedgers`** -- 添加时间线条目。

**`refreshTemporalStatuses(ledgers): GovernanceLedgers`** -- 刷新时间线状态（active/expired/pending-review）。

**`addCaseLaw(ledgers, category, title, description, severity, relatedTaskIds, ...): GovernanceLedgers`** -- 添加案例法。

**`searchCaseLaw(ledgers, query): CaseLawEntry[]`** -- 按关键词搜索案例法。

**`addLocalLedgerEntry(ledgers, type, amount, currency, taskId, description, ...): GovernanceLedgers`** -- 添加交易记录。

**`getBalance(ledgers, currency): number`** -- 获取指定币种余额。

**`getLedgerSummary(ledgers): object`** -- 所有账本汇总统计。

---

## oracle.ts -- 结果预言机 (Layer 3)

**`createDefaultOracleRules(): OracleRule[]`** -- 三级结算规则：local(H3+/1验证) / testnet(H2+/2验证) / mainnet(H1+/3验证)。

**`generateOutcomeReport(task, actualResult, verificationMethod, evidenceGrade): OutcomeReport`** -- 生成结果报告，自动算 reconciliation hash。初始 `oracleVerdict: 'pending-review'`。

**`evaluateOutcome(outcome, rules, ledgers): OutcomeReport`** -- Oracle 评估：按规则从高到低匹配结算级别（mainnet > testnet > local > rejected）。

**`settleOutcome(outcome): OutcomeReport`** -- 结算。不可结算时抛异常。

**`disputeOutcome(outcome, reason): OutcomeReport`** -- 提出争议，状态设为 `'disputed'`。

**`getOracleStats(outcomes): object`** -- 统计：total/settled/rejected/disputed/pending，按 target 分类。

---

## fuse-matrix.ts -- 权限熔断矩阵 (Layer 4)

**`createDefaultFuseMatrix(): PermissionFuse[]`** -- 创建 L0-L4 五级矩阵。

**`checkPermission(matrix, level): { allowed, fuse, reason }`** -- 检查权限是否允许。
```typescript
const { allowed, reason } = checkPermission(matrix, 'L2')
// allowed: false, reason: 'Requires approval: ai2, ai3'
```

**`canAutoExecute(matrix, level): boolean`** -- 仅 L0 返回 true。

**`createPermissionRequest(taskId, requestedBy, level, action, description): PermissionRequest`** -- 创建权限申请。

**`addApproval(request, approver, decision, reason?): PermissionRequest`** -- 添加审批。`deny` 立即拒绝整个申请。

**`isFullyApproved(request, matrix): boolean`** -- 是否获得全部审批。支持 `ai2`/`ai2-auditor` 双向匹配。

**`resolveRequest(request, matrix): PermissionRequest`** -- 解析申请最终状态。

**`getPermissionStats(requests): object`** -- 权限统计含通过率。

**`getLevelLabel(level): string`** / **`getLevelColor(level): string`** -- UI 辅助。

---

## promotion.ts -- 节点晋升流水线 (Layer 5)

**`STAGE_CONFIG`** -- 阶段配置常量。stage-0 模拟 到 stage-4 联邦，含各阶段指标门槛。

**`createInitialNodeStatus(): NodeStatus`** -- 创建 stage-0 初始节点状态。

**`calculateNodeMetrics(outcomes, ledgers, permissionRequests, startTime, tasks?): NodeMetrics`** -- 计算节点运行指标。

**`calculatePromotionProgress(nodeStatus, outcomes, ledgers, permissionRequests): PromotionProgress`** -- 计算晋升进度：合规分/对账率/稳定性分/综合就绪度。

**`checkPromotionEligibility(nodeStatus, outcomes, ledgers, permissionRequests): { eligible, reasons }`** -- 检查晋升条件。

**`promoteNode(nodeStatus): NodeStatus`** -- 执行晋升，记录历史事件。

**`getStageNumber(stage): number`** / **`getStageColor(stage): string`** -- UI 辅助。

---

## market.ts -- 模拟知识市场

**`createEmptyMarket(): MarketState`** -- 创建空市场（初始 1000 SIM）。

**`createDemoMarket(): MarketState`** -- 带 3 个示例 listing 的演示市场。

**`createPlaybookListing(task, content, price, category, tags?): PlaybookListing`** -- 从任务创建上架条目。

**`listPlaybook(market, listing): MarketState`** / **`delistPlaybook(market, listingId): MarketState`** -- 上架/下架。

**`purchasePlaybook(market, listingId, buyer): { market, order, error? }`** -- 购买 Playbook，自动转账。余额不足或自买时返回错误。

**`executePlaybook(market, orderId, result): MarketState`** -- 记录执行结果。

**`recordMarketTransaction(ledgers, order, perspective): GovernanceLedgers`** -- 交易写入治理账本。buyer 负金额，seller 正。

**`getMarketStats(market): object`** -- 统计：listed/sold/totalVolume/totalOrders。

---

## identity.ts -- 身份模块

**`generateIdentity(): HostIdentity`** -- 生成节点身份（Genesis 序列）。Web Crypto API 生成 Ed25519 模拟密钥对。
```typescript
const id = generateIdentity() // id.nodeId => 'did:newclaw:a1b2c3...', id.address => 'ncw1...'
```

**`signMessage(key, message): string`** -- 签名消息（MVP 模拟：hash 实现）。

**`verifySignature(publicKey, message, signature): boolean`** -- 验证签名，拒绝空值和非 hex 输入。

**`deriveAddress(publicKey): string`** -- 派生 bech32 风格地址（`ncw1` 前缀，42 字符）。

**`exportIdentityAsFile(identity): string`** -- 导出公开信息 JSON（不含私钥）。

---

## economy.ts -- New.B 经济引擎

**`createEconomyState(): EconomyState`** -- 创建初始状态（含 100 New.B 创世奖励）。

**`issueReward(state, taskId, amount?): EconomyResult<{ state, transaction }>`** -- 发 PoO 挖矿奖励。每 100 次减半，最低 0.01。

**`spend(state, amount, description): EconomyResult<{ state, transaction }>`** -- 花费 New.B。

**`receive(state, amount, source): EconomyResult<{ state, transaction }>`** -- 接收 New.B。单笔上限 10,000。

**`getHalvingInfo(state): HalvingInfo`** -- 减半进度：纪元、剩余奖励数、当前/下期奖励率。

**`calculatePooScore(verified, rejected, total): number`** -- PoO 分数 0-100。公式：`(v/t)*100*(1-r/t)`。

**`getEconomyStatus(state): EconomyStatus`** -- UI 消费的经济状态快照。

**`exportEconomyAsFile(state): string`** / **`importEconomyFromFile(json): EconomyState|null`** -- 导入导出。

**`saveEconomyState(state)`** / **`loadEconomyState(): EconomyState|null`** / **`getOrCreateEconomyState(): EconomyState`** -- localStorage 持久化。

---

## poo-verifier.ts -- PoO 验证器

**`createPooState(config?): PooState`** -- 初始状态。默认执行门槛 85，废弃门槛 40。

**`submitForVerification(state, task, outcome): [PooState, PooTask]`** -- 提交验证，自动算优先级分数。

**`calculatePriorityScore(goalFit, pooOutcome, evidenceLevel, cost, debtImpact): number`** -- 白皮书公式：`(G*0.35+P*0.35+E*0.2)/(C+D*0.1)`。

**`finalizeVerification(state, taskId, passed): [PooState, PooTask]`** -- 标记 verified 或 rejected。

**`getPooStats(state): PooStats`** -- 聚合统计（total/verified/rejected/pending/平均分）。

**`scoreToEvidenceGrade(score): EvidenceGrade`** -- >=85=H1, >=65=H2, >=40=H3, <40=H4。

**`getOutcomeEvidenceGrade(state, taskId): EvidenceGrade|null`** -- 已终结任务的证据等级。

**`meetsExecutionThreshold(score, threshold?): boolean`** -- 是否达标（默认 85）。

**`evidenceGradeToScore(grade): number`** -- H1=100, H2=75, H3=50, H4=25。

---

## governance-persistence.ts -- 治理持久化层

**`saveToLocalStorage(ledgers)`** / **`loadFromLocalStorage(): GovernanceLedgers|null`** -- localStorage 读写，带 checksum 校验。

**`clearLocalStorage()`** -- 清除全部治理数据。

**`saveGovernanceToDisk(ledgers, basePath)`** / **`loadGovernanceFromDisk(basePath)`** -- 磁盘持久化接口（Electron 用，浏览器空操作）。

**`exportAsFiles(ledgers): Record<string, string>`** -- 导出为文件映射（EVIDENCE.jsonl 等）。

**`importFromFiles(files): GovernanceLedgers`** -- 从文件映射导入。

**`entropyGC(ledgers, maxAgeMs?): GovernanceLedgers`** -- 熵减 GC：清除过期 temporal/evidence。默认 7 天。

**`computeChecksum(data): string`** -- 轻量篡改检测哈希。

**`setStorageOverride(storage)`** -- 注入自定义 Storage（测试用）。

---

## llm-provider.ts -- LLM 供应商抽象层

**接口 `LLMProvider`** -- 契约：`generate(prompt, systemPrompt, options?) -> LLMResponse` + `isAvailable(): boolean`。

**`StubProvider`** -- 零延迟模拟，返回 `[模拟响应]` 前缀文本，始终可用。

**`OllamaProvider(baseUrl?, model?)`** -- 本地 Ollama，默认 `localhost:11434` / `llama3`。

**`OpenAIProvider(getApiKey, baseUrl?, model?)`** -- OpenAI/OpenRouter/Azure 兼容。

**`ProviderRegistry`** -- 有序降级链。`register(p)` 注册，`getBestAvailable()` 返回首个可用供应商。

**`createDefaultRegistry(): ProviderRegistry`** -- 默认链：Ollama -> Stub。

**`TRINITY_PROMPTS`** -- 三角色系统提示词常量。

---

## trinity-orchestrator.ts -- Trinity 编排器

**`sanitizeLLMOutput(content): string`** -- 清除 HTML/script，防 XSS。

**`buildPrompt(role, task, context?): string`** -- 为角色构建 LLM 提示词。

**`generateRoleResponse(provider, role, task, context?): Promise<RoleResponse>`** -- 单阶段 LLM 调用。AI-2 温度 0.3，其余 0.7。

**`runFullTrinityPipeline(provider, title, desc, callbacks?): Promise<OrchestratorPipelineResult>`** -- 完整三阶段：提案->审计->决策。
```typescript
const result = await runFullTrinityPipeline(provider, '分析竞品', '调研定价策略', {
  onPhaseStart: (role) => console.log(`${role} 开始`),
})
```

**`createDefaultOrchestratorConfig(): OrchestratorConfig`** -- 默认配置（StubProvider，autoRun=false）。

---

## adapter.ts -- 后端适配器桩层

所有函数均为 `async`，内置 50-200ms 模拟延迟。A-team 将替换为真实 HTTP 调用。

**`fetchIdentity(): Promise<HostIdentity>`** -- 获取/首次创建节点身份。

**`fetchGenesisStatus(): Promise<{ isComplete, hasIdentity, hasEconomy }>`** -- 创世仪式状态。

**`fetchNewBBalance(): Promise<EconomyStatus>`** -- New.B 余额和经济指标。

**`fetchPooStats(): Promise<PooStats>`** -- PoO 验证统计。

**`fetchSandboxStatus(): Promise<{ available, engine }>`** -- 沙箱可用性（Electron 返回 subprocess）。

**`setAdapterPooState(state)`** / **`getAdapterPooState(): PooState`** -- PoO 状态同步（Zustand 桥接）。

---

## 附录：速查表

### 类型

| 类型 | 所属 | 说明 |
|------|------|------|
| `Constitution` | types/v6 | 宪法：目标、约束、权重、权限 |
| `TrinityTask` | types/v6 | 任务：阶段、状态、产出、权限 |
| `GovernanceLedgers` | types/v6 | 六本账本集合 |
| `OutcomeReport` | types/v6 | 结果报告：评估、结算 |
| `PermissionFuse` / `PermissionRequest` | types/v6 | 权限熔断与申请 |
| `NodeStatus` | types/v6 | 节点阶段、指标、晋升历史 |
| `HostIdentity` | types/v6 | DID、公钥、地址 |
| `EconomyState` | economy.ts | 余额、减半、交易历史 |
| `PooState` | poo-verifier.ts | 任务 Map、配置 |
| `LLMProvider` | llm-provider.ts | LLM 供应商接口 |
| `MarketState` | market.ts | listing、order、余额 |

### 权限等级

| 等级 | 名称 | 审批要求 | 自动执行 |
|------|------|----------|----------|
| L0 | 纯内部操作 | 无 | 是 |
| L1 | 受限外部 | AI-2 | 否 |
| L2 | 低值真实 | AI-2 + AI-3 | 否 |
| L3 | 高风险真实 | AI-2 + AI-3 + Human | 否 |
| L4 | 永久禁止 | -- | 永不 |

### 节点阶段

| 阶段 | 标签 | 最低结算数 | 合规分 |
|------|------|-----------|--------|
| stage-0 | 模拟节点 | 3 | 50% |
| stage-1 | 测试网 | 10 | 70% |
| stage-2 | 受限真实 | 25 | 80% |
| stage-3 | 认证市场 | 50 | 90% |
| stage-4 | 联邦节点 | 100 | 95% |
