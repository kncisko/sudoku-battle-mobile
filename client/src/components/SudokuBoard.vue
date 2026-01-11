<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { SudokuBoard, Player } from '../../../shared/types'
import clickSoundUrl from '../../assets/soundfx/click.wav?url'
import windUpSoundUrl from '../../assets/soundfx/AA_WindUp.wav?url'
import dingSoundUrl from '../../assets/soundfx/ding.wav?url'

interface Props {
  board: SudokuBoard | null
  isMyTurn: boolean
  revealedCell?: { row: number; col: number } | null
  lastLockedCell?: { row: number; col: number } | null
  players: Player[]
  isFinished?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  makeMove: [row: number, col: number, value: number]
}>()

const selectedCell = ref<{ row: number; col: number } | null>(null)
const showNumberPad = ref(false)

// Audio for click sound
const clickSound = ref<HTMLAudioElement | null>(null)
const windUpSound = ref<HTMLAudioElement | null>(null)
const dingSound = ref<HTMLAudioElement | null>(null)

onMounted(() => {
  // Initialize click sound
  clickSound.value = new Audio(clickSoundUrl)
  clickSound.value.volume = 0.3 // Subtle volume

  // Initialize wind-up sound for tile flip (wrong guess)
  windUpSound.value = new Audio(windUpSoundUrl)
  windUpSound.value.volume = 0.4 // Slightly louder for effect

  // Initialize ding sound for correct guess
  dingSound.value = new Audio(dingSoundUrl)
  dingSound.value.volume = 0.5 // Clear and audible
})

// Play click sound
const playClickSound = () => {
  if (clickSound.value) {
    clickSound.value.currentTime = 0 // Reset to start for rapid clicks
    clickSound.value.play().catch(() => {
      // Ignore autoplay errors (browser restrictions)
    })
  }
}

// Play wind-up sound for tile flip
const playWindUpSound = () => {
  if (windUpSound.value) {
    windUpSound.value.currentTime = 0
    windUpSound.value.play().catch(() => {
      // Ignore autoplay errors (browser restrictions)
    })
  }
}

// Play ding sound for correct guess
const playDingSound = () => {
  if (dingSound.value) {
    dingSound.value.currentTime = 0
    dingSound.value.play().catch(() => {
      // Ignore autoplay errors (browser restrictions)
    })
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

  if (!lockedBy) return '#ffffff' // white
  if (lockedBy === 'system') return '#f3f4f6' // gray-100

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
const getTextColor = (lockedBy: string | null): string => {
  if (!lockedBy) return '#111827' // gray-900
  if (lockedBy === 'system') return '#111827' // gray-900

  // Find the player who locked this cell
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

  // Don't play click here - let the result sound play (ding for correct, wind-up for wrong)

  emit('makeMove', selectedCell.value.row, selectedCell.value.col, value)

  // Clear selection
  selectedCell.value = null
  showNumberPad.value = false
}

// Close number pad
const closeNumberPad = () => {
  selectedCell.value = null
  showNumberPad.value = false
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div v-if="!board" class="text-center p-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-4 text-gray-600">Generating puzzle...</p>
    </div>

    <div v-else class="bg-gray-800 p-2 rounded-lg shadow-2xl">
      <!-- 9x9 Grid -->
      <div class="grid grid-cols-9 gap-0">
        <template v-for="(row, rowIndex) in board.cells" :key="`row-${rowIndex}`">
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            class="relative flex items-center justify-center w-12 h-12 border border-gray-400 transition-all duration-200"
            :style="{ backgroundColor: getCellBgColor(cell.lockedBy, rowIndex, colIndex) }"
            :class="[
              getCellAnimationClass(rowIndex, colIndex),
              isRightBorder(colIndex) ? 'border-r-2 border-r-gray-800' : '',
              isBottomBorder(rowIndex) ? 'border-b-2 border-b-gray-800' : '',
              cell.locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50',
              isCellSelected(rowIndex, colIndex) ? 'ring-2 ring-blue-500 ring-inset' : ''
            ]"
            @click="handleCellClick(rowIndex, colIndex)"
          >
            <!-- Cell Value -->
            <span
              v-if="cell.value"
              class="text-xl font-bold select-none"
              :style="{ color: getTextColor(cell.lockedBy) }"
            >
              {{ cell.value }}
            </span>

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

    <!-- Number Pad -->
    <div
      v-if="showNumberPad"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click="closeNumberPad"
    >
      <div
        class="number-pad-modal bg-white rounded-lg p-6 shadow-2xl"
        @click.stop
      >
        <h3 class="text-lg font-bold text-gray-800 mb-4 text-center">
          Select a number
        </h3>

        <div class="number-grid grid grid-cols-3 gap-3">
          <button
            v-for="num in 9"
            :key="num"
            @click="selectNumber(num)"
            class="number-button bg-blue-500 hover:bg-blue-600 text-white text-2xl font-bold rounded-lg transition-colors"
          >
            {{ num }}
          </button>
        </div>

        <button
          @click="closeNumberPad"
          class="mt-4 w-full py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure crisp borders */
.grid > div:nth-child(9n+1) {
  border-left-width: 2px;
  border-left-color: rgb(31, 41, 55);
}

.grid > div:nth-child(-n+9) {
  border-top-width: 2px;
  border-top-color: rgb(31, 41, 55);
}

/* Fix column width inconsistency on mobile - ensure all columns equal width and square tiles */
@media (max-width: 768px) {
  /* Make board expand to fill available width */
  .bg-gray-800 {
    width: calc(95vw - 30px);
    max-width: calc(95vw - 30px);
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
</style>
