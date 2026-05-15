'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Sparkles, Building2 } from 'lucide-react'
import { showError } from '@/lib/toast'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) router.replace('/')
      } catch {
        // Sesi belum tersedia, tetap di halaman login
      }
    }
    checkSession()
  }, [router, supabase])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        showError('Gagal memulai login', error.message)
        setLoading(false)
      }
      // Jika sukses, browser akan dialihkan ke Google — loading tetap true hingga redirect
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memulai login', msg)
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
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-xs tracking-wider font-display">P2JN</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-tight font-display">SI Terintegrasi</p>
            <p className="text-white/55 text-[11px]">P2JN Bangka Belitung</p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-300)] font-semibold">
            Kementerian Pekerjaan Umum
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold font-display mt-3 leading-tight">
            Sistem Informasi<br />
            <span className="text-[var(--color-gold-300)]">Terintegrasi</span> P2JN
          </h1>
          <p className="text-white/70 mt-4 max-w-md text-sm leading-relaxed">
            Satu platform untuk mengelola keuangan, BMN, perencanaan anggaran, dan permohonan utilitas Satker P2JN Bangka Belitung.
          </p>
          <div className="mt-8 space-y-3">
            <Feature icon={<ShieldCheck size={14} />} text="Otentikasi aman via Google Workspace" />
            <Feature icon={<Sparkles size={14} />} text="Analitik real-time dengan AI" />
            <Feature icon={<Building2 size={14} />} text="Manajemen terpadu seluruh modul" />
          </div>
        </div>

        <p className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} Satker P2JN Bangka Belitung. All rights reserved.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-[var(--color-surface-50)]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-extrabold text-xs tracking-wider font-display">P2JN</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--color-navy-900)] font-display">SI Terintegrasi</p>
              <p className="text-[11px] text-[var(--color-ink-500)]">P2JN Bangka Belitung</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] p-8 sm:p-10">
            <p className="text-[11px] uppercase tracking-wider text-[var(--color-gold-600)] font-semibold">
              Portal Internal
            </p>
            <h2 className="text-2xl font-bold text-[var(--color-navy-900)] mt-2 font-display">
              Masuk ke akun Anda
            </h2>
            <p className="text-sm text-[var(--color-ink-500)] mt-1.5">
              Gunakan akun Google kementerian Anda untuk mengakses dashboard.
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-8 w-full flex items-center justify-center gap-3 bg-white border-2 border-[var(--color-surface-200)] rounded-xl px-6 py-3 text-[var(--color-ink-700)] font-medium hover:border-[var(--color-gold-500)] hover:shadow-md active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[var(--color-surface-300)] border-t-[var(--color-gold-500)] rounded-full animate-spin" />
                  <span>Mengalihkan...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Masuk dengan Google</span>
                </>
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-[var(--color-surface-200)]">
              <p className="text-[11.5px] text-[var(--color-ink-500)] flex items-center gap-2">
                <ShieldCheck size={14} className="text-[var(--color-gold-500)]" />
                Akses terbatas untuk pengguna terdaftar. Hubungi admin untuk permintaan akun.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-[var(--color-ink-400)]">
            Powered by Supabase · Vercel · Next.js
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
