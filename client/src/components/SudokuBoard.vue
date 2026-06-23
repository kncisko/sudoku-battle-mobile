<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { SudokuBoard, Player } from '../../../shared/types'
import { NativeAudio } from '@capacitor-community/native-audio'
import { Capacitor } from '@capacitor/core'

interface Props {
  board: SudokuBoard | null
  isMyTurn: boolean
  revealedCell?: { row: number; col: number } | null
  lastLockedCell?: { row: number; col: number } | null
  players: Player[]
  isFinished?: boolean
  enableNotes?: boolean  // Enable notes mode for Classic Sudoku
  canUndo?: boolean      // Whether undo is available (Classic Sudoku)
}

const props = defineProps<Props>()

const emit = defineEmits<{
  makeMove: [row: number, col: number, value: number | null]
  toggleNote: [row: number, col: number, note: number]
  undo: []
  resetBoard: []
}>()

const selectedCell = ref<{ row: number; col: number } | null>(null)
const showNumberPad = ref(false)
const notesMode = ref(false)  // Toggle between notes and regular entry
const showResetConfirm = ref(false)  // Show reset confirmation dialog

// Native Audio IDs
const CLICK_SOUND_ID = 'click_sound'
const WINDUP_SOUND_ID = 'windup_sound'
const DING_SOUND_ID = 'ding_sound'

const isCapacitor = Capacitor.isNativePlatform()

onMounted(async () => {
  if (isCapacitor) {
    try {
      // Preload sound effects with NativeAudio
      await NativeAudio.preload({
        assetId: CLICK_SOUND_ID,
        assetPath: 'public/assets/soundfx/click.wav',
        audioChannelNum: 5,
        isUrl: false,
        volume: 0.3
      })

      await NativeAudio.preload({
        assetId: WINDUP_SOUND_ID,
        assetPath: 'public/assets/soundfx/AA_WindUp.wav',
        audioChannelNum: 2,
        isUrl: false,
        volume: 0.4
      })

      await NativeAudio.preload({
        assetId: DING_SOUND_ID,
        assetPath: 'public/assets/soundfx/ding.wav',
        audioChannelNum: 5,
        isUrl: false,
        volume: 0.5
      })
    } catch (error) {
      console.log('Sound effects preload error:', error)
    }
  }
})

onUnmounted(async () => {
  if (isCapacitor) {
    try {
      await NativeAudio.unload({ assetId: CLICK_SOUND_ID })
      await NativeAudio.unload({ assetId: WINDUP_SOUND_ID })
      await NativeAudio.unload({ assetId: DING_SOUND_ID })
    } catch (error) {
      console.log('Sound effects cleanup error:', error)
    }
  }
})

// Play click sound
const playClickSound = async () => {
  if (isCapacitor) {
    try {
      await NativeAudio.play({ assetId: CLICK_SOUND_ID })
    } catch (error) {
      // Ignore
    }
  }
}

// Play wind-up sound for tile flip
const playWindUpSound = async () => {
  if (isCapacitor) {
    try {
      await NativeAudio.play({ assetId: WINDUP_SOUND_ID })
    } catch (error) {
      // Ignore
    }
  }
}

// Play ding sound for correct guess
const playDingSound = async () => {
  if (isCapacitor) {
    try {
      await NativeAudio.play({ assetId: DING_SOUND_ID })
    } catch (error) {
      // Ignore
    }
  }
}

// Watch for revealed cell changes (wrong guess)
watch(() => props.revealedCell, (newCell) => {
  if (newCell) {
    playWindUpSound()
  }
})

// Watch for locked cell changes (correct move by anyone)
watch(() => props.lastLockedCell, (newCell) => {
  if (newCell) {
    playDingSound()
  }
})

// Helper to determine if a cell is on a section border (3x3 boxes)
const isRightBorder = (col: number) => (col + 1) % 3 === 0 && col < 8
const isBottomBorder = (row: number) => (row + 1) % 3 === 0 && row < 8

