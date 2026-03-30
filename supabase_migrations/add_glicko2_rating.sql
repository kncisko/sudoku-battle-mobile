-- Add Glicko-2 rating columns to profiles table
-- Run this in the Supabase SQL Editor before deploying the server update.
--
-- rating  — skill estimate (starts at 1500 for all existing players)
-- rd      — Rating Deviation: confidence in the rating (starts high = uncertain)
-- vol     — Volatility: how erratic the player's results are

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS rating FLOAT8 NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS rd     FLOAT8 NOT NULL DEFAULT 350,
  ADD COLUMN IF NOT EXISTS vol    FLOAT8 NOT NULL DEFAULT 0.06;
