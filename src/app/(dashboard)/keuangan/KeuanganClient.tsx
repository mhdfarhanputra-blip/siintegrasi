'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wallet, Plus, Trash2, Download, Pencil, Receipt } from 'lucide-react'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import FileUpload from '@/components/FileUpload'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmActionAsync } from '@/lib/toast'

interface Keuangan {
  id: string
  tanggal: string
  jenis_transaksi: 'Debit' | 'Kredit'
  kategori: string | null
  nominal: number
  keterangan: string | null
  link_nota: string | null
  input_by: string | null
  tahun_anggaran: number | null
  created_at: string
}

interface KategoriItem {
  id: string
  nama: string
  jenis_default: string | null
  aktif: boolean
}

interface KeuanganClientProps {
  initialData: Keuangan[]
  kategoriList: KategoriItem[]
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const ITEMS_PER_PAGE = 15

export default function KeuanganClient({ initialData, kategoriList }: KeuanganClientProps) {
  const [data, setData] = useState<Keuangan[]>(initialData)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Keuangan | null>(null)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState<number>(new Date().getFullYear())
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [linkNota, setLinkNota] = useState<string | null>(null)
  const [currentJenis, setCurrentJenis] = useState<'Debit' | 'Kredit'>('Debit')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useRealtime('keuangan')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return data.filter((d) => {
      if (d.tahun_anggaran && d.tahun_anggaran !== tahunFilter) return false
      return (
        (d.kategori ?? '').toLowerCase().includes(q) ||
        (d.keterangan ?? '').toLowerCase().includes(q) ||
        d.jenis_transaksi.toLowerCase().includes(q)
      )
    })
  }, [data, search, tahunFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedData = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  const totalDebit = filtered
    .filter((d) => d.jenis_transaksi === 'Debit')
    .reduce((sum, d) => sum + d.nominal, 0)
  const totalKredit = filtered
    .filter((d) => d.jenis_transaksi === 'Kredit')
    .reduce((sum, d) => sum + d.nominal, 0)
  const saldo = totalDebit - totalKredit

  const handleDelete = async (id: string) => {
    if (!(await confirmActionAsync('Yakin ingin menghapus transaksi ini?'))) return
    try {
      const { error } = await supabase.from('keuangan').delete().eq('id', id)
      if (error) throw error
      setData((prev) => prev.filter((item) => item.id !== id))
      showSuccess('Transaksi berhasil dihapus')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus', msg)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setLinkNota(null)
    setCurrentJenis('Debit')
    setShowModal(true)
  }

  const openEdit = (item: Keuangan) => {
    setEditing(item)
    setLinkNota(item.link_nota)
    setCurrentJenis(item.jenis_transaksi)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)

    const payload = {
      tanggal: form.get('tanggal') as string,
      jenis_transaksi: form.get('jenis_transaksi') as string,
      kategori: (form.get('kategori') as string) || null,
      nominal: Number(form.get('nominal')),
      keterangan: (form.get('keterangan') as string) || null,
      link_nota: linkNota,
      tahun_anggaran: tahunFilter,
    }

    try {
      if (editing) {
        const { error } = await supabase.from('keuangan').update(payload).eq('id', editing.id)
        if (error) throw error
        showSuccess('Transaksi berhasil diperbarui')
      } else {
        const { error } = await supabase.from('keuangan').insert(payload)
        if (error) throw error
        showSuccess('Transaksi berhasil disimpan')
      }
      setShowModal(false)
      setEditing(null)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menyimpan', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-navy-900)] text-white text-sm rounded-lg hover:bg-[var(--color-navy-900)]/90 transition"
          >
            <Plus size={16} /> Tambah Transaksi
          </button>
          <a
            href="/api/export/keuangan"
            download
            className="flex items-center gap-2 px-4 py-2 border border-[var(--color-surface-200)] text-sm rounded-lg hover:bg-[var(--color-surface-100)] transition text-[var(--color-ink-700)]"
          >
            <Download size={16} /> Ekspor CSV
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={tahunFilter}
            onChange={(e) => { setTahunFilter(Number(e.target.value)); setCurrentPage(1) }}
            className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>TA {y}</option>
            ))}
          </select>
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v)
                setCurrentPage(1)
              }}
              placeholder="Cari transaksi..."
            />
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCards totalDebit={totalDebit} totalKredit={totalKredit} saldo={saldo} />
          <TransaksiTable data={paginatedData} onDelete={handleDelete} onEdit={openEdit} />
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditing(null)
        }}
        title={editing ? 'Ubah Transaksi' : 'Tambah Transaksi'}
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
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-jenis-transaksi' : 'add-jenis-transaksi'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Jenis Transaksi <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <select
              id={editing ? 'edit-jenis-transaksi' : 'add-jenis-transaksi'}
              name="jenis_transaksi"
              defaultValue={editing?.jenis_transaksi ?? 'Debit'}
              onChange={(e) => setCurrentJenis(e.target.value as 'Debit' | 'Kredit')}
              required
              aria-required="true"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
            >
              <option value="Debit">Debit</option>
              <option value="Kredit">Kredit</option>
            </select>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-kategori' : 'add-kategori'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Kategori
            </label>
            <select
              id={editing ? 'edit-kategori' : 'add-kategori'}
              name="kategori"
              defaultValue={editing?.kategori ?? ''}
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
            >
              <option value=""> Tanpa kategori </option>
              {kategoriList.map((k) => (
                <option key={k.id} value={k.nama}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-nominal' : 'add-nominal'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Nominal <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id={editing ? 'edit-nominal' : 'add-nominal'}
              type="number"
              name="nominal"
              defaultValue={editing?.nominal}
              required
              aria-required="true"
              min="1"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-keterangan' : 'add-keterangan'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Keterangan
            </label>
            <textarea
              id={editing ? 'edit-keterangan' : 'add-keterangan'}
              name="keterangan"
              defaultValue={editing?.keterangan ?? ''}
              rows={2}
              placeholder="Opsional"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
            />
          </div>
          {currentJenis === 'Kredit' && (
            <FileUpload
              label="Kuitansi Pembayaran"
              value={linkNota}
              onChange={setLinkNota}
              helperText="Unggah kuitansi atau bukti pembayaran (wajib untuk transaksi kredit)."
              id={editing ? 'edit-link-nota' : 'add-link-nota'}
              modul="Keuangan"
            />
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[var(--color-gold-500)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-gold-600)] transition disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : editing ? 'Perbarui' : 'Simpan'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
        <Wallet size={32} className="text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-navy-900)] mb-2">Modul Keuangan</h2>
      <p className="text-[var(--color-ink-500)]">Belum ada data transaksi</p>
    </div>
  )
}

function SummaryCards({
  totalDebit,
  totalKredit,
  saldo,
}: {
  totalDebit: number
  totalKredit: number
  saldo: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-[var(--color-surface-200)] rounded-xl p-4">
        <p className="text-xs text-[var(--color-ink-500)] uppercase font-semibold">Total Debit</p>
        <p className="text-lg font-bold text-green-700 mt-1">{formatRupiah(totalDebit)}</p>
      </div>
      <div className="bg-white border border-[var(--color-surface-200)] rounded-xl p-4">
        <p className="text-xs text-[var(--color-ink-500)] uppercase font-semibold">Total Kredit</p>
        <p className="text-lg font-bold text-red-700 mt-1">{formatRupiah(totalKredit)}</p>
      </div>
      <div className="bg-white border border-[var(--color-surface-200)] rounded-xl p-4">
        <p className="text-xs text-[var(--color-ink-500)] uppercase font-semibold">Saldo</p>
        <p className="text-lg font-bold text-[var(--color-navy-900)] mt-1">{formatRupiah(saldo)}</p>
      </div>
    </div>
  )
}

function TransaksiTable({
  data,
  onDelete,
  onEdit,
}: {
  data: Keuangan[]
  onDelete: (id: string) => void
  onEdit: (item: Keuangan) => void
}) {
  return (
    <div className="bg-white border border-[var(--color-surface-200)] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-surface-200)]">
        <h3 className="font-semibold text-[var(--color-navy-900)]">Daftar Transaksi</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-50)] text-left text-xs text-[var(--color-ink-500)] uppercase">
              <th className="px-5 py-3">Tanggal</th>
              <th className="px-5 py-3">Jenis</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3 text-right">Nominal</th>
              <th className="px-5 py-3">Keterangan</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-surface-200)]">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-[var(--color-surface-100)]">
                <td className="px-5 py-3 whitespace-nowrap">{formatDate(item.tanggal)}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.jenis_transaksi === 'Debit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.jenis_transaksi}
                  </span>
                </td>
                <td className="px-5 py-3 text-[var(--color-ink-500)]">{item.kategori ?? '-'}</td>
                <td className="px-5 py-3 text-right font-medium">{formatRupiah(item.nominal)}</td>
                <td className="px-5 py-3 text-[var(--color-ink-500)] max-w-[200px] truncate">{item.keterangan ?? '-'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {item.link_nota && (
                      <a
                        href={item.link_nota}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-ink-400)] hover:text-emerald-600 transition"
                        title="Lihat kuitansi"
                      >
                        <Receipt size={16} />
                      </a>
                    )}
                    <button
                      onClick={() => onEdit(item)}
                      className="text-[var(--color-ink-400)] hover:text-[var(--color-gold-500)] transition"
                      title="Ubah"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
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
  )
}
