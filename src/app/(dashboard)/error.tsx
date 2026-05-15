'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[var(--color-surface-200)] shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-[var(--color-navy-900)] font-display">
          Terjadi Kesalahan
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-500)] break-words">
          {error.message || 'Kami tidak bisa memuat halaman ini saat ini.'}
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition"
        >
          <RotateCcw size={15} />
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
