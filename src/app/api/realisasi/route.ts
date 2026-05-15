import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import fallbackData from '@/lib/realisasi-data.json'

const BUCKET_NAME = 'dokumen'
const STORAGE_PATH = 'realisasi/data.json'

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

    // Coba baca dari Supabase Storage
    const admin = adminClient()
    const { data: fileData, error } = await admin.storage
      .from(BUCKET_NAME)
      .download(STORAGE_PATH)

    if (!error && fileData) {
      const text = await fileData.text()
      const parsed = JSON.parse(text)
      return NextResponse.json({ data: parsed, source: 'storage' })
    }

    // Fallback ke data statis bundled
    return NextResponse.json({ data: fallbackData, source: 'static' })
  } catch {
    // Jika parsing gagal, fallback ke statis
    return NextResponse.json({ data: fallbackData, source: 'static' })
  }
}
