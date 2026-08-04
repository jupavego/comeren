-- ============================================================
-- 023_plan_packages_and_expiry.sql
-- Paquetes de ampliación con vencimiento por negocio
-- ============================================================
-- Reemplaza el placeholder genérico 'paid' de 019_business_quota.sql
-- por 3 paquetes reales con capacidad distinta, y agrega vencimiento
-- obligatorio por negocio — al vencer, get_business_usage() vuelve
-- a medir contra el plan 'free' automáticamente, sin intervención
-- manual.
--
-- last_expiry_warning_days guarda el último aviso ya enviado
-- (5, 3 o 1 día antes) para no repetirlo — lo usa la Edge Function
-- de recordatorio (024_*.sql).
-- ============================================================

-- ── 1. Paquetes reales ────────────────────────────────────────
DELETE FROM public.plan_limits
WHERE plan_tier = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE plan_tier = 'paid');

INSERT INTO public.plan_limits (plan_tier, max_storage_bytes, max_products) VALUES
  ('basico',     26214400,  50),   -- 25 MB
  ('intermedio', 62914560,  100),  -- 60 MB
  ('premium',    157286400, 300)   -- 150 MB
ON CONFLICT (plan_tier) DO UPDATE SET
  max_storage_bytes = EXCLUDED.max_storage_bytes,
  max_products      = EXCLUDED.max_products,
  updated_at         = NOW();

-- ── 2. Vencimiento por negocio ────────────────────────────────
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_expiry_warning_days INT;

-- ── 3. get_business_usage() — cae a 'free' si el paquete venció ─
CREATE OR REPLACE FUNCTION public.get_business_usage(p_account_id UUID)
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id   UUID;
  v_tier       TEXT;
  v_expires_at TIMESTAMPTZ;
  v_expired    BOOLEAN;
BEGIN
  SELECT owner_id, plan_tier, plan_expires_at
  INTO v_owner_id, v_tier, v_expires_at
  FROM public.accounts WHERE id = p_account_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Negocio no encontrado';
  END IF;

  IF public.get_my_role() <> 'admin' AND auth.uid() <> v_owner_id THEN
    RAISE EXCEPTION 'Access denied: not the owner of this account';
  END IF;

  v_expired := v_tier <> 'free' AND v_expires_at IS NOT NULL AND v_expires_at < NOW();
  IF v_expired THEN
    v_tier := 'free';
  END IF;

  RETURN (
    SELECT json_build_object(
      'planTier',          v_tier,
      'planExpiresAt',     v_expires_at,
      'planExpired',       v_expired,
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

-- ── 4. get_all_business_usage() — mismo criterio, para el admin ─
CREATE OR REPLACE FUNCTION public.get_all_business_usage()
RETURNS TABLE(
  account_id              UUID,
  business_name           TEXT,
  plan_tier               TEXT,
  plan_expires_at         TIMESTAMPTZ,
  plan_expired            BOOLEAN,
  storage_used_bytes      BIGINT,
  storage_limit_bytes     BIGINT,
  storage_percent         NUMERIC,
  product_count           BIGINT,
  product_limit           INT,
  product_percent         NUMERIC,
  has_pending_upgrade_req BOOLEAN
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.name,
    CASE WHEN expired.is_expired THEN 'free' ELSE a.plan_tier END,
    a.plan_expires_at,
    expired.is_expired,
    COALESCE(su.bytes_used, 0),
    pl.max_storage_bytes,
    ROUND(COALESCE(su.bytes_used, 0)::NUMERIC / pl.max_storage_bytes * 100, 1),
    COALESCE(pc.product_count, 0),
    pl.max_products,
    ROUND(COALESCE(pc.product_count, 0)::NUMERIC / pl.max_products * 100, 1),
    EXISTS (
      SELECT 1 FROM public.plan_upgrade_requests r
      WHERE r.account_id = a.id AND r.status = 'pending'
    )
  FROM public.accounts a
  CROSS JOIN LATERAL (
    SELECT a.plan_tier <> 'free' AND a.plan_expires_at IS NOT NULL AND a.plan_expires_at < NOW() AS is_expired
  ) expired
  JOIN public.plan_limits pl
    ON pl.plan_tier = CASE WHEN expired.is_expired THEN 'free' ELSE a.plan_tier END
  LEFT JOIN LATERAL (
    SELECT SUM((o.metadata->>'size')::BIGINT) AS bytes_used
    FROM storage.objects o
    WHERE o.bucket_id IN ('avatars', 'accounts', 'catalog')
      AND (storage.foldername(o.name))[1] = a.owner_id::TEXT
  ) su ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS product_count
    FROM public.catalog_items ci
    WHERE ci.account_id = a.id
  ) pc ON TRUE
  ORDER BY storage_percent DESC NULLS LAST;
END;
$$;
