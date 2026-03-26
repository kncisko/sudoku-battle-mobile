import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChallengeManager, type ChallengeData } from '../game/ChallengeManager.js';

// ── fixtures ──────────────────────────────────────────────────────────────────

const ALICE: ChallengeData = {
  challengerUserId: 'u-alice',
  challengerSocketId: 'socket-alice',
  challengerName: 'Alice',
  targetUserId: 'u-bob',
  targetSocketId: 'socket-bob',
  targetName: 'Bob',
};

const CAROL_VS_DAVE: ChallengeData = {
  challengerUserId: 'u-carol',
  challengerSocketId: 'socket-carol',
  challengerName: 'Carol',
  targetUserId: 'u-dave',
  targetSocketId: 'socket-dave',
  targetName: 'Dave',
};

function makeManager(timeoutMs = 60_000) {
  const timeouts: ChallengeData[] = [];
  const mgr = new ChallengeManager((ch) => timeouts.push(ch), timeoutMs);
  return { mgr, timeouts };
}

// ── send ──────────────────────────────────────────────────────────────────────

describe('ChallengeManager — send()', () => {
  afterEach(() => vi.useRealTimers());

  it('returns true and stores the challenge', () => {
    const { mgr } = makeManager();
    expect(mgr.send(ALICE)).toBe(true);
    expect(mgr.size()).toBe(1);
  });

  it('returns false when the challenger already has a pending challenge', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE);
    // Alice tries to challenge someone else simultaneously
    const second: ChallengeData = { ...ALICE, targetUserId: 'u-eve', targetSocketId: 's-eve', targetName: 'Eve' };
    expect(mgr.send(second)).toBe(false);
    expect(mgr.size()).toBe(1);
  });

  it('returns false when the target is already being challenged', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE); // Alice → Bob
    const second: ChallengeData = { ...CAROL_VS_DAVE, targetUserId: 'u-bob', targetSocketId: 'socket-bob', targetName: 'Bob' };
    expect(mgr.send(second)).toBe(false);
    expect(mgr.size()).toBe(1);
  });

  it('allows two independent challenges simultaneously', () => {
    const { mgr } = makeManager();
    expect(mgr.send(ALICE)).toBe(true);
    expect(mgr.send(CAROL_VS_DAVE)).toBe(true);
    expect(mgr.size()).toBe(2);
  });
});

// ── remove ────────────────────────────────────────────────────────────────────

describe('ChallengeManager — remove()', () => {
  it('removes the challenge and returns it', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE);
    const removed = mgr.remove(ALICE.challengerUserId, ALICE.targetUserId);
    expect(removed?.challengerName).toBe('Alice');
    expect(mgr.size()).toBe(0);
  });

  it('returns undefined for a non-existent challenge', () => {
    const { mgr } = makeManager();
    expect(mgr.remove('no-one', 'no-body')).toBeUndefined();
  });

  it('cancels the timeout so it does not fire after removal', () => {
    vi.useFakeTimers();
    const { mgr, timeouts } = makeManager(5_000);
    mgr.send(ALICE);
    mgr.remove(ALICE.challengerUserId, ALICE.targetUserId);
    vi.advanceTimersByTime(10_000);
    expect(timeouts).toHaveLength(0);
  });

  it('allows a new challenge between the same pair after removal', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE);
    mgr.remove(ALICE.challengerUserId, ALICE.targetUserId);
    expect(mgr.send(ALICE)).toBe(true);
  });
});

// ── removeAllForUser ──────────────────────────────────────────────────────────

