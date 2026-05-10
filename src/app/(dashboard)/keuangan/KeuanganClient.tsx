'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'

interface Keuangan {
  id: string
  tanggal: string
  jenis_transaksi: 'Debit' | 'Kredit'
  kategori: string | null
  nominal: number
  keterangan: string | null
  link_nota: string | null
  input_by: string | null
  created_at: string
}

interface KeuanganClientProps {
  initialData: Keuangan[]
}

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function KeuanganClient({ initialData }: KeuanganClientProps) {
  const [data] = useState<Keuangan[]>(initialData)

  const totalDebit = data
    .filter((d) => d.jenis_transaksi === 'Debit')
    .reduce((sum, d) => sum + d.nominal, 0)
  const totalKredit = data
    .filter((d) => d.jenis_transaksi === 'Kredit')
    .reduce((sum, d) => sum + d.nominal, 0)
  const saldo = totalDebit - totalKredit

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Wallet size={32} className="text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-[#0c1e3e] mb-2">Modul Keuangan</h2>
        <p className="text-gray-500">Belum ada data transaksi</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards totalDebit={totalDebit} totalKredit={totalKredit} saldo={saldo} />
      <TransaksiTable data={data} />
    </div>
  )
}

function SummaryCards({
  totalDebit,
  totalKredit,
  saldo,
}: {
  totalDebit: number
  totalKredit: number
  saldo: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold">Total Debit</p>
        <p className="text-lg font-bold text-green-700 mt-1">{formatRupiah(totalDebit)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold">Total Kredit</p>
        <p className="text-lg font-bold text-red-700 mt-1">{formatRupiah(totalKredit)}</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase font-semibold">Saldo</p>
        <p className="text-lg font-bold text-[#0c1e3e] mt-1">{formatRupiah(saldo)}</p>
      </div>
    </div>
  )
}

function TransaksiTable({ data }: { data: Keuangan[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-[#0c1e3e]">Daftar Transaksi</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="px-5 py-3">Tanggal</th>
              <th className="px-5 py-3">Jenis</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3 text-right">Nominal</th>
              <th className="px-5 py-3">Keterangan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 whitespace-nowrap">{formatDate(item.tanggal)}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      item.jenis_transaksi === 'Debit'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.jenis_transaksi}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{item.kategori ?? '-'}</td>
                <td className="px-5 py-3 text-right font-medium">{formatRupiah(item.nominal)}</td>
                <td className="px-5 py-3 text-gray-600 max-w-[200px] truncate">
                  {item.keterangan ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
