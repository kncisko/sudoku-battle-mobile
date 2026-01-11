<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Profile } from '../lib/supabase'

interface Props {
  profile: Profile | null
  stats: {
    totalGames: number
    wins: number
    losses: number
    draws: number
    winRate: number
  } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updateUsername: [username: string]
  signOut: []
  close: []
}>()

const editingUsername = ref(false)
const newUsername = ref('')
const error = ref<string | null>(null)

const displayName = computed(() => {
  if (props.profile?.username) return props.profile.username
  return props.profile?.email.split('@')[0] || 'User'
})

const startEditingUsername = () => {
  newUsername.value = props.profile?.username || ''
  editingUsername.value = true
  error.value = null
}

const cancelEditingUsername = () => {
  editingUsername.value = false
  newUsername.value = ''
  error.value = null
}

const saveUsername = () => {
  if (!newUsername.value.trim()) {
    error.value = 'Username cannot be empty'
    return
  }

  if (newUsername.value.length < 3 || newUsername.value.length > 20) {
    error.value = 'Username must be between 3 and 20 characters'
    return
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(newUsername.value)) {
    error.value = 'Username can only contain letters, numbers, dashes, and underscores'
    return
  }

  emit('updateUsername', newUsername.value.trim())
  editingUsername.value = false
}

const handleSignOut = () => {
  emit('signOut')
  emit('close')
}
</script>

<template>
  <div class="bg-white rounded-lg p-6 shadow-lg">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold text-gray-800">Your Profile</h3>
      <button
        @click="emit('close')"
        class="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span class="text-2xl">×</span>
      </button>
    </div>

    <!-- Profile Info -->
    <div class="space-y-4 mb-6">
      <!-- Avatar -->
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span class="text-2xl font-bold text-white">
            {{ displayName.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="flex-1">
          <!-- Username -->
          <div v-if="!editingUsername" class="flex items-center gap-2">
            <p class="text-lg font-semibold text-gray-800">{{ displayName }}</p>
            <button
              @click="startEditingUsername"
              class="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Edit
            </button>
          </div>
          <div v-else class="space-y-2">
            <input
              v-model="newUsername"
              type="text"
              placeholder="Enter username..."
              class="w-full px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="saveUsername"
              @keyup.esc="cancelEditingUsername"
            />
            <div class="flex gap-2">
              <button
                @click="saveUsername"
                class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              >
                Save
              </button>
              <button
                @click="cancelEditingUsername"
                class="text-xs bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded"
              >
                Cancel
              </button>
            </div>
            <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
          </div>
          <p class="text-sm text-gray-600">{{ profile?.email }}</p>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="mb-6">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">Your Stats</h4>
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-blue-50 rounded-lg p-3 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.totalGames }}</p>
          <p class="text-xs text-gray-600">Total Games</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3 text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.wins }}</p>
          <p class="text-xs text-gray-600">Wins</p>
        </div>
        <div class="bg-red-50 rounded-lg p-3 text-center">
          <p class="text-2xl font-bold text-red-600">{{ stats.losses }}</p>
          <p class="text-xs text-gray-600">Losses</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-3 text-center">
          <p class="text-2xl font-bold text-purple-600">{{ stats.winRate.toFixed(1) }}%</p>
          <p class="text-xs text-gray-600">Win Rate</p>
        </div>
      </div>
    </div>

    <!-- Sign Out Button -->
    <button
      @click="handleSignOut"
      class="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
    >
      Sign Out
    </button>
  </div>
</template>
