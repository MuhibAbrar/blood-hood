interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other' | ''
  size?: number
  className?: string
}

export default function DefaultAvatar({ gender, size = 80, className = '' }: DefaultAvatarProps) {
  const isFemale = gender === 'female'
  const palette = isFemale
    ? { background: '#F3EAF9', primary: '#8E5BB0', secondary: '#B987CF' }
    : { background: '#E7F2FC', primary: '#256AA8', secondary: '#65A5DA' }

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: palette.background }}
      role="img"
      aria-label={isFemale ? 'Female profile avatar' : 'Male profile avatar'}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48.5" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="3" />

        {isFemale ? (
          <>
            {/* Subtle hair shape distinguishes the female avatar without a face. */}
            <path d="M31 43C31 25 38.5 16 50 16C61.5 16 69 25 69 43V58H31V43Z" fill={palette.primary} />
            <circle cx="50" cy="37" r="16" fill={palette.secondary} />
            <path d="M25 100V82C25 64 35 56 50 56C65 56 75 64 75 82V100H25Z" fill={palette.primary} />
            <path d="M41 58L50 69L59 58" stroke="#F8F2FB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            {/* Clean, faceless male profile silhouette. */}
            <circle cx="50" cy="36" r="17" fill={palette.secondary} />
            <path d="M34 33C34 22 40 16 50 16C60 16 67 22 67 32C60 31 54 27 50 22C46 28 40 31 34 33Z" fill={palette.primary} />
            <path d="M24 100V82C24 64 34 56 50 56C66 56 76 64 76 82V100H24Z" fill={palette.primary} />
            <path d="M40 58L50 69L60 58" fill="#F4F9FD" />
          </>
        )}
      </svg>
    </div>
  )
}
