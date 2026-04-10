# NewClaw Genesis Wizard -- Onboarding 规格说明书

> 目标：新用户从打开 App 到完成首个 Trinity 循环 < 5 分钟
> 技术栈：React 19 + Framer Motion + Zustand + Tailwind + shadcn/ui

---

## 1. 用户旅程地图

```
App 启动
  |
  v
检测 localStorage 无 DID ──yes──> 启动 Genesis Wizard
  |                                     |
  no                              Step 1: 欢迎 (10s)
  |                                     |
  v                              Step 2: 生成节点身份 (15s)
直接进入 Dashboard                      |
                                 Step 3: 初始化经济 (10s)
                                        |
                                 Step 4: 第一个任务 (60s)
                                        |
                                 Step 5: 结果展示 (15s)
                                        |
                                 -----> Dashboard (有数据状态)
```

触发条件：`useV6Store.getState().identity === null`
路由：`/genesis` -- 全屏覆盖层，无侧边栏

---

## 2. 五步创世向导

### Step 1: 欢迎（10 秒）

**功能**：品牌介绍 + 价值主张，建立第一印象。

**UI 布局**：
- 全屏深色背景 `bg-slate-950`，居中内容区 `max-w-lg`
- 顶部：NewClaw Logo，`96x96`，fade-in 动画 `duration-800ms`
- 标题：`"欢迎来到 NewClaw"` -- `text-3xl font-bold text-white`
- 副标题：`"首个让 AI 代理拥有身份、经济与治理的框架"` -- `text-lg text-slate-400`
- 三个图标行（水平排列，stagger fade-in `delay-200ms`）：
  - 盾牌图标 + "三核治理"
  - 钱包图标 + "代币经济"
  - 指纹图标 + "节点身份"
- 底部按钮：`"开始创建你的节点"` -- `bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg`
- 左下角：`"跳过向导"` -- `text-slate-500 text-sm underline cursor-pointer`

**动画**：Logo 从 `scale-0.8 opacity-0` 到 `scale-1 opacity-1`，弹性缓动。

---

### Step 2: 生成节点身份（15 秒）

**功能**：自动生成 Ed25519 密钥对和 DID，展示公钥。

**交互流程**：
1. 页面加载后自动调用 `generateKeypair()` -- 无需用户操作
2. 展示生成动画（密钥字符滚动效果，`font-mono text-emerald-400`）
3. 生成完成后显示身份卡片

**UI 布局**：
- 标题：`"你的节点身份已生成"` -- `text-2xl font-bold text-white`
- 身份卡片（`bg-slate-900 border border-slate-700 rounded-xl p-6`）：
  - DID：`did:newclaw:a3f8...` 截断显示，旁有复制按钮
  - 公钥：前 16 位 + `...` + 后 8 位，`font-mono text-sm text-slate-300`
  - Stage 徽章：`"Stage 0: Simulated"` -- `bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs`
- 安全提示：`"密钥已加密存储在本地 (AES-256-GCM)"` -- `text-xs text-slate-500` 配锁图标
- 底部按钮：`"继续"` -- 同 Step 1 样式

**动画**：密钥字符逐位显示（typewriter 效果），完成后卡片从底部 slide-up。

**调用的引擎函数**：
```typescript
import { generateIdentity } from '@/lib/v6/identity'
const { did, publicKey } = generateIdentity()
store.setIdentity({ did, publicKey, stage: 0 })
```

---

### Step 3: 初始化经济（10 秒）

**功能**：发放 100 New.B 创世余额，展示经济系统概念。

**UI 布局**：
- 标题：`"创世奖励已发放"` -- `text-2xl font-bold text-white`
- 余额展示区（居中，大号字体）：
  - 数字从 `0` 滚动到 `100.00`（count-up 动画，`duration-1200ms`）
  - 单位：`"New.B"` -- `text-xl text-amber-400 font-semibold`
  - 子标题：`"Genesis Node 创世奖励"` -- `text-sm text-slate-400`
