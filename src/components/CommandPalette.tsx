'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, LayoutDashboard, Wallet, Package, Building2, Zap, FileText, BarChart3, Users, History, UserCircle2 } from 'lucide-react'

interface RouteItem {
  href: string
  label: string
  icon: React.ReactNode
  keywords: string
}

const ROUTES: RouteItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} />, keywords: 'beranda home ringkasan' },
  { href: '/keuangan', label: 'Keuangan', icon: <Wallet size={16} />, keywords: 'kas transaksi debit kredit' },
  { href: '/persediaan', label: 'Persediaan', icon: <Package size={16} />, keywords: 'stok barang masuk keluar' },
  { href: '/bmn', label: 'Barang Milik Negara', icon: <Building2 size={16} />, keywords: 'aset inventaris' },
  { href: '/utilitas', label: 'Utilitas', icon: <Zap size={16} />, keywords: 'permohonan izin perizinan' },
  { href: '/dipa', label: 'DIPA & RKA-KL', icon: <FileText size={16} />, keywords: 'dokumen anggaran revisi' },
  { href: '/perencanaan', label: 'Perencanaan', icon: <BarChart3 size={16} />, keywords: 'analisa realisasi pagu' },
  { href: '/pengguna', label: 'Pengguna', icon: <Users size={16} />, keywords: 'akun user admin' },
  { href: '/audit', label: 'Audit Log', icon: <History size={16} />, keywords: 'aktivitas jejak log' },
  { href: '/profil', label: 'Profil Saya', icon: <UserCircle2 size={16} />, keywords: 'akun password nama' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()

  const filtered = ROUTES.filter((r) => {
    if (!query) return true
    const q = query.toLowerCase()
    return r.label.toLowerCase().includes(q) || r.keywords.includes(q)
  })

  // Reset active index when query changes
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setOpen((o) => !o)
    }
    if (e.key === 'Escape') setOpen(false)
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    router.push(href)
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      navigate(filtered[activeIndex].href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Pencarian cepat">
      <div className="fixed inset-0 bg-[var(--color-navy-950)]/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-[var(--color-surface-200)] overflow-hidden fade-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-surface-200)]">
          <Search size={18} className="text-[var(--color-ink-400)] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari halaman atau fitur..."
            className="flex-1 text-sm outline-none placeholder:text-[var(--color-ink-400)]"
            autoFocus
            aria-label="Cari halaman"
            aria-activedescendant={filtered.length > 0 ? `cmd-item-${activeIndex}` : undefined}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface-100)] text-[var(--color-ink-400)] border border-[var(--color-surface-200)]">ESC</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--color-ink-400)]" role="option" aria-selected="false">Tidak ditemukan</li>
          ) : (
            filtered.map((r, index) => (
              <li key={r.href} id={`cmd-item-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  onClick={() => navigate(r.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition text-sm text-[var(--color-ink-700)] cursor-pointer ${index === activeIndex ? 'bg-[var(--color-surface-100)]' : 'hover:bg-[var(--color-surface-100)]'}`}
                >
                  <span className="w-8 h-8 rounded-lg bg-[var(--color-surface-50)] flex items-center justify-center text-[var(--color-ink-500)]">{r.icon}</span>
                  <span className="font-medium">{r.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="px-4 py-2 border-t border-[var(--color-surface-200)] bg-[var(--color-surface-50)] flex items-center gap-4 text-[10px] text-[var(--color-ink-400)]">
          <span><kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[var(--color-surface-200)]">↑↓</kbd> Navigasi</span>
          <span><kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[var(--color-surface-200)]">Enter</kbd> Buka</span>
          <span><kbd className="font-mono bg-white px-1 py-0.5 rounded border border-[var(--color-surface-200)]">Esc</kbd> Tutup</span>
        </div>
      </div>
    </div>
  )
}
