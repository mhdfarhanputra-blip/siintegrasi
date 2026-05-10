import { createServerSupabase } from '@/lib/supabase/server'
import PenggunaClient from './PenggunaClient'

export default async function PenggunaPage() {
  const supabase = await createServerSupabase()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('email', { ascending: true })

  return <PenggunaClient initialData={data || []} />
}