- 三行说明（左对齐，图标 + 文字）：
  - `"完成任务赚取 New.B 报酬"`
  - `"在知识市场交易 Playbook"`
  - `"比特币式减半 -- 早期参与奖励更高"`
- 底部按钮：`"运行第一个任务"` -- `bg-emerald-600 hover:bg-emerald-500`

**动画**：数字 count-up 使用弹性缓动。完成后金色粒子效果短暂闪烁。

**调用的引擎函数**：
```typescript
import { creditGenesisReward } from '@/lib/v6/economy'
creditGenesisReward(store.identity.did, 100)
```

---

### Step 4: 第一个任务（60 秒）

**功能**：预填示例任务，一键运行 Trinity 流水线，让用户看到三核辩论过程。

**UI 布局**：
- 标题：`"体验 Trinity 三核引擎"` -- `text-2xl font-bold text-white`
- 任务卡片（`bg-slate-900 rounded-xl p-6`）：
  - 预填任务名：`"分析 NewClaw 的治理模型优势"` -- 输入框可编辑但默认已填
  - 预填目标：`"列出 3 个核心优势并对比竞品"` -- 同上
  - 按钮：`"启动 Trinity"` -- `bg-blue-600` 配闪电图标
- 运行状态区（点击按钮后展示）：
  - 三列布局，每列代表一个 AI 核心：
    - AI-1 Expander（蓝色 `text-blue-400`）：显示提案摘要
    - AI-2 Auditor（琥珀色 `text-amber-400`）：显示审计意见
    - AI-3 Governor（翠绿色 `text-emerald-400`）：显示决策结论
  - 每个核心有雷达脉冲动画（与 TeamChat 视图一致）
  - 流水线进度条：`Proposal > Audit > Approval > Execution > Review > Settled`
  - 当前阶段高亮，已完成阶段打勾

**交互流程**：
1. 用户点击 `"启动 Trinity"`
2. 流水线自动推进六个阶段（使用示例数据或真实 LLM 调用）
3. 每个阶段 ~8 秒，总计 ~48 秒
4. 完成后自动进入 Step 5

**调用的引擎函数**：
```typescript
import { createTask, runFullPipeline } from '@/lib/v6/engine'
const task = createTask('分析 NewClaw 的治理模型优势', '列出 3 个核心优势并对比竞品')
const result = await runFullPipeline(task, { demo: true })
```

---

### Step 5: 结果展示（15 秒）

**功能**：展示 Oracle 验证结果 + 积分奖励，恭喜完成。

**UI 布局**：
- 顶部：勾号动画（圆圈 draw + 勾号 draw，翠绿色）
- 标题：`"恭喜！你的第一个 Trinity 循环已完成"` -- `text-2xl font-bold text-white`
- 结果卡片（`bg-slate-900 rounded-xl p-6`）：
  - Oracle 裁决：`"APPROVED"` -- `text-emerald-400 font-bold text-lg`
  - PriorityScore：`87/100`（示例值）-- 环形进度图，翠绿色
  - 奖励：`"+5.0 New.B"` -- `text-amber-400 font-semibold`
  - 信用更新：`"Outcome 指标 +1"` -- `text-slate-300 text-sm`
- 底部按钮：`"进入 Dashboard"` -- `bg-blue-600 w-full py-3`

**动画**：勾号 SVG path draw `duration-600ms`，卡片 stagger fade-in。

**数据写入**：
```typescript
store.updateMetrics({ outcomes: 1 })
store.addNewBBalance(5.0)
store.setOnboardingComplete(true)
```

---

## 3. 跳过选项

**触发位置**：Step 1 左下角 `"跳过向导"` 链接。

**跳过流程**：
1. 弹出确认对话框：`"跳过将自动生成身份并发放创世奖励，确定？"`
2. 确认后：自动执行 `generateIdentity()` + `creditGenesisReward()` 静默运行
3. 直接导航到 Dashboard（空状态，但有身份和余额）

**存储标记**：`store.setOnboardingSkipped(true)` -- Dashboard 可据此显示提示横幅。

---

## 4. 空状态到有数据状态

完成向导后各视图的初始数据：