// Get cell background color based on who locked it
const getCellBgColor = (lockedBy: string | null, row: number, col: number): string => {
  // Highlight revealed cell with animation
  if (props.revealedCell && props.revealedCell.row === row && props.revealedCell.col === col) {
    return '#bbf7d0' // green-200
  }

  if (!lockedBy) return '#ffffff' // white - user can fill this
  if (lockedBy === 'system') return '#e5e7eb' // gray-200 - pre-filled, locked cell

  // Find the player who locked this cell
  const player = props.players.find(p => p.id === lockedBy)
  if (player) {
    return player.colorScheme.bgHex
  }

  return '#dbeafe' // blue-100 fallback
}

// Get cell animation class
const getCellAnimationClass = (row: number, col: number): string => {
  // Animate revealed cells (wrong guesses)
  if (props.revealedCell && props.revealedCell.row === row && props.revealedCell.col === col) {
    return 'flip-reveal'
  }
  // Animate locked cells (opponent moves)
  if (props.lastLockedCell && props.lastLockedCell.row === row && props.lastLockedCell.col === col) {
    return 'flip-reveal'
  }
  return ''
}

// Get text color based on who locked it
const getTextColor = (lockedBy: string | null, hasValue: boolean): string => {
  // User-entered values (not locked, but has value) - dark purple
  if (!lockedBy && hasValue) return '#5b21b6' // purple-900

  // Empty cells or pre-filled cells
  if (!lockedBy) return '#111827' // gray-900
  if (lockedBy === 'system') return '#111827' // gray-900 (pre-filled)

  // Find the player who locked this cell (multiplayer)
  const player = props.players.find(p => p.id === lockedBy)
  if (player) {
    return player.colorScheme.textHex
  }

  return '#111827' // gray-900 fallback
}

// Check if cell is selected
const isCellSelected = (row: number, col: number) => {
  return selectedCell.value?.row === row && selectedCell.value?.col === col
}

// Handle cell click
const handleCellClick = (row: number, col: number) => {
  // Disable all interactions when game is finished
  if (props.isFinished) return

  if (!props.board || !props.isMyTurn) return

  const cell = props.board.cells[row][col]

  // Can't select locked cells
  if (cell.locked) return

  // Play click sound
  playClickSound()

  selectedCell.value = { row, col }
  showNumberPad.value = true
}

// Handle number selection
const selectNumber = (value: number) => {
  if (!selectedCell.value) return

  const { row, col } = selectedCell.value

  if (notesMode.value && props.enableNotes) {
    // Toggle note mode
    emit('toggleNote', row, col, value)

    // Close keypad automatically
    selectedCell.value = null
    showNumberPad.value = false
  } else {
    // Regular move - let the result sound play (ding for correct, wind-up for wrong)
    emit('makeMove', row, col, value)

    // Clear selection
    selectedCell.value = null
    showNumberPad.value = false
  }
}

// Clear cell value and notes
const clearCell = () => {
  if (!selectedCell.value || !props.board) return

  const { row, col } = selectedCell.value

  // Clear both value and notes
  const cell = props.board.cells[row][col]
  if (cell.notes && cell.notes.length > 0) {
    // Clear notes
    cell.notes = []
  }

  // Clear value
  emit('makeMove', row, col, null)

  // Clear selection
  selectedCell.value = null
  showNumberPad.value = false
}

// Toggle notes mode
const toggleNotesMode = () => {
  if (props.enableNotes) {
    notesMode.value = !notesMode.value
    playClickSound()
  }
}

// Close number pad
const closeNumberPad = () => {
  selectedCell.value = null
  showNumberPad.value = false
}

// Undo last move - emit event to parent
const handleUndo = () => {
  playClickSound()
  emit('undo')
}

// Show reset confirmation dialog
const handleResetBoard = () => {
  playClickSound()
  showResetConfirm.value = true
}

// Confirm reset - actually reset the board
const confirmReset = () => {
  playClickSound()
  showResetConfirm.value = false
  emit('resetBoard')
}

