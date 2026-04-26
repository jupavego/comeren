-- ============================================================
-- 012_sec_order_logs_policy.sql
-- SEC-005 | OWASP A05:2021 — Security Misconfiguration
-- ============================================================
-- Riesgo mitigado:
--   La política "anyone_can_log_order" permitía INSERT ilimitado
--   en order_logs desde el rol 'anon' (visitantes no autenticados)
--   con WITH CHECK (true), sin ninguna validación.
--
--   Consecuencias:
--   • Bots podían inflar artificialmente métricas de pedidos
--   • Se almacenaba PII (buyer_name, buyer_phone) sin autenticación
--   • Sin rate limiting, la tabla era vulnerable a flooding
--
-- Fix:
--   Reemplazar la política anon por una que exija autenticación.
--   Solo usuarios con sesión activa (rol 'authenticated') pueden
--   registrar pedidos. Los visitantes anónimos deben autenticarse
--   para realizar un pedido.
--
-- Nota:
--   Si en el futuro se requiere permitir pedidos de visitantes
--   anónimos, implementar via Supabase Edge Function con
--   verificación de CAPTCHA y rate limiting antes de hacer
--   el INSERT con service_role.
--
-- Fecha: 2026-04-26
-- ============================================================

-- Eliminar la política insegura
DROP POLICY IF EXISTS "anyone_can_log_order" ON public.order_logs;

-- Crear política segura: solo usuarios autenticados
CREATE POLICY "authenticated_can_log_order"
  ON public.order_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
