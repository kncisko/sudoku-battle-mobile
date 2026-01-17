// Color scheme for player
export interface ColorScheme {
  primary: string       // Main color (e.g., 'blue', 'purple')
  bg: string           // Background color (e.g., 'bg-blue-100')
  bgDark: string       // Darker background (e.g., 'bg-blue-200')
  text: string         // Text color (e.g., 'text-blue-700')
  textDark: string     // Darker text (e.g., 'text-blue-900')
  ring: string         // Ring color (e.g., 'ring-blue-500')
  border: string       // Border color (e.g., 'border-blue-500')
  bgHex: string        // Hex color for background (e.g., '#3b82f6')
  bgDarkHex: string    // Hex color for darker background (e.g., '#2563eb')
  textHex: string      // Hex color for text (e.g., '#ffffff')
}

// Cell in the Sudoku board
export interface Cell {
  value: number | null        // 1-9 or null if empty
  locked: boolean              // True if cell is locked (can't be changed)
  lockedBy: string | null      // Player ID who locked this cell
  revealed: boolean            // True if revealed by wrong guess
  notes?: number[]             // Optional notes/pencil marks (1-9) for Classic Sudoku
}

// Player information
export interface Player {
  id: string
  name: string
  socketId: string
  colorScheme: ColorScheme
}

// Sudoku board state
export interface SudokuBoard {
  cells: Cell[][]              // 9x9 grid of cells
}

// Game room status
export type GameStatus = 'waiting' | 'playing' | 'finished'

// Complete game room state
export interface GameRoom {
  id: string                   // Room code
  players: Player[]            // Array of players (max 2)
  board: SudokuBoard          // Current board state
  solution: number[][]         // Complete solution (9x9)
  currentTurn: number          // Index of current player (0 or 1)
  gameStatus: GameStatus       // Current game status
  scores: Record<string, number>  // Player ID -> score (cells locked)
}

// Socket.IO event payloads
export interface WelcomeMessage {
  message: string
  timestamp: string
}

export interface BoardUpdatePayload {
  board: SudokuBoard
  scores: Record<string, number>
  currentTurn: number
}

export interface GameStartPayload {
  board: SudokuBoard
  players: Player[]
  currentTurn: number
}

export interface MakeMovePayload {
  row: number
  col: number
  value: number
}

export interface MoveResultPayload {
  success: boolean
  board: SudokuBoard
  scores: Record<string, number>
  currentTurn: number
  revealedCell?: { row: number; col: number }
}
