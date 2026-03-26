import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Lobby, type LobbyPlayerPublic } from '../game/Lobby.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeLobby() {
  const calls: Array<{ socketId: string; players: LobbyPlayerPublic[]; total: number }> = [];
  const lobby = new Lobby((socketId, players, total) => {
    calls.push({ socketId, players, total });
  });
  return { lobby, calls };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('Lobby', () => {
  describe('add()', () => {
    it('adds a player and broadcasts to them', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);

      expect(lobby.size()).toBe(1);
      expect(calls).toHaveLength(1);
      expect(calls[0].socketId).toBe('socket-1');
      expect(calls[0].total).toBe(1);
      expect(calls[0].players[0]).toMatchObject({ userId: 'user-1', name: 'Alice', status: 'available' });
    });

    it('broadcasts to all lobby members when a second player joins', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      calls.length = 0; // reset after first add

      lobby.add('socket-2', 'user-2', 'Bob', 0.4, 5);

      // Both Alice and Bob should receive the update
      const recipients = calls.map(c => c.socketId);
      expect(recipients).toContain('socket-1');
      expect(recipients).toContain('socket-2');
      expect(calls[0].total).toBe(2);
    });

    it('does not expose socketId in the broadcasted snapshot', () => {
      const { lobby, calls } = makeLobby();
      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);

      const broadcasted = calls[0].players[0] as Record<string, unknown>;
      expect('socketId' in broadcasted).toBe(false);
    });

    it('handles reconnect: cleans up old socket mapping when userId re-joins', () => {
      const { lobby } = makeLobby();

      lobby.add('socket-old', 'user-1', 'Alice', 0.6, 10);
      lobby.add('socket-new', 'user-1', 'Alice', 0.6, 10);

      // Still only 1 player
      expect(lobby.size()).toBe(1);
      // Old socket should no longer map to anything
      expect(lobby.getUserIdBySocket('socket-old')).toBeUndefined();
      // New socket maps correctly
      expect(lobby.getUserIdBySocket('socket-new')).toBe('user-1');
    });
  });

  describe('removeBySocket()', () => {
    it('removes the correct player and returns them', () => {
      const { lobby } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      const removed = lobby.removeBySocket('socket-1');

      expect(removed?.name).toBe('Alice');
      expect(lobby.size()).toBe(0);
    });

    it('returns undefined for an unknown socket', () => {
      const { lobby } = makeLobby();
      expect(lobby.removeBySocket('no-such-socket')).toBeUndefined();
    });

    it('broadcasts after removal', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      lobby.add('socket-2', 'user-2', 'Bob', 0.4, 5);
      calls.length = 0;

      lobby.removeBySocket('socket-1');

      // Only Bob remains — broadcast should go to socket-2
      const recipients = calls.map(c => c.socketId);
      expect(recipients).toContain('socket-2');
      expect(recipients).not.toContain('socket-1');
      expect(calls[0].total).toBe(1);
    });
  });

  describe('setStatus()', () => {
    it('changes status and broadcasts', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      calls.length = 0;

      lobby.setStatus('user-1', 'idle');

      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0].players[0].status).toBe('idle');
    });

    it('does not broadcast when status is unchanged', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      calls.length = 0;

      lobby.setStatus('user-1', 'available'); // already available

      expect(calls).toHaveLength(0);
    });

    it('is a no-op for unknown userId', () => {
      const { lobby, calls } = makeLobby();
      calls.length = 0;

      lobby.setStatus('no-such-user', 'idle'); // should not throw

      expect(calls).toHaveLength(0);
    });
  });

  describe('setStatusBySocket()', () => {
    it('changes status by socket id', () => {
      const { lobby, calls } = makeLobby();

      lobby.add('socket-1', 'user-1', 'Alice', 0.6, 10);
      calls.length = 0;

      lobby.setStatusBySocket('socket-1', 'in_game');

      expect(calls[0].players[0].status).toBe('in_game');
    });

    it('is a no-op for unknown socket', () => {
      const { lobby, calls } = makeLobby();
      calls.length = 0;

      lobby.setStatusBySocket('unknown-socket', 'idle');

      expect(calls).toHaveLength(0);
    });
  });

  describe('getSnapshot() ordering', () => {
    it('sorts by status: available → idle → pending → in_game', () => {
      const { lobby } = makeLobby();

      lobby.add('s1', 'u1', 'D', 0, 0);
      lobby.add('s2', 'u2', 'B', 0, 0);
      lobby.add('s3', 'u3', 'A', 0, 0);
      lobby.add('s4', 'u4', 'C', 0, 0);

      lobby.setStatus('u1', 'in_game');
      lobby.setStatus('u2', 'idle');
      lobby.setStatus('u3', 'available');
      lobby.setStatus('u4', 'pending');

      const snapshot = lobby.getSnapshot();
      const statuses = snapshot.map(p => p.status);

      expect(statuses).toEqual(['available', 'idle', 'pending', 'in_game']);
    });

    it('sorts by winRate descending within the same status', () => {
      const { lobby } = makeLobby();

      lobby.add('s1', 'u1', 'Low', 0.2, 10);
      lobby.add('s2', 'u2', 'High', 0.9, 50);
      lobby.add('s3', 'u3', 'Mid', 0.5, 20);

      const snapshot = lobby.getSnapshot();
      const names = snapshot.map(p => p.name);

      expect(names).toEqual(['High', 'Mid', 'Low']);
    });
  });
});
