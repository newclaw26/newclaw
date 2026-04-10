# NewClaw v7.0 技术架构规格书

> 版本: 7.0-draft | 日期: 2026-04-10 | 状态: Proposed

---

## 1. 系统架构图

```
+===================================================================+
|                     用户界面层 (React + Zustand + Tailwind)          |
|  Dashboard | Trinity | Ledgers | Market | NodePanel                |
+===========================|=======================================+
                            | useV6Store (Zustand)
+===========================|=======================================+
|                     适配器层 (src/lib/v6/adapter.ts)                |
|  fetchIdentity | fetchNewBBalance | fetchPooStats | syncBackend   |
+===========================|=======================================+
                            | IPC / HTTP localhost:13220 + Bearer Token
+===========================|=======================================+
|                     Host API (Electron Main Process)               |
|  Express Router: /api/trinity/*  (40+ 端点)                       |
+===========================|=======================================+
                            |
+------+-------+--------+--+----+----------+-----------+-----------+
| L0   | L1    | L2     | L3    | L4       | L5        | Market    |
| 宪法 | 引擎   | 账本    | 预言机 | 权限熔断  | 节点晋升   | 知识市场   |
+------+-------+--------+-------+----------+-----------+-----------+
| constitution | ledger | oracle | fuse-matrix | promotion | market |
| .ts    engine.ts  .ts     .ts        .ts          .ts      .ts   |
+==================================================================+
                            |
+===========================|=======================================+
|                     持久化层                                       |
|  localStorage(S0) | 文件系统JSON/JSONL(S1) | 链上哈希锚定(S2+)     |
+===========================|=======================================+
                            |
+===========================|=======================================+
|  Docker沙盒 | LLM API(Ollama) | 区块链节点(测试网) | 蜂群(libp2p) |
+===================================================================+
```

---

## 2. 模块清单

| # | 模块 | 职责 | 输入接口 | 输出接口 | 依赖 | 实现方 | 关键类型 (v6.ts) |
|---|------|------|---------|---------|------|-------|-----------------|
| 1 | Constitution | 管理目标/约束/权重/权限规则 | `ConstitutionalGoal`, `Constraint`, `ValuePriority` | `Constitution`, `PermissionLevel` | 无 | B队 | `Constitution`, `AuthorityRule`, `DoneCriteria` |
| 2 | Trinity Engine | 三AI编排: proposal->audit->approval->execution->review->settled | 任务标题, 提案内容, 审计意见, 审批决策 | `TrinityTask`, `TrinityOutput`, `PipelineResult`, `V6Event` | Constitution | B队+A队 | `TrinityAgent`, `TrinityTask`, `TrinityOutput`, `TrinityPhase`, `TaskStatus` |
| 3 | Governance | 六本账本管理 (证据/价值/债务/时序/判例/经济) | 各条目原始数据 | `GovernanceLedgers`, 查询结果 | 无 | B队+A队 | `EvidenceEntry`, `EvidenceGrade`, `ValueEntry`, `DebtEntry`, `TemporalEntry`, `CaseLawEntry`, `LocalLedgerEntry` |
| 4 | Identity | 节点密钥生成、身份绑定、创世序列 | 创世请求 | nodeId, publicKey | 无 | A队 | adapter定义: `HostIdentity` |
| 5 | NewB | New.B货币发行/余额/减半 | 挖矿产出, 市场交易 | 余额, 交易历史 | Oracle, Identity | A队 | `LocalLedgerEntry`(currency='NEW.B') |
| 6 | Oracle/PoO | OutcomeReport生成/评估/结算/争议 | `TrinityTask`, 实际结果, 验证方法 | `OutcomeReport` | Governance | B队+A队 | `OutcomeReport`, `OracleRule`, `OracleVerdict`, `CreditTarget` |
| 7 | Market | Playbook上架/购买/执行 | 已完成任务, 购买请求 | `PlaybookListing`, `MarketOrder`, `MarketState` | Governance, Trinity | B队+A队 | market.ts自定义: `PlaybookListing`, `MarketOrder` |
| 8 | Fuse Matrix | L0-L4权限检查/审批/熔断 | `PermissionLevel`, 审批决策 | `{allowed, fuse, reason}`, `PermissionRequest` | Constitution | B队 | `PermissionFuse`, `PermissionRequest`, `PermissionApproval` |
| 9 | Promotion | Stage 0-4晋升评估/指标/执行 | outcomes, ledgers, requests, tasks | `NodeStatus`, `PromotionProgress` | Oracle, Governance, Fuse | B队 | `NodeStatus`, `NodeStage`, `PromotionProgress`, `NodeMetrics` |
| 10 | Sandbox | Docker沙盒执行AI生成代码 | 代码, 资源配置 | 执行结果 | Trinity, Fuse | **未实现** | 待定义: `SandboxConfig`, `SandboxResult` |
| 11 | Swarm | 节点发现/知识传输/联邦防御 | 节点身份, 对等列表 | 连接状态, 跨节点订单 | Identity, Market | **未实现** | 待定义: `SwarmPeer`, `SwarmMessage` |

