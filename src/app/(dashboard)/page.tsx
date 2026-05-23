import { createServerSupabase } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/getCurrentUser'
import Link from 'next/link'
import {
  Wallet, Package, Building2, Zap, ArrowUpRight, Calendar,
  TrendingUp, FileText, AlertTriangle, BarChart3,
} from 'lucide-react'
import { PaguRealisasiDonut, KeuanganBar } from '@/components/DashboardChart'
import realisasiRaw from '@/lib/realisasi-data.json'

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
const formatShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  return formatRupiah(n)
}
const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

async function getMetrics() {
  const supabase = await createServerSupabase()
  const me = await getCurrentUser()
  const [kC, pC, bC, uO, kS, bS, rK, rU, sK, uR, pP, mS, bKondisi, uStatus] = await Promise.all([
    supabase.from('keuangan').select('id', { count: 'exact', head: true }),
    supabase.from('persediaan').select('id', { count: 'exact', head: true }),
    supabase.from('bmn').select('id', { count: 'exact', head: true }),
    supabase.from('utilitas').select('id', { count: 'exact', head: true }).in('status', ['DIAJUKAN','PEMERIKSAAN','REVISI']),
    supabase.from('keuangan').select('jenis_transaksi, nominal'),
    supabase.from('bmn').select('nilai_aset'),
    supabase.from('keuangan').select('id, tanggal, jenis_transaksi, kategori, nominal').order('created_at', { ascending: false }).limit(6),
    supabase.from('utilitas').select('id, tgl_usul, status, jenis_pekerjaan, instansi').order('created_at', { ascending: false }).limit(4),
    supabase.from('persediaan').select('id, nama_barang, stok_saldo, stok_minimum').not('stok_minimum', 'is', null).gt('stok_minimum', 0),
    supabase.from('utilitas').select('id', { count: 'exact', head: true }).eq('status', 'PEMERIKSAAN'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
    me?.id ? supabase.from('utilitas').select('id', { count: 'exact', head: true }).eq('input_by', me.id).in('status', ['DIAJUKAN','PEMERIKSAAN','REVISI']) : Promise.resolve({ count: 0 }),
    supabase.from('bmn').select('kondisi, nilai_aset'),
    supabase.from('utilitas').select('status'),
  ])
  type KR = { jenis_transaksi: 'Debit' | 'Kredit'; nominal: number }
  const txs = (kS.data ?? []) as KR[]
  const totalDebit = txs.filter(r => r.jenis_transaksi === 'Debit').reduce((s, r) => s + (r.nominal ?? 0), 0)
  const totalKredit = txs.filter(r => r.jenis_transaksi === 'Kredit').reduce((s, r) => s + (r.nominal ?? 0), 0)
  const totalBmn = ((bS.data ?? []) as { nilai_aset: number }[]).reduce((s, r) => s + (r.nilai_aset ?? 0), 0)
  const stokKritisCount = ((sK.data ?? []) as { stok_saldo: number; stok_minimum: number }[]).filter(s => (s.stok_saldo ?? 0) <= (s.stok_minimum ?? 0)).length
  const realTop = realisasiRaw[0] as { pagu: number; realisasi_sd: number; sisa: number; persen: number }

  // BMN per kondisi
  type BmnKondisi = { kondisi: string; nilai_aset: number }
  const bmnRows = (bKondisi.data ?? []) as BmnKondisi[]
  const bmnPerKondisi = { baik: 0, rusakRingan: 0, rusakBerat: 0, baikNilai: 0, rusakRinganNilai: 0, rusakBeratNilai: 0 }
  bmnRows.forEach((r) => {
    const nilai = r.nilai_aset ?? 0
    if (r.kondisi === 'Baik') { bmnPerKondisi.baik++; bmnPerKondisi.baikNilai += nilai }
    else if (r.kondisi === 'Rusak Ringan') { bmnPerKondisi.rusakRingan++; bmnPerKondisi.rusakRinganNilai += nilai }
    else if (r.kondisi === 'Rusak Berat') { bmnPerKondisi.rusakBerat++; bmnPerKondisi.rusakBeratNilai += nilai }
  })

  // Utilitas per status
  type UStatus = { status: string }
  const utilitasRows = (uStatus.data ?? []) as UStatus[]
  const utilitasPerStatus = { diajukan: 0, pemeriksaan: 0, revisi: 0, diterima: 0, ditolak: 0 }
  utilitasRows.forEach((r) => {
    if (r.status === 'DIAJUKAN') utilitasPerStatus.diajukan++
    else if (r.status === 'PEMERIKSAAN') utilitasPerStatus.pemeriksaan++
    else if (r.status === 'REVISI') utilitasPerStatus.revisi++
    else if (r.status === 'DITERIMA') utilitasPerStatus.diterima++
    else if (r.status === 'DITOLAK') utilitasPerStatus.ditolak++
  })

  return {
    me, totalKeuangan: kC.count ?? 0, totalPersediaan: pC.count ?? 0, totalBmn: bC.count ?? 0,
    utilitasOpen: uO.count ?? 0, totalDebit, totalKredit, saldo: totalDebit - totalKredit, totalBmnValue: totalBmn,
    recentKeuangan: rK.data ?? [], recentUtilitas: rU.data ?? [],
    stokKritisCount, utilitasReviewCount: uR.count ?? 0,
    pendaftarPendingCount: pP.count ?? 0, mySubmissionPendingCount: mS.count ?? 0,
    pagu: realTop?.pagu ?? 0, realisasi: realTop?.realisasi_sd ?? 0, sisaAnggaran: realTop?.sisa ?? 0, persenRealisasi: realTop?.persen ?? 0,
    bmnPerKondisi, utilitasPerStatus,
  }
}

export default async function DashboardPage() {
  const m = await getMetrics()
  return (
    <div className="space-y-5 fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-navy-900)] via-[var(--color-navy-800)] to-[var(--color-navy-700)] text-white p-5 md:p-7">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-[var(--color-gold-500)]/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold-300)] font-semibold">Dashboard</p>
            <h2 className="text-xl md:text-2xl font-bold font-display mt-1">Selamat datang, {m.me?.nama?.split(' ')[0] ?? 'Pengguna'}</h2>
            <p className="text-white/60 text-[12.5px] mt-1 max-w-md">Ringkasan operasional TA {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/70 bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 self-start sm:self-auto">
            <Calendar size={13} className="text-[var(--color-gold-300)]" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </section>

      {/* Attention */}
      <AttentionWidget m={m} />

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={Wallet} label="Transaksi" value={m.totalKeuangan} hint={`Saldo ${formatShort(m.saldo)}`} href="/keuangan" accent="from-blue-500/15 to-blue-500/0 text-blue-600" />
        <StatCard icon={Package} label="Persediaan" value={m.totalPersediaan} hint="Total transaksi stok" href="/persediaan" accent="from-emerald-500/15 to-emerald-500/0 text-emerald-600" />
        <StatCard icon={Building2} label="Aset BMN" value={m.totalBmn} hint={formatShort(m.totalBmnValue)} href="/bmn" accent="from-purple-500/15 to-purple-500/0 text-purple-600" />
        <StatCard icon={Zap} label="Utilitas Aktif" value={m.utilitasOpen} hint="Permohonan berjalan" href="/utilitas" accent="from-amber-500/15 to-amber-500/0 text-amber-600" />
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display">Pagu vs Realisasi</h3>
              <p className="text-[11px] text-[var(--color-ink-500)]">Serapan anggaran TA {new Date().getFullYear()}</p>
            </div>
            <Link href="/perencanaan" className="text-[11px] text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium flex items-center gap-1">Detail <ArrowUpRight size={12} /></Link>
          </div>
          <PaguRealisasiDonut pagu={m.pagu} realisasi={m.realisasi} sisa={m.sisaAnggaran} />
          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-2.5 rounded-lg bg-[var(--color-surface-50)]">
              <p className="text-[var(--color-ink-400)]">Total Pagu</p>
              <p className="font-bold text-[var(--color-navy-900)] text-[13px] mt-0.5">{formatShort(m.pagu)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--color-surface-50)]">
              <p className="text-[var(--color-ink-400)]">Realisasi</p>
              <p className="font-bold text-emerald-700 text-[13px] mt-0.5">{formatShort(m.realisasi)}</p>
            </div>
          </div>
        </div>

        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display">Arus Kas</h3>
              <p className="text-[11px] text-[var(--color-ink-500)]">Perbandingan debit & kredit</p>
            </div>
            <Link href="/keuangan" className="text-[11px] text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium flex items-center gap-1">Detail <ArrowUpRight size={12} /></Link>
          </div>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-400)] font-semibold">Saldo Bersih</p>
              <p className="text-2xl font-bold text-[var(--color-navy-900)] font-display mt-1">{formatShort(m.saldo)}</p>
            </div>
            <KeuanganBar debit={m.totalDebit} kredit={m.totalKredit} />
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg bg-emerald-50">
                <p className="text-emerald-600">Total Debit</p>
                <p className="font-bold text-emerald-800 text-[13px] mt-0.5">{formatShort(m.totalDebit)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50">
                <p className="text-rose-600">Total Kredit</p>
                <p className="font-bold text-rose-800 text-[13px] mt-0.5">{formatShort(m.totalKredit)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BMN & Utilitas Analytics */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BMN per Kondisi */}
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display">Kondisi Aset BMN</h3>
              <p className="text-[11px] text-[var(--color-ink-500)]">{m.bmnPerKondisi.baik + m.bmnPerKondisi.rusakRingan + m.bmnPerKondisi.rusakBerat} aset tercatat</p>
            </div>
            <Link href="/bmn" className="text-[11px] text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium flex items-center gap-1">Detail <ArrowUpRight size={12} /></Link>
          </div>
          <div className="space-y-3">
            <ConditionBar label="Baik" count={m.bmnPerKondisi.baik} total={m.bmnPerKondisi.baik + m.bmnPerKondisi.rusakRingan + m.bmnPerKondisi.rusakBerat} value={m.bmnPerKondisi.baikNilai} color="bg-emerald-500" />
            <ConditionBar label="Rusak Ringan" count={m.bmnPerKondisi.rusakRingan} total={m.bmnPerKondisi.baik + m.bmnPerKondisi.rusakRingan + m.bmnPerKondisi.rusakBerat} value={m.bmnPerKondisi.rusakRinganNilai} color="bg-amber-500" />
            <ConditionBar label="Rusak Berat" count={m.bmnPerKondisi.rusakBerat} total={m.bmnPerKondisi.baik + m.bmnPerKondisi.rusakRingan + m.bmnPerKondisi.rusakBerat} value={m.bmnPerKondisi.rusakBeratNilai} color="bg-rose-500" />
          </div>
        </div>

        {/* Utilitas per Status */}
        <div className="card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display">Status Utilitas</h3>
              <p className="text-[11px] text-[var(--color-ink-500)]">Distribusi permohonan</p>
            </div>
            <Link href="/utilitas" className="text-[11px] text-[var(--color-gold-600)] hover:text-[var(--color-gold-700)] font-medium flex items-center gap-1">Detail <ArrowUpRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            <StatusRow label="Diajukan" count={m.utilitasPerStatus.diajukan} color="bg-sky-500" />
            <StatusRow label="Pemeriksaan" count={m.utilitasPerStatus.pemeriksaan} color="bg-amber-500" />
            <StatusRow label="Revisi" count={m.utilitasPerStatus.revisi} color="bg-orange-500" />
            <StatusRow label="Diterima" count={m.utilitasPerStatus.diterima} color="bg-emerald-500" />
            <StatusRow label="Ditolak" count={m.utilitasPerStatus.ditolak} color="bg-rose-500" />
          </div>
        </div>
      </section>

      {/* Activity + Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-base p-5">
          <h3 className="text-[14px] font-semibold text-[var(--color-navy-900)] font-display mb-3">Aktivitas Terbaru</h3>
          {m.recentKeuangan.length === 0 && m.recentUtilitas.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--color-ink-400)]">Belum ada aktivitas.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-surface-200)]">
              {[
                ...m.recentKeuangan.map((r: { tanggal: string | null; jenis_transaksi: string; kategori: string | null; nominal: number }) => ({ type: 'keuangan' as const, title: `${r.jenis_transaksi} · ${r.kategori || '-'}`, sub: formatRupiah(r.nominal ?? 0), date: r.tanggal ?? '' })),
                ...m.recentUtilitas.map((r: { tgl_usul: string | null; jenis_pekerjaan: string; status: string }) => ({ type: 'utilitas' as const, title: r.jenis_pekerjaan, sub: r.status, date: r.tgl_usul ?? '' })),
              ].filter(a => a.date !== '').sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 7).map((a, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.type === 'keuangan' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    {a.type === 'keuangan' ? <Wallet size={14} /> : <Zap size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-[var(--color-navy-900)] truncate">{a.title}</p>
                    <p className="text-[11px] text-[var(--color-ink-500)] truncate">{a.sub}</p>
                  </div>
                  <span className="text-[10px] text-[var(--color-ink-400)] whitespace-nowrap">{formatDate(a.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-base p-5">
            <h3 className="text-[12px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mb-3">Aksi Cepat</h3>
            <div className="space-y-1.5">
              <QuickLink href="/keuangan" icon={<Wallet size={14} />} label="Catat transaksi" color="bg-blue-50 text-blue-600" />
              <QuickLink href="/utilitas" icon={<Zap size={14} />} label="Ajukan utilitas" color="bg-amber-50 text-amber-600" />
              <QuickLink href="/bmn" icon={<Building2 size={14} />} label="Input aset BMN" color="bg-purple-50 text-purple-600" />
              <QuickLink href="/perencanaan" icon={<BarChart3 size={14} />} label="Analisa anggaran" color="bg-indigo-50 text-indigo-600" />
            </div>
          </div>
          {m.stokKritisCount > 0 && (
            <div className="card-base p-4 border-l-4 border-l-orange-400 bg-orange-50/30">
              <p className="text-[12px] font-semibold text-orange-800">{m.stokKritisCount} stok kritis</p>
              <p className="text-[11px] text-orange-700 mt-0.5">Item mencapai batas minimum</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint, href, accent }: { icon: React.ElementType; label: string; value: number; hint: string; href: string; accent: string }) {
  return (
    <Link href={href} className="group card-base p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center`}><Icon size={16} /></div>
        <ArrowUpRight size={14} className="text-[var(--color-ink-400)] opacity-0 group-hover:opacity-100 transition" />
      </div>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-500)] mt-3">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-[var(--color-navy-900)] mt-0.5 font-display">{value}</p>
      <p className="text-[10.5px] text-[var(--color-ink-500)] mt-1.5 flex items-center gap-1 truncate">
        <TrendingUp size={11} className="text-[var(--color-gold-500)] flex-shrink-0" />{hint}
      </p>
    </Link>
  )
}

function QuickLink({ href, icon, label, color }: { href: string; icon: React.ReactNode; label: string; color: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-[12.5px] text-[var(--color-ink-700)]">
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center`}>{icon}</div>
      {label}
    </Link>
  )
}

function ConditionBar({ label, count, total, value, color }: { label: string; count: number; total: number; value: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11.5px]">
        <span className="font-medium text-[var(--color-navy-900)]">{label}</span>
        <span className="text-[var(--color-ink-500)]">{count} unit · {formatShort(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-100)] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
      <span className="text-[12px] text-[var(--color-ink-700)] flex-1">{label}</span>
      <span className="text-[12px] font-semibold text-[var(--color-navy-900)]">{count}</span>
    </div>
  )
}

function AttentionWidget({ m }: { m: Awaited<ReturnType<typeof getMetrics>> }) {
  const role = m.me?.role
  const items: { label: string; href: string; tone: string; icon: React.ReactNode }[] = []
  if (role === 'Admin' && m.pendaftarPendingCount > 0) items.push({ label: `${m.pendaftarPendingCount} pendaftar menunggu`, href: '/pengguna', tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: <AlertTriangle size={14} /> })
  if (['Admin','Teknis','Perencanaan'].includes(role ?? '') && m.utilitasReviewCount > 0) items.push({ label: `${m.utilitasReviewCount} utilitas perlu review`, href: '/utilitas', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Zap size={14} /> })
  if (['Admin','BMN','Bendahara'].includes(role ?? '') && m.stokKritisCount > 0) items.push({ label: `${m.stokKritisCount} stok kritis`, href: '/persediaan', tone: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Package size={14} /> })
  if (role === 'Pengusul' && m.mySubmissionPendingCount > 0) items.push({ label: `${m.mySubmissionPendingCount} permohonan diproses`, href: '/utilitas', tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: <FileText size={14} /> })
  if (items.length === 0) return null
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {items.map((it, i) => (
        <Link key={i} href={it.href} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition hover:shadow-sm ${it.tone}`}>
          {it.icon}
          <span className="text-[11.5px] font-medium flex-1">{it.label}</span>
          <ArrowUpRight size={12} className="opacity-50" />
        </Link>
      ))}
    </section>
  )
}
