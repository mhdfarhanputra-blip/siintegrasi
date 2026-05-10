import { createServerSupabase } from '@/lib/supabase/server'
import { Wallet, Package, Building2, Zap } from 'lucide-react'

async function getMetrics() {
  const supabase = await createServerSupabase()

  const [keuangan, persediaan, bmn, utilitas] = await Promise.all([
    supabase.from('keuangan').select('id', { count: 'exact', head: true }),
    supabase.from('persediaan').select('id', { count: 'exact', head: true }),
    supabase.from('bmn').select('id', { count: 'exact', head: true }),
    supabase.from('utilitas').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
  ])

  return {
    totalKeuangan: keuangan.count ?? 0,
    totalPersediaan: persediaan.count ?? 0,
    totalBmn: bmn.count ?? 0,
    utilitasOpen: utilitas.count ?? 0,
  }
}

export default async function DashboardPage() {
  const metrics = await getMetrics()

  const cards = [
    { label: 'Transaksi Keuangan', value: metrics.totalKeuangan, icon: Wallet, color: 'bg-blue-500' },
    { label: 'Item Persediaan', value: metrics.totalPersediaan, icon: Package, color: 'bg-green-500' },
    { label: 'Aset BMN', value: metrics.totalBmn, icon: Building2, color: 'bg-purple-500' },
    { label: 'Utilitas Open', value: metrics.utilitasOpen, icon: Zap, color: 'bg-orange-500' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0c1e3e] mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#0c1e3e]">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
