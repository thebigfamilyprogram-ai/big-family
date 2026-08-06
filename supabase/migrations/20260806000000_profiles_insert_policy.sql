-- Diagnosed live (Sesión 23): even with an active session (auth.uid() = id being
-- inserted), INSERT into profiles was rejected with 42501 "new row violates row-level
-- security policy". This means profiles has RLS enabled but no working permissive
-- INSERT policy for the 'authenticated' role — independent of the "Confirm email"
-- issue fixed separately. Policies are OR'd together for permissive policies, so
-- adding this one is safe regardless of what other (possibly broken) policies exist
-- on the table already.
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
