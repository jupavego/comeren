-- ============================================================
-- 009_home_config.sql
-- Configuración del home: slide de bienvenida + negocios
-- destacados en el carrusel — Come en Girardota
-- ============================================================

-- ── Tabla de configuración del slide de bienvenida ────────────
CREATE TABLE IF NOT EXISTS public.home_config (
  id                   BOOLEAN     PRIMARY KEY DEFAULT TRUE,
  CONSTRAINT           only_one_row CHECK (id = TRUE),
  slide1_title         TEXT        NOT NULL DEFAULT 'Sabores que se sienten locales',
  slide1_description   TEXT                 DEFAULT 'Explora negocios de comida en Girardota y encuentra una opción rica, cercana y confiable.',
  slide1_primary_btn   TEXT                 DEFAULT 'Explorar negocios',
  slide1_secondary_btn TEXT                 DEFAULT 'Ver destacados',
  slide1_image_url     TEXT,
  updated_at           TIMESTAMPTZ          DEFAULT now()
);

ALTER TABLE public.home_config ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el home la necesita sin autenticación)
CREATE POLICY "home_config_select_all"
  ON public.home_config FOR SELECT
  USING (true);

-- Escritura solo para admins
CREATE POLICY "home_config_admin_write"
  ON public.home_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ── Tabla de negocios destacados en el carrusel ───────────────
CREATE TABLE IF NOT EXISTS public.home_featured (
  account_id  UUID     NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  order_index SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id)
);

ALTER TABLE public.home_featured ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "home_featured_select_all"
  ON public.home_featured FOR SELECT
  USING (true);

-- Escritura solo para admins
CREATE POLICY "home_featured_admin_write"
  ON public.home_featured FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
