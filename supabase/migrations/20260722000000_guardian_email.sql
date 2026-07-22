-- Guardian contact for junior students (grades 2–7) + grade storage

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade          SMALLINT,
  ADD COLUMN IF NOT EXISTS guardian_email TEXT;

-- Both columns are intentionally nullable:
-- grade is null for coordinators, expositors, and pre-migration students
-- guardian_email is null for seniors and pre-migration juniors
-- Application-level validation enforces guardian_email when grade 2–7
