-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security — Come en Girardota
-- Ejecutar después de 001_schema.sql
-- ============================================================

-- ── Habilitar RLS en todas las tablas ────────────────────────
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- ── Limpiar políticas anteriores si existen ──────────────────
-- (útil para re-ejecutar el migration en desarrollo)
DROP POLICY IF EXISTS "profiles_select_own"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON public.profiles;
DROP POLICY IF EXISTS "accounts_select_public"   ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_owner"    ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_owner"    ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_owner"    ON public.accounts;
DROP POLICY IF EXISTS "catalog_select_public"    ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_insert_owner"     ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_update_owner"     ON public.catalog_items;
DROP POLICY IF EXISTS "catalog_delete_owner"     ON public.catalog_items;

-- ════════════════════════════════════════════════════════════
-- PROFILES
-- Cada usuario solo puede ver y editar su propio perfil.
-- No usa get_my_role() para evitar recursión.
-- ════════════════════════════════════════════════════════════

-- Un usuario puede leer su propio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- El trigger crea el perfil en nombre del sistema (SECURITY DEFINER),
-- pero también permitimos INSERT directo del propio usuario
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ════════════════════════════════════════════════════════════
-- ACCOUNTS
-- ════════════════════════════════════════════════════════════

-- Lectura pública: negocios aprobados y activos son visibles a todos.
-- El propietario puede ver su propio negocio siempre (incluso pending).
CREATE POLICY "accounts_select_public"
ON public.accounts FOR SELECT
USING (
  (active = TRUE AND status = 'approved')
  OR auth.uid() = owner_id
);

-- Solo el propietario puede crear su negocio
CREATE POLICY "accounts_insert_owner"
ON public.accounts FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- El propietario puede editar su negocio.
-- El admin puede aprobar/rechazar vía service_role (bypasea RLS).
CREATE POLICY "accounts_update_owner"
ON public.accounts FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Solo el propietario puede eliminar su negocio
CREATE POLICY "accounts_delete_owner"
ON public.accounts FOR DELETE
USING (auth.uid() = owner_id);

-- ════════════════════════════════════════════════════════════
-- CATALOG_ITEMS
-- ════════════════════════════════════════════════════════════

-- Lectura pública: solo productos activos de negocios aprobados.
-- El propietario del negocio ve todos sus productos.
CREATE POLICY "catalog_select_public"
ON public.catalog_items FOR SELECT
USING (
  active = TRUE
  OR EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
);

-- Solo el propietario del negocio puede agregar productos
CREATE POLICY "catalog_insert_owner"
ON public.catalog_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
);

-- Solo el propietario del negocio puede editar sus productos
CREATE POLICY "catalog_update_owner"
ON public.catalog_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
);

-- Solo el propietario del negocio puede eliminar sus productos
CREATE POLICY "catalog_delete_owner"
ON public.catalog_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = catalog_items.account_id
      AND a.owner_id = auth.uid()
  )
);