import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  tone?: 'neutral' | 'info' | 'warning'
}

const TONE_CLASS: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  neutral: 'bg-[var(--color-surface-100)] text-[var(--color-ink-500)]',
  info: 'bg-blue-50 text-blue-600',
  warning: 'bg-amber-50 text-amber-600',
}

/**
 * Empty state generic dengan ilustrasi ikon, deskripsi, dan CTA opsional.
 * Pakai untuk setiap modul agar pesan kosong lebih informatif & branded.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div className="card-base p-10 md:p-12 text-center flex flex-col items-center justify-center min-h-[260px]">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${TONE_CLASS[tone]}`}>
        <Icon size={28} />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">{title}</h3>
      {description && (
        <p className="text-[12.5px] text-[var(--color-ink-500)] mt-2 max-w-md">{description}</p>
      )}
      {actionLabel && (actionHref || onAction) && (
        <div className="mt-5">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-navy-900)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-navy-800)] transition"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
