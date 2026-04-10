# 我用 AI 审计 AI：一个让 AI 代理互相打分和换届的治理框架

# I Made AI Audit AI: A Governance Framework Where AI Agents Score and Rotate Each Other

---

> **TL;DR:** We built a dual-core governance system where one AI executes and another audits it with a six-dimensional scoring rubric. Poor scores trigger agent rotation in 30 seconds. Idle rate dropped from 60% to 5%. 87 inspection rounds, 593 tests, defects from 31 to 0.

---

## Hook: 你的 AI 在空转，你知道吗？

你派了一个 AI Agent 去写代码。它回复你"好的，我来处理"。然后呢？

你怎么知道它真的在推进？你怎么知道它没有在循环里打转？你怎么知道它产出的东西质量过关？

**你不知道。**

这是 2026 年 AI Agent 框架的致命盲区：所有人都在讨论怎么让 AI 更强、更快、更聪明，但没人在讨论——**谁来审计它？**

我们团队在开发 NewClaw（一个桌面 AI 超级助手）的过程中，撞上了这堵墙。我们让 Claude 同时管理 146 个专业代理，每 5 分钟巡检一次。结果发现：**没有审计的 AI，空转率高达 60%。**

所以我们做了一件听起来疯狂的事——让另一个 AI 来审计它。

结果？它奏效了。而且效果好得离谱。

---

## 故事：第一次审计打分的 30 秒

2026 年初，我们的 NewClaw 项目进入深水区。146 个 AI 代理在并行工作：前端代理改 UI、测试代理跑 Vitest、国际化代理翻译文案、安全代理扫描漏洞。

我们的指挥架构很简单：

```
用户（老板）-> 说目标
CEO-A（Claude）-> 拆解 + 派活 + 协调 + 审核
146 个专业代理 -> 执行交付
```

问题出在哪？CEO-A 太"乐观"了。它每次汇报都说"进展顺利"、"已完成 90%"、"即将收尾"。但实际交付物一检查——到处是漏洞。

**于是我们引入了审计-B。**

审计-B 的第一轮评分把 CEO-A 打了 89 分。评分报告写道：

> "任务完成度 20/25：计划说要修 5 个 TS 错误，实际只修了 3 个。交付质量 18/25：两个修复引入了新的类型推断问题。效率 10/15：本可以并行派两个代理，却串行执行。"

**CEO-A 在 30 秒内就做出了反应**——重新派遣代理、调整优先级、修正计划。

为什么？因为分数是有后果的。低分意味着更快被轮换下台。

### 数据说话

引入审计-B 后的数据变化：

| 指标 | 审计前 | 审计后 |
|------|--------|--------|
| 代理空转率 | ~60% | ~5% |
| 累计巡检轮次 | - | 87 轮 |
| 测试用例 | 零散 | 593 个 |
| 已知缺陷 | 31 个 | 0 个 |
| 每轮实际推进率 | ~40% | ~95% |

这不是理论。这是 87 轮真实巡检跑出来的数据。

---

## 技术方案：六维评分 + 轮换公式

### 1. 三阶段流水线

每一轮决策都经过三个阶段：

```
阶段一（CEO-A）：生成方案，结论先行，高信息密度
    |
阶段二（审计-B）：评估完成度 + 打分 + 发现盲区
    |
阶段三（综合定稿）：CEO-A 结合审计意见修正后输出
```

关键在于：**审计-B 不是附庸。它有真实权力。** 它的评分直接影响 CEO-A 的"执政周期"。

### 2. 六维评分体系

```typescript
// governance-scoring.ts

interface GovernanceScore {
  taskCompletion: number;    // 25% - 上轮计划是否 100% 执行
  deliveryQuality: number;   // 25% - 代理产出质量是否达标
  planValue: number;         // 15% - 计划的价值和水平
  efficiency: number;        // 15% - 是否并行、是否空转
  strategicJudgment: number; // 10% - 是否推进了终极目标
  riskControl: number;       // 10% - 是否发现并避免了问题
}

const WEIGHTS = {
  taskCompletion:    0.25,
  deliveryQuality:   0.25,
  planValue:         0.15,
  efficiency:        0.15,
  strategicJudgment: 0.10,
  riskControl:       0.10,
};

function calculateWeightedScore(score: GovernanceScore): number {
  return Object.entries(WEIGHTS).reduce((total, [key, weight]) => {
    return total + score[key as keyof GovernanceScore] * weight;
  }, 0);
}
```

审计-B 每轮必须对六个维度**单独打分并给出理由**。不允许笼统的"表现不错"。

### 3. 轮换公式：绩效决定任期

这是整个系统最巧妙的部分。默认每 10 轮轮换一次 CEO 和审计角色。但优秀的 CEO 可以获得更长任期：

```typescript
function calculateTenure(avgScore: number): number {
  // 公式：(avgScore / 10 - 9) * 10 + 10
  const bonusRounds = (avgScore / 10 - 9) * 10;
  const totalTenure = bonusRounds + 10;
  return Math.max(10, Math.min(20, totalTenure));
}

// 平均 90 分 -> (9.0 - 9) * 10 + 10 = 10 轮（无奖励）
// 平均 95 分 -> (9.5 - 9) * 10 + 10 = 15 轮
// 平均 100 分 -> (10.0 - 9) * 10 + 10 = 20 轮（最大）
```

这个公式的设计意图：

- **90 分以下**：你连基线都没达到，10 轮就换人
- **90-100 分**：每高 1 分，多执政 1 轮
- **硬上限 20 轮**：即使满分也必须轮换，防止角色固化

