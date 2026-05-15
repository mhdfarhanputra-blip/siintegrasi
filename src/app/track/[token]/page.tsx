import { createClient as createAdminClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { FileCheck2, Clock, CircleDot, AlertCircle, CheckCircle2, XCircle, Building2, MapPin, Calendar } from 'lucide-react'

interface UtilitasData {
  id: string
  tgl_usul: string
  instansi: string | null
  lokasi: string | null
  jenis_pekerjaan: string
  status: string
  revisi_ke: number
  review_satker: string
  review_satker_catatan: string | null
  review_perencanaan: string
  review_perencanaan_catatan: string | null
  created_at: string
}

interface TransmitalData {
  id: string
  tahapan: string
  waktu_masuk: string
  waktu_selesai: string | null
  durasi_hari: number | null
  catatan: string | null
}

const STATUS_STYLE: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  DIAJUKAN: { label: 'Diajukan', tone: 'bg-sky-100 text-sky-800', icon: <CircleDot size={16} /> },
  PEMERIKSAAN: { label: 'Pemeriksaan', tone: 'bg-amber-100 text-amber-800', icon: <Clock size={16} /> },
  REVISI: { label: 'Perlu Revisi', tone: 'bg-orange-100 text-orange-800', icon: <AlertCircle size={16} /> },
  DITERIMA: { label: 'Diterima', tone: 'bg-emerald-100 text-emerald-800', icon: <CheckCircle2 size={16} /> },
  DITOLAK: { label: 'Ditolak', tone: 'bg-rose-100 text-rose-800', icon: <XCircle size={16} /> },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

function publicClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = publicClient()

  const { data: utilitas } = await db.rpc('get_utilitas_by_token', { p_token: token })
  const item: UtilitasData | null = Array.isArray(utilitas) && utilitas.length ? utilitas[0] : null
  if (!item) notFound()

  const { data: timeline } = await db.rpc('get_transmital_by_token', { p_token: token })
  const steps = (timeline ?? []) as TransmitalData[]
  const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.DIAJUKAN

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-navy-900)] via-[var(--color-navy-800)] to-[var(--color-navy-950)] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6 text-white/90">
          <div className="w-11 h-11 bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-extrabold text-xs tracking-wider">P2JN</span>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-gold-300)]">Lacak Permohonan</p>
            <p className="text-[13px] font-semibold">Satker P2JN Bangka Belitung</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--color-surface-200)]">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-navy-900)] font-display">{item.jenis_pekerjaan}</h1>
                <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Building2 size={12} />{item.instansi || 'Tanpa instansi'}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} />{item.lokasi || 'Tanpa lokasi'}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(item.tgl_usul)}</span>
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold ${st.tone}`}>
                {st.icon} {st.label}{item.revisi_ke > 0 ? ` (Rev ${item.revisi_ke})` : ''}
              </span>
            </div>
          </div>

          <div className="p-6 grid sm:grid-cols-2 gap-3">
            <ReviewCard title="Operator Satker P2JN" status={item.review_satker} note={item.review_satker_catatan} />
            <ReviewCard title="Operator Perencanaan" status={item.review_perencanaan} note={item.review_perencanaan_catatan} />
          </div>

          <div className="p-6 border-t border-[var(--color-surface-200)] bg-[var(--color-surface-50)]">
            <h2 className="text-[13px] font-semibold text-[var(--color-navy-900)] font-display mb-4 flex items-center gap-2">
              <Clock size={14} className="text-[var(--color-gold-500)]" /> Timeline Permohonan
            </h2>
            {steps.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-500)]">Belum ada riwayat tahapan.</p>
            ) : (
              <ol className="space-y-3">
                {steps.map((s, idx) => (
                  <li key={s.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-gold-500)] ring-4 ring-[var(--color-gold-500)]/20" />
                    {idx < steps.length - 1 && (
                      <span className="absolute left-[5px] top-4 bottom-[-12px] w-0.5 bg-[var(--color-surface-200)]" />
                    )}
                    <p className="text-[13px] font-semibold text-[var(--color-navy-900)]">
                      {STATUS_STYLE[s.tahapan]?.label ?? s.tahapan}
                    </p>
                    <p className="text-[11.5px] text-[var(--color-ink-500)]">
                      {formatDate(s.waktu_masuk)}
                      {s.durasi_hari != null ? ` · ${s.durasi_hari} hari` : ''}
                    </p>
                    {s.catatan && (
                      <p className="mt-1 text-[11.5px] text-[var(--color-ink-700)] bg-white border border-[var(--color-surface-200)] rounded-lg px-2.5 py-1.5">
                        {s.catatan}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/50">
          Halaman ini bersifat read-only dan hanya dapat diakses melalui tautan tracking resmi.
        </p>
      </div>
    </div>
  )
}

function ReviewCard({ title, status, note }: { title: string; status: string; note: string | null }) {
  const tone =
    status === 'OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : status === 'CATATAN' ? 'bg-orange-50 border-orange-200 text-orange-800'
    : 'bg-slate-50 border-slate-200 text-slate-700'
  const label = status === 'OK' ? 'OK' : status === 'CATATAN' ? 'Ada Catatan' : 'Menunggu'
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-2">
        <FileCheck2 size={14} />
        <p className="text-[12px] font-semibold">{title}</p>
      </div>
      <p className="text-[11px] mt-1 uppercase tracking-wider font-semibold opacity-80">{label}</p>
      {note && <p className="text-[11.5px] mt-2 leading-relaxed">{note}</p>}
    </div>
  )
}
