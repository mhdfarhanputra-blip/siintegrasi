'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, X, Loader2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: Date
}

const MAX_MESSAGES_VISIBLE = 30
const SYSTEM_PROMPT =
  'Kamu adalah asisten untuk aplikasi SI Terintegrasi P2JN Bangka Belitung. Bantu jelaskan alur kerja utilitas, modul keuangan, BMN, DIPA/RKA-KL, dan perencanaan. Jawab dalam Bahasa Indonesia yang singkat dan jelas.'

export default function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const visibleMessages = messages.slice(-MAX_MESSAGES_VISIBLE)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text, at: new Date() }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, context: SYSTEM_PROMPT }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal mendapatkan jawaban')
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.result || '(Jawaban kosong)', at: new Date() },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kesalahan tidak dikenal'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Maaf, terjadi kesalahan: ${msg}`, at: new Date() },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] text-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-105 active:scale-95 transition"
        aria-label={open ? 'Tutup asisten AI' : 'Buka asisten AI'}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] sm:w-[380px] max-h-[70vh] bg-white rounded-2xl border border-[var(--color-surface-200)] shadow-xl flex flex-col overflow-hidden fade-in"
          role="dialog"
          aria-label="Asisten AI"
        >
          <div className="px-4 py-3 bg-gradient-to-r from-[var(--color-navy-900)] to-[var(--color-navy-800)] text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-gold-500)]/25 flex items-center justify-center">
              <Sparkles size={16} className="text-[var(--color-gold-300)]" />
            </div>
            <div>
              <p className="text-sm font-semibold font-display">Asisten Cerdas P2JN</p>
              <p className="text-[10.5px] text-white/60">DeepSeek · siap membantu</p>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3 bg-[var(--color-surface-50)]"
          >
            {visibleMessages.length === 0 && (
              <div className="text-[12px] text-[var(--color-ink-500)] text-center py-6">
                Tanyakan apa saja tentang modul aplikasi, alur pemeriksaan utilitas, atau tugas role Anda.
              </div>
            )}
            {visibleMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] text-[12.5px] leading-relaxed rounded-2xl px-3.5 py-2.5 whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-[var(--color-navy-900)] text-white rounded-br-sm'
                      : 'bg-white border border-[var(--color-surface-200)] text-[var(--color-ink-700)] rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-[var(--color-surface-200)] px-3.5 py-2.5 text-[12.5px] text-[var(--color-ink-500)] flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Sedang berpikir...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="px-3 py-3 border-t border-[var(--color-surface-200)] bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan..."
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm bg-[var(--color-surface-50)] border border-[var(--color-surface-200)] rounded-xl focus:outline-none focus:border-[var(--color-gold-500)] focus:shadow-[0_0_0_3px_rgba(199,154,74,0.12)] transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[var(--color-navy-900)] text-white flex items-center justify-center hover:bg-[var(--color-navy-800)] transition disabled:opacity-50"
              aria-label="Kirim"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
