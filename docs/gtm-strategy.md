# NewClaw Go-To-Market 增长策略：12 个月达成 100K 用户

> 定位：NewClaw 是第一个让 AI 代理拥有身份、经济和治理能力的开源框架。

---

## 1. 目标用户画像

### 1A. 独立开发者 & AI 工程师（占比 50%）

**痛点**：LangChain 只能串联 prompt，没有权限控制，Agent 输出不可审计，生产环境不敢用。AutoGPT 跑飞了没有刹车机制，烧 token 没有产出验证。

**我们的解决方案**：
- L0-L4 权限保险丝矩阵 -- 危险操作执行前拦截，不是执行后补救
- 六本治理账本 + SHA-256 哈希链 -- 每个决策有审计追踪
- PoO（Proof of Outcome）-- 执行结果可验证，PriorityScore >= 85 防止空转
- 5 分钟从 `pnpm dev` 到首个 Trinity 循环 -- 上手门槛极低

**获客渠道**：GitHub、HackerNews、Reddit r/LocalLLaMA、掘金、V2EX

### 1B. AI 创业者 & 产品经理（占比 30%）

**痛点**：需要可控、可审计的 AI Agent 系统来构建产品。现有框架没有经济激励层，无法构建可商业化的 Agent 生态。

**我们的解决方案**：
- 知识市场 -- Playbook 可定价、交易，成功策略变资产
- New.B 经济系统 -- 内置代币经济，用户贡献即获奖励
- 节点晋升流水线 -- 5 阶段进化路径（模拟到联邦），给产品自然的用户成长体系
- 三核辩论机制 -- 作为产品差异化卖点：AI 不是盲目执行，是三方博弈后的决策

**获客渠道**：ProductHunt、Twitter/X AI 圈、独立开发者社区、YC/创业社区

### 1C. Web3 社区 & 去中心化治理爱好者（占比 20%）

**痛点**：DAO 治理效率低，缺乏 AI 辅助决策工具。想参与 AI 生态但没有低门槛入口。

**我们的解决方案**：
- DID 身份系统 -- Ed25519 密钥对 + `did:newclaw:<hex32>` 格式，原生去中心化
- 三权分立治理 -- 提案/审计/决策的制衡模型，与 DAO 理念天然契合
- New.B 减半机制 -- 比特币式经济模型，早期参与者红利明确
- 联邦扩展路线图 -- 从单节点到蜂群网络的去中心化愿景

**获客渠道**：Telegram/Discord Web3 社群、Mirror.xyz、Farcaster

---

## 2. 差异化定位

### 一句话定位
**"NewClaw 是第一个让 AI 代理拥有身份、经济和治理能力的开源框架 -- 不只是提示词。"**

### 竞品对比核武器（PR/内容中反复使用的对比表）

| 维度 | NewClaw | LangChain | AutoGPT | CrewAI |
|---|---|---|---|---|
| 治理模型 | 三权分立 + 宪法约束 | 无 | 无 | 角色制，无制衡 |
| 权限控制 | L0-L4 保险丝矩阵 | 无 | 无 | 无 |
| 审计追踪 | 6 本账本 + 哈希链 | 非结构化日志 | 非结构化日志 | 基础日志 |
| 结果验证 | PoO 预言机 | 无 | 无 | 无 |
| 经济系统 | New.B + 知识市场 | 无 | 无 | 无 |
| 代理身份 | DID + Ed25519 | 无 | 无 | 无 |

### 核心叙事（所有内容的主线）
> "其他框架让 AI 执行任务。NewClaw 让 AI 像公民一样运作 -- 有身份、有经济、有法律、有选举。这不是 prompt 工程的进化，是 AI 治理的范式转移。"

---

## 3. 增长渠道策略（按优先级排序）

### P0 -- GitHub Stars 增长（核心阵地）

**目标**：Month 1 达到 1000 Stars

