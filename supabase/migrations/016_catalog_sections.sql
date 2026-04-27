-- ============================================================
-- 016_catalog_sections.sql
-- Secciones del catálogo con soporte de ordenamiento (DnD)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. Tabla de secciones ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.catalog_sections (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  position    INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Agregar columnas a catalog_items ───────────────────────
-- section_id: null = producto sin sección (aparece en área libre)
-- position:   orden dentro de su sección (o en el área libre)
ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.catalog_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS position   INT  NOT NULL DEFAULT 0;

-- ── 3. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_catalog_sections_account_id
  ON public.catalog_sections(account_id);

CREATE INDEX IF NOT EXISTS idx_catalog_sections_position
  ON public.catalog_sections(account_id, position);

CREATE INDEX IF NOT EXISTS idx_catalog_items_section_id
  ON public.catalog_items(section_id);

CREATE INDEX IF NOT EXISTS idx_catalog_items_position
  ON public.catalog_items(account_id, section_id, position);

-- ── 4. RLS — catalog_sections ─────────────────────────────────
ALTER TABLE public.catalog_sections ENABLE ROW LEVEL SECURITY;

-- Lectura pública (el directorio las necesita para renderizar el catálogo)
CREATE POLICY "catalog_sections_public_read"
  ON public.catalog_sections FOR SELECT
  USING (true);

-- El dueño del negocio puede crear secciones
CREATE POLICY "catalog_sections_owner_insert"
  ON public.catalog_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT id FROM public.accounts WHERE owner_id = auth.uid()
    )
  );

-- El dueño puede actualizar sus secciones
CREATE POLICY "catalog_sections_owner_update"
  ON public.catalog_sections FOR UPDATE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE owner_id = auth.uid()
    )
  );

-- El dueño puede eliminar sus secciones
CREATE POLICY "catalog_sections_owner_delete"
  ON public.catalog_sections FOR DELETE
  TO authenticated
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE owner_id = auth.uid()
    )
  );

-- Admin puede hacer todo
CREATE POLICY "catalog_sections_admin_all"
  ON public.catalog_sections FOR ALL
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- ── 5. Función para reordenar en batch ───────────────────────
-- Recibe un array de {id, position} y actualiza de una sola vez.
-- Evita N UPDATE individuales desde el cliente.
CREATE OR REPLACE FUNCTION public.reorder_catalog_sections(
  p_account_id UUID,
  p_items JSONB  -- [{"id": "uuid", "position": 0}, ...]
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
BEGIN
  -- Solo el dueño o admin puede reordenar
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND owner_id = auth.uid()
  ) AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.catalog_sections
    SET position = (v_item->>'position')::INT
    WHERE id = (v_item->>'id')::UUID
      AND account_id = p_account_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_catalog_items(
  p_account_id UUID,
  p_items JSONB  -- [{"id": "uuid", "section_id": "uuid|null", "position": 0}, ...]
)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
BEGIN
  -- Solo el dueño o admin puede reordenar
  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND owner_id = auth.uid()
  ) AND public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    UPDATE public.catalog_items
    SET
      section_id = CASE
        WHEN v_item->>'section_id' = 'null' OR v_item->>'section_id' IS NULL
        THEN NULL
        ELSE (v_item->>'section_id')::UUID
      END,
      position = (v_item->>'position')::INT
    WHERE id = (v_item->>'id')::UUID
      AND account_id = p_account_id;
  END LOOP;
END;
$$;
