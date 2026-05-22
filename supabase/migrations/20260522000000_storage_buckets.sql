-- Storage buckets for Big Family
-- Run in Supabase Dashboard → SQL Editor if buckets need to be recreated.
-- Buckets are also created via the Storage REST API (POST /storage/v1/bucket).

-- ── Create buckets (public, 50 MB limit) ─────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('news-images',    'news-images',    true, 52428800),
  ('project-images', 'project-images', true, 52428800),
  ('project-pdfs',   'project-pdfs',   true, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public          = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- ── RLS policies — news-images ────────────────────────────────────────────────
-- Public buckets handle SELECT automatically; only INSERT/DELETE need policies.

DROP POLICY IF EXISTS news_images_insert ON storage.objects;
CREATE POLICY news_images_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-images');

DROP POLICY IF EXISTS news_images_delete ON storage.objects;
CREATE POLICY news_images_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'news-images');

-- ── RLS policies — project-images ─────────────────────────────────────────────

DROP POLICY IF EXISTS project_images_insert ON storage.objects;
CREATE POLICY project_images_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS project_images_delete ON storage.objects;
CREATE POLICY project_images_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-images');

-- ── RLS policies — project-pdfs ───────────────────────────────────────────────

DROP POLICY IF EXISTS project_pdfs_insert ON storage.objects;
CREATE POLICY project_pdfs_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-pdfs');

DROP POLICY IF EXISTS project_pdfs_delete ON storage.objects;
CREATE POLICY project_pdfs_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-pdfs');
