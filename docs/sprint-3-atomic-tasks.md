# B-Team Sprint 3 原子任务清单

> 编制：高级项目经理（Claude Opus 4.6）
> 日期：2026-04-10
> 依据：NewClaw-v7.0 说明书第11/12章 + B队Sprint 3计划 + A队M2原子任务格式 + ab-integration-strategy.md + v6-types-contract.ts
> 目标：M1阶段（本周）——适配器桩、Store扩展、Identity/Economy新UI视图、类型冻结、全链路测试

---

## 前置数据摘要

### B队已完成基线

| 指标 | 结果 |
|------|------|
| 核心模块 | 7个（宪法/引擎/治理/Oracle/熔断/晋级/市场） |
| 测试 | 188/188 通过 |
| Store | 482行, 40+ actions |
| UI组件 | 4组件(659行) + 主页面(446行) |
| 国际化 | zh/v6.json (86键) |
| 类型契约 | v6-types-contract.ts (402行, 40+类型) |

### v7.0 第11.4节 B队需消费的A队接口

| 接口函数 | HTTP端点 | 返回类型 |
|----------|----------|----------|
| `fetchIdentity()` | GET `/api/trinity/identity` | `{ nodeId, publicKey, createdAt }` |
| `fetchGenesisStatus()` | GET `/api/trinity/genesis/status` | `{ isComplete, hasIdentity, hasEconomy }` |
| `fetchNewBBalance()` | GET `/api/trinity/economy/balance` | `{ balance: number }` |
| `fetchPooStats()` | GET `/api/trinity/poo/stats` | `{ totalTasks, verified, rejected, pending, score }` |
| `fetchDashboard()` | GET `/api/trinity/dashboard` | `V6SystemState` |

### Sprint 3 M1阶段范围

本周聚焦**桩实现**：A队后端尚在M2阶段开发Identity/NewB Provider，B队先用模拟数据跑通全链路（UI -> Store -> adapter桩），待A队Provider就绪后切换为HTTP调用。

---

## 任务清单

---

### Block A：适配器桩

---

#### S3-T1 创建适配器桩文件

**任务ID**：S3-T1
**负责人**：前端
**估算时间**：45 分钟
**优先级**：P0（后续所有Store/UI任务的数据源）
**依赖**：S3-T11（类型定义须先就绪）

**描述**：创建 `src/lib/v6/adapter.ts` 桩文件，实现 v7.0 说明书第11.4节定义的5个 async 函数。每个函数返回符合接口契约的模拟数据，模拟延迟 200-500ms 以贴近真实HTTP调用体验。后续A队后端就绪后，将桩替换为真实 `apiFetch()` 调用。

需实现的函数（全部返回硬编码模拟数据）：

1. `fetchIdentity()` — 返回 `{ nodeId: 'did:newclaw:<mock-hex32>', publicKey: '<mock-ed25519-pub>', createdAt: ISO字符串 }`
2. `fetchGenesisStatus()` — 返回 `{ isComplete: true, hasIdentity: true, hasEconomy: true }`
3. `fetchNewBBalance()` — 返回 `{ balance: 1000, stakedAmount: 200, pendingRewards: 50, halvingEpoch: 1, blockReward: 100, blocksUntilHalving: 8640 }`
4. `fetchPooStats()` — 返回 `{ totalTasks: 42, verified: 35, rejected: 3, pending: 4, score: 87.5 }`
5. `fetchDashboard()` — 返回完整 `V6SystemState`（复用现有Store默认值 + identity/economy新字段）

每个函数须包含 JSDoc 注释标明：(1) 对应A队HTTP端点 (2) 当前为桩实现 (3) 切换为真实调用的TODO标记。

**验收标准**：
- `src/lib/v6/adapter.ts` 文件创建完成
- 5个 async 函数均可正常调用并返回类型正确的模拟数据
- `pnpm run typecheck` 通过
- `pnpm run lint` 无新增错误
- 每个函数含 `// TODO: 替换为 apiFetch() 真实调用 — 等待A队M2-A12` 注释

**产出文件**：
- `src/lib/v6/adapter.ts`（新建）

---

#### S3-T2 在 Zustand Store 添加 adapter 调用 actions

**任务ID**：S3-T2
**负责人**：前端
**估算时间**：45 分钟
**优先级**：P0（UI视图依赖Store中的数据获取actions）
**依赖**：S3-T1, S3-T4

**描述**：在现有 `src/stores/v6.ts` 的 `useV6Store` 中添加5个新的 async actions，每个action调用 S3-T1 的 adapter 桩函数，将返回数据写入 Store 对应字段。

