import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import PersediaanClient from './PersediaanClient'

export default async function PersediaanPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'persediaan')) redirect('/')

  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('persediaan')
    .select('*')
    .order('tanggal', { ascending: false })

  const key = `${data?.length ?? 0}:${data?.[0]?.id ?? 'empty'}:${data?.[0]?.created_at ?? ''}`
  return <PersediaanClient key={key} initialData={data || []} />
}
