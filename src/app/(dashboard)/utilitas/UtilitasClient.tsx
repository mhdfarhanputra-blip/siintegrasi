'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, XCircle, Clock } from 'lucide-react'
import Modal from '@/components/Modal'

interface UtilitasRow {
  id: string
  tgl_usul: string
  instansi: string | null
  lokasi: string | null
  jenis_pekerjaan: string
  link_ded: string | null
  status: string
  input_by: string | null
  current_pic: string | null
  sla_deadline: string | null
  created_at: string
}

interface TransmitalRow {
  id: string
  utilitas_id: string
  tahapan: string
  pic: string | null
  waktu_masuk: string
  waktu_selesai: string | null
  durasi_hari: number | null
  catatan: string | null
  created_at: string
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  'IN PROGRESS': 'bg-yellow-50 text-yellow-700',
  DONE: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function UtilitasClient({
  initialData,
  initialTransmital,
}: {
  initialData: UtilitasRow[]
  initialTransmital: TransmitalRow[]
}) {
  const [data, setData] = useState(initialData)
  const [transmital] = useState(initialTransmital)
  const [showForm, setShowForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      tgl_usul: form.get('tgl_usul') as string,
      instansi: (form.get('instansi') as string) || null,
      lokasi: (form.get('lokasi') as string) || null,
      jenis_pekerjaan: form.get('jenis_pekerjaan') as string,
      link_ded: (form.get('link_ded') as string) || null,
      status: 'OPEN',
    }
    const { error } = await supabase.from('utilitas').insert(payload)
    setLoading(false)
    if (!error) {
      setShowForm(false)
      router.refresh()
    } else {
      alert('Gagal menyimpan data: ' + error.message)
    }
  }

  async function handleAdvance(id: string) {
    const item = data.find((d) => d.id === id)
    if (!item) return
    const nextStatus = item.status === 'OPEN' ? 'IN PROGRESS' : 'DONE'
    const { error } = await supabase
      .from('utilitas')
      .update({ status: nextStatus })
      .eq('id', id)
    if (!error) router.refresh()
    else alert('Gagal memperbarui status: ' + error.message)
  }

  async function handleReject(id: string) {
    if (!confirm('Tolak permohonan utilitas ini?')) return
    const { error } = await supabase
      .from('utilitas')
      .update({ status: 'REJECTED' })
      .eq('id', id)
    if (!error) router.refresh()
    else alert('Gagal memperbarui status: ' + error.message)
  }

  const selectedTransmital = transmital.filter((t) => t.utilitas_id === selectedId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0c1e3e]">Utilitas</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#0c1e3e] text-white px-4 py-2 rounded-lg hover:bg-[#122243] transition flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Permohonan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card List */}
        <div className="lg:col-span-2 space-y-3">
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Belum ada data utilitas</div>
          ) : (
            data.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedId(row.id)}
                className={`bg-white rounded-xl p-5 shadow-sm border cursor-pointer transition ${
                  selectedId === row.id ? 'border-[#c79a4a]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#0c1e3e]">{row.jenis_pekerjaan}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {row.instansi || 'Tanpa instansi'} &middot; {row.lokasi || 'Tanpa lokasi'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(row.tgl_usul)}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_COLOR[row.status] || 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                {row.status !== 'DONE' && row.status !== 'REJECTED' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAdvance(row.id) }}
                      className="bg-[#0c1e3e] text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-[#122243] transition"
                    >
                      <ChevronRight size={14} /> Lanjutkan
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReject(row.id) }}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:bg-red-700 transition"
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Timeline Panel */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-fit">
          <h3 className="font-semibold text-[#0c1e3e] mb-4 flex items-center gap-2">
            <Clock size={16} /> Transmital
          </h3>
          {!selectedId ? (
            <p className="text-sm text-gray-400">Pilih permohonan untuk melihat timeline</p>
          ) : selectedTransmital.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada tahapan transmital</p>
          ) : (
            <div className="space-y-4">
              {selectedTransmital.map((t, idx) => (
                <div key={t.id} className="relative pl-6">
                  <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-[#c79a4a]" />
                  {idx < selectedTransmital.length - 1 && (
                    <div className="absolute left-[5px] top-4 w-0.5 h-full bg-gray-200" />
                  )}
                  <p className="text-sm font-medium text-[#0c1e3e]">{t.tahapan}</p>
                  <p className="text-xs text-gray-500">
                    {t.pic || '-'} &middot; {formatDate(t.waktu_masuk)}
                    {t.durasi_hari != null && ` (${t.durasi_hari} hari)`}
                  </p>
                  {t.catatan && <p className="text-xs text-gray-400 mt-0.5">{t.catatan}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Tambah Permohonan Utilitas">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Usul</label>
            <input
              type="date"
              name="tgl_usul"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instansi</label>
            <input
              type="text"
              name="instansi"
              placeholder="Nama instansi pemohon"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
            <input
              type="text"
              name="lokasi"
              placeholder="Lokasi pekerjaan"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Pekerjaan</label>
            <input
              type="text"
              name="jenis_pekerjaan"
              required
              placeholder="Pemasangan pipa, kabel, dll"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link DED</label>
            <input
              type="url"
              name="link_ded"
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
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
