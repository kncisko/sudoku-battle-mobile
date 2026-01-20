import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { SudokuBoard, Player, GameStatus } from '../../../shared/types'
import { playTickSound } from './useTickSound'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

console.log('🔌 Socket.IO connecting to:', SERVER_URL)
console.log('Environment:', import.meta.env.MODE)
console.log('VITE_SERVER_URL:', import.meta.env.VITE_SERVER_URL)

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'error'
export type MoveStatus = 'idle' | 'submitting' | 'acknowledged'

export function useSocket() {
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const connectionAttempts = ref(0)
  const board = ref<SudokuBoard | null>(null)
  const roomCode = ref<string | null>(null)
  const players = ref<Player[]>([])
  const gameStatus = ref<GameStatus>('waiting')
  const currentTurn = ref<string | null>(null)
  const scores = ref<Record<string, number>>({})
  const error = ref<string | null>(null)
  const gameStarting = ref(false)
  const revealedCell = ref<{ row: number; col: number } | null>(null)
  const lastLockedCell = ref<{ row: number; col: number } | null>(null)
  const winner = ref<Player | null>(null)
  const myPlayerId = ref<string | null>(null)
  const remainingTime = ref<number>(20)
  const earlyWin = ref<boolean>(false)
  const moveStatus = ref<MoveStatus>('idle')
  const moveSubmittedAt = ref<number>(0)
  const lastMoveLatency = ref<number>(0)
  const isSlowConnection = ref(false)
  const gameStartTime = ref<number | null>(null)

  // LocalStorage key for game state backup
  const GAME_STATE_KEY = 'sudoku_battle_game_state'

  // Save game state to localStorage
  const saveGameState = () => {
    if (roomCode.value && gameStatus.value === 'playing') {
      const gameState = {
        roomCode: roomCode.value,
        myPlayerId: myPlayerId.value,
        board: board.value,
        players: players.value,
        currentTurn: currentTurn.value,
        scores: scores.value,
        gameStatus: gameStatus.value,
        timestamp: Date.now()
      }
      try {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState))
      } catch (e) {
        console.warn('Failed to save game state to localStorage:', e)
      }
    }
  }

  // Load game state from localStorage
  const loadGameState = () => {
    try {
      const saved = localStorage.getItem(GAME_STATE_KEY)
      if (saved) {
        const gameState = JSON.parse(saved)
        // Only restore if saved within last 30 minutes
        if (Date.now() - gameState.timestamp < 30 * 60 * 1000) {
          return gameState
        }
      }
    } catch (e) {
      console.warn('Failed to load game state from localStorage:', e)
    }
    return null
  }

  // Clear game state from localStorage
  const clearGameState = () => {
    try {
      localStorage.removeItem(GAME_STATE_KEY)
    } catch (e) {
      console.warn('Failed to clear game state from localStorage:', e)
    }
  }

  // Client-side timer management
  let turnTimer: number | null = null
  const TURN_TIME_LIMIT = 20 // seconds per turn (Easy: 30s, Normal: 20s, Evil: 10s)
  let turnStartTimestamp: number = 0 // Server timestamp when turn started

  // Start the turn timer (countdown from TURN_TIME_LIMIT seconds)
  const startTurnTimer = (serverTimestamp?: number) => {
    // Clear any existing timer
    clearTurnTimer()

    // Store the server timestamp
    if (serverTimestamp) {
      turnStartTimestamp = serverTimestamp
    }

    // Calculate initial remaining time based on server timestamp
    const elapsed = serverTimestamp ? Math.floor((Date.now() - serverTimestamp) / 1000) : 0
    remainingTime.value = Math.max(0, TURN_TIME_LIMIT - elapsed)

    // Start countdown
    turnTimer = window.setInterval(() => {
      // Calculate remaining time from server timestamp
      const elapsedSeconds = Math.floor((Date.now() - turnStartTimestamp) / 1000)
      remainingTime.value = Math.max(0, TURN_TIME_LIMIT - elapsedSeconds)

      // Play tick sound during last 5 seconds
      if (remainingTime.value > 0 && remainingTime.value <= 5) {
        playTickSound()
      }

      // When timer reaches 0, emit time_expired event (only if it's my turn)
      if (remainingTime.value <= 0) {
        clearTurnTimer()
        // Only emit time_expired if it's actually my turn
        if (socket.value && currentTurn.value === myPlayerId.value) {
          console.log('Timer expired, emitting time_expired event')
          socket.value.emit('time_expired')
        }
      }
    }, 1000) // Update every second
  }

  // Clear the turn timer
  const clearTurnTimer = () => {
    if (turnTimer) {
      clearInterval(turnTimer)
      turnTimer = null
    }
  }

  onMounted(() => {
    // Try to restore game from localStorage first
    const savedGame = loadGameState()
    if (savedGame) {
      console.log('📁 Found saved game state, will attempt to restore')
      roomCode.value = savedGame.roomCode
      myPlayerId.value = savedGame.myPlayerId
    }

    // Create socket connection with enhanced reliability settings
    socket.value = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Never stop trying to reconnect
      timeout: 20000, // Increased timeout
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      upgrade: true,
      rememberUpgrade: true
    })

    // Connection event handlers
    socket.value.on('connect', () => {
      console.log('✅ Connected to server')
      isConnected.value = true
      connectionStatus.value = 'connected'
      connectionAttempts.value = 0
      error.value = null // Clear any connection errors on successful connection

      // If we were in a room and just reconnected, request game state
      // This handles manual reconnection (socket.connect()) as well as automatic reconnection
      if (roomCode.value && myPlayerId.value) {
        console.log(`🔄 Reconnected - requesting game state for room ${roomCode.value}`)
        socket.value?.emit('request_game_state', {
          roomCode: roomCode.value,
          playerId: myPlayerId.value
        })
      }
    })

    socket.value.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
      isConnected.value = false
      connectionStatus.value = 'disconnected'
    })

    socket.value.on('connect_error', (error) => {
      console.log('⚠️ Connection error:', error.message)
      isConnected.value = false
      connectionStatus.value = 'error'
    })

    socket.value.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`)
      connectionStatus.value = 'reconnecting'
      connectionAttempts.value = attemptNumber
      error.value = null // Clear error during reconnection attempts
    })

    socket.value.on('reconnect_failed', () => {
      console.log('❌ Reconnection failed')
      isConnected.value = false
      connectionStatus.value = 'error'
    })

    // Handle full game state restoration (after reconnect)
    socket.value.on('game_state', (data: {
      roomCode: string
      players: Player[]
      board: SudokuBoard
      gameStatus: GameStatus
      currentTurn: string | null
      scores: Record<string, number>
      turnStartTime?: number
    }) => {
      console.log('📦 Game state restored')

      // Restore all state
      roomCode.value = data.roomCode
      players.value = data.players
      board.value = data.board
      gameStatus.value = data.gameStatus
      currentTurn.value = data.currentTurn
      scores.value = data.scores

      // Find our new player ID (socket ID changed after reconnect)
      const myPlayer = data.players.find(p => p.socketId === socket.value?.id)
      if (myPlayer) {
        myPlayerId.value = myPlayer.id
        console.log('✅ Reconnection successful - resuming game')
      } else {
        console.error('❌ Could not find player in room after reconnect')
      }

      // Restart timer if game is playing
      if (data.gameStatus === 'playing' && data.turnStartTime) {
        startTurnTimer(data.turnStartTime)
      }

      // Save restored game state to localStorage
      saveGameState()
    })

    // Room created
    socket.value.on('room_created', (data: {
      roomCode: string
      players: Player[]
      board: SudokuBoard
      gameStatus: GameStatus
    }) => {
      console.log('Room created:', data)
      console.log('Players with color schemes:', data.players.map(p => ({ name: p.name, colorScheme: p.colorScheme })))
      roomCode.value = data.roomCode
      players.value = data.players
      board.value = data.board
      gameStatus.value = data.gameStatus
      error.value = null

      // Find our player ID
      const myPlayer = data.players.find(p => p.socketId === socket.value?.id)
      if (myPlayer) {
        myPlayerId.value = myPlayer.id
        console.log('My player ID:', myPlayerId.value)
      }
    })

    // Room joined
    socket.value.on('room_joined', (data: {
      roomCode: string
      players: Player[]
      board: SudokuBoard
      gameStatus: GameStatus
    }) => {
      console.log('Room joined:', data)
      console.log('Players with color schemes:', data.players.map(p => ({ name: p.name, colorScheme: p.colorScheme })))
      roomCode.value = data.roomCode
      players.value = data.players
      board.value = data.board
      gameStatus.value = data.gameStatus
      error.value = null

      // Find our player ID
      const myPlayer = data.players.find(p => p.socketId === socket.value?.id)
      if (myPlayer) {
        myPlayerId.value = myPlayer.id
        console.log('My player ID:', myPlayerId.value)
      }
    })

    // Player joined
    socket.value.on('player_joined', (data: { players: Player[] }) => {
      console.log('Player joined:', data)
      players.value = data.players
    })

    // Player left
    socket.value.on('player_left', (data: { player: Player; players: Player[] }) => {
      console.log('Player left:', data)
      players.value = data.players
    })

    // Player disconnected (during game - may reconnect)
    socket.value.on('player_disconnected', (data: { player: Player; players: Player[] }) => {
      console.log('Player disconnected (may reconnect):', data.player.name)
      // Don't update players array - they're still in the game, just disconnected
    })

    // Player reconnected
    socket.value.on('player_reconnected', (data: { player: Player; players: Player[] }) => {
      console.log('Player reconnected:', data.player.name)
      players.value = data.players
    })

    // Game starting
    socket.value.on('game_start', (data: {
      board: SudokuBoard
      players: Player[]
      currentTurn: string
      scores: Record<string, number>
      turnStartTime?: number
    }) => {
      console.log('Game starting:', data)

      // Record when the game started
      gameStartTime.value = Date.now()

      // Set game state immediately (don't wait for animation)
      board.value = data.board
      players.value = data.players
      currentTurn.value = data.currentTurn
      scores.value = data.scores

      // Show "game starting" animation
      gameStarting.value = true

      setTimeout(() => {
        // Hide animation and mark as playing
        gameStatus.value = 'playing'
        gameStarting.value = false

        // Start timer fresh at 20 seconds after animation completes
        startTurnTimer(Date.now())
      }, 2000)
    })

    // Board update (after a move)
    socket.value.on('board_update', (data: {
      board: SudokuBoard
      scores: Record<string, number>
      currentTurn: string
      players?: Player[]
      revealedCell?: { row: number; col: number }
      timerExpired?: boolean
      turnStartTime?: number
      lastMove?: {
        playerId: string
        row: number
        col: number
        value: number
        correct: boolean
      }
    }) => {
      console.log('Board updated:', data)

      // Calculate move latency and acknowledge only if this was our move
      if (moveStatus.value === 'submitting' && data.lastMove?.playerId === myPlayerId.value) {
        const latency = Date.now() - moveSubmittedAt.value
        lastMoveLatency.value = latency
        console.log(`Move latency: ${latency}ms`)

        // Consider connection slow if latency > 1000ms
        isSlowConnection.value = latency > 1000

        // Acknowledge move completion (only for our moves)
        moveStatus.value = 'acknowledged'
        setTimeout(() => {
          moveStatus.value = 'idle'
        }, 500)
      }

      // Update players if included (for state synchronization)
      if (data.players) {
        players.value = data.players
      }

      // Use lastMove from server instead of scanning all cells
      if (data.lastMove && data.lastMove.correct) {
        lastLockedCell.value = { row: data.lastMove.row, col: data.lastMove.col }

        // Clear the animation after it completes
        setTimeout(() => {
          lastLockedCell.value = null
        }, 800) // Match animation duration
      }

      board.value = data.board
      scores.value = data.scores
      currentTurn.value = data.currentTurn

      // Save updated game state to localStorage
      saveGameState()

      // Handle revealed cell with animation
      if (data.revealedCell) {
        revealedCell.value = data.revealedCell

        // Clear the revealed cell highlight after animation
        setTimeout(() => {
          revealedCell.value = null
        }, 2000)
      }

      // Always start the timer for the current turn
      // Both players see the timer running synchronized to server time
      console.log('Turn switched - starting timer for all players to see')
      startTurnTimer(data.turnStartTime)
    })

    // Game end
    socket.value.on('game_end', (data: {
      winner: Player | null
      scores: Record<string, number>
      players: Player[]
      earlyWin?: boolean
    }) => {
      console.log('Game ended:', data)
      gameStatus.value = 'finished'
      winner.value = data.winner
      scores.value = data.scores
      earlyWin.value = data.earlyWin || false

      // Clear timer when game ends
      clearTurnTimer()

      // Clear saved game state from localStorage
      clearGameState()
    })

    // Error
    socket.value.on('error', (data: { message: string }) => {
      console.error('Error from server:', data)
      error.value = data.message
    })

    socket.value.on('connect_error', (err) => {
      console.error('Connection error:', err)
      error.value = 'Failed to connect to server'
    })
  })

  onUnmounted(() => {
    // Clear timer when component unmounts
    clearTurnTimer()

    if (socket.value) {
      socket.value.disconnect()
    }
  })

  // Actions
  const createRoom = (playerName: string, userId?: string | null) => {
    if (socket.value) {
      socket.value.emit('create_room', { playerName, userId: userId || null })
    }
  }

  const createAIGame = (playerName: string, difficulty: 'beginner' | 'normal' | 'expert' = 'normal', userId?: string | null) => {
    console.log('createAIGame called with playerName:', playerName, 'difficulty:', difficulty)
    if (socket.value) {
      console.log('Emitting create_ai_game event to server')
      socket.value.emit('create_ai_game', { playerName, difficulty, userId: userId || null })
    } else {
      console.error('Socket is not connected!')
    }
  }

  const joinRoom = (code: string, playerName: string, userId?: string | null) => {
    if (socket.value) {
      socket.value.emit('join_room', { roomCode: code, playerName, userId: userId || null })
    }
  }

  const makeMove = (row: number, col: number, value: number) => {
    if (socket.value) {
      moveStatus.value = 'submitting'
      moveSubmittedAt.value = Date.now()
      socket.value.emit('make_move', { row, col, value })

      // Safety timeout: reset move status if no response after 10 seconds
      setTimeout(() => {
        if (moveStatus.value === 'submitting') {
          console.warn('Move submission timeout - resetting status')
          moveStatus.value = 'idle'
        }
      }, 10000)
    }
  }

  const resetGame = () => {
    // Clear turn timer
    if (turnTimer) {
      clearInterval(turnTimer)
      turnTimer = null
    }

    // Reset all game state
    roomCode.value = null
    error.value = null
    board.value = null
    players.value = []
    gameStatus.value = 'waiting'
    currentTurn.value = null
    scores.value = {}
    winner.value = null
    myPlayerId.value = null
    remainingTime.value = 20
    earlyWin.value = false
    revealedCell.value = null
    lastLockedCell.value = null
    gameStartTime.value = null

    // Clear saved game state from localStorage
    clearGameState()
  }

  return {
    socket,
    isConnected,
    connectionStatus,
    connectionAttempts,
    board,
    roomCode,
    players,
    gameStatus,
    currentTurn,
    scores,
    error,
    gameStarting,
    revealedCell,
    lastLockedCell,
    winner,
    myPlayerId,
    remainingTime,
    earlyWin,
    moveStatus,
    lastMoveLatency,
    isSlowConnection,
    gameStartTime,
    createRoom,
    createAIGame,
    joinRoom,
    makeMove,
    resetGame
  }
}
