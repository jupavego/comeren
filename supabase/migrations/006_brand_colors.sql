-- Agrega soporte de colores corporativos al perfil del negocio
-- Hasta 4 valores hex (ej: ['#5e49d6', '#e25232'])
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS brand_colors TEXT[] DEFAULT NULL;
