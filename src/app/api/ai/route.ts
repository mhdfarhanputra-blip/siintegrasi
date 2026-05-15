import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEFAULT_SYSTEM_PROMPT =
  'Kamu adalah asisten Bahasa Indonesia untuk aplikasi SI Terintegrasi P2JN Bangka Belitung. Jawab singkat, jelas, dan sopan.'
const DEFAULT_TEMPERATURE = 0.6
const DEFAULT_MAX_TOKENS = 2048

async function requireActiveUser() {
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
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.status !== 'Aktif') return null
  return user
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser()
    if (!user) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 401 })
    }

    const { prompt, context } = await request.json()
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt diperlukan' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key tidak dikonfigurasi' }, { status: 500 })
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: context || DEFAULT_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal menghubungi AI (${response.status})` },
        { status: 502 },
      )
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ result: message })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