为什么不让 100 分的 CEO 永远执政？因为**审计者长期不执行会丧失判断力**，执行者长期不审计会丧失自省能力。轮换是刻意的、有价值的。

### 4. 巡检触发机制

系统有三种触发方式确保永动运行：

```typescript
type InspectionTrigger =
  | 'scheduled'   // 每 5 分钟定时触发
  | 'completion'  // 子代理完成后立即触发
  | 'silence';    // 子代理长时间无响应，CEO 主动追问

interface InspectionReport {
  trigger: InspectionTrigger;
  auditAssessment: {
    previousTasks: string[];
    completionStatus: boolean[];
    qualityNotes: string[];
    residualIssues: string[];
  };
  systemStatus: {
    tsErrors: number;
    testsPassed: number;
    agentStates: Map<string, 'working' | 'idle' | 'blocked'>;
  };
  nextPlan: {
    targetAgent: string;
    task: string;
    acceptanceCriteria: string[];
  };
  strategicGap: string; // "距离 100 万用户还差什么？"
}
```

每一轮巡检强制包含：上轮完成度评估、系统状态快照、下轮具体计划、战略差距分析。**没有一轮是空的。**

### 5. 为什么这比单一 AI 和简单多 Agent 好

| 方案 | 问题 |
|------|------|
| 单一 AI | 没有纠偏机制，幻觉和空转无人发现 |
| 简单多 Agent | 多个 AI 各干各的，没有问责和淘汰机制 |
| 分层指挥（无审计） | CEO 层自我评估，标准必然偏软 |
| **双核博弈（本方案）** | 执行和审计分离 + 评分有后果 + 强制轮换 |

核心区别在于：**分数是有后果的**。不是打完分就结束了——分数直接决定你还能当多久的 CEO。这把"审计"从形式主义变成了真实的权力制衡。

---

## 哲学：想法零价值，结果才有价值

NewClaw 团队有一条"第零条"价值观：

> **想法不值钱。只有经过真实世界的验证，产生大量社会价值和经济价值，才值钱和有价值。**

这条价值观直接塑造了我们的治理系统。我们不评估 AI 的"推理过程"是否优雅，我们只看结果：TS 错误清零了吗？测试通过了吗？用户能用了吗？

这和 NewClaw 产品的核心理念完全一致——我们在产品中引入了 **Proof of Outcome（结果证明）** 体系：

> 不看 AI 说了什么（Proof of Words），看 AI 做出了什么（Proof of Outcome）。

**万次迭代法则**：不怕试错，就怕不能及时纠错。大胆试、快速纠、持续逼近真实价值。

```
大胆试（CEO-A 高授权执行）
  -> 快速纠（审计-B 实时评分纠偏）
  -> 逼近真实价值（结果才有价值）
  -> 继续大胆试...
```

这里有一个"元证明"（meta-proof）：**我们管理 AI 的方式，就是我们产品教用户管理 AI 的方式。** 双核博弈不只是一个开发方法论——它就是 NewClaw 产品本身的一部分。我们 dogfooding 的不是代码，而是治理哲学。

---

## English Section: Why This Matters for the AI Agent Ecosystem

Most AI agent frameworks in 2026 focus on capability -- making agents smarter, faster, more autonomous. Almost none focus on **accountability**.

Here is the problem: when you deploy an autonomous AI agent, you are trusting it to self-report its own performance. That is like asking a student to grade their own exam.

NewClaw's dual-core governance solves this with three mechanisms:

1. **Separation of execution and audit.** CEO-A executes. Auditor-B scores. They are structurally prevented from colluding because their roles rotate.

2. **Scores have consequences.** The six-dimensional rubric (task completion, delivery quality, plan value, efficiency, strategic judgment, risk control) produces a weighted score that directly determines how long the current CEO stays in power.

3. **Mandatory rotation prevents capture.** Even a perfect-scoring CEO must rotate after 20 rounds. This ensures the auditor maintains execution context, and the executor maintains self-reflection capacity.

The rotation formula is elegant: `tenure = (avgScore / 10 - 9) * 10 + 10`, clamped to [10, 20]. A 95-average CEO gets 15 rounds. A 90-average gets the default 10. Simple, transparent, consequential.

**Results from 87 real inspection rounds:** Agent idle rate dropped from 60% to 5%. Defects went from 31 to zero. Test coverage grew to 593 cases. Every single inspection round produced measurable forward progress.

This is not theoretical. This is production governance running on a real product with 146 concurrent AI agents.

---

## Call to Action: 给你的 AI 一个审计官

如果你正在构建 AI Agent 系统，问自己三个问题：

1. **你的 AI 有审计吗？** 不是 logging，不是 monitoring——是另一个 AI 在看着它、打分、并有权力换掉它。

2. **你的评分有后果吗？** 如果打完分什么都不发生，那评分就是形式主义。分数必须连接到真实的权力变更。

3. **你的角色会轮换吗？** 永远的审计者会丧失执行直觉，永远的执行者会丧失自省能力。轮换不是惩罚，是进化。

NewClaw 是开源的。我们的治理系统不只是理论——它正在生产环境运行，管理着 146 个 AI 代理，推动我们向 100 万用户的目标前进。

**Try it:**
- GitHub: [github.com/anthropics/newclaw](https://github.com/anthropics/newclaw)
- Documentation: [docs.newclaw.dev](https://docs.newclaw.dev)

**核心理念只有一句话：不看 AI 说了什么，看 AI 做出了什么。**

给你的 AI 一个审计官。然后看看它真正的表现。

---

*Originally published for the NewClaw project. Feedback welcome: open an issue or start a discussion on GitHub.*
