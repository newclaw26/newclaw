import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Module imports
// ---------------------------------------------------------------------------

import {
  validateDimensions,
  sumDimensions,
  createScore,
  getAverageScore,
  getScoresForTarget,
  getScoresByScorer,
  calculateTermLength,
  createInitialRotation,
  shouldRotate,
  rotateRoles,
  recordRound,
  getThirdActor,
  actorToRole,
  roleToActor,
  DIMENSION_CEILINGS,
  DEFAULT_TERM_LENGTH,
  MIN_TERM_LENGTH,
  MAX_TERM_LENGTH,
} from '@/lib/v6/governance-scoring';

import type {
  GovernanceActorId,
  GovernanceDimensions,
  GovernanceScore,
  RotationState,
} from '@/types/v6';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a perfect-score dimension set (total = 100). */
function perfectDimensions(): GovernanceDimensions {
  return {
    taskCompletion: 25,
    deliveryQuality: 25,
    planValue: 15,
    efficiency: 15,
    strategicJudgment: 10,
    riskControl: 10,
  };
}

/** Build a mid-range dimension set (total = 80). */
function midDimensions(): GovernanceDimensions {
  return {
    taskCompletion: 20,
    deliveryQuality: 20,
    planValue: 12,
    efficiency: 12,
    strategicJudgment: 8,
    riskControl: 8,
  };
}

/** Build a low dimension set (total = 60). */
function lowDimensions(): GovernanceDimensions {
  return {
    taskCompletion: 15,
    deliveryQuality: 15,
    planValue: 9,
    efficiency: 9,
    strategicJudgment: 6,
    riskControl: 6,
  };
}

/** Quick-create a score for testing. */
function makeScore(
  scorer: GovernanceActorId,
  target: GovernanceActorId,
  round: number,
  total: number,
): GovernanceScore {
  // Distribute total proportionally across dimensions
  const ratio = total / 100;
  return createScore(scorer, target, round, {
    taskCompletion: Math.round(25 * ratio),
    deliveryQuality: Math.round(25 * ratio),
    planValue: Math.round(15 * ratio),
    efficiency: Math.round(15 * ratio),
    strategicJudgment: Math.round(10 * ratio),
    riskControl: Math.round(10 * ratio),
  });
}

// ===========================================================================
// Test Suites
// ===========================================================================

