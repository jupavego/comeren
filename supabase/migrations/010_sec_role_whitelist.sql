-- ============================================================
-- 010_sec_role_whitelist.sql
-- SEC-001 | OWASP A01:2021 — Broken Access Control
-- ============================================================
-- Riesgo mitigado:
--   La función handle_new_user() aceptaba cualquier valor de
--   'role' desde raw_user_meta_data (datos del cliente),
--   incluyendo 'admin'. Un atacante podía registrarse como
--   admin enviando una llamada directa a la API de Supabase
--   Auth con data: { role: 'admin' }, obteniendo control total
--   del panel de administración.
--
-- Fix:
--   Whitelist explícito — solo 'client' y 'business' son
--   asignables durante el registro. Cualquier otro valor,
--   incluyendo 'admin', resulta en el rol por defecto 'client'.
--   El rol 'admin' solo puede ser asignado por un administrador
--   existente vía Supabase Dashboard o service_role key.
--
-- Fecha: 2026-04-26
-- Referencia: docs/security/decisions/ADR-001-rls-admin-role.md
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('client', 'business')
      THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'client'
    END,
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
