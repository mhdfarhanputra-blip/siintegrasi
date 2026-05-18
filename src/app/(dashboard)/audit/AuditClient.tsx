'use client'

import { History, User, Activity } from 'lucide-react'
import { useState, useMemo } from 'react'

interface AuditRow {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string | null
  created_at: string
}

const ACTION_TONE: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

export default function AuditClient({ initialData }: { initialData: AuditRow[] }) {
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState<string>('ALL')

  const filtered = useMemo(() => {
    return initialData.filter((row) => {
      const matchesAction = filterAction === 'ALL' || row.action === filterAction
      const matchesSearch =
        !search ||
        (row.actor_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (row.entity_type ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (row.summary ?? '').toLowerCase().includes(search.toLowerCase())
      return matchesAction && matchesSearch
    })
  }, [initialData, search, filterAction])

  return (
    <div className="space-y-5 fade-in">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--color-gold-600)]">
          Governance
        </p>
        <h2 className="text-2xl font-bold text-[var(--color-navy-900)] font-display mt-1 flex items-center gap-2">
          <History size={22} /> Audit Log
        </h2>
        <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1">
          500 aktivitas terakhir pada seluruh modul operasional.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari pelaku, modul, atau ringkasan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base flex-1 min-w-[200px] text-sm"
        />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="input-base text-sm w-auto"
          aria-label="Filter aksi"
        >
          <option value="ALL">Semua Aksi</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
              <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-500)]">
                <th className="text-left px-4 py-3 font-semibold">Waktu</th>
                <th className="text-left px-4 py-3 font-semibold">Pelaku</th>
                <th className="text-left px-4 py-3 font-semibold">Aksi</th>
                <th className="text-left px-4 py-3 font-semibold">Modul</th>
                <th className="text-left px-4 py-3 font-semibold">Ringkasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-surface-200)]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--color-ink-400)] text-sm">
                    Belum ada aktivitas tercatat.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--color-surface-50)] transition-colors">
                  <td className="px-4 py-3 text-[12px] text-[var(--color-ink-500)] whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-ink-700)]">
                      <User size={12} className="text-[var(--color-ink-400)]" />
                      {row.actor_email ?? 'Sistem'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ACTION_TONE[row.action] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-navy-900)] font-medium">
                      <Activity size={12} className="text-[var(--color-gold-500)]" />
                      {row.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--color-ink-700)]">
                    {row.summary ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
