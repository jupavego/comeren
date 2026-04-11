-- ============================================================
-- 003_triggers.sql
-- Triggers automáticos — Come en Girardota
-- Ejecutar después de 002_rls_policies.sql
-- ============================================================

-- ── Trigger 1: crear perfil al registrarse ───────────────────
-- Cuando Supabase crea un usuario en auth.users, este trigger
-- crea automáticamente su fila correspondiente en public.profiles.
-- Lee el rol y el nombre desde raw_user_meta_data que el cliente
-- envía en el signUp({ options: { data: { role, full_name } } }).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER           -- necesario para escribir en profiles sin RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'client'
    ),
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotente si se llama dos veces
  RETURN NEW;
END;
$$;

-- Asociar la función al evento de inserción en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Trigger 2: sincronizar rol al JWT ────────────────────────
-- Cuando el admin cambia el rol de un usuario en profiles,
-- este trigger actualiza los app_metadata de auth.users para que
-- el nuevo rol quede reflejado en el JWT en la próxima sesión.
-- Esto permite que get_my_role() lea del JWT sin consultar la tabla.

CREATE OR REPLACE FUNCTION public.handle_profile_role_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar si realmente cambió el rol
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_role_change();

-- ── Trigger 3: active se sincroniza con status ───────────────
-- Garantiza que active siempre refleje si el negocio está aprobado.
-- Evita inconsistencias si alguien actualiza status sin tocar active.

CREATE OR REPLACE FUNCTION public.handle_account_status_change()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.active := (NEW.status = 'approved');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_account_status_change ON public.accounts;
CREATE TRIGGER on_account_status_change
  BEFORE UPDATE OF status ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_account_status_change();