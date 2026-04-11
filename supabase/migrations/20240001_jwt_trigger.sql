-- ============================================================
-- TRIGGER: sincronizar el rol del perfil en el JWT de Supabase
-- Esto es CRÍTICO para que get_my_role() funcione correctamente
--
-- Supabase guarda claims extra en auth.users.raw_app_meta_data
-- El JWT los incluye automáticamente
-- Sin esto, get_my_role() siempre devuelve null para usuarios nuevos
-- ============================================================

-- Función que copia el rol de profiles → JWT claims
CREATE OR REPLACE FUNCTION public.sync_role_to_jwt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cuando se actualiza o inserta un perfil, sincroniza el rol al JWT
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger en profiles: se ejecuta en INSERT y UPDATE
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_jwt();


-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- Sin esto, profiles queda vacío y fetchProfile devuelve null
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'client'),
    NEW.raw_user_meta_data ->> 'full_name',
    NULL,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SINCRONIZACIÓN MANUAL: actualizar JWT de usuarios existentes
-- Ejecutar UNA SOLA VEZ para usuarios que ya estaban creados
-- ============================================================
UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id;