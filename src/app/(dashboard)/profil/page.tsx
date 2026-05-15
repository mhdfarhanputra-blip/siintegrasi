import { getCurrentUser } from '@/lib/getCurrentUser'
import { redirect } from 'next/navigation'
import ProfilClient from './ProfilClient'

export default async function ProfilPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  return <ProfilClient user={me} />
}
