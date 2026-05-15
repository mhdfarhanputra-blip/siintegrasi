'use client'

import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative group">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)] group-focus-within:text-[var(--color-gold-500)] transition-colors pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Cari...'}
        className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-[var(--color-surface-200)] rounded-xl focus:outline-none focus:border-[var(--color-gold-500)] focus:shadow-[0_0_0_3px_rgba(199,154,74,0.12)] transition-all placeholder:text-[var(--color-ink-400)]"
      />
    </div>
  )
}
