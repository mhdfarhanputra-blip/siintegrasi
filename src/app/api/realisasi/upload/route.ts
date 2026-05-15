import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const TABLE_NAME = 'realisasi_snapshot'

interface RealisasiRow {
  uraian: string
  kode_akun: string | null
  level: string
  pagu: number
  realisasi_lalu: number
  realisasi_ini: number
  realisasi_sd: number
  persen: number
  sisa: number
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function parseExcelToRealisasi(buffer: ArrayBuffer): RealisasiRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown as unknown[][]
  const results: RealisasiRow[] = []

  for (let idx = 9; idx < raw.length; idx++) {
    const row = raw[idx]
    if (!row || row.length < 20) continue

    const pagu = Number(row[16]) || 0
    const realSd = Number(row[25]) || 0
    if (pagu === 0 && realSd === 0) continue

    const uraianParts: string[] = []
    for (let col = 0; col < 16; col++) {
      const val = row[col]
      if (val != null && String(val).trim()) uraianParts.push(String(val).trim())
    }
    const uraian = uraianParts.join(' ')
    if (!uraian) continue

    let kodeAkun: string | null = null
    if (row[7] != null && !isNaN(Number(row[7]))) kodeAkun = String(Math.round(Number(row[7])))

    let level = 'item'
    if (row[1] != null && row[2] == null) level = 'program'
    else if (row[2] != null && row[5] == null) level = 'kegiatan'
    else if (row[5] != null && row[7] == null) level = 'komponen'
    else if (kodeAkun) level = 'akun'

    results.push({
      uraian, kode_akun: kodeAkun, level, pagu,
      realisasi_lalu: Number(row[22]) || 0,
      realisasi_ini: Number(row[23]) || 0,
      realisasi_sd: realSd,
      persen: row[28] != null ? Math.round(Number(row[28]) * 10000) / 100 : 0,
      sisa: Number(row[30]) || 0,
    })
  }
  return results
}

export async function POST(request: Request) {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })
    if (me.role !== 'Admin') return NextResponse.json({ error: 'Hanya Admin yang dapat mengupload data realisasi' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Ukuran file melebihi 10 MB' }, { status: 400 })

    const validExts = ['.xlsx', '.xls']
    if (!validExts.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return NextResponse.json({ error: 'Hanya file Excel (.xlsx/.xls) yang diterima' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const data = parseExcelToRealisasi(buffer)
    if (data.length === 0) {
      return NextResponse.json({ error: 'Tidak ditemukan data realisasi. Pastikan format sesuai Laporan FA Detail (16 Segmen).' }, { status: 400 })
    }

    // Simpan ke Supabase: hapus data lama, insert baru (chunked)
    const admin = adminClient()
    const { error: deleteError } = await admin.from(TABLE_NAME).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (deleteError) throw deleteError

    const rows = data.map((r, idx) => ({ ...r, sort_order: idx }))
    const BATCH_SIZE = 500
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error: insertError } = await admin.from(TABLE_NAME).insert(rows.slice(i, i + BATCH_SIZE))
      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses ${data.length} baris data realisasi`,
      summary: {
        totalRows: data.length,
        totalPagu: data[0]?.pagu ?? 0,
        totalRealisasi: data[0]?.realisasi_sd ?? 0,
        persen: data[0]?.persen ?? 0,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
