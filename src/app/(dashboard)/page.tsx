import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import Link from 'next/link'
import {
  Wallet,
  Package,
  Building2,
  Zap,
  ArrowUpRight,
  Calendar,
  TrendingUp,
  FileText,
  AlertTriangle,
} from 'lucide-react'

interface StatCard {
  label: string
  value: number
  href: string
  icon: React.ElementType
  accent: string
  hint: string
}

interface ActivityItem {
  type: 'keuangan' | 'utilitas' | 'bmn' | 'persediaan'
  title: string
  subtitle: string
  date: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

async function getMetrics() {
  const supabase = await createServerSupabase()
  const me = await getCurrentUser()

  const [
    keuanganCount,
    persediaanCount,
    bmnCount,
    utilitasOpen,
    keuanganSum,
    bmnSum,
    recentKeuangan,
    recentUtilitas,
    stokKritis,
    utilitasReview,
    pendaftarPending,
    mySubmissionPending,
  ] = await Promise.all([
    supabase.from('keuangan').select('id', { count: 'exact', head: true }),
    supabase.from('persediaan').select('id', { count: 'exact', head: true }),
    supabase.from('bmn').select('id', { count: 'exact', head: true }),
    supabase.from('utilitas').select('id', { count: 'exact', head: true }).in('status', ['DIAJUKAN','PEMERIKSAAN','REVISI']),
    supabase.from('keuangan').select('jenis_transaksi, nominal'),
    supabase.from('bmn').select('nilai_aset'),
    supabase
      .from('keuangan')
      .select('id, tanggal, jenis_transaksi, kategori, nominal')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('utilitas')
      .select('id, tgl_usul, status, jenis_pekerjaan, instansi')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('persediaan')
      .select('id, nama_barang, stok_saldo, stok_minimum')
      .not('stok_minimum', 'is', null)
      .gt('stok_minimum', 0),
    supabase
      .from('utilitas')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PEMERIKSAAN'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending'),
    me?.id
      ? supabase
          .from('utilitas')
          .select('id', { count: 'exact', head: true })
          .eq('input_by', me.id)
          .in('status', ['DIAJUKAN','PEMERIKSAAN','REVISI'])
      : Promise.resolve({ count: 0 }),
  ])

  type KeuanganRow = { jenis_transaksi: 'Debit' | 'Kredit'; nominal: number }
  type BmnSumRow = { nilai_aset: number }
  const transactions = (keuanganSum.data ?? []) as KeuanganRow[]
  const bmnRows = (bmnSum.data ?? []) as BmnSumRow[]

  const totalDebit = transactions
    .filter((r) => r.jenis_transaksi === 'Debit')
    .reduce((s, r) => s + (r.nominal ?? 0), 0)
  const totalKredit = transactions
    .filter((r) => r.jenis_transaksi === 'Kredit')
    .reduce((s, r) => s + (r.nominal ?? 0), 0)
  const totalBmnValue = bmnRows.reduce((s, r) => s + (r.nilai_aset ?? 0), 0)

  type StokRow = { id: string; nama_barang: string; stok_saldo: number; stok_minimum: number }
  const stokKritisList = ((stokKritis.data ?? []) as StokRow[]).filter(
    (s) => (s.stok_saldo ?? 0) <= (s.stok_minimum ?? 0),
  )

  return {
    me,
    totalKeuangan: keuanganCount.count ?? 0,
    totalPersediaan: persediaanCount.count ?? 0,
    totalBmn: bmnCount.count ?? 0,
    utilitasOpen: utilitasOpen.count ?? 0,
    totalDebit,
    totalKredit,
    saldo: totalDebit - totalKredit,
    totalBmnValue,
    recentKeuangan: recentKeuangan.data ?? [],
    recentUtilitas: recentUtilitas.data ?? [],
    stokKritisCount: stokKritisList.length,
    utilitasReviewCount: utilitasReview.count ?? 0,
    pendaftarPendingCount: pendaftarPending.count ?? 0,
    mySubmissionPendingCount: mySubmissionPending.count ?? 0,
  }
}

