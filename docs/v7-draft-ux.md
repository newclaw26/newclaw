# NewClaw v7.0 -- 用户体验与交互规范

> 版本: 7.0-draft | 日期: 2026-04-10 | 作者: ArchitectUX

---

## 1. 信息架构

### 1.1 页面导航树

```
NewClaw V7
|
+-- 仪表盘 (dashboard)              默认首页
|   |-- 统计卡片区 (6列)             数据源: GET /api/trinity/dashboard
|   |-- 三核引擎面板 (AI-1/2/3)      数据源: store.trinity + /api/trinity/state
|   |-- 创建任务表单                  写入: POST /api/trinity/runner/run-once
|   |-- 最近任务列表 (最新8条)        数据源: store.tasks
|   +-- 事件流 (最新10条)             数据源: store.events
|
+-- 知识市场 (market)                Playbook 交易
|   |-- 市场统计卡片 (4列)            数据源: store.market + /api/trinity/governance/playbooks
|   |-- 可购买剧本列表                数据源: store.market.listings (status=listed)
|   +-- 订单历史表格                  数据源: store.market.orders
|
+-- 治理账本 (ledgers)               五类账本浏览
|   |-- 类型选择标签 (evidence/value/debt/progress/playbook)
|   +-- 账本表格                     数据源: store.ledgers + /api/trinity/governance/*
|
+-- 结果预言机 (oracle)              PoO 验证结果
|   |-- 统计卡片 (5列)               数据源: store.outcomes + /api/trinity/poo/stats
|   |-- 信用分布 (本地/测试网/主网)
|   +-- 结果报告表格                  数据源: store.outcomes
|
+-- 权限矩阵 (permissions)           保险丝权限管理
|   |-- FuseMatrix 矩阵网格          数据源: store.permissionMatrix
|   +-- 待审批请求列表 (L3+)          数据源: store.permissionRequests
|
+-- 节点晋升 (node-status)           晋升流水线
    |-- 当前阶段标签                  数据源: store.nodeStatus.stageLabel
    |-- 各阶段进度指标                数据源: store.nodeStatus
    +-- PromotionPipeline 可视化      组件: PromotionPipeline
```

### 1.2 导航实现规范

- 顶部水平标签栏, 使用 `role="tablist"` + `role="tab"` + `aria-selected`
- 固定 6 个入口, 每个标签含图标 + 中文文字
- 当前激活标签: `bg-white/10 text-white`; 非激活: `text-gray-500 hover:text-gray-300`
- 品牌标识区固定在导航栏左侧, 含龙图标 + "NewClaw V7" + 阶段徽章

---

## 2. 核心交互流程

### 2.1 首次启动 -> 创建身份 -> 激活节点

```
[启动应用]
  |
  v
[GET /api/trinity/genesis/status] -- 检查 isComplete
  |
  +-- isComplete=true --> 直接进入仪表盘
  |
  +-- isComplete=false --> 显示创世引导页
        |
        v
      [步骤1: 生成密钥]
        系统本地离线生成非对称密钥对
        界面显示: 公钥摘要 (前12位) + "已安全存储" 确认
        |
        v
      [步骤2: 绑定身份]
        POST /api/trinity/genesis
        界面显示: 节点ID + 区块链地址 + 创建时间
        |
        v
      [步骤3: 激活挖矿]
        系统注入初始 100 New.B
        界面显示: 余额动画 0->100, "节点已激活" 成功提示
        |
        v
      [自动跳转仪表盘, nodeStatus 初始化为 Stage-0]
```

### 2.2 创建任务 -> Trinity 流水线 -> 查看结果

```
[用户在仪表盘右侧表单输入任务标题 + 描述]
  |
  v
[点击 "运行三核流水线" 按钮]
  按钮状态变为 disabled, 文字变为 "流水线运行中..."
  |
  v
[阶段1: AI-1 提案] (300ms)
  AI-1 面板状态指示灯变为黄色脉冲 (thinking)
  最近任务列表新增条目, 状态点: 琥珀色 (pending-audit)
  |
  v
[阶段2: AI-2 审计] (500ms 后)
  AI-2 面板状态指示灯变为黄色脉冲
  任务状态点变为: 紫色 (pending-approval)
  |
  v
[阶段3: AI-3 审批] (400ms 后)
  AI-3 面板状态指示灯变为蓝色脉冲 (executing)
  |
  v
[阶段4: 完成] (400ms 后)
  任务状态点变为: 绿色 (completed)
  统计卡片 "已完成" 数值 +1
  按钮恢复可用, 表单清空
  事件流新增 3 条记录 (proposal/audit/approval)
```

