<template>
  <div class="h-screen flex items-center justify-center p-4" style="background-color: var(--color-base)">
    <div class="flex flex-col gap-6 items-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-4 text-center drop-shadow-lg" style="color: var(--color-text)">
        Choose Your Game Mode
      </h1>

      <!-- Sudoku Battle Button -->
      <button
        @click="$emit('select-mode', 'battle')"
        class="game-mode-btn battle-mode"
      >
        <span class="text-3xl mb-2">⚔️</span>
        <span class="text-2xl font-bold">Play Sudoku Battle</span>
        <span class="text-sm opacity-90">Compete with players online</span>
      </button>

      <!-- Classic Sudoku Button -->
      <button
        @click="$emit('select-mode', 'classic')"
        class="game-mode-btn classic-mode"
      >
        <span class="text-3xl mb-2">🧩</span>
        <span class="text-2xl font-bold">Play Classic Sudoku</span>
        <span class="text-sm opacity-90">Solo puzzle solving</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'select-mode': [mode: 'battle' | 'classic']
}>()
</script>

<style scoped>
.game-mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 320px;
  min-height: 160px;
  padding: 2rem;
  border-radius: 1.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  border: none;
  color: white;
}

.game-mode-btn:active {
  filter: brightness(0.9);
}

@media (hover: hover) {
  .game-mode-btn:hover {
    transform: translateY(-8px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  }
}

.battle-mode {
  background-color: var(--color-primary);
}

.battle-mode:hover {
  filter: brightness(1.15);
}

.classic-mode {
  background-color: var(--color-accent);
}

.classic-mode:hover {
  filter: brightness(1.15);
}

/* Responsive sizing for mobile */
@media (max-width: 640px) {
  .game-mode-btn {
    width: 280px;
    min-height: 140px;
    padding: 1.5rem;
  }

  h1 {
    font-size: 2rem;
  }

  .game-mode-btn span:nth-child(2) {
    font-size: 1.5rem;
  }
}
</style>
