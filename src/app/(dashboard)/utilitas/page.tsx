import { createServerSupabase } from '@/lib/supabase/server'
import UtilitasClient from './UtilitasClient'

export default async function UtilitasPage() {
  const supabase = await createServerSupabase()
  const { data: utilitas } = await supabase
    .from('utilitas')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: transmital } = await supabase
    .from('transmital')
    .select('*')
    .order('waktu_masuk', { ascending: true })

  return (
    <UtilitasClient
      initialData={utilitas || []}
      initialTransmital={transmital || []}
    />
  )
}
