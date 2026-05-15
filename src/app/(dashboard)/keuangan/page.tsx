import { createServerSupabase } from '@/lib/supabase/server'
import KeuanganClient from './KeuanganClient'

export default async function KeuanganPage() {
  const supabase = await createServerSupabase()
  const [{ data: transaksi }, { data: kategori }] = await Promise.all([
    supabase.from('keuangan').select('*').order('tanggal', { ascending: false }),
    supabase
      .from('kategori_keuangan')
      .select('id, nama, jenis_default, aktif')
      .eq('aktif', true)
      .order('urutan', { ascending: true }),
  ])

  return <KeuanganClient initialData={transaksi || []} kategoriList={kategori || []} />
}
