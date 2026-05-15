'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileCheck2, X, Link as LinkIcon, Loader2 } from 'lucide-react'
import { showError } from '@/lib/toast'

interface FileUploadProps {
  label?: string
  value: string | null
  onChange: (url: string | null) => void
  helperText?: string
  name?: string
  required?: boolean
  id?: string
  modul?: string
}

const MAX_DISPLAY_SIZE = 50 * 1024 * 1024
const MAX_IMAGE_BYTES = 1 * 1024 * 1024 // Target max 1 MB untuk gambar
const MAX_IMAGE_DIM = 1920 // Max dimensi pixel

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Kompres gambar di browser menggunakan Canvas API.
 * - Resize max 1920px (sisi terpanjang)
 * - Turunkan quality JPEG sampai <= 1 MB
 * - Kualitas tetap jelas untuk dokumen/foto
 */
function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.size <= MAX_IMAGE_BYTES) {
      resolve(file)
      return
    }

    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img

      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const ratio = Math.min(MAX_IMAGE_DIM / width, MAX_IMAGE_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)

      let quality = 0.82
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            if (blob.size <= MAX_IMAGE_BYTES || quality <= 0.4) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
            } else {
              quality -= 0.08
              attempt()
            }
          },
          'image/jpeg',
          quality,
        )
      }
      attempt()
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/**
 * Komponen upload file hybrid:
 * - Mode 1: Upload langsung ke server (Supabase Storage) — file terorganisir otomatis
 * - Mode 2: Paste link manual (URL dokumen)
 */
export default function FileUpload({
  label,
  value,
  onChange,
  helperText,
  name,
  required,
  id,
  modul = 'umum',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [mode, setMode] = useState<'upload' | 'link'>(value ? 'link' : 'upload')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_DISPLAY_SIZE) {
      showError('File terlalu besar', 'Maksimal 50 MB.')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setUploading(true)
    try {
      const processed = await compressImage(file)
      const formData = new FormData()
      formData.append('file', processed)
      formData.append('modul', modul)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengunggah file')
      }

      if (typeof json.url !== 'string' || !json.url) {
        throw new Error('Server tidak mengembalikan URL file')
      }

      onChange(json.url)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal mengunggah', msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [modul, onChange])

  if (value && isSafeUrl(value)) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-ink-700)]">
            {label} {required && <span className="text-rose-600">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <FileCheck2 size={16} className="text-emerald-600 flex-shrink-0" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-[12.5px] text-emerald-800 font-medium truncate hover:underline"
          >
            {value.length > 60 ? value.slice(0, 60) + '...' : value}
          </a>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
            title="Hapus file"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-ink-700)]">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}

      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition cursor-pointer ${
            mode === 'upload'
              ? 'bg-[var(--color-navy-900)] text-white'
              : 'bg-[var(--color-surface-100)] text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]'
          }`}
        >
          <Upload size={12} className="inline mr-1" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition cursor-pointer ${
            mode === 'link'
              ? 'bg-[var(--color-navy-900)] text-white'
              : 'bg-[var(--color-surface-100)] text-[var(--color-ink-500)] hover:text-[var(--color-ink-700)]'
          }`}
        >
          <LinkIcon size={12} className="inline mr-1" />
          Tempel Tautan
        </button>
      </div>

      {mode === 'upload' ? (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) {
              const syntheticEvent = {
                target: { files: [file] },
              } as unknown as React.ChangeEvent<HTMLInputElement>
              handleFileSelect(syntheticEvent)
            }
          }}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            dragOver
              ? 'drop-zone-active'
              : uploading
              ? 'border-[var(--color-gold-500)] bg-[var(--color-gold-500)]/5'
              : 'border-[var(--color-surface-200)] hover:border-[var(--color-gold-500)] hover:bg-[var(--color-surface-50)]'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.docx,.doc,.pptx,.zip,.rar"
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-[var(--color-gold-500)] animate-spin" />
              <p className="text-[12.5px] text-[var(--color-ink-500)]">Mengunggah...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-[var(--color-ink-400)]" />
              <p className="text-[12.5px] text-[var(--color-ink-700)] font-medium">
                Klik atau seret file ke sini
              </p>
              <p className="text-[11px] text-[var(--color-ink-400)]">
                PDF, Gambar, Excel, Word, PPT, ZIP — Maks 50 MB
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <LinkIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] pointer-events-none"
          />
          <input
            id={id}
            name={name}
            type="url"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://contoh.com/dokumen/file.pdf"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-surface-200)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50 focus:border-[var(--color-gold-500)]"
          />
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-[var(--color-ink-400)]">{helperText}</p>
      )}
      {mode === 'upload' && (
        <p className="text-[11px] text-[var(--color-ink-400)]">
          File akan diunggah ke cloud storage folder <span className="font-medium">{modul}/</span> secara otomatis dan terstruktur.
        </p>
      )}
    </div>
  )
}
