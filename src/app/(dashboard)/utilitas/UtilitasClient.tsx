'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Plus,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  Download,
  Send,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  FileText,
  Share2,
} from 'lucide-react'
import Modal from '@/components/Modal'
import FileUpload from '@/components/FileUpload'
import SearchInput from '@/components/SearchInput'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmActionAsync } from '@/lib/toast'
import { safeHttpUrl } from '@/lib/safeUrl'

interface UtilitasRow {
  id: string
  tgl_usul: string
  instansi: string | null
  lokasi: string | null
  jenis_pekerjaan: string
  link_ded: string | null
  status: string
  revisi_ke: number
  tracking_token: string | null
  tahun_anggaran: number | null
  review_satker: 'PENDING' | 'OK' | 'CATATAN'
  review_satker_catatan: string | null
  review_satker_at: string | null
  review_perencanaan: 'PENDING' | 'OK' | 'CATATAN'
  review_perencanaan_catatan: string | null
  review_perencanaan_at: string | null
  input_by: string | null
  created_at: string
}

interface TransmitalRow {
  id: string
  utilitas_id: string
  tahapan: string
  pic: string | null
  profiles: { nama: string } | null
  waktu_masuk: string
  waktu_selesai: string | null
  durasi_hari: number | null
  catatan: string | null
  created_at: string
}

interface UtilitasClientProps {
  initialData: UtilitasRow[]
  initialTransmital: TransmitalRow[]
  currentUserId: string
  userRole: string
}

type Operator = 'satker' | 'perencanaan'