需添加的 actions：

1. `loadIdentity()` — 调用 `fetchIdentity()`，写入 `state.identity`
2. `loadNewBBalance()` — 调用 `fetchNewBBalance()`，写入 `state.economy`
3. `loadPooStats()` — 调用 `fetchPooStats()`，更新 PoO 统计面板数据
4. `syncBackend()` — 调用 `fetchDashboard()`，全量同步后端状态到 Store
5. `loadGenesisStatus()` — 调用 `fetchGenesisStatus()`，更新创世状态标志

每个 action 须包含：
- loading 状态管理（`isLoading` 字段）
- try/catch 错误处理（写入 `state.lastError`）
- 成功后清除 `lastError`

**验收标准**：
- 5个新 actions 在 Store 中可用
- 调用 `loadIdentity()` 后 `state.identity` 有值
- 调用 `loadNewBBalance()` 后 `state.economy` 有值
- 错误情况（adapter抛异常）被 `state.lastError` 捕获
- `pnpm run typecheck` 通过
- `pnpm run lint` 无新增错误

**产出文件**：
- `src/stores/v6.ts`（修改）

---

#### S3-T3 适配器单元测试

**任务ID**：S3-T3
**负责人**：质检
**估算时间**：30 分钟
**优先级**：P0
**依赖**：S3-T1

**描述**：为 S3-T1 的适配器桩文件编写单元测试，验证每个桩函数返回的数据格式符合 v6-types-contract.ts 中的类型定义。测试重点不是业务逻辑（桩没有业务逻辑），而是**返回数据结构的正确性**——确保后续替换为真实HTTP调用时，接口契约不变。

测试用例：

1. `fetchIdentity()` 返回对象含 `nodeId`(string, 以`did:newclaw:`开头)、`publicKey`(string)、`createdAt`(ISO格式字符串) — 3 case
2. `fetchGenesisStatus()` 返回对象含 `isComplete`(boolean)、`hasIdentity`(boolean)、`hasEconomy`(boolean) — 3 case
3. `fetchNewBBalance()` 返回对象含 `balance`(number, >=0)、`stakedAmount`(number)、`halvingEpoch`(number, >=1) — 4 case
4. `fetchPooStats()` 返回对象含 `totalTasks`(number)、`verified + rejected + pending <= totalTasks` — 3 case
5. `fetchDashboard()` 返回完整 `V6SystemState` 结构验证 — 2 case
6. 所有函数均为 async（返回 Promise） — 5 case
7. 模拟延迟验证：调用耗时 >= 100ms — 1 case

**验收标准**：
- `src/__tests__/adapter.test.ts` 创建完成
- 至少 21 个测试用例
- `pnpm test` 全部通过（含现有188个测试）
- 覆盖率 >= 90%（adapter.ts 文件范围内）

**产出文件**：
- `src/__tests__/adapter.test.ts`（新建）

---

### Block B：Store 扩展

---

#### S3-T4 在 V6SystemState 类型中添加 identity/economy 字段

**任务ID**：S3-T4
**负责人**：前端
**估算时间**：30 分钟
**优先级**：P0（Store actions 和 UI 视图都依赖这些类型）
**依赖**：S3-T11（类型定义须先就绪，但可同步进行：T11定义底层类型，T4将其整合进V6SystemState）

**描述**：在 `src/types/v6.ts` 的 `V6SystemState` 接口中添加 `identity` 和 `economy` 两个可选字段。这是类型层面的变更，不涉及运行时逻辑。

当前 `V6SystemState`（v6-types-contract.ts 第348行）：
```typescript
export interface V6SystemState {
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

需添加（均为可选字段，不破坏现有代码）：
```typescript
  identity?: IdentityState          // S3-T11 中定义
  economy?: EconomyState            // S3-T11 中定义
  sandbox?: SandboxState            // S3-T11 中定义（M2预留）
