-- ============================================================
-- 019_business_quota.sql
-- Cuota de storage/catálogo por negocio + función de consulta
-- ============================================================
-- Contexto: en el free tier de Supabase (1 GB storage, 5 GB
-- egress/mes) el consumo real medido fue ~74 MB/negocio sin
-- comprimir — alcanza para ~14 negocios antes de agotarlo. Con
-- fotos comprimidas (logo/avatar ≤300KB, cover ≤600KB, producto
-- ≤300KB) el presupuesto baja a ~7 MB/negocio → ~145 negocios.
--
-- Los límites NO se hardcodean en el código de la app: viven en
-- plan_limits para poder ajustarlos sin redeploy cuando cambien
-- los precios de Supabase/Vercel/Google (ya pasó con Google Maps
-- en 2025 y con las políticas de Supabase en 2026).
--
-- Los valores de 'paid' son provisionales — placeholder hasta
-- que se defina el plan de cobro real.
-- ============================================================

-- ── 1. Tabla de límites por plan (debe existir antes del FK) ──
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_tier          TEXT PRIMARY KEY,
  max_storage_bytes  BIGINT NOT NULL,
  max_products       INT    NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.plan_limits (plan_tier, max_storage_bytes, max_products) VALUES
  ('free', 7340032,   20),   -- ~7 MB, 20 productos
  ('paid', 104857600, 200)   -- 100 MB, 200 productos — PROVISIONAL, falta definir precio/plan real
ON CONFLICT (plan_tier) DO NOTHING;

-- ── 2. Tier de plan por negocio ──────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';

ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS accounts_plan_tier_fkey;
ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_plan_tier_fkey
    FOREIGN KEY (plan_tier) REFERENCES public.plan_limits(plan_tier);

-- ── 3. Función de consumo por negocio ────────────────────────
-- Admin o dueño del negocio pueden consultarla (mismo guard que
-- get_order_stats en 011_sec_rpc_role_guards.sql).
CREATE OR REPLACE FUNCTION public.get_business_usage(p_account_id UUID)
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id  UUID;
  v_tier      TEXT;
BEGIN
  SELECT owner_id, plan_tier INTO v_owner_id, v_tier
  FROM public.accounts WHERE id = p_account_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado';
  END IF;

  IF public.get_my_role() <> 'admin' AND auth.uid() <> v_owner_id THEN
    RAISE EXCEPTION 'Access denied: not the owner of this account';
  END IF;

  RETURN (
    SELECT json_build_object(
      'planTier',          v_tier,
      'storageUsedBytes',  COALESCE(su.bytes_used, 0),
      'storageLimitBytes', pl.max_storage_bytes,
      'storagePercent',    ROUND(COALESCE(su.bytes_used, 0)::NUMERIC / pl.max_storage_bytes * 100, 1),
      'productCount',      COALESCE(pc.product_count, 0),
      'productLimit',      pl.max_products,
      'productPercent',    ROUND(COALESCE(pc.product_count, 0)::NUMERIC / pl.max_products * 100, 1)
    )
    FROM public.plan_limits pl
    LEFT JOIN (
      SELECT SUM((o.metadata->>'size')::BIGINT) AS bytes_used
      FROM storage.objects o
      WHERE o.bucket_id IN ('avatars', 'accounts', 'catalog')
        AND (storage.foldername(o.name))[1] = v_owner_id::TEXT
    ) su ON TRUE
    LEFT JOIN (
      SELECT COUNT(*) AS product_count
      FROM public.catalog_items
      WHERE account_id = p_account_id
    ) pc ON TRUE
    WHERE pl.plan_tier = v_tier
  );
END;
$$;
