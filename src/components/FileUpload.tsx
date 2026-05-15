'use client'

import { ExternalLink, FileCheck2, X, Link as LinkIcon } from 'lucide-react'

interface FileUploadProps {
  label?: string
  value: string | null
  onChange: (url: string | null) => void
  helperText?: string
  name?: string
  required?: boolean
  id?: string
}

const DRIVE_URL = 'https://drive.google.com/drive/folders/1NYHmpHAxbU5IN3uSAfzMgRPwwj6sqkQR'

/**
 * Pastikan URL aman untuk dibuka di tag <a href>. Hanya mengizinkan
 * skema http(s) untuk mencegah XSS lewat URL seperti javascript:... atau
 * data:... yang bisa tersimpan di database dan dieksekusi saat diklik.
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Input tautan dokumen.
 *
 * Alur: pengguna mengunggah berkas secara manual ke folder Google Drive
 * kantor, salin tautan Share-nya, lalu tempel di input di bawah.
 * Tombol bantu "Buka Google Drive" membuka folder kantor di tab baru.
 */
export default function FileUpload({
  label,
  value,
  onChange,
  helperText,
  name,
  required,
  id,
}: FileUploadProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-ink-700)]">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
            placeholder="https://drive.google.com/..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-surface-200)] text-sm focus:outline-none focus:border-[var(--color-gold-500)] focus:shadow-[0_0_0_3px_rgba(199,154,74,0.12)]"
          />
        </div>
        {value && isSafeUrl(value) && (
          <>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 hover:bg-emerald-100 transition"
            >
              <FileCheck2 size={14} /> Buka
            </a>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition"
              title="Hapus tautan"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-ink-500)]">
        <span>{helperText || 'Unggah berkas ke Google Drive kantor, lalu tempel tautan Share-nya di sini.'}</span>
        <a
          href={DRIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] transition whitespace-nowrap"
        >
          <ExternalLink size={11} /> Buka Google Drive
        </a>
      </div>
    </div>
  )
}
