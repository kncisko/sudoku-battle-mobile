export interface ChallengeData {
  challengerUserId: string;
  challengerSocketId: string;
  challengerName: string;
  targetUserId: string;
  targetSocketId: string;
  targetName: string;
}

/**
 * Tracks in-flight challenges between lobby players.
 *
 * Like Lobby.ts, IO is kept out of this class so it can be unit-tested
 * without a real server. The caller injects an `onTimeout` callback that
 * fires when a challenge expires.
 */
export class ChallengeManager {
  private challenges = new Map<string, { data: ChallengeData; timer: ReturnType<typeof setTimeout> }>();
  private onTimeout: (challenge: ChallengeData) => void;
  private timeoutMs: number;

  constructor(onTimeout: (challenge: ChallengeData) => void, timeoutMs = 60_000) {
    this.onTimeout = onTimeout;
    this.timeoutMs = timeoutMs;
  }

  private key(challengerUserId: string, targetUserId: string): string {
    return `${challengerUserId}→${targetUserId}`;
  }

  /**
   * Create a new challenge. Returns false if either party already has a
   * pending challenge (one challenger, one target at a time).
   */
  send(data: ChallengeData): boolean {
    if (this.isChallenging(data.challengerUserId)) return false;
    if (this.isBeingChallenged(data.targetUserId)) return false;

    const k = this.key(data.challengerUserId, data.targetUserId);
    const timer = setTimeout(() => {
      this.challenges.delete(k);
      this.onTimeout(data);
    }, this.timeoutMs);

    this.challenges.set(k, { data, timer });
    return true;
  }

  /** Remove a challenge and cancel its timer. Returns the challenge or undefined. */
  remove(challengerUserId: string, targetUserId: string): ChallengeData | undefined {
    const entry = this.challenges.get(this.key(challengerUserId, targetUserId));
    if (!entry) return undefined;
    clearTimeout(entry.timer);
    this.challenges.delete(this.key(challengerUserId, targetUserId));
    return entry.data;
  }

  /** Remove all challenges that involve this userId (on disconnect). Returns removed entries. */
  removeAllForUser(userId: string): ChallengeData[] {
    const removed: ChallengeData[] = [];
    for (const [k, { data, timer }] of this.challenges.entries()) {
      if (data.challengerUserId === userId || data.targetUserId === userId) {
        clearTimeout(timer);
        this.challenges.delete(k);
        removed.push(data);
      }
    }
    return removed;
  }

  getByChallenger(challengerUserId: string): ChallengeData | undefined {
    for (const { data } of this.challenges.values()) {
      if (data.challengerUserId === challengerUserId) return data;
    }
  }

  getByTarget(targetUserId: string): ChallengeData | undefined {
    for (const { data } of this.challenges.values()) {
      if (data.targetUserId === targetUserId) return data;
    }
  }

  isChallenging(userId: string): boolean {
    return !!this.getByChallenger(userId);
  }

  isBeingChallenged(userId: string): boolean {
    return !!this.getByTarget(userId);
  }

  size(): number {
    return this.challenges.size;
  }
}
