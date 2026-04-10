import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

import {
  createEconomyState,
  issueReward,
  spend,
  receive,
  getHalvingInfo,
  calculatePooScore,
  getEconomyStatus,
  exportEconomyAsFile,
  importEconomyFromFile,
  saveEconomyState,
  loadEconomyState,
} from '@/lib/v6/economy';

import { computeHMAC } from '@/lib/v6/governance-persistence';

import type { EconomyState } from '@/lib/v6/economy';
import type { EconomyStatus } from '@/types/v6';

// ---------------------------------------------------------------------------
// V6 Economy Engine Tests
// ---------------------------------------------------------------------------

describe('V6 Economy Engine', () => {
  // -----------------------------------------------------------------------
  // createEconomyState
  // -----------------------------------------------------------------------

  describe('createEconomyState', () => {
    it('starts with 100 New.B genesis balance', () => {
      const state = createEconomyState();
      expect(state.balance).toBe(100);
    });

    it('includes a genesis transaction', () => {
      const state = createEconomyState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].type).toBe('genesis');
      expect(state.transactions[0].amount).toBe(100);
    });

    it('initializes mining config with correct defaults', () => {
      const state = createEconomyState();
      expect(state.mining.baseReward).toBe(10);
      expect(state.mining.halvingInterval).toBe(100);
      expect(state.mining.minimumReward).toBe(0.01);
      expect(state.mining.rewardsIssuedThisEpoch).toBe(0);
      expect(state.mining.totalRewardsIssued).toBe(0);
    });

    it('sets halvingEpoch to 0', () => {
      const state = createEconomyState();
      expect(state.halvingEpoch).toBe(0);
    });

    it('sets totalEarned to genesis amount', () => {
      const state = createEconomyState();
      expect(state.totalEarned).toBe(100);
    });

    it('sets totalSpent to 0', () => {
      const state = createEconomyState();
      expect(state.totalSpent).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // issueReward
  // -----------------------------------------------------------------------

  describe('issueReward', () => {
    it('increases balance by the current reward rate', () => {
      const state = createEconomyState();
      const result = issueReward(state, 'task-001');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.balance).toBe(110); // 100 + 10
      expect(result.value.transaction.type).toBe('poo_reward');
      expect(result.value.transaction.amount).toBe(10);
    });

    it('increments totalRewardsIssued', () => {
      const state = createEconomyState();
      const result = issueReward(state, 'task-001');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.mining.totalRewardsIssued).toBe(1);
      expect(result.value.state.mining.rewardsIssuedThisEpoch).toBe(1);
    });

    it('appends a poo_reward transaction', () => {
      const state = createEconomyState();
      const result = issueReward(state, 'task-001');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.transactions).toHaveLength(2);
      const tx = result.value.state.transactions[1];
      expect(tx.type).toBe('poo_reward');
      expect(tx.reference).toBe('task-001');
    });

    it('updates totalEarned', () => {
      const state = createEconomyState();
      const result = issueReward(state, 'task-001');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.totalEarned).toBe(110);
    });
  });

  // -----------------------------------------------------------------------
  // spend
  // -----------------------------------------------------------------------

  describe('spend', () => {
    it('decreases balance by the spent amount', () => {
      const state = createEconomyState();
      const result = spend(state, 25, 'Knowledge purchase');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.balance).toBe(75);
    });

    it('records a negative amount in the transaction', () => {
      const state = createEconomyState();
      const result = spend(state, 25, 'Purchase');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.transaction.amount).toBe(-25);
      expect(result.value.transaction.type).toBe('spend');
    });

    it('increments totalSpent', () => {
      const state = createEconomyState();
      const result = spend(state, 25, 'Purchase');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.totalSpent).toBe(25);
    });

    it('returns error with insufficient balance', () => {
      const state = createEconomyState();
      const result = spend(state, 200, 'Overbudget');

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error).toContain('Insufficient balance');
    });

    it('returns error for zero amount', () => {
      const state = createEconomyState();
      const result = spend(state, 0, 'Nothing');

      expect(result.ok).toBe(false);
    });

    it('returns error for negative amount', () => {
      const state = createEconomyState();
      const result = spend(state, -5, 'Negative');

      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // receive
  // -----------------------------------------------------------------------

  describe('receive', () => {
    it('increases balance by the received amount', () => {
      const state = createEconomyState();
      const result = receive(state, 50, 'bounty-reward');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.balance).toBe(150);
    });

    it('records a positive amount in the transaction', () => {
      const state = createEconomyState();
      const result = receive(state, 50, 'bounty-reward');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.transaction.amount).toBe(50);
      expect(result.value.transaction.type).toBe('receive');
    });

    it('updates totalEarned', () => {
      const state = createEconomyState();
      const result = receive(state, 50, 'bounty-reward');

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.state.totalEarned).toBe(150);
    });

    it('returns error for zero amount', () => {
      const state = createEconomyState();
      const result = receive(state, 0, 'nothing');

      expect(result.ok).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Halving
  // -----------------------------------------------------------------------

  describe('halving', () => {
    it('reduces reward after 100 issued rewards', () => {
      let state = createEconomyState();

      // Issue 100 rewards to trigger first halving
      for (let i = 0; i < 100; i++) {
        const result = issueReward(state, `task-${i}`);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        state = result.value.state;
      }

      // After 100 rewards, halving should have occurred
      expect(state.halvingEpoch).toBe(1);
      expect(state.currentRewardRate).toBe(5); // 10 / 2

      // Next reward should be at the halved rate
      const nextResult = issueReward(state, 'task-post-halving');
      expect(nextResult.ok).toBe(true);
      if (!nextResult.ok) return;

      expect(nextResult.value.transaction.amount).toBe(5);
    });

    it('does not reduce reward below minimum (0.01)', () => {
      let state = createEconomyState();

      // Force many halvings: 10 -> 5 -> 2.5 -> 1.25 -> 0.625 -> 0.3125
      // -> 0.15625 -> 0.078125 -> 0.0390625 -> 0.01953125 -> 0.01 (floor)
      // That is 10 halvings, so 10 * 100 = 1000 rewards
      for (let i = 0; i < 1000; i++) {
        const result = issueReward(state, `task-${i}`);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        state = result.value.state;
      }

      expect(state.currentRewardRate).toBeGreaterThanOrEqual(0.01);

      // Issue one more and verify floor holds
      const result = issueReward(state, 'task-floor-check');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.transaction.amount).toBeGreaterThanOrEqual(0.01);
    });

    it('getHalvingInfo returns correct progress', () => {
      let state = createEconomyState();

      // Issue 50 rewards (50% through epoch 0)
      for (let i = 0; i < 50; i++) {
        const result = issueReward(state, `task-${i}`);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        state = result.value.state;
      }

      const info = getHalvingInfo(state);
      expect(info.epoch).toBe(0);
      expect(info.progress).toBe(50);
      expect(info.rewardsUntilNextHalving).toBe(50);
      expect(info.currentRewardRate).toBe(10);
      expect(info.nextRewardRate).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // calculatePooScore
  // -----------------------------------------------------------------------

  describe('calculatePooScore', () => {
    it('returns 0 when total is 0', () => {
      expect(calculatePooScore(0, 0, 0)).toBe(0);
    });

    it('returns 100 when all verified and none rejected', () => {
      expect(calculatePooScore(50, 0, 50)).toBe(100);
    });

    it('returns 0 when none verified', () => {
      expect(calculatePooScore(0, 10, 10)).toBe(0);
    });

    it('returns value in 0-100 range', () => {
      const score = calculatePooScore(40, 5, 50);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes rejections', () => {
      const perfect = calculatePooScore(50, 0, 50);
      const withRejects = calculatePooScore(50, 10, 60);
      expect(withRejects).toBeLessThan(perfect);
    });

    it('returns integer', () => {
      const score = calculatePooScore(33, 7, 50);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // getEconomyStatus
  // -----------------------------------------------------------------------

  describe('getEconomyStatus', () => {
    it('returns a valid EconomyStatus shape', () => {
      const state = createEconomyState();
      const status: EconomyStatus = getEconomyStatus(state);

      expect(status).toHaveProperty('newbBalance');
      expect(status).toHaveProperty('simBalance');
      expect(status).toHaveProperty('halvingEpoch');
      expect(status).toHaveProperty('halvingProgress');
      expect(status).toHaveProperty('totalMined');
      expect(status).toHaveProperty('pooScore');
      expect(status).toHaveProperty('pooVerified');
      expect(status).toHaveProperty('pooRejected');
    });

    it('newbBalance matches state balance', () => {
      const state = createEconomyState();
      const status = getEconomyStatus(state);
      expect(status.newbBalance).toBe(state.balance);
    });

    it('halvingEpoch matches state', () => {
      const state = createEconomyState();
      const status = getEconomyStatus(state);
      expect(status.halvingEpoch).toBe(0);
    });

    it('all numeric fields are numbers', () => {
      const state = createEconomyState();
      const status = getEconomyStatus(state);

      expect(typeof status.newbBalance).toBe('number');
      expect(typeof status.simBalance).toBe('number');
      expect(typeof status.halvingEpoch).toBe('number');
      expect(typeof status.halvingProgress).toBe('number');
      expect(typeof status.totalMined).toBe('number');
      expect(typeof status.pooScore).toBe('number');
      expect(typeof status.pooVerified).toBe('number');
      expect(typeof status.pooRejected).toBe('number');
    });

    it('reflects issued rewards in pooVerified count', () => {
      let state = createEconomyState();
      for (let i = 0; i < 5; i++) {
        const result = issueReward(state, `task-${i}`);
        if (!result.ok) return;
        state = result.value.state;
      }
      const status = getEconomyStatus(state);
      expect(status.pooVerified).toBe(5);
      expect(status.totalMined).toBe(150); // 100 genesis + 5 * 10
    });
  });

  // -----------------------------------------------------------------------
  // Compound scenarios
  // -----------------------------------------------------------------------

  describe('compound flows', () => {
    it('earn-then-spend maintains correct balance', () => {
      let state = createEconomyState();

      // Earn 3 rewards
      for (let i = 0; i < 3; i++) {
        const r = issueReward(state, `task-${i}`);
        if (!r.ok) throw new Error(r.error);
        state = r.value.state;
      }
      expect(state.balance).toBe(130); // 100 + 3*10

      // Spend 50
      const sr = spend(state, 50, 'Market purchase');
      if (!sr.ok) throw new Error(sr.error);
      state = sr.value.state;
      expect(state.balance).toBe(80);

      // Receive 20
      const rr = receive(state, 20, 'sale-proceeds');
      if (!rr.ok) throw new Error(rr.error);
      state = rr.value.state;
      expect(state.balance).toBe(100);

      // Verify accounting
      expect(state.totalEarned).toBe(150); // 100 + 30 + 20
      expect(state.totalSpent).toBe(50);
      expect(state.transactions).toHaveLength(6); // genesis + 3 rewards + 1 spend + 1 receive
    });
  });

  // -----------------------------------------------------------------------
  // exportEconomyAsFile / importEconomyFromFile
  // -----------------------------------------------------------------------

  describe('exportEconomyAsFile', () => {
    it('returns valid JSON string', () => {
      const state = createEconomyState();
      const json = exportEconomyAsFile(state);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('is pretty-printed (contains newlines and indentation)', () => {
      const state = createEconomyState();
      const json = exportEconomyAsFile(state);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('preserves all state fields through round-trip', () => {
      const state = createEconomyState();
      const json = exportEconomyAsFile(state);
      const restored = importEconomyFromFile(json);

      expect(restored).not.toBeNull();
      expect(restored!.balance).toBe(state.balance);
      expect(restored!.totalEarned).toBe(state.totalEarned);
      expect(restored!.totalSpent).toBe(state.totalSpent);
      expect(restored!.halvingEpoch).toBe(state.halvingEpoch);
      expect(restored!.currentRewardRate).toBe(state.currentRewardRate);
      expect(restored!.transactions).toHaveLength(state.transactions.length);
    });

    it('round-trips a state with multiple transactions', () => {
      let state = createEconomyState();
      const r1 = issueReward(state, 'task-1');
      if (!r1.ok) throw new Error(r1.error);
      state = r1.value.state;

      const r2 = spend(state, 5, 'purchase');
      if (!r2.ok) throw new Error(r2.error);
      state = r2.value.state;

      const json = exportEconomyAsFile(state);
      const restored = importEconomyFromFile(json);

      expect(restored).not.toBeNull();
      expect(restored!.balance).toBe(state.balance);
      expect(restored!.transactions).toHaveLength(3);
    });
  });

  describe('importEconomyFromFile', () => {
    it('returns null for invalid JSON', () => {
      expect(importEconomyFromFile('not json')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(importEconomyFromFile('')).toBeNull();
    });

    it('returns null when balance is not a number', () => {
      expect(importEconomyFromFile('{"balance": "not-a-number"}')).toBeNull();
    });

    it('returns null when balance field is missing', () => {
      expect(importEconomyFromFile('{"totalEarned": 100}')).toBeNull();
    });

    it('accepts valid economy state JSON', () => {
      const state = createEconomyState();
      const json = JSON.stringify(state);
      const imported = importEconomyFromFile(json);

      expect(imported).not.toBeNull();
      expect(imported!.balance).toBe(100);
    });
  });

  // -----------------------------------------------------------------------
  // HMAC-based localStorage persistence
  // -----------------------------------------------------------------------

  describe('HMAC persistence (saveEconomyState / loadEconomyState)', () => {
    const STORAGE_KEY = 'newclaw:economy:state';

    // Use a mock localStorage for these tests
    const mockStorage = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { mockStorage.set(key, value); },
      removeItem: (key: string) => { mockStorage.delete(key); },
      clear: () => { mockStorage.clear(); },
      get length() { return mockStorage.size; },
      key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
    };

    beforeEach(() => {
      mockStorage.clear();
      // Replace global localStorage with mock
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('saves with HMAC envelope and loads successfully', () => {
      const state = createEconomyState();
      saveEconomyState(state);

      const loaded = loadEconomyState();
      expect(loaded).not.toBeNull();
      expect(loaded!.balance).toBe(100);
      expect(loaded!.totalEarned).toBe(100);
    });

    it('persisted data contains HMAC envelope structure', () => {
      const state = createEconomyState();
      saveEconomyState(state);

      const raw = mockStorage.get(STORAGE_KEY)!;
      const envelope = JSON.parse(raw);
      expect(envelope).toHaveProperty('data');
      expect(envelope).toHaveProperty('hmac');
      expect(typeof envelope.data).toBe('string');
      expect(typeof envelope.hmac).toBe('string');
    });

    it('returns null when HMAC is tampered', () => {
      const state = createEconomyState();
      saveEconomyState(state);

      // Tamper with the data but keep old HMAC
      const raw = mockStorage.get(STORAGE_KEY)!;
      const envelope = JSON.parse(raw);
      const tampered = JSON.parse(envelope.data);
      tampered.balance = 999999;
      envelope.data = JSON.stringify(tampered);
      // HMAC is now stale
      mockStorage.set(STORAGE_KEY, JSON.stringify(envelope));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const loaded = loadEconomyState();
      expect(loaded).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('HMAC integrity check failed'),
      );
      warnSpy.mockRestore();
    });

    it('returns null when HMAC value is corrupted', () => {
      const state = createEconomyState();
      saveEconomyState(state);

      const raw = mockStorage.get(STORAGE_KEY)!;
      const envelope = JSON.parse(raw);
      envelope.hmac = 'deadbeef';
      mockStorage.set(STORAGE_KEY, JSON.stringify(envelope));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const loaded = loadEconomyState();
      expect(loaded).toBeNull();
      warnSpy.mockRestore();
    });

    it('round-trips a state with transactions through HMAC envelope', () => {
      let state = createEconomyState();
      const r1 = issueReward(state, 'task-hmac-1');
      if (!r1.ok) throw new Error(r1.error);
      state = r1.value.state;

      const r2 = spend(state, 5, 'hmac-test-purchase');
      if (!r2.ok) throw new Error(r2.error);
      state = r2.value.state;

      saveEconomyState(state);
      const loaded = loadEconomyState();

      expect(loaded).not.toBeNull();
      expect(loaded!.balance).toBe(state.balance);
      expect(loaded!.transactions).toHaveLength(3);
      expect(loaded!.totalSpent).toBe(5);
    });

    it('returns null when localStorage is empty', () => {
      const loaded = loadEconomyState();
      expect(loaded).toBeNull();
    });

    it('accepts legacy format (pre-HMAC) with warning', () => {
      // Simulate old format: just raw JSON without envelope
      const state = createEconomyState();
      mockStorage.set(STORAGE_KEY, JSON.stringify(state));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const loaded = loadEconomyState();
      expect(loaded).not.toBeNull();
      expect(loaded!.balance).toBe(100);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('legacy format'),
      );
      warnSpy.mockRestore();
    });
  });
});
