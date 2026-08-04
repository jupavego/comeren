-- ============================================================
-- 021_remove_upgrade_request_rate_limit.sql
-- Quita el límite de 1 solicitud/24h en plan_upgrade_requests
-- ============================================================
-- El rate-limit de 015_sec_rate_limiting.sql (order_logs) sigue
-- intacto — esto solo afecta las solicitudes de upgrade de plan,
-- que bloqueaban reintentos legítimos durante pruebas.
--
-- Nota: sin este límite, un dueño de negocio puede generar un
-- correo al admin por cada click en "Actualizar plan". Si se
-- vuelve un problema real, restaurar con un intervalo corto
-- (ej. 5 minutos) en vez de 24h.
-- ============================================================

DROP POLICY IF EXISTS "owner_can_insert_own_request" ON public.plan_upgrade_requests;

CREATE POLICY "owner_can_insert_own_request"
  ON public.plan_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.owner_id = auth.uid())
  );