```

同时在 `V6View` 类型中添加两个新视图标识：
```typescript
export type V6View = '...' | 'identity' | 'economy'
```

**验收标准**：
- `V6SystemState` 新增 3 个可选字段
- `V6View` 新增 2 个视图标识
- 新字段均为可选（`?:`），不影响现有代码的类型检查
- `pnpm run typecheck` 通过（0错误）
- `pnpm run lint` 无新增错误
- 现有 188 测试全部通过（无回归）

**产出文件**：
- `src/types/v6.ts`（修改）

---

#### S3-T5 在 useV6Store 添加 identity/economy 相关 actions

**任务ID**：S3-T5
**负责人**：前端
**估算时间**：45 分钟
**优先级**：P0
**依赖**：S3-T4, S3-T2

**描述**：在 `src/stores/v6.ts` 的 Zustand Store 中为 identity 和 economy 模块添加状态管理 actions。这些 actions 处理本地状态变更，与 S3-T2 的后端同步 actions 互补。

需添加的 actions（本地状态操作）：

1. `clearIdentity()` — 清除 `state.identity` 为 null
2. `updateIdentityField(field, value)` — 部分更新 identity 字段
3. `setEconomyBalance(balance)` — 直接设置经济余额（用于测试/调试）
4. `resetEconomy()` — 重置经济状态为初始值
5. `setLoadingState(module, isLoading)` — 统一管理各模块加载状态

同时添加初始状态默认值：
```typescript
identity: null,        // 未加载前为 null
economy: null,         // 未加载前为 null
isLoading: { identity: false, economy: false, poo: false },
lastError: null,
```

**验收标准**：
- 5个新 actions 在 Store 中可用
- Store 初始状态包含 identity/economy/isLoading/lastError 字段
- actions 正确修改对应状态
- `pnpm run typecheck` 通过
- 现有测试不受影响

**产出文件**：
- `src/stores/v6.ts`（修改）

---

#### S3-T6 扩展 persist partialize 包含新字段

**任务ID**：S3-T6
**负责人**：前端
**估算时间**：15 分钟
**优先级**：P1
**依赖**：S3-T5

**描述**：Zustand `persist` 中间件的 `partialize` 配置决定哪些字段持久化到 localStorage。需将新增的 `identity` 和 `economy` 字段加入持久化范围，但排除运行时临时状态（`isLoading`、`lastError`）。

修改 Store 的 persist 配置：
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'v6-store',
    partialize: (state) => ({
      ...existingFields,
      identity: state.identity,    // 新增：持久化身份数据
      economy: state.economy,      // 新增：持久化经济数据
      // 排除: isLoading, lastError（运行时状态）
    }),
  }
)
```

**验收标准**：
- `identity` 和 `economy` 被 partialize 包含
- `isLoading` 和 `lastError` 被 partialize 排除
- 刷新页面后 identity/economy 数据从 localStorage 恢复
- `pnpm run typecheck` 通过

**产出文件**：
- `src/stores/v6.ts`（修改）

---

### Block C：新 UI 页面

---

#### S3-T7 创建 Identity 管理视图

**任务ID**：S3-T7
**负责人**：前端
**估算时间**：60 分钟
**优先级**：P0
**依赖**：S3-T2, S3-T5（Store中identity数据和actions须就绪）

**描述**：创建 Identity 管理视图组件，展示节点身份信息。对齐 v7.0 说明书用户故事 U-01（一键生成节点身份密钥对）的UI需求。

视图内容：

1. **节点身份卡片**
   - 节点ID（`did:newclaw:<hex32>` 格式，可复制）
   - 公钥（截断显示前8后4字符 + 复制按钮）
   - 创建时间（相对时间 + 悬停显示完整时间戳）
   - 状态指示灯（已创建=绿色 / 未创建=灰色）

2. **Trinity 角色身份绑定**
   - 三个子卡片（AI-1/AI-2/AI-3），各显示绑定的密钥对状态
   - 角色色彩对齐设计规范：AI-1=blue-400、AI-2=amber-400、AI-3=emerald-400

3. **操作区**
   - "创建节点身份" 按钮（调用 `loadIdentity()` action）
   - 加载中状态显示 spinner
   - 错误状态显示错误信息

设计规范（对齐 ab-integration-strategy.md 第3节）：
- 卡片样式：`rounded-lg bg-white/5 border border-white/10 p-4`
- 背景：`bg-gray-950`
- 主按钮：`bg-purple-600 hover:bg-purple-500`

**验收标准**：
- `src/components/v6/IdentityView.tsx` 创建完成
- 从 Store 读取 identity 数据并正确展示
- 未加载状态显示"创建节点身份"按钮
- 已加载状态显示完整身份信息
- 加载中显示 loading 状态
- 错误时显示错误信息
- 响应式布局（移动端适配）
- `pnpm run typecheck` 通过

**产出文件**：
- `src/components/v6/IdentityView.tsx`（新建）

---

#### S3-T8 创建经济仪表盘视图

**任务ID**：S3-T8
**负责人**：前端
**估算时间**：60 分钟
**优先级**：P0
**依赖**：S3-T2, S3-T5（Store中economy数据和actions须就绪）

