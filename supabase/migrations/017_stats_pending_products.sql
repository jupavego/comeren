-- ============================================================
-- 017_stats_pending_products.sql
-- Agrega pendingProducts al conteo del dashboard de admin.
-- Cuenta catalog_items con approval_status = 'pending' para
-- que el admin vea cuántos productos esperan moderación.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN (
    SELECT json_build_object(
      'totalUsers',       COUNT(*) FILTER (WHERE role IS NOT NULL),
      'totalBusinesses',  COUNT(*) FILTER (WHERE role = 'business'),
      'totalClients',     COUNT(*) FILTER (WHERE role = 'client'),
      'totalAccounts',    (SELECT COUNT(*) FROM public.accounts),
      'pendingAccounts',  (SELECT COUNT(*) FROM public.accounts  WHERE status = 'pending'),
      'approvedAccounts', (SELECT COUNT(*) FROM public.accounts  WHERE status = 'approved'),
      'totalProducts',    (SELECT COUNT(*) FROM public.catalog_items),
      'pendingProducts',  (SELECT COUNT(*) FROM public.catalog_items WHERE approval_status = 'pending'),
      'totalOrders',      (SELECT COUNT(*) FROM public.order_logs)
    )
    FROM public.profiles
  );
END;
$$;
