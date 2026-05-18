import { getCurrentUser } from '@/lib/getCurrentUser'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditClient from './AuditClient'

export default async function AuditPage() {
  const me = await getCurrentUser()
  if (!me || me.role !== 'Admin') redirect('/')

  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('audit_log')
    .select('id, actor_email, action, entity_type, entity_id, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  return <AuditClient initialData={data ?? []} />
}
