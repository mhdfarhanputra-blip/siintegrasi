import { createServerSupabase } from '@/lib/supabase/server'
import BmnClient from './BmnClient'

export default async function BmnPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('bmn')
    .select('*')
    .order('updated_at', { ascending: false })

  return <BmnClient initialData={data || []} />
}
