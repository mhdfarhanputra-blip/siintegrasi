'use client'

import { useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import {
  FileText,
  Download,
  TrendingUp,
  Layers,
  Clock,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  Search,
  Upload,
  Loader2,
} from 'lucide-react'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess } from '@/lib/toast'
import { safeHttpUrl } from '@/lib/safeUrl'

interface DipaRow {
  id: string
  revisi_ke: number
  tanggal_revisi: string | null
  link_dipa: string | null
  link_rkakl: string | null
  keterangan_revisi: string | null
  created_at: string
}

interface RealisasiExcelRow {
  uraian: string
  kode_akun: string | null
  level: string
  pagu: number
  realisasi_lalu: number
  realisasi_ini: number
  realisasi_sd: number
  persen: number
  sisa: number
}

type TabKey = 'dashboard' | 'detail' | 'kronologi'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const formatShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} Jt`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} Rb`
  return String(n)
}

function diffDays(a: string, b: string): number {
  return Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

export default function PerencanaanClient({
  initialData,
  realisasiExcel,
  userRole,
}: {
  initialData: DipaRow[]
  realisasiExcel: RealisasiExcelRow[]
  userRole?: string
}) {
  useRealtime('dokumen_dipa')
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [excelData, setExcelData] = useState(realisasiExcel)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const data = useMemo(() => [...initialData].sort((x, y) => x.revisi_ke - y.revisi_ke), [initialData])
  const isAdmin = userRole === 'Admin'

  const summary = useMemo(() => {
    const top = excelData[0]
    const komponen = excelData.filter((r) => r.level === 'komponen')
    const akun = excelData.filter((r) => r.level === 'akun')
    const kritis = excelData.filter((r) => r.persen >= 80 && !['program', 'kegiatan'].includes(r.level))
    const belumRealisasi = excelData.filter((r) => r.pagu > 0 && r.realisasi_sd === 0 && r.level === 'akun')
    return { top, komponen, akun, kritis, belumRealisasi }
  }, [excelData])

  const rataInterval = useMemo(() => {
    if (data.length < 2) return null
    let sum = 0
    for (let i = 1; i < data.length; i++) sum += diffDays(data[i].created_at, data[i - 1].created_at)
    return Math.round(sum / (data.length - 1))
  }, [data])

  async function handleUploadExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/realisasi/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses')
      showSuccess(json.message)
      // Reload data
      const dataRes = await fetch('/api/realisasi')
      if (dataRes.ok) {
        const d = await dataRes.json()
        setExcelData(d.data ?? [])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal upload', msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const totalPagu = summary.top?.pagu ?? 0
  const totalReal = summary.top?.realisasi_sd ?? 0
  const persen = summary.top?.persen ?? 0
  const sisa = summary.top?.sisa ?? 0

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--color-gold-600)]">Dashboard Analisa</p>
          <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display mt-1">Perencanaan Anggaran</h2>
          <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1">Analisa pagu, realisasi SP2D, dan kronologi revisi DIPA.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-gold-500)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-gold-600)] transition disabled:opacity-60"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Memproses...' : 'Update Data Excel'}
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BarChart3 size={16} />} label="Total Pagu" value={`Rp ${formatShort(totalPagu)}`} hint="Pagu revisi terbaru" accent="from-blue-500/15 to-blue-500/0 text-blue-600" />
        <StatCard icon={<TrendingUp size={16} />} label="Realisasi" value={`${persen}%`} hint={`Rp ${formatShort(totalReal)}`} accent="from-emerald-500/15 to-emerald-500/0 text-emerald-600" />
        <StatCard icon={<Layers size={16} />} label="Sisa Anggaran" value={`Rp ${formatShort(sisa)}`} hint={`${(100 - persen).toFixed(1)}% belum terserap`} accent="from-amber-500/15 to-amber-500/0 text-amber-600" />
        <StatCard icon={<Clock size={16} />} label="Revisi DIPA" value={String(data.length)} hint={rataInterval ? `Rata-rata ${rataInterval} hari` : 'Belum ada data'} accent="from-indigo-500/15 to-indigo-500/0 text-indigo-600" />
      </div>

      {/* Alert kritis */}
      {summary.kritis.length > 0 && (
        <div className="card-base p-4 border-l-4 border-l-rose-500 bg-rose-50/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <p className="text-[13px] font-semibold text-rose-800">{summary.kritis.length} komponen realisasi mendekati/melebihi pagu (&ge;80%)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.kritis.slice(0, 4).map((item, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-rose-100 text-rose-800 font-medium truncate max-w-[220px]">
                {item.uraian.slice(0, 35)} — {item.persen}%
              </span>
            ))}
            {summary.kritis.length > 4 && <span className="text-[11px] px-2 py-1 rounded-md bg-rose-100 text-rose-700">+{summary.kritis.length - 4} lainnya</span>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-surface-200)]">
        <TabBtn active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="Ringkasan" />
        <TabBtn active={activeTab === 'detail'} onClick={() => setActiveTab('detail')} label="Detail Realisasi" />
        <TabBtn active={activeTab === 'kronologi'} onClick={() => setActiveTab('kronologi')} label="Kronologi Revisi" />
      </div>

      {activeTab === 'dashboard' && <DashboardTab summary={summary} />}
      {activeTab === 'detail' && <DetailTab data={excelData} />}
      {activeTab === 'kronologi' && <KronologiTab data={data} />}
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px cursor-pointer transition ${active ? 'border-[var(--color-gold-500)] text-[var(--color-navy-900)]' : 'border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-navy-900)]'}`}>
      {label}
    </button>
  )
}

function StatCard({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="card-base p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center`}>{icon}</div>
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mt-3">{label}</p>
      <p className="text-lg font-bold text-[var(--color-navy-900)] mt-0.5 font-display truncate">{value}</p>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)] mt-1 truncate">{hint}</p>}
    </div>
  )
}

