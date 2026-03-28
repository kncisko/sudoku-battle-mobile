import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom.js';
import { clearRoomColors } from './game/ColorSchemes.js';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';
import { Lobby } from './game/Lobby.js';
import { ChallengeManager } from './game/ChallengeManager.js';

export const app = express();
export const httpServer = createServer(app);

// Configure CORS for Express
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.0.178:5173',
    'https://sudoku-battle.kresimirnovak.eu',
    'capacitor://localhost', // iOS Capacitor
    'https://localhost', // Android Capacitor
  ],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

// Socket.IO setup with CORS
export const io = new Server(httpServer, {
  cors: corsOptions
});

const TURN_TIME_LIMIT = 20; // seconds per turn — must match client
const RECONNECT_TIMEOUT_SECS = 90; // seconds before disconnected player forfeits

// Room management
const rooms = new Map<string, GameRoom>();
const socketToRoom = new Map<string, string>(); // socketId → roomCode
const forfeitTimers = new Map<string, ReturnType<typeof setTimeout>>(); // roomCode → timer

// Lobby — IO injected as a dependency so Lobby.ts stays testable.
// Use direct socket lookup instead of io.to(socketId) to avoid delivery
// issues on reverse-proxied / cPanel-hosted servers.
const lobby = new Lobby((socketId, players, total) => {
  const target = io.sockets.sockets.get(socketId);
  target?.emit('lobby_update', { players, total });
});

const CHALLENGE_TIMEOUT_SECS = 60;

// Challenge manager — timeout callback notifies both parties and resets their status
const challengeManager = new ChallengeManager((challenge) => {
  lobby.setStatus(challenge.challengerUserId, 'available');
  lobby.setStatus(challenge.targetUserId, 'available');
  io.to(challenge.challengerSocketId).emit('challenge_timeout', { targetUserId: challenge.targetUserId, targetName: challenge.targetName });
  io.to(challenge.targetSocketId).emit('challenge_timeout', { challengerUserId: challenge.challengerUserId, challengerName: challenge.challengerName });
  console.log(`Challenge ${challenge.challengerName} → ${challenge.targetName} timed out`);
});

async function fetchPlayerRating(userId: string): Promise<{ winRate: number; totalGames: number }> {
  if (!isSupabaseConfigured || !supabase) return { winRate: 0, totalGames: 0 };
  try {
    const { data } = await supabase
      .from('leaderboard')
      .select('win_rate, total_games')
      .eq('user_id', userId)
      .single();
    return { winRate: data?.win_rate ?? 0, totalGames: data?.total_games ?? 0 };
  } catch {
    return { winRate: 0, totalGames: 0 };
  }
}

// Generate unique room code
function generateRoomCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (rooms.has(code));

  return code;
}

