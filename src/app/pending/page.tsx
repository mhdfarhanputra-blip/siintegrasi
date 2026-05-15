import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import PendingClient from './PendingClient'

export default async function PendingPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  if (me.status === 'Aktif') redirect('/')

  // Ambil created_at lengkap untuk ditampilkan
  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', me.id)
    .maybeSingle()

  return (
    <PendingClient
      nama={me.nama}
      email={me.email}
      status={me.status}
      role={me.role}
      createdAt={profile?.created_at ?? null}
    />
  )
}
