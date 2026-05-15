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

type TabKey = 'realisasi' | 'kronologi'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

function diffDays(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

function safeHref(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, 'https://placeholder.invalid')
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

export default function PerencanaanClient({
  initialData,
  paguRealisasi,
}: {
  initialData: DipaRow[]
  paguRealisasi: PaguRealisasiRow[]
}) {
  useRealtime('dokumen_dipa')
  const [activeTab, setActiveTab] = useState<TabKey>('realisasi')

  const data = useMemo(() => [...initialData].sort((x, y) => x.revisi_ke - y.revisi_ke), [initialData])

  const total = data.length
  const latest = data[data.length - 1]
  const first = data[0]
  const rataInterval = useMemo(() => {
    if (data.length < 2) return null
    let sum = 0
    for (let i = 1; i < data.length; i += 1) {
      sum += diffDays(data[i].created_at, data[i - 1].created_at)
    }
    return Math.round(sum / (data.length - 1))
  }, [data])

  const totalPagu = paguRealisasi.reduce((s, r) => s + r.pagu, 0)
  const totalRealisasi = paguRealisasi.reduce((s, r) => s + r.realisasi, 0)
  const overallPersen = totalPagu > 0 ? ((totalRealisasi / totalPagu) * 100).toFixed(1) : '0'
  const kritisItems = paguRealisasi.filter((r) => r.persentase >= 80)

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
          Analisa pagu, realisasi, dan kronologi revisi DIPA & RKA-KL.
        </p>
      </div>

      {total === 0 && paguRealisasi.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              icon={<Layers size={16} />}
              label="Total Revisi"
              value={String(total)}
              hint={`Revisi terakhir: ${latest?.revisi_ke ?? 0}`}
              accent="from-indigo-500/15 to-indigo-500/0 text-indigo-600"
            />
            <Stat
              icon={<BarChart3 size={16} />}
              label="Total Pagu"
              value={formatRupiah(totalPagu)}
              hint={`${paguRealisasi.length} mata anggaran`}
              accent="from-blue-500/15 to-blue-500/0 text-blue-600"
            />
            <Stat
              icon={<TrendingUp size={16} />}
              label="Realisasi"
              value={`${overallPersen}%`}
              hint={formatRupiah(totalRealisasi)}
              accent="from-emerald-500/15 to-emerald-500/0 text-emerald-600"
            />
            <Stat
              icon={<Clock size={16} />}
              label="Interval Revisi"
              value={rataInterval != null ? `${rataInterval} hari` : '-'}
              hint={first ? `DIPA awal: ${formatDate(first.created_at)}` : 'Belum ada data'}
              accent="from-amber-500/15 to-amber-500/0 text-amber-600"
            />
          </div>

          {kritisItems.length > 0 && (
            <div className="card-base p-4 border-l-4 border-l-amber-500 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <p className="text-[13px] font-semibold text-amber-800">
                  {kritisItems.length} mata anggaran realisasi &ge; 80%
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {kritisItems.slice(0, 5).map((item) => (
                  <span
                    key={item.kode_mak}
                    className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-medium"
                  >
                    {item.kode_mak} ({item.persentase}%)
                  </span>
                ))}
                {kritisItems.length > 5 && (
                  <span className="text-[11px] px-2 py-1 rounded-md bg-amber-100 text-amber-800">
                    +{kritisItems.length - 5} lainnya
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-1 border-b border-[var(--color-surface-200)]">
            <TabButton
              active={activeTab === 'realisasi'}
              onClick={() => setActiveTab('realisasi')}
              label="Pagu vs Realisasi"
            />
            <TabButton
              active={activeTab === 'kronologi'}
              onClick={() => setActiveTab('kronologi')}
              label="Kronologi Revisi"
            />
          </div>

          {activeTab === 'realisasi' && <PaguRealisasiTable data={paguRealisasi} />}
          {activeTab === 'kronologi' && <KronologiRevisi data={data} />}
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px cursor-pointer ${
        active
          ? 'border-[var(--color-gold-500)] text-[var(--color-navy-900)]'
          : 'border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-navy-900)]'
      }`}
    >
      {label}
    </button>
  )
}

function PaguRealisasiTable({ data }: { data: PaguRealisasiRow[] }) {
  if (data.length === 0) {
    return (
      <div className="card-base p-10 text-center">
        <BarChart3 size={28} className="mx-auto text-[var(--color-ink-400)]" />
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">
          Belum ada data mata anggaran. Upload dokumen DIPA dan gunakan fitur AI Parse untuk mengekstrak data.
        </p>
      </div>
    )
  }

  return (
    <div className="card-base overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-surface-200)] flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">
            Pagu vs Realisasi per MAK
          </h3>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">
            Berdasarkan revisi DIPA terbaru dan transaksi keuangan.
          </p>
        </div>
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
              const barColor =
                persen >= 90
                  ? 'bg-rose-500'
                  : persen >= 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              return (
                <tr key={row.kode_mak} className="hover:bg-[var(--color-surface-50)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[12px] font-medium text-[var(--color-navy-900)]">
                    {row.kode_mak}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--color-ink-700)] max-w-[200px] truncate">
                    {row.uraian || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-medium">
                    {formatRupiah(row.pagu)}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-medium">
                    {formatRupiah(row.realisasi)}
                  </td>
                  <td className={`px-4 py-3 text-right text-[12px] font-bold ${
                    persen >= 90 ? 'text-rose-700' : persen >= 70 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {persen.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-24 h-2 bg-[var(--color-surface-200)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(persen, 100)}%` }}
                      />
                    </div>
                  </td>
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
        <p className="mt-3 text-sm text-[var(--color-ink-500)]">
          Belum ada data DIPA/RKA-KL yang diunggah.
        </p>
      </div>
    )
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">
            Kronologi Revisi
          </h3>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">Urut dari revisi paling awal ke terbaru.</p>
        </div>
        <Link
          href="/dipa"
          className="text-[12px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] flex items-center gap-1"
        >
          Kelola DIPA <ArrowRight size={13} />
        </Link>
      </div>
      <ol className="space-y-3">
        {data.map((row, idx) => {
          const interval = idx > 0 ? diffDays(row.created_at, data[idx - 1].created_at) : null
          return (
            <li key={row.id} className="relative pl-6">
              <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-[var(--color-gold-500)] ring-4 ring-[var(--color-gold-500)]/20" />
              {idx < data.length - 1 && (
                <span className="absolute left-[5px] top-4 bottom-[-12px] w-0.5 bg-[var(--color-surface-200)]" />
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-navy-900)]">
                  Revisi {row.revisi_ke}
                </span>
                <span className="text-[11.5px] text-[var(--color-ink-500)]">
                  {formatDate(row.created_at)}
                </span>
                {interval != null && (
                  <span className="text-[10.5px] text-[var(--color-gold-600)] bg-[var(--color-gold-500)]/10 px-1.5 py-0.5 rounded-md">
                    +{interval} hari dari revisi sebelumnya
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[var(--color-ink-700)] mt-1">
                {row.keterangan_revisi || 'Tidak ada keterangan revisi.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {safeHref(row.link_dipa) && (
                  <a
                    href={safeHref(row.link_dipa) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"
                  >
                    <Download size={12} /> DIPA
                  </a>
                )}
                {safeHref(row.link_rkakl) && (
                  <a
                    href={safeHref(row.link_rkakl) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)]"
                  >
                    <Download size={12} /> RKA-KL
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  accent: string
}) {
  return (
    <div className="card-base p-4">
      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center`}>
        {icon}
      </div>
      <p className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mt-3">
        {label}
      </p>
      <p className="text-lg font-bold text-[var(--color-navy-900)] mt-0.5 font-display truncate">{value}</p>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)] mt-1 truncate">{hint}</p>}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card-base p-10 text-center">
      <FileText size={28} className="mx-auto text-[var(--color-ink-400)]" />
      <p className="mt-3 text-sm text-[var(--color-ink-500)]">
        Belum ada data DIPA/RKA-KL yang diunggah. Admin dapat mengunggah dokumen dari menu DIPA.
      </p>
    </div>
  )
}
