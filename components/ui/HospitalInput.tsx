'use client'

import { useState, useRef, useEffect } from 'react'
import { KHULNA_HOSPITALS } from '@/lib/constants'

interface HospitalInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export default function HospitalInput({ value, onChange, placeholder = 'হাসপাতালের নাম লিখুন', className = '' }: HospitalInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focused, setFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = value.trim().length > 0
    ? KHULNA_HOSPITALS.filter(h =>
        h.search.some(s => s.includes(value.toLowerCase().trim()))
      ).slice(0, 6)
    : []

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (display: string) => {
    onChange(display)
    setShowSuggestions(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setShowSuggestions(true)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => { setFocused(true); if (value.trim().length > 0) setShowSuggestions(true) }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={`input-field ${focused ? 'border-[#1A9E6B]' : ''} ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-30 overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((h) => (
            <li key={h.display}>
              <button
                type="button"
                onMouseDown={() => handleSelect(h.display)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[#F5FFF9] hover:text-[#1A9E6B] transition-colors border-b border-[#F0F0F0] last:border-0 font-medium text-[#111111]"
              >
                🏥 {h.display}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
