import { createServerSupabase } from '@/lib/supabase/server'
import PenggunaClient from './PenggunaClient'

export default async function PenggunaPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('profiles')
    .select('id, email, nama, role, status, created_at, approved_at')
    .order('created_at', { ascending: false })

  return <PenggunaClient initialData={data || []} currentUserId={user?.id ?? ''} />
}