**README 优化 Checklist**：
- 首屏 GIF/视频：三核辩论实时演示（15 秒循环）-- 这是最强视觉钩子
- 一键 Quick Start 区块置顶，确保 5 分钟可跑通
- 竞品对比表保留在首屏可见范围
- 添加 "Star History" 徽章和 "Used By" logo 墙（早期手动邀请 10 个项目使用）

**Trending 策略**：
- 选择周二/周三 UTC 上午发布（GitHub Trending 算法偏好工作日活跃）
- 发布当天在 5 个渠道同时推送（HN + Reddit + Twitter + 掘金 + V2EX）
- 前 48 小时集中所有社交资源冲 Star，触发 Trending 算法
- 提前准备 20 个高质量 Issue 模板，让早期用户有参与入口

### P1 -- 英文开发者社区

**HackerNews**：
- 标题公式：`Show HN: NewClaw -- Open-source AI framework with governance, not just prompts`
- 发帖时间：周二 9:00 AM EST（HN 流量高峰）
- 准备 500 字 founder story 作为首条评论（为什么 AI Agent 需要三权分立）
- 目标：首页停留 4+ 小时，带来 500+ Stars

**Reddit r/LocalLLaMA**（40 万+ 订阅）：
- 帖子类型：技术深度帖 + 演示视频
- 切入角度："I built an AI agent framework where 3 AIs debate before doing anything"
- 跟进帖："How NewClaw's permission fuse prevents your AI from going rogue"

**ProductHunt**：
- 安排在 Month 2 发布（需要足够 polish）
- 目标：当日 Top 5 Product
- 准备素材：4 张产品截图 + 1 分钟演示视频 + Maker 评论
- 提前联系 50 个 PH 活跃用户预约投票

### P2 -- 中国开发者社区

**掘金（juejin.cn）**：
- 系列文章："AI 代理的三权分立" -- 拆成 6 篇技术深度文章
- 每篇文章末尾放 GitHub 链接和 Quick Start 命令
- 目标：每篇 5000+ 阅读，总计从掘金引流 800+ Stars

**V2EX**：
- 在 /t/programmer 和 /t/create 板块发帖
- 风格：开发者日记，讲架构设计的决策过程
- 避免营销感，突出技术深度

**知乎**：
- 回答 "AI Agent 框架怎么选" 类高流量问题
- 发布专栏文章对比 NewClaw vs LangChain 的架构差异

**B 站技术视频**：
- Month 2 开始，每两周一个 10 分钟技术演示视频
- 第一期："3 个 AI 吵架做决策 -- NewClaw Trinity 引擎实战"
- 目标：技术区播放量 5000+/期

### P3 -- Twitter/X 技术社区

**内容策略**：
- 每周 3 条推文：1 条产品更新 + 1 条技术深度 + 1 条 meme/对比
- Thread 公式："Why AI agents need a constitution (and how we built one) [1/8]"
- 互动策略：回复所有 AI Agent 相关热门推文，引导关注
- 关键 KOL 名单：找 20 个 5K-50K follower 的 AI/开源 KOL，给他们早期 access

### P4 -- Discord/Telegram 社区建设

**Discord（核心社区）**：
- 频道结构：#general / #showcase / #bugs / #feature-requests / #chinese / #governance-debate
- Week 1 目标：100 人种子社区（从 GitHub Star 用户私信邀请）
- Month 3 目标：2000 人活跃社区
- 每周 AMA：创始人回答技术和路线图问题
- 设置 Bot 自动同步 GitHub 活动到 Discord

**Telegram**：
- 中文群组，作为中国开发者的主要即时通讯渠道
- 与 Discord 内容同步但独立运营

---

## 4. 内容营销计划（前 12 周排期）

### Phase 1: 产品发布 + 核心概念（Week 1-4）

