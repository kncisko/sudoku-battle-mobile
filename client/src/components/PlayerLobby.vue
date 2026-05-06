<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { LobbyPlayerPublic, OutgoingChallenge } from '../composables/useSocket'

const props = defineProps<{
  lobbyPlayers: LobbyPlayerPublic[]
  lobbyTotal: number
  isConnected: boolean
  authenticatedUserId: string | null
  authenticatedUsername: string | null
  outgoingChallenge: OutgoingChallenge | null
  challengeError: string | null
}>()

const emit = defineEmits<{
  createRoom: [playerName: string]
  joinRoom: [roomCode: string, playerName: string]
  createAIGame: [playerName: string, difficulty: 'beginner' | 'normal' | 'expert']
  back: []
  showAuth: []
  setIdle: []
  setAvailable: []
  challenge: [targetUserId: string]
  cancelChallenge: [targetUserId: string]
}>()

const playerName = ref(props.authenticatedUsername || '')
const joinCode = ref('')
const showJoinForm = ref(false)
const showAIDifficulty = ref(false)
const showLobby = ref(false)
const lobbyFilter = ref('')
const showAll = ref(false)

// Sync player name when auth state changes
watch(() => props.authenticatedUsername, (name) => {
  if (name && !playerName.value) playerName.value = name
})

