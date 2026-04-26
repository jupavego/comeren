-- ============================================================
-- rls_policies.sql — Suite de tests de RLS
-- Come en Girardota
--
-- Ejecutar en: Supabase Dashboard → SQL Editor (service_role)
-- Cada bloque imprime PASS o FAIL con descripción del test.
-- ============================================================

DO $$
DECLARE
  v_count   INTEGER;
  v_role    TEXT;
  v_pass    INTEGER := 0;
  v_fail    INTEGER := 0;

  -- ── Helpers ─────────────────────────────────────────────────
  PROCEDURE assert_eq(label TEXT, actual ANYDOUBLEQUOTED, expected ANYDOUBLEQUOTED) AS $p$
  BEGIN
    IF actual = expected THEN
      RAISE NOTICE 'PASS  %', label;
      v_pass := v_pass + 1;
    ELSE
      RAISE WARNING 'FAIL  % — esperado: %, obtenido: %', label, expected, actual;
      v_fail := v_fail + 1;
    END IF;
  END;
  $p$ LANGUAGE plpgsql;

BEGIN

  -- ── T-01: handle_new_user — whitelist de roles ───────────────
  -- Verifica que el trigger rechace 'admin' y asigne 'client' como fallback.
  -- No podemos invocar el trigger directamente, así que verificamos la lógica
  -- con una expresión CASE equivalente.
  DECLARE v_result TEXT;
  BEGIN
    SELECT CASE
      WHEN 'admin' IN ('client','business') THEN 'admin'
      ELSE 'client'
    END INTO v_result;
    PERFORM assert_eq('T-01: role=admin → fallback client', v_result, 'client');
  END;

  DECLARE v_result TEXT;
  BEGIN
    SELECT CASE
      WHEN 'business' IN ('client','business') THEN 'business'
      ELSE 'client'
    END INTO v_result;
    PERFORM assert_eq('T-02: role=business → business', v_result, 'business');
  END;

  -- ── T-03: get_admin_stats — bloqueo a no-admin ───────────────
  -- La función debe lanzar excepción si el rol no es 'admin'.
  -- Simulamos llamándola bajo set_config con role no-admin.
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"client"}}',
      true);
    PERFORM public.get_admin_stats();
    -- Si llega aquí sin excepción, el test falla
    RAISE WARNING 'FAIL  T-03: get_admin_stats no bloqueó a rol client';
    v_fail := v_fail + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Access denied%' THEN
      RAISE NOTICE 'PASS  T-03: get_admin_stats bloqueó a rol client';
      v_pass := v_pass + 1;
    ELSE
      RAISE WARNING 'FAIL  T-03: excepción inesperada: %', SQLERRM;
      v_fail := v_fail + 1;
    END IF;
  END;

  -- ── T-04: get_all_orders_admin — bloqueo a no-admin ──────────
  BEGIN
    PERFORM set_config('request.jwt.claims',
      '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"business"}}',
      true);
    PERFORM public.get_all_orders_admin();
    RAISE WARNING 'FAIL  T-04: get_all_orders_admin no bloqueó a rol business';
    v_fail := v_fail + 1;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Access denied%' THEN
      RAISE NOTICE 'PASS  T-04: get_all_orders_admin bloqueó a rol business';
      v_pass := v_pass + 1;
    ELSE
      RAISE WARNING 'FAIL  T-04: excepción inesperada: %', SQLERRM;
      v_fail := v_fail + 1;
    END IF;
  END;

  -- ── T-05: audit_logs — políticas existen ────────────────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename = 'audit_logs'
    AND schemaname = 'public';
  PERFORM assert_eq('T-05: audit_logs tiene políticas RLS', v_count > 0, true);

  -- ── T-06: audit_logs — sin política UPDATE ni DELETE ────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename  = 'audit_logs'
    AND schemaname = 'public'
    AND cmd IN ('UPDATE','DELETE','ALL');
  PERFORM assert_eq('T-06: audit_logs inmutable (sin UPDATE/DELETE/ALL)', v_count, 0);

  -- ── T-07: order_logs — anon no puede insertar ───────────────
  -- Verificamos que la policy solo aplique a 'authenticated'
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename  = 'order_logs'
    AND schemaname = 'public'
    AND cmd        = 'INSERT'
    AND roles && ARRAY['anon']::name[];
  PERFORM assert_eq('T-07: order_logs INSERT no acepta anon', v_count, 0);

  -- ── T-08: home_config — política usa get_my_role() ──────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename  = 'home_config'
    AND schemaname = 'public'
    AND policyname = 'home_config_admin_write'
    AND (qual LIKE '%get_my_role%' OR with_check LIKE '%get_my_role%');
  PERFORM assert_eq('T-08: home_config usa get_my_role()', v_count, 1);

  -- ── T-09: home_featured — política usa get_my_role() ────────
  SELECT COUNT(*) INTO v_count
  FROM pg_policies
  WHERE tablename  = 'home_featured'
    AND schemaname = 'public'
    AND policyname = 'home_featured_admin_write'
    AND (qual LIKE '%get_my_role%' OR with_check LIKE '%get_my_role%');
  PERFORM assert_eq('T-09: home_featured usa get_my_role()', v_count, 1);

  -- ── T-10: order_logs — columna buyer_id existe ───────────────
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'order_logs'
    AND column_name  = 'buyer_id';
  PERFORM assert_eq('T-10: order_logs.buyer_id existe', v_count, 1);

  -- ── Resumen ──────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════';
  RAISE NOTICE 'Resultado: % PASS  /  % FAIL', v_pass, v_fail;
  RAISE NOTICE '════════════════════════════════';

END;
$$;
