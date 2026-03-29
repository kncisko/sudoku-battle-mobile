<script setup lang="ts">
import { ref, watch } from 'vue'
import { supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../lib/supabase'

interface Props {
  isOpen: boolean
  currentUserId?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const leaderboard = ref<LeaderboardEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedFilter = ref<'all' | 'week' | 'month'>('all')

// Fake entries for scroll testing — to disable, change the spread to ([] as typeof _FAKE_ENTRIES)
const _FAKE_ENTRIES: LeaderboardEntry[] = [
  { user_id: 'fake-1',  username: 'SudokuMaster',   email: 'fake1@test.com',  total_games: 42, wins: 35, losses: 5,  draws: 2, win_rate: 83.3, total_score: 3780, avg_score: 90.0 },
  { user_id: 'fake-2',  username: 'PuzzleKing',      email: 'fake2@test.com',  total_games: 38, wins: 30, losses: 6,  draws: 2, win_rate: 78.9, total_score: 3230, avg_score: 85.0 },
  { user_id: 'fake-3',  username: 'GridWarrior',     email: 'fake3@test.com',  total_games: 55, wins: 40, losses: 12, draws: 3, win_rate: 72.7, total_score: 4400, avg_score: 80.0 },
  { user_id: 'fake-4',  username: 'NumberNinja',     email: 'fake4@test.com',  total_games: 29, wins: 20, losses: 7,  draws: 2, win_rate: 69.0, total_score: 2320, avg_score: 80.0 },
  { user_id: 'fake-5',  username: 'LogicLord',       email: 'fake5@test.com',  total_games: 33, wins: 22, losses: 9,  draws: 2, win_rate: 66.7, total_score: 2640, avg_score: 80.0 },
  { user_id: 'fake-6',  username: 'CellChampion',    email: 'fake6@test.com',  total_games: 47, wins: 30, losses: 14, draws: 3, win_rate: 63.8, total_score: 3760, avg_score: 80.0 },
  { user_id: 'fake-7',  username: 'BoxBuster',       email: 'fake7@test.com',  total_games: 22, wins: 14, losses: 6,  draws: 2, win_rate: 63.6, total_score: 1760, avg_score: 80.0 },
  { user_id: 'fake-8',  username: 'RowRuler',        email: 'fake8@test.com',  total_games: 18, wins: 11, losses: 5,  draws: 2, win_rate: 61.1, total_score: 1440, avg_score: 80.0 },
  { user_id: 'fake-9',  username: 'ColConqueror',    email: 'fake9@test.com',  total_games: 25, wins: 15, losses: 8,  draws: 2, win_rate: 60.0, total_score: 2000, avg_score: 80.0 },
  { user_id: 'fake-10', username: 'SudokuSlayer',    email: 'fake10@test.com', total_games: 40, wins: 24, losses: 13, draws: 3, win_rate: 60.0, total_score: 3200, avg_score: 80.0 },
  { user_id: 'fake-11', username: 'GridGladiator',   email: 'fake11@test.com', total_games: 31, wins: 18, losses: 11, draws: 2, win_rate: 58.1, total_score: 2480, avg_score: 80.0 },
  { user_id: 'fake-12', username: 'PuzzleProdigy',   email: 'fake12@test.com', total_games: 27, wins: 15, losses: 10, draws: 2, win_rate: 55.6, total_score: 2160, avg_score: 80.0 },
  { user_id: 'fake-13', username: 'NumberCruncher',  email: 'fake13@test.com', total_games: 36, wins: 19, losses: 14, draws: 3, win_rate: 52.8, total_score: 2880, avg_score: 80.0 },
  { user_id: 'fake-14', username: 'LogicLegend',     email: 'fake14@test.com', total_games: 20, wins: 10, losses: 8,  draws: 2, win_rate: 50.0, total_score: 1600, avg_score: 80.0 },
  { user_id: 'fake-15', username: 'CellSolver',      email: 'fake15@test.com', total_games: 44, wins: 21, losses: 20, draws: 3, win_rate: 47.7, total_score: 3520, avg_score: 80.0 },
  { user_id: 'fake-16', username: 'BoxBreaker',      email: 'fake16@test.com', total_games: 15, wins: 7,  losses: 6,  draws: 2, win_rate: 46.7, total_score: 1200, avg_score: 80.0 },
  { user_id: 'fake-17', username: 'RowRanger',       email: 'fake17@test.com', total_games: 23, wins: 10, losses: 11, draws: 2, win_rate: 43.5, total_score: 1840, avg_score: 80.0 },
  { user_id: 'fake-18', username: 'ColCrusher',      email: 'fake18@test.com', total_games: 19, wins: 8,  losses: 9,  draws: 2, win_rate: 42.1, total_score: 1520, avg_score: 80.0 },
  { user_id: 'fake-19', username: 'SudokuSage',      email: 'fake19@test.com', total_games: 28, wins: 11, losses: 15, draws: 2, win_rate: 39.3, total_score: 2240, avg_score: 80.0 },
  { user_id: 'fake-20', username: 'GridGuru',        email: 'fake20@test.com', total_games: 12, wins: 4,  losses: 7,  draws: 1, win_rate: 33.3, total_score: 960,  avg_score: 80.0 },
]

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

const QUERY_TIMEOUT_MS = 10_000

const fetchLeaderboardData = async (): Promise<void> => {
  let query = supabase
    .from('game_results')
    .select('*')

  if (selectedFilter.value === 'week') {
    query = query.gte('created_at', getWeekStart().toISOString())
  } else if (selectedFilter.value === 'month') {
    query = query.gte('created_at', getMonthStart().toISOString())
  }

  const { data: gameResults, error: queryError } = await query

  if (queryError) throw queryError

  if (!gameResults || gameResults.length === 0) {
    leaderboard.value = []
    return
  }

  const userIds = new Set<string>()
  gameResults.forEach((game: any) => {
    if (game.player1_id) userIds.add(game.player1_id)
    if (game.player2_id) userIds.add(game.player2_id)
  })

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, email')
    .in('id', Array.from(userIds))

  if (profileError) throw profileError

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

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
    if (game.player1_id) {
      const p1Id = game.player1_id
      const p1Profile = profileMap.get(p1Id)
      if (p1Profile && !userStats.has(p1Id)) {
        userStats.set(p1Id, { user_id: p1Id, username: p1Profile.username || null, email: p1Profile.email, total_games: 0, wins: 0, losses: 0, draws: 0, win_rate: 0, total_score: 0, avg_score: 0 })
      }
      if (userStats.has(p1Id)) {
        const s = userStats.get(p1Id)!
        s.total_games++
        s.total_score += game.player1_score || 0
        if (game.winner_id === p1Id) s.wins++
        else if (game.winner_id === null) s.draws++
        else s.losses++
      }
    }
    if (game.player2_id) {
      const p2Id = game.player2_id
      const p2Profile = profileMap.get(p2Id)
      if (p2Profile && !userStats.has(p2Id)) {
        userStats.set(p2Id, { user_id: p2Id, username: p2Profile.username || null, email: p2Profile.email, total_games: 0, wins: 0, losses: 0, draws: 0, win_rate: 0, total_score: 0, avg_score: 0 })
      }
      if (userStats.has(p2Id)) {
        const s = userStats.get(p2Id)!
        s.total_games++
        s.total_score += game.player2_score || 0
        if (game.winner_id === p2Id) s.wins++
        else if (game.winner_id === null) s.draws++
        else s.losses++
      }
    }
  })

  const aggregatedStats = Array.from(userStats.values()).map(stats => ({
    ...stats,
    win_rate: stats.total_games > 0 ? Math.round((stats.wins / stats.total_games) * 100 * 100) / 100 : 0,
    avg_score: stats.total_games > 0 ? Math.round((stats.total_score / stats.total_games) * 100) / 100 : 0
  }))

  const combined = [...aggregatedStats, ..._FAKE_ENTRIES /*, ...([] as typeof _FAKE_ENTRIES) */]
  combined.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.win_rate - a.win_rate)

  leaderboard.value = combined.slice(0, 50)
}

