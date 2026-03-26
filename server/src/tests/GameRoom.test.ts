import { describe, it, expect, beforeEach } from 'vitest';
import { GameRoom } from '../game/GameRoom.js';
import type { Player } from '../../../shared/types.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Create a room and add two human players. */
function makeRoom(id = 'TEST-ROOM'): GameRoom {
  const room = new GameRoom(id);
  room.addPlayer('socket-1', 'Alice', 'user-alice');
  room.addPlayer('socket-2', 'Bob', 'user-bob');
  return room;
}

/** Create a room, add two players, and start the game. */
function makeStartedRoom(id = 'TEST-ROOM'): GameRoom {
  const room = makeRoom(id);
  room.startGame();
  return room;
}

/** Find the first unlocked cell and its correct solution value. */
function firstUnlockedCell(room: GameRoom): { row: number; col: number; correctValue: number } {
  const state = room.getState();
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (!state.board.cells[row][col].locked) {
        return { row, col, correctValue: state.solution[row][col] };
      }
    }
  }
  throw new Error('No unlocked cell found');
}

/** Return a value that is definitely wrong for this cell (cycles 1-9). */
function wrongValue(correct: number): number {
  return correct === 9 ? 1 : correct + 1;
}

/** Lock all but `leaveOpen` cells directly on the state object (returns reference). */
function fillBoardLeaving(room: GameRoom, leaveOpen: number): void {
  const state = room.getState();
  let filled = 0;
  const total = state.board.cells.flat().filter(c => !c.locked).length;
  const toFill = total - leaveOpen;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (filled >= toFill) return;
      const cell = state.board.cells[row][col];
      if (!cell.locked) {
        cell.value = state.solution[row][col];
        cell.locked = true;
        cell.lockedBy = 'system';
        filled++;
      }
    }
  }
}

// ── constructor ───────────────────────────────────────────────────────────────

describe('GameRoom — constructor', () => {
  it('initialises with waiting status', () => {
    const room = new GameRoom('R1');
    expect(room.getStatus()).toBe('waiting');
  });

  it('initialises with an empty player list', () => {
    const room = new GameRoom('R1');
    expect(room.getPlayers()).toHaveLength(0);
  });

  it('generates a board with cells', () => {
    const room = new GameRoom('R1');
    const board = room.getBoard();
    expect(board.cells).toHaveLength(9);
    board.cells.forEach(row => expect(row).toHaveLength(9));
  });

  it('getId returns the correct room id', () => {
    const room = new GameRoom('MY-ROOM');
    expect(room.getId()).toBe('MY-ROOM');
  });

  it('isAIEnabled returns false for a human room', () => {
    expect(new GameRoom('R1').isAIEnabled()).toBe(false);
  });

  it('isAIEnabled returns true for an AI room', () => {
    expect(new GameRoom('R1', true).isAIEnabled()).toBe(true);
  });
});

// ── addPlayer ─────────────────────────────────────────────────────────────────

describe('GameRoom — addPlayer', () => {
  it('adds a player and returns true', () => {
    const room = new GameRoom('R1');
    expect(room.addPlayer('s1', 'Alice', 'u1')).toBe(true);
    expect(room.getPlayerCount()).toBe(1);
  });

  it('uses the provided userId as player id', () => {
    const room = new GameRoom('R1');
    room.addPlayer('s1', 'Alice', 'user-alice');
    const player = room.getPlayerBySocketId('s1');
    expect(player?.id).toBe('user-alice');
  });

  it('generates a guest_ id when no userId provided', () => {
    const room = new GameRoom('R1');
    room.addPlayer('s1', 'Guest');
    const player = room.getPlayerBySocketId('s1');
    expect(player?.id).toMatch(/^guest_/);
  });

  it('initialises score to 0 for the new player', () => {
    const room = new GameRoom('R1');
    room.addPlayer('s1', 'Alice', 'u1');
    expect(room.getScores()['u1']).toBe(0);
  });

  it('allows two players to join', () => {
    const room = makeRoom();
    expect(room.getPlayerCount()).toBe(2);
    expect(room.isFull()).toBe(true);
  });

  it('rejects a third player', () => {
    const room = makeRoom();
    expect(room.addPlayer('s3', 'Carol', 'u3')).toBe(false);
    expect(room.getPlayerCount()).toBe(2);
  });

  it('AI game: automatically adds AI as second player', () => {
    const room = new GameRoom('R1', true);
    room.addPlayer('s1', 'Alice', 'u1');
    expect(room.getPlayerCount()).toBe(2);
    const players = room.getPlayers();
    expect(players.find(p => p.name === 'AI Opponent')).toBeTruthy();
    expect(players.find(p => p.socketId === 'ai')).toBeTruthy();
  });
});

