<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  isOpen?: boolean
}>()

const currentRule = ref(0)
const animationInterval = ref<number | null>(null)
const isPaused = ref(false)

const rules = [
  {
    title: 'Rule 1: Rows',
    description: 'Each row must contain digits 1-9 without repetition',
    highlightType: 'row'
  },
  {
    title: 'Rule 2: Columns',
    description: 'Each column must contain digits 1-9 without repetition',
    highlightType: 'column'
  },
  {
    title: 'Rule 3: Boxes',
    description: 'Each 3×3 box must contain digits 1-9 without repetition',
    highlightType: 'box'
  }
]

// Example grid showing the rules
const exampleGrid = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [2, 3, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8]
]

const shouldHighlight = (row: number, col: number): boolean => {
  const rule = rules[currentRule.value].highlightType

  if (rule === 'row') {
    // Highlight row 4 (middle row)
    return row === 4
  } else if (rule === 'column') {
    // Highlight column 4 (middle column)
    return col === 4
  } else if (rule === 'box') {
    // Highlight center 3x3 box
    return row >= 3 && row <= 5 && col >= 3 && col <= 5
  }
  return false
}

const cycleRules = () => {
  currentRule.value = (currentRule.value + 1) % rules.length
}

const startAnimation = () => {
  if (animationInterval.value) {
    clearInterval(animationInterval.value)
  }
  isPaused.value = false
  animationInterval.value = window.setInterval(cycleRules, 5000)
}

const stopAnimation = () => {
  if (animationInterval.value) {
    clearInterval(animationInterval.value)
    animationInterval.value = null
  }
  isPaused.value = true
}

const handleDotClick = (index: number) => {
  currentRule.value = index
  stopAnimation()
}

// Watch for modal open/close to restart animation
watch(() => props.isOpen, (newValue: boolean | undefined) => {
  if (newValue) {
    // Modal opened - restart animation
    currentRule.value = 0
    startAnimation()
  }
})

onMounted(() => {
  // Auto-cycle through rules every 5 seconds
  startAnimation()
})

onUnmounted(() => {
  stopAnimation()
})
</script>

<template>
  <div class="space-y-6">
    <p class="text-gray-700 leading-relaxed text-center">
      Sudoku is a logic-based number puzzle played on a 9×9 grid divided into nine 3×3 boxes.
    </p>

    <!-- Rule indicator dots -->
    <div class="flex justify-center gap-2 mb-4">
      <button
        v-for="(_, index) in rules"
        :key="index"
        @click="handleDotClick(index)"
        :class="[
          'w-3 h-3 rounded-full transition-all',
          currentRule === index ? 'bg-blue-500 scale-125' : 'bg-gray-300'
        ]"
      />
    </div>

    <!-- Current rule title and description -->
    <div class="mb-6 text-center transition-opacity duration-300">
      <h3 class="text-xl font-semibold text-blue-600 mb-2">
        {{ rules[currentRule].title }}
      </h3>
      <p class="text-gray-600">
        {{ rules[currentRule].description }}
      </p>
    </div>

    <!-- Sudoku grid visualization -->
    <!-- Outer border is a separate wrapper so it never gets clipped on any screen size -->
    <div class="border-2 border-gray-800 w-full max-w-xs mx-auto">
      <div class="grid grid-cols-9">
        <template
          v-for="(row, rowIndex) in exampleGrid"
          :key="`row-${rowIndex}`"
        >
          <div
            v-for="(cell, colIndex) in row"
            :key="`cell-${rowIndex}-${colIndex}`"
            :class="[
              'aspect-square flex items-center justify-center text-xs font-semibold transition-colors duration-500',
              // Right border — not on last column (outer wrapper covers it)
              (colIndex as number) < 8
                ? ((colIndex as number) % 3 === 2 ? 'border-r-2 border-r-gray-600' : 'border-r border-r-gray-300')
                : '',
              // Bottom border — not on last row (outer wrapper covers it)
              (rowIndex as number) < 8
                ? ((rowIndex as number) % 3 === 2 ? 'border-b-2 border-b-gray-600' : 'border-b border-b-gray-300')
                : '',
              // Highlight based on current rule — no scale transform to avoid misalignment
              shouldHighlight(rowIndex as number, colIndex as number)
                ? 'bg-blue-200 text-blue-900'
                : 'bg-white text-gray-700'
            ]"
          >
            {{ cell }}
          </div>
        </template>
      </div>
    </div>

    <!-- Navigation hint -->
    <p class="text-center text-sm text-gray-500 mt-4">
      Animation cycles automatically • Click dots to switch rules
    </p>

    <!-- Additional info -->
    <div class="mt-6 p-4 bg-gray-50 border-l-4 border-gray-400 rounded">
      <p class="text-sm text-gray-700">
        <strong>The Goal:</strong> Fill the entire grid with numbers 1-9 so that each row, column, and 3×3 box contains all digits from 1 to 9 without repetition.
      </p>
    </div>

    <div class="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
      <p class="text-sm text-blue-800">
        <strong>Did you know?</strong> Sudoku puzzles have only one unique solution. The puzzle is designed so that logic alone can find it!
      </p>
    </div>
  </div>
</template>
