import { ref, computed } from 'vue'
import type { SudokuBoard, Player, GameStatus } from '../../../shared/types'
import { SudokuGenerator } from '../game/SudokuGenerator'
import { AIPlayer, AIDifficulty } from '../game/AIPlayer'

export function useOfflineGame() {
  const board = ref<SudokuBoard | null>(null)
  const solution = ref<number[][]>([])
  const players = ref<Player[]>([])
  const gameStatus = ref<GameStatus>('waiting')
  const currentTurn = ref<string | null>(null)
  const scores = ref<Record<string, number>>({})
  const revealedCell = ref<{ row: number; col: number } | null>(null)
  const lastLockedCell = ref<{ row: number; col: number } | null>(null)
  const winner = ref<Player | null>(null)
  const myPlayerId = ref<string | null>(null)
  const remainingTime = ref<number>(20)
  const earlyWin = ref<boolean>(false)

  let aiPlayer: AIPlayer | null = null
  let turnTimer: number | null = null
  const TURN_TIME_LIMIT = 20

  // Color schemes for players
  const colorSchemes = [
    {
      primary: 'orange',
      bg: 'bg-orange-500',
      bgDark: 'bg-orange-600',
      text: 'text-white',
      textDark: 'text-white',
      ring: 'ring-orange-500',
      border: 'border-orange-500',
      bgHex: '#FFA500',
      bgDarkHex: '#FF8C00',
      textHex: '#FFFFFF'
    },
    {
      primary: 'pink',
      bg: 'bg-pink-500',
      bgDark: 'bg-pink-600',
      text: 'text-white',
      textDark: 'text-white',
      ring: 'ring-pink-500',
      border: 'border-pink-500',
      bgHex: '#FF1493',
      bgDarkHex: '#C71585',
      textHex: '#FFFFFF'
    }
  ]

  const isMyTurn = computed(() => {
    if (!currentTurn.value || !myPlayerId.value) return false
    return myPlayerId.value === currentTurn.value
  })

  const clearTurnTimer = () => {
    if (turnTimer) {
      clearInterval(turnTimer)
      turnTimer = null
    }
  }

  const startTurnTimer = () => {
    clearTurnTimer()
    remainingTime.value = TURN_TIME_LIMIT

    turnTimer = window.setInterval(() => {
      remainingTime.value--

      if (remainingTime.value <= 0) {
        clearTurnTimer()
        handleTimeExpired()
      }
    }, 1000)
  }

  const handleTimeExpired = () => {
    if (!isMyTurn.value) return

    // Reveal a random cell and switch turn
    revealRandomCell()
    switchTurn()
  }

  const revealRandomCell = (): { row: number; col: number } | null => {
    if (!board.value || !solution.value) return null

    const emptyCells: Array<{ row: number; col: number }> = []

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!board.value.cells[row][col].locked) {
          emptyCells.push({ row, col })
        }
      }
    }

    if (emptyCells.length === 0) return null

    const randomIndex = Math.floor(Math.random() * emptyCells.length)
    const { row, col } = emptyCells[randomIndex]

    board.value.cells[row][col].value = solution.value[row][col]
    board.value.cells[row][col].locked = true
    board.value.cells[row][col].revealed = true
    board.value.cells[row][col].lockedBy = 'system'

    revealedCell.value = { row, col }

    return { row, col }
  }

  const switchTurn = () => {
    const currentPlayerIndex = players.value.findIndex(p => p.id === currentTurn.value)
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.value.length
    currentTurn.value = players.value[nextPlayerIndex].id

    // Only start timer for human player
    if (currentTurn.value !== 'ai_player') {
      startTurnTimer()
    } else {
      // For AI, just reset the display to 20 but don't start countdown
      remainingTime.value = TURN_TIME_LIMIT
    }

    // If it's AI's turn, make AI move after a delay
    if (currentTurn.value === 'ai_player') {
      setTimeout(() => {
        makeAIMove()
      }, 1500)
    }
  }

  const makeAIMove = () => {
    if (!aiPlayer || !board.value || !solution.value) return

    const move = aiPlayer.makeMove()
    if (!move) return

    const { row, col, value } = move
    const isCorrect = solution.value[row][col] === value

    if (isCorrect) {
      board.value.cells[row][col].value = value
      board.value.cells[row][col].locked = true
      board.value.cells[row][col].lockedBy = 'ai_player'
      scores.value['ai_player']++

      // Trigger flip animation for AI move
      lastLockedCell.value = { row, col }
      setTimeout(() => {
        lastLockedCell.value = null
      }, 800)

      aiPlayer.updateBoard(board.value.cells)

      if (checkGameFinished()) {
        endGame()
      } else {
        // AI continues if correct
        setTimeout(() => {
          makeAIMove()
        }, 1500)
      }
    } else {
      // Wrong guess - reveal random cell and switch turn
      revealRandomCell()
      aiPlayer.updateBoard(board.value.cells)

      if (checkGameFinished()) {
        endGame()
      } else {
        switchTurn()
      }
    }
  }

  const countRemainingCells = (): number => {
    if (!board.value) return 0

    let count = 0
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!board.value.cells[row][col].locked) {
          count++
        }
      }
    }
    return count
  }

  const checkEarlyWin = (): boolean => {
    if (players.value.length !== 2) return false

    const [player1, player2] = players.value
    const score1 = scores.value[player1.id] || 0
    const score2 = scores.value[player2.id] || 0
    const remainingCells = countRemainingCells()

    if (score1 > score2 + remainingCells) {
      earlyWin.value = true
      return true
    }

    if (score2 > score1 + remainingCells) {
      earlyWin.value = true
      return true
    }

    return false
  }

  const checkGameFinished = (): boolean => {
    if (!board.value) return false

    // Check for early win
    if (checkEarlyWin()) {
      return true
    }

    // Check if all cells are locked
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!board.value.cells[row][col].locked) {
          return false
        }
      }
    }

    return true
  }

  const endGame = () => {
    clearTurnTimer()
    gameStatus.value = 'finished'

    const [player1, player2] = players.value
    const score1 = scores.value[player1.id] || 0
    const score2 = scores.value[player2.id] || 0

    if (score1 > score2) {
      winner.value = player1
    } else if (score2 > score1) {
      winner.value = player2
    } else {
      winner.value = null // Tie
    }
  }

  const makeMove = (row: number, col: number, value: number) => {
    if (!isMyTurn.value || !board.value || !solution.value) return

    const isCorrect = solution.value[row][col] === value

    if (isCorrect) {
      board.value.cells[row][col].value = value
      board.value.cells[row][col].locked = true
      board.value.cells[row][col].lockedBy = myPlayerId.value
      scores.value[myPlayerId.value!]++

      // Trigger flip animation for player move
      lastLockedCell.value = { row, col }
      setTimeout(() => {
        lastLockedCell.value = null
      }, 800)

      if (aiPlayer) {
        aiPlayer.updateBoard(board.value.cells)
      }

      if (checkGameFinished()) {
        endGame()
      } else {
        // Player continues - restart timer
        startTurnTimer()
      }
    } else {
      // Wrong guess - reveal random cell and switch turn
      revealRandomCell()

      if (checkGameFinished()) {
        endGame()
      } else {
        switchTurn()
      }
    }
  }

  const startOfflineGame = (playerName: string, difficulty: AIDifficulty = 'normal') => {
    // Generate puzzle
    const puzzle = SudokuGenerator.generatePuzzle(0)
    board.value = puzzle.board
    solution.value = puzzle.solution

    // Create players
    const humanPlayerId = `player_${Date.now()}`
    myPlayerId.value = humanPlayerId

    players.value = [
      {
        id: humanPlayerId,
        name: playerName || 'You',
        socketId: 'offline',
        colorScheme: colorSchemes[0]
      },
      {
        id: 'ai_player',
        name: 'AI Opponent',
        socketId: 'ai',
        colorScheme: colorSchemes[1]
      }
    ]

    scores.value = {
      [humanPlayerId]: 0,
      'ai_player': 0
    }

    // Initialize AI
    aiPlayer = new AIPlayer(board.value.cells, difficulty)

    // Randomly choose who goes first
    const firstPlayerIndex = Math.floor(Math.random() * 2)
    currentTurn.value = players.value[firstPlayerIndex].id

    gameStatus.value = 'playing'

    // Start timer or AI move
    if (currentTurn.value === 'ai_player') {
      setTimeout(() => {
        makeAIMove()
      }, 1500)
    } else {
      startTurnTimer()
    }
  }

  const resetGame = () => {
    clearTurnTimer()
    board.value = null
    solution.value = []
    players.value = []
    gameStatus.value = 'waiting'
    currentTurn.value = null
    scores.value = {}
    revealedCell.value = null
    winner.value = null
    myPlayerId.value = null
    
    remainingTime.value = 20
    earlyWin.value = false
    aiPlayer = null
  }

  return {
    board,
    players,
    gameStatus,
    currentTurn,
    scores,
    revealedCell,
    lastLockedCell,
    winner,
    myPlayerId,
    remainingTime,
    earlyWin,
    isMyTurn,
    startOfflineGame,
    makeMove,
    resetGame
  }
}
