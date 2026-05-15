import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const DEFAULT_LIMIT = 15

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })

    const [listRes, unreadRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, message, link, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_LIMIT),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ])

    if (listRes.error) throw listRes.error
    if (unreadRes.error) throw unreadRes.error

    return NextResponse.json({
      data: listRes.data ?? [],
      unread: unreadRes.count ?? 0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Belum masuk' }, { status: 401 })

    // Tolerate empty body (mark-all-as-read calls PATCH with no payload).
    let id: string | undefined
    try {
      const body = (await request.json()) as { id?: string } | null
      id = body?.id
    } catch {
      id = undefined
    }

    const now = new Date().toISOString()

    const query = id
      ? supabase.from('notifications').update({ read_at: now }).eq('id', id).eq('user_id', user.id)
      : supabase.from('notifications').update({ read_at: now }).eq('user_id', user.id).is('read_at', null)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kesalahan server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