| 周 | 内容 | 渠道 | KPI |
|---|---|---|---|
| W1 | "Show HN" 发布帖 + GitHub README 上线 | HN, Reddit, Twitter | 500 Stars |
| W1 | 中文发布帖："首个 AI 代理治理框架开源了" | 掘金, V2EX, 知乎 | 300 Stars |
| W2 | 技术文章："为什么 AI Agent 需要三权分立" | 博客, Medium, 掘金 | 3000 阅读 |
| W2 | Twitter Thread: "AI agents without governance = chaos" | Twitter/X | 50K 曝光 |
| W3 | 技术文章："深入 NewClaw 六本治理账本的设计" | 博客, 掘金 | 2000 阅读 |
| W3 | Reddit 深度帖："How permission fuses prevent AI disasters" | r/LocalLLaMA | 200 upvotes |
| W4 | 对比文章："NewClaw vs LangChain vs CrewAI -- 架构级差异" | 所有渠道 | 5000 阅读 |

### Phase 2: 教程系列 + 视频演示（Week 5-8）

| 周 | 内容 | 渠道 | KPI |
|---|---|---|---|
| W5 | 视频教程："5 分钟搭建你的第一个 Trinity Agent" | YouTube, B站 | 3000 播放 |
| W5 | ProductHunt 发布 | ProductHunt | Top 5 |
| W6 | 教程文章："用 NewClaw 构建自审计的代码审查 Agent" | 博客, 掘金 | 2000 阅读 |
| W7 | 视频："NewClaw 知识市场 -- 让你的 AI 策略变成资产" | YouTube, B站 | 2000 播放 |
| W8 | 教程："从 LangChain 迁移到 NewClaw 的完整指南" | 博客, Medium | 3000 阅读 |

### Phase 3: 案例研究 + 社区活动（Week 9-12）

| 周 | 内容 | 渠道 | KPI |
|---|---|---|---|
| W9 | 案例："某团队用 NewClaw 管理 50 个 AI Agent 的实战经验" | 博客, 所有渠道 | 5000 阅读 |
| W10 | 首届 NewClaw Hackathon 启动（线上，为期 2 周） | Discord, Twitter | 100 参赛者 |
| W11 | 技术文章："New.B 经济模型深度解析 -- 为什么 Agent 需要货币" | 博客, Web3 渠道 | 3000 阅读 |
| W12 | Hackathon 成果展示 + 获奖项目 Showcase | 所有渠道 | 50 个新项目 |

---

## 5. 病毒增长机制（内置产品飞轮）

### 5A. 知识市场交易 = 自然传播引擎

**机制**：用户创建高质量 Playbook -> 定价上架知识市场 -> 其他用户购买 -> PoO 验证效果 -> 好评 Playbook 获得更多曝光。

**增长飞轮**：
- 每次 Playbook 交易，买卖双方各获得一个可分享的 "交易卡片"（含 Playbook 名称 + 效果评分）
- 卖家有动力在社交媒体分享自己的 Playbook 销售成绩
- 设置 "Playbook of the Week" 榜单，自动生成可分享的排行海报
- **K-factor 设计目标**：每个活跃卖家平均邀请 2.5 个新用户

### 5B. 节点晋升排行榜 = 社交竞争

**机制**：Stage 0 到 Stage 4 的晋升进度公开可见，四项指标（outcomes / compliance / reconciliation / stability）构成排行榜。

**增长飞轮**：
- 全局排行榜展示 Top 100 节点及其晋升阶段
- 每次晋升自动生成可分享的 "晋升证书" 图片（含 DID 和阶段徽章）
- Discord 中设置与 Stage 对应的角色颜色（Stage 4 = 金色，极度稀缺）
- **竞争心理**：开发者天然爱排名，Stage 4 "Federated" 成为社区荣誉象征

### 5C. New.B 经济激励 = 早期参与者红利

**机制**：比特币式减半计划，早期挖矿奖励最高。

**增长飞轮**：
- 首批 1000 个节点获得 "Genesis Node" 永久标识
- 减半倒计时公开显示 -- 制造 FOMO（"距离下次减半还剩 X 天"）
- 推荐新用户注册，推荐人和被推荐人各获 50 New.B 奖励
- 知识市场交易手续费的 10% 进入社区基金，用于 Hackathon 奖金
- **目标**：通过经济激励让 Month 3 的 DAU/MAU 比率达到 30%+

