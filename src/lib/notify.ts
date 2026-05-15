import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Helper server-side untuk menaruh notifikasi in-app.
 * Memakai service-role agar bisa menyisipkan notifikasi ke user lain
 * (mis. memberi tahu semua Admin saat pendaftar baru masuk).
 */

interface NotifyInput {
  userId: string
  type: string
  title: string
  message?: string | null
  link?: string | null
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    await adminClient().from('notifications').insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
    })
  } catch {
    // Notifikasi bersifat best-effort; jangan gagalkan operasi utama.
  }
}

export async function notifyUsersByRole(
  role: string | string[],
  payload: Omit<NotifyInput, 'userId'>,
): Promise<void> {
  try {
    const admin = adminClient()
    const roles = Array.isArray(role) ? role : [role]
    const { data } = await admin
      .from('profiles')
      .select('id')
      .in('role', roles)
      .eq('status', 'Aktif')
    if (!data?.length) return
    await admin.from('notifications').insert(
      data.map((p) => ({
        user_id: p.id,
        type: payload.type,
        title: payload.title,
        message: payload.message ?? null,
        link: payload.link ?? null,
      })),
    )
  } catch {
    // best-effort
  }
}
