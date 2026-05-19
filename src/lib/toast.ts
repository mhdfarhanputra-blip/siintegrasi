import { toast } from 'sonner'
import { confirmDialog } from '@/components/ConfirmDialog'

const DEFAULT_DURATION_MS = 4000

export function showSuccess(message: string, description?: string) {
  toast.success(message, { description, duration: DEFAULT_DURATION_MS })
}

export function showError(message: string, description?: string) {
  toast.error(message, { description, duration: DEFAULT_DURATION_MS })
}

export function showInfo(message: string, description?: string) {
  toast(message, { description, duration: DEFAULT_DURATION_MS })
}

export function showWarning(message: string, description?: string) {
  toast.warning(message, { description, duration: DEFAULT_DURATION_MS })
}

/**
 * Konfirmasi sinkron klasik (untuk backward-compatibility).
 * Untuk dialog modern berbranding gunakan confirmActionAsync.
 */
export function confirmAction(message: string): boolean {
  if (typeof window === 'undefined') return false
  return window.confirm(message)
}

/**
 * Konfirmasi dialog modern dengan styling konsisten aplikasi.
 * Wajib pakai await karena async.
 */
export function confirmActionAsync(
  message: string,
  title = 'Konfirmasi',
  options?: { confirmLabel?: string; tone?: 'danger' | 'warning' | 'info' }
): Promise<boolean> {
  return confirmDialog({
    title,
    message,
    tone: options?.tone ?? 'danger',
    confirmLabel: options?.confirmLabel,
  })
}
