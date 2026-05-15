'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { showError, showSuccess } from '@/lib/toast'
import Link from 'next/link'

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const nama = (form.get('nama') as string).trim()
    const email = (form.get('email') as string).trim()
    const password = form.get('password') as string
    const confirmPassword = form.get('confirm_password') as string

    if (password.length < 6) {
      showError('Password terlalu pendek', 'Minimal 6 karakter.')
      setLoading(false)
      return
    }
    if (password !== confirmPassword) {
      showError('Password tidak cocok', 'Pastikan password dan konfirmasi sama.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nama },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          showError('Email sudah terdaftar', 'Gunakan email lain atau masuk dengan akun yang ada.')
        } else {
          showError('Pendaftaran gagal', error.message)
        }
        return
      }
      setDone(true)
      showSuccess('Pendaftaran berhasil', 'Cek email Anda untuk verifikasi.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Pendaftaran gagal', msg)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <Mail size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-navy-900)] font-display">Cek Email Anda</h2>
          <p className="text-sm text-[var(--color-ink-500)] mt-2">
            Kami telah mengirim link verifikasi ke email Anda. Klik link tersebut untuk mengaktifkan akun.
          </p>
          <p className="text-[12px] text-[var(--color-ink-400)] mt-4">
            Setelah verifikasi, admin akan mereview akun Anda sebelum dapat mengakses dashboard.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block px-6 py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition"
          >
            Kembali ke Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-sm tracking-wider font-display">SI</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--color-navy-900)] font-display">SI Terintegrasi</p>
            <p className="text-[11px] text-[var(--color-ink-500)]">Manajemen Operasional</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">Daftar Akun</h2>
          <p className="text-sm text-[var(--color-ink-500)] mt-1.5">
            Buat akun baru. Setelah verifikasi email, admin akan menyetujui akses Anda.
          </p>

          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reg-nama" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reg-nama" type="text" name="nama" required placeholder="Nama lengkap Anda" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
              </div>
            </div>
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reg-email" type="email" name="email" required autoComplete="email" placeholder="nama@email.com" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
              </div>
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reg-password" type={showPassword ? 'text' : 'password'} name="password" required minLength={6} placeholder="Minimal 6 karakter" className="w-full pl-10 pr-10 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reg-confirm" type="password" name="confirm_password" required minLength={6} placeholder="Ulangi password" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Mendaftarkan...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--color-surface-200)] text-center">
            <p className="text-sm text-[var(--color-ink-500)]">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
