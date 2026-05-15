import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import realisasiData from '@/lib/realisasi-data.json'

export async function GET() {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })
    }
    if (me.role === 'Pengusul') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }
    return NextResponse.json({ data: realisasiData })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
