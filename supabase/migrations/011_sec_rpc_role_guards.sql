-- ============================================================
-- 011_sec_rpc_role_guards.sql
-- SEC-002 | OWASP A01:2021 — Broken Access Control
--          OWASP A02:2021 — Cryptographic Failures (PII Exposure)
-- ============================================================
-- Riesgo mitigado:
--   Tres funciones marcadas SECURITY DEFINER (que ejecutan con
--   privilegios del owner de la función) eran invocables por
--   cualquier usuario autenticado sin verificación de rol:
--
--   • get_admin_stats()       → estadísticas internas del sistema
--   • get_all_orders_admin()  → buyer_name + buyer_phone de TODOS
--                               los pedidos (PII de compradores)
--   • get_order_stats(uuid)   → conteos por negocio
--
--   Adicionalmente, ninguna función tenía SET search_path, lo que
--   las exponía a ataques de search_path injection.
--
-- Fix:
--   • Convertir de LANGUAGE SQL a LANGUAGE PLPGSQL para poder
--     ejecutar lógica condicional (IF/RAISE).
--   • Agregar role guard al inicio de cada función.
--   • Agregar SET search_path = public para fijar el search path.
--   • get_order_stats: el caller debe ser admin O dueño del account.
--
-- Fecha: 2026-04-26
-- ============================================================


-- ── 1. get_admin_stats() — solo admin ────────────────────────
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN (
    SELECT json_build_object(
      'totalUsers',       COUNT(*) FILTER (WHERE role IS NOT NULL),
      'totalBusinesses',  COUNT(*) FILTER (WHERE role = 'business'),
      'totalClients',     COUNT(*) FILTER (WHERE role = 'client'),
      'totalAccounts',    (SELECT COUNT(*) FROM public.accounts),
      'pendingAccounts',  (SELECT COUNT(*) FROM public.accounts WHERE status = 'pending'),
      'approvedAccounts', (SELECT COUNT(*) FROM public.accounts WHERE status = 'approved'),
      'totalProducts',    (SELECT COUNT(*) FROM public.catalog_items),
      'totalOrders',      (SELECT COUNT(*) FROM public.order_logs)
    )
    FROM public.profiles
  );
END;
$$;


-- ── 2. get_all_orders_admin() — solo admin, retorna PII ──────
CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
RETURNS TABLE(
  id            UUID,
  account_id    UUID,
  created_at    TIMESTAMPTZ,
  business_name TEXT,
  buyer_name    TEXT,
  buyer_phone   TEXT,
  user_role     TEXT,
  total         INTEGER,
  payment       TEXT
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
    ol.id,
    ol.account_id,
    ol.created_at,
    a.name        AS business_name,
    ol.buyer_name,
    ol.buyer_phone,
    ol.user_role,
    ol.total,
    ol.payment
  FROM   public.order_logs ol
  JOIN   public.accounts   a ON a.id = ol.account_id
  ORDER  BY ol.created_at DESC;
END;
$$;


-- ── 3. get_order_stats(uuid) — admin o dueño del negocio ─────
CREATE OR REPLACE FUNCTION public.get_order_stats(p_account_id UUID)
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el caller es admin O es el dueño del account solicitado
  IF public.get_my_role() <> 'admin' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM   public.accounts
      WHERE  id = p_account_id
        AND  owner_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Access denied: not the owner of this account';
    END IF;
  END IF;

  RETURN (
    SELECT json_build_object(
      'total',     COUNT(*),
      'thisMonth', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))
    )
    FROM public.order_logs
    WHERE account_id = p_account_id
  );
END;
$$;
