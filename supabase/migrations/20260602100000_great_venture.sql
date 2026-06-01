CREATE TABLE IF NOT EXISTS great_ventures (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  meta_nucleo TEXT,
  creencias   TEXT,
  paradigma   TEXT,
  equipo      JSONB DEFAULT '[]',
  planes      JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE great_ventures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own venture" ON great_ventures
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Coordinators can read ventures" ON great_ventures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('coordinator', 'admin')
    )
  );