// Cancel reset
const cancelReset = () => {
  playClickSound()
  showResetConfirm.value = false
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div v-if="!board" class="text-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--color-primary)"></div>
      <p class="mt-4" style="color: var(--color-text); opacity: 0.6">Generating puzzle...</p>
    </div>

    <div v-else class="board-container p-2 rounded-lg shadow-2xl" style="background-color: var(--color-base)">
      <!-- 9x9 Grid -->
      <div class="grid grid-cols-9 gap-0">
        <template v-for="(row, rowIndex) in board.cells" :key="`row-${rowIndex}`">
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            class="sudoku-cell relative flex items-center justify-center w-12 h-12 border border-gray-400 transition-all duration-200"
            :style="{
              '--cell-bg': getCellBgColor(cell.lockedBy, rowIndex, colIndex),
              '--cell-color': getTextColor(cell.lockedBy, cell.value !== null),
              backgroundColor: 'var(--cell-bg)',
              color: 'var(--cell-color)'
            }"
            :class="[
              getCellAnimationClass(rowIndex, colIndex),
              isRightBorder(colIndex) ? 'border-r-2 border-r-gray-800' : '',
              isBottomBorder(rowIndex) ? 'border-b-2 border-b-gray-800' : '',
              cell.locked ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-90',
              isCellSelected(rowIndex, colIndex) ? 'ring-2 ring-inset selected-cell' : ''
            ]"
            @click="handleCellClick(rowIndex, colIndex)"
          >
            <!-- Cell Value -->
            <span
              v-if="cell.value"
              class="text-xl font-bold select-none"
            >
              {{ cell.value }}
            </span>

            <!-- Notes (3x3 grid of small numbers) -->
            <div
              v-else-if="cell.notes && cell.notes.length > 0"
              class="notes-grid"
            >
              <span v-for="num in 9" :key="num" class="note-cell">
                {{ cell.notes.includes(num) ? num : '' }}
              </span>
            </div>

            <!-- Empty cell indicator -->
            <span
              v-else
              class="text-xs text-gray-300"
            >
              ·
            </span>

            <!-- Lock indicator -->
            <div
              v-if="cell.locked && cell.lockedBy !== 'system'"
              class="absolute top-0.5 right-0.5 w-2 h-2 rounded-full"
              :style="{ backgroundColor: getCellBgColor(cell.lockedBy, rowIndex, colIndex) }"
            ></div>
          </div>
        </template>
      </div>
    </div>

    <!-- Classic Sudoku Controls (Notes Toggle + Undo + Reset Board) -->
    <div v-if="enableNotes && !isFinished" class="classic-controls">
      <button
        @click="toggleNotesMode"
        class="control-btn notes-toggle-btn"
        :class="{ 'notes-active': notesMode }"
      >
        <span>✏️</span>
        <span>{{ notesMode ? 'Notes ON' : 'Notes OFF' }}</span>
      </button>

      <button
        @click="handleUndo"
        class="control-btn undo-btn"
        :class="{ 'btn-disabled': !canUndo }"
        :disabled="!canUndo"
      >
        <span>↩️</span>
        <span>Undo</span>
      </button>

      <button
        @click="handleResetBoard"
        class="control-btn reset-board-btn"
      >
        <span>🔄</span>
        <span>Reset</span>
      </button>
    </div>

    <!-- Number Pad -->
    <div
      v-if="showNumberPad"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeNumberPad"
    >
      <div
        class="number-pad-modal rounded-lg p-6 shadow-2xl"
        style="background-color: var(--color-surface)"
        @click.stop
      >
        <h3 class="text-lg font-bold mb-4 text-center" style="color: var(--color-text)">
          Select a number
        </h3>

        <div class="number-grid grid grid-cols-3 gap-3">
          <button
            v-for="num in 9"
            :key="num"
            @click="selectNumber(num)"
            class="number-button text-white text-2xl font-bold rounded-lg transition-colors"
            style="background-color: var(--color-primary)"
          >
            {{ num }}
          </button>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            @click="clearCell"
            class="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Clear
          </button>
          <button
            @click="closeNumberPad"
            class="flex-1 py-2 font-semibold rounded-lg transition-colors"
            style="background-color: var(--color-base); color: var(--color-text)"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <div
      v-if="showResetConfirm"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="cancelReset"
    >
      <div
        class="reset-confirm-modal rounded-lg p-6 shadow-2xl mx-4"
        style="background-color: var(--color-surface)"
        @click.stop
      >
        <h3 class="text-xl font-bold mb-2 text-center" style="color: var(--color-text)">
          Reset Board?
        </h3>
        <p class="text-center mb-6" style="color: var(--color-text); opacity: 0.7">
          This will clear all your entries and notes. This cannot be undone.
        </p>

        <div class="flex gap-3">
          <button
            @click="cancelReset"
            class="flex-1 py-3 font-semibold rounded-lg transition-colors"
            style="background-color: var(--color-base); color: var(--color-text)"
          >
            Cancel
          </button>
          <button
            @click="confirmReset"
            class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure crisp borders */
