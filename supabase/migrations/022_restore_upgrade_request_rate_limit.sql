-- ============================================================
-- 022_restore_upgrade_request_rate_limit.sql
-- Restaura el rate-limit en plan_upgrade_requests — 1 solicitud/hora
-- ============================================================
-- 021 lo había quitado para no bloquear reintentos durante las
-- pruebas de la Edge Function. Ya validado end-to-end, se
-- restaura con un intervalo más corto que el original (1h en vez
-- de 24h) — suficiente para evitar spam sin ser tan restrictivo.
-- ============================================================

DROP POLICY IF EXISTS "owner_can_insert_own_request" ON public.plan_upgrade_requests;

CREATE POLICY "owner_can_insert_own_request"
  ON public.plan_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = account_id AND a.owner_id = auth.uid())
    AND (
      SELECT COUNT(*) FROM public.plan_upgrade_requests r
      WHERE r.account_id = plan_upgrade_requests.account_id
        AND r.created_at > NOW() - INTERVAL '1 hour'
    ) = 0
  );
