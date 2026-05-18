'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Shield, Pencil, Check, X, Ban, UserCheck } from 'lucide-react'
import Modal from '@/components/Modal'
import SearchInput from '@/components/SearchInput'
import { useRealtime } from '@/lib/useRealtime'
import { showError, showSuccess, confirmActionAsync } from '@/lib/toast'
import { getRoleLabel } from '@/lib/access'

interface ProfileRow {
  id: string
  email: string
  nama: string
  role: string
  status: string
  created_at: string | null
  approved_at: string | null
}

const ROLES = ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'] as const

const ROLE_COLOR: Record<string, string> = {
  Admin: 'bg-rose-50 text-rose-700',
  Bendahara: 'bg-blue-50 text-blue-700',
  BMN: 'bg-purple-50 text-purple-700',
  Teknis: 'bg-orange-50 text-orange-700',
  Perencanaan: 'bg-emerald-50 text-emerald-700',
  Pengusul: 'bg-slate-100 text-slate-700',
}

const STATUS_TABS = ['Pending', 'Aktif', 'Nonaktif'] as const

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Aktif: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Nonaktif: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

interface PenggunaClientProps {
  initialData: ProfileRow[]
  currentUserId: string
}

export default function PenggunaClient({ initialData, currentUserId }: PenggunaClientProps) {
  const [data, setData] = useState(initialData)
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('Pending')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useRealtime('profiles')

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { Pending: 0, Aktif: 0, Nonaktif: 0 }
    data.forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1
    })
    return counts
  }, [data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data
      .filter((d) => d.status === tab)
      .filter((d) => {
        if (!q) return true
        const nama = (d.nama ?? '').toLowerCase()
        const email = (d.email ?? '').toLowerCase()
        return nama.includes(q) || email.includes(q)
      })
  }, [data, tab, search])

  async function callAdminApi(payload: Partial<ProfileRow> & { id: string }) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Gagal memproses permintaan')
    return json.data as ProfileRow
  }

  async function updateProfile(id: string, patch: Partial<ProfileRow>, successMsg: string) {
    try {
      const updated = await callAdminApi({ id, ...patch })
      setData((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)))
      showSuccess(successMsg)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memperbarui', msg)
    }
  }

  async function handleApprove(row: ProfileRow) {
    if (!(await confirmActionAsync(`Setujui akun ${row.nama}? Role saat ini: ${getRoleLabel(row.role)}.`))) return
    await updateProfile(row.id, { status: 'Aktif' }, 'Akun berhasil disetujui')
  }

  async function handleReject(row: ProfileRow) {
    if (!(await confirmActionAsync(`Tolak dan nonaktifkan akun ${row.nama}?`))) return
    await updateProfile(row.id, { status: 'Nonaktif' }, 'Akun ditolak')
  }

  async function handleReactivate(row: ProfileRow) {
    if (!(await confirmActionAsync(`Aktifkan kembali akun ${row.nama}?`))) return
    await updateProfile(row.id, { status: 'Aktif' }, 'Akun berhasil diaktifkan kembali')
  }

  async function handleDeactivate(row: ProfileRow) {
    if (row.id === currentUserId) {
      showError('Anda tidak bisa menonaktifkan akun Anda sendiri.')
      return
    }
    if (!(await confirmActionAsync(`Nonaktifkan akun ${row.nama}? Akses login-nya akan diblokir.`))) return
    await updateProfile(row.id, { status: 'Nonaktif' }, 'Akun berhasil dinonaktifkan')
  }

  async function handleDelete(row: ProfileRow) {
    if (row.id === currentUserId) {
      showError('Anda tidak bisa menghapus akun Anda sendiri.')
      return
    }
    if (!(await confirmActionAsync(`Hapus akun ${row.nama} secara permanen? Tindakan ini tidak dapat dibatalkan.`))) return
    try {
      const res = await fetch(`/api/admin/users?id=${row.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus pengguna')
      setData((prev) => prev.filter((d) => d.id !== row.id))
      showSuccess('Akun pengguna berhasil dihapus')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal menghapus pengguna', msg)
    }
  }

  async function handleSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const payload = {
      id: editing.id,
      nama: form.get('nama') as string,
      role: form.get('role') as ProfileRow['role'],
    }
    try {
      const updated = await callAdminApi(payload)
      setData((prev) => prev.map((d) => (d.id === editing.id ? { ...d, ...updated } : d)))
      setEditing(null)
      showSuccess('Pengguna berhasil diperbarui')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      showError('Gagal memperbarui pengguna', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">
            Manajemen Pengguna
          </h2>
          <p className="text-[11.5px] text-[var(--color-ink-500)]">
            Setujui pendaftar, atur role, dan kelola status akses
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-ink-500)]">
          <Shield size={16} className="text-[var(--color-gold-500)]" />
          <span>{data.length} pengguna terdaftar</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((s) => {
          const active = tab === s
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                active
                  ? 'bg-[var(--color-navy-900)] text-white shadow-sm'
                  : 'bg-white border border-[var(--color-surface-200)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-100)]'
              }`}
            >
              {s}
              <span
                className={`text-[10.5px] px-1.5 py-0.5 rounded-md ${
                  active ? 'bg-white/20' : 'bg-[var(--color-surface-100)]'
                }`}
              >
                {countsByStatus[s] ?? 0}
              </span>
            </button>
          )
        })}
        <div className="ml-auto w-full sm:max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau email..." />
        </div>
      </div>

      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
              <tr className="text-[11px] uppercase tracking-wider text-[var(--color-ink-500)]">
                <th className="text-left px-4 py-3 font-semibold">Pengguna</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Tanggal</th>
                <th className="text-center px-4 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-surface-200)]">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--color-ink-400)] text-sm">
                    {tab === 'Pending'
                      ? 'Tidak ada permintaan akun yang menunggu persetujuan.'
                      : tab === 'Aktif'
                      ? 'Belum ada akun aktif.'
                      : 'Tidak ada akun yang dinonaktifkan.'}
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--color-surface-50)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-navy-800)] to-[var(--color-navy-900)] text-white flex items-center justify-center text-xs font-semibold">
                        {(row.nama || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-navy-900)]">{row.nama || '-'}</p>
                        <p className="text-[11.5px] text-[var(--color-ink-500)] truncate">{row.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        ROLE_COLOR[row.role] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {getRoleLabel(row.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_BADGE[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-500)] text-[12px]">
                    {row.status === 'Aktif' ? formatDate(row.approved_at) : formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {row.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(row)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            title="Setujui"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(row)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                            title="Tolak"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      {row.status === 'Aktif' && (
                        <button
                          onClick={() => handleDeactivate(row)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition"
                          title="Nonaktifkan"
                        >
                          <Ban size={16} />
                        </button>
                      )}
                      {row.status === 'Nonaktif' && (
                        <button
                          onClick={() => handleReactivate(row)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                          title="Aktifkan kembali"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setEditing(row)}
                        className="p-1.5 rounded-lg text-[var(--color-ink-500)] hover:text-[var(--color-gold-600)] hover:bg-[var(--color-surface-100)] transition"
                        title="Ubah nama & role"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition"
                        title="Hapus akun"
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

      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Ubah Pengguna">
        {editing && (
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div>
              <label htmlFor="edit-email" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">Email</label>
              <input
                id="edit-email"
                type="email"
                value={editing.email}
                disabled
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface-50)] text-[var(--color-ink-500)]"
              />
            </div>
            <div>
              <label htmlFor="edit-nama" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                Nama <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <input
                id="edit-nama"
                type="text"
                name="nama"
                defaultValue={editing.nama}
                required
                aria-required="true"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)] focus:shadow-[0_0_0_3px_rgba(199,154,74,0.12)]"
              />
            </div>
            <div>
              <label htmlFor="edit-role" className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                Role <span className="text-rose-600" aria-label="wajib diisi">*</span>
              </label>
              <select
                id="edit-role"
                name="role"
                defaultValue={editing.role}
                required
                aria-required="true"
                className="w-full border border-[var(--color-surface-200)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-gold-500)]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="border border-[var(--color-surface-200)] px-4 py-2 rounded-lg hover:bg-[var(--color-surface-100)] transition text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[var(--color-navy-900)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-navy-800)] transition disabled:opacity-50 text-sm"
              >
                {loading ? 'Menyimpan...' : 'Perbarui'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
