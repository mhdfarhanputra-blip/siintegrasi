import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import KeuanganClient from './KeuanganClient'

export default async function KeuanganPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'keuangan')) redirect('/')

  const supabase = await createServerSupabase()
  const [{ data: transaksi }, { data: kategori }] = await Promise.all([
    supabase.from('keuangan').select('*').order('tanggal', { ascending: false }),
    supabase
      .from('kategori_keuangan')
      .select('id, nama, jenis_default, aktif')
      .eq('aktif', true)
      .order('urutan', { ascending: true }),
  ])

  const key = `${transaksi?.length ?? 0}:${transaksi?.[0]?.id ?? 'empty'}:${transaksi?.[0]?.created_at ?? ''}`
  return <KeuanganClient key={key} initialData={transaksi || []} kategoriList={kategori || []} />
}
