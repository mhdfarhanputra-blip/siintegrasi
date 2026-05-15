'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface DashboardChartProps {
  pagu: number
  realisasi: number
  sisa: number
}

const COLORS_DONUT = ['#0f766e', '#e5ebf5']

export function PaguRealisasiDonut({ pagu, realisasi, sisa }: DashboardChartProps) {
  const persen = pagu > 0 ? Math.round((realisasi / pagu) * 100) : 0
  const data = [
    { name: 'Realisasi', value: realisasi },
    { name: 'Sisa', value: sisa },
  ]

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={42}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS_DONUT[idx]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[15px] font-bold text-[var(--color-navy-900)]">{persen}%</span>
        </div>
      </div>
      <div className="space-y-1.5 text-[11.5px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" />
          <span className="text-[var(--color-ink-500)]">Realisasi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#e5ebf5]" />
          <span className="text-[var(--color-ink-500)]">Sisa Anggaran</span>
        </div>
      </div>
    </div>
  )
}

interface KeuanganBarProps {
  debit: number
  kredit: number
}

export function KeuanganBar({ debit, kredit }: KeuanganBarProps) {
  const total = debit + kredit
  const debitPct = total > 0 ? (debit / total) * 100 : 50
  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden bg-[var(--color-surface-200)] flex">
        <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${debitPct}%` }} />
        <div className="h-full bg-rose-400 rounded-r-full transition-all" style={{ width: `${100 - debitPct}%` }} />
      </div>
      <div className="flex justify-between text-[10.5px]">
        <span className="text-emerald-700 font-medium">Debit {debitPct.toFixed(0)}%</span>
        <span className="text-rose-700 font-medium">Kredit {(100 - debitPct).toFixed(0)}%</span>
      </div>
    </div>
  )
}
