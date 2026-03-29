<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { IncomingChallenge } from '../composables/useSocket'

const props = defineProps<{
  challenge: IncomingChallenge
}>()

const emit = defineEmits<{
  accept: [challengerUserId: string]
  decline: [challengerUserId: string]
}>()

const countdown = ref(props.challenge.timeoutSecs)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const urgency = () => countdown.value <= 10
</script>

<template>
  <div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">

      <!-- Header -->
      <div class="text-center mb-5">
        <div class="text-4xl mb-2">⚔️</div>
        <h2 class="text-xl font-bold text-gray-800">Challenge Received!</h2>
      </div>

      <!-- Challenger info -->
      <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {{ challenge.challengerName.charAt(0).toUpperCase() }}
        </div>
        <div>
          <p class="font-bold text-gray-800">{{ challenge.challengerName }}</p>
          <p v-if="challenge.challengerTotalGames > 0" class="text-sm text-gray-500">
            {{ Math.round(challenge.challengerWinRate * 100) }}% win rate
            · {{ challenge.challengerTotalGames }} games
          </p>
          <p v-else class="text-sm text-gray-400">New player</p>
        </div>
      </div>

      <!-- Countdown -->
      <div class="text-center mb-6">
        <p class="text-sm text-gray-500 mb-1">Respond within</p>
        <p
          class="text-4xl font-bold font-mono transition-colors"
          :class="urgency() ? 'text-red-600 animate-pulse' : 'text-blue-600'"
        >
          {{ countdown }}s
        </p>
      </div>

      <!-- Buttons -->
      <div class="flex gap-3">
        <button
          @click="$emit('decline', challenge.challengerUserId)"
          class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-colors"
        >
          Decline
        </button>
        <button
          @click="$emit('accept', challenge.challengerUserId)"
          class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
        >
          Accept
        </button>
      </div>
    </div>
  </div>
</template>
