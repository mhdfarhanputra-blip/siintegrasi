import { NextResponse } from 'next/server'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt diperlukan' },
        { status: 400 }
      )
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key tidak dikonfigurasi' },
        { status: 500 }
      )
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: context ?? 'Kamu adalah asisten untuk aplikasi P2JN.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status, await response.text())
      return NextResponse.json(
        { error: `Gagal menghubungi AI: ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content ?? ''

    return NextResponse.json({ result: message })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
