import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const HEADER_PATTERN = 'KEMENTERIAN PEKERJAAN UMUM DAN\nPERUMAHAN RAKYAT\n'

interface ParsedAsset {
  kode_aset: string
  nama_aset: string
  spesifikasi: string | null
  tahun_pengadaan: number | null
  nomor_register: number
}

/**
 * Parse teks PDF label BMN menjadi array aset.
 * Format per-block:
 *   {kode_satker}.{tahun}
 *   {kode_barang}
 *   {nomor_register}
 *   {nama_aset (bisa multi-line)}
 *   Merk  : {merk}
 */
function parseBmnLabelText(text: string): ParsedAsset[] {
  const blocks = text.split(HEADER_PATTERN).filter((b) => b.trim())
  const results: ParsedAsset[] = []

  for (const block of blocks) {
    try {
      const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length < 4) continue

      const kodeSatkerLine = lines[0]
      const kodeBarang = lines[1]
      const nomorRegStr = lines[2]

      const tahunMatch = kodeSatkerLine.match(/\.(\d{4})$/)
      const tahunPengadaan = tahunMatch ? parseInt(tahunMatch[1], 10) : null

      const nomorRegister = parseInt(nomorRegStr, 10)
      if (isNaN(nomorRegister)) continue

      const merkIdx = lines.findIndex((l) => l.startsWith('Merk'))
      const namaLines = merkIdx > 3
        ? lines.slice(3, merkIdx)
        : lines.slice(3, Math.min(lines.length, 6))
      const namaAset = namaLines.join(' ').trim()

      let spesifikasi: string | null = null
      if (merkIdx >= 0) {
        const merkValue = lines[merkIdx].replace(/^Merk\s*:\s*/, '').trim()
        if (merkValue && merkValue !== '-') {
          spesifikasi = `Merk: ${merkValue}`
        }
      }

      const kodeAset = `${kodeBarang}.${String(nomorRegister).padStart(3, '0')}`

      results.push({
        kode_aset: kodeAset,
        nama_aset: namaAset || 'Tanpa Nama',
        spesifikasi,
        tahun_pengadaan: tahunPengadaan,
        nomor_register: nomorRegister,
      })
    } catch {
      continue
    }
  }

  return results
}

export async function POST(request: Request) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })
    }
    if (me.status !== 'Aktif') {
      return NextResponse.json({ error: 'Akun belum aktif' }, { status: 403 })
    }
    if (!['Admin', 'BMN'].includes(me.role)) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tahunPencatatan = parseInt(formData.get('tahun_pencatatan') as string, 10) || new Date().getFullYear()

    if (!file) {
      return NextResponse.json({ error: 'File PDF tidak ditemukan' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi 20 MB' }, { status: 400 })
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Hanya file PDF yang didukung' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'PDF tidak mengandung teks yang dapat dibaca' }, { status: 400 })
    }

    const parsed = parseBmnLabelText(text)
    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ditemukan data aset dalam PDF. Pastikan format sesuai label BMN SIMAK.' },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabase()
    const rows = parsed.map((asset) => ({
      kode_aset: asset.kode_aset,
      nama_aset: asset.nama_aset,
      spesifikasi: asset.spesifikasi,
      tahun_pengadaan: asset.tahun_pengadaan,
      tahun_pencatatan: tahunPencatatan,
      kondisi: 'Baik',
      nilai_aset: 0,
      status_penggunaan: 'Digunakan',
      updated_at: new Date().toISOString(),
    }))

    const { data: existing } = await supabase
      .from('bmn')
      .select('kode_aset')
      .eq('tahun_pencatatan', tahunPencatatan)

    const existingCodes = new Set((existing ?? []).map((e) => e.kode_aset))
    const newRows = rows.filter((r) => !existingCodes.has(r.kode_aset))

    if (newRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Semua ${parsed.length} aset sudah ada di TA ${tahunPencatatan}. Tidak ada data baru.`,
        total_parsed: parsed.length,
        total_inserted: 0,
        total_skipped: parsed.length,
      })
    }

    // Batch insert in chunks of 500 to avoid payload size limits
    const BATCH_SIZE = 500
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const chunk = newRows.slice(i, i + BATCH_SIZE)
      const { error: insertErr } = await supabase.from('bmn').insert(chunk)
      if (insertErr) throw insertErr
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimport ${newRows.length} aset ke TA ${tahunPencatatan}.`,
      total_parsed: parsed.length,
      total_inserted: newRows.length,
      total_skipped: parsed.length - newRows.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
