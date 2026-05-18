'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Plus, Check, Search } from 'lucide-react'

export interface ComboboxOption {
  value: string
  label: string
  meta?: Record<string, string | number | null>
}

interface ComboboxProps {
  value: string
  onChange: (value: string, meta?: ComboboxOption['meta']) => void
  options: ComboboxOption[]
  placeholder?: string
  label?: string
  required?: boolean
  id?: string
  allowCreate?: boolean
  onCreate?: (newValue: string) => Promise<ComboboxOption | null>
  emptyText?: string
}

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Ketik untuk mencari...',
  label,
  required,
  id,
  allowCreate = true,
  onCreate,
  emptyText = 'Tidak ada hasil',
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    const q = (query || value).toLowerCase().trim()
    if (!q) return options.slice(0, 50)
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 50)
  }, [options, query, value])

  const exactMatch = useMemo(() => {
    const q = query.toLowerCase().trim()
    return options.some((o) => o.label.toLowerCase() === q)
  }, [options, query])

  function selectOption(opt: ComboboxOption) {
    onChange(opt.value, opt.meta)
    setQuery('')
    setOpen(false)
  }

  async function handleCreate() {
    if (!query.trim() || !onCreate) return
    setCreating(true)
    try {
      const created = await onCreate(query.trim())
      if (created) {
        onChange(created.value, created.meta)
        setQuery('')
        setOpen(false)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={wrapperRef} className="space-y-1.5 relative">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-ink-700)]">
          {label} {required && <span className="text-rose-600" aria-label="wajib diisi">*</span>}
        </label>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(value); setOpen(true) }}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          aria-autocomplete="list"
          aria-expanded={open}
          className="w-full pl-9 pr-9 py-2 border border-[var(--color-surface-200)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)]/50"
        />
        <ChevronDown
          size={14}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </div>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full bg-white border border-[var(--color-surface-200)] rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {filtered.length === 0 && !allowCreate && (
            <li className="px-3 py-3 text-[12.5px] text-[var(--color-ink-400)] text-center">{emptyText}</li>
          )}
          {filtered.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                onClick={() => selectOption(opt)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-100)] transition cursor-pointer"
              >
                <span className="truncate">{opt.label}</span>
                {opt.meta?.satuan && (
                  <span className="text-[10.5px] text-[var(--color-ink-400)] ml-2">({opt.meta.satuan})</span>
                )}
                {opt.value === value && <Check size={14} className="text-[var(--color-gold-500)] flex-shrink-0" />}
              </button>
            </li>
          ))}
          {allowCreate && query.trim() && !exactMatch && onCreate && (
            <li role="option" aria-selected="false">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-gold-500)]/10 transition border-t border-[var(--color-surface-200)] text-[var(--color-gold-700)] font-medium cursor-pointer disabled:opacity-60"
              >
                <Plus size={14} />
                {creating ? 'Menambahkan...' : `Tambah baru: "${query.trim()}"`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