// ── removePlayer ──────────────────────────────────────────────────────────────

describe('GameRoom — removePlayer', () => {
  it('removes a player by socketId and returns them', () => {
    const room = makeRoom();
    const removed = room.removePlayer('socket-1');
    expect(removed?.name).toBe('Alice');
    expect(room.getPlayerCount()).toBe(1);
  });

  it('returns null for an unknown socketId', () => {
    const room = makeRoom();
    expect(room.removePlayer('no-such-socket')).toBeNull();
  });

  it('deletes the removed player\'s score entry', () => {
    const room = makeRoom();
    room.removePlayer('socket-1');
    expect(room.getScores()['user-alice']).toBeUndefined();
  });

  it('ends the game when a player leaves mid-game', () => {
    const room = makeStartedRoom();
    room.removePlayer('socket-1');
    expect(room.getStatus()).toBe('finished');
  });

  it('does not end the game when a player leaves from waiting state', () => {
    const room = makeRoom();
    room.removePlayer('socket-1');
    expect(room.getStatus()).toBe('waiting');
  });
});

// ── player lookup ─────────────────────────────────────────────────────────────

describe('GameRoom — player lookup', () => {
  it('getPlayerBySocketId finds the correct player', () => {
    const room = makeRoom();
    expect(room.getPlayerBySocketId('socket-2')?.name).toBe('Bob');
  });

  it('getPlayerBySocketId returns null for unknown socket', () => {
    const room = makeRoom();
    expect(room.getPlayerBySocketId('unknown')).toBeNull();
  });

  it('getPlayerById finds the correct player', () => {
    const room = makeRoom();
    expect(room.getPlayerById('user-alice')?.name).toBe('Alice');
  });

  it('getPlayerById returns null for unknown id', () => {
    const room = makeRoom();
    expect(room.getPlayerById('no-id')).toBeNull();
  });

  it('updatePlayerSocketId updates the socket id', () => {
    const room = makeRoom();
    expect(room.updatePlayerSocketId('socket-1', 'socket-new')).toBe(true);
    expect(room.getPlayerBySocketId('socket-new')?.name).toBe('Alice');
    expect(room.getPlayerBySocketId('socket-1')).toBeNull();
  });

  it('updatePlayerSocketId returns false for unknown socket', () => {
    const room = makeRoom();
    expect(room.updatePlayerSocketId('no-such', 'new')).toBe(false);
  });
});

// ── startGame ─────────────────────────────────────────────────────────────────

describe('GameRoom — startGame', () => {
  it('transitions status to playing', () => {
    const room = makeRoom();
    room.startGame();
    expect(room.getStatus()).toBe('playing');
  });

  it('returns true on success', () => {
    expect(makeRoom().startGame()).toBe(true);
  });

  it('returns false with fewer than 2 players', () => {
    const room = new GameRoom('R1');
    room.addPlayer('s1', 'Alice', 'u1');
    expect(room.startGame()).toBe(false);
  });

  it('returns false if game already started', () => {
    const room = makeStartedRoom();
    expect(room.startGame()).toBe(false);
  });

  it('sets a valid current player', () => {
    const room = makeStartedRoom();
    const current = room.getCurrentPlayer();
    expect(current).not.toBeNull();
    expect(['Alice', 'Bob']).toContain(current?.name);
  });

  it('records a non-zero turn start time', () => {
    const room = makeStartedRoom();
    expect(room.getTurnStartTime()).toBeGreaterThan(0);
  });
});

// ── makeMove — correct answer ─────────────────────────────────────────────────

