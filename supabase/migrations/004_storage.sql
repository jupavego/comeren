-- ============================================================
-- 004_storage.sql
-- Buckets de Storage y sus políticas — Come en Girardota
-- Ejecutar después de 003_triggers.sql
-- ============================================================

-- ── Crear buckets ────────────────────────────────────────────
-- avatars: fotos de perfil de usuarios
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

-- accounts: logos y portadas de negocios
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounts', 'accounts', TRUE)
ON CONFLICT (id) DO NOTHING;

-- catalog: imágenes de productos del catálogo
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Limpiar políticas anteriores ────────────────────────────
DROP POLICY IF EXISTS "avatars_select_public"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"      ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"      ON storage.objects;
DROP POLICY IF EXISTS "accounts_select_public"  ON storage.objects;
DROP POLICY IF EXISTS "accounts_insert_own"     ON storage.objects;
DROP POLICY IF EXISTS "accounts_update_own"     ON storage.objects;
DROP POLICY IF EXISTS "accounts_delete_own"     ON storage.objects;
DROP POLICY IF EXISTS "catalog_select_public"   ON storage.objects;
DROP POLICY IF EXISTS "catalog_insert_own"      ON storage.objects;
DROP POLICY IF EXISTS "catalog_update_own"      ON storage.objects;
DROP POLICY IF EXISTS "catalog_delete_own"      ON storage.objects;

-- ════════════════════════════════════════════════════════════
-- BUCKET: avatars
-- Estructura de path: {userId}/avatar.jpg
-- ════════════════════════════════════════════════════════════

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

-- ════════════════════════════════════════════════════════════
-- BUCKET: accounts
-- Estructura de path: {userId}/logo.jpg  |  {userId}/cover.jpg
-- ════════════════════════════════════════════════════════════

CREATE POLICY "accounts_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'accounts');

CREATE POLICY "accounts_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "accounts_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "accounts_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'accounts'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

-- ════════════════════════════════════════════════════════════
-- BUCKET: catalog
-- Estructura de path: {userId}/{uuid}.jpg  (imágenes de productos)
-- ════════════════════════════════════════════════════════════

CREATE POLICY "catalog_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalog');

CREATE POLICY "catalog_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'catalog'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "catalog_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'catalog'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);

CREATE POLICY "catalog_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'catalog'
  AND auth.uid()::TEXT = (storage.foldername(name))[1]
);