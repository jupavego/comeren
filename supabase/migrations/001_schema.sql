-- ============================================================
-- 001_schema.sql
-- Schema principal del sistema Come en Girardota
-- Ejecutar primero, antes que cualquier otro migration
-- ============================================================

-- ── Extensiones necesarias ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Tipos enumerados ─────────────────────────────────────────
-- Rol de usuario dentro del sistema
CREATE TYPE user_role AS ENUM ('client', 'business', 'admin');

-- Estado del ciclo de vida de un negocio
CREATE TYPE account_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- ── Tabla: profiles ──────────────────────────────────────────
-- Extiende auth.users de Supabase con datos del perfil de usuario.
-- Se crea automáticamente vía trigger cuando se registra un usuario.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL DEFAULT 'client',
  full_name   TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tabla: accounts ──────────────────────────────────────────
-- Representa la ficha pública de un negocio en el directorio.
-- Un usuario de rol 'business' puede tener como máximo un account.
CREATE TABLE IF NOT EXISTS public.accounts (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT          NOT NULL,
  description TEXT,
  slogan      TEXT,
  history     TEXT,
  address     TEXT,
  zone        TEXT,
  phone       TEXT,
  schedule    TEXT,
  category    TEXT,
  logo_url    TEXT,
  cover_url   TEXT,
  facebook    TEXT,
  instagram   TEXT,
  whatsapp    TEXT,
  active      BOOLEAN       NOT NULL DEFAULT FALSE,
  status      account_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Un usuario business solo puede tener un negocio
  CONSTRAINT accounts_owner_unique UNIQUE (owner_id)
);

-- ── Tabla: catalog_items ─────────────────────────────────────
-- Productos o ítems del catálogo de un negocio.
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url   TEXT,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────
-- Búsqueda de negocios por propietario
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id   ON public.accounts(owner_id);
-- Filtro por estado en panel admin
CREATE INDEX IF NOT EXISTS idx_accounts_status     ON public.accounts(status);
-- Filtro por categoría en el directorio público
CREATE INDEX IF NOT EXISTS idx_accounts_category   ON public.accounts(category);
-- Filtro por negocio en el catálogo
CREATE INDEX IF NOT EXISTS idx_catalog_account_id  ON public.catalog_items(account_id);
-- Filtro de productos activos
CREATE INDEX IF NOT EXISTS idx_catalog_active      ON public.catalog_items(active);

-- ── Función helper: obtener rol del JWT ──────────────────────
-- Evita consultar la tabla profiles dentro de políticas RLS
-- previniendo recursión infinita.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'role',
    (auth.jwt() ->> 'role')
  );
$$;