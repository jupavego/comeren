-- ============================================================
-- 008_order_logs_extra_fields.sql
-- Agrega datos del comprador al registro de pedidos
-- ============================================================

ALTER TABLE public.order_logs
  ADD COLUMN IF NOT EXISTS buyer_name  TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
  ADD COLUMN IF NOT EXISTS user_role   TEXT,
  ADD COLUMN IF NOT EXISTS total       INTEGER,
  ADD COLUMN IF NOT EXISTS payment     TEXT;

-- Actualiza la función admin para incluir los nuevos campos
CREATE OR REPLACE FUNCTION public.get_all_orders_admin()
RETURNS TABLE(
  id           UUID,
  account_id   UUID,
  created_at   TIMESTAMPTZ,
  business_name TEXT,
  buyer_name   TEXT,
  buyer_phone  TEXT,
  user_role    TEXT,
  total        INTEGER,
  payment      TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
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
  JOIN   public.accounts   a  ON a.id = ol.account_id
  ORDER  BY ol.created_at DESC;
$$;