### 增长飞轮总图

```
新用户注册 -> 获得 100 New.B -> 执行 Trinity 任务 -> 赚取 New.B
     |                                                    |
     v                                                    v
分享晋升证书 <- 节点晋升 <- 积累四项指标 <- 创建 Playbook -> 上架市场
     |                                                    |
     v                                                    v
社交传播 -> 吸引新用户 ---------> 购买 Playbook -> 验证效果 -> 好评
```

---

## 6. 里程碑：从 0 到 100K 的增长路径

### Month 1: 冷启动（目标 1000 Stars）

| 动作 | 预期产出 |
|---|---|
| GitHub 上线 + README 优化完成 | 基础设施就绪 |
| HackerNews Show HN 发布 | 300-500 Stars |
| Reddit r/LocalLLaMA 帖子 | 100-200 Stars |
| 掘金 + V2EX 发布 | 200-300 Stars |
| Discord 种子社区建立 | 100 人 |
| Twitter 账号启动 + 首周 10 条推文 | 500 followers |

### Month 3: 社区成型（目标 5000 Stars + 500 活跃节点）

| 动作 | 预期产出 |
|---|---|
| ProductHunt 发布 | 1000-1500 Stars |
| 教程系列 6 篇发布完成 | 持续引流 500/月 |
| B 站首批 4 个视频上线 | 中文社区渗透 |
| Discord 达到 2000 人 | 社区自运转开始 |
| 首届 Hackathon 完成 | 50 个社区项目 |
| 知识市场首批 100 个 Playbook 上架 | 交易飞轮启动 |

### Month 6: 增长加速（目标 20K Stars + 5000 活跃节点）

| 动作 | 预期产出 |
|---|---|
| 二次 HN 发布（V7 正式版） | 3000-5000 Stars |
| 知识市场日交易量达 200+ | 病毒传播启动 |
| 与 3 个 AI 工具集成（Cursor/Windsurf 等） | 生态扩展 |
| 开发者大使计划启动（20 人） | 分布式内容生产 |
| 中文 + 英文双语内容矩阵成熟 | 双市场增长 |
| 首批 Stage 3+ 节点出现 | 晋升排行榜引发竞争 |

### Month 12: 规模化（目标 100K 用户）

| 动作 | 预期产出 |
|---|---|
| V8 联邦网络上线 | 多节点协作 |
| 知识市场月交易额达 100 万 New.B | 经济飞轮 |
| 50+ 社区贡献者，200+ Fork | 开源生态成型 |
| 企业版/托管版 Beta | 商业化验证 |
| 第二届 Hackathon（全球线上+线下） | 品牌影响力 |
| DAU 10K+，MAU 30K+ | 100K 累计用户 |

### 关键增长公式

```
Month 1-3:  手动推动为主（创始人亲自发帖、回复、拉人）
Month 3-6:  内容引擎 + 社区自增长（教程/视频持续引流 + Discord 自运转）
Month 6-9:  产品飞轮启动（知识市场交易 + 晋升排行 + New.B 激励）
Month 9-12: 网络效应（节点间交易 + 联邦扩展 + 生态合作）
```

**北极星指标**：周活跃节点数（WAU） -- 不是 Stars，不是下载量，是真正在跑 Trinity 任务的节点。

---

## 附录：执行优先级矩阵

| 优先级 | 动作 | 投入 | 预期 ROI |
|---|---|---|---|
| **立刻做** | README 加演示 GIF + HN 发布 | 2 天 | 500+ Stars |
| **本周** | Discord 建群 + Twitter 启动 | 1 天 | 社区基础 |
| **两周内** | 掘金首篇技术文章 + V2EX 发帖 | 3 天 | 中文市场渗透 |
| **一个月内** | 教程系列启动 + B 站首个视频 | 持续 | 长尾引流 |
| **两个月内** | ProductHunt 发布 + Hackathon 筹备 | 1 周 | 爆发式增长 |
