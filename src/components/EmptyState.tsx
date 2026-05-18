import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card-base p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-gold-500)]/10 to-[var(--color-navy-900)]/5 flex items-center justify-center mb-4">
        <Icon size={26} className="text-[var(--color-gold-600)]" aria-hidden="true" />
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">{title}</h3>
      {description && (
        <p className="text-[12.5px] text-[var(--color-ink-500)] mt-1.5 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