void 0 // re-enable fake players by uncommenting below line in filteredPlayers
const _FAKE_PLAYERS = [
  { userId: 'fake-1',   name: 'Alice',       status: 'available', winRate: 0.72, totalGames: 134 },
  { userId: 'fake-2',   name: 'Bob',         status: 'in_game',   winRate: 0.45, totalGames: 88  },
  { userId: 'fake-3',   name: 'Charlie',     status: 'idle',      winRate: 0.61, totalGames: 52  },
  { userId: 'fake-4',   name: 'Diana',       status: 'available', winRate: 0.83, totalGames: 201 },
  { userId: 'fake-5',   name: 'Edward',      status: 'pending',   winRate: 0.39, totalGames: 17  },
  { userId: 'fake-6',   name: 'Fiona',       status: 'available', winRate: 0.55, totalGames: 73  },
  { userId: 'fake-7',   name: 'George',      status: 'in_game',   winRate: 0.68, totalGames: 156 },
  { userId: 'fake-8',   name: 'Hannah',      status: 'available', winRate: 0.91, totalGames: 302 },
  { userId: 'fake-9',   name: 'Ivan',        status: 'idle',      winRate: 0.44, totalGames: 29  },
  { userId: 'fake-10',  name: 'Julia',       status: 'available', winRate: 0.77, totalGames: 118 },
  { userId: 'fake-11',  name: 'Kevin',       status: 'in_game',   winRate: 0.50, totalGames: 64  },
  { userId: 'fake-12',  name: 'Laura',       status: 'available', winRate: 0.66, totalGames: 95  },
  { userId: 'fake-13',  name: 'Mike',        status: 'pending',   winRate: 0.33, totalGames: 9   },
  { userId: 'fake-14',  name: 'Nina',        status: 'available', winRate: 0.88, totalGames: 247 },
  { userId: 'fake-15',  name: 'Oscar',       status: 'idle',      winRate: 0.57, totalGames: 41  },
  { userId: 'fake-16',  name: 'Paula',       status: 'available', winRate: 0.74, totalGames: 183 },
  { userId: 'fake-17',  name: 'Quinn',       status: 'in_game',   winRate: 0.42, totalGames: 36  },
  { userId: 'fake-18',  name: 'Rachel',      status: 'available', winRate: 0.80, totalGames: 220 },
  { userId: 'fake-19',  name: 'Samuel',      status: 'idle',      winRate: 0.48, totalGames: 55  },
  { userId: 'fake-20',  name: 'Tina',        status: 'available', winRate: 0.62, totalGames: 107 },
  { userId: 'fake-21',  name: 'Ulrich',      status: 'in_game',   winRate: 0.71, totalGames: 143 },
  { userId: 'fake-22',  name: 'Vera',        status: 'available', winRate: 0.58, totalGames: 67  },
  { userId: 'fake-23',  name: 'Walter',      status: 'idle',      winRate: 0.35, totalGames: 23  },
  { userId: 'fake-24',  name: 'Xena',        status: 'available', winRate: 0.85, totalGames: 189 },
  { userId: 'fake-25',  name: 'Yusuf',       status: 'pending',   winRate: 0.47, totalGames: 38  },
  { userId: 'fake-26',  name: 'Zara',        status: 'available', winRate: 0.69, totalGames: 112 },
  { userId: 'fake-27',  name: 'Aaron',       status: 'in_game',   winRate: 0.53, totalGames: 79  },
  { userId: 'fake-28',  name: 'Bella',       status: 'available', winRate: 0.76, totalGames: 165 },
  { userId: 'fake-29',  name: 'Carlos',      status: 'idle',      winRate: 0.41, totalGames: 31  },
  { userId: 'fake-30',  name: 'Daria',       status: 'available', winRate: 0.87, totalGames: 278 },
  { userId: 'fake-31',  name: 'Ethan',       status: 'in_game',   winRate: 0.60, totalGames: 98  },
  { userId: 'fake-32',  name: 'Freya',       status: 'available', winRate: 0.73, totalGames: 141 },
  { userId: 'fake-33',  name: 'Goran',       status: 'pending',   winRate: 0.36, totalGames: 14  },
  { userId: 'fake-34',  name: 'Helena',      status: 'available', winRate: 0.82, totalGames: 213 },
  { userId: 'fake-35',  name: 'Igor',        status: 'idle',      winRate: 0.49, totalGames: 44  },
  { userId: 'fake-36',  name: 'Jana',        status: 'available', winRate: 0.65, totalGames: 88  },
  { userId: 'fake-37',  name: 'Kai',         status: 'in_game',   winRate: 0.54, totalGames: 72  },
  { userId: 'fake-38',  name: 'Lena',        status: 'available', winRate: 0.79, totalGames: 197 },
  { userId: 'fake-39',  name: 'Marco',       status: 'idle',      winRate: 0.43, totalGames: 27  },
  { userId: 'fake-40',  name: 'Nadia',       status: 'available', winRate: 0.90, totalGames: 334 },
  { userId: 'fake-41',  name: 'Oliver',      status: 'in_game',   winRate: 0.56, totalGames: 81  },
  { userId: 'fake-42',  name: 'Petra',       status: 'available', winRate: 0.67, totalGames: 103 },
  { userId: 'fake-43',  name: 'Radu',        status: 'pending',   winRate: 0.31, totalGames: 8   },
  { userId: 'fake-44',  name: 'Sofia',       status: 'available', winRate: 0.84, totalGames: 256 },
  { userId: 'fake-45',  name: 'Tobias',      status: 'idle',      winRate: 0.46, totalGames: 35  },
  { userId: 'fake-46',  name: 'Uma',         status: 'available', winRate: 0.70, totalGames: 129 },
  { userId: 'fake-47',  name: 'Viktor',      status: 'in_game',   winRate: 0.63, totalGames: 117 },
  { userId: 'fake-48',  name: 'Wendy',       status: 'available', winRate: 0.78, totalGames: 174 },
  { userId: 'fake-49',  name: 'Xander',      status: 'idle',      winRate: 0.40, totalGames: 19  },
  { userId: 'fake-50',  name: 'Yuki',        status: 'available', winRate: 0.86, totalGames: 291 },
  { userId: 'fake-51',  name: 'Zoran',       status: 'in_game',   winRate: 0.52, totalGames: 61  },
  { userId: 'fake-52',  name: 'Amber',       status: 'available', winRate: 0.64, totalGames: 92  },
  { userId: 'fake-53',  name: 'Bruno',       status: 'pending',   winRate: 0.37, totalGames: 12  },
  { userId: 'fake-54',  name: 'Clara',       status: 'available', winRate: 0.81, totalGames: 208 },
  { userId: 'fake-55',  name: 'Denis',       status: 'idle',      winRate: 0.45, totalGames: 33  },
  { userId: 'fake-56',  name: 'Elena',       status: 'available', winRate: 0.75, totalGames: 158 },
  { userId: 'fake-57',  name: 'Filip',       status: 'in_game',   winRate: 0.59, totalGames: 86  },
  { userId: 'fake-58',  name: 'Gloria',      status: 'available', winRate: 0.89, totalGames: 317 },
  { userId: 'fake-59',  name: 'Haris',       status: 'idle',      winRate: 0.42, totalGames: 26  },
  { userId: 'fake-60',  name: 'Irena',       status: 'available', winRate: 0.68, totalGames: 121 },
  { userId: 'fake-61',  name: 'Jovan',       status: 'in_game',   winRate: 0.51, totalGames: 58  },
  { userId: 'fake-62',  name: 'Katia',       status: 'available', winRate: 0.77, totalGames: 169 },
  { userId: 'fake-63',  name: 'Luka',        status: 'pending',   winRate: 0.34, totalGames: 11  },
  { userId: 'fake-64',  name: 'Marta',       status: 'available', winRate: 0.83, totalGames: 234 },
  { userId: 'fake-65',  name: 'Nikola',      status: 'idle',      winRate: 0.47, totalGames: 39  },
  { userId: 'fake-66',  name: 'Olga',        status: 'available', winRate: 0.71, totalGames: 136 },
  { userId: 'fake-67',  name: 'Pavle',       status: 'in_game',   winRate: 0.55, totalGames: 75  },
  { userId: 'fake-68',  name: 'Rosa',        status: 'available', winRate: 0.80, totalGames: 225 },
  { userId: 'fake-69',  name: 'Stefan',      status: 'idle',      winRate: 0.44, totalGames: 30  },
  { userId: 'fake-70',  name: 'Tamara',      status: 'available', winRate: 0.87, totalGames: 263 },
  { userId: 'fake-71',  name: 'Uros',        status: 'in_game',   winRate: 0.61, totalGames: 94  },
  { userId: 'fake-72',  name: 'Valentina',   status: 'available', winRate: 0.73, totalGames: 147 },
  { userId: 'fake-73',  name: 'William',     status: 'pending',   winRate: 0.38, totalGames: 16  },
  { userId: 'fake-74',  name: 'Xiao',        status: 'available', winRate: 0.85, totalGames: 282 },
  { userId: 'fake-75',  name: 'Yana',        status: 'idle',      winRate: 0.50, totalGames: 48  },
  { userId: 'fake-76',  name: 'Zdravko',     status: 'available', winRate: 0.66, totalGames: 109 },
  { userId: 'fake-77',  name: 'Ana',         status: 'in_game',   winRate: 0.57, totalGames: 83  },
  { userId: 'fake-78',  name: 'Boris',       status: 'available', winRate: 0.76, totalGames: 178 },
  { userId: 'fake-79',  name: 'Chloe',       status: 'idle',      winRate: 0.43, totalGames: 22  },
  { userId: 'fake-80',  name: 'Drazen',      status: 'available', winRate: 0.92, totalGames: 341 },
  { userId: 'fake-81',  name: 'Eva',         status: 'in_game',   winRate: 0.54, totalGames: 69  },
  { userId: 'fake-82',  name: 'Franjo',      status: 'available', winRate: 0.69, totalGames: 126 },
  { userId: 'fake-83',  name: 'Gordana',     status: 'pending',   winRate: 0.32, totalGames: 7   },
  { userId: 'fake-84',  name: 'Hrvoje',      status: 'available', winRate: 0.81, totalGames: 216 },
  { userId: 'fake-85',  name: 'Ivana',       status: 'idle',      winRate: 0.46, totalGames: 37  },
  { userId: 'fake-86',  name: 'Josip',       status: 'available', winRate: 0.74, totalGames: 152 },
  { userId: 'fake-87',  name: 'Kristina',    status: 'in_game',   winRate: 0.62, totalGames: 101 },
  { userId: 'fake-88',  name: 'Leon',        status: 'available', winRate: 0.78, totalGames: 191 },
  { userId: 'fake-89',  name: 'Maja',        status: 'idle',      winRate: 0.41, totalGames: 24  },
  { userId: 'fake-90',  name: 'Nenad',       status: 'available', winRate: 0.88, totalGames: 307 },
  { userId: 'fake-91',  name: 'Oleg',        status: 'in_game',   winRate: 0.53, totalGames: 77  },
  { userId: 'fake-92',  name: 'Patricija',   status: 'available', winRate: 0.67, totalGames: 115 },
  { userId: 'fake-93',  name: 'Renata',      status: 'pending',   winRate: 0.36, totalGames: 13  },
  { userId: 'fake-94',  name: 'Srecko',      status: 'available', winRate: 0.84, totalGames: 244 },
  { userId: 'fake-95',  name: 'Tatjana',     status: 'idle',      winRate: 0.48, totalGames: 42  },
  { userId: 'fake-96',  name: 'Ugljesa',     status: 'available', winRate: 0.70, totalGames: 133 },
  { userId: 'fake-97',  name: 'Vesna',       status: 'in_game',   winRate: 0.58, totalGames: 89  },
  { userId: 'fake-98',  name: 'Zlatko',      status: 'available', winRate: 0.75, totalGames: 162 },
  { userId: 'fake-99',  name: 'Anja',        status: 'idle',      winRate: 0.44, totalGames: 28  },
  { userId: 'fake-100', name: 'Kresimir2',   status: 'available', winRate: 0.93, totalGames: 412 },
] as import('../composables/useSocket').LobbyPlayerPublic[]

