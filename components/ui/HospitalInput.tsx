'use client'

interface HospitalInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
}

export default function HospitalInput({ value, onChange, placeholder = 'হাসপাতালের নাম লিখুন', className = '' }: HospitalInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`input-field ${className}`}
    />
  )
}
