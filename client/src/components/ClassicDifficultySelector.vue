<template>
  <div class="h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div class="flex flex-col gap-6 items-center">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 text-center drop-shadow-lg">
        Choose Difficulty
      </h1>

      <!-- Easy Button -->
      <button
        @click="$emit('select-difficulty', 'easy')"
        class="difficulty-btn easy-mode"
      >
        <span class="text-3xl mb-2">😊</span>
        <span class="text-2xl font-bold">Easy</span>
        <span class="text-sm opacity-90">Perfect for beginners</span>
      </button>

      <!-- Medium Button -->
      <button
        @click="$emit('select-difficulty', 'medium')"
        class="difficulty-btn medium-mode"
      >
        <span class="text-3xl mb-2">🎯</span>
        <span class="text-2xl font-bold">Medium</span>
        <span class="text-sm opacity-90">A balanced challenge</span>
      </button>

      <!-- Hard Button -->
      <button
        @click="$emit('select-difficulty', 'hard')"
        class="difficulty-btn hard-mode"
      >
        <span class="text-3xl mb-2">🔥</span>
        <span class="text-2xl font-bold">Hard</span>
        <span class="text-sm opacity-90">For puzzle masters</span>
      </button>

      <!-- Bottom buttons row -->
      <div class="flex gap-3 w-full justify-center">
        <button
          @click="$emit('back')"
          class="difficulty-btn back-mode flex-1"
          style="max-width: 155px;"
        >
          <div class="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
              <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
            </svg>
            <span class="text-xl font-bold">Back</span>
          </div>
        </button>

        <button
          @click="$emit('show-help')"
          class="difficulty-btn help-mode flex-1"
          style="max-width: 155px;"
        >
          <span class="text-xl font-bold">❓ Rules</span>
        </button>
      </div>
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
.difficulty-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 320px;
  min-height: 140px;
  padding: 1.5rem;
  border-radius: 1.5rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  border: none;
}

.difficulty-btn:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}

.difficulty-btn:active {
  transform: translateY(-4px);
}

.easy-mode {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #1a5f3e;
}

.easy-mode:hover {
  background: linear-gradient(135deg, #96ffc0 0%, #a5ddff 100%);
}

.medium-mode {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #7c3a0f;
}

.medium-mode:hover {
  background: linear-gradient(135deg, #fff5e5 0%, #ffc5af 100%);
}

.hard-mode {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
}

.hard-mode:hover {
  background: linear-gradient(135deg, #ff7c7c 0%, #ff6a7f 100%);
}

.back-mode {
  background: linear-gradient(135deg, #a8a8a8 0%, #8a8a8a 100%);
  color: white;
  min-height: 80px;
}

.back-mode:hover {
  background: linear-gradient(135deg, #b8b8b8 0%, #9a9a9a 100%);
}

.help-mode {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  color: white;
  min-height: 80px;
}

.help-mode:hover {
  background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%);
}

/* Responsive sizing for mobile */
@media (max-width: 640px) {
  .difficulty-btn {
    width: 280px;
    min-height: 120px;
    padding: 1.25rem;
  }

  h1 {
    font-size: 2rem;
  }

  .difficulty-btn span:nth-child(2) {
    font-size: 1.5rem;
  }
}
</style>