export default async function DashboardPage() {
  const m = await getMetrics()

  const stats: StatCard[] = [
    {
      label: 'Transaksi Keuangan',
      value: m.totalKeuangan,
      href: '/keuangan',
      icon: Wallet,
      accent: 'from-blue-500/15 to-blue-500/0 text-blue-600',
      hint: `Saldo ${formatRupiah(m.saldo)}`,
    },
    {
      label: 'Item Persediaan',
      value: m.totalPersediaan,
      href: '/persediaan',
      icon: Package,
      accent: 'from-emerald-500/15 to-emerald-500/0 text-emerald-600',
      hint: 'Total transaksi stok',
    },
    {
      label: 'Aset BMN',
      value: m.totalBmn,
      href: '/bmn',
      icon: Building2,
      accent: 'from-purple-500/15 to-purple-500/0 text-purple-600',
      hint: formatRupiah(m.totalBmnValue),
    },
    {
      label: 'Utilitas Aktif',
      value: m.utilitasOpen,
      href: '/utilitas',
      icon: Zap,
      accent: 'from-amber-500/15 to-amber-500/0 text-amber-600',
      hint: 'Permohonan status OPEN',
    },
  ]

  const activity: ActivityItem[] = [
    ...m.recentKeuangan.map((row) => ({
      type: 'keuangan' as const,
      title: `${row.jenis_transaksi} · ${row.kategori || 'Tanpa kategori'}`,
      subtitle: formatRupiah(row.nominal ?? 0),
      date: row.tanggal,
    })),
    ...m.recentUtilitas.map((row) => ({
      type: 'utilitas' as const,
      title: row.jenis_pekerjaan,
      subtitle: `${row.instansi || 'Tanpa instansi'} · ${row.status}`,
      date: row.tgl_usul,
    })),
  ]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 8)

  return (
    <div className="space-y-6 fade-in">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-navy-900)] via-[var(--color-navy-800)] to-[var(--color-navy-700)] text-white p-6 md:p-8">
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-[var(--color-gold-500)]/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-0 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-gold-300)] font-semibold">
              Satker P2JN Bangka Belitung
            </p>
            <h2 className="text-2xl md:text-3xl font-bold font-display mt-2">
              Selamat datang kembali di SI Terintegrasi
            </h2>
            <p className="text-white/70 text-sm mt-2 max-w-xl">
              Pantau seluruh operasional kantor dalam satu dashboard: keuangan, aset, utilitas, dan perencanaan anggaran.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/80 bg-white/10 backdrop-blur px-3 py-2 rounded-xl border border-white/10 self-start md:self-auto">
            <Calendar size={14} className="text-[var(--color-gold-300)]" />
            <span>
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </section>

      <AttentionWidget m={m} />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group card-base card-accent p-5 hover:shadow-md transition-shadow relative"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center`}
                >
                  <Icon size={18} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-[var(--color-ink-400)] opacity-0 group-hover:opacity-100 transition"
                />
              </div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mt-4">
                {s.label}
              </p>
              <p className="text-3xl font-bold text-[var(--color-navy-900)] mt-1 font-display tracking-tight">
                {s.value}
              </p>
              <p className="text-[11.5px] text-[var(--color-ink-500)] mt-2 flex items-center gap-1">
                <TrendingUp size={12} className="text-[var(--color-gold-500)]" />
                <span className="truncate">{s.hint}</span>
              </p>
            </Link>
          )
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">Aktivitas Terbaru</h3>
              <p className="text-[11.5px] text-[var(--color-ink-500)]">8 aktivitas terakhir di seluruh modul</p>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--color-ink-500)]">
              Belum ada aktivitas. Mulai input data di modul manapun.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-surface-200)]">
              {activity.map((a, i) => (
                <li key={i} className="py-3 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.type === 'keuangan'
                        ? 'bg-blue-50 text-blue-600'
                        : a.type === 'utilitas'
                        ? 'bg-amber-50 text-amber-600'
                        : a.type === 'bmn'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {a.type === 'keuangan' ? (
                      <Wallet size={15} />
                    ) : a.type === 'utilitas' ? (
                      <Zap size={15} />
                    ) : a.type === 'bmn' ? (
                      <Building2 size={15} />
                    ) : (
                      <Package size={15} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-navy-900)] truncate">{a.title}</p>
                    <p className="text-[11.5px] text-[var(--color-ink-500)] truncate">{a.subtitle}</p>
                  </div>
                  <span className="text-[11px] text-[var(--color-ink-400)] whitespace-nowrap">
                    {formatDate(a.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-base p-5 bg-gradient-to-br from-white to-[var(--color-surface-100)]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)]">
              Saldo Kas Bersih
            </p>
            <p className="text-2xl font-bold text-[var(--color-navy-900)] mt-1 font-display tracking-tight">
              {formatRupiah(m.saldo)}
            </p>
            <div className="mt-3 space-y-1.5 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-500)]">Total Debit</span>
                <span className="font-semibold text-emerald-700">{formatRupiah(m.totalDebit)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink-500)]">Total Kredit</span>
                <span className="font-semibold text-rose-700">{formatRupiah(m.totalKredit)}</span>
              </div>
            </div>
          </div>

          <div className="card-base p-5">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)]">
              Aksi Cepat
            </p>
            <div className="mt-3 space-y-2">
              <Link
                href="/keuangan"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm text-[var(--color-ink-700)]"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wallet size={15} />
                </div>
                Catat transaksi kas
              </Link>
              <Link
                href="/utilitas"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm text-[var(--color-ink-700)]"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Zap size={15} />
                </div>
                Ajukan permohonan utilitas
              </Link>
              <Link
                href="/dipa"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm text-[var(--color-ink-700)]"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText size={15} />
                </div>
                Upload revisi DIPA
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}


