<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Player } from '../../../shared/types'

interface Props {
  roomCode: string | null
  players: Player[]
  isWaiting: boolean
  gameStarting: boolean
  isConnected: boolean
  authenticatedUsername?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  createRoom: [playerName: string]
  createAIGame: [playerName: string, difficulty: 'beginner' | 'normal' | 'expert']
  createOfflineGame: [playerName: string, difficulty: 'beginner' | 'normal' | 'expert']
  joinRoom: [roomCode: string, playerName: string]
  showAuth: []
  returnToModeSelection: []
}>()

const playerName = ref('')
const joinRoomCode = ref('')
const showJoinForm = ref(false)
const showDifficultySelect = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  // Auto-populate player name if authenticated
  if (props.authenticatedUsername) {
    playerName.value = props.authenticatedUsername
  }

  // Auto-focus the name input only on desktop (not on mobile to avoid keyboard popup)
  if (nameInput.value && window.innerWidth > 768) {
    nameInput.value.focus()
    nameInput.value.select()
  }
})

// Watch for changes to authenticated username
watch(() => props.authenticatedUsername, (newUsername) => {
  if (newUsername && !playerName.value) {
    playerName.value = newUsername
  }
})

const handleCreateRoom = () => {
  if (!playerName.value.trim()) {
    playerName.value = `Player ${Math.floor(Math.random() * 1000)}`
  }
  emit('createRoom', playerName.value)
}

const handleShowDifficultySelect = () => {
  if (!playerName.value.trim()) {
    playerName.value = `Player ${Math.floor(Math.random() * 1000)}`
  }
  showDifficultySelect.value = true
}

const handleCreateAIGame = (difficulty: 'beginner' | 'normal' | 'expert') => {
  console.log('Creating AI game for player:', playerName.value, 'difficulty:', difficulty)
  emit('createAIGame', playerName.value, difficulty)
}

const handleCreateOfflineGame = (difficulty: 'beginner' | 'normal' | 'expert') => {
  if (!playerName.value.trim()) {
    playerName.value = `Player ${Math.floor(Math.random() * 1000)}`
  }
  emit('createOfflineGame', playerName.value, difficulty)
}

const handleJoinRoom = () => {
  if (!playerName.value.trim()) {
    playerName.value = `Player ${Math.floor(Math.random() * 1000)}`
  }
  if (!joinRoomCode.value.trim()) {
    return
  }
  emit('joinRoom', joinRoomCode.value.toUpperCase(), playerName.value)
}
</script>

