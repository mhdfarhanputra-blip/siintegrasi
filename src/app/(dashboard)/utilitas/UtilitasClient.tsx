'use client'

import { useState, useMemo } from 'react'
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
import { showError, showSuccess, confirmAction } from '@/lib/toast'

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
  const [transmital] = useState(initialTransmital)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<UtilitasRow | null>(null)
  const [linkDed, setLinkDed] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialData[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [noteTarget, setNoteTarget] = useState<{ row: UtilitasRow; op: Operator } | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Realtime: auto-refresh saat ada perubahan di tabel utilitas
  useRealtime('utilitas')

  const isPengusul = userRole === 'Pengusul'
  const canCreate = userRole === 'Pengusul' || userRole === 'Admin'

  const filtered = data.filter((d) => {
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
    if (!confirmAction('Mulai proses pemeriksaan paralel Satker & Perencanaan?')) return
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
    if (!confirmAction(`Tandai review ${op === 'satker' ? 'Satker P2JN' : 'Perencanaan'} sebagai OK?`)) return
    const patch =
      op === 'satker'
        ? {
            review_satker: 'OK' as const,
            review_satker_catatan: null,
            review_satker_by: currentUserId,
            review_satker_at: new Date().toISOString(),
          }
        : {
            review_perencanaan: 'OK' as const,
            review_perencanaan_catatan: null,
            review_perencanaan_by: currentUserId,
            review_perencanaan_at: new Date().toISOString(),
          }
    try {
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
    const patch =
      op === 'satker'
        ? {
            review_satker: 'CATATAN' as const,
            review_satker_catatan: catatan,
            review_satker_by: currentUserId,
            review_satker_at: new Date().toISOString(),
          }
        : {
            review_perencanaan: 'CATATAN' as const,
            review_perencanaan_catatan: catatan,
            review_perencanaan_by: currentUserId,
            review_perencanaan_at: new Date().toISOString(),
          }
    try {
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
    if (!confirmAction('Kirim ulang permohonan setelah revisi? Pemeriksaan akan dimulai dari awal.')) return
    try {
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
    if (!confirmAction('Tolak permohonan secara final? Status akan menjadi DITOLAK.')) return
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
    if (!confirmAction('Hapus permohonan utilitas ini?')) return
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
              />
            ))
          )}
        </div>

        <div className="card-base p-5 h-fit lg:sticky lg:top-24">
          <h3 className="text-[13px] font-semibold text-[var(--color-navy-900)] font-display flex items-center gap-2">
            <Clock size={15} className="text-[var(--color-gold-500)]" />
            Timeline Transmital
          </h3>
          {!selected ? (
            <p className="mt-4 text-sm text-[var(--color-ink-400)]">Pilih permohonan untuk melihat timeline.</p>
          ) : selectedTransmital.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-ink-400)]">Belum ada tahapan transmital.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {selectedTransmital.map((t, idx) => (
                <div key={t.id} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-gold-500)] ring-4 ring-[var(--color-gold-500)]/15" />
                  {idx < selectedTransmital.length - 1 && (
                    <div className="absolute left-[5px] top-4 bottom-[-16px] w-0.5 bg-[var(--color-surface-200)]" />
                  )}
                  <p className="text-[13px] font-semibold text-[var(--color-navy-900)]">
                    {STATUS_STYLE[t.tahapan]?.label ?? t.tahapan}
                  </p>
                  <p className="text-[11.5px] text-[var(--color-ink-500)]">
                    {formatDate(t.waktu_masuk)}
                    {t.durasi_hari != null ? ` · ${t.durasi_hari} hari` : ''}
                  </p>
                  {t.catatan && (
                    <p className="mt-1 text-[11.5px] text-[var(--color-ink-700)] bg-[var(--color-surface-100)] border border-[var(--color-surface-200)] rounded-lg px-2.5 py-1.5">
                      {t.catatan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
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

      {row.link_ded && (
        <a
          href={row.link_ded}
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
            title="Operator 1 · Satker P2JN"
            subtitle="Cek kelengkapan administratif"
            reviewStatus={row.review_satker}
            catatan={row.review_satker_catatan}
            at={row.review_satker_at}
            canAct={canReviewAs(userRole, 'satker') && inReview}
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
            title="Operator 2 · Perencanaan"
            subtitle="Cek desain dan kesesuaian teknis"
            reviewStatus={row.review_perencanaan}
            catatan={row.review_perencanaan_catatan}
            at={row.review_perencanaan_at}
            canAct={canReviewAs(userRole, 'perencanaan') && inReview}
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
          helperText="Tempel tautan dokumen DED dari Google Drive kantor."
          id={editing ? 'edit-link-ded' : 'add-link-ded'}
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
  const label = target?.op === 'satker' ? 'Satker P2JN' : 'Perencanaan'

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
