import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
  'application/octet-stream',
]

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
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi 50 MB' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Tipe file tidak didukung.' },
        { status: 400 },
      )
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