const STATUS_STYLE: Record<string, { label: string; tone: string; dot: string }> = {
  DIAJUKAN: { label: 'Diajukan', tone: 'bg-sky-50 text-sky-700 border border-sky-200', dot: 'bg-sky-500' },
  PEMERIKSAAN: { label: 'Pemeriksaan', tone: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
  REVISI: { label: 'Revisi', tone: 'bg-orange-50 text-orange-700 border border-orange-200', dot: 'bg-orange-500' },
  DITERIMA: { label: 'Diterima', tone: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  DITOLAK: { label: 'Ditolak', tone: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-500' },
}

const REVIEW_STYLE: Record<string, { label: string; icon: React.ReactNode; tone: string }> = {
  PENDING: { label: 'Menunggu', icon: <CircleDot size={14} />, tone: 'text-slate-500 bg-slate-100' },
  OK: { label: 'OK', icon: <CheckCircle2 size={14} />, tone: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
  CATATAN: { label: 'Ada Catatan', icon: <AlertCircle size={14} />, tone: 'text-orange-700 bg-orange-50 border border-orange-200' },
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function canReviewAs(role: string, op: Operator): boolean {
  if (role === 'Admin') return true
  if (op === 'satker') return role === 'Teknis'
  return role === 'Perencanaan'
}

export default function UtilitasClient({
  initialData,
  initialTransmital,
  currentUserId,
  userRole,
}: UtilitasClientProps) {
  const [data, setData] = useState(initialData)
  const [transmital, setTransmital] = useState(initialTransmital)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UtilitasRow | null>(null)
  const [linkDed, setLinkDed] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialData[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [tahunFilter, setTahunFilter] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [noteTarget, setNoteTarget] = useState<{ row: UtilitasRow; op: Operator } | null>(null)
  const [kronologisRow, setKronologisRow] = useState<UtilitasRow | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useRealtime('utilitas')
  useRealtime('transmital')

  // Sinkronisasi state saat server data berubah (realtime refresh)
  useEffect(() => { setData(initialData) }, [initialData])
  useEffect(() => { setTransmital(initialTransmital) }, [initialTransmital])

  const isPengusul = userRole === 'Pengusul'
  const canCreate = userRole === 'Pengusul' || userRole === 'Admin'

  const filtered = data.filter((d) => {
    if (d.tahun_anggaran && d.tahun_anggaran !== tahunFilter) return false
    const q = search.toLowerCase()
    return (
      d.jenis_pekerjaan.toLowerCase().includes(q) ||
      (d.instansi ?? '').toLowerCase().includes(q) ||
      (d.lokasi ?? '').toLowerCase().includes(q)
    )
  })

  const selected = data.find((d) => d.id === selectedId) ?? null
  const selectedTransmital = transmital.filter((t) => t.utilitas_id === selectedId)

  const openAdd = () => {
    setEditing(null)
    setLinkDed(null)
    setShowForm(true)
  }

  const openEdit = (row: UtilitasRow) => {
    setEditing(row)
    setLinkDed(row.link_ded)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      tgl_usul: form.get('tgl_usul') as string,
      instansi: (form.get('instansi') as string) || null,
      lokasi: (form.get('lokasi') as string) || null,
      jenis_pekerjaan: form.get('jenis_pekerjaan') as string,
      link_ded: linkDed,
    }
    try {
      if (editing) {
        const { error } = await supabase.from('utilitas').update(payload).eq('id', editing.id)
        if (error) throw error
        showSuccess('Permohonan berhasil diperbarui')
      } else {
        const { error } = await supabase
          .from('utilitas')
          .insert({ ...payload, status: 'DIAJUKAN', input_by: currentUserId })
        if (error) throw error
        showSuccess('Permohonan berhasil diajukan')
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

  async function handleMulaiPemeriksaan(row: UtilitasRow) {
    if (!(await confirmActionAsync('Mulai proses pemeriksaan paralel Satker & Perencanaan?', 'Konfirmasi', { confirmLabel: 'Ya, Mulai', tone: 'info' }))) return
    try {
      const { error } = await supabase
        .from('utilitas')
        .update({
          status: 'PEMERIKSAAN',
          review_satker: 'PENDING',
          review_perencanaan: 'PENDING',
          review_satker_catatan: null,
          review_perencanaan_catatan: null,
        })
        .eq('id', row.id)
      if (error) throw error
      showSuccess('Pemeriksaan dimulai')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memulai pemeriksaan', msg)
    }
  }

  async function handleReviewOK(row: UtilitasRow, op: Operator) {
    if (!(await confirmActionAsync(`Tandai review ${op === 'satker' ? 'Operator Satker' : 'Operator Perencanaan'} sebagai OK?`, 'Konfirmasi Review', { confirmLabel: 'Ya, OK', tone: 'info' }))) return
    const opLabel = op === 'satker' ? 'Operator Satker' : 'Operator Perencanaan'
    const now = new Date().toISOString()
    const patch =
      op === 'satker'
        ? {
            review_satker: 'OK' as const,
            review_satker_catatan: null,
            review_satker_by: currentUserId,
            review_satker_at: now,
          }
        : {
            review_perencanaan: 'OK' as const,
            review_perencanaan_catatan: null,
            review_perencanaan_by: currentUserId,
            review_perencanaan_at: now,
          }
    try {
      // Simpan aksi ke transmital sebagai record permanen
      const { error: transmitalErr } = await supabase.from('transmital').insert({
        utilitas_id: row.id,
        tahapan: 'PEMERIKSAAN',
        pic: currentUserId,
        waktu_masuk: now,
        catatan: `${opLabel}: Disetujui (OK)`,
      })
      if (transmitalErr) throw transmitalErr
      const { error } = await supabase.from('utilitas').update(patch).eq('id', row.id)
      if (error) throw error
      showSuccess('Review berhasil diperbarui')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memperbarui', msg)
    }
  }

  async function submitNote(row: UtilitasRow, op: Operator, catatan: string) {
    const opLabel = op === 'satker' ? 'Operator Satker' : 'Operator Perencanaan'
    const now = new Date().toISOString()
    const patch =
      op === 'satker'
        ? {
            review_satker: 'CATATAN' as const,
            review_satker_catatan: catatan,
            review_satker_by: currentUserId,
            review_satker_at: now,
          }
        : {
            review_perencanaan: 'CATATAN' as const,
            review_perencanaan_catatan: catatan,
            review_perencanaan_by: currentUserId,
            review_perencanaan_at: now,
          }
    try {
      // Simpan catatan ke transmital sebagai record permanen
      const { error: transmitalErr } = await supabase.from('transmital').insert({
        utilitas_id: row.id,
        tahapan: 'PEMERIKSAAN',
        pic: currentUserId,
        waktu_masuk: now,
        catatan: `${opLabel}: ${catatan}`,
      })
      if (transmitalErr) throw transmitalErr
      const { error } = await supabase.from('utilitas').update(patch).eq('id', row.id)
      if (error) throw error
      setNoteTarget(null)
      showSuccess('Catatan berhasil dikirim')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menyimpan catatan', msg)
    }
  }

  async function handleResubmitRevisi(row: UtilitasRow) {
    if (!(await confirmActionAsync('Kirim ulang permohonan setelah revisi? Pemeriksaan akan dimulai dari awal.', 'Kirim Ulang', { confirmLabel: 'Ya, Kirim Ulang', tone: 'warning' }))) return
    try {
      // Simpan ringkasan review ke transmital sebelum reset
      const parts: string[] = []
      parts.push(`Satker: ${row.review_satker === 'OK' ? 'OK' : row.review_satker_catatan || 'Catatan'}`)
      parts.push(`Perencanaan: ${row.review_perencanaan === 'OK' ? 'OK' : row.review_perencanaan_catatan || 'Catatan'}`)
      const ringkasan = parts.join(' | ')

      // Insert record transmital untuk mencatat pengajuan ulang
      await supabase.from('transmital').insert({
        utilitas_id: row.id,
        tahapan: 'REVISI',
        pic: currentUserId,
        waktu_masuk: new Date().toISOString(),
        catatan: `Pengusul mengirim ulang (Revisi ke-${row.revisi_ke + 1}). Hasil review sebelumnya: ${ringkasan}`,
      })

      // Reset review untuk putaran baru
      const { error } = await supabase
        .from('utilitas')
        .update({
          status: 'PEMERIKSAAN',
          revisi_ke: row.revisi_ke + 1,
          review_satker: 'PENDING',
          review_perencanaan: 'PENDING',
          review_satker_catatan: null,
          review_perencanaan_catatan: null,
        })
        .eq('id', row.id)
      if (error) throw error
      showSuccess('Permohonan berhasil dikirim ulang')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal mengirim ulang', msg)
    }
  }

  async function handleTolakFinal(row: UtilitasRow) {
    if (!(await confirmActionAsync('Tolak permohonan secara final? Status akan menjadi DITOLAK.', 'Tolak Final', { confirmLabel: 'Ya, Tolak', tone: 'danger' }))) return
    try {
      const { error } = await supabase.from('utilitas').update({ status: 'DITOLAK' }).eq('id', row.id)
      if (error) throw error
      showSuccess('Permohonan ditolak')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menolak', msg)
    }
  }

  async function handleDelete(row: UtilitasRow) {
    if (!(await confirmActionAsync('Hapus permohonan utilitas ini?'))) return
    try {
      const { error } = await supabase.from('utilitas').delete().eq('id', row.id)
      if (error) throw error
      setData((prev) => prev.filter((d) => d.id !== row.id))
      if (selectedId === row.id) setSelectedId(null)
      showSuccess('Permohonan berhasil dihapus')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus', msg)
    }
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">
            Permohonan Utilitas
          </h2>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">
            Alur: Diajukan → Pemeriksaan paralel (Satker & Perencanaan) → Revisi / Diterima
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              onClick={openAdd}
              className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-xl hover:bg-[var(--color-navy-800)] transition flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Ajukan Permohonan
            </button>
          )}
          {!isPengusul && (
            <a
              href="/api/export/utilitas"
              download
              className="flex items-center gap-2 px-4 py-2 border border-[var(--color-surface-200)] text-sm rounded-xl hover:bg-[var(--color-surface-100)] transition text-[var(--color-ink-700)]"
            >
              <Download size={16} /> Ekspor CSV
            </a>
          )}
        </div>
      </div>

      <WorkflowLegend isPengusul={isPengusul} />

      <div className="flex flex-wrap items-center gap-3">
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
          <SearchInput value={search} onChange={setSearch} placeholder="Cari permohonan..." />
        </div>
        <p className="text-[11px] text-[var(--color-ink-500)]">
          Menampilkan {filtered.length} dari {data.length} permohonan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="card-base p-10 text-center text-sm text-[var(--color-ink-400)]">
              {data.length === 0
                ? isPengusul
                  ? 'Belum ada permohonan. Klik "Ajukan Permohonan" untuk memulai.'
                  : 'Belum ada permohonan masuk.'
                : 'Tidak ada hasil pencarian.'}
            </div>
          ) : (
            filtered.map((row) => (
              <UtilitasCard
                key={row.id}
                row={row}
                selected={selectedId === row.id}
                isOwner={row.input_by === currentUserId}
                userRole={userRole}
                onSelect={() => setSelectedId(row.id)}
                onEdit={() => openEdit(row)}
                onDelete={() => handleDelete(row)}
                onMulaiPemeriksaan={() => handleMulaiPemeriksaan(row)}
                onReviewOK={(op) => handleReviewOK(row, op)}
                onOpenNote={(op) => setNoteTarget({ row, op })}
                onResubmit={() => handleResubmitRevisi(row)}
                onTolakFinal={() => handleTolakFinal(row)}
                onShowKronologis={() => setKronologisRow(row)}
              />
            ))
          )}
        </div>

        <div className="card-base p-5 h-fit lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] flex flex-col">
          <h3 className="text-[13px] font-semibold text-[var(--color-navy-900)] font-display flex items-center gap-2 flex-shrink-0">
            <Clock size={15} className="text-[var(--color-gold-500)]" />
            Timeline Transmital
          </h3>
          <div className="overflow-y-auto flex-1 mt-1 -mr-2 pr-2">
            {!selected ? (
              <p className="mt-4 text-sm text-[var(--color-ink-400)]">Pilih permohonan untuk melihat timeline.</p>
            ) : (
              <DetailedTimeline row={selected} transmital={selectedTransmital} />
            )}
          </div>
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        editing={editing}
        loading={loading}
        linkDed={linkDed}
        setLinkDed={setLinkDed}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <NoteModal
        target={noteTarget}
        onClose={() => setNoteTarget(null)}
        onSubmit={(c) => noteTarget && submitNote(noteTarget.row, noteTarget.op, c)}
      />

      <KronologisModal
        row={kronologisRow}
        transmital={kronologisRow ? transmital.filter((t) => t.utilitas_id === kronologisRow.id) : []}
        onClose={() => setKronologisRow(null)}
      />
    </div>
  )
}

function WorkflowLegend({ isPengusul }: { isPengusul: boolean }) {
  const steps = [
    { label: 'Diajukan', desc: 'Pengusul submit' },
    { label: 'Pemeriksaan', desc: 'Paralel Satker & Perencanaan' },
    { label: 'Revisi / Diterima', desc: 'OK keduanya → Diterima, catatan → Revisi' },
  ]
  return (
    <div className="card-base p-4 bg-gradient-to-br from-[var(--color-surface-50)] to-white">
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mb-3">
        Alur Kerja {isPengusul ? '(Anda sebagai Pengusul)' : '(Operator Review)'}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[var(--color-navy-900)] text-white text-[11px] flex items-center justify-center font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-[var(--color-navy-900)] text-[12.5px]">{s.label}</p>
                <p className="text-[10.5px] text-[var(--color-ink-500)]">{s.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && <span className="text-[var(--color-ink-400)]">→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DetailedTimeline({ row, transmital }: { row: UtilitasRow; transmital: TransmitalRow[] }) {
  // Ringkasan saja — detail lengkap ada di modal Kronologis
  const pemeriksaanStart = transmital.find((t) => t.tahapan === 'PEMERIKSAAN')?.waktu_masuk
  const SLA_HARI = 2
  const elapsedMs = pemeriksaanStart ? Date.now() - new Date(pemeriksaanStart).getTime() : 0
  const elapsedHari = Math.floor(elapsedMs / (1000 * 60 * 60 * 24))
  const slaExpired = row.status === 'PEMERIKSAAN' && elapsedHari >= SLA_HARI

  return (
    <div className="mt-4 space-y-3">
      {/* Status saat ini */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-semibold ${STATUS_STYLE[row.status]?.tone ?? 'bg-slate-100 text-slate-600'}`}>
          <span className={`w-2 h-2 rounded-full ${STATUS_STYLE[row.status]?.dot ?? 'bg-slate-400'}`} />
          {STATUS_STYLE[row.status]?.label ?? row.status}
        </span>
        {row.revisi_ke > 0 && (
          <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            Rev ke-{row.revisi_ke}
          </span>
        )}
      </div>

      {/* SLA Warning */}
      {slaExpired && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <p className="text-[11.5px] text-rose-700 font-medium">SLA terlampaui ({elapsedHari} hari)</p>
        </div>
      )}

      {/* Review status ringkas */}
      {row.status !== 'DIAJUKAN' && (
        <div className="space-y-2">
          <p className="text-[10.5px] font-semibold text-[var(--color-ink-500)] uppercase">Review Operator</p>
          <div className="grid grid-cols-1 gap-2">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              row.review_satker === 'OK' ? 'border-emerald-200 bg-emerald-50' :
              row.review_satker === 'CATATAN' ? 'border-orange-200 bg-orange-50' :
              'border-[var(--color-surface-200)] bg-[var(--color-surface-50)]'
            }`}>
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--color-navy-900)]">Satker</p>
                {row.review_satker_at && (
                  <p className="text-[10px] text-[var(--color-ink-400)]">{formatDate(row.review_satker_at)}</p>
                )}
              </div>
              <span className={`text-[11px] font-semibold ${
                row.review_satker === 'OK' ? 'text-emerald-700' :
                row.review_satker === 'CATATAN' ? 'text-orange-700' :
                'text-slate-500'
              }`}>
                {row.review_satker === 'OK' ? 'Disetujui' : row.review_satker === 'CATATAN' ? 'Catatan' : 'Menunggu'}
              </span>
            </div>
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
              row.review_perencanaan === 'OK' ? 'border-emerald-200 bg-emerald-50' :
              row.review_perencanaan === 'CATATAN' ? 'border-orange-200 bg-orange-50' :
              'border-[var(--color-surface-200)] bg-[var(--color-surface-50)]'
            }`}>
              <div>
                <p className="text-[11.5px] font-semibold text-[var(--color-navy-900)]">Perencanaan</p>
                {row.review_perencanaan_at && (
                  <p className="text-[10px] text-[var(--color-ink-400)]">{formatDate(row.review_perencanaan_at)}</p>
                )}
              </div>
              <span className={`text-[11px] font-semibold ${
                row.review_perencanaan === 'OK' ? 'text-emerald-700' :
                row.review_perencanaan === 'CATATAN' ? 'text-orange-700' :
                'text-slate-500'
              }`}>
                {row.review_perencanaan === 'OK' ? 'Disetujui' : row.review_perencanaan === 'CATATAN' ? 'Catatan' : 'Menunggu'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info ringkas */}
      {row.status === 'REVISI' && (
        <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          Menunggu perbaikan dari pengusul
        </p>
      )}
      {row.status === 'DITERIMA' && (
        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Permohonan telah diterima
        </p>
      )}
      {row.status === 'DITOLAK' && (
        <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Permohonan ditolak
        </p>
      )}

      <p className="text-[10px] text-[var(--color-ink-400)] italic">
        Klik tombol &quot;Kronologis&quot; pada usulan untuk melihat riwayat lengkap.
      </p>
    </div>
  )
}

function TimelineNode({
  dotColor,
  title,
  date,
  detail,
  catatan,
  hasLine,
  inactive,
}: {
  dotColor: string
  title: string
  date?: string | null
  detail?: string
  catatan?: string | null
  hasLine: boolean
  inactive?: boolean
}) {
  return (
    <div className="relative pl-6 pb-4 last:pb-0">
      <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${dotColor} ${!inactive ? 'ring-4 ring-current/10' : ''}`} />
      {hasLine && (
        <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-[var(--color-surface-200)]" />
      )}
      <p className={`text-[12.5px] font-semibold ${inactive ? 'text-[var(--color-ink-400)]' : 'text-[var(--color-navy-900)]'}`}>
        {title}
      </p>
      {date && (
        <p className="text-[11px] text-[var(--color-ink-500)]">{formatDate(date)}</p>
      )}
      {detail && (
        <p className="text-[11px] text-[var(--color-ink-500)] mt-0.5">{detail}</p>
      )}
      {catatan && (
        <p className="mt-1.5 text-[11px] text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
          <span className="font-semibold">Catatan:</span> {catatan}
        </p>
      )}
    </div>
  )
}

interface UtilitasCardProps {
  row: UtilitasRow
  selected: boolean
  isOwner: boolean
  userRole: string
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onMulaiPemeriksaan: () => void
  onReviewOK: (op: Operator) => void
  onOpenNote: (op: Operator) => void
  onResubmit: () => void
  onTolakFinal: () => void
  onShowKronologis: () => void
}

function UtilitasCard({
  row,
  selected,
  isOwner,
  userRole,
  onSelect,
  onEdit,
  onDelete,
  onMulaiPemeriksaan,
  onReviewOK,
  onOpenNote,
  onResubmit,
  onTolakFinal,
  onShowKronologis,
}: UtilitasCardProps) {
  const st = STATUS_STYLE[row.status] ?? STATUS_STYLE.DIAJUKAN
  const isAdmin = userRole === 'Admin'
  const isPengusul = userRole === 'Pengusul'
  const showStart = !isPengusul && row.status === 'DIAJUKAN'
  const inReview = row.status === 'PEMERIKSAAN'
  const showResubmit = isOwner && row.status === 'REVISI'
  const showFinalReject = isAdmin && ['DIAJUKAN', 'PEMERIKSAAN', 'REVISI'].includes(row.status)
  const canEdit = isAdmin || (isOwner && (row.status === 'DIAJUKAN' || row.status === 'REVISI'))
  const canDelete = isAdmin

  return (
    <div
      onClick={onSelect}
      className={`card-base card-accent p-5 cursor-pointer transition ${
        selected ? 'ring-2 ring-[var(--color-gold-500)]/40 border-[var(--color-gold-500)]' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--color-navy-900)] text-[15px] truncate">
              {row.jenis_pekerjaan}
            </h3>
            {row.revisi_ke > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Rev ke-{row.revisi_ke}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--color-ink-500)]">
            {row.instansi || 'Tanpa instansi'} · {row.lokasi || 'Tanpa lokasi'} · {formatDate(row.tgl_usul)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold ${st.tone}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>

      {safeHttpUrl(row.link_ded) && (
        <a
          href={safeHttpUrl(row.link_ded)!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] transition"
        >
          <FileText size={13} /> Lihat DED
        </a>
      )}

      {row.tracking_token && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            const url = `${window.location.origin}/track/${row.tracking_token}`
            navigator.clipboard?.writeText(url).catch(() => {})
            import('@/lib/toast').then((m) => m.showSuccess('Tautan tracking disalin', url))
          }}
          className="mt-3 ml-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] transition"
        >
          <Share2 size={13} /> Salin link tracking
        </button>
      )}

      {['PEMERIKSAAN', 'REVISI', 'DITERIMA', 'DITOLAK'].includes(row.status) && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ReviewPanel
            title="Operator Satker"
            subtitle="Cek kelengkapan administratif"
            reviewStatus={row.review_satker}
            catatan={row.review_satker_catatan}
            at={row.review_satker_at}
            canAct={canReviewAs(userRole, 'satker') && inReview && row.review_satker === 'PENDING'}
            onOK={(e) => {
              e.stopPropagation()
              onReviewOK('satker')
            }}
            onNote={(e) => {
              e.stopPropagation()
              onOpenNote('satker')
            }}
          />
          <ReviewPanel
            title="Operator Perencanaan"
            subtitle="Cek desain dan kesesuaian teknis"
            reviewStatus={row.review_perencanaan}
            catatan={row.review_perencanaan_catatan}
            at={row.review_perencanaan_at}
            canAct={canReviewAs(userRole, 'perencanaan') && inReview && row.review_perencanaan === 'PENDING'}
            onOK={(e) => {
              e.stopPropagation()
              onReviewOK('perencanaan')
            }}
            onNote={(e) => {
              e.stopPropagation()
              onOpenNote('perencanaan')
            }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {showStart && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMulaiPemeriksaan()
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] bg-[var(--color-navy-900)] text-white hover:bg-[var(--color-navy-800)] transition flex items-center gap-1.5"
          >
            <Send size={13} /> Mulai Pemeriksaan
          </button>
        )}
        {showResubmit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResubmit()
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] bg-[var(--color-gold-500)] text-white hover:bg-[var(--color-gold-600)] transition flex items-center gap-1.5"
          >
            <Send size={13} /> Kirim Ulang (Revisi)
          </button>
        )}
        {showFinalReject && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTolakFinal()
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] bg-rose-600 text-white hover:bg-rose-700 transition flex items-center gap-1.5"
          >
            <XCircle size={13} /> Tolak Final
          </button>
        )}
        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] border border-[var(--color-surface-200)] hover:bg-[var(--color-surface-100)] transition flex items-center gap-1.5 text-[var(--color-ink-700)]"
          >
            <Pencil size={13} /> Ubah
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onShowKronologis()
          }}
          className="px-3 py-1.5 rounded-lg text-[11.5px] border border-[var(--color-surface-200)] hover:bg-[var(--color-surface-100)] transition flex items-center gap-1.5 text-[var(--color-ink-700)]"
        >
          <Clock size={13} /> Kronologis
        </button>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="px-3 py-1.5 rounded-lg text-[11.5px] border border-[var(--color-surface-200)] hover:bg-rose-50 hover:border-rose-200 transition flex items-center gap-1.5 text-rose-600"
          >
            <Trash2 size={13} /> Hapus
          </button>
        )}
      </div>
    </div>
  )
}

interface ReviewPanelProps {
  title: string
  subtitle: string
  reviewStatus: 'PENDING' | 'OK' | 'CATATAN'
  catatan: string | null
  at: string | null
  canAct: boolean
  onOK: (e: React.MouseEvent) => void
  onNote: (e: React.MouseEvent) => void
}

function ReviewPanel({ title, subtitle, reviewStatus, catatan, at, canAct, onOK, onNote }: ReviewPanelProps) {
  const style = REVIEW_STYLE[reviewStatus]
  return (
    <div className="border border-[var(--color-surface-200)] rounded-xl p-3 bg-[var(--color-surface-50)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-[var(--color-navy-900)]">{title}</p>
          <p className="text-[10.5px] text-[var(--color-ink-500)]">{subtitle}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold ${style.tone}`}>
          {style.icon}
          {style.label}
        </span>
      </div>
      {catatan && reviewStatus === 'CATATAN' && (
        <p className="mt-2 text-[11.5px] text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
          {catatan}
        </p>
      )}
      {at && (
        <p className="mt-2 text-[10.5px] text-[var(--color-ink-400)]">Terakhir: {formatDate(at)}</p>
      )}
      {canAct && (
        <div className="mt-2.5 flex gap-1.5">
          <button
            onClick={onOK}
            className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1"
          >
            <CheckCircle2 size={12} /> OK
          </button>
          <button
            onClick={onNote}
            className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium bg-orange-500 text-white hover:bg-orange-600 transition flex items-center justify-center gap-1"
          >
            <AlertCircle size={12} /> Beri Catatan
          </button>
        </div>
      )}
    </div>
  )
}

interface FormModalProps {
  isOpen: boolean
  editing: UtilitasRow | null
  loading: boolean
  linkDed: string | null
  setLinkDed: (v: string | null) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

function FormModal({ isOpen, editing, loading, linkDed, setLinkDed, onClose, onSubmit }: FormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Ubah Permohonan Utilitas' : 'Ajukan Permohonan Utilitas'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={editing ? 'edit-tgl-usul' : 'add-tgl-usul'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Tanggal Usul <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id={editing ? 'edit-tgl-usul' : 'add-tgl-usul'}
              type="date"
              name="tgl_usul"
              defaultValue={editing?.tgl_usul?.slice(0, 10)}
              required
              aria-required="true"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)]"
            />
          </div>
          <div>
            <label
              htmlFor={editing ? 'edit-jenis-pekerjaan' : 'add-jenis-pekerjaan'}
              className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
            >
              Jenis Pekerjaan <span className="text-rose-600" aria-label="wajib diisi">*</span>
            </label>
            <input
              id={editing ? 'edit-jenis-pekerjaan' : 'add-jenis-pekerjaan'}
              type="text"
              name="jenis_pekerjaan"
              defaultValue={editing?.jenis_pekerjaan}
              required
              aria-required="true"
              placeholder="Pemasangan pipa, kabel, dll"
              className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)]"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={editing ? 'edit-instansi' : 'add-instansi'}
            className="block text-sm font-medium text-[var(--color-ink-700)] mb-1"
          >
            Instansi Pemohon
          </label>
          <input
            id={editing ? 'edit-instansi' : 'add-instansi'}
            type="text"
            name="instansi"
            defaultValue={editing?.instansi ?? ''}
            placeholder="Nama instansi pemohon"
            className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)]"
          />
        </div>
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
            placeholder="Lokasi pekerjaan"
            className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)]"
          />
        </div>
        <FileUpload
          label="Dokumen DED"
          value={linkDed}
          onChange={setLinkDed}
          helperText="Unggah file DED atau tempel tautan dokumen."
          id={editing ? 'edit-link-ded' : 'add-link-ded'}
          modul="utilitas"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="border border-[var(--color-surface-200)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition disabled:opacity-50 text-sm"
          >
            {loading ? 'Menyimpan...' : editing ? 'Perbarui' : 'Kirim'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function NoteModal({
  target,
  onClose,
  onSubmit,
}: {
  target: { row: UtilitasRow; op: Operator } | null
  onClose: () => void
  onSubmit: (catatan: string) => void
}) {
  const [catatan, setCatatan] = useState('')
  const label = target?.op === 'satker' ? 'Operator Satker' : 'Operator Perencanaan'

  function handle(e: React.FormEvent) {
    e.preventDefault()
    if (!catatan.trim()) {
      showError('Isi catatan tidak boleh kosong.')
      return
    }
    onSubmit(catatan.trim())
    setCatatan('')
  }

  return (
    <Modal
      isOpen={target !== null}
      onClose={() => {
        setCatatan('')
        onClose()
      }}
      title={`Catatan Review · ${label}`}
    >
      <form onSubmit={handle} className="space-y-4">
        <p id="note-catatan-hint" className="text-[12.5px] text-[var(--color-ink-500)]">
          Jelaskan hal yang perlu diperbaiki pengusul. Usulan akan otomatis kembali ke status <strong>Revisi</strong>.
        </p>
        <label htmlFor="note-catatan" className="sr-only">
          Catatan review
        </label>
        <textarea
          id="note-catatan"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={5}
          required
          aria-required="true"
          aria-describedby="note-catatan-hint"
          placeholder="Misalnya: lampiran SK belum ada, desain tidak sesuai spesifikasi..."
          className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)] resize-none"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setCatatan('')
              onClose()
            }}
            className="border border-[var(--color-surface-200)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition text-sm"
          >
            Kirim Catatan
          </button>
        </div>
      </form>
    </Modal>
  )
}

