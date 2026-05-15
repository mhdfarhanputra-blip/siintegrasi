import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AiAssistant from '@/components/AiAssistant'
import { getCurrentUser } from '@/lib/getCurrentUser'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser()
  if (!me) redirect('/login')

  if (me.status !== 'Aktif') {
    redirect('/pending')
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-50)]">
      <Sidebar userRole={me.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userName={me.nama} userRole={me.role} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 lg:p-8 focus:outline-none">
          {children}
        </main>
      </div>
      <AiAssistant />
    </div>
  )
}