### 2.3 浏览市场 -> 购买 Playbook -> 执行并验证

```
[用户切换到 "知识市场" 标签]
  |
  v
[加载可购买剧本列表]
  每个剧本卡片显示: 标题, 描述, 价格(New.B), 质量百分比, 标签, 卖方
  |
  v
[用户点击 "购买并执行" 按钮]
  |
  v
[系统执行]
  1. 扣除账户余额 (market.nodeBalance 减少)
  2. 创建订单记录 (status: executing)
  3. 在模拟沙盒中执行 Playbook
  4. PoO 验证执行结果
  |
  v
[执行完成]
  订单状态更新为 completed (绿色徽章)
  "已售出" 统计 +1
  "成交量" 累加交易金额
  订单历史表格新增一行, 显示执行结果摘要
```

### 2.4 查看权限矩阵 -> 审批 L3 请求

```
[用户切换到 "权限矩阵" 标签]
  |
  v
[加载 FuseMatrix 网格]
  矩阵行: 操作类型 (代码执行/资金转移/外部API/文件写入等)
  矩阵列: 权限等级 (L0 绿/L1 蓝/L2 琥珀/L3 红/L4 灰)
  当前权限用实心圆标记
  |
  v
[存在 L3 待审批请求时]
  请求列表出现在矩阵下方, 每行含:
    请求来源(AI角色) | 操作描述 | 风险等级 | 请求时间
    [批准] 按钮 (绿色) | [拒绝] 按钮 (红色)
  |
  v
[用户点击 "批准"]
  store.approvePermission(id, 'human', '人工批准')
  请求从列表消失, 矩阵权限状态更新
  事件流记录审批动作
```

### 2.5 查看节点晋升进度 -> 达标 -> 晋升

```
[用户切换到 "节点晋升" 标签]
  |
  v
[加载 PromotionPipeline]
  显示 4 个晋升阶段: Stage-0(胚胎) -> Stage-1(测试) -> Stage-2(主网) -> Stage-3(蜂群)
  当前阶段高亮, 已完成阶段用绿色勾标记
  |
  v
[各阶段指标条]
  每项指标显示: 指标名称 | 当前值/目标值 | 进度条
  进度条颜色: <50% 红色, 50-79% 琥珀色, >=80% 绿色
  |
  v
[所有指标达标时]
  "晋升" 按钮从禁用变为可用 (紫色主按钮)
  用户点击后 store.checkPromotion() 触发阶段变更
  顶部导航栏阶段徽章更新 (如 Stage-0 -> Stage-1)
  显示晋升成功通知 (持续3秒自动消失)
```

---

## 3. 组件设计规范

### 3.1 颜色系统

**基础背景层次**

| 层级 | Tailwind 类 | 十六进制值 | 用途 |
|------|------------|-----------|------|
| 页面背景 | `bg-gray-950` | `#030712` | 全局最底层 |
| 卡片/面板 | `bg-white/5` | `rgba(255,255,255,0.05)` | 内容容器 |
| 悬停态 | `bg-white/10` | `rgba(255,255,255,0.10)` | 交互反馈 |
| 激活态 | `bg-white/10` | 同上 | 导航当前项 |
| 输入框 | `bg-black/30` | `rgba(0,0,0,0.30)` | 表单控件 |

**AI 角色色 (三个角色, 永不混用)**

| 角色 | 主色 | 背景色 | 边框色 |
|------|------|--------|--------|
| AI-1 扩张者 | `text-blue-400` #60a5fa | `bg-blue-950/40` | `border-blue-800/50` |
| AI-2 审计者 | `text-amber-400` #fbbf24 | `bg-amber-950/40` | `border-amber-800/50` |
| AI-3 治理者 | `text-emerald-400` #34d399 | `bg-emerald-950/40` | `border-emerald-800/50` |

**状态色**

| 状态 | 颜色 | 用途 |
|------|------|------|
| 成功/已完成 | `text-green-400` / `bg-green-900/30` | 任务完成, 可结算 |
| 进行中/信息 | `text-blue-400` / `bg-blue-900/30` | 执行中, 已批准 |
| 警告/待处理 | `text-amber-400` / `bg-amber-900/30` | 待审计, 待复核 |
| 错误/拒绝 | `text-red-400` / `bg-red-900/30` | 失败, 已拒绝 |
| 特殊/争议 | `text-purple-400` / `bg-purple-900/30` | 待审批, 争议中 |
| 已过期/取消 | `text-gray-500` / `bg-gray-800` | 不可操作状态 |

**权限等级色 (L0-L4)**

