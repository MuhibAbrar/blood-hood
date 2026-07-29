'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const [mounted, setMounted] = useState(false)

  const filtered = searchable && search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
    setSearch('')
  }

  const panel = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:items-center md:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={placeholder}
        className="flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[#E5E5E5] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#EEEEEE] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-[#777]">নির্বাচন করুন</p>
            <p className="truncate text-sm font-semibold text-[#111]">{value || placeholder}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl text-[#555]"
            aria-label="বন্ধ করুন"
          >
            ×
          </button>
        </div>
        {searchable && (
          <div className="shrink-0 border-b border-[#F0F0F0] p-3">
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="খুঁজুন..."
              className="w-full rounded-xl bg-[#F5F5F5] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100"
            />
          </div>
        )}
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-2 py-2 pb-5">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#AAAAAA]">কিছু পাওয়া যায়নি</p>
          ) : (
            filtered.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => choose(option)}
                className={`mb-1 min-h-12 w-full touch-manipulation rounded-xl px-4 py-3 text-left text-sm transition-colors ${
                  value === option
                    ? 'bg-[#FFF0F0] font-semibold text-[#D92B2B]'
                    : 'text-[#111111] hover:bg-[#F5F5F5] active:bg-gray-100'
                }`}
              >
                <span>{option}</span>
                {value === option && <span className="float-right">✓</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(true); setSearch('') }}
        disabled={options.length === 0}
        aria-expanded={open}
        className="input-field flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
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
      {panel}
    </div>
  )
}