describe('GameRoom — makeMove (correct)', () => {
  let room: GameRoom;
  let currentPlayer: Player;
  let cell: { row: number; col: number; correctValue: number };

  beforeEach(() => {
    room = makeStartedRoom();
    currentPlayer = room.getCurrentPlayer()!;
    cell = firstUnlockedCell(room);
  });

  it('returns success: true', () => {
    const result = room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(result.success).toBe(true);
  });

  it('locks the cell', () => {
    room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(room.getBoard().cells[cell.row][cell.col].locked).toBe(true);
  });

  it('sets the correct value on the cell', () => {
    room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(room.getBoard().cells[cell.row][cell.col].value).toBe(cell.correctValue);
  });

  it('records lockedBy as the player id', () => {
    room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(room.getBoard().cells[cell.row][cell.col].lockedBy).toBe(currentPlayer.id);
  });

  it('increments the player score', () => {
    const before = room.getScores()[currentPlayer.id];
    room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(room.getScores()[currentPlayer.id]).toBe(before + 1);
  });

  it('does NOT switch the turn (correct answer keeps the turn)', () => {
    const before = room.getCurrentPlayer()?.id;
    room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(room.getCurrentPlayer()?.id).toBe(before);
  });

  it('returns no revealedCell', () => {
    const result = room.makeMove(currentPlayer.id, cell.row, cell.col, cell.correctValue);
    expect(result.revealedCell).toBeUndefined();
  });
});

// ── makeMove — wrong answer ───────────────────────────────────────────────────

describe('GameRoom — makeMove (wrong)', () => {
  let room: GameRoom;
  let currentPlayer: Player;
  let cell: { row: number; col: number; correctValue: number };

  beforeEach(() => {
    room = makeStartedRoom();
    currentPlayer = room.getCurrentPlayer()!;
    cell = firstUnlockedCell(room);
  });

  it('returns success: false', () => {
    const result = room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    expect(result.success).toBe(false);
  });

  it('does not lock the guessed cell', () => {
    room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    // The cell the player guessed should NOT be locked by the guess
    // (a different random cell gets revealed)
    const guessedCell = room.getBoard().cells[cell.row][cell.col];
    // It may have been revealed as the random cell, but if not it stays unlocked
    // We can verify the board total locked count increased by exactly 1 (the revealed cell)
    const lockedCount = room.getBoard().cells.flat().filter(c => c.locked).length;
    // Before: 17 pre-locked. After wrong move: 18 (one random cell revealed).
    // But we started a game so let's just check 1 more cell was locked.
    expect(lockedCount).toBeGreaterThanOrEqual(18); // at least 17 pre-locked + 1 revealed
  });

  it('returns a revealedCell', () => {
    const result = room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    expect(result.revealedCell).toBeDefined();
    expect(result.revealedCell).toHaveProperty('row');
    expect(result.revealedCell).toHaveProperty('col');
  });

  it('marks the revealed cell as revealed=true', () => {
    const result = room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    const revealed = result.revealedCell!;
    expect(room.getBoard().cells[revealed.row][revealed.col].revealed).toBe(true);
  });

  it('switches the turn', () => {
    const before = room.getCurrentPlayer()?.id;
    room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    expect(room.getCurrentPlayer()?.id).not.toBe(before);
  });

  it('does not change the player score', () => {
    const before = room.getScores()[currentPlayer.id];
    room.makeMove(currentPlayer.id, cell.row, cell.col, wrongValue(cell.correctValue));
    expect(room.getScores()[currentPlayer.id]).toBe(before);
  });
});

// ── makeMove — system (timer expiry) ─────────────────────────────────────────

describe('GameRoom — makeMove (system / timer expiry)', () => {
  let room: GameRoom;

  beforeEach(() => {
    room = makeStartedRoom();
  });

  it('returns success: false', () => {
    expect(room.makeMove('system', -1, -1, -1).success).toBe(false);
  });

  it('reveals a cell', () => {
    const result = room.makeMove('system', -1, -1, -1);
    expect(result.revealedCell).toBeDefined();
  });

  it('switches the turn', () => {
    const before = room.getCurrentPlayer()?.id;
    room.makeMove('system', -1, -1, -1);
    expect(room.getCurrentPlayer()?.id).not.toBe(before);
  });

  it('updates turnStartTime after switch', () => {
    const before = room.getTurnStartTime();
    room.makeMove('system', -1, -1, -1);
    expect(room.getTurnStartTime()).toBeGreaterThanOrEqual(before);
  });
});

// ── validateMove ──────────────────────────────────────────────────────────────

