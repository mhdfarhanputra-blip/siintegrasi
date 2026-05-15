import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'

export const runtime = 'nodejs'

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'
const MAX_INPUT_CHARS = 30_000
const SYSTEM_PROMPT = `Anda adalah parser dokumen anggaran DIPA/RKA-KL Indonesia.
Ekstrak daftar mata anggaran dari teks yang diberikan pengguna.
Keluarkan JSON valid dengan struktur:
{ "items": [ { "kode_mak": string, "uraian": string, "pagu": number } ] }
Aturan:
- kode_mak: kode akun seperti 521211, 522131, atau kode panjang.
- uraian: deskripsi singkat.
- pagu: angka rupiah tanpa titik/koma, tanpa simbol.
- Jika tidak yakin, lewati baris tersebut.
Hanya balas dengan JSON murni, tanpa komentar atau teks tambahan.`

async function callDeepseek(text: string) {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`AI parser gagal: ${detail.slice(0, 300)}`)
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content ?? '{}'
}

interface ParsedItem {
  kode_mak: string
  uraian: string | null
  pagu: number
}

function normalizeItems(raw: string): ParsedItem[] {
  let parsed: { items?: Array<{ kode_mak?: string; uraian?: string; pagu?: number }> }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI mengembalikan JSON tidak valid')
  }
  return (parsed.items ?? [])
    .filter((r) => r.kode_mak && Number.isFinite(Number(r.pagu)))
    .map((r) => ({
      kode_mak: String(r.kode_mak).trim(),
      uraian: r.uraian ? String(r.uraian).trim() : null,
      pagu: Math.max(0, Math.round(Number(r.pagu))),
    }))
}

export async function POST(request: Request) {
  try {
    const me = await getCurrentUser()
    if (!me) return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })
    if (me.role !== 'Admin') {
      return NextResponse.json({ error: 'Hanya Admin yang boleh parse DIPA' }, { status: 403 })
    }
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY belum di-set' }, { status: 500 })
    }

    const { text } = (await request.json()) as { text?: string }
    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: 'Teks DIPA terlalu pendek' }, { status: 400 })
    }

    const raw = await callDeepseek(text.slice(0, MAX_INPUT_CHARS))
    const items = normalizeItems(raw)
    return NextResponse.json({ items })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
