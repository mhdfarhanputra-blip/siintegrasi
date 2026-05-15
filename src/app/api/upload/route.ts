import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import { google } from 'googleapis'
import { Readable } from 'stream'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ROOT_FOLDER_NAME = 'SI_Terintegrasi'

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

function getDriveClient() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64
  if (!base64) throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 belum dikonfigurasi')

  const json = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  const auth = new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
): Promise<string> {
  const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const query = parentId
    ? `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${safeName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

  const res = await drive.files.list({ q: query, fields: 'files(id, name)', spaces: 'drive' })
  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  })
  return created.data.id!
}

/**
 * Buat struktur folder: SI_Terintegrasi/{modul}/{tahun}/{bulan}
 * Return folder ID terdalam
 */
async function ensureFolderStructure(
  drive: ReturnType<typeof google.drive>,
  modul: string,
): Promise<string> {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')

  const rootId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME)
  const modulId = await findOrCreateFolder(drive, modul, rootId)
  const yearId = await findOrCreateFolder(drive, year, modulId)
  const monthId = await findOrCreateFolder(drive, month, yearId)

  return monthId
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

    const drive = getDriveClient()
    const folderId = await ensureFolderStructure(drive, modul)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const stream = Readable.from(buffer)

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    // Set file permission: anyone with link can view
    await drive.permissions.create({
      fileId: uploaded.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    const fileUrl = uploaded.data.webViewLink ?? `https://drive.google.com/file/d/${uploaded.data.id}/view`

    return NextResponse.json({
      url: fileUrl,
      fileId: uploaded.data.id,
      name: uploaded.data.name,
      size: file.size,
      modul,
      path: `${ROOT_FOLDER_NAME}/${modul}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${file.name}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
