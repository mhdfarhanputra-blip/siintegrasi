'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Download, Trash2 } from 'lucide-react'
import Modal from '@/components/Modal'

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

export default function DipaClient({ initialData }: { initialData: DipaRow[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      revisi_ke: Number(form.get('revisi_ke')),
      link_dipa: (form.get('link_dipa') as string) || null,
      link_rkakl: (form.get('link_rkakl') as string) || null,
      keterangan_revisi: (form.get('keterangan_revisi') as string) || null,
    }
    const { error } = await supabase.from('dokumen_dipa').insert(payload)
    setLoading(false)
    if (!error) {
      setShowForm(false)
      router.refresh()
    } else {
      alert('Gagal menyimpan data: ' + error.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus dokumen DIPA ini?')) return
    const { error } = await supabase.from('dokumen_dipa').delete().eq('id', id)
    if (!error) {
      setData((prev) => prev.filter((d) => d.id !== id))
    } else {
      alert('Gagal menghapus: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0c1e3e]">Dokumen DIPA</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#0c1e3e] text-white px-4 py-2 rounded-lg hover:bg-[#122243] transition flex items-center gap-2"
        >
          <Plus size={16} /> Upload Revisi
        </button>
      </div>

      {/* Version Timeline */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada dokumen DIPA</div>
      ) : (
        <div className="space-y-4">
          {data.map((row, idx) => (
            <div
              key={row.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#0c1e3e]">
                        Revisi {row.revisi_ke}
                      </h3>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {row.keterangan_revisi || 'Tanpa keterangan'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(row.created_at)}
                      {row.uploaded_by && ` · ${row.uploaded_by}`}
                    </p>
                    <div className="flex gap-3 mt-3">
                      {row.link_dipa && (
                        <a
                          href={row.link_dipa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0c1e3e] hover:text-[#c79a4a] flex items-center gap-1 transition"
                        >
                          <Download size={14} /> DIPA
                        </a>
                      )}
                      {row.link_rkakl && (
                        <a
                          href={row.link_rkakl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0c1e3e] hover:text-[#c79a4a] flex items-center gap-1 transition"
                        >
                          <Download size={14} /> RKA-KL
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="text-red-400 hover:text-red-600 transition"
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Upload Revisi DIPA">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Revisi Ke</label>
            <input
              type="number"
              name="revisi_ke"
              required
              min={0}
              placeholder="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link DIPA</label>
            <input
              type="url"
              name="link_dipa"
              placeholder="https://drive.google.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link RKA-KL</label>
            <input
              type="url"
              name="link_rkakl"
              placeholder="https://drive.google.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Revisi</label>
            <textarea
              name="keterangan_revisi"
              rows={3}
              placeholder="Perubahan pada revisi ini..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#0c1e3e] text-white px-4 py-2 rounded-lg hover:bg-[#122243] transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
