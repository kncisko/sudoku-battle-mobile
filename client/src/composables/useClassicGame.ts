import { ref, computed, onUnmounted } from 'vue'
import { SudokuGenerator } from '../game/SudokuGenerator'
import type { SudokuBoard } from '../../../shared/types'

type Difficulty = 'easy' | 'medium' | 'hard'

// Difficulty settings: number of pre-filled cells
const DIFFICULTY_CONFIG = {
  easy: 45,    // 45 cells pre-filled (easier)
  medium: 32,  // 32 cells pre-filled
  hard: 26     // 26 cells pre-filled (harder)
}

// Undo system constants
const MAX_UNDO_STEPS = 50

// Undo entry - stores the previous state of a cell before a change
interface UndoEntry {
  row: number
  col: number
  previousValue: number | null
  previousNotes: number[]
}

export function useClassicGame() {
  const board = ref<SudokuBoard | null>(null)
  const solution = ref<number[][] | null>(null)
  const difficulty = ref<Difficulty | null>(null)
  const startTime = ref<number>(0)
  const isPlaying = ref(false)
  const isCompleted = ref(false)
  const currentTime = ref<number>(0) // For triggering reactivity
  const undoStack = ref<UndoEntry[]>([]) // Undo history stack

  let timerInterval: NodeJS.Timeout | null = null

  // Start a new game with selected difficulty
  const startGame = (selectedDifficulty: Difficulty) => {
    console.log('🎮 Starting Classic Sudoku game:', selectedDifficulty)

    difficulty.value = selectedDifficulty
    const preFillCount = DIFFICULTY_CONFIG[selectedDifficulty]

    // Generate puzzle with appropriate difficulty
    const puzzle = SudokuGenerator.generatePuzzle(preFillCount)

    board.value = puzzle.board
    solution.value = puzzle.solution
    startTime.value = Date.now()
    currentTime.value = Date.now()
    isPlaying.value = true
    isCompleted.value = false
    undoStack.value = [] // Clear undo stack for new game

    console.log('✅ Puzzle generated:', {
      difficulty: selectedDifficulty,
      preFilled: preFillCount,
      boardReady: !!board.value
    })

    // Start timer to update elapsed time every second
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      if (isPlaying.value && !isCompleted.value) {
        currentTime.value = Date.now()
      }
    }, 1000)

    // TODO: Save to localStorage for resume capability
  }

  // Push current cell state to undo stack before modifying
  const pushToUndoStack = (row: number, col: number) => {
    if (!board.value) return

    const cell = board.value.cells[row][col]

    // Store the current state before the change
    const entry: UndoEntry = {
      row,
      col,
      previousValue: cell.value,
      previousNotes: cell.notes ? [...cell.notes] : []
    }

    // Add to stack, remove oldest if at max capacity
    undoStack.value.push(entry)
    if (undoStack.value.length > MAX_UNDO_STEPS) {
      undoStack.value.shift()
    }
  }

  // Make a move
  const makeMove = (row: number, col: number, value: number | null) => {
    if (!board.value || !solution.value || !isPlaying.value) return

    const cell = board.value.cells[row][col]

    // Can't modify locked cells
    if (cell.locked) return

    // Save current state to undo stack before making the change
    pushToUndoStack(row, col)

    // Update cell by creating a new object to ensure Vue reactivity detects the change
    board.value.cells[row][col] = {
      ...cell,
      value: value,
      notes: value !== null ? [] : (cell.notes || [])
    }

    // Check if puzzle is completed (only validate when all cells are filled)
    checkCompletion()
  }

  // Toggle a note in a cell
  const toggleNote = (row: number, col: number, note: number) => {
    if (!board.value || !isPlaying.value) return

    const cell = board.value.cells[row][col]

    // Can't modify locked cells
    if (cell.locked) return

    // Save current state to undo stack before making the change
    pushToUndoStack(row, col)

    // Get current notes or initialize empty array
    const currentNotes = cell.notes ? [...cell.notes] : []

    // Toggle the note
    const index = currentNotes.indexOf(note)
    if (index > -1) {
      // Note exists, remove it
      currentNotes.splice(index, 1)
    } else {
      // Note doesn't exist, add it
      currentNotes.push(note)
      currentNotes.sort() // Keep notes sorted
    }

    // Update cell by creating a new object to ensure Vue reactivity
    board.value.cells[row][col] = {
      ...cell,
      notes: currentNotes
    }
  }

  // Undo the last move
  const undo = () => {
    if (!board.value || !isPlaying.value || undoStack.value.length === 0) return

    // Pop the last entry from the stack
    const entry = undoStack.value.pop()
    if (!entry) return

    const cell = board.value.cells[entry.row][entry.col]

    // Restore the previous state
    board.value.cells[entry.row][entry.col] = {
      ...cell,
      value: entry.previousValue,
      notes: entry.previousNotes
    }
  }

  // Check if undo is available
  const canUndo = computed(() => undoStack.value.length > 0)

  // Validate if the board follows Sudoku rules
  const isValidSudoku = (): boolean => {
    if (!board.value) return false

    // Check rows
    for (let row = 0; row < 9; row++) {
      const seen = new Set<number>()
      for (let col = 0; col < 9; col++) {
        const val = board.value.cells[row][col].value
        if (val === null || seen.has(val)) return false
        seen.add(val)
      }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const seen = new Set<number>()
      for (let row = 0; row < 9; row++) {
        const val = board.value.cells[row][col].value
        if (val === null || seen.has(val)) return false
        seen.add(val)
      }
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Set<number>()
        for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
          for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
            const val = board.value.cells[row][col].value
            if (val === null || seen.has(val)) return false
            seen.add(val)
          }
        }
      }
    }

    return true
  }

  // Check if puzzle is solved (only when all cells are filled)
  const checkCompletion = () => {
    if (!board.value) return

    // Check if all cells are filled first
    let allFilled = true

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cellValue = board.value.cells[row][col].value

        if (cellValue === null) {
          allFilled = false
          break
        }
      }
      if (!allFilled) break
    }

    // Only validate if all cells are filled
    if (allFilled) {
      // Validate against Sudoku rules instead of comparing to specific solution
      if (isValidSudoku()) {
        isCompleted.value = true
        isPlaying.value = false
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
        const elapsed = Date.now() - startTime.value
        console.log('🎉 Puzzle completed!', {
          time: Math.floor(elapsed / 1000) + 's'
        })
      } else {
        // Silent failure - no feedback, user must find their own mistakes
        console.log('❌ Solution contains errors - check for duplicates in rows, columns, or 3x3 boxes')
      }
    }
  }

  // Get elapsed time in seconds (uses currentTime for reactivity)
  const elapsedTime = computed(() => {
    if (!startTime.value) return 0
    // Use currentTime to trigger reactivity
    const now = isPlaying.value ? currentTime.value : Date.now()
    return Math.floor((now - startTime.value) / 1000)
  })

  // Reset board (clear user entries, keep same puzzle)
  const resetBoard = () => {
    if (!board.value || !isPlaying.value) return

    console.log('🔄 Resetting board - clearing all user entries')

    // Clear undo stack since we're resetting the board
    undoStack.value = []

    // Clear all non-locked cells (user entries) and their notes
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = board.value.cells[row][col]

        // Only clear cells that are not locked (system pre-filled)
        if (!cell.locked) {
          // Create new cell object to ensure Vue reactivity
          board.value.cells[row][col] = {
            ...cell,
            value: null,
            notes: []
          }
        }
      }
    }
  }

  // Reset game
  const resetGame = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    board.value = null
    solution.value = null
    difficulty.value = null
    startTime.value = 0
    currentTime.value = 0
    isPlaying.value = false
    isCompleted.value = false
    undoStack.value = []
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  })

  return {
    board,
    solution,
    difficulty,
    isPlaying,
    isCompleted,
    elapsedTime,
    canUndo,
    startGame,
    makeMove,
    toggleNote,
    undo,
    resetBoard,
    resetGame
  }
}
