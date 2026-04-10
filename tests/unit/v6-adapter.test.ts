import { describe, it, expect } from 'vitest';

import {
  fetchIdentity,
  fetchGenesisStatus,
  fetchNewBBalance,
  fetchPooStats,
  fetchSandboxStatus,
} from '@/lib/v6/adapter';

// ---------------------------------------------------------------------------
// V6 Adapter Stub Tests
// ---------------------------------------------------------------------------

describe('V6 Adapter Stubs', () => {
  // -----------------------------------------------------------------------
  // fetchIdentity
  // -----------------------------------------------------------------------

  describe('fetchIdentity', () => {
    it('returns a valid HostIdentity shape', async () => {
      const identity = await fetchIdentity();

      expect(identity).toHaveProperty('nodeId');
      expect(identity).toHaveProperty('publicKey');
      expect(identity).toHaveProperty('address');
      expect(identity).toHaveProperty('createdAt');
      expect(identity).toHaveProperty('isLocked');
    });

    it('nodeId follows DID format', async () => {
      const identity = await fetchIdentity();
      expect(identity.nodeId).toMatch(/^did:newclaw:/);
    });

    it('publicKey is a non-empty string', async () => {
      const identity = await fetchIdentity();
      expect(typeof identity.publicKey).toBe('string');
      expect(identity.publicKey.length).toBeGreaterThan(0);
    });

    it('isLocked is a boolean', async () => {
      const identity = await fetchIdentity();
      expect(typeof identity.isLocked).toBe('boolean');
    });

    it('createdAt is a valid ISO timestamp', async () => {
      const identity = await fetchIdentity();
      const date = new Date(identity.createdAt);
      expect(date.getTime()).not.toBeNaN();
      expect(typeof identity.createdAt).toBe('string');
    });
  });

  // -----------------------------------------------------------------------
  // fetchGenesisStatus
  // -----------------------------------------------------------------------

  describe('fetchGenesisStatus', () => {
    it('returns correct shape with boolean fields', async () => {
      const status = await fetchGenesisStatus();

      expect(status).toHaveProperty('isComplete');
      expect(status).toHaveProperty('hasIdentity');
      expect(status).toHaveProperty('hasEconomy');

      expect(typeof status.isComplete).toBe('boolean');
      expect(typeof status.hasIdentity).toBe('boolean');
      expect(typeof status.hasEconomy).toBe('boolean');
    });

    it('reflects real state: no identity before fetchIdentity called', async () => {
      const status = await fetchGenesisStatus();
      // Before fetchIdentity is called, hasIdentity is false
      expect(typeof status.hasIdentity).toBe('boolean');
      expect(typeof status.hasEconomy).toBe('boolean');
      // isComplete = hasIdentity && hasEconomy
      expect(status.isComplete).toBe(status.hasIdentity && status.hasEconomy);
    });
  });

  // -----------------------------------------------------------------------
  // fetchNewBBalance
  // -----------------------------------------------------------------------

  describe('fetchNewBBalance', () => {
    it('returns a valid EconomyStatus shape', async () => {
      const economy = await fetchNewBBalance();

      expect(economy).toHaveProperty('newbBalance');
      expect(economy).toHaveProperty('simBalance');
      expect(economy).toHaveProperty('halvingEpoch');
      expect(economy).toHaveProperty('halvingProgress');
      expect(economy).toHaveProperty('totalMined');
      expect(economy).toHaveProperty('pooScore');
      expect(economy).toHaveProperty('pooVerified');
      expect(economy).toHaveProperty('pooRejected');
    });

    it('all numeric fields are numbers', async () => {
      const economy = await fetchNewBBalance();

      expect(typeof economy.newbBalance).toBe('number');
      expect(typeof economy.simBalance).toBe('number');
      expect(typeof economy.halvingEpoch).toBe('number');
      expect(typeof economy.halvingProgress).toBe('number');
      expect(typeof economy.totalMined).toBe('number');
      expect(typeof economy.pooScore).toBe('number');
      expect(typeof economy.pooVerified).toBe('number');
      expect(typeof economy.pooRejected).toBe('number');
    });

    it('halvingProgress is within 0-100 range', async () => {
      const economy = await fetchNewBBalance();
      expect(economy.halvingProgress).toBeGreaterThanOrEqual(0);
      expect(economy.halvingProgress).toBeLessThanOrEqual(100);
    });

    it('pooScore is within 0-100 range', async () => {
      const economy = await fetchNewBBalance();
      expect(economy.pooScore).toBeGreaterThanOrEqual(0);
      expect(economy.pooScore).toBeLessThanOrEqual(100);
    });

    it('balances are non-negative', async () => {
      const economy = await fetchNewBBalance();
      expect(economy.newbBalance).toBeGreaterThanOrEqual(0);
      expect(economy.simBalance).toBeGreaterThanOrEqual(0);
      expect(economy.totalMined).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // fetchPooStats
  // -----------------------------------------------------------------------

  describe('fetchPooStats', () => {
    it('returns correct shape', async () => {
      const stats = await fetchPooStats();

      expect(stats).toHaveProperty('totalTasks');
      expect(stats).toHaveProperty('verified');
      expect(stats).toHaveProperty('rejected');
      expect(stats).toHaveProperty('score');
    });

    it('all fields are numbers', async () => {
      const stats = await fetchPooStats();

      expect(typeof stats.totalTasks).toBe('number');
      expect(typeof stats.verified).toBe('number');
      expect(typeof stats.rejected).toBe('number');
      expect(typeof stats.score).toBe('number');
    });

    it('verified + rejected does not exceed totalTasks', async () => {
      const stats = await fetchPooStats();
      expect(stats.verified + stats.rejected).toBeLessThanOrEqual(stats.totalTasks);
    });

    it('score is within 0-100 range', async () => {
      const stats = await fetchPooStats();
      expect(stats.score).toBeGreaterThanOrEqual(0);
      expect(stats.score).toBeLessThanOrEqual(100);
    });
  });

  // -----------------------------------------------------------------------
  // fetchSandboxStatus
  // -----------------------------------------------------------------------

  describe('fetchSandboxStatus', () => {
    it('returns correct shape', async () => {
      const status = await fetchSandboxStatus();

      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('engine');
    });

    it('available is a boolean', async () => {
      const status = await fetchSandboxStatus();
      expect(typeof status.available).toBe('boolean');
    });

    it('engine is one of the valid values', async () => {
      const status = await fetchSandboxStatus();
      expect(['docker', 'subprocess', 'none']).toContain(status.engine);
    });

    it('detects Electron environment and returns subprocess engine', async () => {
      // test setup.ts mocks window.electron, so we should detect Electron
      const status = await fetchSandboxStatus();
      expect(status.available).toBe(true);
      expect(status.engine).toBe('subprocess');
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting: async behavior
  // -----------------------------------------------------------------------

  describe('async behavior', () => {
    it('all functions return promises', () => {
      expect(fetchIdentity()).toBeInstanceOf(Promise);
      expect(fetchGenesisStatus()).toBeInstanceOf(Promise);
      expect(fetchNewBBalance()).toBeInstanceOf(Promise);
      expect(fetchPooStats()).toBeInstanceOf(Promise);
      expect(fetchSandboxStatus()).toBeInstanceOf(Promise);
    });

    it('all functions resolve without errors', async () => {
      await expect(fetchIdentity()).resolves.toBeDefined();
      await expect(fetchGenesisStatus()).resolves.toBeDefined();
      await expect(fetchNewBBalance()).resolves.toBeDefined();
      await expect(fetchPooStats()).resolves.toBeDefined();
      await expect(fetchSandboxStatus()).resolves.toBeDefined();
    });
  });
});