| 视图 | 空状态（跳过向导） | 有数据状态（完成向导） |
|---|---|---|
| **Dashboard** | 6 张卡片全部为 0，提示横幅 "运行你的第一个任务" | Tasks: 1, Outcomes: 1，事件流有 3 条记录 |
| **Team Chat** | 空聊天界面，占位文字 "输入任务开始辩论" | 有示例任务的完整对话记录 |
| **Economy** | 余额 100 New.B，无交易记录 | 余额 105 New.B，2 条交易（创世 +100，任务 +5） |
| **Node Identity** | DID 卡片 + Stage 0 徽章 | 同左 |
| **Governance Ledgers** | 6 个空标签页 | Evidence 账本有 1 条记录 |
| **Outcome Oracle** | 空列表 | 1 条 APPROVED 记录 |
| **Permission Matrix** | 默认 L0-L4 网格，无待审批 | 同左 |
| **Node Promotion** | 四轴进度条全为 0% | outcomes 轴显示微量进度 |
| **Knowledge Market** | 空市场，提示 "创建你的第一个 Playbook" | 同左 |

**Dashboard 提示横幅**（跳过向导时显示）：
- `"你跳过了创世向导。"` + `"运行示例任务"` 按钮
- 点击后执行 Step 4 的预填任务流程（内联到 Dashboard）
- 完成后横幅消失

---

## 5. 技术实现要点

### 状态管理

```typescript
// Zustand store 新增字段
interface OnboardingState {
  onboardingStep: 0 | 1 | 2 | 3 | 4 | 5  // 0 = 未开始
  onboardingComplete: boolean
  onboardingSkipped: boolean
}
```

### 路由守卫

```typescript
// App.tsx 或 router 层
if (!store.identity && !store.onboardingComplete) {
  return <GenesisWizard />
}
```

### 组件结构

```
src/components/onboarding/
  GenesisWizard.tsx        -- 主容器，管理步骤切换
  StepWelcome.tsx          -- Step 1
  StepIdentity.tsx         -- Step 2
  StepEconomy.tsx          -- Step 3
  StepFirstTask.tsx        -- Step 4
  StepResult.tsx           -- Step 5
  SkipConfirmDialog.tsx    -- 跳过确认弹窗
  ProgressDots.tsx         -- 底部步骤指示器（5 个圆点）
```

### 步骤指示器

底部固定 5 个圆点，当前步骤高亮（`bg-blue-500`），已完成（`bg-blue-300`），未到达（`bg-slate-600`）。支持点击已完成步骤回看，但不可前跳。

### 过渡动画

所有步骤切换使用 Framer Motion `AnimatePresence`：
- 进入：`x: 100, opacity: 0` -> `x: 0, opacity: 1`（`duration: 300ms`）
- 退出：`x: -100, opacity: 0`（`duration: 200ms`）

---

## 6. 验收标准

| 编号 | 标准 | 度量方式 |
|---|---|---|
| AC-1 | 80% 新用户在 5 分钟内完成向导 | 埋点：`onboarding_start` 到 `onboarding_complete` 时间差 |
| AC-2 | 每步有明确的单一 CTA 按钮 | UI Review |
| AC-3 | Step 4 的 Trinity 流水线全程可视 | 6 个阶段均有状态展示 |
| AC-4 | 跳过向导后身份和余额正常初始化 | 自动化测试 |
| AC-5 | 完成向导后 Dashboard 显示非空数据 | E2E 测试断言 |
| AC-6 | 向导在 320px 宽度下可用 | 响应式测试 |
| AC-7 | 所有动画可被 `prefers-reduced-motion` 禁用 | 无障碍测试 |
| AC-8 | 向导状态持久化，刷新页面不丢失进度 | Zustand persist 验证 |

### 埋点事件

```
onboarding_start            -- 进入 Step 1
onboarding_step_complete    -- 每步完成，payload: { step: number, duration_ms: number }
onboarding_skip             -- 点击跳过
onboarding_complete         -- 完成 Step 5
onboarding_task_started     -- Step 4 点击启动
onboarding_task_duration    -- Step 4 任务耗时
```
