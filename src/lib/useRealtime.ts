'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

/**
 * Subscribe ke perubahan realtime pada sebuah tabel Supabase.
 * Nama channel di-uniqkan per mount untuk menghindari error
 * "cannot add postgres_changes callbacks ... after subscribe()"
 * yang terjadi saat channel dengan nama sama di-reuse (termasuk di
 * React StrictMode yang memount effect dua kali).
 */
export function useRealtime(table: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channelName = `realtime-${table}-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, router])
}
