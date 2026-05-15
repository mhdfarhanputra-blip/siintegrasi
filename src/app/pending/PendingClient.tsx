'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Clock, LogOut, RefreshCw, ShieldAlert, Mail, UserCog } from 'lucide-react'
import { showError } from '@/lib/toast'

interface PendingClientProps {
  nama: string
  email: string
  status: string
  role: string
  createdAt: string | null
}

const STATUS_COPY: Record<string, { title: string; desc: string; icon: React.ReactNode; tone: string }> = {
  Pending: {
    title: 'Akun Anda menunggu persetujuan',
    desc: 'Permintaan akses sudah kami terima. Admin akan meninjau dan menetapkan role Anda.',
    icon: <Clock className="w-7 h-7" />,
    tone: 'bg-amber-500/15 text-amber-600',
  },
  Nonaktif: {
    title: 'Akses akun Anda dinonaktifkan',
    desc: 'Akun Anda saat ini tidak aktif. Silakan hubungi Admin untuk pengaktifan kembali.',
    icon: <ShieldAlert className="w-7 h-7" />,
    tone: 'bg-rose-500/15 text-rose-600',
  },
}

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-'

export default function PendingClient({ nama, email, status, role, createdAt }: PendingClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [refreshing, setRefreshing] = useState(false)
  const copy = STATUS_COPY[status] ?? STATUS_COPY.Pending

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal keluar', msg)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      router.refresh()
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[var(--color-surface-50)] via-white to-[var(--color-surface-100)]">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] overflow-hidden">
          <div className="p-8 text-center">
            <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${copy.tone}`}>
              {copy.icon}
            </div>
            <h1 className="mt-5 text-xl font-bold text-[var(--color-navy-900)] font-display">
              {copy.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-ink-500)]">{copy.desc}</p>
          </div>

          <div className="px-8 pb-6 space-y-2">
            <InfoRow icon={<UserCog size={14} />} label="Nama" value={nama} />
            <InfoRow icon={<Mail size={14} />} label="Email" value={email} />
            <InfoRow icon={<ShieldAlert size={14} />} label="Role saat ini" value={role} />
            <InfoRow icon={<Clock size={14} />} label="Didaftarkan" value={formatDateTime(createdAt)} />
          </div>

          <div className="px-8 pb-8 flex flex-col gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--color-navy-900)] text-white text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Periksa status terbaru
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[var(--color-surface-200)] text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-surface-100)] transition"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-[var(--color-ink-400)]">
          Satker P2JN Bangka Belitung · Kementerian Pekerjaan Umum
        </p>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-surface-50)] border border-[var(--color-surface-200)]">
      <div className="w-7 h-7 rounded-lg bg-white border border-[var(--color-surface-200)] flex items-center justify-center text-[var(--color-ink-500)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)]">{label}</p>
        <p className="text-sm text-[var(--color-navy-900)] truncate">{value}</p>
      </div>
    </div>
  )
}
