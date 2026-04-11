-- ============================================================
-- 005_stats_function.sql
-- Función SQL para estadísticas del admin dashboard
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- 
-- Reemplaza las 3 consultas que traen todas las filas para contar
-- en JavaScript. Esta función hace los conteos directamente en
-- PostgreSQL y devuelve un solo JSON — una sola round-trip
-- sin importar cuántos usuarios o negocios haya.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'totalUsers',        COUNT(*)                                        FILTER (WHERE role IS NOT NULL),
    'totalBusinesses',   COUNT(*)                                        FILTER (WHERE role = 'business'),
    'totalClients',      COUNT(*)                                        FILTER (WHERE role = 'client'),
    'totalAccounts',     (SELECT COUNT(*) FROM public.accounts),
    'pendingAccounts',   (SELECT COUNT(*) FROM public.accounts WHERE status = 'pending'),
    'approvedAccounts',  (SELECT COUNT(*) FROM public.accounts WHERE status = 'approved'),
    'totalProducts',     (SELECT COUNT(*) FROM public.catalog_items)
  )
  FROM public.profiles;
$$;