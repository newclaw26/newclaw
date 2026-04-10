// ============================================================================
// V6 Team Chat Data Layer - Engine & Output Tests
// Tests the data pipeline that powers the TeamChat UI (outputs, ordering,
// agent attribution, grouping). No React/zustand dependencies.
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createDefaultConstitution } from '@/lib/v6/constitution'
import {
  createTrinityAgents,
  createTask,
  createOutput,
  runProposalPhase,
  runAuditPhase,
  runApprovalPhase,
  updateAgentStatus,
  recordAgentCompletion,
} from '@/lib/v6/engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run a full proposal->audit->approval pipeline, return the final task. */
function runFullPipeline(title: string, description: string = 'desc') {
  const constitution = createDefaultConstitution()
  const task = createTask(title, description, 'ai1-expander', 'L0')
  const r1 = runProposalPhase(task, `Proposal: ${title}`)
  const r2 = runAuditPhase(r1.task, constitution, 'Audit pass - low risk', 'low')
  const r3 = runApprovalPhase(r2.task, constitution, true, 0)
  return { task: r3.task, stages: { r1, r2, r3 } }
}

/** Collect all outputs from an array of tasks. */
function collectAllOutputs(tasks: { outputs: { id: string; timestamp: string; taskId: string }[] }[]) {
  return tasks.flatMap(t => t.outputs)
}

// ===========================================================================
// TEST SUITE
// ===========================================================================