// Make AI move
async function makeAIMove(roomCode: string): Promise<void> {
  const room = rooms.get(roomCode);
  if (!room || !room.isAIEnabled()) {
    return;
  }

  const currentPlayer = room.getCurrentPlayer();
  if (!currentPlayer || currentPlayer.socketId !== 'ai') {
    return;
  }

  // Get AI's move
  const aiMove = room.getAIMove();
  if (!aiMove) {
    console.log(`[${roomCode}] AI has no valid moves`);
    return;
  }

  const { row, col, value } = aiMove;
  console.log(`[${roomCode}] AI attempting move: row=${row}, col=${col}, value=${value}`);

  // Make the move
  const result = room.makeMove(currentPlayer.id, row, col, value);

  console.log(`[${roomCode}] AI move result: ${result.success ? 'CORRECT ✓' : 'WRONG ✗'}`);

  // Emit the board update
  io.to(roomCode).emit('board_update', {
    board: room.getBoard(),
    scores: room.getScores(),
    currentTurn: room.getCurrentPlayer()?.id,
    players: room.getPlayers(),
    revealedCell: result.revealedCell,
    turnTimeRemaining: TURN_TIME_LIMIT,
    lastMove: {
      playerId: currentPlayer.id,
      row,
      col,
      value,
      correct: result.success
    }
  });

  // Check if game is finished
  if (room.isGameFinished()) {
    const winner = room.getWinner();

    await room.getGameTracker().trackGameResult(winner, room.getScores(), room.isEarlyWin());

    io.to(roomCode).emit('game_end', {
      winner: winner,
      scores: room.getScores(),
      players: room.getPlayers(),
      earlyWin: room.isEarlyWin()
    });

    console.log(`[${roomCode}] Game finished`);
    return;
  }

  // If AI made a correct move, it continues playing
  if (result.success && room.getCurrentPlayer()?.socketId === 'ai') {
    setTimeout(() => {
      makeAIMove(roomCode);
    }, 1500);
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  // Clock sync: client sends its timestamp, server echoes it back with server time
  socket.on('ping_time', (data: { clientTime: number }) => {
    socket.emit('pong_time', { serverTime: Date.now(), clientTime: data.clientTime });
  });

  // ── Lobby events ────────────────────────────────────────────────────────────

  socket.on('join_lobby', async (data: { userId: string; name: string }) => {
    const { userId, name } = data;
    if (!userId) {
      socket.emit('lobby_error', { message: 'Authentication required to join lobby' });
      return;
    }

    // Add immediately with default stats so the player appears in the lobby right away
    // (avoids stale socket-ID window if the async DB call takes >0ms)
    lobby.add(socket.id, userId, name, 0, 0);
    console.log(`${name} joined lobby (${lobby.size()} online)`);

    // Fetch real stats and update asynchronously
    const { winRate, totalGames } = await fetchPlayerRating(userId);
    if (totalGames > 0) {
      lobby.updateStats(userId, winRate, totalGames);
    }
  });

  socket.on('leave_lobby', () => {
    const player = lobby.removeBySocket(socket.id);
    if (player) {
      console.log(`${player.name} left lobby (${lobby.size()} remaining)`);
    }
  });

  // Client reports 5-min inactivity → idle
  socket.on('set_idle', () => {
    lobby.setStatusBySocket(socket.id, 'idle');
  });

  // Client reports activity after idle
  socket.on('set_available', () => {
    lobby.setStatusBySocket(socket.id, 'available');
  });

  // ── Challenge events ─────────────────────────────────────────────────────

  socket.on('challenge_send', (data: { targetUserId: string }) => {
    const challengerUserId = lobby.getUserIdBySocket(socket.id);
    if (!challengerUserId) {
      socket.emit('challenge_error', { message: 'Not in lobby' });
      return;
    }

    const target = lobby.getPlayer(data.targetUserId);
    if (!target || target.status !== 'available') {
      socket.emit('challenge_error', { message: 'Player is not available' });
      return;
    }

    const challenger = lobby.getPlayer(challengerUserId)!;

    const sent = challengeManager.send({
      challengerUserId,
      challengerSocketId: socket.id,
      challengerName: challenger.name,
      targetUserId: data.targetUserId,
      targetSocketId: target.socketId,
      targetName: target.name,
    });

    if (!sent) {
      socket.emit('challenge_error', { message: 'A challenge is already in progress' });
      return;
    }

    lobby.setStatus(challengerUserId, 'pending');
    lobby.setStatus(data.targetUserId, 'pending');

    // Notify target
    io.to(target.socketId).emit('challenge_received', {
      challengerUserId,
      challengerName: challenger.name,
      challengerWinRate: challenger.winRate,
      challengerTotalGames: challenger.totalGames,
      timeoutSecs: CHALLENGE_TIMEOUT_SECS,
    });

    // Confirm to challenger
    socket.emit('challenge_sent', {
      targetUserId: data.targetUserId,
      targetName: target.name,
    });

    console.log(`${challenger.name} challenged ${target.name}`);
  });

  socket.on('challenge_accept', (data: { challengerUserId: string }) => {
    const targetUserId = lobby.getUserIdBySocket(socket.id);
    if (!targetUserId) return;

    const challenge = challengeManager.remove(data.challengerUserId, targetUserId);
    if (!challenge) {
      socket.emit('challenge_error', { message: 'Challenge not found or already expired' });
      return;
    }

    // Create a room for both players
    const roomCode = generateRoomCode();
    const room = new GameRoom(roomCode);

    room.addPlayer(challenge.challengerSocketId, challenge.challengerName, challenge.challengerUserId);
    room.addPlayer(challenge.targetSocketId, challenge.targetName, challenge.targetUserId);
    rooms.set(roomCode, room);
    socketToRoom.set(challenge.challengerSocketId, roomCode);
    socketToRoom.set(challenge.targetSocketId, roomCode);

    lobby.setStatus(challenge.challengerUserId, 'in_game');
    lobby.setStatus(targetUserId, 'in_game');

    // Both sockets join the socket.io room
    const challengerSocket = io.sockets.sockets.get(challenge.challengerSocketId);
    challengerSocket?.join(roomCode);
    socket.join(roomCode);

    console.log(`Challenge accepted: ${challenge.challengerName} vs ${challenge.targetName} → room ${roomCode}`);

    io.to(challenge.challengerSocketId).emit('room_created', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus(),
    });

    socket.emit('room_joined', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus(),
    });

    setTimeout(() => {
      room.startGame();
      io.to(roomCode).emit('game_start', {
        board: room.getBoard(),
        players: room.getPlayers(),
        currentTurn: room.getCurrentPlayer()?.id,
        scores: room.getScores(),
        turnStartTime: room.getTurnStartTime(),
      });
      console.log(`Challenge game started in room ${roomCode}`);
    }, 2000);
  });

  socket.on('challenge_decline', (data: { challengerUserId: string }) => {
    const targetUserId = lobby.getUserIdBySocket(socket.id);
    if (!targetUserId) return;

    const challenge = challengeManager.remove(data.challengerUserId, targetUserId);
    if (!challenge) return;

    lobby.setStatus(challenge.challengerUserId, 'available');
    lobby.setStatus(targetUserId, 'available');

    io.to(challenge.challengerSocketId).emit('challenge_declined', {
      targetUserId,
      targetName: challenge.targetName,
    });

    console.log(`${challenge.targetName} declined ${challenge.challengerName}'s challenge`);
  });

  socket.on('challenge_cancel', (data: { targetUserId: string }) => {
    const challengerUserId = lobby.getUserIdBySocket(socket.id);
    if (!challengerUserId) return;

    const challenge = challengeManager.remove(challengerUserId, data.targetUserId);
    if (!challenge) return;

    lobby.setStatus(challengerUserId, 'available');
    lobby.setStatus(data.targetUserId, 'available');

    io.to(challenge.targetSocketId).emit('challenge_cancelled', {
      challengerUserId,
      challengerName: challenge.challengerName,
    });

    console.log(`${challenge.challengerName} cancelled challenge to ${challenge.targetName}`);
  });

  // Create a new room
  socket.on('create_room', (data: { playerName: string; userId?: string | null }) => {
    const roomCode = generateRoomCode();
    const room = new GameRoom(roomCode);

    room.addPlayer(socket.id, data.playerName || 'Player 1', data.userId);
    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, roomCode);

    if (data.userId) lobby.setStatus(data.userId, 'in_game');

    socket.join(roomCode);

    console.log(`Room ${roomCode} created by ${socket.id}`);

    socket.emit('room_created', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus()
    });
  });

  // Create a new AI game
  socket.on('create_ai_game', (data: { playerName: string; difficulty?: 'beginner' | 'normal' | 'expert'; userId?: string | null }) => {
    const roomCode = generateRoomCode();
    const difficulty = data.difficulty || 'normal';
    const room = new GameRoom(roomCode, true, difficulty);

    room.addPlayer(socket.id, data.playerName || 'Player 1', data.userId);
    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, roomCode);

    if (data.userId) lobby.setStatus(data.userId, 'in_game');

    socket.join(roomCode);

    console.log(`AI game ${roomCode} created by ${socket.id}`);

    socket.emit('room_created', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus()
    });

    setTimeout(() => {
      if (room.getStatus() === 'waiting') {
        room.startGame();

        io.to(roomCode).emit('game_start', {
          board: room.getBoard(),
          players: room.getPlayers(),
          currentTurn: room.getCurrentPlayer()?.id,
          scores: room.getScores(),
          turnStartTime: room.getTurnStartTime()
        });

        console.log(`AI game ${roomCode} started`);

        const currentPlayer = room.getCurrentPlayer();
        if (currentPlayer?.socketId === 'ai') {
          setTimeout(() => {
            makeAIMove(roomCode);
          }, 1500);
        }
      }
    }, 2000);
  });

  // Join an existing room
  socket.on('join_room', (data: { roomCode: string; playerName: string; userId?: string | null }) => {
    const roomCode = data.roomCode.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.isFull()) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.addPlayer(socket.id, data.playerName || 'Player 2', data.userId);
    socketToRoom.set(socket.id, roomCode);

    if (data.userId) lobby.setStatus(data.userId, 'in_game');

    socket.join(roomCode);

    console.log(`${socket.id} joined room ${roomCode}`);

    socket.emit('room_joined', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus()
    });

    socket.to(roomCode).emit('player_joined', {
      players: room.getPlayers()
    });

    if (room.isFull()) {
      setTimeout(() => {
        room.startGame();

        io.to(roomCode).emit('game_start', {
          board: room.getBoard(),
          players: room.getPlayers(),
          currentTurn: room.getCurrentPlayer()?.id,
          scores: room.getScores(),
          turnStartTime: room.getTurnStartTime()
        });

        console.log(`Game started in room ${roomCode}`);
      }, 2000);
    }
  });

  // Handle timer expiry
  socket.on('time_expired', async () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room || room.getIsPaused()) return;

    const currentPlayer = room.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.socketId !== socket.id) {
      console.log(`Timer expired for ${socket.id} but it's not their turn`);
      return;
    }

    console.log(`Timer expired for ${currentPlayer.name} in room ${roomCode}`);

    const result = room.makeMove('system', -1, -1, -1);

    if (room.isGameFinished()) {
      const winner = room.getWinner();

      await room.getGameTracker().trackGameResult(winner, room.getScores(), room.isEarlyWin());

      io.to(roomCode).emit('game_end', {
        winner,
        scores: room.getScores(),
        players: room.getPlayers(),
        earlyWin: room.isEarlyWin()
      });
    } else {
      io.to(roomCode).emit('board_update', {
        board: room.getBoard(),
        scores: room.getScores(),
        currentTurn: room.getCurrentPlayer()?.id,
        players: room.getPlayers(),
        revealedCell: result.revealedCell,
        turnTimeRemaining: TURN_TIME_LIMIT,
        timerExpired: true
      });

      if (room.isAIEnabled()) {
        const nextPlayer = room.getCurrentPlayer();
        if (nextPlayer?.socketId === 'ai') {
          setTimeout(() => {
            makeAIMove(roomCode);
          }, 2000);
        }
      }
    }
  });

  // Handle game state request (for reconnection)
  socket.on('request_game_state', (data: { roomCode: string; playerId?: string }) => {
    const roomCode = data.roomCode.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    let player = room.getPlayerBySocketId(socket.id);
    let wasReconnection = false;

    if (!player && data.playerId) {
      player = room.getPlayerById(data.playerId);

      if (player && player.socketId !== 'ai') {
        const oldSocketId = player.socketId;
        player.socketId = socket.id;

        socketToRoom.delete(oldSocketId);
        socketToRoom.set(socket.id, roomCode);

        wasReconnection = true;
        console.log(`[${roomCode}] Player ${player.name} reconnected: ${oldSocketId} -> ${socket.id}`);
      }
    }

    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);

    socket.emit('game_state', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus(),
      currentTurn: room.getCurrentPlayer()?.id || null,
      scores: room.getScores(),
      turnTimeRemaining: Math.max(0, TURN_TIME_LIMIT - Math.floor((Date.now() - room.getTurnStartTime()) / 1000))
    });

    console.log(`[${roomCode}] Game state sent to ${socket.id}${player ? ` (${player.name})` : ''}`);

    if (wasReconnection && player) {
      // Cancel any pending forfeit countdown
      const forfeitTimer = forfeitTimers.get(roomCode);
      if (forfeitTimer) {
        clearTimeout(forfeitTimer);
        forfeitTimers.delete(roomCode);
        console.log(`[${roomCode}] Forfeit timer cancelled — ${player.name} reconnected`);
      }

      // Resume the game (resets turn start time)
      if (room.getIsPaused()) {
        room.resumeGame();
      }

      socket.to(roomCode).emit('game_resumed', {
        player: player,
        players: room.getPlayers(),
        turnTimeRemaining: TURN_TIME_LIMIT,
      });

      console.log(`[${roomCode}] ${player.name} reconnected — game resumed`);
    }
  });

  // Handle player move
  socket.on('make_move', async (data: { row: number; col: number; value: number }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const currentPlayer = room.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.socketId !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    const result = room.makeMove(player.id, data.row, data.col, data.value);

    console.log(
      `${player.name} made move at (${data.row},${data.col}) = ${data.value}: ${result.success ? 'CORRECT' : 'WRONG'}`
    );

    io.to(roomCode).emit('board_update', {
      board: room.getBoard(),
      scores: room.getScores(),
      currentTurn: room.getCurrentPlayer()?.id,
      players: room.getPlayers(),
      revealedCell: result.revealedCell,
      turnTimeRemaining: TURN_TIME_LIMIT,
      lastMove: {
        playerId: player.id,
        row: data.row,
        col: data.col,
        value: data.value,
        correct: result.success
      }
    });

    if (room.isGameFinished()) {
      const winner = room.getWinner();

      await room.getGameTracker().trackGameResult(winner, room.getScores(), room.isEarlyWin());

      io.to(roomCode).emit('game_end', {
        winner: winner,
        scores: room.getScores(),
        players: room.getPlayers(),
        earlyWin: room.isEarlyWin()
      });

      console.log(`Game ended in room ${roomCode}. Winner: ${winner?.name || 'TIE'}${room.isEarlyWin() ? ' (Early Win)' : ''}`);
    } else if (room.isAIEnabled()) {
      const nextPlayer = room.getCurrentPlayer();
      if (nextPlayer?.socketId === 'ai') {
        setTimeout(() => {
          makeAIMove(roomCode);
        }, 1500);
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Cancel any active challenges for this user
    const lobbyUserId = lobby.getUserIdBySocket(socket.id);
    if (lobbyUserId) {
      const cancelledChallenges = challengeManager.removeAllForUser(lobbyUserId);
      for (const ch of cancelledChallenges) {
        if (ch.challengerUserId === lobbyUserId) {
          // Challenger disconnected — notify target
          lobby.setStatus(ch.targetUserId, 'available');
          io.to(ch.targetSocketId).emit('challenge_cancelled', {
            challengerUserId: ch.challengerUserId,
            challengerName: ch.challengerName,
          });
        } else {
          // Target disconnected — treat as decline
          lobby.setStatus(ch.challengerUserId, 'available');
          io.to(ch.challengerSocketId).emit('challenge_declined', {
            targetUserId: ch.targetUserId,
            targetName: ch.targetName,
          });
        }
      }
    }

    // Remove from lobby if present
    const removedFromLobby = lobby.removeBySocket(socket.id);
    if (removedFromLobby) {
      console.log(`${removedFromLobby.name} removed from lobby on disconnect (${lobby.size()} remaining)`);
    }

    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);

      if (room) {
        const player = room.getPlayerBySocketId(socket.id);

        if (room.getStatus() !== 'playing') {
          const removedPlayer = room.removePlayer(socket.id);

          if (removedPlayer) {
            console.log(`${removedPlayer.name} left room ${roomCode}`);

            socket.to(roomCode).emit('player_left', {
              player: removedPlayer,
              players: room.getPlayers()
            });

            if (room.getPlayerCount() === 0) {
              rooms.delete(roomCode);
              clearRoomColors(roomCode);
              console.log(`Room ${roomCode} deleted (empty)`);
            }
          }

          socketToRoom.delete(socket.id);
        } else {
          if (player && player.socketId !== 'ai') {
            console.log(`${player.name} disconnected from room ${roomCode} — starting ${RECONNECT_TIMEOUT_SECS}s forfeit timer`);

            room.pauseGame();

            socket.to(roomCode).emit('game_paused', {
              disconnectedPlayer: player,
              reconnectDeadlineSecs: RECONNECT_TIMEOUT_SECS,
            });

            const forfeitTimer = setTimeout(async () => {
              forfeitTimers.delete(roomCode);
              const currentRoom = rooms.get(roomCode);
              if (!currentRoom || currentRoom.getStatus() === 'finished') return;

              currentRoom.forfeitPlayer(player.id);
              const winner = currentRoom.getWinner();

              await currentRoom.getGameTracker().trackGameResult(winner, currentRoom.getScores(), false);

              io.to(roomCode).emit('game_end', {
                winner,
                scores: currentRoom.getScores(),
                players: currentRoom.getPlayers(),
                forfeit: true,
                forfeitedPlayerId: player.id,
              });

              rooms.delete(roomCode);
              clearRoomColors(roomCode);
              console.log(`[${roomCode}] ${player.name} forfeited — game ended`);
            }, RECONNECT_TIMEOUT_SECS * 1000);

            forfeitTimers.set(roomCode, forfeitTimer);
          }
        }
      }
    }
  });
});

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), build: 'lobby-v3' });
});

// Database connectivity test
app.get('/test-db', async (_req, res) => {
  if (!isSupabaseConfigured || !supabase) {
    res.json({ status: 'not_configured' });
    return;
  }
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    res.json({ status: 'error', message: error.message, code: error.code });
  } else {
    res.json({ status: 'ok' });
  }
});
