import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DipaClient from './DipaClient'

export default async function DipaPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  if (profile?.role === 'Pengusul') {
    redirect('/')
  }

  const { data } = await supabase
    .from('dokumen_dipa')
    .select('*')
    .order('revisi_ke', { ascending: false })

  return <DipaClient initialData={data || []} userRole={profile?.role ?? 'Pengusul'} />
}
