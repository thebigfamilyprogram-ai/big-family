-- Admin-created events with multi-school/role targeting + RSVP tracking.
-- `meeting_link`, `location`, `created_by` already exist on calendar_events
-- (see 20260522100000_features_v2.sql) — only the audience/recurrence columns are new.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS audience_schools UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audience_roles TEXT[] DEFAULT '{student,coordinator}',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_interval_days INTEGER;

-- calendar_write policy (FOR ALL, coordinator/admin) already covers INSERT here.

CREATE TABLE IF NOT EXISTS event_rsvps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('confirmed', 'declined', 'pending')),
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rsvps" ON event_rsvps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rsvp" ON event_rsvps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rsvp" ON event_rsvps
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin client (service role) bypasses RLS for the bulk "pending" rows created
-- at event-creation time — this policy covers admin reads/writes via the anon key too.
CREATE POLICY "Admin manages all rsvps" ON event_rsvps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user_id ON event_rsvps(user_id);
