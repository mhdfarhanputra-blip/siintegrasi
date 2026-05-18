'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, ChevronDown, UserCircle2, Search } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { getRoleLabel } from '@/lib/access'

interface HeaderProps {
  userName: string
  userRole: string
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Ringkasan kinerja dan status layanan' },
  '/keuangan': { title: 'Keuangan', subtitle: 'Transaksi kas, debit, dan kredit' },
  '/persediaan': { title: 'Persediaan', subtitle: 'Stok barang masuk dan keluar' },
  '/bmn': { title: 'Barang Milik Negara', subtitle: 'Inventaris aset organisasi' },
  '/utilitas': { title: 'Utilitas', subtitle: 'Permohonan perizinan dan transmital' },
  '/dipa': { title: 'DIPA & RKA-KL', subtitle: 'Dokumen anggaran dan revisi' },
  '/perencanaan': { title: 'Perencanaan', subtitle: 'Analisa kronologi revisi anggaran' },
  '/pengguna': { title: 'Manajemen Pengguna', subtitle: 'Daftar akun dan hak akses' },
  '/audit': { title: 'Audit Log', subtitle: 'Jejak aktivitas seluruh modul' },
  '/profil': { title: 'Profil Saya', subtitle: 'Kelola informasi akun' },
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const page = PAGE_TITLES[pathname] ?? {
    title: 'SI Terintegrasi',
    subtitle: 'Manajemen Operasional',
  }

  const initials = userName
    .split(' ')
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      alert('Gagal keluar: ' + msg)
    }
  }

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-[var(--color-surface-200)] flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="ml-12 md:ml-0 min-w-0">
        <h1 className="text-[15px] font-semibold text-[var(--color-navy-900)] tracking-tight truncate font-display">
          {page.title}
        </h1>
        <p className="text-[11.5px] text-[var(--color-ink-500)] truncate">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--color-surface-200)] text-[var(--color-ink-500)] hover:bg-[var(--color-surface-100)] transition text-[11px]"
          aria-label="Buka pencarian cepat"
          title="Pencarian cepat (Ctrl+K)"
        >
          <Search size={13} />
          <span>Cari...</span>
          <kbd className="font-mono bg-[var(--color-surface-100)] px-1 py-0.5 rounded text-[9px] border border-[var(--color-surface-200)]">Ctrl K</kbd>
        </button>
        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[var(--color-surface-100)] transition"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-navy-800)] to-[var(--color-navy-900)] text-white flex items-center justify-center text-xs font-semibold shadow-inner">
              {initials}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-[12.5px] font-semibold text-[var(--color-navy-900)]">{userName}</p>
              <p className="text-[10.5px] text-[var(--color-ink-500)]">{getRoleLabel(userRole)}</p>
            </div>
            <ChevronDown
              size={14}
              className={`hidden md:block text-[var(--color-ink-400)] transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-[var(--color-surface-200)] overflow-hidden fade-in"
            >
              <div className="px-4 py-3 bg-gradient-to-br from-[var(--color-surface-50)] to-[var(--color-surface-100)] border-b border-[var(--color-surface-200)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-navy-900)] text-white flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-navy-900)] truncate">{userName}</p>
                    <p className="text-[11px] text-[var(--color-ink-500)]">Role {getRoleLabel(userRole)}</p>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-surface-100)] transition text-left"
                  onClick={() => { setMenuOpen(false); router.push('/profil') }}
                >
                  <UserCircle2 size={16} className="text-[var(--color-ink-500)]" />
                  <span>Profil saya</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] transition text-left"
                >
                  <LogOut size={16} />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
