import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/auth/callback']
const PUBLIC_PREFIXES = ['/track/']
const ADMIN_ONLY_ROUTES = ['/pengguna', '/audit']
const NON_PENGUSUL_ROUTES = ['/dipa', '/perencanaan', '/keuangan', '/persediaan', '/bmn']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rute publik (tracking) dilewati tanpa cek sesi.
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!user && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/pending') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && !PUBLIC_ROUTES.includes(pathname) && pathname !== '/pending') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.status !== 'Aktif') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }

    const role = profile?.role ?? 'Pengusul'

    if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role !== 'Admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    if (role === 'Pengusul' && NON_PENGUSUL_ROUTES.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)'],
}
