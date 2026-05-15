'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const MAX_BUTTONS = 5

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-[var(--color-ink-500)]">
        Halaman {currentPage} dari {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-[var(--color-surface-200)] disabled:opacity-40 hover:bg-[var(--color-surface-100)] transition"
          aria-label="Sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, MAX_BUTTONS) }, (_, i) => {
          const page = i + 1
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                page === currentPage
                  ? 'bg-[var(--color-navy-900)] text-white'
                  : 'border border-[var(--color-surface-200)] hover:bg-[var(--color-surface-100)]'
              }`}
            >
              {page}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-[var(--color-surface-200)] disabled:opacity-40 hover:bg-[var(--color-surface-100)] transition"
          aria-label="Selanjutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
