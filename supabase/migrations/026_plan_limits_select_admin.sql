-- ============================================================
-- 026_plan_limits_select_admin.sql
-- Permite al admin leer plan_limits directamente
-- ============================================================
-- El selector de paquetes en el panel admin ("Ampliar plan")
-- tenía los tamaños de cada paquete hardcodeados como texto en
-- el frontend (PLAN_PACKAGES), duplicando la fuente de verdad
-- real que es esta tabla — si se cambiaban los límites acá, el
-- texto del dropdown quedaba desactualizado sin avisar. Ahora
-- el frontend los trae en vivo.
-- ============================================================

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_limits_select_admin" ON public.plan_limits;

CREATE POLICY "plan_limits_select_admin"
  ON public.plan_limits FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');