**描述**：创建经济仪表盘视图组件，展示 New.B 货币系统状态。对齐 v7.0 说明书用户故事 U-04（查看治理账本-经济维度）和 v6-types-contract.ts 中 `LocalLedgerEntry` 的 `currency: 'NEW.B'` 规范。

视图内容：

1. **余额概览卡片**
   - New.B 当前余额（大字体显示，带货币符号）
   - 质押金额（已锁定的 New.B）
   - 待发放奖励

2. **PoO 绩效卡片**
   - Priority Score 仪表盘（0-100环形进度条，>=85为绿色）
   - 已验证/已拒绝/待验证任务数统计

3. **减半进度条**
   - 当前纪元（Epoch N）
   - 当前区块奖励
   - 距下次减半剩余区块数（线性进度条）
   - 减半时间预估

4. **最近交易列表**（预留，M2阶段对接真实数据）
   - 空状态显示"暂无交易记录"占位

设计规范：
- 数字使用等宽字体 `font-mono`
- 金额正数绿色、负数红色
- 与 Identity 视图保持一致的卡片风格

**验收标准**：
- `src/components/v6/EconomyDashboard.tsx` 创建完成
- 从 Store 读取 economy 数据并正确展示
- Priority Score >= 85 显示绿色，< 85 显示黄色，< 60 显示红色
- 减半进度条按 `blocksUntilHalving / totalBlocksPerEpoch` 计算百分比
- 未加载状态显示加载骨架屏或加载提示
- 响应式布局
- `pnpm run typecheck` 通过

**产出文件**：
- `src/components/v6/EconomyDashboard.tsx`（新建）

---

#### S3-T9 在 Trinity 主页面添加新视图入口

**任务ID**：S3-T9
**负责人**：前端
**估算时间**：15 分钟
**优先级**：P0
**依赖**：S3-T7, S3-T8（两个视图组件须先创建）

**描述**：在 Trinity 主页面（`src/pages/Trinity/index.tsx`）的 `NAV_ITEMS` 数组中添加两个新的导航入口，链接到 Identity 管理视图和经济仪表盘视图。

需修改的位置：

1. `NAV_ITEMS` 数组中添加：
   ```typescript
   { id: 'identity', label: t('nav.identity'), icon: KeyIcon },
   { id: 'economy', label: t('nav.economy'), icon: CurrencyDollarIcon },
   ```

2. 视图路由/条件渲染中添加对应的 case：
   ```typescript
   case 'identity': return <IdentityView />
   case 'economy': return <EconomyDashboard />
   ```

3. 导入新组件：
   ```typescript
   import { IdentityView } from '@/components/v6/IdentityView'
   import { EconomyDashboard } from '@/components/v6/EconomyDashboard'
   ```

**验收标准**：
- 导航栏出现"身份管理"和"经济仪表盘"两个入口
- 点击入口切换到对应视图
- 视图切换更新 Store 中 `activeView` 状态
- 图标正确显示
- `pnpm run typecheck` 通过

**产出文件**：
- `src/pages/Trinity/index.tsx`（修改）

---

#### S3-T10 新视图 i18n 中文翻译

**任务ID**：S3-T10
**负责人**：前端
**估算时间**：15 分钟
**优先级**：P1
**依赖**：S3-T7, S3-T8（需知道视图中使用了哪些文案键）

**描述**：在 `public/locales/zh/v6.json` 中添加 Identity 和 Economy 视图所需的中文翻译键值。

需添加的翻译键（约30个）：

```json
{
  "nav.identity": "身份管理",
  "nav.economy": "经济仪表盘",
  "identity.title": "节点身份",
  "identity.nodeId": "节点 ID",
  "identity.publicKey": "公钥",
  "identity.createdAt": "创建时间",
  "identity.status.created": "已创建",
  "identity.status.pending": "未创建",
  "identity.createButton": "创建节点身份",
  "identity.trinityBinding": "Trinity 角色绑定",
  "identity.role.ai1": "AI-1 扩展者",
  "identity.role.ai2": "AI-2 审计者",
  "identity.role.ai3": "AI-3 治理者",
  "economy.title": "经济仪表盘",
  "economy.balance": "New.B 余额",
  "economy.staked": "质押金额",
  "economy.pendingRewards": "待发放奖励",
  "economy.pooScore": "Priority Score",
  "economy.verified": "已验证",
  "economy.rejected": "已拒绝",
  "economy.pending": "待验证",
  "economy.halving.title": "减半进度",
  "economy.halving.epoch": "当前纪元",
  "economy.halving.reward": "区块奖励",
  "economy.halving.remaining": "剩余区块",
  "economy.transactions": "最近交易",
  "economy.noTransactions": "暂无交易记录",
  "common.loading": "加载中...",
  "common.error": "加载失败",
  "common.copy": "复制",
  "common.copied": "已复制"
}
```

