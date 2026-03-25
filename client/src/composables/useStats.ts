import { ref } from 'vue'
import { supabase } from '../lib/supabase'

interface UserStats {
  totalGames: number
  wins: number
  losses: number
  draws: number
  winRate: number
}

export function useStats() {
  const stats = ref<UserStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadStats = async (userId: string) => {
    try {
      loading.value = true
      error.value = null

      const { data, error: queryError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (queryError) {
        // User might not have any games yet
        if (queryError.code === 'PGRST116') {
          stats.value = {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0
          }
          return
        }
        throw queryError
      }

      stats.value = {
        totalGames: data.total_games,
        wins: data.wins,
        losses: data.losses,
        draws: data.draws,
        winRate: data.win_rate
      }
    } catch (err: any) {
      console.error('Error loading stats:', err)
      error.value = 'Failed to load stats'
    } finally {
      loading.value = false
    }
  }

  const saveGameResult = async (gameData: {
    player1_id: string
    player2_id: string
    winner_id: string | null
    player1_score: number
    player2_score: number
    early_win: boolean
    game_duration: number
  }) => {
    try {
      const { error: insertError } = await supabase
        .from('game_results')
        .insert([{
          player1_id: gameData.player1_id,
          player2_id: gameData.player2_id,
          winner_id: gameData.winner_id,
          player1_score: gameData.player1_score,
          player2_score: gameData.player2_score,
          early_win: gameData.early_win,
          game_duration: gameData.game_duration
        }])

      if (insertError) {
        console.error('Failed to save game result:', insertError.code, insertError.message)
      }
    } catch (err: any) {
      console.error('Exception saving game result:', err?.message || err)
    }
  }

  return {
    stats,
    loading,
    error,
    loadStats,
    saveGameResult
  }
}
