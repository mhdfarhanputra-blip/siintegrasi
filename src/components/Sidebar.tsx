'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getRoleLabel } from '@/lib/access'
import {
  LayoutDashboard,
  Wallet,
  Package,
  Building2,
  Zap,
  FileText,
  BarChart3,
  Users,
  History,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'

interface MenuItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: string[]
  description?: string
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Utama',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        roles: ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'],
        description: 'Ringkasan kinerja',
      },
    ],
  },
  {
    title: 'Operasional',
    items: [
      {
        href: '/keuangan',
        label: 'Keuangan',
        icon: Wallet,
        roles: ['Admin', 'Bendahara'],
        description: 'Kas & transaksi',
      },
      {
        href: '/persediaan',
        label: 'Persediaan',
        icon: Package,
        roles: ['Admin', 'Bendahara', 'BMN'],
        description: 'Stok barang',
      },
      {
        href: '/bmn',
        label: 'BMN',
        icon: Building2,
        roles: ['Admin', 'BMN'],
        description: 'Barang Milik Negara',
      },
      {
        href: '/utilitas',
        label: 'Utilitas',
        icon: Zap,
        roles: ['Admin', 'Teknis', 'Perencanaan', 'Pengusul'],
        description: 'Perizinan jalan',
      },
    ],
  },
  {
    title: 'Perencanaan',
    items: [
      {
        href: '/dipa',
        label: 'DIPA & RKA-KL',
        icon: FileText,
        roles: ['Admin', 'Perencanaan', 'Teknis', 'Bendahara', 'BMN'],
        description: 'Dokumen anggaran',
      },
      {
        href: '/perencanaan',
        label: 'Analisa Anggaran',
        icon: BarChart3,
        roles: ['Admin', 'Perencanaan', 'Bendahara', 'Teknis', 'BMN'],
        description: 'Kronologi & tren revisi',
      },
    ],
  },
  {
    title: 'Administrasi',
    items: [
      {
        href: '/pengguna',
        label: 'Pengguna',
        icon: Users,
        roles: ['Admin'],
        description: 'Akun & akses',
      },
      {
        href: '/audit',
        label: 'Audit Log',
        icon: History,
        roles: ['Admin'],
        description: 'Jejak aktivitas',
      },
    ],
  },
]

interface SidebarProps {
  userRole: string
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleGroups = MENU_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.roles.includes(userRole)),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 bg-[var(--color-navy-900)] text-white p-2.5 rounded-xl shadow-lg"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-[var(--color-navy-950)]/70 backdrop-blur-sm z-40 fade-in"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-72 flex flex-col z-50 transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
          bg-[var(--color-navy-900)]
          before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(199,154,74,0.14),transparent_50%)] before:pointer-events-none
        `}
      >
        <div className="relative px-5 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/20 p-1.5">
              <Image src="/logo.png" alt="Logo SI Terintegrasi" width={36} height={36} className="object-contain" priority />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm tracking-tight font-display">SI Terintegrasi</h2>
              <p className="text-white/55 text-[11px] tracking-wide">Manajemen Operasional</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-white/70 hover:text-white"
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-5">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/40">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                        ${isActive
                          ? 'bg-gradient-to-r from-[var(--color-gold-500)]/20 to-transparent text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'}
                      `}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r bg-[var(--color-gold-500)]" />
                      )}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                          ${isActive
                            ? 'bg-[var(--color-gold-500)]/25 text-[var(--color-gold-300)]'
                            : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'}
                        `}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">{item.label}</p>
                        {item.description && (
                          <p className="text-[10.5px] text-white/45 truncate">{item.description}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/5">
            <ShieldCheck size={14} className="text-[var(--color-gold-400)]" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40">Role</p>
              <p className="text-xs text-white font-medium">{getRoleLabel(userRole)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