const loadLeaderboard = async () => {
  loading.value = true
  error.value = null

  try {
    await Promise.race([
      fetchLeaderboardData(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), QUERY_TIMEOUT_MS)
      )
    ])
  } catch (err: any) {
    if (err.message === 'TIMEOUT') {
      error.value = 'Request timed out — tap Refresh to try again'
    } else {
      console.error('Error loading leaderboard:', err)
      error.value = 'Failed to load leaderboard'
    }
  } finally {
    loading.value = false
  }
}

// Reload whenever the modal is opened
watch(() => props.isOpen, (open) => {
  if (open) loadLeaderboard()
}, { immediate: true })

const getRankEmoji = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}.`
}

const closeModal = () => {
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-[70] flex items-center justify-center px-4 py-0">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="closeModal"></div>

      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col z-10">
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
              :disabled="loading"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="selectedFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              All Time
            </button>
            <button
              @click="selectedFilter = 'week'; loadLeaderboard()"
              :disabled="loading"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="selectedFilter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              This Week
            </button>
            <button
              @click="selectedFilter = 'month'; loadLeaderboard()"
              :disabled="loading"
              class="px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              class="flex items-center gap-3 p-3 rounded-lg transition-all"
              :class="entry.user_id === currentUserId ? 'bg-blue-50 border-2 border-blue-500 shadow-md' : index === 0 ? 'bg-amber-50 border-2 border-amber-400' : index === 1 ? 'bg-slate-100 border-2 border-slate-400' : index === 2 ? 'bg-orange-50 border-2 border-orange-500' : 'bg-gray-50'"
            >
              <!-- Rank -->
              <div class="text-xl font-bold w-10 text-center flex-shrink-0">
                {{ getRankEmoji(index + 1) }}
              </div>

              <!-- Name + stats -->
              <div class="flex-1 min-w-0">
                <!-- Line 1: name + win rate -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <p class="font-semibold text-gray-800 truncate">
                      {{ entry.username || entry.email.split('@')[0] }}
                    </p>
                    <span v-if="entry.user_id === currentUserId" class="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
                  </div>
                  <p class="text-sm font-bold text-purple-600 flex-shrink-0">{{ entry.win_rate.toFixed(1) }}%</p>
                </div>
                <!-- Line 2: wins + games -->
                <div class="flex items-center gap-3 mt-0.5">
                  <span class="text-xs text-gray-500"><span class="font-semibold text-green-600">{{ entry.wins }}</span> wins</span>
                  <span class="text-xs text-gray-500"><span class="font-semibold text-blue-600">{{ entry.total_games }}</span> games</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            @click="loadLeaderboard"
            :disabled="loading"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {{ loading ? 'Loading...' : '🔄 Refresh Leaderboard' }}
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