**验收标准**：
- `public/locales/zh/v6.json` 新增约30个翻译键
- 所有键值为中文
- JSON格式合法（无语法错误）
- 视图中所有用户可见文案均通过 `t()` 函数引用
- `pnpm run typecheck` 通过

**产出文件**：
- `public/locales/zh/v6.json`（修改）

---

### Block D：类型冻结与文档

---

#### S3-T11 在 v6.ts 添加 Identity/Economy/Sandbox 类型定义

**任务ID**：S3-T11
**负责人**：前端
**估算时间**：30 分钟
**优先级**：P0（所有Block A/B/C任务的类型基础）
**依赖**：无（本Sprint最先启动的任务）

**描述**：根据 v7.0 说明书第11.4节的接口定义和 Sprint 3 计划中的 Provider 接口契约，在 `src/types/v6.ts` 中添加 Identity、Economy、Sandbox 三个模块的类型定义。这些类型定义是双方共享契约的一部分，须经A队确认后冻结。

需添加的类型：

```typescript
// === Identity 模块类型 ===

export interface IdentityState {
  nodeId: string                    // DID 格式: did:newclaw:<hex32>
  publicKey: string                 // Ed25519 公钥 (hex)
  createdAt: string                 // ISO 8601
  trinityBindings: TrinityBinding[] // 三角色的密钥绑定
}

export interface TrinityBinding {
  role: TrinityRole
  agentId: string
  publicKey: string
  boundAt: string
}

export interface KeyPair {
  publicKey: string
  privateKey: string   // 仅在生成时短暂持有，不持久化到前端
}

export interface IdentityBinding {
  agentId: string
  nodeId: string
  publicKey: string
  role: TrinityRole
  createdAt: string
  signature: string    // 身份绑定的自签名证明
}

// === Economy 模块类型 ===

export interface EconomyState {
  balance: number
  stakedAmount: number
  pendingRewards: number
  halvingEpoch: number
  blockReward: number
  blocksUntilHalving: number
  totalBlocksPerEpoch: number
  lastUpdatedAt: string
}

export interface NewBBalance {
  available: number
  staked: number
  pendingRewards: number
  total: number
}

export interface HalvingSchedule {
  currentEpoch: number
  blockReward: number
  blocksPerEpoch: number
  blocksUntilHalving: number
  halvingFactor: number     // 通常为 0.5
  epochStartedAt: string
}

// === Sandbox 模块类型（M2预留） ===

export interface SandboxState {
  isAvailable: boolean
  fallbackMode: boolean            // true=子进程降级, false=Docker可用
  activeContainers: number
  lastExecutionAt?: string
}

export interface SandboxConfig {
  image: string
  networkMode: 'none' | 'restricted' | 'host'
  cpuLimit: number
  memoryLimitMB: number
  timeoutSeconds: number
  readonlyMounts: string[]
  env: Record<string, string>
}

export interface ExecutionResult {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  resourceUsage: { cpuPercent: number; memoryMB: number }
  method: 'docker' | 'process'     // 实际使用的执行方式
}
```

**验收标准**：
- `src/types/v6.ts` 新增约15个类型/接口定义
- 类型命名与 Sprint 3 计划中 Provider 接口契约一致
- `SandboxConfig` 和 `ExecutionResult` 与 v7.0 第11.4节定义一致
- `pnpm run typecheck` 通过（0错误）
- `pnpm run lint` 无新增错误
- 现有188测试全部通过（无回归）

**产出文件**：
- `src/types/v6.ts`（修改）

---

#### S3-T12 冻结 v6.ts 版本号标注

**任务ID**：S3-T12
**负责人**：前端
**估算时间**：15 分钟
**优先级**：P1
**依赖**：S3-T4, S3-T11（所有类型变更完成后冻结）

**描述**：在 `src/types/v6.ts` 文件头部添加版本号标注和接口冻结声明，明确从此日起类型变更需走双方确认流程（对齐 v7.0 说明书第11.3节接口变更规则）。

需添加的文件头注释：

