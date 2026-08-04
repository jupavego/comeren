-- ============================================================
-- 024_expiry_warning_cron.sql
-- Aviso automático 5, 3 y 1 día antes de que venza un paquete
-- ============================================================
-- Requiere guardar el Service Role Key en Supabase Vault UNA
-- SOLA VEZ, manualmente, en el SQL Editor — nunca en una
-- migración versionada en el repo:
--
--   select vault.create_secret('TU_SERVICE_ROLE_KEY', 'service_role_key');
--
-- (reemplaza TU_SERVICE_ROLE_KEY por el valor real — Settings →
-- API → service_role — y pégalo directo en el SQL Editor, no lo
-- compartas en chat ni lo commitees a ningún archivo)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 1. Negocios que necesitan aviso hoy ───────────────────────
-- 5, 3 o 1 día antes de vencer, y que no se les haya avisado ya
-- para esa misma cuenta regresiva (evita reenviar el mismo aviso
-- si el cron corre más de una vez el mismo día).
CREATE OR REPLACE FUNCTION public.get_accounts_needing_expiry_warning()
RETURNS TABLE(
  account_id       UUID,
  business_name    TEXT,
  owner_id         UUID,
  days_remaining   INT,
  plan_tier        TEXT,
  plan_expires_at  TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.name, a.owner_id,
    (a.plan_expires_at::date - CURRENT_DATE)::INT,
    a.plan_tier, a.plan_expires_at
  FROM public.accounts a
  WHERE a.plan_tier <> 'free'
    AND a.plan_expires_at IS NOT NULL
    AND (a.plan_expires_at::date - CURRENT_DATE)::INT IN (5, 3, 1)
    AND a.last_expiry_warning_days IS DISTINCT FROM (a.plan_expires_at::date - CURRENT_DATE)::INT;
$$;

REVOKE EXECUTE ON FUNCTION public.get_accounts_needing_expiry_warning() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_accounts_needing_expiry_warning() TO service_role;

-- ── 2. Marca que ya se avisó — la llama la Edge Function ──────
CREATE OR REPLACE FUNCTION public.mark_expiry_warning_sent(p_account_id UUID, p_days INT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.accounts SET last_expiry_warning_days = p_days WHERE id = p_account_id;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_expiry_warning_sent(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_expiry_warning_sent(UUID, INT) TO service_role;

-- ── 3. Cron diario 9:00am UTC (~4am Colombia) ─────────────────
-- Dispara la Edge Function send-expiry-warning. El secret va a
-- Vault, no en texto plano acá.
SELECT cron.schedule(
  'plan-expiry-warning-daily',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://lckybvgsyitzuoyebnon.supabase.co/functions/v1/send-expiry-warning',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
