import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { canAccessModule } from '@/lib/access'
import { redirect } from 'next/navigation'
import UtilitasClient from './UtilitasClient'

export default async function UtilitasPage() {
  const me = await getCurrentUser()
  if (!canAccessModule(me?.role, 'utilitas')) redirect('/')

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  // Enforce SLA: auto-reject permohonan yang > 2 hari tanpa pemeriksaan
  try { await supabase.rpc('enforce_utilitas_sla') } catch { /* non-critical */ }

  const { data: utilitas } = await supabase
    .from('utilitas')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: transmital } = await supabase
    .from('transmital')
    .select('*, profiles:pic(nama)')
    .order('waktu_masuk', { ascending: true })

  return (
    <UtilitasClient
      initialData={utilitas || []}
      initialTransmital={transmital || []}
      currentUserId={user?.id ?? ''}
      key={`${utilitas?.length ?? 0}:${utilitas?.[0]?.id ?? 'empty'}:${transmital?.length ?? 0}`}
      userRole={me?.role ?? 'Pengusul'}
    />
  )
}
