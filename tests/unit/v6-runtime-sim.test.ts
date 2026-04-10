// ============================================================================
// V6 运行时模拟 - 全功能交互链路验证（直接引擎测试，绕过 zustand persist）
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createDefaultConstitution, completeMilestone, getPermissionLevelForAction, validateConstitution } from '@/lib/v6/constitution'
import { createTrinityAgents, createTask, runProposalPhase, runAuditPhase, runApprovalPhase, failTask, advanceTaskPhase, updateAgentStatus, recordAgentCompletion } from '@/lib/v6/engine'
import { createEmptyLedgers, addEvidence, addValueAssessment, addDebt, resolveDebt, addCaseLaw, addLocalLedgerEntry, getLedgerSummary, getBalance, getActiveEvidence, getEvidenceByGrade, getOpenDebts } from '@/lib/v6/ledger'
import { createDefaultOracleRules, generateOutcomeReport, evaluateOutcome, settleOutcome, getOracleStats } from '@/lib/v6/oracle'
import { createDefaultFuseMatrix, checkPermission, createPermissionRequest, addApproval, resolveRequest, isFullyApproved, getPermissionStats } from '@/lib/v6/fuse-matrix'
import { createInitialNodeStatus, checkPromotionEligibility, promoteNode, calculateNodeMetrics, calculatePromotionProgress, STAGE_CONFIG } from '@/lib/v6/promotion'
import { createDemoMarket, purchasePlaybook, executePlaybook, recordMarketTransaction, getMarketStats, createPlaybookListing, listPlaybook } from '@/lib/v6/market'
import type { OutcomeReport } from '@/types/v6'

