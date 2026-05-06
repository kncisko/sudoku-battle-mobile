<script setup lang="ts">
import { ref, watch } from 'vue'
import SudokuRules from './SudokuRules.vue'

const props = defineProps<{
  isOpen: boolean
  mode?: 'battle' | 'classic' // Default to 'battle' for backward compatibility
  defaultTab?: 'sudoku' | 'battle' | 'ai' | 'rating'
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'sudoku' | 'battle' | 'ai' | 'rating'>('battle')

// When mode is classic, show only Sudoku Rules tab
watch(() => props.mode, (newMode) => {
  if (newMode === 'classic') {
    activeTab.value = 'sudoku'
  } else {
    activeTab.value = props.defaultTab ?? 'battle'
  }
}, { immediate: true })

watch(() => props.defaultTab, (tab) => {
  if (tab) activeTab.value = tab
})

const closeModal = () => {
  emit('close')
}

// Close on escape key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeModal()
  }
}

// Add/remove escape key listener when modal opens/closes
const handleModalChange = (isOpen: boolean) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
}

// Watch for prop changes
watch(() => props.isOpen, handleModalChange)
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        @click="closeModal"
      ></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-800">How to Play</h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors text-3xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <!-- Tabs -->
        <div v-if="mode !== 'classic'" class="flex border-b border-gray-200 bg-gray-50">
          <button
            @click="activeTab = 'battle'"
            class="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            :class="activeTab === 'battle'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'"
          >
            Battle Sudoku
          </button>
          <button
            @click="activeTab = 'sudoku'"
            class="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            :class="activeTab === 'sudoku'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'"
          >
            Sudoku Rules
          </button>
          <button
            @click="activeTab = 'ai'"
            class="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            :class="activeTab === 'ai'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'"
          >
            AI Difficulty
          </button>
          <button
            @click="activeTab = 'rating'"
            class="flex-1 px-4 py-3 text-sm font-semibold transition-colors"
            :class="activeTab === 'rating'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'"
          >
            Rating
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Battle Sudoku Rules -->
          <div v-if="activeTab === 'battle'" class="space-y-4">
            <p class="text-gray-700 leading-relaxed">
              Battle Sudoku is a turn-based competitive version of classic Sudoku. Two players compete to lock the most cells on the same board!
            </p>

            <div class="space-y-3">
              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Take Turns</h3>
                  <p class="text-sm text-gray-600">Each player has 20 seconds per turn to select a cell and enter a number.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Correct Guess</h3>
                  <p class="text-sm text-gray-600">The cell locks in your color and you get to continue playing!</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ✗
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Wrong Guess</h3>
                  <p class="text-sm text-gray-600">A random empty cell is revealed (neutral color) and your turn ends.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ⏱
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Timer Expires</h3>
                  <p class="text-sm text-gray-600">A random empty cell is revealed (neutral color) and your turn ends.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  🏆
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Win Condition</h3>
                  <p class="text-sm text-gray-600">When the board is complete, the player who locked the most cells wins!</p>
                </div>
              </div>
            </div>

            <div class="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p class="text-sm text-blue-800">
                <strong>Strategy Tip:</strong> Balance speed with accuracy. While you want to be quick, making correct guesses is crucial to keep your turn going!
              </p>
            </div>
          </div>

          <!-- Standard Sudoku Rules -->
          <div v-if="activeTab === 'sudoku'">
            <SudokuRules :is-open="isOpen" />
          </div>

          <!-- Rating System -->
          <div v-if="activeTab === 'rating'" class="space-y-4">
            <p class="text-gray-700 leading-relaxed">
              Every player has a <strong>rating</strong> — a number that reflects your skill level based on your results against other players. The better you do against strong opponents, the higher your rating climbs.
            </p>

            <div class="space-y-3">
              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ?
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">How is my rating calculated?</h3>
                  <p class="text-sm text-gray-600">We use a system called <strong>Glicko-2</strong> — the same method used by chess.com, Lichess, and other competitive platforms. It tracks not just your wins and losses, but also <em>who</em> you played against. Beating a strong player is worth more than beating a beginner.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ±
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">What is "Placement"?</h3>
                  <p class="text-sm text-gray-600">When you're new, the system doesn't have enough data to be confident in your rating yet. During this period you'll see a <strong>Placement</strong> badge instead of a number. After around 15–20 games, your rating will settle and appear on the leaderboard. Your rating can still change — it just becomes more stable over time.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ↑
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">How do I raise my rating?</h3>
                  <p class="text-sm text-gray-600">Win games — especially against players rated higher than you. Upsets count for more. Playing consistently also helps, as inactive players' ratings become less certain over time.</p>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm">
                  ↓
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-1">Can my rating drop?</h3>
                  <p class="text-sm text-gray-600">Yes. Losing to a weaker player will drop your rating more than losing to a stronger one. That's by design — the leaderboard reflects your true long-term skill, not just your best run.</p>
                </div>
              </div>
            </div>

            <div class="mt-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
              <p class="text-sm text-purple-800">
                <strong>Why not just use win count?</strong> Win count rewards playing lots of games more than playing well. Someone with 50 wins and 80 losses would rank above someone with 20 wins and 2 losses. Your rating fixes that — it measures skill, not volume.
              </p>
            </div>
          </div>

          <!-- AI Difficulty Levels -->
          <div v-if="activeTab === 'ai'" class="space-y-4">
            <p class="text-gray-700 leading-relaxed">
              Choose your AI opponent's difficulty level based on how challenging you want the game to be.
            </p>

            <div class="space-y-4">
              <div class="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🟢</span>
                  <h3 class="font-semibold text-gray-800">Beginner</h3>
                </div>
                <p class="text-sm text-gray-600 mb-2">
                  Perfect for learning the game or casual play. The AI makes frequent mistakes.
                </p>
                <div class="text-xs text-gray-500">
                  Success Rate: ~40% • Recommended for new players
                </div>
              </div>

              <div class="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🟡</span>
                  <h3 class="font-semibold text-gray-800">Normal</h3>
                </div>
                <p class="text-sm text-gray-600 mb-2">
                  A balanced opponent that provides a fair challenge without being overwhelming.
                </p>
                <div class="text-xs text-gray-500">
                  Success Rate: ~50% • Recommended for most players
                </div>
              </div>

              <div class="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🔴</span>
                  <h3 class="font-semibold text-gray-800">Expert</h3>
                </div>
                <p class="text-sm text-gray-600 mb-2">
                  A formidable opponent that rarely makes mistakes. Prepare for a tough battle!
                </p>
                <div class="text-xs text-gray-500">
                  Success Rate: ~75% • Recommended for experienced players
                </div>
              </div>
            </div>

            <div class="mt-6 p-4 bg-purple-50 border-l-4 border-purple-500 rounded">
              <p class="text-sm text-purple-800">
                <strong>Challenge yourself:</strong> Start with Beginner to learn the strategies, then work your way up to Expert!
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            @click="closeModal"
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
