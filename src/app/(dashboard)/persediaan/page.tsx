import { createServerSupabase } from '@/lib/supabase/server'
import PersediaanClient from './PersediaanClient'

export default async function PersediaanPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('persediaan')
    .select('*')
    .order('tanggal', { ascending: false })

  return <PersediaanClient initialData={data || []} />
}