```typescript
/**
 * NewClaw V6 类型契约
 * 
 * @version 1.1.0 — Sprint 3 M1 冻结版
 * @frozen 2026-04-10
 * @changelog
 *   v1.0.0 (2026-04-08) — 初始 40+ 类型定义（B队M0交付）
 *   v1.1.0 (2026-04-10) — 新增 Identity/Economy/Sandbox 类型（B队Sprint 3）
 * 
 * === 接口变更规则（v7.0 说明书第11.3节）===
 * 1. 任何变更需 A/B 双方确认
 * 2. 新增可选字段：无需确认，但须通知对方
 * 3. 修改/删除现有字段：须24-48小时确认期
 * 4. B队导出的函数签名为稳定API，A队调用时不应修改
 */
```

同时创建 `docs/v6-types-changelog.md` 记录类型变更历史。

**验收标准**：
- `src/types/v6.ts` 头部包含版本号和冻结声明
- `docs/v6-types-changelog.md` 创建完成
- 版本号格式为 semver (x.y.z)
- 变更日志包含 v1.0.0 和 v1.1.0 两条记录
- 已通知A队接口冻结（在changelog中标注通知状态）

**产出文件**：
- `src/types/v6.ts`（修改头部注释）
- `docs/v6-types-changelog.md`（新建）

---

### Block E：测试

---

#### S3-T13 adapter 集成测试

**任务ID**：S3-T13
**负责人**：质检
**估算时间**：45 分钟
**优先级**：P0
**依赖**：S3-T2, S3-T5, S3-T7, S3-T8（全链路 adapter->Store->UI 须全部就绪）

**描述**：编写集成测试验证 桩adapter -> Zustand Store -> UI组件 的全链路数据流通。与 S3-T3 的单元测试不同，集成测试验证的是各模块协作的正确性。

测试用例：

**链路1：Identity 全链路**
1. 调用 `store.loadIdentity()` -> 验证 Store 中 `identity` 字段已填充 — 1 case
2. 渲染 `<IdentityView />` -> 验证节点ID文本正确显示 — 1 case
3. 渲染 `<IdentityView />` -> 验证"已创建"状态指示灯为绿色 — 1 case
4. identity 为 null 时渲染 -> 验证显示"创建节点身份"按钮 — 1 case

**链路2：Economy 全链路**
5. 调用 `store.loadNewBBalance()` -> 验证 Store 中 `economy` 字段已填充 — 1 case
6. 渲染 `<EconomyDashboard />` -> 验证余额数字正确显示 — 1 case
7. 渲染 `<EconomyDashboard />` -> 验证 Priority Score 颜色（>=85绿色） — 1 case
8. 渲染 `<EconomyDashboard />` -> 验证减半进度条百分比计算 — 1 case

**链路3：错误处理**
9. adapter 抛异常 -> Store 捕获错误 -> UI 显示错误信息 — 2 case（identity/economy各一个）

**链路4：持久化**
10. 设置 identity -> 模拟页面刷新（重建Store） -> 验证数据恢复 — 1 case

**验收标准**：
- `src/__tests__/integration/adapter-store-ui.test.tsx` 创建完成
- 至少 11 个集成测试用例
- `pnpm test` 全部通过
- 测试使用 `@testing-library/react` 渲染组件
- 测试中不直接调用 HTTP（全部通过桩）

**产出文件**：
- `src/__tests__/integration/adapter-store-ui.test.tsx`（新建）

---

#### S3-T14 Identity/Economy 视图渲染测试

**任务ID**：S3-T14
**负责人**：质检
**估算时间**：30 分钟
**优先级**：P1
**依赖**：S3-T7, S3-T8

**描述**：为两个新 UI 视图编写组件级渲染测试，覆盖各种状态下的正确渲染。与 S3-T13 集成测试不同，这里不测试数据流通，只测试给定 props/state 下组件的渲染输出。

**IdentityView 测试用例**：
1. 空状态（identity=null）：显示创建按钮，不显示身份信息 — 1 case
2. 已创建状态：显示nodeId、publicKey（截断格式）、创建时间 — 1 case
3. 加载中状态（isLoading=true）：显示 spinner — 1 case
4. 错误状态（lastError有值）：显示错误信息 — 1 case
5. Trinity绑定显示：三个角色卡片均可见，颜色正确 — 1 case

**EconomyDashboard 测试用例**：
6. 空状态（economy=null）：显示加载提示 — 1 case
7. 正常状态：余额、质押、奖励数字正确 — 1 case
8. Score颜色：score=90显示绿色，score=70显示黄色，score=50显示红色 — 3 case
9. 减半进度条：进度百分比 = (total - remaining) / total * 100 — 1 case
10. 空交易列表：显示"暂无交易记录" — 1 case

