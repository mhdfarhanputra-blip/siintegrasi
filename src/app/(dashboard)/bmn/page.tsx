import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import BmnClient from './BmnClient'

export default async function BmnPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'bmn')) redirect('/')

  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('bmn')
    .select('*')
    .order('updated_at', { ascending: false })

  const key = `${data?.length ?? 0}:${data?.[0]?.id ?? 'empty'}:${data?.[0]?.updated_at ?? ''}`
  return <BmnClient key={key} initialData={data || []} />
}
