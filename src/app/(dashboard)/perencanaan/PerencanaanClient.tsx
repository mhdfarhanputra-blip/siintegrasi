'use client'

import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { useRealtime } from '@/lib/useRealtime'

interface DipaRow {
  id: string
  revisi_ke: number
  link_dipa: string | null
  link_rkakl: string | null
  keterangan_revisi: string | null
  created_at: string
}

interface PaguRealisasiRow {
  kode_mak: string
  uraian: string | null
  pagu: number
  realisasi: number
  persentase: number
  jumlah_transaksi: number
  transaksi_terakhir: string | null
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

type TabKey = 'sp2d' | 'realisasi' | 'kronologi'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatRupiahShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  return formatRupiah(n)
}

function diffDays(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, 'https://placeholder.invalid')
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
    return null
  } catch {
    return null
  }
}

export default function PerencanaanClient({
  initialData,
  paguRealisasi,
  realisasiExcel,
}: {
  initialData: DipaRow[]
  paguRealisasi: PaguRealisasiRow[]
  realisasiExcel: RealisasiExcelRow[]
}) {
  useRealtime('dokumen_dipa')
  const [activeTab, setActiveTab] = useState<TabKey>('sp2d')

  const data = useMemo(() => [...initialData].sort((x, y) => x.revisi_ke - y.revisi_ke), [initialData])

  const excelSummary = useMemo(() => {
    const topLevel = realisasiExcel[0]
    const komponen = realisasiExcel.filter((r) => r.level === 'komponen')
    const kritisItems = realisasiExcel.filter((r) => r.persen >= 80 && r.level !== 'program' && r.level !== 'kegiatan')
    return { topLevel, komponen, kritisItems }
  }, [realisasiExcel])

  const total = data.length
  const rataInterval = useMemo(() => {
    if (data.length < 2) return null
    let sum = 0
    for (let i = 1; i < data.length; i += 1) {
      sum += diffDays(data[i].created_at, data[i - 1].created_at)
    }
    return Math.round(sum / (data.length - 1))
  }, [data])

  const totalPagu = excelSummary.topLevel?.pagu ?? 0
  const totalRealisasi = excelSummary.topLevel?.realisasi_sd ?? 0
  const overallPersen = excelSummary.topLevel?.persen ?? 0

  return (
    <div className="space-y-6 fade-in">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--color-gold-600)]">
          Dashboard Analisa
        </p>
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display mt-1">
          Perencanaan Anggaran
        </h2>
        <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1">
          Analisa realisasi SP2D, pagu anggaran, dan kronologi revisi DIPA & RKA-KL.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<BarChart3 size={16} />} label="Total Pagu" value={formatRupiahShort(totalPagu)} hint="Pagu revisi terbaru" accent="from-blue-500/15 to-blue-500/0 text-blue-600" />
        <Stat icon={<TrendingUp size={16} />} label="Realisasi s.d. Periode" value={`${overallPersen}%`} hint={formatRupiahShort(totalRealisasi)} accent="from-emerald-500/15 to-emerald-500/0 text-emerald-600" />
        <Stat icon={<Layers size={16} />} label="Sisa Anggaran" value={formatRupiahShort(excelSummary.topLevel?.sisa ?? 0)} hint={`${(100 - overallPersen).toFixed(1)}% belum terserap`} accent="from-amber-500/15 to-amber-500/0 text-amber-600" />
        <Stat icon={<Clock size={16} />} label="Revisi DIPA" value={String(total)} hint={rataInterval != null ? `Interval rata-rata ${rataInterval} hari` : 'Belum ada data'} accent="from-indigo-500/15 to-indigo-500/0 text-indigo-600" />
      </div>

      {excelSummary.kritisItems.length > 0 && (
        <div className="card-base p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-[13px] font-semibold text-amber-800">{excelSummary.kritisItems.length} komponen realisasi &ge; 80%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {excelSummary.kritisItems.slice(0, 5).map((item, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-medium truncate max-w-[200px]">
                {item.uraian.slice(0, 30)} ({item.persen}%)
              </span>
            ))}
            {excelSummary.kritisItems.length > 5 && (
              <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">+{excelSummary.kritisItems.length - 5} lainnya</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-[var(--color-surface-200)]">
        <TabButton active={activeTab === 'sp2d'} onClick={() => setActiveTab('sp2d')} label="Realisasi SP2D" />
        <TabButton active={activeTab === 'realisasi'} onClick={() => setActiveTab('realisasi')} label="Pagu vs Realisasi" />
        <TabButton active={activeTab === 'kronologi'} onClick={() => setActiveTab('kronologi')} label="Kronologi Revisi" />
      </div>

      {activeTab === 'sp2d' && <RealisasiSP2DTab data={realisasiExcel} />}
      {activeTab === 'realisasi' && <PaguRealisasiTable data={paguRealisasi} />}
      {activeTab === 'kronologi' && <KronologiRevisi data={data} />}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px cursor-pointer ${active ? 'border-[var(--color-gold-500)] text-[var(--color-navy-900)]' : 'border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-navy-900)]'}`}>
      {label}
    </button>
  )
}

function RealisasiSP2DTab({ data }: { data: RealisasiExcelRow[] }) {
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filterLevel !== 'all' && r.level !== filterLevel) return false
      if (search && !r.uraian.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [data, search, filterLevel])

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    data.forEach((r) => { counts[r.level] = (counts[r.level] ?? 0) + 1 })
    return counts
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari uraian..."
            className="w-full pl-9 pr-4 py-2 border border-[var(--color-surface-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
          />
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        >
          <option value="all">Semua Level ({data.length})</option>
          <option value="program">Program ({levelCounts['program'] ?? 0})</option>
          <option value="kegiatan">Kegiatan ({levelCounts['kegiatan'] ?? 0})</option>
          <option value="komponen">Komponen ({levelCounts['komponen'] ?? 0})</option>
          <option value="akun">Akun ({levelCounts['akun'] ?? 0})</option>
          <option value="item">Item ({levelCounts['item'] ?? 0})</option>
        </select>
        <p className="text-[11px] text-[var(--color-ink-500)]">{filtered.length} dari {data.length} baris</p>
      </div>

      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-surface-200)]">
          <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">Laporan Realisasi SP2D TA 2026</h3>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">Sumber: Laporan FA Detail (16 Segmen) — Periode Mei 2026</p>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)] sticky top-0 z-10">
              <tr className="text-[10.5px] uppercase tracking-wider text-[var(--color-ink-500)]">
                <th className="text-left px-4 py-3 font-semibold min-w-[250px]">Uraian</th>
                <th className="text-center px-2 py-3 font-semibold">Level</th>
                <th className="text-right px-4 py-3 font-semibold">Pagu</th>
                <th className="text-right px-4 py-3 font-semibold">Real. Lalu</th>
                <th className="text-right px-4 py-3 font-semibold">Real. Ini</th>
                <th className="text-right px-4 py-3 font-semibold">s.d. Periode</th>
                <th className="text-right px-3 py-3 font-semibold">%</th>
                <th className="text-right px-4 py-3 font-semibold">Sisa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-surface-100)]">
              {filtered.map((row, idx) => {
                const persen = row.persen
                const rowBg = row.level === 'program' ? 'bg-[var(--color-navy-50)]' : row.level === 'kegiatan' ? 'bg-[var(--color-surface-50)]' : ''
                const fontWeight = ['program', 'kegiatan'].includes(row.level) ? 'font-semibold' : ''
                return (
                  <tr key={idx} className={`hover:bg-[var(--color-surface-50)] transition-colors ${rowBg}`}>
                    <td className={`px-4 py-2.5 text-[12px] text-[var(--color-ink-900)] ${fontWeight}`}>
                      <span className={row.level === 'item' ? 'pl-4' : row.level === 'akun' ? 'pl-2' : ''}>
                        {row.uraian}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <LevelBadge level={row.level} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] font-medium tabular-nums">{formatRupiahShort(row.pagu)}</td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] tabular-nums text-[var(--color-ink-500)]">{row.realisasi_lalu > 0 ? formatRupiahShort(row.realisasi_lalu) : '-'}</td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] tabular-nums text-[var(--color-ink-500)]">{row.realisasi_ini > 0 ? formatRupiahShort(row.realisasi_ini) : '-'}</td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] font-medium tabular-nums">{row.realisasi_sd > 0 ? formatRupiahShort(row.realisasi_sd) : '-'}</td>
                    <td className={`px-3 py-2.5 text-right text-[11.5px] font-bold tabular-nums ${persen >= 90 ? 'text-rose-700' : persen >= 70 ? 'text-amber-700' : persen > 0 ? 'text-emerald-700' : 'text-[var(--color-ink-400)]'}`}>
                      {persen > 0 ? `${persen}%` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11.5px] tabular-nums text-[var(--color-ink-500)]">{row.sisa > 0 ? formatRupiahShort(row.sisa) : '-'}</td>
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

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    program: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    kegiatan: 'bg-blue-50 text-blue-700 border-blue-200',
    komponen: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    akun: 'bg-amber-50 text-amber-700 border-amber-200',
    item: 'bg-slate-50 text-slate-600 border-slate-200',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold uppercase border ${styles[level] ?? styles.item}`}>
      {level}
    </span>
  )
}

function PaguRealisasiTable({ data }: { data: PaguRealisasiRow[] }) {
  if (data.length === 0) {
    return (
      <div className="card-base p-10 text-center">
        <BarChart3 size={28} className="mx-auto text-[var(--color-ink-400)]" />
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">Belum ada data mata anggaran. Upload dokumen DIPA dan gunakan fitur AI Parse.</p>
      </div>
    )
  }
  return (
    <div className="card-base overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-surface-200)]">
        <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">Pagu vs Realisasi per MAK</h3>
        <p className="text-[11.5px] text-[var(--color-ink-500)]">Berdasarkan revisi DIPA terbaru dan transaksi keuangan.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
            <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-500)]">
              <th className="text-left px-4 py-3 font-semibold">Kode MAK</th>
              <th className="text-left px-4 py-3 font-semibold">Uraian</th>
              <th className="text-right px-4 py-3 font-semibold">Pagu</th>
              <th className="text-right px-4 py-3 font-semibold">Realisasi</th>
              <th className="text-right px-4 py-3 font-semibold">%</th>
              <th className="px-4 py-3 font-semibold">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-surface-200)]">
            {data.map((row) => {
              const persen = Number(row.persentase) || 0
              const barColor = persen >= 90 ? 'bg-rose-500' : persen >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <tr key={row.kode_mak} className="hover:bg-[var(--color-surface-50)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] font-medium text-[var(--color-navy-900)]">{row.kode_mak}</td>
                  <td className="px-4 py-3 text-[12px] text-[var(--color-ink-700)] max-w-[200px] truncate">{row.uraian || '-'}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-medium">{formatRupiah(row.pagu)}</td>
                  <td className="px-4 py-3 text-right text-[12px] font-medium">{formatRupiah(row.realisasi)}</td>
                  <td className={`px-4 py-3 text-right text-[12px] font-bold ${persen >= 90 ? 'text-rose-700' : persen >= 70 ? 'text-amber-700' : 'text-emerald-700'}`}>{persen.toFixed(1)}%</td>
                  <td className="px-4 py-3"><div className="w-24 h-2 bg-[var(--color-surface-200)] rounded-full overflow-hidden"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(persen, 100)}%` }} /></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KronologiRevisi({ data }: { data: DipaRow[] }) {
  if (data.length === 0) {
    return (
      <div className="card-base p-10 text-center">
        <FileText size={28} className="mx-auto text-[var(--color-ink-400)]" />
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">Belum ada data DIPA/RKA-KL yang diunggah.</p>
      </div>
    )
  }
  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">Kronologi Revisi</h3>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">Urut dari revisi paling awal ke terbaru.</p>
        </div>
        <Link href="/dipa" className="text-[12px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] flex items-center gap-1">
          Kelola DIPA <ArrowRight size={13} />
        </Link>
      </div>
      <ol className="space-y-3">
        {data.map((row, idx) => {
          const interval = idx > 0 ? diffDays(row.created_at, data[idx - 1].created_at) : null
          return (
            <li key={row.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-gold-500)] ring-4 ring-[var(--color-gold-500)]/20" />
              {idx < data.length - 1 && <span className="absolute left-[5px] top-4 bottom-[-12px] w-0.5 bg-[var(--color-surface-200)]" />}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-navy-900)]">Revisi {row.revisi_ke}</span>
                <span className="text-[11.5px] text-[var(--color-ink-500)]">{formatDate(row.created_at)}</span>
                {interval != null && <span className="text-[10.5px] text-[var(--color-gold-600)] bg-[var(--color-gold-500)]/10 px-1.5 py-0.5 rounded-md">+{interval} hari</span>}
              </div>
              <p className="text-[12px] text-[var(--color-ink-700)] mt-1">{row.keterangan_revisi || 'Tidak ada keterangan revisi.'}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {safeHref(row.link_dipa) && <a href={safeHref(row.link_dipa) as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"><Download size={12} /> DIPA</a>}
                {safeHref(row.link_rkakl) && <a href={safeHref(row.link_rkakl) as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"><Download size={12} /> RKA-KL</a>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Stat({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="card-base p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center`}>{icon}</div>
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mt-3">{label}</p>
      <p className="text-lg font-bold text-[var(--color-navy-900)] mt-0.5 font-display truncate">{value}</p>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)] mt-1 truncate">{hint}</p>}
    </div>
  )
}
