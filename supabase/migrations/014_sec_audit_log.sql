-- ============================================================
-- 014_sec_audit_log.sql
-- SEC-006 | OWASP A09: Security Logging and Monitoring Failures
-- Fecha: 2026-04-26
-- ============================================================
-- Riesgo: ausencia de trazabilidad de acciones privilegiadas
-- (creación/eliminación de negocios, cambios de rol, accesos admin).
-- Sin audit log, un incidente no puede ser reconstruido post-facto.
-- Fix: tabla audit_logs con RLS — solo admins pueden SELECT,
-- cualquier usuario autenticado puede INSERT (vía trigger o código).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,       -- e.g. 'account.create', 'profile.role_change'
  entity_type TEXT        NOT NULL,       -- e.g. 'account', 'profile', 'order_log'
  entity_id   TEXT,                       -- PK del registro afectado (puede ser UUID o slug)
  metadata    JSONB,                      -- detalles extra: valores anteriores, IP, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer el log
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Cualquier usuario autenticado puede insertar (el código y los triggers lo usan)
CREATE POLICY "audit_logs_authenticated_insert"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Nadie puede modificar ni borrar registros de auditoría
-- (no se crean políticas UPDATE / DELETE — denegación implícita por RLS)

-- Índices para consultas frecuentes de admin
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx  ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_time_idx   ON public.audit_logs (created_at DESC);
