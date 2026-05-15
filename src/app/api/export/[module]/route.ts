import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const VALID_MODULES = ['keuangan', 'persediaan', 'bmn', 'utilitas'] as const

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value).replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(request: Request, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  if (!VALID_MODULES.includes(module as typeof VALID_MODULES[number])) {
    return NextResponse.json({ error: 'Modul tidak valid' }, { status: 400 })
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
        setAll(c) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.status !== 'Aktif') {
    return NextResponse.json({ error: 'Akun Anda belum aktif' }, { status: 403 })
  }
  if (profile?.role === 'Pengusul') {
    return NextResponse.json({ error: 'Pengusul tidak memiliki akses ekspor' }, { status: 403 })
  }

  const { data, error } = await supabase.from(module).select('*')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Tidak ada data' }, { status: 404 })
  }

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  data.forEach((row) => {
    csvRows.push(headers.map((h) => escapeCsvValue(row[h])).join(','))
  })
  const csv = '\ufeff' + csvRows.join('\r\n')
  const filename = `${module}_${new Date().toISOString().split('T')[0]}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
