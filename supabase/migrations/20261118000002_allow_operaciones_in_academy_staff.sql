-- =============================================================================
-- MIGRACIÓN: 20261118000002_allow_operaciones_in_academy_staff.sql
-- DESCRIPCIÓN:
--   1. Incluye a `public.is_operaciones_or_admin()` dentro de `public.is_academy_staff()`
--      para que el rol Operaciones pueda gestionar cobros de recetas, inscripciones
--      de cursos y revisar comprobantes de pago de SUMAK Academy.
--   2. Permite a Operaciones y Staff Academy leer registros de `public.pagos`
--      y comprobantes en el bucket `academy-receipts`.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_academy_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    public.is_academy_admin()
    OR public.is_operaciones_or_admin()
    OR public.is_academy_instructor()
  );
END;
$$;

DROP POLICY IF EXISTS "Users can read own payment records" ON public.pagos;
CREATE POLICY "Users can read own payment records"
  ON public.pagos
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_operaciones_or_admin()
    OR public.is_academy_staff()
  );

DROP POLICY IF EXISTS "Receipts: usuario lee los suyos o admin" ON storage.objects;
CREATE POLICY "Receipts: usuario lee los suyos o admin"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'academy-receipts'
    AND (
      public.is_academy_staff()
      OR EXISTS (
        SELECT 1
        FROM public.academy_recipe_purchases p
        WHERE p.payment_receipt_url = name
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.academy_enrollments e
        WHERE e.payment_receipt_url = name
          AND e.user_id = auth.uid()
      )
    )
  );

COMMIT;
