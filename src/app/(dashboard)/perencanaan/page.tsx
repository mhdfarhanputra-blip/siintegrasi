import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import PerencanaanClient from './PerencanaanClient'
import realisasiData from '@/lib/realisasi-data.json'

export default async function PerencanaanPage() {
  const supabase = await createServerSupabase()
  const me = await getCurrentUser()

  const { data: dipa } = await supabase
    .from('dokumen_dipa')
    .select('id, revisi_ke, tanggal_revisi, link_dipa, link_rkakl, keterangan_revisi, created_at')
    .order('revisi_ke', { ascending: true })

  return (
    <PerencanaanClient
      initialData={dipa ?? []}
      realisasiExcel={realisasiData}
      userRole={me?.role}
    />
  )
}
