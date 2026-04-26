-- ============================================================
-- 015_sec_rate_limiting.sql
-- SEC-005b | OWASP A05: Security Misconfiguration
-- Fecha: 2026-04-26
-- ============================================================
-- Riesgo: authenticated_can_log_order (migración 012) permite
-- INSERT ilimitado a cualquier usuario autenticado.
-- Un actor malicioso podría saturar order_logs con miles de
-- registros, inflar métricas de negocio o degradar la DB.
-- Fix 1: agregar columna buyer_id para vincular pedido con usuario
--         y mejorar trazabilidad (SEC-006 audit trail).
-- Fix 2: reemplazar policy permisiva por una con rate-limit de
--         10 inserciones por usuario por hora — límite conservador
--         ya que un flujo legítimo raramente supera 2-3/hora.
-- ============================================================

-- ── 1. Agregar columna de trazabilidad ───────────────────────
ALTER TABLE public.order_logs
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_logs_buyer_id ON public.order_logs(buyer_id);

-- ── 2. Reemplazar policy permisiva con rate-limit ─────────────
DROP POLICY IF EXISTS "authenticated_can_log_order" ON public.order_logs;

CREATE POLICY "authenticated_can_log_order"
  ON public.order_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND (
      SELECT COUNT(*)
      FROM public.order_logs
      WHERE order_logs.buyer_id = auth.uid()
        AND order_logs.created_at > NOW() - INTERVAL '1 hour'
    ) < 10
  );