function DashboardTab({ summary }: { summary: { komponen: RealisasiExcelRow[]; akun: RealisasiExcelRow[]; belumRealisasi: RealisasiExcelRow[] } }) {
  const topKomponen = useMemo(() =>
    [...summary.komponen].sort((a, b) => b.realisasi_sd - a.realisasi_sd).slice(0, 10),
  [summary.komponen])

  const lowAbsorption = useMemo(() =>
    summary.komponen.filter((r) => r.pagu > 0 && r.persen < 20 && r.persen >= 0).sort((a, b) => a.persen - b.persen).slice(0, 5),
  [summary.komponen])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Top Realisasi */}
      <div className="card-base p-5">
        <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display mb-3">Top 10 Komponen Realisasi Tertinggi</h3>
        <div className="space-y-3">
          {topKomponen.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[var(--color-surface-100)] text-[10px] font-bold text-[var(--color-ink-500)] flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[var(--color-ink-700)] truncate">{r.uraian}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-[var(--color-surface-200)] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${r.persen >= 90 ? 'bg-rose-500' : r.persen >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(r.persen, 100)}%` }} />
                  </div>
                  <span className="text-[10.5px] font-bold text-[var(--color-ink-700)] w-10 text-right">{r.persen}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Absorption */}
      <div className="card-base p-5">
        <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display mb-3">Komponen Serapan Rendah (&lt;20%)</h3>
        {lowAbsorption.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-400)] py-4 text-center">Semua komponen sudah terserap &ge;20%</p>
        ) : (
          <div className="space-y-3">
            {lowAbsorption.map((r, i) => (
              <div key={i} className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <p className="text-[12px] font-medium text-[var(--color-ink-700)] truncate">{r.uraian}</p>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-[var(--color-ink-500)]">Pagu: Rp {formatShort(r.pagu)}</span>
                  <span className="font-bold text-amber-700">{r.persen}% terserap</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Belum realisasi */}
        {summary.belumRealisasi.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--color-surface-200)]">
            <p className="text-[12px] font-semibold text-rose-700 mb-2">{summary.belumRealisasi.length} akun belum ada realisasi sama sekali</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {summary.belumRealisasi.slice(0, 8).map((r, i) => (
                <p key={i} className="text-[11px] text-[var(--color-ink-500)] truncate">• {r.uraian} (Rp {formatShort(r.pagu)})</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Distribusi per level */}
      <div className="card-base p-5 lg:col-span-2">
        <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display mb-3">Distribusi Pagu per Komponen Utama</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.komponen.slice(0, 9).map((r, i) => {
            const persen = r.persen
            return (
              <div key={i} className="p-3 rounded-xl border border-[var(--color-surface-200)] hover:shadow-sm transition">
                <p className="text-[11.5px] font-medium text-[var(--color-navy-900)] truncate">{r.uraian}</p>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] text-[var(--color-ink-400)]">Pagu</p>
                    <p className="text-[13px] font-bold text-[var(--color-navy-900)]">Rp {formatShort(r.pagu)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-[var(--color-ink-400)]">Realisasi</p>
                    <p className={`text-[13px] font-bold ${persen >= 80 ? 'text-rose-700' : persen >= 50 ? 'text-amber-700' : 'text-emerald-700'}`}>{persen}%</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-[var(--color-surface-200)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${persen >= 80 ? 'bg-rose-500' : persen >= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(persen, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DetailTab({ data }: { data: RealisasiExcelRow[] }) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')

  const filtered = useMemo(() => data.filter((r) => {
    if (filterLevel !== 'all' && r.level !== filterLevel) return false
    if (search && !r.uraian.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [data, search, filterLevel])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari uraian..." className="w-full pl-9 pr-4 py-2 border border-[var(--color-surface-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50" />
        </div>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm">
          <option value="all">Semua ({data.length})</option>
          <option value="komponen">Komponen</option>
          <option value="akun">Akun</option>
          <option value="item">Item</option>
        </select>
        <span className="text-[11px] text-[var(--color-ink-500)]">{filtered.length} baris</span>
      </div>
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)] sticky top-0 z-10">
              <tr className="text-[10.5px] uppercase tracking-wider text-[var(--color-ink-500)]">
                <th className="text-left px-4 py-3 font-semibold min-w-[220px]">Uraian</th>
                <th className="text-right px-3 py-3 font-semibold">Pagu</th>
                <th className="text-right px-3 py-3 font-semibold">Real. s.d. Periode</th>
                <th className="text-right px-3 py-3 font-semibold">%</th>
                <th className="text-right px-3 py-3 font-semibold">Sisa</th>
                <th className="px-3 py-3 font-semibold w-28">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-surface-100)]">
              {filtered.map((row, idx) => {
                const bg = ['program', 'kegiatan'].includes(row.level) ? 'bg-[var(--color-surface-50)]' : ''
                const fw = ['program', 'kegiatan'].includes(row.level) ? 'font-semibold' : ''
                const indent = row.level === 'item' ? 'pl-6' : row.level === 'akun' ? 'pl-4' : ''
                return (
                  <tr key={idx} className={`hover:bg-[var(--color-surface-50)] ${bg}`}>
                    <td className={`px-4 py-2.5 text-[12px] text-[var(--color-ink-900)] ${fw} ${indent}`}>{row.uraian}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] font-medium tabular-nums">Rp {formatShort(row.pagu)}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] tabular-nums">{row.realisasi_sd > 0 ? `Rp ${formatShort(row.realisasi_sd)}` : '-'}</td>
                    <td className={`px-3 py-2.5 text-right text-[11.5px] font-bold ${row.persen >= 90 ? 'text-rose-700' : row.persen >= 70 ? 'text-amber-700' : row.persen > 0 ? 'text-emerald-700' : 'text-[var(--color-ink-400)]'}`}>{row.persen > 0 ? `${row.persen}%` : '-'}</td>
                    <td className="px-3 py-2.5 text-right text-[11.5px] tabular-nums text-[var(--color-ink-500)]">{row.sisa > 0 ? `Rp ${formatShort(row.sisa)}` : '-'}</td>
                    <td className="px-3 py-2.5"><div className="w-full h-1.5 bg-[var(--color-surface-200)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.persen >= 90 ? 'bg-rose-500' : row.persen >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(row.persen, 100)}%` }} /></div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KronologiTab({ data }: { data: DipaRow[] }) {
  if (data.length === 0) return <div className="card-base p-10 text-center"><FileText size={28} className="mx-auto text-[var(--color-ink-400)]" /><p className="mt-3 text-sm text-[var(--color-ink-500)]">Belum ada data revisi DIPA.</p></div>
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">Kronologi Revisi DIPA</h3>
        <Link href="/dipa" className="text-[12px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] flex items-center gap-1">Kelola <ArrowRight size={13} /></Link>
      </div>
      <ol className="space-y-3">
        {data.map((row, idx) => {
          const dateA = row.tanggal_revisi || row.created_at
          const dateB = idx > 0 ? (data[idx - 1].tanggal_revisi || data[idx - 1].created_at) : null
          const interval = idx > 0 && dateB ? diffDays(dateA, dateB) : null
          return (
            <li key={row.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-gold-500)] ring-4 ring-[var(--color-gold-500)]/20" />
              {idx < data.length - 1 && <span className="absolute left-[5px] top-4 bottom-[-12px] w-0.5 bg-[var(--color-surface-200)]" />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-navy-900)]">Revisi {row.revisi_ke}</span>
                <span className="text-[11.5px] text-[var(--color-ink-500)]">{formatDate(row.tanggal_revisi || row.created_at)}</span>
                {interval != null && <span className="text-[10.5px] text-[var(--color-gold-600)] bg-[var(--color-gold-500)]/10 px-1.5 py-0.5 rounded-md">+{interval} hari</span>}
              </div>
              <p className="text-[12px] text-[var(--color-ink-700)] mt-1">{row.keterangan_revisi || 'Tidak ada keterangan.'}</p>
              <div className="mt-2 flex gap-3">
                {safeHttpUrl(row.link_dipa) && <a href={safeHttpUrl(row.link_dipa)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"><Download size={12} /> DIPA</a>}
                {safeHttpUrl(row.link_rkakl) && <a href={safeHttpUrl(row.link_rkakl)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"><Download size={12} /> RKA-KL</a>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