**验收标准**：
- `src/__tests__/components/IdentityView.test.tsx` 创建完成
- `src/__tests__/components/EconomyDashboard.test.tsx` 创建完成
- 至少 12 个测试用例（Identity 5 + Economy 7）
- `pnpm test` 全部通过
- 使用 `@testing-library/react` 的 `render` + `screen` API

**产出文件**：
- `src/__tests__/components/IdentityView.test.tsx`（新建）
- `src/__tests__/components/EconomyDashboard.test.tsx`（新建）

---

## 任务依赖关系

```
S3-T11 (类型定义) ──┬──→ S3-T1 (适配器桩) ──→ S3-T3 (适配器单元测试)
                    │                      │
                    │                      └──→ S3-T2 (Store adapter actions)──┐
                    │                                                          │
                    └──→ S3-T4 (V6SystemState扩展) ──→ S3-T5 (Store本地actions)──┤
                                                                                │
                                                   S3-T6 (persist扩展) ←────────┘
                                                                                │
                    S3-T2 + S3-T5 完成后 ──┬──→ S3-T7 (Identity视图) ──────────┐│
                                           │                                    ││
                                           └──→ S3-T8 (Economy视图) ──────────┐││
                                                                               │││
                    S3-T7 + S3-T8 完成后 ──→ S3-T9 (导航入口) ────────────────┐│││
                                           ──→ S3-T10 (i18n翻译)              ││││
                                                                               ││││
                    S3-T4 + S3-T11 完成后 ──→ S3-T12 (类型冻结) ──────────────┐││││
                                                                               │││││
                    全链路就绪后 ──→ S3-T13 (集成测试) ←───────────────────────┘││││
                                                                                ││││
                    S3-T7/T8 完成后 ──→ S3-T14 (渲染测试) ←────────────────────┘│││
```

### 简化依赖图（按执行层次）

```
Layer 0（无依赖，立即启动）:
  ┌─────────┐
  │ S3-T11  │  类型定义
  └────┬────┘
       │
Layer 1（依赖T11）:
  ┌────┴────┐    ┌─────────┐
  │ S3-T1   │    │ S3-T4   │
  │适配器桩  │    │State扩展 │
  └────┬────┘    └────┬────┘
       │              │
Layer 2（依赖Layer 1）:
  ┌────┴────┐    ┌────┴────┐
  │ S3-T2   │    │ S3-T5   │    ┌─────────┐
  │Store异步│    │Store本地 │    │ S3-T3   │
  └────┬────┘    └────┬────┘    │适配器测试│
       │              │         └─────────┘
       └──────┬───────┘
              │
Layer 3（依赖Layer 2）:
  ┌───────┐  ┌────┴────┐  ┌─────────┐  ┌─────────┐
  │S3-T6  │  │ S3-T7   │  │ S3-T8   │  │ S3-T12  │
  │persist│  │Identity  │  │Economy  │  │类型冻结  │
  └───────┘  └────┬────┘  └────┬────┘  └─────────┘
                  │            │
Layer 4（依赖Layer 3）:
  ┌─────────┐  ┌────┴────┐  ┌────┴─────┐
  │ S3-T9   │  │ S3-T14  │  │ S3-T10   │
  │导航入口  │  │渲染测试  │  │ i18n翻译  │
  └────┬────┘  └─────────┘  └──────────┘
       │
Layer 5（全部就绪后）:
  ┌────┴────┐
  │ S3-T13  │
  │集成测试  │
  └─────────┘
```

---

## 关键路径分析

### 关键路径（最长依赖链）

```
S3-T11(30min) → S3-T1(45min) → S3-T2(45min) → S3-T7(60min) → S3-T9(15min) → S3-T13(45min)
                                                                              
总时间: 30 + 45 + 45 + 60 + 15 + 45 = 240 分钟 = 4 小时
```

### 次关键路径

```
S3-T11(30min) → S3-T4(30min) → S3-T5(45min) → S3-T8(60min) → S3-T13(45min)

总时间: 30 + 30 + 45 + 60 + 45 = 210 分钟 = 3.5 小时
```

### 并行优化方案（2-3 个 Agent 同时工作）

