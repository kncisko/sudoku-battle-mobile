import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom.js';
import { clearRoomColors } from './game/ColorSchemes.js';
import { supabase, isSupabaseConfigured } from './lib/supabase.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS for Express
const corsOptions = {
  origin: [
    'http://localhost:5173', // Development (default Vite port)
    'http://localhost:5174', // Development (alternate port)
    'http://192.168.0.178:5173', // Local network development
    'https://sudoku-battle.kresimirnovak.eu' // Production
  ],
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: corsOptions
});

const PORT = process.env.PORT || 3000;
const TURN_TIME_LIMIT = 20; // seconds per turn — must match client

// Room management
const rooms = new Map<string, GameRoom>();
const socketToRoom = new Map<string, string>(); // Track which room each socket is in

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
    players: room.getPlayers(), // Include players for state sync
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

    // Track game result in Supabase (only PvP games)
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
    }, 1500); // Wait 1.5 seconds between AI moves
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Clock sync: client sends its timestamp, server echoes it back with server time
  socket.on('ping_time', (data: { clientTime: number }) => {
    socket.emit('pong_time', { serverTime: Date.now(), clientTime: data.clientTime });
  });

  // Create a new room
  socket.on('create_room', (data: { playerName: string; userId?: string | null }) => {
    const roomCode = generateRoomCode();
    const room = new GameRoom(roomCode);

    // Add player to room (pass userId for authenticated users)
    room.addPlayer(socket.id, data.playerName || 'Player 1', data.userId);
    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, roomCode);

    // Join the socket.io room
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
    const room = new GameRoom(roomCode, true, difficulty); // Enable AI with difficulty

    // Add player to room (AI will be added automatically, pass userId for authenticated users)
    room.addPlayer(socket.id, data.playerName || 'Player 1', data.userId);
    rooms.set(roomCode, room);
    socketToRoom.set(socket.id, roomCode);

    // Join the socket.io room
    socket.join(roomCode);

    console.log(`AI game ${roomCode} created by ${socket.id}`);

    socket.emit('room_created', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus()
    });

    // Start the game immediately (no waiting for second player)
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

        // If AI goes first, make its move after a short delay
        const currentPlayer = room.getCurrentPlayer();
        if (currentPlayer?.socketId === 'ai') {
          setTimeout(() => {
            makeAIMove(roomCode);
          }, 1500); // 1.5 second delay so human can see the board
        }
      }
    }, 2000); // 2 second delay before game start
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

    // Add player to room (pass userId for authenticated users)
    room.addPlayer(socket.id, data.playerName || 'Player 2', data.userId);
    socketToRoom.set(socket.id, roomCode);

    // Join the socket.io room
    socket.join(roomCode);

    console.log(`${socket.id} joined room ${roomCode}`);

    // Notify the player who joined
    socket.emit('room_joined', {
      roomCode,
      players: room.getPlayers(),
      board: room.getBoard(),
      gameStatus: room.getStatus()
    });

    // Notify other players in the room
    socket.to(roomCode).emit('player_joined', {
      players: room.getPlayers()
    });

    // If room is now full, start the game
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
      }, 2000); // 2 second delay for dramatic effect
    }
  });

  // Handle timer expiry (client-side timer reached 0)
  socket.on('time_expired', async () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) {
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      return;
    }

    // Verify it's actually this player's turn
    const currentPlayer = room.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.socketId !== socket.id) {
      console.log(`Timer expired for ${socket.id} but it's not their turn`);
      return;
    }

    console.log(`Timer expired for ${currentPlayer.name} in room ${roomCode}`);

    // Make an auto-move (reveal random cell and switch turn)
    const result = room.makeMove('system', -1, -1, -1);

    // Check if game ended
    if (room.isGameFinished()) {
      const winner = room.getWinner();

      // Track game result in Supabase (only PvP games)
      await room.getGameTracker().trackGameResult(winner, room.getScores(), room.isEarlyWin());

      io.to(roomCode).emit('game_end', {
        winner,
        scores: room.getScores(),
        players: room.getPlayers(),
        earlyWin: room.isEarlyWin()
      });
    } else {
      // Broadcast update
      io.to(roomCode).emit('board_update', {
        board: room.getBoard(),
        scores: room.getScores(),
        currentTurn: room.getCurrentPlayer()?.id,
        players: room.getPlayers(), // Include players for state sync
        revealedCell: result.revealedCell,
        turnTimeRemaining: TURN_TIME_LIMIT,
        timerExpired: true
      });

      // If it's now AI's turn, trigger AI move
      if (room.isAIEnabled()) {
        const nextPlayer = room.getCurrentPlayer();
        if (nextPlayer?.socketId === 'ai') {
          setTimeout(() => {
            makeAIMove(roomCode);
          }, 2000); // Wait 2 seconds after revealing cell
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

    // Try to match reconnecting player
    let player = room.getPlayerBySocketId(socket.id);
    let wasReconnection = false;

    if (!player && data.playerId) {
      // Player might be reconnecting with new socket ID
      // Try to find by player ID and update their socket ID
      player = room.getPlayerById(data.playerId);

      if (player && player.socketId !== 'ai') {
        // Update the player's socket ID
        const oldSocketId = player.socketId;
        player.socketId = socket.id;

        // Update socketToRoom mapping
        socketToRoom.delete(oldSocketId);
        socketToRoom.set(socket.id, roomCode);

        wasReconnection = true;
        console.log(`[${roomCode}] Player ${player.name} reconnected with new socket ID: ${oldSocketId} -> ${socket.id}`);
      }
    }

    // Ensure player is in the socket.io room
    socket.join(roomCode);
    socketToRoom.set(socket.id, roomCode);

    // Send complete game state to reconnecting player
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

    // Notify other players that this player reconnected
    if (wasReconnection && player) {
      socket.to(roomCode).emit('player_reconnected', {
        player: player,
        players: room.getPlayers()
      });
      console.log(`[${roomCode}] Notified other players that ${player.name} reconnected`);
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

    // Check if it's this player's turn
    const currentPlayer = room.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.socketId !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Get the player making the move
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Make the move
    const result = room.makeMove(player.id, data.row, data.col, data.value);

    console.log(
      `${player.name} made move at (${data.row},${data.col}) = ${data.value}: ${result.success ? 'CORRECT' : 'WRONG'}`
    );

    // Broadcast updated board to all players in the room
    io.to(roomCode).emit('board_update', {
      board: room.getBoard(),
      scores: room.getScores(),
      currentTurn: room.getCurrentPlayer()?.id,
      players: room.getPlayers(), // Include players for state sync
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

    // Check if game is finished
    if (room.isGameFinished()) {
      const winner = room.getWinner();

      // Track game result in Supabase (only PvP games)
      await room.getGameTracker().trackGameResult(winner, room.getScores(), room.isEarlyWin());

      io.to(roomCode).emit('game_end', {
        winner: winner,
        scores: room.getScores(),
        players: room.getPlayers(),
        earlyWin: room.isEarlyWin()
      });

      console.log(`Game ended in room ${roomCode}. Winner: ${winner?.name || 'TIE'}${room.isEarlyWin() ? ' (Early Win)' : ''}`);
    } else if (room.isAIEnabled()) {
      // If it's AI's turn, trigger AI move after a delay
      const nextPlayer = room.getCurrentPlayer();
      if (nextPlayer?.socketId === 'ai') {
        setTimeout(() => {
          makeAIMove(roomCode);
        }, 1500); // 1.5 second delay
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      const room = rooms.get(roomCode);

      if (room) {
        const player = room.getPlayerBySocketId(socket.id);

        // If game is not playing, remove player immediately
        // If game is playing, keep player in room to allow reconnection
        if (room.getStatus() !== 'playing') {
          const removedPlayer = room.removePlayer(socket.id);

          if (removedPlayer) {
            console.log(`${removedPlayer.name} left room ${roomCode}`);

            // Notify other players
            socket.to(roomCode).emit('player_left', {
              player: removedPlayer,
              players: room.getPlayers()
            });

            // If room is empty, delete it
            if (room.getPlayerCount() === 0) {
              rooms.delete(roomCode);
              clearRoomColors(roomCode);
              console.log(`Room ${roomCode} deleted (empty)`);
            }
          }

          socketToRoom.delete(socket.id);
        } else {
          // Game is playing - keep player in room but notify others they disconnected
          if (player && player.socketId !== 'ai') {
            console.log(`${player.name} disconnected from room ${roomCode} (keeping in room for reconnection)`);

            // Notify other players that this player disconnected (but may reconnect)
            socket.to(roomCode).emit('player_disconnected', {
              player: player,
              players: room.getPlayers()
            });
          }

          // Keep socketToRoom mapping for now (will be updated on reconnection)
        }
      }
    }
  });
});

// Basic health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database connectivity test - visit this URL to verify Supabase key is correct
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

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready for connections`);
});
