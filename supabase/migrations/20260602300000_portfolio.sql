-- Portfolio public settings and username
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username                  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portfolio_public          BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS portfolio_show_capstone   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS portfolio_show_great_venture BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS portfolio_show_xp         BOOLEAN DEFAULT TRUE;

-- Unique partial index for non-null usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username
  ON profiles(username) WHERE username IS NOT NULL;

-- Allow public reads of portfolio data when portfolio_public = true
-- Note: existing RLS on profiles allows SELECT using (true) for basic fields
-- Additional tables (progress, xp_log, great_ventures) may need policy updates
-- depending on current RLS configuration. Adjust as needed per security review.