---

## 3. 数据流图 (任务全生命周期)

```
用户输入目标
    |
[1] createTask(title, desc) --> TrinityTask{phase:'proposal', status:'draft'}
    |
[2] runProposalPhase(task, content)
    | AI-1 输出 TrinityOutput(type:'task-draft')
    | --> phase:'audit', status:'pending-audit'
    |
[3] runAuditPhase(task, constitution, findings, riskLevel)
    | AI-2 输出 TrinityOutput(type:'audit-opinion')
    | getPermissionLevelForAction() --> PermissionLevel
    | L4或critical --> blockTask, 终止
    | --> phase:'approval', status:'pending-approval'
    |
[4] runApprovalPhase(task, constitution, approved, budget)
    | AI-3 输出 TrinityOutput(type:'task-charter')
    | 含'human' --> 阻塞等待人类双签
    | --> phase:'execution', status:'executing'
    |
[5] 沙盒执行 --> 产出结果 --> phase:'review'
    |
[6] generateOutcomeReport(task, result, method, grade)
    | --> OutcomeReport{verdict:'pending-review'}
    |
[7] evaluateOutcome(outcome, rules, ledgers)
    | 按creditTarget降序遍历OracleRule, meetsRule检查
    | --> verdict:'settleable'|'rejected', creditTarget:'local'|'testnet'|'mainnet'
    |
[8] settleOutcome(outcome) --> settledAt写入
    +-> addLocalLedgerEntry() 记录经济账
    +-> addEvidence() 记录证据链
    +-> calculatePromotionProgress() 更新晋升
    +-> phase:'settled'
```

---

## 4. 接口契约

### 4.1 Constitution (`src/lib/v6/constitution.ts`)

```typescript
function createDefaultConstitution(): Constitution
function addGoal(c: Constitution, goal: Omit<ConstitutionalGoal, 'id'|'createdAt'|'updatedAt'>): Constitution
function addConstraint(c: Constitution, constraint: Omit<Constraint, 'id'>): Constitution
function updateValueWeights(c: Constitution, values: ValuePriority[]): Constitution  // sum必须=100
function getPermissionLevelForAction(c: Constitution, action: string): PermissionLevel
function getRequiredApprovals(c: Constitution, level: PermissionLevel): ApprovalRequirement[]
function completeMilestone(c: Constitution, goalId: string, milestoneId: string): Constitution
function validateConstitution(c: Constitution): string[]  // 返回错误列表, 空=通过
```

### 4.2 Trinity Engine (`src/lib/v6/engine.ts`)

