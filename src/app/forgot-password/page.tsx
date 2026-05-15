'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail } from 'lucide-react'
import { showError, showSuccess } from '@/lib/toast'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const email = (form.get('email') as string).trim()

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
      showSuccess('Email terkirim', 'Cek inbox Anda untuk link reset password.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal mengirim email', msg)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Mail size={28} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-navy-900)] font-display">Email Terkirim</h2>
          <p className="text-sm text-[var(--color-ink-500)] mt-2">
            Jika email terdaftar, Anda akan menerima link untuk mereset password. Cek juga folder spam.
          </p>
          <Link href="/login" className="mt-6 inline-block px-6 py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition">
            Kembali ke Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">Lupa Password</h2>
          <p className="text-sm text-[var(--color-ink-500)] mt-1.5">
            Masukkan email Anda. Kami akan mengirim link untuk mereset password.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="forgot-email" type="email" name="email" required autoComplete="email" placeholder="nama@email.com" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60">
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>
          <div className="mt-6 pt-5 border-t border-[var(--color-surface-200)] text-center">
            <Link href="/login" className="text-sm text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium">Kembali ke Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
