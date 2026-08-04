-- ============================================================
-- 018_sec_storage_size_limit.sql
-- SEC-010 | OWASP A05: Security Misconfiguration
-- ============================================================
-- Riesgo: storage.service.ts valida tamaño (5 MB) y tipo de
-- archivo SOLO en el navegador (validateImageFile). Supabase no
-- tenía ninguna restricción del lado del servidor — cualquier
-- llamada directa a la Storage API (curl, Postman, un cliente
-- distinto a esta app) podía subir archivos de cualquier tamaño.
-- Ya hay evidencia real en producción: fotos de hasta 24.78 MB
-- en el bucket catalog, muy por encima del límite que el
-- formulario dice imponer.
--
-- Fix: usar el enforcement nativo de Supabase Storage a nivel
-- de bucket (file_size_limit + allowed_mime_types). Lo aplica
-- la Storage API antes de tocar RLS — no se puede evadir desde
-- ningún cliente.
--
-- Nota: esto NO afecta archivos ya subidos que excedan el
-- límite; solo bloquea subidas nuevas. La limpieza de archivos
-- existentes sobredimensionados queda como tarea aparte.
-- ============================================================

UPDATE storage.buckets
SET
  file_size_limit    = 5242880,  -- 5 MB, mismo tope que valida el cliente
  allowed_mime_types  = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'accounts', 'catalog');
