'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--color-navy-950)]/55 backdrop-blur-sm data-[state=open]:animate-[fade-in_180ms_ease-out]" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-50 w-full ${SIZE_CLASS[size]} -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden data-[state=open]:animate-[fade-in_180ms_ease-out] focus:outline-none`}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-surface-200)] bg-gradient-to-r from-white to-[var(--color-surface-50)]">
            <div className="min-w-0">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display truncate">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-[11.5px] text-[var(--color-ink-500)] mt-0.5">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Dialog {title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-ink-500)] hover:text-[var(--color-navy-900)] hover:bg-[var(--color-surface-100)] transition focus-visible:outline-2 focus-visible:outline-[var(--color-gold-500)]"
                aria-label="Tutup dialog"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
