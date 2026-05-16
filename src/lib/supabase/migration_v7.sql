-- ============================================
-- Migration v7: tighten role access policies
-- ============================================

CREATE OR REPLACE FUNCTION public.has_active_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'Aktif'
      AND role = ANY(allowed_roles)
  );
$$;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_active_role(ARRAY['Admin']));

DROP POLICY IF EXISTS "keuangan_select" ON public.keuangan;
CREATE POLICY "keuangan_select" ON public.keuangan
  FOR SELECT TO authenticated USING (public.has_active_role(ARRAY['Admin','Bendahara']));
DROP POLICY IF EXISTS "keuangan_write" ON public.keuangan;
CREATE POLICY "keuangan_write" ON public.keuangan
  FOR ALL TO authenticated
  USING (public.has_active_role(ARRAY['Admin','Bendahara']))
  WITH CHECK (public.has_active_role(ARRAY['Admin','Bendahara']));

DROP POLICY IF EXISTS "persediaan_select" ON public.persediaan;
CREATE POLICY "persediaan_select" ON public.persediaan
  FOR SELECT TO authenticated USING (public.has_active_role(ARRAY['Admin','Bendahara','BMN']));
DROP POLICY IF EXISTS "persediaan_write" ON public.persediaan;
CREATE POLICY "persediaan_write" ON public.persediaan
  FOR ALL TO authenticated
  USING (public.has_active_role(ARRAY['Admin','Bendahara','BMN']))
  WITH CHECK (public.has_active_role(ARRAY['Admin','Bendahara','BMN']));

DROP POLICY IF EXISTS "bmn_select" ON public.bmn;
CREATE POLICY "bmn_select" ON public.bmn
  FOR SELECT TO authenticated USING (public.has_active_role(ARRAY['Admin','BMN']));
DROP POLICY IF EXISTS "bmn_write" ON public.bmn;
CREATE POLICY "bmn_write" ON public.bmn
  FOR ALL TO authenticated
  USING (public.has_active_role(ARRAY['Admin','BMN']))
  WITH CHECK (public.has_active_role(ARRAY['Admin','BMN']));

DROP POLICY IF EXISTS "dipa_select" ON public.dokumen_dipa;
CREATE POLICY "dipa_select" ON public.dokumen_dipa
  FOR SELECT TO authenticated
  USING (public.has_active_role(ARRAY['Admin','Perencanaan','Teknis','Bendahara','BMN']));
DROP POLICY IF EXISTS "dipa_write" ON public.dokumen_dipa;
CREATE POLICY "dipa_write" ON public.dokumen_dipa
  FOR ALL TO authenticated
  USING (public.has_active_role(ARRAY['Admin']))
  WITH CHECK (public.has_active_role(ARRAY['Admin']));

DROP POLICY IF EXISTS "utilitas_select" ON public.utilitas;
CREATE POLICY "utilitas_select" ON public.utilitas
  FOR SELECT TO authenticated
  USING (
    public.has_active_role(ARRAY['Admin','Teknis','Perencanaan'])
    OR (public.has_active_role(ARRAY['Pengusul']) AND input_by = auth.uid())
  );

DROP POLICY IF EXISTS "utilitas_insert" ON public.utilitas;
CREATE POLICY "utilitas_insert" ON public.utilitas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_active_role(ARRAY['Admin','Pengusul'])
    AND input_by = auth.uid()
  );

DROP POLICY IF EXISTS "utilitas_update" ON public.utilitas;
CREATE POLICY "utilitas_update" ON public.utilitas
  FOR UPDATE TO authenticated
  USING (
    public.has_active_role(ARRAY['Admin','Teknis','Perencanaan'])
    OR (
      public.has_active_role(ARRAY['Pengusul'])
      AND input_by = auth.uid()
      AND status IN ('DIAJUKAN','REVISI')
    )
  )
  WITH CHECK (
    public.has_active_role(ARRAY['Admin','Teknis','Perencanaan'])
    OR (
      public.has_active_role(ARRAY['Pengusul'])
      AND input_by = auth.uid()
      AND status IN ('DIAJUKAN','PEMERIKSAAN','REVISI')
    )
  );

DROP POLICY IF EXISTS "utilitas_delete" ON public.utilitas;
CREATE POLICY "utilitas_delete" ON public.utilitas
  FOR DELETE TO authenticated USING (public.has_active_role(ARRAY['Admin']));

