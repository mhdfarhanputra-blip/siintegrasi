'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Shield } from 'lucide-react'

interface ProfileRow {
  id: string
  email: string
  nama: string
  role: string
}

const ROLES = ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'] as const

const ROLE_COLOR: Record<string, string> = {
  Admin: 'bg-red-50 text-red-700',
  Bendahara: 'bg-blue-50 text-blue-700',
  BMN: 'bg-purple-50 text-purple-700',
  Teknis: 'bg-orange-50 text-orange-700',
  Perencanaan: 'bg-green-50 text-green-700',
  Pengusul: 'bg-gray-50 text-gray-700',
}

export default function PenggunaClient({ initialData }: { initialData: ProfileRow[] }) {
  const [data, setData] = useState(initialData)
  const supabase = useMemo(() => createClient(), [])

  async function handleRoleChange(id: string, newRole: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)
    if (!error) {
      setData((prev) =>
        prev.map((d) => (d.id === id ? { ...d, role: newRole } : d))
      )
    } else {
      alert('Gagal mengubah role: ' + error.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus pengguna ini? Tindakan ini tidak dapat dibatalkan.')) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (!error) {
      setData((prev) => prev.filter((d) => d.id !== id))
    } else {
      alert('Gagal menghapus pengguna: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#0c1e3e]">Manajemen Pengguna</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield size={16} />
          <span>{data.length} pengguna terdaftar</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    Belum ada pengguna terdaftar
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0c1e3e] rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {row.nama?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-[#0c1e3e]">{row.nama || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={row.role}
                      onChange={(e) => handleRoleChange(row.id, e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                        ROLE_COLOR[row.role] || 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 hover:text-red-700 transition"
                      title="Hapus pengguna"
                    >
                      <Trash2 size={16} />
                    </button>
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
