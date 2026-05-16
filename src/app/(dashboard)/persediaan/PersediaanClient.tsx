'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Download } from 'lucide-react'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmAction } from '@/lib/toast'

interface PersediaanRow {
  id: string
  tanggal: string
  jenis: string
  nama_barang: string
  supplier_tujuan: string | null
  jumlah: number
  satuan: string
  stok_saldo: number
  stok_minimum: number | null
  tahun_anggaran: number | null
  input_by: string | null
  created_at: string
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function PersediaanClient({ initialData }: { initialData: PersediaanRow[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PersediaanRow | null>(null)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useRealtime('persediaan')

  const filtered = data.filter((d) => {
    if (d.tahun_anggaran && d.tahun_anggaran !== tahunFilter) return false
    const q = search.toLowerCase()
    return (
      d.nama_barang.toLowerCase().includes(q) ||
      (d.supplier_tujuan ?? '').toLowerCase().includes(q) ||
      d.jenis.toLowerCase().includes(q)
    )
  })

  const latestByItem = useMemo(() => {
    const latest = new Map<string, PersediaanRow>()
    const rows = [...data]
      .filter((d) => !d.tahun_anggaran || d.tahun_anggaran === tahunFilter)
      .sort((a, b) => +new Date(b.created_at || b.tanggal) - +new Date(a.created_at || a.tanggal))
    rows.forEach((row) => {
      const key = row.nama_barang.trim().toLowerCase()
      if (key && !latest.has(key)) latest.set(key, row)
    })
    return latest
  }, [data, tahunFilter])

  const totalSaldo = [...latestByItem.values()].reduce((sum, row) => sum + (row.stok_saldo ?? 0), 0)

  const openAdd = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (row: PersediaanRow) => {
    setEditing(row)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const jenis = form.get('jenis') as string
    const jumlah = Number(form.get('jumlah'))
    const namaBarang = (form.get('nama_barang') as string).trim()
    const itemKey = namaBarang.toLowerCase()

    try {
      if (editing) {
        const payload = {
          tanggal: form.get('tanggal') as string,
          jenis,
          nama_barang: namaBarang,
          supplier_tujuan: (form.get('supplier_tujuan') as string) || null,
          jumlah,
          satuan: form.get('satuan') as string,
          stok_minimum: Number(form.get('stok_minimum') ?? 0) || 0,
        }
        const { error } = await supabase.from('persediaan').update(payload).eq('id', editing.id)
        if (error) throw error
        showSuccess('Data persediaan berhasil diperbarui')
      } else {
        const previousSaldo = latestByItem.get(itemKey)?.stok_saldo ?? 0
        const newSaldo = jenis === 'Masuk' ? previousSaldo + jumlah : previousSaldo - jumlah
        if (newSaldo < 0) {
          showError('Stok tidak mencukupi', `Saldo ${namaBarang || 'barang'} saat ini ${previousSaldo}.`)
          return
        }
        const payload = {
          tanggal: form.get('tanggal') as string,
          jenis,
          nama_barang: namaBarang,
          supplier_tujuan: (form.get('supplier_tujuan') as string) || null,
          jumlah,
          satuan: form.get('satuan') as string,
          stok_saldo: newSaldo,
          stok_minimum: Number(form.get('stok_minimum') ?? 0) || 0,
          tahun_anggaran: tahunFilter,
        }
        const { error } = await supabase.from('persediaan').insert(payload)
        if (error) throw error
        showSuccess('Data persediaan berhasil disimpan')
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
    if (!confirmAction('Hapus data persediaan ini?')) return
    try {
      const { error } = await supabase.from('persediaan').delete().eq('id', id)
      if (error) throw error
      setData((prev) => prev.filter((d) => d.id !== id))
      showSuccess('Data persediaan berhasil dihapus')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus', msg)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)]">Persediaan</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAdd}
            className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Tambah Barang
          </button>
          <a
            href="/api/export/persediaan"
            download
            className="flex items-center gap-2 px-4 py-2 border border-[var(--color-surface-200)] text-sm rounded-lg hover:bg-[var(--color-surface-100)] transition text-[var(--color-ink-700)]"
          >
            <Download size={16} /> Ekspor CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-surface-200)]">
          <p className="text-sm text-[var(--color-ink-500)]">Total Transaksi</p>
          <p className="text-xl font-bold text-[var(--color-navy-900)]">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-surface-200)]">
          <p className="text-sm text-[var(--color-ink-500)]">Barang Masuk</p>
          <p className="text-xl font-bold text-green-600">
            {data.filter((d) => d.jenis === 'Masuk').reduce((s, d) => s + d.jumlah, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-surface-200)]">
          <p className="text-sm text-[var(--color-ink-500)]">Saldo Stok Terakhir</p>
          <p className="text-xl font-bold text-[var(--color-navy-900)]">{totalSaldo}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={tahunFilter}
          onChange={(e) => setTahunFilter(Number(e.target.value))}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>TA {y}</option>
          ))}
        </select>
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari barang..." />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-ink-500)]">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-ink-500)]">Jenis</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-ink-500)]">Nama Barang</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-ink-500)]">Supplier/Tujuan</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-ink-500)]">Jumlah</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-ink-500)]">Satuan</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-ink-500)]">Saldo</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--color-ink-500)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--color-ink-400)]">
                    {data.length === 0 ? 'Belum ada data persediaan' : 'Tidak ada hasil pencarian'}
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-[var(--color-surface-50)] hover:bg-[var(--color-surface-100)]">
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
                  <td className="px-4 py-3 text-[var(--color-ink-500)]">{row.supplier_tujuan || '-'}</td>
                  <td className="px-4 py-3 text-right">{row.jumlah}</td>
                  <td className="px-4 py-3">{row.satuan}</td>
                  <td className="px-4 py-3 text-right font-medium">{row.stok_saldo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="text-[var(--color-ink-400)] hover:text-[var(--color-gold-500)] transition"
                        title="Ubah"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-[var(--color-ink-400)] hover:text-red-600 transition"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        title={editing ? 'Ubah Persediaan' : 'Tambah Persediaan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor={editing ? 'edit-tanggal' : 'add-tanggal'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Tanggal <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id={editing ? 'edit-tanggal' : 'add-tanggal'}
              type="date"
              name="tanggal"
              defaultValue={editing?.tanggal}
              required
              aria-required="true"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-jenis' : 'add-jenis'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Jenis <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <select
              id={editing ? 'edit-jenis' : 'add-jenis'}
              name="jenis"
              defaultValue={editing?.jenis ?? 'Masuk'}
              required
              aria-required="true"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            >
              <option value="Masuk">Masuk</option>
              <option value="Keluar">Keluar</option>
            </select>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-nama-barang' : 'add-nama-barang'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Nama Barang <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id={editing ? 'edit-nama-barang' : 'add-nama-barang'}
              type="text"
              name="nama_barang"
              defaultValue={editing?.nama_barang}
              required
              aria-required="true"
              placeholder="Nama barang"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-supplier-tujuan' : 'add-supplier-tujuan'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Supplier / Tujuan
            </label>
            <input
              id={editing ? 'edit-supplier-tujuan' : 'add-supplier-tujuan'}
              type="text"
              name="supplier_tujuan"
              defaultValue={editing?.supplier_tujuan ?? ''}
              placeholder="Nama supplier atau tujuan"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={editing ? 'edit-jumlah' : 'add-jumlah'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Jumlah <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-jumlah' : 'add-jumlah'}
                type="number"
                name="jumlah"
                defaultValue={editing?.jumlah}
                required
                aria-required="true"
                min={1}
                placeholder="0"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={editing ? 'edit-satuan' : 'add-satuan'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Satuan <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-satuan' : 'add-satuan'}
                type="text"
                name="satuan"
                defaultValue={editing?.satuan}
                required
                aria-required="true"
                placeholder="pcs, rim, box"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-stok-minimum' : 'add-stok-minimum'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Stok Minimum <span className="text-[var(--color-ink-400)] font-normal">(untuk alert)</span>
            </label>
            <input
              id={editing ? 'edit-stok-minimum' : 'add-stok-minimum'}
              type="number"
              name="stok_minimum"
              defaultValue={editing?.stok_minimum ?? 0}
              min={0}
              placeholder="0"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
            <p className="text-[11px] text-[var(--color-ink-500)] mt-1">
              Sistem akan memberi notifikasi saat saldo &le; nilai ini.
            </p>
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