<template>
  <div class="w-full">
    <!-- Not in a room yet -->
    <div v-if="!roomCode" class="space-y-4">
      <h2 class="text-xl font-bold text-gray-800 text-center mb-4">
        Join a Game
      </h2>

      <!-- Player Name Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Your Name
        </label>
        <input
          ref="nameInput"
          v-model="playerName"
          type="text"
          placeholder="Enter your name..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          @keyup.enter="showJoinForm ? handleJoinRoom() : handleCreateRoom()"
        />
        <p class="mt-1 text-xs text-gray-500">
          💡 Sign in to compete on the leaderboard (optional)
        </p>
      </div>

      <!-- Offline Mode Banner (when disconnected) -->
      <div v-if="!isConnected && !showJoinForm && !showDifficultySelect" class="mb-4 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
        <p class="text-sm text-orange-800 font-semibold">
          📵 Offline Mode - Play vs AI without internet
        </p>
      </div>

      <!-- Create Room / Play vs AI Buttons -->
      <div v-if="!showJoinForm && !showDifficultySelect" class="space-y-3">
        <button
          @click="handleShowDifficultySelect"
          class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
        >
          🤖 Play vs AI {{ isConnected ? '' : '(Offline)' }}
        </button>

        <button
          v-if="isConnected"
          @click="handleCreateRoom"
          class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Create Multiplayer Room
        </button>

        <div v-else class="text-center p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <p class="text-sm text-gray-600">Multiplayer requires internet connection</p>
        </div>

        <!-- Join Room Toggle (only when connected) -->
        <button
          v-if="isConnected"
          @click="showJoinForm = !showJoinForm"
          class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
        >
          {{ showJoinForm ? '← Back to Main Menu' : '🔑 Join Existing Room' }}
        </button>

        <!-- Return to Mode Selection -->
        <button
          @click="$emit('returnToModeSelection')"
          class="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
            <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
          </svg>
          <span>Return to Game Selection</span>
        </button>
      </div>

      <!-- Difficulty Selection -->
      <div v-if="showDifficultySelect && !showJoinForm" class="space-y-3">
        <h3 class="text-lg font-bold text-gray-800 text-center mb-2">Select Difficulty</h3>

        <button
          @click="isConnected ? handleCreateAIGame('beginner') : handleCreateOfflineGame('beginner')"
          class="w-full bg-green-300 hover:bg-green-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition-colors"
        >
          😊 Beginner
        </button>

        <button
          @click="isConnected ? handleCreateAIGame('normal') : handleCreateOfflineGame('normal')"
          class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
        >
          🎯 Normal
        </button>

        <button
          @click="isConnected ? handleCreateAIGame('expert') : handleCreateOfflineGame('expert')"
          class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md"
        >
          🔥 Expert
        </button>

        <button
          @click="showDifficultySelect = false"
          class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
        >
          ← Back
        </button>
      </div>

      <!-- Join Room Form -->
      <div v-if="showJoinForm" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Room Code
          </label>
          <input
            v-model="joinRoomCode"
            type="text"
            placeholder="Enter 6-character code..."
            maxlength="6"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            @keyup.enter="handleJoinRoom"
          />
        </div>

        <button
          @click="handleJoinRoom"
          :disabled="!joinRoomCode.trim()"
          class="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Join Room
        </button>
      </div>
    </div>

    <!-- In a room -->
    <div v-else class="space-y-4">
      <!-- Room Code Display (only for multiplayer, not AI games) -->
      <div v-if="!players.some(p => p.name === 'AI Opponent')" class="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <p class="text-sm text-gray-600 text-center mb-2">Room Code:</p>
        <p class="text-3xl font-mono font-bold text-blue-600 text-center tracking-widest">
          {{ roomCode }}
        </p>
        <p class="text-xs text-gray-500 text-center mt-2">
          Share this code with your opponent
        </p>
      </div>

      <!-- Players List -->
      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-gray-700">Players:</h3>
        <div
          v-for="(player, index) in players"
          :key="player.id"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
            :class="index === 0 ? 'bg-blue-500' : 'bg-purple-500'"
          >
            {{ player.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-800">{{ player.name }}</p>
            <p class="text-xs text-gray-500">Player {{ index + 1 }}</p>
          </div>
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>

        <!-- Waiting for Player 2 -->
        <div
          v-if="isWaiting && players.length < 2"
          class="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        >
          <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span class="text-gray-500">?</span>
          </div>
          <div class="flex-1">
            <p class="font-medium text-gray-500">Waiting for opponent...</p>
            <p class="text-xs text-gray-400">Share the room code above</p>
          </div>
          <div class="animate-pulse">
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>

      <!-- Tracking Info (for PvP games only) -->
      <div
        v-if="!players.some(p => p.name === 'AI Opponent')"
        class="p-3 rounded-lg border-2"
        :class="authenticatedUsername ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'"
      >
        <p class="text-xs text-center" :class="authenticatedUsername ? 'text-green-700' : 'text-blue-700'">
          <span v-if="authenticatedUsername">
            ✅ Your stats will be tracked for this game
          </span>
          <span v-else>
            💡 <button @click="$emit('showAuth')" class="underline font-semibold">Sign in</button> to track your game stats
          </span>
        </p>
      </div>

      <!-- Game Starting -->
      <div
        v-if="gameStarting"
        class="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center"
      >
        <div class="animate-bounce mb-2">
          <span class="text-4xl">🎮</span>
        </div>
        <p class="text-lg font-bold text-green-700">Game Starting!</p>
        <p class="text-sm text-gray-600 mt-1">Get ready to play...</p>
      </div>

      <!-- Waiting Status -->
      <div
        v-else-if="isWaiting"
        class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-center"
      >
        <div class="flex items-center justify-center gap-2">
          <div class="animate-spin h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
          <p class="text-sm font-medium text-yellow-700">
            Waiting for opponent to join...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