.grid > div:nth-child(9n+1) {
  border-left-width: 2px;
  border-left-color: var(--color-base);
}

.grid > div:nth-child(-n+9) {
  border-top-width: 2px;
  border-top-color: var(--color-base);
}

.selected-cell {
  --tw-ring-color: var(--color-primary);
}

/* Fix column width inconsistency on mobile - ensure all columns equal width and square tiles */
@media (max-width: 768px) {
  /* Make board expand to fill available width */
  .board-container {
    width: calc(100vw - 10px);
    max-width: calc(100vw - 10px);
  }

  .grid {
    grid-template-columns: repeat(9, 1fr);
    width: 100%;
  }

  .grid > div {
    width: 100%;
    height: auto;
    aspect-ratio: 1 / 1; /* Keep cells square */
    min-width: 0;
  }
}

/* 3D Flip Animation for revealed tiles */
@keyframes flip3d {
  0% {
    transform: perspective(400px) rotateY(0deg);
  }
  50% {
    transform: perspective(400px) rotateY(90deg);
  }
  100% {
    transform: perspective(400px) rotateY(0deg);
  }
}

.flip-reveal {
  animation: flip3d 0.8s ease-in-out;
  transform-style: preserve-3d;
}

/* Number pad responsive styling */
.number-button {
  width: 4rem; /* 64px */
  height: 4rem;
}

@media (max-width: 768px) {
  .number-pad-modal {
    max-width: calc(90vw - 20px);
    width: fit-content;
  }

  .number-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  .number-button {
    width: 3rem; /* 48px - smaller for mobile to fit 3 columns */
    height: 3rem;
    min-width: 3rem;
    max-width: 3rem;
    font-size: 1.25rem; /* Reduce font size proportionally */
  }
}

/* Notes grid - 3x3 layout inside cell */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  padding: 1px;
  gap: 0;
  box-sizing: border-box;
}

/* iOS-specific fix for notes grid alignment */
@supports (-webkit-touch-callout: none) {
  .notes-grid {
    padding: 0;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.note-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: #1f2937; /* gray-800 - darker for better visibility */
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  line-height: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .note-cell {
    font-size: 0.6rem; /* Larger on mobile for readability */
    line-height: 1;
  }
}

/* Classic controls container */
.classic-controls {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: stretch;
}

/* Base control button style */
.control-btn {
  padding: 0.6rem 0.75rem;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex: 1;
}

.control-btn:active:not(:disabled) {
  transform: scale(0.97);
}

/* Notes toggle button */
.notes-toggle-btn {
  background-color: var(--color-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.notes-toggle-btn.notes-active {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

/* Undo button */
.undo-btn {
  background-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.control-btn.btn-disabled {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
  box-shadow: 0 2px 8px rgba(156, 163, 175, 0.2);
  cursor: not-allowed;
  opacity: 0.5;
}

/* Reset board button */
.reset-board-btn {
  background-color: var(--color-accent);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Reset confirmation modal */
.reset-confirm-modal {
  max-width: 320px;
  width: 100%;
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalSlideIn {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