| 等级 | 颜色 | 含义 |
|------|------|------|
| L0 | `text-green-400` + `bg-green-400/10` | 自主执行 |
| L1 | `text-blue-400` + `bg-blue-400/10` | 通知即可 |
| L2 | `text-amber-400` + `bg-amber-400/10` | 需审批 |
| L3 | `text-red-400` + `bg-red-400/10` | 双签名 |
| L4 | `text-gray-400` + `bg-gray-400/10` | 人工必须 |

### 3.2 排版规范

| 元素 | 字号 | 字重 | 行高 | 颜色 | 附加 |
|------|------|------|------|------|------|
| 页面标题 (H1) | `text-sm` 14px | `font-semibold` 600 | 默认 | `text-white` | 仅导航栏使用 |
| 区块标题 (H2) | `text-sm` 14px | `font-semibold` 600 | 默认 | `text-white` | 内容区顶部 |
| 小标题 (H3) | `text-xs` 12px | `font-semibold` 600 | 默认 | `text-gray-400` | 卡片内标题 |
| 分类标签 | `text-xs` 12px | `font-semibold` 600 | 默认 | `text-gray-500` | `uppercase tracking-wider` |
| 正文 | `text-sm` 14px | 正常 400 | 默认 | `text-gray-300` | 列表项文字 |
| 辅助文字 | `text-xs` 12px | 正常 400 | 默认 | `text-gray-400` | 描述, 时间戳 |
| 微型标签 | `text-[10px]` 10px | 正常 400 | 默认 | `text-gray-400` | 徽章, 注脚 |
| 数据值 | `text-xl` 20px | `font-semibold` 600 | 默认 | 语义色 | `font-mono` |
| 表格数据 | `text-xs` 12px | 正常 400 | 默认 | `text-gray-300` | `font-mono` 用于哈希/时间 |

**间距基准**: 全局基于 4px 栅格. 卡片内边距 `p-4` (16px), 行间距 `py-2` (8px), 组间距 `gap-4` (16px) 或 `gap-2` (8px).

### 3.3 组件库

**卡片**: `rounded-lg bg-white/5 border border-white/10 p-4`. 所有内容容器统一使用.

**统计卡片 (StatCard)**: `bg-white/5 rounded-lg p-3 text-center border border-white/5`. 数值 `text-xl font-mono font-semibold`, 标签 `text-[10px] text-gray-500 mt-1`.

**表格**: 外包裹 `rounded-lg border border-white/10 overflow-hidden`. 表头 `border-b border-white/5 text-gray-500 text-left`, 单元格 `px-3 py-2`, 行悬停 `hover:bg-white/[0.02]`, 行分隔 `border-b border-white/[0.03]`. 必须含 `<caption class="sr-only">`.

**进度条**: `<div role="progressbar" aria-valuenow={n} aria-valuemin={0} aria-valuemax={100}>`. 外框 `h-2 rounded-full bg-white/10`, 内填充 `h-full rounded-full transition-all duration-300`. 颜色: `<50% bg-red-500`, `50-79% bg-amber-500`, `>=80% bg-green-500`.

**状态徽章**: `text-[10px] px-1.5 py-0.5 rounded`. 背景色和文字色按状态色表选取. 状态点: `w-2 h-2 rounded-full` + 对应颜色, 脉冲态加 `animate-pulse`.

**主按钮**: `bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-md px-4 py-2 transition-colors`. 禁用态: `disabled:opacity-50 disabled:cursor-not-allowed`.

**次按钮**: `bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs rounded-md px-3 py-1.5`.

**危险按钮**: `bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-md px-3 py-1.5`.

**输入框**: `w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50`.

**导航标签**: `role="tab"`, 激活态 `bg-white/10 text-white`, 默认态 `text-gray-500 hover:text-gray-300 hover:bg-white/5`, 统一 `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors`.

### 3.4 响应式策略

| 断点 | 宽度 | 策略 |
|------|------|------|
| 桌面端 (主) | >= 1280px | 6列统计网格, 3列仪表盘布局 (2:1), `max-w-6xl mx-auto` |
| 小桌面 | 1024-1279px | 统计网格降为3列, 仪表盘保持3列 |
| 平板 (未来) | 768-1023px | 统计网格2列, 仪表盘2列 (1:1), 导航改为汉堡菜单 |
| 手机 (未来) | < 768px | 全部单列, 导航改为底部标签栏, 三核面板默认折叠 |

当前 v7.0 以桌面端为唯一交付目标. 所有组件使用 `max-w-6xl mx-auto` 约束最大宽度. 内容容器统一 `p-4` 内边距. 未来移动端适配时仅需添加断点媒体查询, 不改组件结构.

