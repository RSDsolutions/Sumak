-- ============================================================
-- SUMAK — Migration 009 — SEC-008
-- ============================================================
-- Endurece los buckets de storage con:
--   • file_size_limit: 5 MB (coincide con la validación del frontend)
--   • allowed_mime_types: solo imágenes y PDF para vouchers/documentos
--
-- Sin esto, un atacante podría subir un binario de 500 MB con curl
-- directo al endpoint del bucket, llenando la cuota de Supabase.
-- ============================================================
-- Idempotente.
-- ============================================================

update storage.buckets
  set file_size_limit = 5242880,  -- 5 * 1024 * 1024 bytes
      allowed_mime_types = array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'application/pdf'
      ]
  where id in ('pedidos-vouchers', 'documentos-afiliacion');

-- ============================================================
-- VERIFICACIÓN sugerida:
--   select id, file_size_limit, allowed_mime_types
--     from storage.buckets
--    where id in ('pedidos-vouchers', 'documentos-afiliacion');
--   -- ambos deben aparecer con limit=5242880 y los 5 mime_types.
-- ============================================================
