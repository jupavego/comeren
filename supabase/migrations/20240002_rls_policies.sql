-- ============================================================
-- Come en Girardota — RLS Policies
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Orden: primero limpiar, luego crear
-- ============================================================


-- ============================================================
-- PASO 1: Habilitar RLS en todas las tablas
-- (si ya está habilitado no hace nada, seguro ejecutar)
-- ============================================================
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- PASO 2: Limpiar todas las policies existentes
-- (esto elimina la policy rota que causa la recursión)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin"         ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin"         ON profiles;

DROP POLICY IF EXISTS "accounts_select_public"        ON accounts;
DROP POLICY IF EXISTS "accounts_select_owner"         ON accounts;
DROP POLICY IF EXISTS "accounts_select_admin"         ON accounts;
DROP POLICY IF EXISTS "accounts_insert_business"      ON accounts;
DROP POLICY IF EXISTS "accounts_update_owner"         ON accounts;
DROP POLICY IF EXISTS "accounts_update_admin"         ON accounts;

DROP POLICY IF EXISTS "catalog_select_public"         ON catalog_items;
DROP POLICY IF EXISTS "catalog_select_owner"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_select_admin"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_insert_owner"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_insert_admin"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_update_owner"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_update_admin"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_delete_owner"          ON catalog_items;
DROP POLICY IF EXISTS "catalog_delete_admin"          ON catalog_items;

-- Por si tenés policies con otros nombres, limpia todo lo que quede
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'accounts', 'catalog_items')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;


-- ============================================================
-- HELPER: función para verificar rol sin tocar la tabla profiles
-- Usa el JWT de Supabase — sin recursión posible
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'role',
    (auth.jwt() ->> 'role')
  );
$$;


-- ============================================================
-- TABLA: profiles
-- ============================================================

-- SELECT: cada usuario ve solo su propio perfil
-- El admin ve todos (usando JWT, no sub-SELECT)
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);

-- INSERT: Supabase crea el perfil automáticamente via trigger
-- Solo el propio usuario puede insertarlo (caso manual)
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: cada usuario actualiza solo su perfil
-- El admin puede actualizar cualquiera (para cambiar rol)
-- SIN sub-SELECT a profiles → no hay recursión
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  auth.uid() = id
  OR public.get_my_role() = 'admin'
);

-- DELETE: nadie puede borrar perfiles desde el cliente
-- (solo desde el dashboard de Supabase o funciones server-side)


-- ============================================================
-- TABLA: accounts
-- ============================================================

-- SELECT público: cualquiera (logueado o no) ve negocios aprobados y activos
-- Esto cubre el directorio público
CREATE POLICY "accounts_select_public"
ON accounts FOR SELECT
USING (
  (active = true AND status = 'approved')
  OR auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
);

-- INSERT: solo usuarios con rol 'business' pueden crear su negocio
CREATE POLICY "accounts_insert_business"
ON accounts FOR INSERT
WITH CHECK (
  auth.uid() = owner_id
  AND public.get_my_role() = 'business'
);

-- UPDATE: el dueño edita su propio negocio
-- El admin puede cambiar status/active (aprobación/rechazo)
CREATE POLICY "accounts_update_owner"
ON accounts FOR UPDATE
USING (
  auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  auth.uid() = owner_id
  OR public.get_my_role() = 'admin'
);

-- DELETE: solo admin (ej: suspender definitivamente)
CREATE POLICY "accounts_delete_admin"
ON accounts FOR DELETE
USING (public.get_my_role() = 'admin');


-- ============================================================
-- TABLA: catalog_items
-- ============================================================

-- SELECT público: cualquiera ve productos activos de negocios aprobados
-- El dueño ve todos sus productos (incluso inactivos)
-- El admin ve todo
CREATE POLICY "catalog_select_public"
ON catalog_items FOR SELECT
USING (
  (
    active = true
    AND EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id = catalog_items.account_id
        AND a.active = true
        AND a.status = 'approved'
    )
  )
  OR EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
  OR public.get_my_role() = 'admin'
);

-- INSERT: el dueño del negocio agrega productos a su negocio
-- El admin puede agregar a cualquier negocio
CREATE POLICY "catalog_insert_owner"
ON catalog_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
  OR public.get_my_role() = 'admin'
);

-- UPDATE: el dueño edita sus productos, el admin edita cualquiera
CREATE POLICY "catalog_update_owner"
ON catalog_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
  OR public.get_my_role() = 'admin'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
  OR public.get_my_role() = 'admin'
);

-- DELETE: el dueño borra sus productos, el admin borra cualquiera
CREATE POLICY "catalog_delete_owner"
ON catalog_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
  OR public.get_my_role() = 'admin'
);


-- ============================================================
-- STORAGE BUCKETS — policies para avatars, accounts, catalog
-- Ejecutar también en SQL Editor
-- ============================================================

-- Bucket: avatars (fotos de perfil)
-- Cada usuario sube solo a su propia carpeta userId/avatar.jpg
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"    ON storage.objects;

CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- Bucket: accounts (logos y portadas de negocios)
INSERT INTO storage.buckets (id, name, public)
VALUES ('accounts', 'accounts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "accounts_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "accounts_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "accounts_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "accounts_storage_delete" ON storage.objects;

CREATE POLICY "accounts_storage_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'accounts');

CREATE POLICY "accounts_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'accounts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);

CREATE POLICY "accounts_storage_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'accounts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);

CREATE POLICY "accounts_storage_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'accounts'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);


-- Bucket: catalog (imágenes de productos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalog', 'catalog', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "catalog_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "catalog_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "catalog_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "catalog_storage_delete" ON storage.objects;

CREATE POLICY "catalog_storage_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalog');

CREATE POLICY "catalog_storage_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'catalog'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);

CREATE POLICY "catalog_storage_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'catalog'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);

CREATE POLICY "catalog_storage_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'catalog'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.get_my_role() = 'admin'
  )
);


-- ============================================================
-- VERIFICACIÓN FINAL
-- Ejecutar esto para confirmar que quedó bien:
-- ============================================================
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'accounts', 'catalog_items')
ORDER BY tablename, cmd;