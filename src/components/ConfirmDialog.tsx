'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning' | 'info'
}

type Resolver = (value: boolean) => void

let resolveRef: Resolver | null = null
let openSetter: ((opts: ConfirmOptions | null) => void) | null = null

/**
 * Konfirmasi dialog kustom dengan styling konsisten.
 * Pemakaian: const ok = await confirmDialog({ title, message })
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!openSetter) {
      resolve(typeof window !== 'undefined' ? window.confirm(opts.message) : false)
      return
    }
    // Jika ada dialog yang masih pending, resolve dulu dengan false
    // agar Promise sebelumnya tidak menggantung (memory leak).
    if (resolveRef) {
      try { resolveRef(false) } catch { /* noop */ }
      resolveRef = null
    }
    resolveRef = resolve
    openSetter(opts)
  })
}

const TONE_CLASS: Record<NonNullable<ConfirmOptions['tone']>, { btn: string; iconBg: string; iconColor: string }> = {
  danger: { btn: 'bg-rose-600 hover:bg-rose-700', iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
  warning: { btn: 'bg-amber-500 hover:bg-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
  info: { btn: 'bg-[var(--color-navy-900)] hover:bg-[var(--color-navy-800)]', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
}

export default function ConfirmDialogProvider() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    openSetter = setOpts
    return () => { openSetter = null }
  }, [])

  useEffect(() => {
    if (opts && confirmBtnRef.current) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [opts])

  const handleResolve = (value: boolean) => {
    if (resolveRef) {
      resolveRef(value)
      resolveRef = null
    }
    setOpts(null)
  }

  const tone = TONE_CLASS[opts?.tone ?? 'danger']

  return (
    <Dialog.Root open={opts !== null} onOpenChange={(o) => !o && handleResolve(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[var(--color-navy-950)]/55 backdrop-blur-sm data-[state=open]:animate-[fade-in_180ms_ease-out]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden data-[state=open]:animate-[fade-in_180ms_ease-out] focus:outline-none">
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full ${tone.iconBg} flex items-center justify-center flex-shrink-0`}>
              <AlertTriangle size={18} className={tone.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--color-navy-900)] font-display">
                {opts?.title ?? 'Konfirmasi'}
              </Dialog.Title>
              <Dialog.Description className="text-[12.5px] text-[var(--color-ink-500)] mt-1">
                {opts?.message ?? ''}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={() => handleResolve(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-ink-500)] hover:bg-[var(--color-surface-100)] transition"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          <div className="px-5 pb-5 pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleResolve(false)}
              className="px-4 py-2 rounded-lg text-sm border border-[var(--color-surface-200)] hover:bg-[var(--color-surface-100)] transition"
            >
              {opts?.cancelLabel ?? 'Batal'}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={() => handleResolve(true)}
              className={`px-4 py-2 rounded-lg text-sm text-white ${tone.btn} transition`}
            >
              {opts?.confirmLabel ?? 'Ya, Lanjutkan'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
