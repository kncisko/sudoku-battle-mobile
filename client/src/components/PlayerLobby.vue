<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { LobbyPlayerPublic } from '../composables/useSocket'

const props = defineProps<{
  lobbyPlayers: LobbyPlayerPublic[]
  lobbyTotal: number
  isConnected: boolean
  authenticatedUserId: string | null
  authenticatedUsername: string | null
}>()

const emit = defineEmits<{
  createRoom: [playerName: string]
  joinRoom: [roomCode: string, playerName: string]
  back: []
  showAuth: []
  setIdle: []
  setAvailable: []
}>()

const playerName = ref(props.authenticatedUsername || '')
const joinCode = ref('')
const showJoinForm = ref(false)

// Sync player name when auth state changes
watch(() => props.authenticatedUsername, (name) => {
  if (name && !playerName.value) playerName.value = name
})

// ── Idle detection ──────────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
let idleTimer: ReturnType<typeof setTimeout> | null = null
const isIdle = ref(false)

const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)
  if (isIdle.value) {
    isIdle.value = false
    emit('setAvailable')
  }
  idleTimer = setTimeout(() => {
    isIdle.value = true
    emit('setIdle')
  }, IDLE_TIMEOUT_MS)
}

const IDLE_EVENTS = ['touchstart', 'mousedown', 'keydown', 'scroll']

onMounted(() => {
  IDLE_EVENTS.forEach(e => document.addEventListener(e, resetIdleTimer, { passive: true }))
  resetIdleTimer()
})

onUnmounted(() => {
  IDLE_EVENTS.forEach(e => document.removeEventListener(e, resetIdleTimer))
  if (idleTimer) clearTimeout(idleTimer)
})

// ── Actions ─────────────────────────────────────────────────────────────────
const resolvedName = () => {
  const trimmed = playerName.value.trim()
  return trimmed || `Player${Math.floor(Math.random() * 1000)}`
}

const handleCreateRoom = () => {
  emit('createRoom', resolvedName())
}

const handleJoinRoom = () => {
  const code = joinCode.value.trim().toUpperCase()
  if (!code) return
  emit('joinRoom', code, resolvedName())
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  available: 'Available',
  idle: 'Away',
  pending: 'In queue',
  in_game: 'In game',
}

const statusDot: Record<string, string> = {
  available: 'bg-green-500',
  idle: 'bg-yellow-400',
  pending: 'bg-orange-400',
  in_game: 'bg-gray-400',
}

const statusText: Record<string, string> = {
  available: 'text-green-700',
  idle: 'text-yellow-700',
  pending: 'text-orange-700',
  in_game: 'text-gray-500',
}
</script>

<template>
  <div class="w-full space-y-4">
    <h2 class="text-xl font-bold text-gray-800 text-center">Online Players</h2>

    <!-- Sign-in banner (unauthenticated) -->
    <div
      v-if="!authenticatedUserId && isConnected"
      class="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg"
    >
      <p class="text-sm text-blue-800">
        <button @click="$emit('showAuth')" class="font-semibold underline">Sign in</button>
        to appear in the lobby and challenge players.
      </p>
    </div>

    <!-- Not connected -->
    <div v-if="!isConnected" class="p-3 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
      <p class="text-sm text-orange-800 font-semibold">No connection — lobby unavailable</p>
    </div>

    <!-- Player list -->
    <div
      v-if="isConnected"
      class="rounded-lg border border-gray-200 overflow-hidden"
      style="max-height: 260px; overflow-y: auto;"
    >
      <!-- Empty state -->
      <div v-if="lobbyPlayers.length === 0" class="p-6 text-center text-gray-400 text-sm">
        No players online right now
      </div>

      <!-- Player rows -->
      <div
        v-for="player in lobbyPlayers"
        :key="player.userId"
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
        :class="player.userId === authenticatedUserId ? 'bg-blue-50' : 'bg-white'"
      >
        <!-- Avatar -->
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {{ player.name.charAt(0).toUpperCase() }}
        </div>

        <!-- Name + status -->
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-800 text-sm truncate">
            {{ player.name }}
            <span v-if="player.userId === authenticatedUserId" class="text-xs font-normal text-blue-500"> (you)</span>
          </p>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDot[player.status]"></span>
            <span class="text-xs" :class="statusText[player.status]">{{ statusLabel[player.status] }}</span>
            <span v-if="player.totalGames > 0" class="text-xs text-gray-400 ml-1">
              · {{ Math.round(player.winRate * 100) }}% ({{ player.totalGames }})
            </span>
          </div>
        </div>

        <!-- Challenge button (Phase 3 placeholder) -->
        <button
          v-if="player.status === 'available' && player.userId !== authenticatedUserId"
          disabled
          title="Coming soon"
          class="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-400 cursor-not-allowed flex-shrink-0"
        >
          Challenge
        </button>
      </div>
    </div>

    <!-- Online count -->
    <p v-if="isConnected && lobbyTotal > 0" class="text-xs text-gray-400 text-center -mt-1">
      {{ lobbyTotal }} player{{ lobbyTotal === 1 ? '' : 's' }} online
    </p>

    <!-- Your name (if not authenticated) -->
    <div v-if="!authenticatedUserId">
      <label class="block text-sm font-medium text-gray-700 mb-1">Your name</label>
      <input
        v-model="playerName"
        type="text"
        placeholder="Enter your name..."
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
    </div>

    <!-- Action buttons -->
    <div v-if="!showJoinForm" class="space-y-3">
      <button
        v-if="isConnected"
        @click="handleCreateRoom"
        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
      >
        Create Multiplayer Room
      </button>

      <button
        v-if="isConnected"
        @click="showJoinForm = true"
        class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Join with Room Code
      </button>

      <button
        @click="$emit('back')"
        class="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
          <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
        </svg>
        Back to Game Selection
      </button>
    </div>

    <!-- Join with code form -->
    <div v-if="showJoinForm" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
        <input
          v-model="joinCode"
          type="text"
          placeholder="Enter 6-character code..."
          maxlength="6"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase text-sm"
          @keyup.enter="handleJoinRoom"
        />
      </div>

      <button
        @click="handleJoinRoom"
        :disabled="!joinCode.trim()"
        class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Join Room
      </button>

      <button
        @click="showJoinForm = false; joinCode = ''"
        class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        Cancel
      </button>
    </div>
  </div>
</template>