function KronologisModal({
  row,
  transmital,
  onClose,
}: {
  row: UtilitasRow | null
  transmital: TransmitalRow[]
  onClose: () => void
}) {
  if (!row) return null

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  // Beri keterangan otomatis untuk record tanpa catatan
  function getKeterangan(t: TransmitalRow): string {
    if (t.catatan) return t.catatan
    switch (t.tahapan) {
      case 'DIAJUKAN': return 'Usulan baru diajukan'
      case 'PEMERIKSAAN': return 'Pemeriksaan dimulai (review paralel)'
      case 'REVISI': return 'Status berubah ke revisi'
      case 'DITERIMA': return 'Permohonan diterima (kedua operator OK)'
      case 'DITOLAK': return 'Permohonan ditolak'
      default: return '-'
    }
  }

  return (
    <Modal
      isOpen={row !== null}
      onClose={onClose}
      title={`Kronologis Usulan`}
    >
      <div className="space-y-1.5 mb-4">
        <p className="text-[13px] font-semibold text-[var(--color-navy-900)]">{row.jenis_pekerjaan}</p>
        <p className="text-[12px] text-[var(--color-ink-500)]">
          {row.instansi || 'Tanpa instansi'} · {row.lokasi || 'Tanpa lokasi'}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${STATUS_STYLE[row.status]?.tone ?? ''}`}>
            {STATUS_STYLE[row.status]?.label ?? row.status}
          </span>
          {row.revisi_ke > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Revisi ke-{row.revisi_ke}
            </span>
          )}
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto -mr-2 pr-2 space-y-0">
        {/* Timeline format untuk kronologis */}
        <div className="relative pl-6 pb-3">
          <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-sky-500/10" />
          <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-[var(--color-surface-200)]" />
          <p className="text-[12px] font-semibold text-[var(--color-navy-900)]">Usulan Diajukan</p>
          <p className="text-[11px] text-[var(--color-ink-500)]">{formatDateTime(row.tgl_usul)}</p>
          <p className="text-[11px] text-[var(--color-ink-500)]">Pengusul mengajukan permohonan</p>
        </div>

        {transmital.map((t, idx) => {
          const isLast = idx === transmital.length - 1
          const keterangan = getKeterangan(t)
          const picName = t.profiles?.nama ?? null
          const dotColor = t.tahapan === 'PEMERIKSAAN' ? 'bg-amber-500 ring-amber-500/10'
            : t.tahapan === 'REVISI' ? 'bg-orange-500 ring-orange-500/10'
            : t.tahapan === 'DITERIMA' ? 'bg-emerald-500 ring-emerald-500/10'
            : t.tahapan === 'DITOLAK' ? 'bg-rose-500 ring-rose-500/10'
            : 'bg-slate-400 ring-slate-400/10'

          return (
            <div key={t.id} className="relative pl-6 pb-3">
              <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${dotColor} ring-4`} />
              {!isLast && (
                <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-[var(--color-surface-200)]" />
              )}
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  t.tahapan === 'PEMERIKSAAN' ? 'bg-amber-50 text-amber-700' :
                  t.tahapan === 'REVISI' ? 'bg-orange-50 text-orange-700' :
                  t.tahapan === 'DITERIMA' ? 'bg-emerald-50 text-emerald-700' :
                  t.tahapan === 'DITOLAK' ? 'bg-rose-50 text-rose-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {STATUS_STYLE[t.tahapan]?.label ?? t.tahapan}
                </span>
                {picName && (
                  <span className="text-[10.5px] text-[var(--color-ink-400)]">oleh {picName}</span>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-ink-500)] mt-0.5">{formatDateTime(t.waktu_masuk)}</p>
              <p className="text-[11.5px] text-[var(--color-ink-700)] mt-0.5">{keterangan}</p>
            </div>
          )
        })}

        {/* Status review terkini */}
        {row.status !== 'DIAJUKAN' && (
          <div className="border-t border-[var(--color-surface-200)] pt-3 mt-2">
            <p className="text-[10.5px] font-semibold text-[var(--color-ink-500)] uppercase mb-2">Status Review Terkini</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="border border-[var(--color-surface-200)] rounded-lg p-2">
                <p className="font-semibold text-[var(--color-navy-900)]">Satker</p>
                <p className={row.review_satker === 'OK' ? 'text-emerald-700' : row.review_satker === 'CATATAN' ? 'text-orange-700' : 'text-slate-500'}>
                  {row.review_satker === 'OK' ? 'Disetujui' : row.review_satker === 'CATATAN' ? 'Ada Catatan' : 'Menunggu'}
                </p>
                {row.review_satker_at && <p className="text-[var(--color-ink-400)] text-[10px]">{formatDateTime(row.review_satker_at)}</p>}
                {row.review_satker_catatan && <p className="text-orange-700 mt-1">{row.review_satker_catatan}</p>}
              </div>
              <div className="border border-[var(--color-surface-200)] rounded-lg p-2">
                <p className="font-semibold text-[var(--color-navy-900)]">Perencanaan</p>
                <p className={row.review_perencanaan === 'OK' ? 'text-emerald-700' : row.review_perencanaan === 'CATATAN' ? 'text-orange-700' : 'text-slate-500'}>
                  {row.review_perencanaan === 'OK' ? 'Disetujui' : row.review_perencanaan === 'CATATAN' ? 'Ada Catatan' : 'Menunggu'}
                </p>
                {row.review_perencanaan_at && <p className="text-[var(--color-ink-400)] text-[10px]">{formatDateTime(row.review_perencanaan_at)}</p>}
                {row.review_perencanaan_catatan && <p className="text-orange-700 mt-1">{row.review_perencanaan_catatan}</p>}
              </div>
            </div>
          </div>
        )}

        {transmital.length === 0 && (
          <p className="text-center text-[var(--color-ink-400)] text-sm py-6">
            Belum ada riwayat pemeriksaan.
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm bg-[var(--color-navy-900)] text-white hover:bg-[var(--color-navy-800)] transition"
        >
          Tutup
        </button>
      </div>
    </Modal>
  )
}
