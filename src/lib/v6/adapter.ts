// ============================================================================
// NewClaw V6 - Adapter Stub Layer
// B-team stub implementations returning mock data.
// A-team will replace with real HTTP calls to localhost:13220/api/trinity/*
// ============================================================================

import type { HostIdentity, EconomyStatus } from '@/types/v6';
import { generateIdentity } from '@/lib/v6/identity';
import { getOrCreateEconomyState, getEconomyStatus, loadEconomyState } from '@/lib/v6/economy';
import { createPooState, getPooStats as _getPooStats, type PooState } from '@/lib/v6/poo-verifier';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate network latency (50-200ms random delay) */
function simulateDelay(): Promise<void> {
  const ms = 50 + Math.floor(Math.random() * 151);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cached identity so repeated calls return the same node
 * (simulates a persistent backend identity).
 */
let _cachedIdentity: HostIdentity | null = null;

/**
 * Module-level PoO state. Consumers can replace via setAdapterPooState()
 * to share state with the rest of the application.
 */
let _pooState: PooState = createPooState();

/** Replace the adapter's PoO state (e.g. when wiring to a Zustand store). */
export function setAdapterPooState(state: PooState): void {
  _pooState = state;
}

/** Read-only access to the adapter's current PoO state. */
export function getAdapterPooState(): PooState {
  return _pooState;
}

// ---------------------------------------------------------------------------
// Adapter Functions (stubs)
// ---------------------------------------------------------------------------

/**
 * Seed the adapter's identity cache from an external source (e.g. the
 * onboarding wizard).  This prevents fetchIdentity() from generating a
 * second, different identity after the wizard already created one.
 */
export function seedIdentityCache(identity: HostIdentity): void {
  _cachedIdentity = identity;
}

/**
 * Fetch the host identity from the backend.
 * A-team endpoint: GET /api/trinity/identity
 *
 * Uses generateIdentity() from the identity module to produce a
 * simulated-but-structurally-real identity on first call, then
 * caches it for the session lifetime.
 */
export async function fetchIdentity(): Promise<HostIdentity> {
  await simulateDelay();
  if (!_cachedIdentity) {
    _cachedIdentity = generateIdentity();
  }
  return _cachedIdentity;
}

/**
 * Fetch genesis ceremony status.
 * A-team endpoint: GET /api/trinity/genesis/status
 *
 * Real logic: checks if an identity has been generated (via the cached
 * identity from fetchIdentity) and if economy state exists in localStorage.
 * Genesis is complete when both subsystems are initialized.
 */
export async function fetchGenesisStatus(): Promise<{
  isComplete: boolean;
  hasIdentity: boolean;
  hasEconomy: boolean;
}> {
  await simulateDelay();

  // Identity check: has generateIdentity been called and cached?
  const hasIdentity = _cachedIdentity !== null;

  // Economy check: does persisted economy state exist in localStorage?
  const hasEconomy = loadEconomyState() !== null;

  return {
    isComplete: hasIdentity && hasEconomy,
    hasIdentity,
    hasEconomy,
  };
}

/**
 * Fetch New.B balance and economy metrics.
 * A-team endpoint: GET /api/trinity/economy/status
 *
 * Now wired to the real economy module instead of returning mock data.
 * Uses localStorage-backed state via getOrCreateEconomyState().
 */
export async function fetchNewBBalance(): Promise<EconomyStatus> {
  await simulateDelay();
  const state = getOrCreateEconomyState();
  return getEconomyStatus(state);
}

/**
 * Fetch Proof-of-Outcome statistics.
 * A-team endpoint: GET /api/trinity/poo/stats
 *
 * Now wired to the real PoO verifier module instead of returning mock data.
 * Uses module-level _pooState which can be synced via setAdapterPooState().
 */
export async function fetchPooStats(): Promise<{
  totalTasks: number;
  verified: number;
  rejected: number;
  pending: number;
  score: number;
}> {
  await simulateDelay();
  return _getPooStats(_pooState);
}

/**
 * Fetch sandbox engine availability.
 * A-team endpoint: GET /api/trinity/sandbox/status
 *
 * Real detection logic:
 *   - Electron context (window.electron exists): subprocess engine available
 *   - Browser context: no sandbox engine available
 */
export async function fetchSandboxStatus(): Promise<{
  available: boolean;
  engine: 'docker' | 'subprocess' | 'none';
}> {
  await simulateDelay();

  // Detect Electron environment via the preload-exposed API
  const isElectron =
    typeof window !== 'undefined' &&
    'electron' in window;

  if (isElectron) {
    return { available: true, engine: 'subprocess' };
  }

  return { available: false, engine: 'none' };
}