describe('V6 Team Chat Data Layer', () => {

  // -------------------------------------------------------------------------
  // 1. Chat message ordering
  // -------------------------------------------------------------------------
  describe('1. Chat message ordering', () => {
    it('outputs from multiple tasks sorted by timestamp are in chronological order', () => {
      const { task: t1 } = runFullPipeline('Task-A')
      const { task: t2 } = runFullPipeline('Task-B')
      const { task: t3 } = runFullPipeline('Task-C')

      const all = collectAllOutputs([t1, t2, t3])
      expect(all.length).toBeGreaterThanOrEqual(9) // 3 outputs per pipeline x 3

      const sorted = [...all].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      for (let i = 1; i < sorted.length; i++) {
        expect(new Date(sorted[i].timestamp).getTime())
          .toBeGreaterThanOrEqual(new Date(sorted[i - 1].timestamp).getTime())
      }
    })
  })

  // -------------------------------------------------------------------------
  // 2. Output type labeling
  // -------------------------------------------------------------------------
  describe('2. Output type labeling', () => {
    it('pipeline produces task-draft, audit-opinion, task-charter in order', () => {
      const { task } = runFullPipeline('Type-Label-Test')

      // The pipeline should produce at least 3 outputs
      expect(task.outputs.length).toBeGreaterThanOrEqual(3)

      const types = task.outputs.map(o => o.type)
      expect(types[0]).toBe('task-draft')
      expect(types[1]).toBe('audit-opinion')
      expect(types[2]).toBe('task-charter')
    })
  })

  // -------------------------------------------------------------------------
  // 3. Agent role attribution
  // -------------------------------------------------------------------------
  describe('3. Agent role attribution', () => {
    it('each pipeline stage output has the correct agent role', () => {
      const { task } = runFullPipeline('Role-Attribution-Test')

      const roles = task.outputs.map(o => o.role)
      expect(roles[0]).toBe('ai1-expander')   // proposal
      expect(roles[1]).toBe('ai2-auditor')     // audit
      expect(roles[2]).toBe('ai3-governor')    // approval
    })
  })

  // -------------------------------------------------------------------------
  // 4. Rapid task creation produces unique outputs
  // -------------------------------------------------------------------------
  describe('4. Rapid task creation produces unique outputs', () => {
    it('5 rapidly-created tasks all have unique output IDs', () => {
      const tasks = Array.from({ length: 5 }, (_, i) =>
        runFullPipeline(`Rapid-${i}`).task
      )

      const allOutputIds = tasks.flatMap(t => t.outputs.map(o => o.id))
      const uniqueIds = new Set(allOutputIds)

      // At least 15 outputs (3 per pipeline x 5 tasks), all unique
      expect(allOutputIds.length).toBeGreaterThanOrEqual(15)
      expect(uniqueIds.size).toBe(allOutputIds.length)
    })
  })

  // -------------------------------------------------------------------------
  // 5. Agent status transitions during pipeline
  // -------------------------------------------------------------------------
  describe('5. Agent status transitions during pipeline', () => {
    it('agents transition idle -> thinking -> idle correctly', () => {
      const agents = createTrinityAgents()

      // AI-1 starts idle
      expect(agents.ai1.status).toBe('idle')

      // AI-1 begins thinking
      const ai1Thinking = updateAgentStatus(agents.ai1, 'thinking', 'task-x')
      expect(ai1Thinking.status).toBe('thinking')
      expect(ai1Thinking.currentTask).toBe('task-x')

      // AI-1 completes, returns to idle
      const ai1Done = recordAgentCompletion(ai1Thinking, 200)
      expect(ai1Done.status).toBe('idle')
      expect(ai1Done.currentTask).toBeUndefined()
      expect(ai1Done.stats.tasksCompleted).toBe(1)

      // AI-2 same cycle
      const ai2Thinking = updateAgentStatus(agents.ai2, 'thinking', 'task-x')
      expect(ai2Thinking.status).toBe('thinking')
      const ai2Done = recordAgentCompletion(ai2Thinking, 350)
      expect(ai2Done.status).toBe('idle')
      expect(ai2Done.stats.tasksCompleted).toBe(1)

      // AI-3 same cycle
      const ai3Thinking = updateAgentStatus(agents.ai3, 'thinking', 'task-x')
      expect(ai3Thinking.status).toBe('thinking')
      const ai3Done = recordAgentCompletion(ai3Thinking, 100)
      expect(ai3Done.status).toBe('idle')
      expect(ai3Done.stats.tasksCompleted).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  // 6. Empty state
  // -------------------------------------------------------------------------
  describe('6. Empty state', () => {
    it('a fresh task has zero outputs', () => {
      const task = createTask('Empty Task', 'No pipeline yet')
      expect(task.outputs).toEqual([])
      expect(task.outputs).toHaveLength(0)
    })

    it('fresh agents have zero completed tasks', () => {
      const agents = createTrinityAgents()
      expect(agents.ai1.stats.tasksCompleted).toBe(0)
      expect(agents.ai2.stats.tasksCompleted).toBe(0)
      expect(agents.ai3.stats.tasksCompleted).toBe(0)
    })
  })

  // -------------------------------------------------------------------------
  // 7. Task grouping
  // -------------------------------------------------------------------------
  describe('7. Task grouping', () => {
    it('outputs from multiple tasks can be grouped by taskId', () => {
      const { task: t1 } = runFullPipeline('Group-A')
      const { task: t2 } = runFullPipeline('Group-B')

      const all = collectAllOutputs([t1, t2])

      // Group by taskId
      const groups = new Map<string, typeof all>()
      for (const o of all) {
        const list = groups.get(o.taskId) ?? []
        list.push(o)
        groups.set(o.taskId, list)
      }

      expect(groups.size).toBe(2)

      // Each group's outputs all share the same taskId
      for (const [taskId, outputs] of groups) {
        expect(outputs.every(o => o.taskId === taskId)).toBe(true)
        expect(outputs.length).toBeGreaterThanOrEqual(3)
      }

      // The two groups have different taskIds
      const taskIds = [...groups.keys()]
      expect(taskIds[0]).not.toBe(taskIds[1])
    })
  })

  // -------------------------------------------------------------------------
  // 8. Output content preservation
  // -------------------------------------------------------------------------
  describe('8. Output content preservation', () => {
    it('submitProposal content appears unchanged in outputs', () => {
      const content = 'Detailed proposal: implement REST API v2 with pagination'
      const task = createTask('Content-Test', 'desc')
      const r1 = runProposalPhase(task, content)
      expect(r1.task.outputs[0].content).toBe(content)
    })

    it('submitAudit content appears unchanged in outputs', () => {
      const constitution = createDefaultConstitution()
      const auditContent = 'Audit findings: no security issues, moderate complexity'
      const task = createTask('Audit-Content-Test', 'desc')
      const r1 = runProposalPhase(task, 'proposal')
      const r2 = runAuditPhase(r1.task, constitution, auditContent, 'low')
      // The audit output is the second one (index 1)
      expect(r2.task.outputs[1].content).toBe(auditContent)
    })

    it('submitApproval content appears unchanged in outputs', () => {
      const constitution = createDefaultConstitution()
      const task = createTask('Approval-Content-Test', 'desc', 'ai1-expander', 'L0')
      const r1 = runProposalPhase(task, 'proposal')
      const r2 = runAuditPhase(r1.task, constitution, 'audit ok', 'low')
      const r3 = runApprovalPhase(r2.task, constitution, true, 0)
      // The charter output is the third one (index 2)
      expect(r3.task.outputs[2].content).toBe('Task approved and chartered')
    })

    it('createOutput preserves arbitrary content', () => {
      const content = 'This is a raw output with detailed analysis.'
      const output = createOutput('task-123', 'ai1-expander', 'task-draft', content)
      expect(output.content).toBe(content)
      expect(output.taskId).toBe('task-123')
    })
  })

  // -------------------------------------------------------------------------
  // 9. Timestamp format
  // -------------------------------------------------------------------------
  describe('9. Timestamp format', () => {
    it('all output timestamps are valid ISO 8601 strings', () => {
      const { task } = runFullPipeline('Timestamp-Test')

      for (const output of task.outputs) {
        expect(typeof output.timestamp).toBe('string')
        const parsed = new Date(output.timestamp)
        expect(parsed.getTime()).not.toBeNaN()
        // ISO string round-trip: Date parses and toISOString matches format
        expect(output.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        )
      }
    })

    it('task createdAt and updatedAt are valid ISO strings', () => {
      const task = createTask('ISO-Test', 'desc')
      expect(new Date(task.createdAt).getTime()).not.toBeNaN()
      expect(new Date(task.updatedAt).getTime()).not.toBeNaN()
      expect(task.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(task.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  // -------------------------------------------------------------------------
  // 10. Copy-safe content (special characters)
  // -------------------------------------------------------------------------
  describe('10. Copy-safe content (special characters)', () => {
    it('preserves double quotes in content', () => {
      const content = 'He said "hello world" to the API'
      const output = createOutput('t1', 'ai1-expander', 'task-draft', content)
      expect(output.content).toBe(content)
    })

    it('preserves single quotes in content', () => {
      const content = "It's a test with 'single quotes'"
      const output = createOutput('t2', 'ai2-auditor', 'audit-opinion', content)
      expect(output.content).toBe(content)
    })

    it('preserves newlines in content', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const output = createOutput('t3', 'ai3-governor', 'task-charter', content)
      expect(output.content).toBe(content)
      expect(output.content.split('\n')).toHaveLength(3)
    })

    it('preserves unicode characters in content', () => {
      const content = 'Unicode test: \u2713 \u2717 \u2022 \u00e9\u00e8\u00ea \u4e2d\u6587 \ud83d\ude80'
      const output = createOutput('t4', 'ai1-expander', 'task-draft', content)
      expect(output.content).toBe(content)
    })

    it('preserves backslashes and tabs in content', () => {
      const content = 'Path: C:\\Users\\test\tTabbed\tcontent'
      const output = createOutput('t5', 'ai2-auditor', 'risk-report', content)
      expect(output.content).toBe(content)
    })

    it('preserves empty string content', () => {
      const output = createOutput('t6', 'ai1-expander', 'task-draft', '')
      expect(output.content).toBe('')
    })

    it('pipeline preserves special characters end-to-end', () => {
      const specialProposal = 'Proposal with "quotes", \'apostrophes\', & <html> chars'
      const task = createTask('Special-Chars', 'desc')
      const r1 = runProposalPhase(task, specialProposal)
      expect(r1.task.outputs[0].content).toBe(specialProposal)
    })
  })
})
