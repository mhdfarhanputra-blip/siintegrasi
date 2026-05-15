'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Download, Trash2, Pencil, Sparkles } from 'lucide-react'
import Modal from '@/components/Modal'
import FileUpload from '@/components/FileUpload'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmAction } from '@/lib/toast'

interface DipaRow {
  id: string
  revisi_ke: number
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

  useRealtime('dokumen_dipa')

  // AI Parse state
  const [showParse, setShowParse] = useState(false)
  const [parseText, setParseText] = useState('')
  const [parseRevisi, setParseRevisi] = useState(0)
  const [parseLoading, setParseLoading] = useState(false)
  const [parseResults, setParseResults] = useState<Array<{ kode_mak: string; uraian: string | null; pagu: number }>>([])

  async function handleAiParse() {
    if (parseText.trim().length < 20) {
      showError('Teks terlalu pendek', 'Minimal 20 karakter untuk diproses AI.')
      return
    }
    setParseLoading(true)
    try {
      const res = await fetch('/api/dipa/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseText }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses')
      setParseResults(json.items ?? [])
      if ((json.items ?? []).length === 0) {
        showError('Tidak ditemukan', 'AI tidak menemukan mata anggaran dari teks yang diberikan.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal parse DIPA', msg)
    } finally {
      setParseLoading(false)
    }
  }

  async function handleSaveParseResults() {
    if (parseResults.length === 0) return
    setParseLoading(true)
    try {
      const items = parseResults.map((r) => ({
        revisi_ke: parseRevisi,
        kode_mak: r.kode_mak,
        uraian: r.uraian,
        pagu: r.pagu,
      }))
      const { error } = await supabase.from('dipa_items').insert(items)
      if (error) throw error
      showSuccess(`${items.length} mata anggaran berhasil disimpan`)
      setShowParse(false)
      setParseText('')
      setParseResults([])
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menyimpan', msg)
    } finally {
      setParseLoading(false)
    }
  }

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowParse(true)}
              className="bg-[var(--color-gold-500)] text-white px-4 py-2 rounded-xl hover:bg-[var(--color-gold-600)] transition flex items-center gap-2 text-sm"
            >
              <Sparkles size={16} /> AI Parse
            </button>
            <button
              onClick={openAdd}
              className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-xl hover:bg-[var(--color-navy-800)] transition flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Upload Revisi
            </button>
          </div>
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
          <FileUpload
            label="Dokumen DIPA"
            value={linkDipa}
            onChange={setLinkDipa}
            helperText="Tempel tautan dokumen DIPA dari Google Drive kantor."
            id={editing ? 'edit-link-dipa' : 'add-link-dipa'}
          />
          <FileUpload
            label="Dokumen RKA-KL"
            value={linkRkakl}
            onChange={setLinkRkakl}
            helperText="Tempel tautan dokumen RKA-KL dari Google Drive kantor."
            id={editing ? 'edit-link-rkakl' : 'add-link-rkakl'}
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
      <Modal
        isOpen={showParse}
        onClose={() => {
          setShowParse(false)
          setParseText('')
          setParseResults([])
        }}
        title="AI Parse Dokumen DIPA"
      >
        <div className="space-y-4">
          <p className="text-[12.5px] text-[var(--color-ink-500)]">
            Tempel teks dari dokumen DIPA/RKA-KL. AI akan mengekstrak kode MAK, uraian, dan pagu secara otomatis.
          </p>
          <div>
            <label htmlFor="parse-revisi" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
              Revisi Ke <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id="parse-revisi"
              type="number"
              value={parseRevisi}
              onChange={(e) => setParseRevisi(Number(e.target.value))}
              min={0}
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label htmlFor="parse-text" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
              Teks Dokumen
            </label>
            <textarea
              id="parse-text"
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              rows={8}
              placeholder="Tempel isi dokumen DIPA di sini..."
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none resize-none font-mono"
            />
          </div>
          {parseResults.length === 0 ? (
            <button
              onClick={handleAiParse}
              disabled={parseLoading}
              className="w-full py-2.5 bg-[var(--color-gold-500)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gold-600)] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              {parseLoading ? 'Memproses...' : 'Ekstrak dengan AI'}
            </button>
          ) : (
            <>
              <div className="border border-[var(--color-surface-200)] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--color-surface-50)] sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Kode MAK</th>
                      <th className="text-left px-3 py-2 font-semibold">Uraian</th>
                      <th className="text-right px-3 py-2 font-semibold">Pagu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-surface-200)]">
                    {parseResults.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono">{r.kode_mak}</td>
                        <td className="px-3 py-2 truncate max-w-[150px]">{r.uraian || '-'}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {new Intl.NumberFormat('id-ID').format(r.pagu)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11.5px] text-[var(--color-ink-500)]">
                Ditemukan {parseResults.length} mata anggaran. Simpan ke revisi {parseRevisi}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setParseResults([])}
                  className="flex-1 border border-[var(--color-surface-200)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm"
                >
                  Ulangi
                </button>
                <button
                  onClick={handleSaveParseResults}
                  disabled={parseLoading}
                  className="flex-1 bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition disabled:opacity-50 text-sm"
                >
                  {parseLoading ? 'Menyimpan...' : 'Simpan Semua'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
