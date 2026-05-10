'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MapPin, User } from 'lucide-react'
import Modal from '@/components/Modal'

interface BmnRow {
  id: string
  kode_aset: string
  nama_aset: string
  spesifikasi: string | null
  kondisi: string
  nilai_aset: number
  lokasi: string | null
  pengguna: string | null
  status_penggunaan: string
  link_foto: string | null
  updated_at: string
}

const formatCurrency = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

const KONDISI_COLOR: Record<string, string> = {
  Baik: 'bg-green-50 text-green-700',
  'Rusak Ringan': 'bg-yellow-50 text-yellow-700',
  'Rusak Berat': 'bg-red-50 text-red-700',
}

const supabase = createClient()

export default function BmnClient({ initialData }: { initialData: BmnRow[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      kode_aset: form.get('kode_aset') as string,
      nama_aset: form.get('nama_aset') as string,
      spesifikasi: (form.get('spesifikasi') as string) || null,
      kondisi: form.get('kondisi') as string,
      nilai_aset: Number(form.get('nilai_aset')),
      lokasi: (form.get('lokasi') as string) || null,
      pengguna: (form.get('pengguna') as string) || null,
      status_penggunaan: form.get('status_penggunaan') as string,
      link_foto: (form.get('link_foto') as string) || null,
    }
    const { error } = await supabase.from('bmn').insert(payload)
    setLoading(false)
    if (!error) {
      setShowForm(false)
      router.refresh()
    } else {
      alert('Gagal menyimpan data: ' + error.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data aset BMN ini?')) return
    const { error } = await supabase.from('bmn').delete().eq('id', id)
    if (!error) {
      setData((prev) => prev.filter((d) => d.id !== id))
    } else {
      alert('Gagal menghapus: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0c1e3e]">Barang Milik Negara</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#0c1e3e] text-white px-4 py-2 rounded-lg hover:bg-[#122243] transition flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Aset
        </button>
      </div>

      {/* Card Grid */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Belum ada data aset BMN</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 font-mono">{row.kode_aset}</p>
                  <h3 className="font-semibold text-[#0c1e3e] mt-0.5">{row.nama_aset}</h3>
                </div>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="text-red-400 hover:text-red-600 transition"
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {row.spesifikasi && (
                <p className="text-xs text-gray-500 mb-3">{row.spesifikasi}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    KONDISI_COLOR[row.kondisi] || 'bg-gray-50 text-gray-700'
                  }`}
                >
                  {row.kondisi}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {row.status_penggunaan}
                </span>
              </div>
              <p className="text-sm font-semibold text-[#c79a4a] mb-3">
                {formatCurrency(row.nilai_aset)}
              </p>
              <div className="mt-auto flex items-center gap-4 text-xs text-gray-500">
                {row.lokasi && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {row.lokasi}
                  </span>
                )}
                {row.pengguna && (
                  <span className="flex items-center gap-1">
                    <User size={12} /> {row.pengguna}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Tambah Aset BMN">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Aset</label>
              <input
                type="text"
                name="kode_aset"
                required
                placeholder="3.06.01.01.001"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Aset</label>
              <input
                type="text"
                name="nama_aset"
                required
                placeholder="Laptop Dell"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spesifikasi</label>
            <input
              type="text"
              name="spesifikasi"
              placeholder="Detail spesifikasi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kondisi</label>
              <select
                name="kondisi"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Aset</label>
              <input
                type="number"
                name="nilai_aset"
                required
                min={0}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
              <input
                type="text"
                name="lokasi"
                placeholder="Ruang kerja"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pengguna</label>
              <input
                type="text"
                name="pengguna"
                placeholder="Nama pengguna"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Penggunaan</label>
            <select
              name="status_penggunaan"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            >
              <option value="Digunakan">Digunakan</option>
              <option value="Tidak Digunakan">Tidak Digunakan</option>
              <option value="Dipinjamkan">Dipinjamkan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Foto</label>
            <input
              type="url"
              name="link_foto"
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
