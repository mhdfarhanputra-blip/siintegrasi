'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Download, MapPin, User, Upload } from 'lucide-react'
import Modal from '@/components/Modal'
import FileUpload from '@/components/FileUpload'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmActionAsync } from '@/lib/toast'

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
  tahun_pengadaan: number | null
  tahun_pencatatan: number | null
  updated_at: string
}

const formatCurrency = (num: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(num)

const KONDISI_COLOR: Record<string, string> = {
  Baik: 'bg-green-50 text-green-700',
  'Rusak Ringan': 'bg-yellow-50 text-yellow-700',
  'Rusak Berat': 'bg-red-50 text-red-700',
}

export default function BmnClient({ initialData }: { initialData: BmnRow[] }) {
  const [data, setData] = useState(initialData)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BmnRow | null>(null)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [linkFoto, setLinkFoto] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useRealtime('bmn')

  // Sinkronisasi state saat server data berubah (realtime refresh)
  useEffect(() => { setData(initialData) }, [initialData])

  async function handleImportFromPrevYear() {
    if (!(await confirmActionAsync(`Import data BMN dari TA ${tahunFilter - 1} ke TA ${tahunFilter}? Data akan diduplikasi dengan kondisi yang bisa diupdate.`))) return
    setImportLoading(true)
    try {
      const { data: prevData, error: fetchErr } = await supabase
        .from('bmn')
        .select('kode_aset, nama_aset, spesifikasi, kondisi, nilai_aset, lokasi, pengguna, status_penggunaan, link_foto, tahun_pengadaan')
        .eq('tahun_pencatatan', tahunFilter - 1)
      if (fetchErr) throw fetchErr
      if (!prevData || prevData.length === 0) {
        showError('Tidak ada data', `Tidak ditemukan data BMN di TA ${tahunFilter - 1}`)
        return
      }
      const newRows = prevData.map((r) => ({
        ...r,
        tahun_pencatatan: tahunFilter,
        updated_at: new Date().toISOString(),
      }))
      const { error: insertErr } = await supabase.from('bmn').insert(newRows)
      if (insertErr) throw insertErr
      showSuccess(`${newRows.length} aset berhasil diimport dari TA ${tahunFilter - 1}`)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal import', msg)
    } finally {
      setImportLoading(false)
    }
  }

  const [kondisiFilter, setKondisiFilter] = useState<string>('Semua')
  const [statusFilter, setStatusFilter] = useState<string>('Semua')
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [tahunFilter, kondisiFilter, statusFilter, search])

  const filtered = data.filter((d) => {
    if (d.tahun_pencatatan !== tahunFilter) return false
    if (kondisiFilter !== 'Semua' && d.kondisi !== kondisiFilter) return false
    if (statusFilter !== 'Semua' && d.status_penggunaan !== statusFilter) return false
    const q = search.toLowerCase()
    return (
      d.nama_aset.toLowerCase().includes(q) ||
      d.kode_aset.toLowerCase().includes(q) ||
      (d.lokasi ?? '').toLowerCase().includes(q) ||
      (d.pengguna ?? '').toLowerCase().includes(q) ||
      (d.spesifikasi ?? '').toLowerCase().includes(q)
    )
  })

  const ITEMS_PER_PAGE = 50
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedData = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [pdfImportLoading, setPdfImportLoading] = useState(false)

  async function handleImportPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPdfImportLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tahun_pencatatan', String(tahunFilter))
      const res = await fetch('/api/bmn/import', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal import')
      showSuccess(json.message)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal import PDF', msg)
    } finally {
      setPdfImportLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setLinkFoto(null)
    setShowForm(true)
  }

  const openEdit = (row: BmnRow) => {
    setEditing(row)
    setLinkFoto(row.link_foto)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      tahun_pengadaan: Number(form.get('tahun_pengadaan')) || null,
      tahun_pencatatan: tahunFilter,
      link_foto: linkFoto,
    }

    try {
      if (editing) {
        const { error } = await supabase.from('bmn').update(payload).eq('id', editing.id)
        if (error) throw error
        showSuccess('Aset BMN berhasil diperbarui')
      } else {
        const { error } = await supabase.from('bmn').insert(payload)
        if (error) throw error
        showSuccess('Aset BMN berhasil disimpan')
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
    if (!(await confirmActionAsync('Hapus data aset BMN ini?'))) return
    try {
      const { error } = await supabase.from('bmn').delete().eq('id', id)
      if (error) throw error
      setData((prev) => prev.filter((d) => d.id !== id))
      showSuccess('Aset BMN berhasil dihapus')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus', msg)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)]">Barang Milik Negara</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleImportFromPrevYear}
            disabled={importLoading}
            className="border border-[var(--color-surface-200)] text-[var(--color-ink-700)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {importLoading ? 'Mengimport...' : `Import dari TA ${tahunFilter - 1}`}
          </button>
          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={pdfImportLoading}
            className="border border-[var(--color-surface-200)] text-[var(--color-ink-700)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Upload size={16} />
            {pdfImportLoading ? 'Memproses...' : 'Import PDF Label'}
          </button>
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleImportPdf}
            aria-label="Pilih file PDF label BMN"
          />
          <button
            onClick={openAdd}
            className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Tambah Aset
          </button>
          <a
            href="/api/export/bmn"
            download
            className="flex items-center gap-2 px-4 py-2 border border-[var(--color-surface-200)] text-sm rounded-lg hover:bg-[var(--color-surface-100)] transition text-[var(--color-ink-700)]"
          >
            <Download size={16} /> Ekspor CSV
          </a>
        </div>
      </div>

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
          value={kondisiFilter}
          onChange={(e) => { setKondisiFilter(e.target.value); setCurrentPage(1) }}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          <option value="Semua">Semua Kondisi</option>
          <option value="Baik">Baik</option>
          <option value="Rusak Ringan">Rusak Ringan</option>
          <option value="Rusak Berat">Rusak Berat</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          <option value="Semua">Semua Status</option>
          <option value="Digunakan">Digunakan</option>
          <option value="Tidak Digunakan">Tidak Digunakan</option>
        </select>
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder="Cari aset..." />
        </div>
        <span className="text-[11px] text-[var(--color-ink-500)]">
          {filtered.length} aset{filtered.length > ITEMS_PER_PAGE ? ` · Hal ${safePage}/${totalPages}` : ''}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-ink-400)]">
          {data.length === 0 ? 'Belum ada data aset BMN' : 'Tidak ada hasil pencarian'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-[var(--color-surface-200)] flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-[var(--color-ink-400)] font-mono">{row.kode_aset}</p>
                    <h3 className="font-semibold text-[var(--color-navy-900)] mt-0.5">{row.nama_aset}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      className="text-[var(--color-ink-400)] hover:text-[var(--color-gold-500)] transition"
                      title="Ubah"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-400 hover:text-red-600 transition"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {row.spesifikasi && (
                  <p className="text-xs text-[var(--color-ink-500)] mb-3">{row.spesifikasi}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      KONDISI_COLOR[row.kondisi] || 'bg-[var(--color-surface-50)] text-[var(--color-ink-700)]'
                    }`}
                  >
                    {row.kondisi}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {row.status_penggunaan}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[var(--color-gold-500)] mb-3">
                  {formatCurrency(row.nilai_aset)}
                </p>
                <div className="mt-auto flex items-center gap-4 text-xs text-[var(--color-ink-500)]">
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
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        title={editing ? 'Ubah Aset BMN' : 'Tambah Aset BMN'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={editing ? 'edit-kode-aset' : 'add-kode-aset'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Kode Aset <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-kode-aset' : 'add-kode-aset'}
                type="text"
                name="kode_aset"
                defaultValue={editing?.kode_aset}
                required
                aria-required="true"
                placeholder="3.06.01.01.001"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={editing ? 'edit-nama-aset' : 'add-nama-aset'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Nama Aset <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-nama-aset' : 'add-nama-aset'}
                type="text"
                name="nama_aset"
                defaultValue={editing?.nama_aset}
                required
                aria-required="true"
                placeholder="Laptop Dell"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-spesifikasi' : 'add-spesifikasi'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Spesifikasi
            </label>
            <input
              id={editing ? 'edit-spesifikasi' : 'add-spesifikasi'}
              type="text"
              name="spesifikasi"
              defaultValue={editing?.spesifikasi ?? ''}
              placeholder="Detail spesifikasi"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={editing ? 'edit-kondisi' : 'add-kondisi'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Kondisi <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <select
                id={editing ? 'edit-kondisi' : 'add-kondisi'}
                name="kondisi"
                defaultValue={editing?.kondisi ?? 'Baik'}
                required
                aria-required="true"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              >
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </div>
            <div>
              <label
                htmlFor={editing ? 'edit-nilai-aset' : 'add-nilai-aset'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Nilai Aset <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id={editing ? 'edit-nilai-aset' : 'add-nilai-aset'}
                type="number"
                name="nilai_aset"
                defaultValue={editing?.nilai_aset}
                required
                aria-required="true"
                min={0}
                placeholder="0"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={editing ? 'edit-lokasi' : 'add-lokasi'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Lokasi
              </label>
              <input
                id={editing ? 'edit-lokasi' : 'add-lokasi'}
                type="text"
                name="lokasi"
                defaultValue={editing?.lokasi ?? ''}
                placeholder="Ruang kerja"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label
                htmlFor={editing ? 'edit-pengguna' : 'add-pengguna'}
                className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
              >
                Pengguna
              </label>
              <input
                id={editing ? 'edit-pengguna' : 'add-pengguna'}
                type="text"
                name="pengguna"
                defaultValue={editing?.pengguna ?? ''}
                placeholder="Nama pengguna"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-tahun-pengadaan' : 'add-tahun-pengadaan'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Tahun Pengadaan
            </label>
            <input
              id={editing ? 'edit-tahun-pengadaan' : 'add-tahun-pengadaan'}
              type="number"
              name="tahun_pengadaan"
              defaultValue={editing?.tahun_pengadaan ?? ''}
              min={2000}
              max={2030}
              placeholder="2024"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-status-penggunaan' : 'add-status-penggunaan'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Status Penggunaan <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <select
              id={editing ? 'edit-status-penggunaan' : 'add-status-penggunaan'}
              name="status_penggunaan"
              defaultValue={editing?.status_penggunaan ?? 'Digunakan'}
              required
              aria-required="true"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-gold-500)] focus:border-transparent outline-none"
            >
              <option value="Digunakan">Digunakan</option>
              <option value="Tidak Digunakan">Tidak Digunakan</option>
              <option value="Dipinjamkan">Dipinjamkan</option>
            </select>
          </div>
          <FileUpload
            label="Foto Aset"
            value={linkFoto}
            onChange={setLinkFoto}
            helperText="Unggah foto aset atau tempel tautan."
            id={editing ? 'edit-link-foto' : 'add-link-foto'}
            modul="BMN"
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
