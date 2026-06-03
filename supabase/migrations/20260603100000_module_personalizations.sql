CREATE TABLE IF NOT EXISTS module_personalizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users ON DELETE CASCADE,
  module_id     UUID,
  reflexiones   JSONB,
  entregable    TEXT,
  autoevaluacion JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE module_personalizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own personalizations"
  ON module_personalizations
  FOR ALL USING (auth.uid() = user_id);
