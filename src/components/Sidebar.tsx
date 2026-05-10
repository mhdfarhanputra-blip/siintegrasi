'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Package,
  Building2,
  Zap,
  FileText,
  Users,
} from 'lucide-react'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/keuangan', label: 'Keuangan', icon: Wallet },
  { href: '/persediaan', label: 'Persediaan', icon: Package },
  { href: '/bmn', label: 'BMN', icon: Building2 },
  { href: '/utilitas', label: 'Utilitas', icon: Zap },
  { href: '/dipa', label: 'DIPA', icon: FileText },
  { href: '/pengguna', label: 'Pengguna', icon: Users },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-[#0c1e3e] min-h-screen flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c79a4a] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P2JN</span>
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">SI Terintegrasi</h2>
            <p className="text-gray-400 text-xs">P2JN Babel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#c79a4a]/20 text-[#c79a4a]'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
