import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
])

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.xlsx',
  '.xls',
  '.docx',
  '.doc',
  '.pptx',
  '.zip',
  '.rar',
])

const BLOCKED_EXTENSIONS = new Set(['.svg', '.html', '.htm', '.js', '.mjs', '.ts', '.tsx', '.jsx', '.php', '.exe', '.bat', '.cmd', '.ps1'])

function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

async function hasAllowedSignature(file: File, ext: string): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  if (ext === '.pdf') return starts(0x25, 0x50, 0x44, 0x46)
  if (ext === '.jpg' || ext === '.jpeg') return starts(0xff, 0xd8, 0xff)
  if (ext === '.png') return starts(0x89, 0x50, 0x4e, 0x47)
  if (ext === '.webp') return starts(0x52, 0x49, 0x46, 0x46)
  if (['.xlsx', '.docx', '.pptx', '.zip'].includes(ext)) return starts(0x50, 0x4b)
  return true
}

/**
 * Bangun folder path: SI_Terintegrasi/{modul}/{tahun}/{bulan}
 */
function buildFolder(modul: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `SI_Terintegrasi/${modul}/${year}/${month}`
}

/**
 * Upload file ke Cloudinary via signed upload
 */
async function uploadToCloudinary(
  file: File,
  folder: string,
): Promise<{ url: string; publicId: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary belum dikonfigurasi')
  }

  const timestamp = Math.round(Date.now() / 1000)
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

  const { createHash } = await import('crypto')
  const signature = createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  formData.append('timestamp', String(timestamp))
  formData.append('api_key', apiKey)
  formData.append('signature', signature)

  const resourceType = file.type.startsWith('image/') ? 'image' : 'raw'
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

  const res = await fetch(uploadUrl, { method: 'POST', body: formData })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Upload gagal: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    url: data.secure_url,
    publicId: data.public_id,
  }
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const rawModul = (formData.get('modul') as string) || 'Umum'
    const modul = rawModul.replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 50) || 'Umum'

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    }
    const ext = fileExtension(file.name)
    if (!ext || BLOCKED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'Ekstensi file tidak didukung.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi 50 MB' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung.' },
        { status: 400 },
      )
    }
    if (!(await hasAllowedSignature(file, ext))) {
      return NextResponse.json({ error: 'Isi file tidak sesuai dengan ekstensi.' }, { status: 400 })
    }

    const folder = buildFolder(modul)
    const { url, publicId } = await uploadToCloudinary(file, folder)

    // Sanitize filename to prevent path traversal in stored path
    const safeName = file.name.replace(/[/\\]/g, '_')

    return NextResponse.json({
      url,
      publicId,
      name: safeName,
      size: file.size,
      modul,
      path: `${folder}/${safeName}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
