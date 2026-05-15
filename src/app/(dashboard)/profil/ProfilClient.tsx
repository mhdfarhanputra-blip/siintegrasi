'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { showError, showSuccess } from '@/lib/toast'
import type { CurrentUser } from '@/lib/getCurrentUser'

export default function ProfilClient({ user }: { user: CurrentUser }) {
  const supabase = useMemo(() => createClient(), [])
  const [nama, setNama] = useState(user.nama)
  const [saving, setSaving] = useState(false)
  const [showPwSection, setShowPwSection] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const initials = user.nama
    .split(' ')
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleUpdateNama(e: React.FormEvent) {
    e.preventDefault()
    if (!nama.trim()) {
      showError('Nama tidak boleh kosong')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nama: nama.trim() })
        .eq('id', user.id)
      if (error) throw error
      showSuccess('Nama berhasil diperbarui')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memperbarui nama', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const newPw = form.get('new_password') as string
    const confirmPw = form.get('confirm_password') as string

    if (newPw.length < 6) {
      showError('Password terlalu pendek', 'Minimal 6 karakter.')
      return
    }
    if (newPw !== confirmPw) {
      showError('Password tidak cocok')
      return
    }

    setPwLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw error
      showSuccess('Password berhasil diubah')
      setShowPwSection(false)
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal mengubah password', msg)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">Profil Saya</h2>
        <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1">Kelola informasi akun Anda.</p>
      </div>

      <div className="card-base p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-navy-800)] to-[var(--color-navy-900)] text-white flex items-center justify-center text-xl font-bold shadow-lg">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--color-navy-900)]">{user.nama}</p>
            <p className="text-sm text-[var(--color-ink-500)]">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-gold-500)]/10 text-[var(--color-gold-700)]">
                <Shield size={11} /> {user.role}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                {user.status}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateNama} className="space-y-4">
          <div>
            <label htmlFor="profil-nama" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input id="profil-nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
              <input type="email" value={user.email} disabled className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm bg-[var(--color-surface-50)] text-[var(--color-ink-500)] cursor-not-allowed" />
            </div>
            <p className="text-[11px] text-[var(--color-ink-400)] mt-1">Email tidak dapat diubah.</p>
          </div>
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>

      <div className="card-base p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display flex items-center gap-2">
              <Lock size={16} /> Ubah Password
            </h3>
            <p className="text-[12px] text-[var(--color-ink-500)] mt-0.5">Perbarui password akun Anda.</p>
          </div>
          {!showPwSection && (
            <button onClick={() => setShowPwSection(true)} className="text-sm text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium cursor-pointer">
              Ubah
            </button>
          )}
        </div>

        {showPwSection && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <div>
              <label htmlFor="new-pw" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Password Baru</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="new-pw" type={showPw ? 'text' : 'password'} name="new_password" required minLength={6} placeholder="Minimal 6 karakter" className="w-full pl-10 pr-10 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]" aria-label="Toggle">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-pw" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Konfirmasi Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="confirm-pw" type="password" name="confirm_password" required minLength={6} placeholder="Ulangi password baru" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPwSection(false)} className="px-4 py-2 border border-[var(--color-surface-200)] rounded-xl text-sm hover:bg-[var(--color-surface-100)] transition cursor-pointer">Batal</button>
              <button type="submit" disabled={pwLoading} className="px-5 py-2 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60">
                {pwLoading ? 'Menyimpan...' : 'Ubah Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
