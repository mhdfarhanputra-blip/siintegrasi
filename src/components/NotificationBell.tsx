'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Check, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NotifItem {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const POLL_MS = 60_000
const TIME_UNITS: Array<[number, string]> = [
  [60, 'detik'],
  [60, 'menit'],
  [24, 'jam'],
  [7, 'hari'],
]

function relativeTime(iso: string): string {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  let val = diff
  let label = 'detik'
  for (const [step, next] of TIME_UNITS) {
    if (val < step) break
    val = Math.floor(val / step)
    label = next
  }
  return `${val} ${label} lalu`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotifItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setItems(json.data ?? [])
      setUnread(json.unread ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notif-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    setUnread(0)
  }

  async function markOne(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    setUnread((u) => Math.max(0, u - 1))
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-2 text-[var(--color-ink-500)] hover:text-[var(--color-navy-900)] transition rounded-xl hover:bg-[var(--color-surface-100)] relative"
        aria-label="Notifikasi"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-w-[90vw] bg-white rounded-2xl shadow-xl border border-[var(--color-surface-200)] overflow-hidden z-50 fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-surface-200)]">
            <div>
              <p className="text-[13px] font-semibold text-[var(--color-navy-900)] font-display">Notifikasi</p>
              <p className="text-[11px] text-[var(--color-ink-500)]">
                {unread === 0 ? 'Semua sudah dibaca' : `${unread} belum dibaca`}
              </p>
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-[var(--color-navy-900)] hover:text-[var(--color-gold-600)] flex items-center gap-1 transition"
              >
                <Check size={12} /> Tandai semua
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-ink-400)] py-8">Memuat...</p>
            ) : items.length === 0 ? (
              <div className="text-center py-8 px-6">
                <Inbox size={24} className="mx-auto text-[var(--color-ink-400)]" />
                <p className="mt-2 text-[12.5px] text-[var(--color-ink-500)]">Belum ada notifikasi.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-surface-200)]">
                {items.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.link ?? '#'}
                      onClick={() => markOne(n.id)}
                      className={`block px-4 py-3 hover:bg-[var(--color-surface-50)] transition ${n.read_at ? '' : 'bg-[var(--color-gold-500)]/5'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-gold-500)] flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-[var(--color-navy-900)]">{n.title}</p>
                          {n.message && <p className="text-[11.5px] text-[var(--color-ink-500)] mt-0.5">{n.message}</p>}
                          <p className="text-[10.5px] text-[var(--color-ink-400)] mt-1">{relativeTime(n.created_at)}</p>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