```typescript
function createTrinityAgents(): Record<'ai1'|'ai2'|'ai3', TrinityAgent>
function createTask(title: string, desc: string, createdBy?: TrinityRole, perm?: PermissionLevel): TrinityTask
function advanceTaskPhase(task: TrinityTask): TrinityTask
function blockTask(task: TrinityTask, reason: string): TrinityTask
function failTask(task: TrinityTask, reason: string): TrinityTask
function createOutput(taskId: string, role: TrinityRole, type: TrinityOutputType, content: string, meta?: Record<string, unknown>): TrinityOutput
function runProposalPhase(task: TrinityTask, content: string): PipelineResult
function runAuditPhase(task: TrinityTask, c: Constitution, findings: string, risk?: 'low'|'medium'|'high'|'critical'): PipelineResult
function runApprovalPhase(task: TrinityTask, c: Constitution, approved: boolean, budget?: number): PipelineResult
function updateAgentStatus(agent: TrinityAgent, status: TrinityAgent['status'], task?: string): TrinityAgent
function recordAgentCompletion(agent: TrinityAgent, responseTimeMs: number): TrinityAgent
```

### 4.3 Governance Ledger (`src/lib/v6/ledger.ts`)

```typescript
function createEmptyLedgers(): GovernanceLedgers
// Evidence
function addEvidence(l: GovernanceLedgers, conclusion: string, source: string, grade: EvidenceGrade, verifier: TrinityRole|'human', taskId: string, tags?: string[], expiresAt?: string): GovernanceLedgers
function getActiveEvidence(l: GovernanceLedgers): EvidenceEntry[]
function getEvidenceByGrade(l: GovernanceLedgers, minGrade: EvidenceGrade): EvidenceEntry[]
// Value
function addValueAssessment(l: GovernanceLedgers, taskId: string, goalAlign: number, revenue: number, cost: number, risk: number): GovernanceLedgers
function getTopPriorityTasks(l: GovernanceLedgers, limit?: number): ValueEntry[]
// Debt
function addDebt(l: GovernanceLedgers, cat: DebtEntry['category'], desc: string, impact: DebtEntry['impact'], from: string, reviewDate: string): GovernanceLedgers
function resolveDebt(l: GovernanceLedgers, debtId: string): GovernanceLedgers
function getOpenDebts(l: GovernanceLedgers): DebtEntry[]
// Temporal + CaseLaw + LocalLedger
function addTemporalEntry(l: GovernanceLedgers, conclusionId: string, effectiveAt: string, expiresAt: string, cycle: string, deps?: string[]): GovernanceLedgers
function addCaseLaw(l: GovernanceLedgers, cat: CaseLawEntry['category'], title: string, desc: string, severity: CaseLawEntry['severity'], taskIds: string[], rootCause?: string, resolution?: string, lessons?: string[]): GovernanceLedgers
function addLocalLedgerEntry(l: GovernanceLedgers, type: LocalLedgerEntry['type'], amount: number, currency: LocalLedgerEntry['currency'], taskId: string, desc: string, counterparty?: string): GovernanceLedgers
function getBalance(l: GovernanceLedgers, currency: LocalLedgerEntry['currency']): number
function getLedgerSummary(l: GovernanceLedgers): LedgerSummary
```

### 4.4 Oracle (`src/lib/v6/oracle.ts`)

```typescript
function createDefaultOracleRules(): OracleRule[]
function generateOutcomeReport(task: TrinityTask, result: string, method: string, grade: EvidenceGrade): OutcomeReport
function evaluateOutcome(o: OutcomeReport, rules: OracleRule[], l: GovernanceLedgers): OutcomeReport
function settleOutcome(o: OutcomeReport): OutcomeReport  // throws if !settleable
function disputeOutcome(o: OutcomeReport, reason: string): OutcomeReport
function getOracleStats(outcomes: OutcomeReport[]): {total, settled, settleable, rejected, disputed, pending, byTarget}
```

### 4.5 Fuse Matrix + Market + Promotion (精简签名)

