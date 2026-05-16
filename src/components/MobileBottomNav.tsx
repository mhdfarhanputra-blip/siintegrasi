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
  BarChart3,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: string[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Beranda', icon: LayoutDashboard, roles: ['*'] },
  { href: '/keuangan', label: 'Keuangan', icon: Wallet, roles: ['Admin', 'Bendahara'] },
  { href: '/persediaan', label: 'Stok', icon: Package, roles: ['Admin', 'Bendahara', 'BMN'] },
  { href: '/bmn', label: 'BMN', icon: Building2, roles: ['Admin', 'BMN'] },
  { href: '/utilitas', label: 'Utilitas', icon: Zap, roles: ['Admin', 'Teknis', 'Perencanaan', 'Pengusul'] },
  { href: '/dipa', label: 'DIPA', icon: FileText, roles: ['Admin', 'Perencanaan', 'Teknis', 'Bendahara', 'BMN'] },
  { href: '/perencanaan', label: 'Analisa', icon: BarChart3, roles: ['Admin', 'Perencanaan', 'Bendahara', 'Teknis', 'BMN'] },
]

const MAX_VISIBLE = 5

interface MobileBottomNavProps {
  userRole: string
}

export default function MobileBottomNav({ userRole }: MobileBottomNavProps) {
  const pathname = usePathname()

  const visibleItems = ALL_NAV_ITEMS
    .filter((item) => item.roles.includes('*') || item.roles.includes(userRole))
    .slice(0, MAX_VISIBLE)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[var(--color-surface-200)] shadow-[0_-1px_4px_rgba(12,30,62,0.05)]"
      aria-label="Navigasi mobile"
    >
      <div className="grid grid-cols-5 h-16">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition ${
                isActive ? 'text-[var(--color-gold-600)]' : 'text-[var(--color-ink-500)]'
              }`}
            >
              {isActive && <span className="absolute top-0 w-8 h-0.5 bg-[var(--color-gold-500)] rounded-b-full" />}
              <Icon size={18} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-[var(--color-navy-900)]' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
