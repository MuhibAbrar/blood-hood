'use client'

import { useState, useRef, useEffect } from 'react'

interface SelectPickerProps {
  value: string
  onChange: (val: string) => void
  options: string[]
  placeholder: string
  searchable?: boolean
}

export default function SelectPicker({ value, onChange, options, placeholder, searchable = false }: SelectPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = searchable && search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch('') }}
        className="input-field w-full text-left flex items-center justify-between"
      >
        <span className={value ? 'text-[#111111]' : 'text-[#AAAAAA]'}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-[#888] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E5E5E5] rounded-2xl shadow-xl overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-[#F0F0F0]">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="খুঁজুন..."
                className="w-full px-3 py-2 text-sm bg-[#F5F5F5] rounded-xl outline-none"
              />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#AAAAAA] py-4">কিছু পাওয়া যায়নি</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setSearch('') }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    value === opt
                      ? 'bg-[#FFF0F0] text-[#D92B2B] font-semibold'
                      : 'text-[#111111] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {opt}
                  {value === opt && <span className="float-right">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
