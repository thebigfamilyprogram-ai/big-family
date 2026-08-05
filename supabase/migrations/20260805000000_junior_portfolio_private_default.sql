-- Junior students (grade 2-7) get a private portfolio by default; senior (grade 8-11)
-- keeps the existing public-by-default behavior. Application code now sets
-- portfolio_public at profile-creation time based on derived level; this migration
-- corrects existing junior profiles that were created before this distinction existed
-- (they were all set to portfolio_public = true regardless of age, per the previous
-- column-level DEFAULT TRUE in 20260602300000_portfolio.sql).
--
-- No audit trail exists to distinguish "never touched the toggle" from "manually set
-- to public on purpose" (profiles has no updated_at column, no settings-change log).
-- Protecting minors' data by default outweighs preserving a state that may have been
-- accidental from the start, so this applies to ALL junior profiles unconditionally.
UPDATE profiles
SET portfolio_public = false
WHERE grade IS NOT NULL
  AND grade BETWEEN 2 AND 7
  AND portfolio_public IS DISTINCT FROM false;
