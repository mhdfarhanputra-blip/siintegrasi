'use client'

import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)

    setOffline(!navigator.onLine)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-navy-900)] text-white shadow-lg border border-white/10 fade-in"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff size={16} className="text-rose-400" />
      <span className="text-[12.5px] font-medium">Tidak ada koneksi internet</span>
    </div>
  )
}