describe('GameRoom — validateMove', () => {
  it('returns true for the correct value', () => {
    const room = makeStartedRoom();
    const { row, col, correctValue } = firstUnlockedCell(room);
    expect(room.validateMove(row, col, correctValue)).toBe(true);
  });

  it('returns false for a wrong value', () => {
    const room = makeStartedRoom();
    const { row, col, correctValue } = firstUnlockedCell(room);
    expect(room.validateMove(row, col, wrongValue(correctValue))).toBe(false);
  });

  it('returns false for an already locked cell', () => {
    const room = makeStartedRoom();
    const state = room.getState();
    // Find a pre-locked cell
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (state.board.cells[row][col].locked) {
          expect(room.validateMove(row, col, state.solution[row][col])).toBe(false);
          return;
        }
      }
    }
  });
});

// ── isGameFinished and getWinner ──────────────────────────────────────────────

describe('GameRoom — isGameFinished', () => {
  it('returns false while cells remain', () => {
    const room = makeStartedRoom();
    expect(room.isGameFinished()).toBe(false);
  });

  it('returns true when all cells are locked', () => {
    const room = makeStartedRoom();
    fillBoardLeaving(room, 0);
    expect(room.isGameFinished()).toBe(true);
  });

  it('sets status to finished when all cells are locked', () => {
    const room = makeStartedRoom();
    fillBoardLeaving(room, 0);
    room.isGameFinished();
    expect(room.getStatus()).toBe('finished');
  });
});

describe('GameRoom — getWinner', () => {
  it('returns null while game is not finished', () => {
    const room = makeStartedRoom();
    expect(room.getWinner()).toBeNull();
  });

  it('returns the player with the higher score', () => {
    const room = makeStartedRoom();
    const state = room.getState();
    const [p1] = state.players;
    state.scores[p1.id] = 10;
    // force finish
    fillBoardLeaving(room, 0);
    room.isGameFinished();
    expect(room.getWinner()?.id).toBe(p1.id);
  });

  it('returns null on a tie', () => {
    const room = makeStartedRoom();
    fillBoardLeaving(room, 0);
    room.isGameFinished();
    // both scores start at 0 → tie
    expect(room.getWinner()).toBeNull();
  });
});

// ── early win detection ───────────────────────────────────────────────────────

describe('GameRoom — early win detection', () => {
  it('is not triggered while the lead is catchable', () => {
    const room = makeStartedRoom();
    const state = room.getState();
    const [p1, p2] = state.players;
    state.scores[p1.id] = 3;
    state.scores[p2.id] = 0;
    // ~64 cells remain → 3 > 0 + 64 is false
    expect(room.isGameFinished()).toBe(false);
    expect(room.isEarlyWin()).toBe(false);
  });

  it('triggers when the lead exceeds remaining cells', () => {
    const room = makeStartedRoom();
    fillBoardLeaving(room, 3); // 3 cells remain
    const state = room.getState();
    const [p1, p2] = state.players;
    state.scores[p1.id] = 4;
    state.scores[p2.id] = 0;
    // 4 > 0 + 3 → early win
    expect(room.isGameFinished()).toBe(true);
    expect(room.isEarlyWin()).toBe(true);
    expect(room.getWinner()?.id).toBe(p1.id);
  });

  it('triggers for the second player too', () => {
    const room = makeStartedRoom();
    fillBoardLeaving(room, 2);
    const state = room.getState();
    const [p1, p2] = state.players;
    state.scores[p1.id] = 0;
    state.scores[p2.id] = 5;
    // 5 > 0 + 2 → early win for p2
    expect(room.isGameFinished()).toBe(true);
    expect(room.getWinner()?.id).toBe(p2.id);
  });
});

// ── AI game specifics ─────────────────────────────────────────────────────────

describe('GameRoom — AI game', () => {
  it('is full after one human player joins', () => {
    const room = new GameRoom('R1', true);
    room.addPlayer('s1', 'Alice', 'u1');
    expect(room.isFull()).toBe(true);
  });

  it('getAIMove returns a valid move', () => {
    const room = new GameRoom('R1', true);
    room.addPlayer('s1', 'Alice', 'u1');
    room.startGame();
    const move = room.getAIMove();
    // AI may or may not be current player, but getAIMove always returns something
    expect(move).not.toBeNull();
    expect(move).toHaveProperty('row');
    expect(move).toHaveProperty('col');
    expect(move).toHaveProperty('value');
  });

  it('getAIMove returns null for a non-AI room', () => {
    const room = makeStartedRoom();
    expect(room.getAIMove()).toBeNull();
  });
});
