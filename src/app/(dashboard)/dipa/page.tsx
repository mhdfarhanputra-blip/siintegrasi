import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import DipaClient from './DipaClient'

export default async function DipaPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'dipa')) redirect('/')

  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('dokumen_dipa')
    .select('*')
    .order('revisi_ke', { ascending: false })

  const key = `${data?.length ?? 0}:${data?.[0]?.id ?? 'empty'}:${data?.[0]?.created_at ?? ''}`
  return <DipaClient key={key} initialData={data || []} userRole={me?.role ?? 'Pengusul'} />
}
