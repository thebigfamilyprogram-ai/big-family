-- ── Activity feed ──────────────────────────────────────────────────────────────
-- Old policy allowed ANY authenticated user to read ALL activity.
-- New: restrict to authenticated users only (still broad, but explicit intent).
-- Future improvement: filter by school_id.
DROP POLICY IF EXISTS "activity_feed_select" ON activity_feed;
DROP POLICY IF EXISTS "feed_select" ON activity_feed;

CREATE POLICY "activity_feed_authenticated_select" ON activity_feed
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── Calendar events ────────────────────────────────────────────────────────────
-- Old policy: USING(true) — all events visible to all authenticated users.
-- New: global events (school_id IS NULL) + events for user's own school.
DROP POLICY IF EXISTS "calendar_events_select" ON calendar_events;
DROP POLICY IF EXISTS "calendar_select" ON calendar_events;

CREATE POLICY "calendar_events_school_select" ON calendar_events
  FOR SELECT USING (
    school_id IS NULL OR
    school_id = (
      SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- ── Project reactions ──────────────────────────────────────────────────────────
-- Old policy: USING(true) — all reactions visible to all authenticated users.
-- New: visible if the user owns the project OR has coordinator/admin role.
DROP POLICY IF EXISTS "project_reactions_select" ON project_reactions;
DROP POLICY IF EXISTS "reactions_select" ON project_reactions;

CREATE POLICY "project_reactions_scoped_select" ON project_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
      AND (
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role IN ('coordinator', 'admin')
        )
      )
    )
  );
