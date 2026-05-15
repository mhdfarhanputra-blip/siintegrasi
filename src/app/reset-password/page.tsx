'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { showError, showSuccess } from '@/lib/toast'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
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
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      showSuccess('Password berhasil diubah', 'Silakan masuk dengan password baru.')
      router.replace('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal mengubah password', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-50)] p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">Reset Password</h2>
          <p className="text-sm text-[var(--color-ink-500)] mt-1.5">Masukkan password baru Anda.</p>
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Password Baru</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reset-password" type={showPassword ? 'text' : 'password'} name="password" required minLength={6} placeholder="Minimal 6 karakter" className="w-full pl-10 pr-10 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition" aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">Konfirmasi Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                <input id="reset-confirm" type="password" name="confirm_password" required minLength={6} placeholder="Ulangi password baru" className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
