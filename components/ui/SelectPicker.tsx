'use client'

import { useEffect, useRef, useState } from 'react'
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{
    left: number
    top?: number
    bottom?: number
    width: number
    maxHeight: number
  } | null>(null)

  const filtered = searchable && search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const closeOnViewportChange = () => setOpen(false)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeOnViewportChange)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeOnViewportChange)
    }
  }, [open])

  const openPicker = () => {
    const trigger = triggerRef.current
    if (!trigger || options.length === 0) return
    const rect = trigger.getBoundingClientRect()
    const viewportPadding = 12
    const gap = 6
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gap
    const spaceAbove = rect.top - viewportPadding - gap
    const openBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove
    const availableHeight = Math.max(140, openBelow ? spaceBelow : spaceAbove)
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2)
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding
    )
    setPosition({
      left,
      width,
      maxHeight: Math.min(320, availableHeight),
      ...(openBelow
        ? { top: rect.bottom + gap }
        : { bottom: window.innerHeight - rect.top + gap }),
    })
    setSearch('')
    setOpen(true)
  }

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
    setSearch('')
  }

  const panel = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[120]"
      onClick={() => setOpen(false)}
    >
      <div
        role="listbox"
        aria-label={placeholder}
        className="fixed flex flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl"
        style={position ?? undefined}
        onClick={(event) => event.stopPropagation()}
      >
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
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-2">
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
        ref={triggerRef}
        type="button"
        onClick={openPicker}
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
