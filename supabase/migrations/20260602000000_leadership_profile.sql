-- Leadership profile assessment system

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS leadership_profile JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Existing users skip onboarding (they are already in the system)
UPDATE profiles SET onboarding_completed = TRUE;

CREATE TABLE IF NOT EXISTS leadership_assessments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE,
  answers    JSONB NOT NULL,
  result     JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leadership_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own assessment"
  ON leadership_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own assessment"
  ON leadership_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Coordinators and admins can read all assessments"
  ON leadership_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('coordinator', 'admin')
    )
  );
