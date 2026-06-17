CREATE TABLE suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('bug', 'idea', 'queja', 'otro')),
  message text NOT NULL,
  page_url text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own suggestions"
  ON suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and coordinators can view all suggestions"
  ON suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Admins and coordinators can update suggestions"
  ON suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
    )
  );
