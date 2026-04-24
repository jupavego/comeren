-- ============================================================
-- 007_order_logs.sql
-- Registro de pedidos enviados por WhatsApp por negocio
-- ============================================================

-- ── Tabla ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_logs_account_id ON public.order_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_created_at  ON public.order_logs(created_at);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.order_logs ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante (anon o autenticado) puede registrar un pedido
CREATE POLICY "anyone_can_log_order"
  ON public.order_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- El dueño del negocio ve solo sus pedidos
CREATE POLICY "owner_can_read_orders"
  ON public.order_logs FOR SELECT
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE owner_id = auth.uid()
    )
  );

-- Admin ve todo
CREATE POLICY "admin_can_read_all_orders"
  ON public.order_logs FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ── Función: conteo por negocio (business dashboard) ─────────
CREATE OR REPLACE FUNCTION public.get_order_stats(p_account_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total',     COUNT(*),
    'thisMonth', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))
  )
  FROM public.order_logs
  WHERE account_id = p_account_id;
$$;

-- ── Función admin: todos los pedidos con nombre de negocio ───
CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
RETURNS TABLE(id UUID, account_id UUID, created_at TIMESTAMPTZ, business_name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ol.id, ol.account_id, ol.created_at, a.name AS business_name
  FROM   public.order_logs ol
  JOIN   public.accounts   a  ON a.id = ol.account_id
  ORDER  BY ol.created_at DESC;
$$;

-- ── Actualiza get_admin_stats() para incluir totalOrders ─────
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'totalUsers',       COUNT(*)                              FILTER (WHERE role IS NOT NULL),
    'totalBusinesses',  COUNT(*)                              FILTER (WHERE role = 'business'),
    'totalClients',     COUNT(*)                              FILTER (WHERE role = 'client'),
    'totalAccounts',    (SELECT COUNT(*) FROM public.accounts),
    'pendingAccounts',  (SELECT COUNT(*) FROM public.accounts WHERE status = 'pending'),
    'approvedAccounts', (SELECT COUNT(*) FROM public.accounts WHERE status = 'approved'),
    'totalProducts',    (SELECT COUNT(*) FROM public.catalog_items),
    'totalOrders',      (SELECT COUNT(*) FROM public.order_logs)
  )
  FROM public.profiles;
$$;
