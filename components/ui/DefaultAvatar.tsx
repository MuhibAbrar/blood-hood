interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other' | ''
  size?: number
  className?: string
}

export default function DefaultAvatar({ gender, size = 80, className = '' }: DefaultAvatarProps) {
  const isFemale = gender === 'female'

  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, background: isFemale ? '#e8d5f5' : '#d0e8ff' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {isFemale ? (
          // Female silhouette
          <>
            {/* Head */}
            <circle cx="50" cy="33" r="16" fill="#b07cc6" />
            {/* Hair */}
            <ellipse cx="50" cy="22" rx="17" ry="10" fill="#7b4fa6" />
            <ellipse cx="34" cy="33" rx="4" ry="9" fill="#7b4fa6" />
            <ellipse cx="66" cy="33" rx="4" ry="9" fill="#7b4fa6" />
            {/* Body / dress */}
            <path
              d="M28 75 Q30 55 50 52 Q70 55 72 75 Z"
              fill="#b07cc6"
            />
            {/* Neck */}
            <rect x="44" y="47" width="12" height="8" rx="3" fill="#c9a0dc" />
          </>
        ) : (
          // Male silhouette
          <>
            {/* Head */}
            <circle cx="50" cy="34" r="16" fill="#6aaee8" />
            {/* Short hair top */}
            <ellipse cx="50" cy="21" rx="16" ry="7" fill="#3a7abf" />
            {/* Body / shirt */}
            <path
              d="M26 78 Q28 56 50 53 Q72 56 74 78 Z"
              fill="#3a7abf"
            />
            {/* Neck */}
            <rect x="44" y="48" width="12" height="7" rx="3" fill="#6aaee8" />
            {/* Collar */}
            <path d="M44 55 L50 62 L56 55" stroke="#2a5a9a" strokeWidth="2" fill="none" />
          </>
        )}
      </svg>
    </div>
  )
}
