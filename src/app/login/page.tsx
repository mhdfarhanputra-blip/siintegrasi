'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Sparkles, BarChart3, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { showError } from '@/lib/toast'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) router.replace('/')
      } catch {
        // Sesi belum tersedia
      }
    }
    checkSession()
  }, [router, supabase])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const email = (form.get('email') as string).trim()
    const password = form.get('password') as string

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) {
          showError('Login gagal', 'Email atau password salah.')
        } else if (error.message.includes('Email not confirmed')) {
          showError('Email belum diverifikasi', 'Cek inbox email Anda untuk link verifikasi.')
        } else {
          showError('Login gagal', error.message)
        }
        return
      }
      router.replace('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Login gagal', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--color-navy-950)]">
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-gradient-to-br from-[var(--color-navy-900)] via-[var(--color-navy-800)] to-[var(--color-navy-950)]">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[var(--color-gold-500)]/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-white/5 blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-sm tracking-wider font-display">SI</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-tight font-display">SI Terintegrasi</p>
            <p className="text-white/55 text-[11px]">Manajemen Operasional</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-300)] font-semibold">
            Platform Manajemen
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold font-display mt-3 leading-tight">
            Sistem Informasi<br />
            <span className="text-[var(--color-gold-300)]">Terintegrasi</span>
          </h1>
          <p className="text-white/70 mt-4 max-w-md text-sm leading-relaxed">
            Satu platform untuk mengelola keuangan, aset, perencanaan anggaran, dan workflow operasional secara efisien.
          </p>
          <div className="mt-8 space-y-3">
            <Feature icon={<ShieldCheck size={14} />} text="Keamanan berlapis dengan verifikasi email" />
            <Feature icon={<Sparkles size={14} />} text="Analitik cerdas berbasis AI" />
            <Feature icon={<BarChart3 size={14} />} text="Dashboard real-time seluruh modul" />
          </div>
        </div>

        <p className="relative text-[11px] text-white/40">
          &copy; {new Date().getFullYear()} SI Terintegrasi. All rights reserved.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-[var(--color-surface-50)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-extrabold text-sm tracking-wider font-display">SI</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--color-navy-900)] font-display">SI Terintegrasi</p>
              <p className="text-[11px] text-[var(--color-ink-500)]">Manajemen Operasional</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">
              Masuk
            </h2>
            <p className="text-sm text-[var(--color-ink-500)] mt-1.5">
              Masukkan email dan password untuk mengakses dashboard.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-2.5 border border-[var(--color-surface-200)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)] transition"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link
                  href="/forgot-password"
                  className="text-[12.5px] text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium"
                >
                  Lupa password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--color-surface-200)] text-center">
              <p className="text-sm text-[var(--color-ink-500)]">
                Belum punya akun?{' '}
                <Link href="/register" className="text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-[var(--color-ink-400)]">
            Powered by Next.js &middot; Supabase &middot; Vercel
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-6 h-6 rounded-full bg-[var(--color-gold-500)]/20 text-[var(--color-gold-300)] flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm text-white/85">{text}</span>
    </div>
  )
}
