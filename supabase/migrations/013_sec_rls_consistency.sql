-- ============================================================
-- 013_sec_rls_consistency.sql
-- SEC-007 | OWASP A01: Broken Access Control
-- Fecha: 2026-04-26
-- ============================================================
-- Riesgo: home_config_admin_write y home_featured_admin_write
-- usaban una subconsulta a public.profiles para verificar el rol,
-- a diferencia del resto del esquema que usa get_my_role().
-- Esta inconsistencia dificulta auditorías y podría ser explotada
-- si la tabla profiles queda temporalmente sin RLS correcta.
-- Fix: reemplazar subconsulta por get_my_role() = 'admin' en ambas
-- políticas, alineando con el patrón centralizado del proyecto.
-- ============================================================

-- ── home_config ──────────────────────────────────────────────

DROP POLICY IF EXISTS "home_config_admin_write" ON public.home_config;

CREATE POLICY "home_config_admin_write"
  ON public.home_config FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── home_featured ─────────────────────────────────────────────

DROP POLICY IF EXISTS "home_featured_admin_write" ON public.home_featured;

CREATE POLICY "home_featured_admin_write"
  ON public.home_featured FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
