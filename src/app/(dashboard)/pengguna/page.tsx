import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import PenggunaClient from './PenggunaClient'

export default async function PenggunaPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'pengguna')) redirect('/')

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('id, email, nama, role, status, created_at, approved_at')
    .order('created_at', { ascending: false })

  const key = `${data?.length ?? 0}:${data?.[0]?.id ?? 'empty'}:${data?.[0]?.approved_at ?? data?.[0]?.created_at ?? ''}`
  return <PenggunaClient key={key} initialData={data || []} currentUserId={user?.id ?? ''} />
}
