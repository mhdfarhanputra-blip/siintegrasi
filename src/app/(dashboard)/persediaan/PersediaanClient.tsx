'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Download, FileImage } from 'lucide-react'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import FileUpload from '@/components/FileUpload'
import Combobox, { type ComboboxOption } from '@/components/Combobox'
import { useRealtime } from '@/lib/useRealtime'
import { useDebounce } from '@/lib/useDebounce'
import { showError, showSuccess, confirmActionAsync } from '@/lib/toast'

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
  link_dokumentasi: string | null
  input_by: string | null
  created_at: string
}

interface MasterBarang {
  id: string
  nama: string
  satuan: string | null
  kategori: string | null
}

const ITEMS_PER_PAGE = 50

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

export default function PersediaanClient({
  initialData,
  masterBarang = [],
}: {
  initialData: PersediaanRow[]
  masterBarang?: MasterBarang[]
}) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PersediaanRow | null>(null)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState<number>(new Date().getFullYear())
  const [jenisFilter, setJenisFilter] = useState<string>('Semua')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [linkDokumentasi, setLinkDokumentasi] = useState<string | null>(null)
  const [namaBarang, setNamaBarang] = useState('')
  const [satuanField, setSatuanField] = useState('')
  const [masterList, setMasterList] = useState<MasterBarang[]>(masterBarang)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useRealtime('persediaan')

  // Sinkronisasi state saat server data berubah (realtime refresh)
  useEffect(() => { setData(initialData) }, [initialData])

  // Bangun opsi combobox dari master barang + nama barang yang sudah pernah dipakai
  const barangOptions = useMemo<ComboboxOption[]>(() => {
    const map = new Map<string, ComboboxOption>()
    masterList.forEach((m) => {
      map.set(m.nama.toLowerCase(), {
        value: m.nama,
        label: m.nama,
        meta: { satuan: m.satuan },
      })
    })
    data.forEach((d) => {
      const key = d.nama_barang.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          value: d.nama_barang,
          label: d.nama_barang,
          meta: { satuan: d.satuan },
        })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [masterList, data])

  async function createMasterBarang(nama: string): Promise<ComboboxOption | null> {
    const defaultSatuan = satuanField || 'unit'
    try {
      const { data: created, error } = await supabase
        .from('master_barang')
        .insert({ nama, satuan: defaultSatuan })
        .select('id, nama, satuan, kategori')
        .single()
      if (error) throw error
      if (!created) return null
      setMasterList((prev) => [...prev, created])
      setSatuanField(created.satuan)
      showSuccess(`Barang "${nama}" ditambahkan ke master`)
      return { value: created.nama, label: created.nama, meta: { satuan: created.satuan } }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menambah master barang', msg)
      return null
    }
  }

  const debouncedSearch = useDebounce(search)

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase()
    return data.filter((d) => {
      if (d.tahun_anggaran && d.tahun_anggaran !== tahunFilter) return false
      if (jenisFilter !== 'Semua' && d.jenis !== jenisFilter) return false
      return (
        d.nama_barang.toLowerCase().includes(q) ||
        (d.supplier_tujuan ?? '').toLowerCase().includes(q) ||
        d.jenis.toLowerCase().includes(q)
      )
    })
  }, [data, debouncedSearch, tahunFilter, jenisFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedData = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

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

  const stokKritis = useMemo(() => {
    return [...latestByItem.values()].filter(
      (r) => r.stok_minimum && r.stok_minimum > 0 && r.stok_saldo <= r.stok_minimum
    )
  }, [latestByItem])

  const totalSaldo = [...latestByItem.values()].reduce((sum, row) => sum + (row.stok_saldo ?? 0), 0)

  const openAdd = () => {
    setEditing(null)
    setLinkDokumentasi(null)
    setNamaBarang('')
    setSatuanField('')
    setShowForm(true)
  }

  const openEdit = (row: PersediaanRow) => {
    setEditing(row)
    setLinkDokumentasi(row.link_dokumentasi)
    setNamaBarang(row.nama_barang)
    setSatuanField(row.satuan)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const jenis = form.get('jenis') as string
    const jumlah = Number(form.get('jumlah'))
    const itemKey = namaBarang.toLowerCase()

    try {
      if (editing) {
        const payload = {
          tanggal: form.get('tanggal') as string,
          jenis,
          nama_barang: namaBarang,
          supplier_tujuan: (form.get('supplier_tujuan') as string) || null,
          jumlah,
          satuan: satuanField || 'unit',
          stok_minimum: Number(form.get('stok_minimum') ?? 0) || 0,
          link_dokumentasi: linkDokumentasi,
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
          satuan: satuanField || 'unit',
          stok_saldo: newSaldo,
          stok_minimum: Number(form.get('stok_minimum') ?? 0) || 0,
          tahun_anggaran: tahunFilter,
          link_dokumentasi: linkDokumentasi,
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
    if (!(await confirmActionAsync('Hapus data persediaan ini?'))) return
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

      {stokKritis.length > 0 && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm font-semibold text-orange-800 mb-2">⚠️ {stokKritis.length} item stok kritis</p>
          <div className="flex flex-wrap gap-2">
            {stokKritis.map((item) => (
              <span key={item.id} className="px-2 py-1 bg-white border border-orange-200 rounded-lg text-[11px] text-orange-700">
                {item.nama_barang} (saldo: {item.stok_saldo}/{item.stok_minimum})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={tahunFilter}
          onChange={(e) => { setTahunFilter(Number(e.target.value)); setCurrentPage(1) }}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>TA {y}</option>
          ))}
        </select>
        <select
          value={jenisFilter}
          onChange={(e) => { setJenisFilter(e.target.value); setCurrentPage(1) }}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          <option value="Semua">Semua Jenis</option>
          <option value="Masuk">Masuk</option>
          <option value="Keluar">Keluar</option>
        </select>
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder="Cari barang..." />
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
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-[var(--color-ink-400)]">
                    {data.length === 0 ? 'Belum ada data persediaan' : 'Tidak ada hasil pencarian'}
                  </td>
                </tr>
              )}
              {paginatedData.map((row) => (
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
        {totalPages > 1 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
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
            <Combobox
              id={editing ? 'edit-nama-barang' : 'add-nama-barang'}
              label="Nama Barang"
              required
              value={namaBarang}
              onChange={(val, meta) => {
                setNamaBarang(val)
                if (meta?.satuan && typeof meta.satuan === 'string') {
                  setSatuanField(meta.satuan)
                }
              }}
              options={barangOptions}
              onCreate={createMasterBarang}
              placeholder="Cari atau ketik nama barang..."
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
                value={satuanField}
                onChange={(e) => setSatuanField(e.target.value)}
                required
                aria-required="true"
                placeholder="pcs, rim, box"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
              <p className="text-[10.5px] text-[var(--color-ink-400)] mt-1">Auto-isi dari master barang.</p>
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
          <FileUpload
            label="Dokumentasi Barang"
            value={linkDokumentasi}
            onChange={setLinkDokumentasi}
            helperText="Unggah foto atau dokumentasi barang persediaan."
            id={editing ? 'edit-link-dokumentasi' : 'add-link-dokumentasi'}
            modul="Persediaan"
          />
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
