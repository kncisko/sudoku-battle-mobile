<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../lib/supabase'

interface Props {
  isOpen: boolean
  currentUserId?: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const leaderboard = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedFilter = ref<'all' | 'week' | 'month'>('all')

// Helper functions for date calculations
const getWeekStart = (): Date => {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday = 0
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

const getMonthStart = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
}

const loadLeaderboard = async () => {
  try {
    loading.value = true
    error.value = null

    // Query game_results with time filter and aggregate client-side
    let query = supabase
      .from('game_results')
      .select('*')

    // Apply time filter
    if (selectedFilter.value === 'week') {
      const weekStart = getWeekStart()
      query = query.gte('created_at', weekStart.toISOString())
    } else if (selectedFilter.value === 'month') {
      const monthStart = getMonthStart()
      query = query.gte('created_at', monthStart.toISOString())
    }

    const { data: gameResults, error: queryError } = await query

    if (queryError) {
      console.error('Supabase query error:', queryError)
      throw queryError
    }

    if (!gameResults || gameResults.length === 0) {
      leaderboard.value = []
      return
    }

    // Fetch unique user IDs
    const userIds = new Set<string>()
    gameResults.forEach((game: any) => {
      if (game.player1_id) userIds.add(game.player1_id)
      if (game.player2_id) userIds.add(game.player2_id)
    })

    // Fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .in('id', Array.from(userIds))

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      throw profileError
    }

    // Create a map of user profiles
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Aggregate results client-side
    const userStats = new Map<string, {
      user_id: string
      username: string | null
      email: string
      total_games: number
      wins: number
      losses: number
      draws: number
      win_rate: number
      total_score: number
      avg_score: number
    }>()

    gameResults.forEach((game: any) => {
      // Process player 1
      if (game.player1_id) {
        const p1Id = game.player1_id
        const p1Profile = profileMap.get(p1Id)
        if (p1Profile && !userStats.has(p1Id)) {
          userStats.set(p1Id, {
            user_id: p1Id,
            username: p1Profile.username || null,
            email: p1Profile.email,
            total_games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            win_rate: 0,
            total_score: 0,
            avg_score: 0
          })
        }
        if (userStats.has(p1Id)) {
          const p1Stats = userStats.get(p1Id)!
          p1Stats.total_games++
          p1Stats.total_score += game.player1_score || 0
          if (game.winner_id === p1Id) p1Stats.wins++
          else if (game.winner_id === null) p1Stats.draws++
          else p1Stats.losses++
        }
      }

      // Process player 2
      if (game.player2_id) {
        const p2Id = game.player2_id
        const p2Profile = profileMap.get(p2Id)
        if (p2Profile && !userStats.has(p2Id)) {
          userStats.set(p2Id, {
            user_id: p2Id,
            username: p2Profile.username || null,
            email: p2Profile.email,
            total_games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            win_rate: 0,
            total_score: 0,
            avg_score: 0
          })
        }
        if (userStats.has(p2Id)) {
          const p2Stats = userStats.get(p2Id)!
          p2Stats.total_games++
          p2Stats.total_score += game.player2_score || 0
          if (game.winner_id === p2Id) p2Stats.wins++
          else if (game.winner_id === null) p2Stats.draws++
          else p2Stats.losses++
        }
      }
    })

    // Calculate win rates and avg scores, then convert to array
    const aggregatedStats = Array.from(userStats.values()).map(stats => ({
      ...stats,
      win_rate: stats.total_games > 0
        ? Math.round((stats.wins / stats.total_games) * 100 * 100) / 100
        : 0,
      avg_score: stats.total_games > 0
        ? Math.round((stats.total_score / stats.total_games) * 100) / 100
        : 0
    }))

    // Sort by wins DESC, then win_rate DESC
    aggregatedStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.win_rate - a.win_rate
    })

    leaderboard.value = aggregatedStats.slice(0, 50)
  } catch (err: any) {
    console.error('Error loading leaderboard:', err)
    error.value = 'Failed to load leaderboard'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLeaderboard()
})

const getRankEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="closeModal"></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col z-10">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">🏆 Leaderboard</h2>
            <p class="text-sm text-gray-600 mt-1">Top Players - PvP Games Only</p>
          </div>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span class="text-2xl">×</span>
          </button>
        </div>

        <!-- Time Filter Buttons -->
        <div class="px-6 pt-4 pb-2 border-b border-gray-200">
          <div class="flex gap-2 justify-center">
            <button
              @click="selectedFilter = 'all'; loadLeaderboard()"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              :class="selectedFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              All Time
            </button>
            <button
              @click="selectedFilter = 'week'; loadLeaderboard()"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              :class="selectedFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              This Week
            </button>
            <button
              @click="selectedFilter = 'month'; loadLeaderboard()"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
              :class="selectedFilter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              This Month
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Loading State -->
          <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="leaderboard.length === 0" class="text-center py-12">
            <p class="text-gray-600 mb-2">No games played yet!</p>
            <p class="text-sm text-gray-500">Be the first to compete and claim the top spot.</p>
          </div>

          <!-- Leaderboard Table -->
          <div v-else class="space-y-2">
            <div
              v-for="(entry, index) in leaderboard"
              :key="entry.user_id"
              class="flex items-center gap-4 p-4 rounded-lg transition-all"
              :class="entry.user_id === currentUserId ? 'bg-blue-50 border-2 border-blue-500 shadow-md' : 'bg-gray-50 hover:bg-gray-100'"
            >
              <!-- Rank -->
              <div class="text-2xl font-bold w-12 text-center">
                {{ getRankEmoji(index + 1) }}
              </div>

              <!-- Player Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-gray-800 truncate">
                    {{ entry.username || entry.email.split('@')[0] }}
                  </p>
                  <span v-if="entry.user_id === currentUserId" class="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    You
                  </span>
                </div>
                <p class="text-xs text-gray-500 truncate">{{ entry.email }}</p>
              </div>

              <!-- Stats -->
              <div class="flex gap-6 text-center">
                <div>
                  <p class="text-lg font-bold text-green-600">{{ entry.wins }}</p>
                  <p class="text-xs text-gray-600">Wins</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-blue-600">{{ entry.total_games }}</p>
                  <p class="text-xs text-gray-600">Games</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-purple-600">{{ entry.win_rate.toFixed(1) }}%</p>
                  <p class="text-xs text-gray-600">Win Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            @click="loadLeaderboard"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            🔄 Refresh Leaderboard
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>
