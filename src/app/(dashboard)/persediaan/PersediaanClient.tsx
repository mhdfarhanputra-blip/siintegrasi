'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/Modal'

interface PersediaanRow {
  id: string
  tanggal: string
  jenis: string
  nama_barang: string
  supplier_tujuan: string | null
  jumlah: number
  satuan: string
  stok_saldo: number
  input_by: string | null
  created_at: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function PersediaanClient({ initialData }: { initialData: PersediaanRow[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const latestSaldo = data.length > 0 ? data[0].stok_saldo : 0

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const jenis = form.get('jenis') as string
    const jumlah = Number(form.get('jumlah'))
    const newSaldo = jenis === 'Masuk' ? latestSaldo + jumlah : latestSaldo - jumlah

    const payload = {
      tanggal: form.get('tanggal') as string,
      jenis,
      nama_barang: form.get('nama_barang') as string,
      supplier_tujuan: (form.get('supplier_tujuan') as string) || null,
      jumlah,
      satuan: form.get('satuan') as string,
      stok_saldo: newSaldo,
    }
    const { error } = await supabase.from('persediaan').insert(payload)
    setLoading(false)
    if (!error) {
      setShowForm(false)
      router.refresh()
    } else {
      alert('Gagal menyimpan data: ' + error.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data persediaan ini?')) return
    const { error } = await supabase.from('persediaan').delete().eq('id', id)
    if (!error) {
      setData((prev) => prev.filter((d) => d.id !== id))
    } else {
      alert('Gagal menghapus: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0c1e3e]">Persediaan</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#0c1e3e] text-white px-4 py-2 rounded-lg hover:bg-[#122243] transition flex items-center gap-2"
        >
          <Plus size={16} /> Tambah Barang
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Transaksi</p>
          <p className="text-xl font-bold text-[#0c1e3e]">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Barang Masuk</p>
          <p className="text-xl font-bold text-green-600">
            {data.filter((d) => d.jenis === 'Masuk').reduce((s, d) => s + d.jumlah, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Saldo Stok Terakhir</p>
          <p className="text-xl font-bold text-[#0c1e3e]">{latestSaldo}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Barang</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier/Tujuan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Jumlah</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Satuan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Saldo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    Belum ada data persediaan
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">{formatDate(row.tanggal)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.jenis === 'Masuk'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {row.jenis}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{row.nama_barang}</td>
                  <td className="px-4 py-3 text-gray-600">{row.supplier_tujuan || '-'}</td>
                  <td className="px-4 py-3 text-right">{row.jumlah}</td>
                  <td className="px-4 py-3">{row.satuan}</td>
                  <td className="px-4 py-3 text-right font-medium">{row.stok_saldo}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 hover:text-red-700 transition"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Tambah Persediaan">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input
              type="date"
              name="tanggal"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
            <select
              name="jenis"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            >
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
            <input
              type="text"
              name="nama_barang"
              required
              placeholder="Nama barang"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Tujuan</label>
            <input
              type="text"
              name="supplier_tujuan"
              placeholder="Nama supplier atau tujuan"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
              <input
                type="number"
                name="jumlah"
                required
                min={1}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
              <input
                type="text"
                name="satuan"
                required
                placeholder="pcs, rim, box"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#c79a4a] focus:border-transparent outline-none"
              />
            </div>
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