```typescript
// fuse-matrix.ts
function createDefaultFuseMatrix(): PermissionFuse[]
function checkPermission(m: PermissionFuse[], level: PermissionLevel): {allowed: boolean; fuse: PermissionFuse; reason: string}
function canAutoExecute(m: PermissionFuse[], level: PermissionLevel): boolean
function createPermissionRequest(taskId: string, by: TrinityRole, level: PermissionLevel, action: string, desc: string): PermissionRequest
function addApproval(req: PermissionRequest, approver: TrinityRole|'human', decision: 'approve'|'deny', reason?: string): PermissionRequest
function isFullyApproved(req: PermissionRequest, m: PermissionFuse[]): boolean
function resolveRequest(req: PermissionRequest, m: PermissionFuse[]): PermissionRequest

// market.ts
function createEmptyMarket(): MarketState
function createPlaybookListing(task: TrinityTask, content: string, price: number, cat: string, tags?: string[]): PlaybookListing
function listPlaybook(m: MarketState, listing: PlaybookListing): MarketState
function purchasePlaybook(m: MarketState, listingId: string, buyer: string): {market: MarketState; order: MarketOrder|null; error?: string}
function recordMarketTransaction(l: GovernanceLedgers, order: MarketOrder, side: 'buyer'|'seller'): GovernanceLedgers

// promotion.ts
function createInitialNodeStatus(): NodeStatus
function calculateNodeMetrics(outcomes: OutcomeReport[], l: GovernanceLedgers, reqs: PermissionRequest[], startTime: string, tasks?: TrinityTask[]): NodeMetrics
function checkPromotionEligibility(ns: NodeStatus, outcomes: OutcomeReport[], l: GovernanceLedgers, reqs: PermissionRequest[]): {eligible: boolean; reasons: string[]}
function promoteNode(ns: NodeStatus): NodeStatus
```

### 4.6 Adapter (前后端桥接, `src/lib/v6/adapter.ts` -- 待实现)

```typescript
async function fetchIdentity(): Promise<{nodeId: string; publicKey: string; createdAt: string}>
async function fetchGenesisStatus(): Promise<{isComplete: boolean; hasIdentity: boolean; hasEconomy: boolean}>
async function fetchNewBBalance(): Promise<{balance: number}>
async function fetchPooStats(): Promise<{totalTasks: number; verified: number; rejected: number; pending: number; score: number}>
async function fetchEvidence(level?: string): Promise<EvidenceEntry[]>
async function fetchDashboard(): Promise<V6SystemState>
async function fetchPlaybooks(): Promise<PlaybookListing[]>
async function fetchSwarmPeers(): Promise<SwarmPeer[]>
```

---

## 5. 持久化策略

| 数据 | Stage 0 (模拟) | Stage 1 (测试网) | Stage 2+ (真实) |
|------|---------------|-----------------|----------------|
| V6SystemState | Zustand persist -> localStorage | 文件系统 JSON | 文件 + 链上哈希锚定 |
| GovernanceLedgers | localStorage | 独立 .jsonl 文件 | 文件 + 区块链哈希存证 |
| OutcomeReport[] | localStorage | OUTCOMES/ 目录 | 文件 + reconciliationHash 上链 |
| Constitution | localStorage | CONSTITUTION.json (版本化) | 文件 + 变更上链 |
| MarketState | localStorage | SQLite | 分布式市场合约 |
| Identity 密钥 | 内存模拟 | keystore.enc (AES-256-GCM) | HSM 或加密文件 |

**关键规则**: (1) backendConnected=true 后禁用 localStorage 同步; (2) 账本 append-only 不可改历史; (3) 每72h 熵减 GC, H1/H2 证据永久保留

---

## 6. 安全架构

### 6.1 权限模型

| 等级 | 名称 | 审批要求 | 自动执行 | 示例 |
|------|------|---------|---------|------|
| L0 | 自主执行 | 无 | 是 | 写日志, 更新草稿 |
| L1 | 审计即可 | ai2 | 否 | 只读API, 沙盒测试 |
| L2 | 双签审批 | ai2, ai3 | 否 | 测试网转账, 小额购买 |
| L3 | 人类签署 | ai2, ai3, human | 否 | 真实钱包, 外部合约 |
| L4 | 永久禁止 | -- | 否(disabled) | 绕过约束, 自我提权, 删除账本 |

