import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Authentication features will be disabled.')
}

const FETCH_TIMEOUT_MS = 8000

function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id))
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: fetchWithTimeout,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})

// Database types
export interface Profile {
  id: string
  email: string
  username: string | null
  created_at: string
  updated_at: string
}

export interface GameResult {
  id: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_score: number
  player2_score: number
  early_win: boolean
  game_duration: number
  created_at: string
}

export interface LeaderboardEntry {
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
  // Glicko-2 rating fields (null = not yet rated / placement)
  rating: number | null
  rd: number | null
  vol: number | null
}