describe('ChallengeManager — removeAllForUser()', () => {
  it('removes challenges where user is the challenger', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE);
    const removed = mgr.removeAllForUser(ALICE.challengerUserId);
    expect(removed).toHaveLength(1);
    expect(removed[0].challengerName).toBe('Alice');
    expect(mgr.size()).toBe(0);
  });

  it('removes challenges where user is the target', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE);
    const removed = mgr.removeAllForUser(ALICE.targetUserId);
    expect(removed).toHaveLength(1);
    expect(mgr.size()).toBe(0);
  });

  it('removes all challenges involving the user across multiple entries', () => {
    const { mgr } = makeManager();
    mgr.send(ALICE); // Alice → Bob
    mgr.send(CAROL_VS_DAVE); // Carol → Dave
    // Alice disconnects — only her challenge should be removed
    const removed = mgr.removeAllForUser(ALICE.challengerUserId);
    expect(removed).toHaveLength(1);
    expect(mgr.size()).toBe(1); // Carol → Dave still exists
  });

  it('returns empty array when user has no active challenges', () => {
    const { mgr } = makeManager();
    expect(mgr.removeAllForUser('ghost-user')).toHaveLength(0);
  });

  it('cancels timeouts for removed challenges', () => {
    vi.useFakeTimers();
    const { mgr, timeouts } = makeManager(5_000);
    mgr.send(ALICE);
    mgr.removeAllForUser(ALICE.challengerUserId);
    vi.advanceTimersByTime(10_000);
    expect(timeouts).toHaveLength(0);
    vi.useRealTimers();
  });
});

// ── query helpers ─────────────────────────────────────────────────────────────

describe('ChallengeManager — query helpers', () => {
  let mgr: ChallengeManager;

  beforeEach(() => {
    ({ mgr } = makeManager());
    mgr.send(ALICE);
  });

  it('getByChallenger returns the challenge', () => {
    expect(mgr.getByChallenger(ALICE.challengerUserId)?.targetName).toBe('Bob');
  });

  it('getByChallenger returns undefined for unknown user', () => {
    expect(mgr.getByChallenger('ghost')).toBeUndefined();
  });

  it('getByTarget returns the challenge', () => {
    expect(mgr.getByTarget(ALICE.targetUserId)?.challengerName).toBe('Alice');
  });

  it('getByTarget returns undefined for unknown user', () => {
    expect(mgr.getByTarget('ghost')).toBeUndefined();
  });

  it('isChallenging returns true for active challenger', () => {
    expect(mgr.isChallenging(ALICE.challengerUserId)).toBe(true);
  });

  it('isChallenging returns false for non-challenger', () => {
    expect(mgr.isChallenging(ALICE.targetUserId)).toBe(false);
  });

  it('isBeingChallenged returns true for active target', () => {
    expect(mgr.isBeingChallenged(ALICE.targetUserId)).toBe(true);
  });

  it('isBeingChallenged returns false for non-target', () => {
    expect(mgr.isBeingChallenged(ALICE.challengerUserId)).toBe(false);
  });
});

// ── timeout ───────────────────────────────────────────────────────────────────

describe('ChallengeManager — timeout', () => {
  afterEach(() => vi.useRealTimers());

  it('fires the onTimeout callback after the configured duration', () => {
    vi.useFakeTimers();
    const { mgr, timeouts } = makeManager(5_000);
    mgr.send(ALICE);
    vi.advanceTimersByTime(5_000);
    expect(timeouts).toHaveLength(1);
    expect(timeouts[0].challengerName).toBe('Alice');
  });

  it('removes the challenge from the map when it times out', () => {
    vi.useFakeTimers();
    const { mgr } = makeManager(5_000);
    mgr.send(ALICE);
    vi.advanceTimersByTime(5_000);
    expect(mgr.size()).toBe(0);
  });

  it('does not fire before the timeout', () => {
    vi.useFakeTimers();
    const { mgr, timeouts } = makeManager(5_000);
    mgr.send(ALICE);
    vi.advanceTimersByTime(4_999);
    expect(timeouts).toHaveLength(0);
  });

  it('allows a new challenge after timeout', () => {
    vi.useFakeTimers();
    const { mgr } = makeManager(5_000);
    mgr.send(ALICE);
    vi.advanceTimersByTime(5_000);
    expect(mgr.send(ALICE)).toBe(true);
  });
});
