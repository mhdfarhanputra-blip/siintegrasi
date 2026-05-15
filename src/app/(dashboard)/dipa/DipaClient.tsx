'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Download, Trash2, Pencil } from 'lucide-react'
import Modal from '@/components/Modal'
import FileUpload from '@/components/FileUpload'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmAction } from '@/lib/toast'

interface DipaRow {
  id: string
  revisi_ke: number
  tanggal_revisi: string | null
  tahun_anggaran: number | null
  link_dipa: string | null
  link_rkakl: string | null
  keterangan_revisi: string | null
  uploaded_by: string | null
  created_at: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const safeHttpUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  try {
    const parsed = new URL(url, 'http://_')
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url
    return null
  } catch {
    return null
  }
}

export default function DipaClient({
  initialData,
  userRole,
}: {
  initialData: DipaRow[]
  userRole: string
}) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DipaRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [linkDipa, setLinkDipa] = useState<string | null>(null)
  const [linkRkakl, setLinkRkakl] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isAdmin = userRole === 'Admin'

  useEffect(() => { setData(initialData) }, [initialData])

  useRealtime('dokumen_dipa')

  const openAdd = () => {
    setEditing(null)
    setLinkDipa(null)
    setLinkRkakl(null)
    setShowForm(true)
  }

  const openEdit = (row: DipaRow) => {
    setEditing(row)
    setLinkDipa(row.link_dipa)
    setLinkRkakl(row.link_rkakl)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      revisi_ke: Number(form.get('revisi_ke')),
      tanggal_revisi: (form.get('tanggal_revisi') as string) || null,
      tahun_anggaran: Number(form.get('tahun_anggaran')),
      link_dipa: linkDipa,
      link_rkakl: linkRkakl,
      keterangan_revisi: (form.get('keterangan_revisi') as string) || null,
    }

    try {
      if (editing) {
        const { error } = await supabase.from('dokumen_dipa').update(payload).eq('id', editing.id)
        if (error) throw error
        showSuccess('Dokumen DIPA berhasil diperbarui')
      } else {
        const { error } = await supabase.from('dokumen_dipa').insert(payload)
        if (error) throw error
        showSuccess('Dokumen DIPA berhasil disimpan')
      }
      setShowForm(false)
      setEditing(null)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menyimpan', msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirmAction('Hapus dokumen DIPA ini?')) return
    try {
      const { error } = await supabase.from('dokumen_dipa').delete().eq('id', id)
      if (error) throw error
      setData((prev) => prev.filter((d) => d.id !== id))
      showSuccess('Dokumen DIPA berhasil dihapus')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus', msg)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display">Dokumen DIPA & RKA-KL</h2>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-xl hover:bg-[var(--color-navy-800)] transition flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Upload Revisi
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-ink-400)]">Belum ada dokumen DIPA</div>
      ) : (
        <div className="space-y-4">
          {data.map((row, idx) => (
            <div
              key={row.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-[var(--color-surface-200)] relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--color-navy-900)]">Revisi {row.revisi_ke}</h3>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-ink-500)] mt-1">
                      {row.keterangan_revisi || 'Tanpa keterangan'}
                    </p>
                    <p className="text-xs text-[var(--color-ink-400)] mt-1">
                      {formatDate(row.created_at)}
                      {row.uploaded_by && ` · ${row.uploaded_by}`}
                    </p>
                    <div className="flex gap-3 mt-3">
                      {safeHttpUrl(row.link_dipa) && (
                        <a
                          href={safeHttpUrl(row.link_dipa)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-navy-900)] hover:text-[var(--color-gold-500)] flex items-center gap-1 transition"
                        >
                          <Download size={14} /> DIPA
                        </a>
                      )}
                      {safeHttpUrl(row.link_rkakl) && (
                        <a
                          href={safeHttpUrl(row.link_rkakl)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[var(--color-navy-900)] hover:text-[var(--color-gold-500)] flex items-center gap-1 transition"
                        >
                          <Download size={14} /> RKA-KL
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(row)}
                        className="text-[var(--color-ink-400)] hover:text-[var(--color-gold-600)] transition"
                        title="Ubah"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-rose-400 hover:text-rose-600 transition"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        title={editing ? 'Ubah Revisi DIPA' : 'Upload Revisi DIPA'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={editing ? 'edit-revisi-ke' : 'add-revisi-ke'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Revisi Ke <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-revisi-ke' : 'add-revisi-ke'}
                type="number"
                name="revisi_ke"
                defaultValue={editing?.revisi_ke ?? 0}
                required
                aria-required="true"
                min={0}
                placeholder="0"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={editing ? 'edit-tanggal-revisi' : 'add-tanggal-revisi'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Tanggal Revisi <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-tanggal-revisi' : 'add-tanggal-revisi'}
                type="date"
                name="tanggal_revisi"
                defaultValue={editing?.tanggal_revisi?.slice(0, 10) ?? ''}
                required
                aria-required="true"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-tahun-anggaran' : 'add-tahun-anggaran'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Tahun Anggaran <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <select
              id={editing ? 'edit-tahun-anggaran' : 'add-tahun-anggaran'}
              name="tahun_anggaran"
              defaultValue={editing?.tahun_anggaran ?? new Date().getFullYear()}
              required
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>TA {y}</option>
              ))}
            </select>
          </div>
          <FileUpload
            label="Dokumen DIPA"
            value={linkDipa}
            onChange={setLinkDipa}
            helperText="Unggah dokumen DIPA atau tempel tautan."
            id={editing ? 'edit-link-dipa' : 'add-link-dipa'}
            modul="DIPA"
          />
          <FileUpload
            label="Dokumen RKA-KL"
            value={linkRkakl}
            onChange={setLinkRkakl}
            helperText="Unggah dokumen RKA-KL atau tempel tautan."
            id={editing ? 'edit-link-rkakl' : 'add-link-rkakl'}
            modul="DIPA"
          />
          <div>
            <label
              htmlFor={editing ? 'edit-keterangan-revisi' : 'add-keterangan-revisi'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Keterangan Revisi
            </label>
            <textarea
              id={editing ? 'edit-keterangan-revisi' : 'add-keterangan-revisi'}
              name="keterangan_revisi"
              defaultValue={editing?.keterangan_revisi ?? ''}
              rows={3}
              placeholder="Perubahan pada revisi ini..."
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
              className="border border-[var(--color-surface-200)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : editing ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
