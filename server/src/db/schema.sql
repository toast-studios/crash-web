-- === HeatWave PvP — PostgreSQL Schema ===
-- Run this in your Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  balance INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own display_name
CREATE POLICY "Users can update own display name"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for server-side operations)
-- (Service role bypasses RLS by default)

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds NUMERIC(8, 2) NOT NULL,
  heat_at_end NUMERIC(5, 2) NOT NULL DEFAULT 100,
  player_count INTEGER NOT NULL DEFAULT 10
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Anyone can read matches
CREATE POLICY "Matches are publicly readable"
  ON public.matches FOR SELECT
  USING (true);

-- Match players table
CREATE TABLE IF NOT EXISTS public.match_players (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  rank INTEGER,
  score NUMERIC(8, 2),
  prize INTEGER NOT NULL DEFAULT 0,
  exit_time NUMERIC(8, 2),
  status TEXT NOT NULL CHECK (status IN ('alive', 'exited', 'bust')),
  boosts_used INTEGER NOT NULL DEFAULT 0,
  cools_used INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- Users can see their own match results and bots
CREATE POLICY "Users can read own match results"
  ON public.match_players FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_bot = true
    OR user_id IS NULL
  );

-- Index for querying user match history
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON public.match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON public.match_players(match_id);

-- Atomic balance deduction with row-level lock
CREATE OR REPLACE FUNCTION public.deduct_balance(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_bal INTEGER;
BEGIN
  -- Lock the row
  SELECT balance INTO current_bal
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF current_bal IS NULL THEN
    RETURN false;
  END IF;

  IF current_bal < p_amount THEN
    RETURN false;
  END IF;

  UPDATE public.users
  SET balance = balance - p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

-- Simple credit function
CREATE OR REPLACE FUNCTION public.credit_balance(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET balance = balance + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Trigger: auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard AS
SELECT
  u.id AS user_id,
  u.display_name,
  COUNT(mp.id) AS total_matches,
  COUNT(CASE WHEN mp.rank <= 3 THEN 1 END) AS top3_finishes,
  COALESCE(SUM(mp.prize), 0) AS total_winnings,
  MIN(mp.rank) AS best_rank,
  u.balance AS current_balance
FROM public.users u
LEFT JOIN public.match_players mp ON mp.user_id = u.id AND mp.is_bot = false
GROUP BY u.id, u.display_name, u.balance
ORDER BY total_winnings DESC;

-- Index for fast leaderboard queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user_id ON public.leaderboard(user_id);

-- Refresh leaderboard (call periodically or after matches)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard;