---

## 4. 可用性原则

| # | 原则 | 具体执行标准 |
|---|------|-------------|
| U1 | 3秒内看到核心数据 | 仪表盘统计卡片区在页面加载后 300ms 内渲染完成; 如后端未连接则显示 localStorage 缓存数据 |
| U2 | 操作不超过3步 | 创建并执行任务: 输入标题 -> 点击按钮 -> 查看结果 (2步); 购买剧本: 浏览 -> 点击购买 (2步) |
| U3 | 零歧义状态指示 | 每个状态同时提供: 颜色 + 文字标签 + 状态点/徽章. 禁止仅用颜色区分 |
| U4 | 操作过程可见 | 三核流水线运行时按钮显示 "流水线运行中...", 各 AI 面板状态灯实时切换 |
| U5 | 可撤销或可确认 | L2+ 权限操作显示确认对话框; 任务创建后支持查看详情; 市场购买前显示价格确认 |
| U6 | 渐进式信息展示 | 三核面板默认折叠仅显示角色名和状态; 展开后显示统计/任务/输出; 避免信息过载 |
| U7 | 一致性优于个性 | 所有卡片/表格/徽章/按钮严格使用 3.3 节组件库定义, 禁止临时自定义样式 |
| U8 | 空状态有引导 | "暂无任务" / "暂无结果报告" / "暂无上架剧本" 等空状态文字居中显示, 字号 `text-sm text-gray-400`, 容器内垂直居中 `py-12` |
| U9 | 数据格式统一 | 金额用 `font-mono`; 时间用 `toLocaleTimeString()` 或 `toLocaleString()`; 哈希截取前12位 + `font-mono text-[10px]`; 无效时间显示 "--" |
| U10 | 键盘完全可达 | 所有可点击元素支持 `tabIndex={0}` + `onKeyDown Enter`; 导航标签支持左右箭头切换; 焦点样式用 `focus:outline-none focus:border-blue-500/50` |

---

## 5. 无障碍要求 (WCAG 2.1 AA 执行清单)

| # | 要求 | 实现方式 | 验证方法 |
|---|------|---------|---------|
| A1 | 颜色不作为唯一信息载体 | 所有状态同时含文字标签或图标; TaskStatusDot 带 `aria-label` 和 `title` | 灰度模式下截图检查信息完整性 |
| A2 | 文本对比度 >= 4.5:1 | `text-gray-300` (#d1d5db) 在 `bg-gray-950` (#030712) 上对比度 12.7:1; `text-gray-500` (#6b7280) 对比度 5.2:1 | 使用 axe DevTools 扫描 |
| A3 | 大文本对比度 >= 3:1 | 统计数值 `text-xl` 使用高饱和度语义色, 均 >= 4:1 | 同上 |
| A4 | 导航使用 ARIA 标签 | `<nav aria-label="V6 导航">`, `role="tablist"`, `role="tab"`, `aria-selected` | 屏幕阅读器 (VoiceOver) 测试 |
| A5 | 表格含隐藏标题 | 每个 `<table>` 含 `<caption class="sr-only">` 描述用途 | DOM 检查 |
| A6 | 进度条含 ARIA 属性 | `role="progressbar"` + `aria-valuenow` + `aria-valuemin="0"` + `aria-valuemax="100"` | DOM 检查 |
| A7 | 可展开面板标注状态 | TrinityPanel 按钮含 `aria-expanded={boolean}` + `aria-label="展开 {角色名} 面板"` | VoiceOver 测试 |
| A8 | 焦点可见性 | 所有交互元素的 `:focus` 态有可见边框变化 (`focus:border-blue-500/50`); 焦点顺序遵循 DOM 顺序 | Tab 键遍历测试 |
| A9 | 装饰图标标注 | 纯装饰图标 (chevron) 加 `aria-hidden="true"`; 功能图标加 `aria-label` | DOM 检查 |
| A10 | 键盘操作等效 | 任务列表项 `tabIndex={0}` + Enter 键触发选中; 导航标签支持 Enter 切换 | 纯键盘操作测试 |
| A11 | 动画可停止 | 状态灯 `animate-pulse` 仅在 thinking/executing 时启用; 遵循 `prefers-reduced-motion` 时禁用脉冲 | 系统设置 "减少动态效果" 测试 |
| A12 | 语言标注 | `<html lang="zh-CN">` 确保屏幕阅读器使用中文发音 | DOM 检查 |

---

*文档结束. 总计 248 行. 所有规范可直接用于前端实现, 无需额外沟通.*
