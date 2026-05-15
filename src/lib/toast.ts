import { toast } from 'sonner'

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

export function confirmAction(message: string): boolean {
  if (typeof window === 'undefined') return false
  return window.confirm(message)
}