describe('V6 全功能运行时模拟', () => {

  // =========================================================================
  // FLOW 1: 完整任务流水线（仪表盘核心功能）
  // =========================================================================
  describe('FLOW 1: 完整任务流水线', () => {
    it('proposal → audit → approval → complete 全链路', () => {
      const constitution = createDefaultConstitution()
      let ledgers = createEmptyLedgers()
      const rules = createDefaultOracleRules()

      // 创建任务
      const task = createTask('API集成测试', '验证REST API集成', 'ai1-expander', 'L0')
      expect(task.status).toBe('draft')
      expect(task.phase).toBe('proposal')

      // Phase 1: 提案
      const r1 = runProposalPhase(task, '提案：实现API集成方案')
      expect(r1.task.phase).toBe('audit')
      expect(r1.task.status).toBe('pending-audit')
      expect(r1.task.outputs).toHaveLength(1)
      expect(r1.events.length).toBeGreaterThan(0)

      // Phase 2: 审计
      const r2 = runAuditPhase(r1.task, constitution, '审计通过-低风险', 'low')
      expect(r2.task.phase).toBe('approval')
      expect(r2.task.status).toBe('pending-approval')
      expect(r2.blocked).toBe(false)

      // Phase 3: 审批
      const r3 = runApprovalPhase(r2.task, constitution, true, 0)
      expect(r3.task.phase).toBe('execution')
      expect(r3.task.status).toBe('executing')

      // Phase 4: 执行完成 → 生成 Outcome
      const completedTask = advanceTaskPhase({ ...r3.task, phase: 'execution', status: 'completed' })
      expect(completedTask.phase).toBe('review')

      // 生成 Outcome Report
      const outcome = generateOutcomeReport(completedTask, '已完成', 'trinity-pipeline', 'H3')
      expect(outcome.taskId).toBe(task.id)
      expect(outcome.reconciliationHash).toBeTruthy()

      // 添加证据后评估
      ledgers = addEvidence(ledgers, '结果有效', 'trinity-pipeline', 'H3', 'ai2-auditor', task.id)
      const evaluated = evaluateOutcome(outcome, rules, ledgers)
      expect(['settleable', 'rejected', 'pending-review']).toContain(evaluated.oracleVerdict)

      // 如果可结算则结算
      if (evaluated.settleable) {
        const settled = settleOutcome(evaluated)
        expect(settled.settledAt).toBeDefined()
      }
    })

    it('critical 风险审计阻断任务', () => {
      const constitution = createDefaultConstitution()
      const task = createTask('高危操作', '系统级变更')
      const r1 = runProposalPhase(task, '提案')
      const r2 = runAuditPhase(r1.task, constitution, '发现严重安全漏洞', 'critical')
      expect(r2.blocked).toBe(true)
      expect(r2.task.status).toBe('blocked')
    })

    it('审批拒绝阻断任务', () => {
      const constitution = createDefaultConstitution()
      const task = createTask('被拒任务', '测试拒绝')
      const r1 = runProposalPhase(task, '提案')
      const r2 = runAuditPhase(r1.task, constitution, '通过', 'low')
      const r3 = runApprovalPhase(r2.task, constitution, false)
      expect(r3.blocked).toBe(true)
      expect(r3.task.status).toBe('blocked')
    })

    it('failTask 记录失败并添加审计输出', () => {
      const task = createTask('会失败的任务', '故意失败')
      const failed = failTask(task, '关键依赖不可用')
      expect(failed.status).toBe('failed')
      expect(failed.outputs.length).toBeGreaterThan(0)
      expect(failed.outputs[0].content).toContain('FAILED')
    })
  })

  // =========================================================================
  // FLOW 2: 知识市场全流程
  // =========================================================================
  describe('FLOW 2: 知识市场', () => {
    it('购买 → 余额变化 → 订单记录 → 执行', () => {
      let market = createDemoMarket()
      const listings = market.listings.filter(l => l.status === 'listed' && l.seller !== 'node-local')
      expect(listings.length).toBeGreaterThanOrEqual(2)

      const listing = listings[0]
      const balanceBefore = market.nodeBalance['node-local']

      const { market: m2, order } = purchasePlaybook(market, listing.id, 'node-local')
      expect(order).not.toBeNull()
      expect(order!.status).toBe('completed')
      expect(m2.nodeBalance['node-local']).toBe(balanceBefore - listing.price)
      expect(m2.listings.find(l => l.id === listing.id)!.status).toBe('sold')

      // 执行
      const m3 = executePlaybook(m2, order!.id, '执行成功')
      expect(m3.orders.find(o => o.id === order!.id)!.executionResult).toBe('执行成功')

      // 重复购买应失败
      const { order: order2, error } = purchasePlaybook(m3, listing.id, 'node-local')
      expect(order2).toBeNull()
      expect(error).toContain('not available')
    })

    it('余额不足时拒绝购买', () => {
      let market = createDemoMarket()
      market = { ...market, nodeBalance: { ...market.nodeBalance, 'node-broke': 0 } }
      const listing = market.listings.find(l => l.status === 'listed')!

      const { order, error } = purchasePlaybook(market, listing.id, 'node-broke')
      expect(order).toBeNull()
      expect(error).toContain('Insufficient')
    })

    it('不能购买自己的剧本', () => {
      let market = createDemoMarket()
      const listing = market.listings.find(l => l.seller === 'node-alpha')!
      const { order, error } = purchasePlaybook(market, listing.id, 'node-alpha')
      expect(order).toBeNull()
      expect(error).toContain('own listing')
    })

    it('账本正确记录市场交易', () => {
      let market = createDemoMarket()
      let ledgers = createEmptyLedgers()
      const listing = market.listings.find(l => l.status === 'listed' && l.seller !== 'node-local')!
      const { order } = purchasePlaybook(market, listing.id, 'node-local')

      ledgers = recordMarketTransaction(ledgers, order!, 'buyer')
      const trades = ledgers.localLedger.filter(e => e.type === 'market-trade')
      expect(trades).toHaveLength(1)
      expect(trades[0].amount).toBe(-listing.price)
    })

    it('市场统计准确', () => {
      const market = createDemoMarket()
      const stats = getMarketStats(market)
      expect(stats.listed).toBe(3)
      expect(stats.sold).toBe(0)
      expect(stats.totalVolume).toBe(0)
    })
  })

  // =========================================================================
  // FLOW 3: 权限保险丝矩阵
  // =========================================================================
  describe('FLOW 3: 权限矩阵', () => {
    it('L0 自动执行', () => {
      const matrix = createDefaultFuseMatrix()
      const { allowed, fuse } = checkPermission(matrix, 'L0')
      expect(allowed).toBe(true)
      expect(fuse.autoExecute).toBe(true)
    })

    it('L4 永久禁止', () => {
      const matrix = createDefaultFuseMatrix()
      const { allowed } = checkPermission(matrix, 'L4')
      expect(allowed).toBe(false)
    })

    it('L3 需要 AI-2 + AI-3 + 人类三方批准', () => {
      const matrix = createDefaultFuseMatrix()
      let req = createPermissionRequest('task-1', 'ai1-expander', 'L3', '真实钱包交易', '描述')

      // AI-2 单独批准 → 不够
      req = addApproval(req, 'ai2-auditor', 'approve', 'AI-2通过')
      expect(isFullyApproved(req, matrix)).toBe(false)

      // AI-3 批准 → 仍不够
      req = addApproval(req, 'ai3-governor', 'approve', 'AI-3通过')
      expect(isFullyApproved(req, matrix)).toBe(false)

      // 人类批准 → 通过
      req = addApproval(req, 'human', 'approve', '人类批准')
      expect(isFullyApproved(req, matrix)).toBe(true)

      // 解析状态
      const resolved = resolveRequest(req, matrix)
      expect(resolved.status).toBe('approved')
    })

    it('拒绝立即终止审批流程', () => {
      const matrix = createDefaultFuseMatrix()
      let req = createPermissionRequest('task-1', 'ai1-expander', 'L2', '测试网转账', '描述')
      req = addApproval(req, 'ai2-auditor', 'deny', '风险过高')
      expect(req.status).toBe('denied')
    })

    it('权限统计准确', () => {
      const reqs = [
        { ...createPermissionRequest('t1', 'ai1-expander', 'L1', 'a', 'd'), status: 'approved' as const, resolvedAt: new Date().toISOString() },
        { ...createPermissionRequest('t2', 'ai1-expander', 'L2', 'b', 'd'), status: 'denied' as const, resolvedAt: new Date().toISOString() },
        createPermissionRequest('t3', 'ai1-expander', 'L3', 'c', 'd'),
      ]
      const stats = getPermissionStats(reqs)
      expect(stats.approved).toBe(1)
      expect(stats.denied).toBe(1)
      expect(stats.pending).toBe(1)
    })
  })

  // =========================================================================
  // FLOW 4: 账本完整性
  // =========================================================================
  describe('FLOW 4: 六类账本', () => {
    it('全部账本 CRUD 链路', () => {
      let ledgers = createEmptyLedgers()

      // Evidence
      ledgers = addEvidence(ledgers, '结论A', '来源A', 'H1', 'ai2-auditor', 'task-1', ['标签'])
      ledgers = addEvidence(ledgers, '结论B', '来源B', 'H4', 'human', 'task-2')
      expect(ledgers.evidence).toHaveLength(2)
      expect(getEvidenceByGrade(ledgers, 'H1')).toHaveLength(1)
      expect(getEvidenceByGrade(ledgers, 'H4')).toHaveLength(2)
      expect(getActiveEvidence(ledgers)).toHaveLength(2)

      // Value
      ledgers = addValueAssessment(ledgers, 'task-1', 80, 100, 50, 20)
      expect(ledgers.value).toHaveLength(1)
      expect(ledgers.value[0].priority).toBeGreaterThan(0)

      // Debt
      ledgers = addDebt(ledgers, 'tech-debt', '需要重构', 'medium', 'sprint-1', '2026-05-01')
      expect(getOpenDebts(ledgers)).toHaveLength(1)
      ledgers = resolveDebt(ledgers, ledgers.debt[0].id)
      expect(getOpenDebts(ledgers)).toHaveLength(0)
      expect(ledgers.debt[0].resolved).toBe(true)

      // CaseLaw
      ledgers = addCaseLaw(ledgers, 'failure', '测试失败', '覆盖不足', 'moderate', ['task-1'], '根因', '解决方案', ['教训1'])
      expect(ledgers.caseLaw).toHaveLength(1)

      // Local Ledger
      ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', 100, 'SIM', 'task-1', '奖励')
      ledgers = addLocalLedgerEntry(ledgers, 'sim-credit', -30, 'SIM', 'task-2', '消费')
      expect(getBalance(ledgers, 'SIM')).toBe(70)

      // Summary
      const summary = getLedgerSummary(ledgers)
      expect(summary.evidenceCount).toBe(2)
      expect(summary.highGradeEvidence).toBe(1)
      expect(summary.openDebts).toBe(0)
      expect(summary.totalDebts).toBe(1)
      expect(summary.caseLawEntries).toBe(1)
      expect(summary.simBalance).toBe(70)
    })
  })

  // =========================================================================
  // FLOW 5: 结果预言机
  // =========================================================================
  describe('FLOW 5: 结果预言机', () => {
    it('H3 证据 + 1个验证 → 本地信用可结算', () => {
      const rules = createDefaultOracleRules()
      let ledgers = createEmptyLedgers()
      const task = createTask('测试', '测试')
      const outcome = generateOutcomeReport(task, '完成', 'trinity', 'H3')

      // 添加1个H3证据
      ledgers = addEvidence(ledgers, '验证通过', 'auto', 'H3', 'ai2-auditor', task.id)
      const evaluated = evaluateOutcome(outcome, rules, ledgers)
      expect(evaluated.oracleVerdict).toBe('settleable')
      expect(evaluated.creditTarget).toBe('local')
    })

    it('无证据 → 拒绝', () => {
      const rules = createDefaultOracleRules()
      const ledgers = createEmptyLedgers()
      const task = createTask('测试', '测试')
      const outcome = generateOutcomeReport(task, '完成', 'trinity', 'H3')
      const evaluated = evaluateOutcome(outcome, rules, ledgers)
      expect(evaluated.oracleVerdict).toBe('rejected')
    })

    it('Oracle 统计准确', () => {
      const outcomes: OutcomeReport[] = [
        { ...generateOutcomeReport(createTask('a', 'a'), 'r', 'm', 'H3'), oracleVerdict: 'settleable', settleable: true, settledAt: new Date().toISOString() },
        { ...generateOutcomeReport(createTask('b', 'b'), 'r', 'm', 'H4'), oracleVerdict: 'rejected', settleable: false },
        { ...generateOutcomeReport(createTask('c', 'c'), 'r', 'm', 'H2'), oracleVerdict: 'pending-review', settleable: false },
      ]
      const stats = getOracleStats(outcomes)
      expect(stats.total).toBe(3)
      expect(stats.settled).toBe(1)
      expect(stats.rejected).toBe(1)
      expect(stats.pending).toBe(1)
    })

    it('不可结算的 outcome 调用 settleOutcome 会抛错', () => {
      const outcome = generateOutcomeReport(createTask('t', 't'), 'r', 'm', 'H4')
      expect(() => settleOutcome(outcome)).toThrow()
    })
  })

  // =========================================================================
  // FLOW 6: 节点晋升
  // =========================================================================
  describe('FLOW 6: 节点晋升', () => {
    it('初始为 stage-0 模拟节点', () => {
      const status = createInitialNodeStatus()
      expect(status.currentStage).toBe('stage-0')
      expect(status.stageLabel).toBe('模拟节点')
    })

    it('条件不足时不能晋升', () => {
      const status = createInitialNodeStatus()
      const outcomes: OutcomeReport[] = []
      const ledgers = createEmptyLedgers()
      const reqs: PermissionRequest[] = []

      const { eligible, reasons } = checkPromotionEligibility(status, outcomes, ledgers, reqs)
      expect(eligible).toBe(false)
      expect(reasons.length).toBeGreaterThan(0)
    })

    it('promoteNode 推进到下一阶段', () => {
      const status = createInitialNodeStatus()
      const promoted = promoteNode(status)
      expect(promoted.currentStage).toBe('stage-1')
      expect(promoted.stageLabel).toBe('测试网节点')
      expect(promoted.history).toHaveLength(1)
    })

    it('stage-4 封顶', () => {
      let status = createInitialNodeStatus()
      for (let i = 0; i < 5; i++) status = promoteNode(status)
      expect(status.currentStage).toBe('stage-4')
      const again = promoteNode(status)
      expect(again.currentStage).toBe('stage-4') // 不再晋升
    })

    it('指标计算正确', () => {
      const outcomes: OutcomeReport[] = [
        { ...generateOutcomeReport(createTask('a','a'), 'r','m','H3'), settledAt: new Date().toISOString(), oracleVerdict: 'settleable', settleable: true },
      ]
      const ledgers = createEmptyLedgers()
      const metrics = calculateNodeMetrics(outcomes, ledgers, [], new Date(Date.now() - 3600000).toISOString())
      expect(metrics.settledOutcomes).toBe(1)
      expect(metrics.uptime).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // FLOW 7: 宪法层
  // =========================================================================
  describe('FLOW 7: 宪法层', () => {
    it('默认宪法有效', () => {
      const c = createDefaultConstitution()
      const errors = validateConstitution(c)
      expect(errors).toHaveLength(0)
    })

    it('里程碑完成', () => {
      const c = createDefaultConstitution()
      const goalId = c.goals[0].id
      const mId = c.goals[0].milestones[0].id
      const updated = completeMilestone(c, goalId, mId)
      expect(updated.goals[0].milestones[0].completed).toBe(true)
      expect(updated.goals[0].milestones[0].completedAt).toBeDefined()
    })

    it('权限等级正确匹配', () => {
      const c = createDefaultConstitution()
      expect(getPermissionLevelForAction(c, 'write-log')).toBe('L0')
      expect(getPermissionLevelForAction(c, 'sandbox-test')).toBe('L1')
      expect(getPermissionLevelForAction(c, 'real-wallet')).toBe('L3')
      expect(getPermissionLevelForAction(c, 'bypass-constraint')).toBe('L4')
    })
  })

  // =========================================================================
  // FLOW 8: 边界案例与压力测试
  // =========================================================================
  describe('FLOW 8: 边界案例', () => {
    it('空状态下所有查询不崩溃', () => {
      const ledgers = createEmptyLedgers()
      expect(getLedgerSummary(ledgers).evidenceCount).toBe(0)
      expect(getBalance(ledgers, 'SIM')).toBe(0)
      expect(getActiveEvidence(ledgers)).toEqual([])
      expect(getOpenDebts(ledgers)).toEqual([])
      expect(getOracleStats([])).toEqual({ total: 0, settled: 0, settleable: 0, rejected: 0, disputed: 0, pending: 0, byTarget: { local: 0, testnet: 0, mainnet: 0 } })
      expect(getPermissionStats([])).toEqual({ total: 0, pending: 0, approved: 0, denied: 0, expired: 0, byLevel: { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 }, approvalRate: 0 })
      expect(getMarketStats(createDemoMarket()).listed).toBe(3)
    })

    it('快速创建 50 个任务不崩溃', () => {
      const tasks = Array.from({ length: 50 }, (_, i) => createTask(`任务${i}`, `描述${i}`))
      expect(tasks).toHaveLength(50)
      const ids = new Set(tasks.map(t => t.id))
      expect(ids.size).toBe(50) // 全部唯一
    })

    it('除零安全（resourceCost=0）', () => {
      let ledgers = createEmptyLedgers()
      ledgers = addValueAssessment(ledgers, 'task-1', 80, 100, 0, 20)
      expect(ledgers.value[0].priority).toBeGreaterThanOrEqual(0) // 不崩溃
    })

    it('不存在的 listing 购买返回错误', () => {
      const market = createDemoMarket()
      const { order, error } = purchasePlaybook(market, 'nonexistent', 'node-local')
      expect(order).toBeNull()
      expect(error).toContain('not found')
    })

    it('三核代理状态管理', () => {
      const agents = createTrinityAgents()
      expect(agents.ai1.status).toBe('idle')
      const updated = updateAgentStatus(agents.ai1, 'thinking', 'task-1')
      expect(updated.status).toBe('thinking')
      const completed = recordAgentCompletion(updated, 500)
      expect(completed.status).toBe('idle')
      expect(completed.stats.tasksCompleted).toBe(1)
    })
  })
})
