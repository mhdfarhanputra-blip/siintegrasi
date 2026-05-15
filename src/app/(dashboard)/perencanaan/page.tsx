import { createServerSupabase } from '@/lib/supabase/server'
import PerencanaanClient from './PerencanaanClient'
import realisasiData from '@/lib/realisasi-data.json'

export default async function PerencanaanPage() {
  const supabase = await createServerSupabase()

  const [dipaRes, paguRes] = await Promise.all([
    supabase
      .from('dokumen_dipa')
      .select('id, revisi_ke, link_dipa, link_rkakl, keterangan_revisi, created_at')
      .order('revisi_ke', { ascending: true }),
    supabase.rpc('get_pagu_vs_realisasi'),
  ])

  return (
    <PerencanaanClient
      initialData={dipaRes.data ?? []}
      paguRealisasi={paguRes.data ?? []}
      realisasiExcel={realisasiData}
    />
  )
}
