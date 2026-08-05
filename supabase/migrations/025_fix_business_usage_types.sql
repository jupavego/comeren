-- ============================================================
-- 025_fix_business_usage_types.sql
-- Corrige mismatch de tipos en get_all_business_usage()
-- ============================================================
-- SUM(bigint) en Postgres devuelve NUMERIC, no BIGINT — la
-- columna storage_used_bytes se declaró BIGINT pero el SELECT
-- devolvía NUMERIC, causando:
--   "structure of query does not match function result type"
-- Nunca se detectó antes porque el guard de admin cortaba la
-- ejecución antes de llegar al RETURN QUERY en las pruebas
-- previas con la llave anónima.
-- ============================================================

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
    COALESCE(su.bytes_used, 0)::BIGINT,
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
