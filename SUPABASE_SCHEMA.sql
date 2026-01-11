-- Supabase Database Schema for Sudoku Battle
-- Run these SQL commands in your Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends the built-in auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table
-- Allow users to read all profiles (for leaderboard)
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (new.id, new.email, NULL);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. GAME RESULTS TABLE
-- ============================================
-- Stores results of PvP games (AI games are not tracked)
CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  early_win BOOLEAN DEFAULT FALSE,
  game_duration INTEGER NOT NULL, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: player1 and player2 must be different
  CONSTRAINT different_players CHECK (player1_id != player2_id),
  -- Constraint: winner must be one of the players or null (tie)
  CONSTRAINT valid_winner CHECK (
    winner_id IS NULL OR
    winner_id = player1_id OR
    winner_id = player2_id
  )
);

-- Enable Row Level Security
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Policies for game_results table
-- Allow everyone to read game results (for leaderboard)
CREATE POLICY "Game results are viewable by everyone"
  ON public.game_results FOR SELECT
  USING (true);

-- Only allow the server to insert game results
-- In production, you'd use a service role key from the backend
CREATE POLICY "Authenticated users can insert game results"
  ON public.game_results FOR INSERT
  WITH CHECK (auth.uid() IN (player1_id, player2_id));

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_results_player1 ON public.game_results(player1_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player2 ON public.game_results(player2_id);
CREATE INDEX IF NOT EXISTS idx_game_results_winner ON public.game_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_game_results_created_at ON public.game_results(created_at DESC);

-- ============================================
-- 3. LEADERBOARD VIEW
-- ============================================
-- Materialized view for efficient leaderboard queries
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  p.id as user_id,
  p.username,
  p.email,
  COUNT(gr.id) as total_games,
  COUNT(CASE WHEN gr.winner_id = p.id THEN 1 END) as wins,
  COUNT(CASE WHEN gr.winner_id IS NOT NULL AND gr.winner_id != p.id THEN 1 END) as losses,
  COUNT(CASE WHEN gr.winner_id IS NULL THEN 1 END) as draws,
  CASE
    WHEN COUNT(gr.id) > 0 THEN
      ROUND((COUNT(CASE WHEN gr.winner_id = p.id THEN 1 END)::NUMERIC / COUNT(gr.id)::NUMERIC) * 100, 2)
    ELSE 0
  END as win_rate,
  COALESCE(SUM(CASE WHEN gr.player1_id = p.id THEN gr.player1_score ELSE gr.player2_score END), 0) as total_score,
  CASE
    WHEN COUNT(gr.id) > 0 THEN
      ROUND(COALESCE(SUM(CASE WHEN gr.player1_id = p.id THEN gr.player1_score ELSE gr.player2_score END), 0)::NUMERIC / COUNT(gr.id)::NUMERIC, 2)
    ELSE 0
  END as avg_score
FROM
  public.profiles p
LEFT JOIN
  public.game_results gr ON (p.id = gr.player1_id OR p.id = gr.player2_id)
GROUP BY
  p.id, p.username, p.email
HAVING
  COUNT(gr.id) > 0
ORDER BY
  wins DESC, win_rate DESC, total_score DESC;

-- Grant access to the view
GRANT SELECT ON public.leaderboard TO authenticated;
GRANT SELECT ON public.leaderboard TO anon;

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. ENABLE REALTIME (OPTIONAL)
-- ============================================
-- Enable realtime for leaderboard updates (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.game_results;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
