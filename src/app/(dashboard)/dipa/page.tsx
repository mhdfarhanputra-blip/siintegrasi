import { createServerSupabase } from '@/lib/supabase/server'
import DipaClient from './DipaClient'

export default async function DipaPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('dokumen_dipa')
    .select('*')
    .order('revisi_ke', { ascending: false })

  return <DipaClient initialData={data || []} />
}