| 时间段 | Agent 1（主线） | Agent 2（并行线） | Agent 3（测试线） |
|--------|----------------|------------------|-----------------|
| 0:00-0:30 | S3-T11 (类型定义) | -- | -- |
| 0:30-1:15 | S3-T1 (适配器桩) | S3-T4 (State扩展) | -- |
| 1:15-2:00 | S3-T2 (Store异步actions) | S3-T5 (Store本地actions) | S3-T3 (适配器单元测试) |
| 2:00-3:00 | S3-T7 (Identity视图) | S3-T8 (Economy视图) | S3-T6(15min) + S3-T12(15min) |
| 3:00-3:15 | S3-T9 (导航入口) | S3-T10 (i18n翻译) | S3-T14 (渲染测试, 开始) |
| 3:15-3:45 | -- | -- | S3-T14 (渲染测试, 完成) |
| 3:45-4:30 | S3-T13 (集成测试) | -- | -- |

**并行后总耗时**：约 4.5 小时（3个Agent），对比串行 8 小时，节省约 44%

### 风险节点

| 任务 | 风险 | 缓解措施 |
|------|------|---------|
| S3-T11 | 类型定义与A队现有代码冲突 | 所有新类型均为可选字段，不破坏现有契约 |
| S3-T1 | 桩数据格式后续与真实API不匹配 | 严格对齐v7.0第11.4节定义；T3单元测试锁定契约 |
| S3-T7/T8 | UI组件复杂度超预期 | 先实现核心信息展示，样式打磨放入下一Sprint |
| S3-T13 | 全链路测试环境配置困难 | 使用msw/jest mock，不依赖真实后端 |

---

## Sprint 3 M1 门控标准

| 指标 | 标准 | 验证方式 |
|------|------|---------|
| typecheck | 0 错误 | `pnpm run typecheck` |
| lint | 0 errors | `pnpm run lint` |
| 适配器桩 | 5个async函数返回正确格式数据 | S3-T3 单元测试 |
| Store扩展 | identity/economy 字段可读写 | S3-T5 actions测试 |
| Identity视图 | 正确展示身份信息 + 空状态处理 | S3-T14 渲染测试 |
| Economy视图 | 正确展示余额/Score/减半进度 | S3-T14 渲染测试 |
| 导航入口 | 主页面可切换到两个新视图 | S3-T9 验收 |
| 类型冻结 | v6.ts 版本号标注完成 | S3-T12 验收 |
| i18n | 新视图中文翻译完整 | S3-T10 验收 |
| 全链路集成 | 桩→Store→UI 数据流通 | S3-T13 集成测试 |
| 测试总数 | >= 188 + 44（新增） = 232 | `pnpm test` |
| 测试通过率 | 100% | `pnpm test` |

---

## 资源分配建议

| 角色 | 任务 | 总耗时 |
|------|------|--------|
| 前端（主力） | T1, T2, T4, T5, T6, T7, T8, T9, T11 | 345 分钟 (5.75h) |
| 前端（辅助） | T10, T12 | 30 分钟 (0.5h) |
| 质检 | T3, T13, T14 | 105 分钟 (1.75h) |

**总工作量**：480 分钟 = 8 小时

**串行执行**：8 小时
**2 Agent 并行**：约 5.5 小时（关键路径 + 测试尾巴）
**3 Agent 并行**：约 4.5 小时（最优）

---

## 备注

1. **桩 vs 真实调用**：本Sprint所有adapter函数均为桩实现（返回硬编码模拟数据）。切换为真实HTTP调用将在A队M2-A12（adapter.ts桥接层）和M2-A13（Token认证通道）完成后进行。
2. **类型兼容性**：新增类型均为可选字段，完全向后兼容。A队M2-A1（类型映射）任务中会产出映射表确认兼容性。
3. **设计规范**：UI组件样式严格对齐 `ab-integration-strategy.md` 第3节的设计语言，A队M2-A14（设计审查）会验证一致性。
4. **Sandbox 类型预留**：`SandboxState`/`SandboxConfig`/`ExecutionResult` 在本Sprint仅做类型定义，UI视图留到M2阶段实现。
5. **EvidenceGrade排序问题**：B队注释H1为最高（Reproducible），A队H1为最低（Hearsay）。这是命名约定差异，适配层映射在A队M2-A2中处理。本Sprint不涉及此问题。
6. **i18n策略**：本Sprint仅添加中文翻译。英文翻译将在A队负责的国际化任务中补全。
7. **文件归属**：本Sprint所有产出文件均在B队独占目录下（`src/lib/v6/`、`src/components/v6/`、`src/stores/`、`src/types/`），不触碰A队`electron/`目录。
8. **合并时机**：独立仓库开发，文件级复制（`cp -r`），非 git merge，合并时机由用户决定。
