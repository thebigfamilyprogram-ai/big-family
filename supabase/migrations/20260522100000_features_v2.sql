-- ── Feature tables: Goals, Reactions, Calendar, Announcements, Feed, Success Stories ──────────

-- ── 1. METAS PERSONALES ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users NOT NULL,
  title       text NOT NULL,
  description text,
  type        text NOT NULL,            -- 'personal' | 'program'
  status      text DEFAULT 'active',    -- 'active' | 'completed' | 'expired'
  due_date    date,
  xp_reward   integer DEFAULT 50,
  completed_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_templates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text,
  xp_reward   integer DEFAULT 50,
  created_by  uuid REFERENCES auth.users,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_templates ENABLE ROW LEVEL SECURITY;

-- Students can manage their own goals
DROP POLICY IF EXISTS goals_select_own   ON goals;
DROP POLICY IF EXISTS goals_insert_own   ON goals;
DROP POLICY IF EXISTS goals_update_own   ON goals;
DROP POLICY IF EXISTS goals_coord_select ON goals;

CREATE POLICY goals_select_own   ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY goals_insert_own   ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY goals_update_own   ON goals FOR UPDATE USING (auth.uid() = user_id);

-- Coordinators and admin can read all goals (via join or direct query)
CREATE POLICY goals_coord_select ON goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('coordinator','admin')
    )
  );

-- Goal templates
DROP POLICY IF EXISTS templates_all_select ON goal_templates;
DROP POLICY IF EXISTS templates_admin_write ON goal_templates;

CREATE POLICY templates_all_select  ON goal_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY templates_admin_write ON goal_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ── 2. PROJECT REACTIONS ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_reactions (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects NOT NULL,
  user_id    uuid REFERENCES auth.users NOT NULL,
  emoji      text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id, emoji)
);

ALTER TABLE project_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reactions_select ON project_reactions;
DROP POLICY IF EXISTS reactions_insert ON project_reactions;
DROP POLICY IF EXISTS reactions_delete ON project_reactions;

CREATE POLICY reactions_select ON project_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY reactions_insert ON project_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY reactions_delete ON project_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 3. CALENDAR EVENTS ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  description  text,
  location     text,
  meeting_link text,
  event_date   date NOT NULL,
  event_time   time,
  end_date     date,
  end_time     time,
  created_by   uuid REFERENCES auth.users NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_select ON calendar_events;
DROP POLICY IF EXISTS calendar_write  ON calendar_events;

CREATE POLICY calendar_select ON calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY calendar_write  ON calendar_events FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coordinator','admin'))
  );

-- ── 4. ANNOUNCEMENTS ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  content     text NOT NULL,
  category    text NOT NULL,   -- 'Operativo' | 'Motivacional' | 'Evento' | 'Logro'
  target      text DEFAULT 'all',  -- 'all' | school_id
  expires_at  timestamptz,
  created_by  uuid REFERENCES auth.users NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcement_reads (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users NOT NULL,
  announcement_id  uuid REFERENCES announcements NOT NULL,
  read_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

ALTER TABLE announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ann_select       ON announcements;
DROP POLICY IF EXISTS ann_write        ON announcements;
DROP POLICY IF EXISTS ann_reads_insert ON announcement_reads;
DROP POLICY IF EXISTS ann_reads_select ON announcement_reads;

CREATE POLICY ann_select ON announcements FOR SELECT TO authenticated
  USING (
    target = 'all'
    OR target = (SELECT school_id::text FROM profiles WHERE profiles.id = auth.uid() LIMIT 1)
  );

CREATE POLICY ann_write ON announcements FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coordinator','admin'))
  );

CREATE POLICY ann_reads_select ON announcement_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ann_reads_insert ON announcement_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── 5. ACTIVITY FEED ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_feed (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  type       text NOT NULL,  -- 'module_completed' | 'project_submitted' | 'badge_earned' | 'certified' | 'goal_completed'
  metadata   jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_select ON activity_feed;
DROP POLICY IF EXISTS feed_insert ON activity_feed;

CREATE POLICY feed_select ON activity_feed FOR SELECT TO authenticated USING (true);
CREATE POLICY feed_insert ON activity_feed FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── 6. SUCCESS STORIES ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS success_stories (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   uuid REFERENCES projects,
  student_id   uuid REFERENCES auth.users NOT NULL,
  title        text NOT NULL,
  story        text NOT NULL,
  cover_url    text,
  school_id    uuid REFERENCES schools,
  nominated_by uuid REFERENCES auth.users,
  published    bool DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE success_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stories_public_select ON success_stories;
DROP POLICY IF EXISTS stories_auth_insert   ON success_stories;
DROP POLICY IF EXISTS stories_coord_manage  ON success_stories;

CREATE POLICY stories_public_select ON success_stories FOR SELECT USING (published = true);
CREATE POLICY stories_auth_insert   ON success_stories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY stories_coord_manage  ON success_stories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coordinator','admin'))
  );
