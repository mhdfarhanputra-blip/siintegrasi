import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { notifyUser } from '@/lib/notify'

const ALLOWED_STATUS = ['Pending', 'Aktif', 'Nonaktif'] as const
const ALLOWED_ROLE = ['Admin', 'Bendahara', 'BMN', 'Teknis', 'Perencanaan', 'Pengusul'] as const

type Status = (typeof ALLOWED_STATUS)[number]
type Role = (typeof ALLOWED_ROLE)[number]

async function getAdminContext() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(c) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Belum masuk', status: 401 as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'Admin' || profile?.status !== 'Aktif') {
    return { error: 'Hanya Admin aktif yang boleh melakukan tindakan ini', status: 403 as const }
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  return { user: { id: user.id }, admin }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getAdminContext()
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const body = (await request.json()) as { id?: string; status?: Status; role?: Role; nama?: string }
    const { id, status, role, nama } = body
    if (!id) return NextResponse.json({ error: 'ID pengguna wajib diisi' }, { status: 400 })

    if (id === ctx.user.id && status && status !== 'Aktif') {
      return NextResponse.json({ error: 'Anda tidak bisa mengubah status akun sendiri' }, { status: 400 })
    }

    const patch: Record<string, unknown> = {}
    if (status) {
      if (!ALLOWED_STATUS.includes(status)) {
        return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
      }
      patch.status = status
      if (status === 'Aktif') {
        patch.approved_at = new Date().toISOString()
        patch.approved_by = ctx.user.id
      }
    }
    if (role) {
      if (!ALLOWED_ROLE.includes(role)) {
        return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
      }
      patch.role = role
    }
    if (typeof nama === 'string' && nama.trim()) patch.nama = nama.trim()

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan' }, { status: 400 })
    }

    const { data, error } = await ctx.admin
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('id, email, nama, role, status, created_at, approved_at')
      .single()
    if (error) throw error

    // Kirim notifikasi ke pengguna terkait saat status berubah penting.
    if (status === 'Aktif') {
      await notifyUser({
        userId: id,
        type: 'akun_disetujui',
        title: 'Akun Anda telah disetujui',
        message: `Role Anda: ${data.role}. Silakan mulai menggunakan aplikasi.`,
        link: '/',
      })
    } else if (status === 'Nonaktif') {
      await notifyUser({
        userId: id,
        type: 'akun_nonaktif',
        title: 'Akun Anda dinonaktifkan',
        message: 'Hubungi admin jika memerlukan pengaktifan kembali.',
        link: '/pending',
      })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server tidak dikenal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getAdminContext()
    if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID pengguna wajib diisi' }, { status: 400 })
    if (id === ctx.user.id) {
      return NextResponse.json({ error: 'Anda tidak bisa menghapus akun sendiri' }, { status: 400 })
    }

    // Hapus auth.users → cascade ke public.profiles via FK ON DELETE CASCADE
    const { error } = await ctx.admin.auth.admin.deleteUser(id)
    if (error) {
      // Fallback: hapus profil saja bila user sudah tidak ada di auth
      await ctx.admin.from('profiles').delete().eq('id', id)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Kesalahan server tidak dikenal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