### 6.2 判定流程

```
action -> getPermissionLevelForAction(constitution, action)
       -> 模式匹配 authority[].actionPattern -> PermissionLevel
       -> checkPermission(matrix, level)
          L4 -> 直接拒绝
          !enabled -> 拒绝
          autoExecute -> 放行
          else -> 返回所需审批人列表 -> 收集approvals -> isFullyApproved
```

### 6.3 密钥管理

- **Stage 0**: 无真实密钥, UUID模拟
- **Stage 1+**: `keystore.enc` (AES-256-GCM), 密码由宿主提供, `/api/trinity/identity/unlock|lock` 控制
- **Stage 2+**: HSM可选, L3操作需人类双签 + 密钥解锁态

### 6.4 沙盒隔离 (v7新增, 待实现)

```typescript
interface SandboxConfig {
  image: string; networkMode: 'none'|'restricted'|'host'
  cpuLimit: number; memoryLimitMB: number; timeoutSeconds: number
  readonlyMounts: string[]; env: Record<string, string>
}
interface SandboxResult {
  exitCode: number; stdout: string; stderr: string
  durationMs: number; resourceUsage: {cpuPercent: number; memoryMB: number}
}
// electron/sandbox/runner.ts
async function executeSandbox(config: SandboxConfig, script: string): Promise<SandboxResult>
```

资源限制: CPU 1核, RAM 512MB, 超时 300秒, Stage 0-1 无网络, Stage 2+ 白名单域名

---

## 7. 扩展性设计

### 7.1 单节点到蜂群路径

| 阶段 | 拓扑 | 技术要求 | 依赖模块 |
|------|------|---------|---------|
| Phase 1 (当前) | 单节点 | localStorage/文件系统, 模拟市场 | 全部已实现模块 |
| Phase 2 | 双节点对等 | libp2p (mDNS局域网/DHT广域网), 签名/验签 | Identity, Market |
| Phase 3 | N节点蜂群 | 联邦共识投票, Federated Debt Clearing, 僵尸清理(180天) | Swarm, Identity, Market, NewB |

### 7.2 蜂群接口 (待实现)

```typescript
interface SwarmPeer {
  nodeId: string; publicKey: string; addresses: string[]  // multiaddr
  stage: NodeStage; reputation: number; lastSeen: string
}
interface SwarmMessage {
  id: string; from: string; to: string|'broadcast'
  type: 'market-listing'|'market-order'|'debt-clearing'|'dispute'|'heartbeat'
  payload: unknown; signature: string; timestamp: string
}
// electron/swarm/network.ts
async function discoverPeers(): Promise<SwarmPeer[]>
async function sendMessage(msg: Omit<SwarmMessage, 'id'|'signature'|'timestamp'>): Promise<void>
async function broadcastListing(listing: PlaybookListing): Promise<void>
function onMessage(handler: (msg: SwarmMessage) => void): () => void
```

### 7.3 扩展性保障

- **无状态 API**: Host API 不持有会话状态, 天然支持多实例
- **事件溯源**: V6Event 枚举 (12种事件类型) 可升级为分布式事件总线
- **幂等写入**: 所有账本条目使用 UUID 主键, 重复写入可检测丢弃

---

## 附录: V6SystemState 根类型

```typescript
// src/types/v6.ts -- A/B双方共享, 变更需双方确认
interface V6SystemState {
  constitution: Constitution
  trinity: { ai1: TrinityAgent; ai2: TrinityAgent; ai3: TrinityAgent }
  tasks: TrinityTask[]
  ledgers: GovernanceLedgers
  outcomes: OutcomeReport[]
  oracleRules: OracleRule[]
  permissionMatrix: PermissionFuse[]
  permissionRequests: PermissionRequest[]
  nodeStatus: NodeStatus
}
```