describe('GovernanceScoring', () => {

  // -------------------------------------------------------------------------
  // 1. Dimension Validation
  // -------------------------------------------------------------------------

  describe('validateDimensions', () => {

    it('should pass through valid dimensions unchanged', () => {
      const dims = perfectDimensions();
      const result = validateDimensions(dims);
      expect(result).toEqual(dims);
    });

    it('should clamp values above their ceiling', () => {
      const overflows: GovernanceDimensions = {
        taskCompletion: 30,    // ceiling 25
        deliveryQuality: 50,   // ceiling 25
        planValue: 20,         // ceiling 15
        efficiency: 100,       // ceiling 15
        strategicJudgment: 15, // ceiling 10
        riskControl: 12,       // ceiling 10
      };
      const result = validateDimensions(overflows);
      expect(result.taskCompletion).toBe(25);
      expect(result.deliveryQuality).toBe(25);
      expect(result.planValue).toBe(15);
      expect(result.efficiency).toBe(15);
      expect(result.strategicJudgment).toBe(10);
      expect(result.riskControl).toBe(10);
    });

    it('should clamp negative values to 0', () => {
      const negatives: GovernanceDimensions = {
        taskCompletion: -5,
        deliveryQuality: -1,
        planValue: -10,
        efficiency: -100,
        strategicJudgment: -3,
        riskControl: -1,
      };
      const result = validateDimensions(negatives);
      expect(result.taskCompletion).toBe(0);
      expect(result.deliveryQuality).toBe(0);
      expect(result.planValue).toBe(0);
      expect(result.efficiency).toBe(0);
      expect(result.strategicJudgment).toBe(0);
      expect(result.riskControl).toBe(0);
    });

    it('should round fractional values to nearest integer', () => {
      const fractional: GovernanceDimensions = {
        taskCompletion: 22.7,
        deliveryQuality: 18.3,
        planValue: 12.5,
        efficiency: 10.1,
        strategicJudgment: 7.9,
        riskControl: 6.4,
      };
      const result = validateDimensions(fractional);
      expect(result.taskCompletion).toBe(23);
      expect(result.deliveryQuality).toBe(18);
      expect(result.planValue).toBe(13);  // 12.5 rounds to 13
      expect(result.efficiency).toBe(10);
      expect(result.strategicJudgment).toBe(8);
      expect(result.riskControl).toBe(6);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Score Summation
  // -------------------------------------------------------------------------

  describe('sumDimensions', () => {

    it('should return 100 for perfect dimensions', () => {
      expect(sumDimensions(perfectDimensions())).toBe(100);
    });

    it('should return 0 for all-zero dimensions', () => {
      const zeros: GovernanceDimensions = {
        taskCompletion: 0, deliveryQuality: 0, planValue: 0,
        efficiency: 0, strategicJudgment: 0, riskControl: 0,
      };
      expect(sumDimensions(zeros)).toBe(0);
    });

    it('should return 80 for mid-range dimensions', () => {
      expect(sumDimensions(midDimensions())).toBe(80);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Score Creation
  // -------------------------------------------------------------------------

  describe('createScore', () => {

    it('should produce a score with correct total', () => {
      const score = createScore('ai1', 'ai2', 1, perfectDimensions(), 'Great work');
      expect(score.total).toBe(100);
      expect(score.scorer).toBe('ai1');
      expect(score.target).toBe('ai2');
      expect(score.round).toBe(1);
      expect(score.notes).toBe('Great work');
    });

    it('should clamp overflow dimensions and recalculate total', () => {
      const overflow: GovernanceDimensions = {
        taskCompletion: 30, deliveryQuality: 30, planValue: 20,
        efficiency: 20, strategicJudgment: 15, riskControl: 15,
      };
      const score = createScore('ai2', 'ai1', 5, overflow);
      // All clamped to max -> total = 100
      expect(score.total).toBe(100);
      expect(score.dimensions.taskCompletion).toBe(25);
    });

    it('should set a valid ISO timestamp', () => {
      const score = createScore('ai1', 'ai3', 1, midDimensions());
      expect(() => new Date(score.timestamp)).not.toThrow();
      expect(new Date(score.timestamp).getFullYear()).toBeGreaterThanOrEqual(2025);
    });

    it('should default notes to empty string', () => {
      const score = createScore('ai1', 'ai2', 1, midDimensions());
      expect(score.notes).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // 4. Score Aggregation
  // -------------------------------------------------------------------------

  describe('getAverageScore', () => {

    it('should return 0 for empty array', () => {
      expect(getAverageScore([])).toBe(0);
    });

    it('should return the single score total for a 1-element array', () => {
      const scores = [makeScore('ai1', 'ai2', 1, 85)];
      expect(getAverageScore(scores)).toBeCloseTo(scores[0].total, 0);
    });

    it('should compute average of all scores when lastN is omitted', () => {
      const scores = [
        makeScore('ai1', 'ai2', 1, 90),
        makeScore('ai1', 'ai2', 2, 80),
      ];
      const avg = getAverageScore(scores);
      // Exact values depend on rounding in makeScore, but should be close to 85
      expect(avg).toBeGreaterThan(80);
      expect(avg).toBeLessThan(95);
    });

    it('should only use last N scores when lastN is specified', () => {
      const scores = [
        makeScore('ai1', 'ai2', 1, 60),
        makeScore('ai1', 'ai2', 2, 60),
        makeScore('ai1', 'ai2', 3, 95),
        makeScore('ai1', 'ai2', 4, 95),
      ];
      const last2Avg = getAverageScore(scores, 2);
      const allAvg = getAverageScore(scores);
      // Last 2 are both ~95, so last2Avg should be higher than allAvg
      expect(last2Avg).toBeGreaterThan(allAvg);
    });
  });

  describe('getScoresForTarget / getScoresByScorer', () => {

    it('should filter scores by target', () => {
      const scores = [
        makeScore('ai1', 'ai2', 1, 90),
        makeScore('ai1', 'ai3', 2, 80),
        makeScore('ai2', 'ai1', 3, 70),
      ];
      const ai2Scores = getScoresForTarget(scores, 'ai2');
      expect(ai2Scores).toHaveLength(1);
      expect(ai2Scores[0].target).toBe('ai2');
    });

    it('should filter scores by scorer', () => {
      const scores = [
        makeScore('ai1', 'ai2', 1, 90),
        makeScore('ai1', 'ai3', 2, 80),
        makeScore('ai2', 'ai1', 3, 70),
      ];
      const ai1Given = getScoresByScorer(scores, 'ai1');
      expect(ai1Given).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Term Length Calculation
  // -------------------------------------------------------------------------

  describe('calculateTermLength', () => {

    it('should return base 10 for avgScore = 90', () => {
      expect(calculateTermLength(90)).toBe(10);
    });

    it('should return 15 for avgScore = 95', () => {
      expect(calculateTermLength(95)).toBe(15);
    });

    it('should return 20 for avgScore = 100', () => {
      expect(calculateTermLength(100)).toBe(20);
    });

    it('should return base 10 for avgScore below 90 (no bonus)', () => {
      expect(calculateTermLength(80)).toBe(10);
      expect(calculateTermLength(50)).toBe(10);
      expect(calculateTermLength(0)).toBe(10);
    });

    it('should clamp to MIN_TERM_LENGTH at minimum', () => {
      // Even with negative scores the term length should not go below MIN
      expect(calculateTermLength(-100)).toBeGreaterThanOrEqual(MIN_TERM_LENGTH);
    });

    it('should clamp to MAX_TERM_LENGTH at maximum', () => {
      // Hypothetical extreme score
      expect(calculateTermLength(500)).toBeLessThanOrEqual(MAX_TERM_LENGTH);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Initial Rotation State
  // -------------------------------------------------------------------------

  describe('createInitialRotation', () => {

    it('should start with AI-1 as CEO and AI-2 as auditor', () => {
      const state = createInitialRotation();
      expect(state.currentCEO).toBe('ai1');
      expect(state.currentAuditor).toBe('ai2');
    });

    it('should start with 0 rounds and default term length', () => {
      const state = createInitialRotation();
      expect(state.roundsInCurrentTerm).toBe(0);
      expect(state.maxRoundsInTerm).toBe(DEFAULT_TERM_LENGTH);
    });

    it('should start with empty score history', () => {
      const state = createInitialRotation();
      expect(state.scoreHistory).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Rotation Trigger
  // -------------------------------------------------------------------------

  describe('shouldRotate', () => {

    it('should return false when term is not yet exhausted', () => {
      const state: RotationState = {
        currentCEO: 'ai1',
        currentAuditor: 'ai2',
        roundsInCurrentTerm: 5,
        maxRoundsInTerm: 10,
        scoreHistory: [],
      };
      expect(shouldRotate(state)).toBe(false);
    });

    it('should return true when roundsInCurrentTerm reaches maxRoundsInTerm', () => {
      const state: RotationState = {
        currentCEO: 'ai1',
        currentAuditor: 'ai2',
        roundsInCurrentTerm: 10,
        maxRoundsInTerm: 10,
        scoreHistory: [],
      };
      expect(shouldRotate(state)).toBe(true);
    });

    it('should trigger early rotation when CEO avg drops below 70', () => {
      const lowScores = [
        makeScore('ai2', 'ai1', 1, 60),
        makeScore('ai2', 'ai1', 2, 65),
        makeScore('ai2', 'ai1', 3, 55),
      ];
      const state: RotationState = {
        currentCEO: 'ai1',
        currentAuditor: 'ai2',
        roundsInCurrentTerm: 3,
        maxRoundsInTerm: 10,
        scoreHistory: lowScores,
      };
      expect(shouldRotate(state)).toBe(true);
    });

    it('should NOT trigger early rotation with fewer than 3 scores', () => {
      const lowScores = [
        makeScore('ai2', 'ai1', 1, 50),
        makeScore('ai2', 'ai1', 2, 50),
      ];
      const state: RotationState = {
        currentCEO: 'ai1',
        currentAuditor: 'ai2',
        roundsInCurrentTerm: 2,
        maxRoundsInTerm: 10,
        scoreHistory: lowScores,
      };
      // Only 2 scores targeting ai1 -- threshold requires 3
      expect(shouldRotate(state)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Role Rotation Execution
  // -------------------------------------------------------------------------

  describe('rotateRoles', () => {

    it('should promote auditor to CEO and pick new auditor', () => {
      const state = createInitialRotation();
      const rotated = rotateRoles(state);
      expect(rotated.currentCEO).toBe('ai2');       // was auditor
      expect(rotated.currentAuditor).toBe('ai3');    // third actor
      expect(rotated.roundsInCurrentTerm).toBe(0);   // reset
    });

    it('should cycle through all three actors over 3 rotations', () => {
      let state = createInitialRotation();
      // Initial: CEO=ai1, Auditor=ai2
      state = rotateRoles(state);
      expect(state.currentCEO).toBe('ai2');
      expect(state.currentAuditor).toBe('ai3');

      state = rotateRoles(state);
      expect(state.currentCEO).toBe('ai3');
      expect(state.currentAuditor).toBe('ai1');

      state = rotateRoles(state);
      expect(state.currentCEO).toBe('ai1');
      expect(state.currentAuditor).toBe('ai2');
      // Full cycle back to initial positions
    });

    it('should calculate new term length from incoming CEO history', () => {
      const scores = [
        makeScore('ai1', 'ai2', 1, 95),
        makeScore('ai1', 'ai2', 2, 95),
        makeScore('ai3', 'ai2', 3, 95),
      ];
      const state: RotationState = {
        currentCEO: 'ai1',
        currentAuditor: 'ai2',
        roundsInCurrentTerm: 10,
        maxRoundsInTerm: 10,
        scoreHistory: scores,
      };
      const rotated = rotateRoles(state);
      // ai2 becomes CEO; ai2 has three ~95 scores as target
      expect(rotated.maxRoundsInTerm).toBeGreaterThan(DEFAULT_TERM_LENGTH);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Record Round
  // -------------------------------------------------------------------------

  describe('recordRound', () => {

    it('should increment roundsInCurrentTerm by 1', () => {
      const state = createInitialRotation();
      const score = makeScore('ai2', 'ai1', 1, 90);
      const updated = recordRound(state, score);
      expect(updated.roundsInCurrentTerm).toBe(1);
    });

    it('should append score to history', () => {
      const state = createInitialRotation();
      const score = makeScore('ai2', 'ai1', 1, 90);
      const updated = recordRound(state, score);
      expect(updated.scoreHistory).toHaveLength(1);
      expect(updated.scoreHistory[0]).toBe(score);
    });

    it('should recalculate maxRoundsInTerm after new score', () => {
      let state = createInitialRotation();
      // Feed 5 high scores for ai1 (current CEO)
      for (let i = 1; i <= 5; i++) {
        const score = makeScore('ai2', 'ai1', i, 98);
        state = recordRound(state, score);
      }
      // avgScore ~98 -> bonus = (9.8-9)*10 = 8 -> term = 18
      expect(state.maxRoundsInTerm).toBeGreaterThan(DEFAULT_TERM_LENGTH);
    });

    it('should not mutate the original state', () => {
      const state = createInitialRotation();
      const score = makeScore('ai2', 'ai1', 1, 90);
      const updated = recordRound(state, score);
      expect(state.roundsInCurrentTerm).toBe(0);
      expect(state.scoreHistory).toHaveLength(0);
      expect(updated).not.toBe(state);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Utility Helpers
  // -------------------------------------------------------------------------

  describe('getThirdActor', () => {

    it('should return ai3 when given ai1 + ai2', () => {
      expect(getThirdActor('ai1', 'ai2')).toBe('ai3');
    });

    it('should return ai1 when given ai2 + ai3', () => {
      expect(getThirdActor('ai2', 'ai3')).toBe('ai1');
    });

    it('should return ai2 when given ai1 + ai3', () => {
      expect(getThirdActor('ai1', 'ai3')).toBe('ai2');
    });
  });

  describe('actorToRole / roleToActor', () => {

    it('should map actor IDs to Trinity roles', () => {
      expect(actorToRole('ai1')).toBe('ai1-expander');
      expect(actorToRole('ai2')).toBe('ai2-auditor');
      expect(actorToRole('ai3')).toBe('ai3-governor');
    });

    it('should map Trinity roles to actor IDs', () => {
      expect(roleToActor('ai1-expander')).toBe('ai1');
      expect(roleToActor('ai2-auditor')).toBe('ai2');
      expect(roleToActor('ai3-governor')).toBe('ai3');
    });

    it('should be a perfect round-trip', () => {
      const actors: GovernanceActorId[] = ['ai1', 'ai2', 'ai3'];
      for (const actor of actors) {
        expect(roleToActor(actorToRole(actor))).toBe(actor);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 11. Constants Exported Correctly
  // -------------------------------------------------------------------------

  describe('exported constants', () => {

    it('should have correct dimension ceilings summing to 100', () => {
      const total = Object.values(DIMENSION_CEILINGS).reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
    });

    it('should export sensible term length bounds', () => {
      expect(MIN_TERM_LENGTH).toBeLessThan(DEFAULT_TERM_LENGTH);
      expect(DEFAULT_TERM_LENGTH).toBeLessThan(MAX_TERM_LENGTH);
    });
  });

  // -------------------------------------------------------------------------
  // 12. Full Lifecycle Integration
  // -------------------------------------------------------------------------

  describe('full lifecycle: create -> score -> rotate', () => {

    it('should run until term exhausted then rotate', () => {
      let state = createInitialRotation();
      expect(state.currentCEO).toBe('ai1');

      // Record rounds until shouldRotate triggers.
      // Use exact 90-total dimensions to get a predictable term length.
      const exactDims: GovernanceDimensions = {
        taskCompletion: 22, deliveryQuality: 23, planValue: 14,
        efficiency: 13, strategicJudgment: 9, riskControl: 9,
      };
      // Sum = 90 -> term = 10
      expect(sumDimensions(exactDims)).toBe(90);

      for (let round = 1; round <= 10; round++) {
        const score = createScore('ai2', 'ai1', round, exactDims);
        state = recordRound(state, score);
      }

      // avgScore = 90 -> term length = 10 -> 10 rounds elapsed -> should rotate
      expect(state.maxRoundsInTerm).toBe(10);
      expect(shouldRotate(state)).toBe(true);

      state = rotateRoles(state);
      expect(state.currentCEO).toBe('ai2');
      expect(state.currentAuditor).toBe('ai3');
      expect(state.roundsInCurrentTerm).toBe(0);
    });
  });
});