interface AttentionItem {
  label: string
  href: string
  tone: string
  icon: React.ReactNode
}

function buildAttentionList(
  role: string | undefined,
  m: Awaited<ReturnType<typeof getMetrics>>,
): AttentionItem[] {
  const items: AttentionItem[] = []
  if (role === 'Admin' && m.pendaftarPendingCount > 0) {
    items.push({
      label: `${m.pendaftarPendingCount} pendaftar menunggu persetujuan`,
      href: '/pengguna',
      tone: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertTriangle size={16} />,
    })
  }
  if ((role === 'Admin' || role === 'Teknis' || role === 'Perencanaan') && m.utilitasReviewCount > 0) {
    items.push({
      label: `${m.utilitasReviewCount} permohonan utilitas menunggu review`,
      href: '/utilitas',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Zap size={16} />,
    })
  }
  if ((role === 'Admin' || role === 'BMN' || role === 'Bendahara') && m.stokKritisCount > 0) {
    items.push({
      label: `${m.stokKritisCount} item stok mencapai batas minimum`,
      href: '/persediaan',
      tone: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: <Package size={16} />,
    })
  }
  if (role === 'Pengusul' && m.mySubmissionPendingCount > 0) {
    items.push({
      label: `${m.mySubmissionPendingCount} permohonan Anda masih diproses`,
      href: '/utilitas',
      tone: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: <FileText size={16} />,
    })
  }
  return items
}

function AttentionWidget({ m }: { m: Awaited<ReturnType<typeof getMetrics>> }) {
  const role = m.me?.role
  const items = buildAttentionList(role, m)
  if (items.length === 0) return null
  return (
    <section className="card-base p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-[var(--color-gold-500)]" />
        <h3 className="text-[13px] font-semibold text-[var(--color-navy-900)] font-display">
          Perhatian Anda hari ini
        </h3>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((it, i) => (
          <li key={i}>
            <Link
              href={it.href}
              className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition hover:shadow-sm ${it.tone}`}
            >
              <span className="flex items-center gap-2 text-[12.5px] font-medium">
                {it.icon} {it.label}
              </span>
              <ArrowUpRight size={14} className="opacity-60" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
