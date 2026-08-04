-- ============================================================
-- 020_plan_upgrade_requests.sql
-- Solicitudes de upgrade de plan + control admin de cuota
-- ============================================================
-- Cuando un negocio toca "Actualizar plan" en el banner de
-- cuota, se guarda la solicitud aquí (para que el admin la vea
-- en el dashboard aunque el correo falle) y una Edge Function
-- aparte (send-upgrade-request) notifica por correo.
--
-- get_all_business_usage() le da al admin visibilidad de la
-- cuota consumida de TODOS los negocios en una sola consulta —
-- mismo patrón que get_admin_stats().
--
-- get_admin_emails() es de uso exclusivo de la Edge Function
-- (service_role) — nunca se expone a authenticated/anon porque
-- devuelve correos, es PII.
-- ============================================================

-- ── 1. Tabla de solicitudes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_upgrade_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'contacted', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_upgrade_requests_account_id
  ON public.plan_upgrade_requests(account_id);

ALTER TABLE public.plan_upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_can_view_own_requests"   ON public.plan_upgrade_requests;
DROP POLICY IF EXISTS "owner_can_insert_own_request"  ON public.plan_upgrade_requests;
DROP POLICY IF EXISTS "admin_can_view_all_requests"   ON public.plan_upgrade_requests;
DROP POLICY IF EXISTS "admin_can_update_requests"     ON public.plan_upgrade_requests;

CREATE POLICY "owner_can_view_own_requests"
  ON public.plan_upgrade_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.owner_id = auth.uid())
  );

-- Rate-limit: máximo 1 solicitud por negocio cada 24h — evita
-- inundar el correo del admin si alguien hace click repetido.
CREATE POLICY "owner_can_insert_own_request"
  ON public.plan_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.owner_id = auth.uid())
    AND (
      SELECT COUNT(*) FROM public.plan_upgrade_requests r
      WHERE r.account_id = plan_upgrade_requests.account_id
        AND r.created_at > NOW() - INTERVAL '24 hours'
    ) = 0
  );

CREATE POLICY "admin_can_view_all_requests"
  ON public.plan_upgrade_requests FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "admin_can_update_requests"
  ON public.plan_upgrade_requests FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ── 2. Cuota de todos los negocios — solo admin ───────────────
CREATE OR REPLACE FUNCTION public.get_all_business_usage()
RETURNS TABLE(
  account_id              UUID,
  business_name           TEXT,
  plan_tier               TEXT,
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
    a.plan_tier,
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
  JOIN public.plan_limits pl ON pl.plan_tier = a.plan_tier
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

-- ── 3. Correos de admins — solo service_role (Edge Function) ──
CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(u.email), ARRAY[]::TEXT[])
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'admin';
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_emails() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_admin_emails() TO service_role;
