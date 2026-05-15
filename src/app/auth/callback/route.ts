import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { notifyUsersByRole } from '@/lib/notify'

const DEFAULT_ROLE = 'Pengusul'
const DEFAULT_STATUS = 'Pending'

function buildRedirectUrl(request: Request, origin: string, path: string): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return `${origin}${path}`
  if (forwardedHost) return `https://${forwardedHost}${path}`
  return `${origin}${path}`
}

async function ensureProfile(
  id: string,
  email: string,
  nama: string,
): Promise<{ status: string; isNew: boolean } | null> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: existing } = await admin
    .from('profiles')
    .select('status')
    .eq('id', id)
    .maybeSingle()
  if (existing) return { status: existing.status, isNew: false }

  const { data: inserted, error: insertError } = await admin
    .from('profiles')
    .insert({
      id,
      email,
      nama: nama || email.split('@')[0] || 'Pengguna',
      role: DEFAULT_ROLE,
      status: DEFAULT_STATUS,
    })
    .select('status')
    .single()
  if (inserted) return { status: inserted.status, isNew: true }

  if (insertError) {
    const { data: retry } = await admin
      .from('profiles')
      .select('status')
      .eq('id', id)
      .maybeSingle()
    if (retry) return { status: retry.status, isNew: false }
  }

  return { status: DEFAULT_STATUS, isNew: false }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl(request, origin, '/login?error=auth_failed'))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Dipanggil dari Server Component; abaikan
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(buildRedirectUrl(request, origin, '/login?error=auth_failed'))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const nama =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Pengguna'
    const profile = await ensureProfile(user.id, user.email ?? '', nama)

    // Jika baru mendaftar, beritahu semua Admin aktif agar bisa segera di-review.
    if (profile?.isNew) {
      await notifyUsersByRole('Admin', {
        type: 'pendaftar_baru',
        title: 'Pendaftar baru menunggu persetujuan',
        message: `${nama} (${user.email}) sudah masuk dan perlu disetujui.`,
        link: '/pengguna',
      })
    }

    if (!profile || profile.status === 'Pending' || profile.status === 'Nonaktif') {
      return NextResponse.redirect(buildRedirectUrl(request, origin, '/pending'))
    }
  }

  return NextResponse.redirect(buildRedirectUrl(request, origin, next))
}
