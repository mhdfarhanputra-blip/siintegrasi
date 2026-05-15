import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import fallbackData from '@/lib/realisasi-data.json'

const TABLE_NAME = 'realisasi_snapshot'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function GET() {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })
    if (me.role === 'Pengusul') return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    // Coba baca dari Supabase dulu
    const admin = adminClient()
    const { data, error } = await admin
      .from(TABLE_NAME)
      .select('uraian, kode_akun, level, pagu, realisasi_lalu, realisasi_ini, realisasi_sd, persen, sisa, sort_order')
      .order('sort_order', { ascending: true })

    // Jika tabel belum ada atau kosong, gunakan data statis sebagai fallback
    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: fallbackData, source: 'static' })
    }

    return NextResponse.json({ data, source: 'database' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
