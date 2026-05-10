import { createServerSupabase } from '@/lib/supabase/server'
import KeuanganClient from './KeuanganClient'

export default async function KeuanganPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('keuangan')
    .select('*')
    .order('tanggal', { ascending: false })

  return <KeuanganClient initialData={data || []} />
}
