<template>
  <div class="h-screen flex items-center justify-center p-4" style="background-color: var(--color-base)">
    <div class="flex flex-col gap-4 w-full max-w-sm">
      <h2 class="text-3xl font-bold mb-2 text-center drop-shadow-lg" style="color: var(--color-text)">Classic Sudoku</h2>

      <button @click="$emit('select-difficulty', 'easy')" class="menu-btn" style="background-color: var(--color-primary)">
        <span class="text-3xl flex-shrink-0">😊</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Easy</span>
          <span class="text-sm opacity-80">Perfect for beginners</span>
        </div>
      </button>

      <button @click="$emit('select-difficulty', 'medium')" class="menu-btn" style="background-color: var(--color-secondary)">
        <span class="text-3xl flex-shrink-0">🎯</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Medium</span>
          <span class="text-sm opacity-80">A balanced challenge</span>
        </div>
      </button>

      <button @click="$emit('select-difficulty', 'hard')" class="menu-btn" style="background-color: var(--color-accent)">
        <span class="text-3xl flex-shrink-0">🔥</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Hard</span>
          <span class="text-sm opacity-80">For puzzle masters</span>
        </div>
      </button>

      <button @click="$emit('show-help')" class="menu-btn" style="background-color: var(--color-surface)">
        <span class="text-3xl flex-shrink-0">❓</span>
        <div class="flex flex-col items-start">
          <span class="text-lg font-bold">Rules</span>
          <span class="text-sm opacity-80">How to play Classic Sudoku</span>
        </div>
      </button>

      <button
        @click="$emit('back')"
        class="w-full font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-1"
        style="background-color: var(--color-surface); color: var(--color-text); opacity: 0.7"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
        </svg>
        Back to Game Selection
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'select-difficulty': [difficulty: 'easy' | 'medium' | 'hard']
  'back': []
  'show-help': []
}>()
</script>

<style scoped>
.menu-btn {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 1.25rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  border: none;
  color: white;
}

.menu-btn:active {
  filter: brightness(0.9);
}

@media (hover: hover) {
  .menu-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  }
}
</style>