const filteredPlayers = computed(() => {
  const all = [...props.lobbyPlayers, ...([] as typeof _FAKE_PLAYERS) /*, ..._FAKE_PLAYERS */]
  const byStatus = showAll.value ? all : all.filter(p => p.status === 'available')
  const q = lobbyFilter.value.trim().toLowerCase()
  if (!q) return byStatus
  return byStatus.filter(p => p.name.toLowerCase().startsWith(q))
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

const handleCreateRoom = () => emit('createRoom', resolvedName())

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

defineExpose({ showLobby, showAll })
</script>

<template>
  <!-- ── LOBBY VIEW ─────────────────────────────────────────────────────── -->
  <div v-if="showLobby" class="w-full flex flex-col gap-3" style="height: 55vh;">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-gray-800">Online Players</h2>
      <span v-if="lobbyTotal > 0" class="text-xs text-gray-400">{{ lobbyTotal }} online</span>
    </div>

    <!-- Available / All toggle -->
    <div class="flex rounded-lg overflow-hidden border border-gray-200 w-full">
      <button
        @click="showAll = false"
        class="flex-1 py-1 text-xs font-semibold transition-colors"
        :class="!showAll ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'"
      >Available</button>
      <button
        @click="showAll = true"
        class="flex-1 py-1 text-xs font-semibold transition-colors border-l border-gray-200"
        :class="showAll ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'"
      >All</button>
    </div>

    <!-- Filter -->
    <input
      :value="lobbyFilter"
      @input="lobbyFilter = ($event.target as HTMLInputElement).value"
      type="text"
      placeholder="Search players..."
      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
    />

    <!-- Scrollable player list -->
    <div class="rounded-lg border border-gray-200 overflow-y-auto flex-1">
      <!-- Not connected -->
      <div v-if="!isConnected" class="p-4 text-center text-orange-600 text-sm font-semibold">
        No connection — lobby unavailable
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredPlayers.length === 0" class="p-6 text-center text-gray-400 text-sm">
        {{ lobbyFilter ? 'No players match your search' : showAll ? 'No players online right now' : 'No available players right now' }}
      </div>

      <!-- Player rows -->
      <div
        v-for="player in filteredPlayers"
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
              · {{ (player.winRate * 100).toFixed(1) }}% ({{ player.totalGames }})
            </span>
          </div>
        </div>

        <!-- Challenge button -->
        <button
          v-if="player.status === 'available' && player.userId !== authenticatedUserId && authenticatedUserId && !outgoingChallenge"
          @click="$emit('challenge', player.userId)"
          class="text-xs px-3 py-1 rounded-full border border-blue-400 text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
        >
          Challenge
        </button>
      </div>
    </div>

    <!-- Sign-in banner -->
    <div v-if="!authenticatedUserId && isConnected" class="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
      <p class="text-sm text-blue-800">
        <button @click="$emit('showAuth')" class="font-semibold underline">Sign in</button>
        to appear in the lobby and challenge players.
      </p>
    </div>

    <!-- Outgoing challenge state -->
    <div v-if="outgoingChallenge" class="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-2">
      <div class="flex items-center gap-3">
        <div class="animate-pulse w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
        <p class="text-sm font-semibold text-blue-800">
          Waiting for <span class="font-bold">{{ outgoingChallenge.targetName }}</span> to respond…
        </p>
      </div>
      <button
        @click="$emit('cancelChallenge', outgoingChallenge.targetUserId)"
        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        Cancel Challenge
      </button>
    </div>

    <!-- Back button (always at bottom) -->
    <button
      @click="showLobby = false; lobbyFilter = ''; showAll = false"
      class="w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
        <path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/>
      </svg>
      Back
    </button>
  </div>

  <!-- ── MAIN MENU VIEW ─────────────────────────────────────────────────── -->
  <div v-else class="w-full space-y-3">
    <!-- Challenge error -->
    <div v-if="challengeError" class="p-3 bg-red-50 border-l-4 border-red-400 rounded-lg">
      <p class="text-sm text-red-700">{{ challengeError }}</p>
    </div>

    <!-- Main action buttons -->
    <div v-if="!showJoinForm && !showAIDifficulty && !outgoingChallenge" class="space-y-3">
      <!-- Lobby -->
      <button
        v-if="isConnected"
        @click="showLobby = true"
        class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md flex items-center justify-between"
      >
        <span class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor">
            <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-480-80h360v-6q0-37-70.5-60.5T480-410q-64 0-132 23t-68 61v6ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm0 320Zm0-360Z"/>
          </svg>
          Lobby
        </span>
        <span v-if="lobbyTotal > 0" class="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {{ lobbyTotal }} online
        </span>
      </button>

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
        @click="showAIDifficulty = true"
        class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Play vs AI
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

    <!-- Outgoing challenge waiting state (on main menu) -->
    <div v-if="outgoingChallenge" class="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-3">
      <div class="flex items-center gap-3">
        <div class="animate-pulse w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
        <p class="text-sm font-semibold text-blue-800">
          Waiting for <span class="font-bold">{{ outgoingChallenge.targetName }}</span> to respond…
        </p>
      </div>
      <button
        @click="$emit('cancelChallenge', outgoingChallenge.targetUserId)"
        class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        Cancel Challenge
      </button>
    </div>

    <!-- AI difficulty picker -->
    <div v-if="showAIDifficulty && !outgoingChallenge" class="space-y-3">
      <p class="text-sm font-semibold text-gray-700 text-center">Select AI Difficulty</p>
      <button
        @click="$emit('createAIGame', resolvedName(), 'beginner')"
        class="w-full bg-green-400 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Beginner
      </button>
      <button
        @click="$emit('createAIGame', resolvedName(), 'normal')"
        class="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Normal
      </button>
      <button
        @click="$emit('createAIGame', resolvedName(), 'expert')"
        class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
      >
        Expert
      </button>
      <button
        @click="showAIDifficulty = false"
        class="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        Cancel
      </button>
    </div>

    <!-- Join with code form -->
    <div v-if="showJoinForm && !outgoingChallenge" class="space-y-3">
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
