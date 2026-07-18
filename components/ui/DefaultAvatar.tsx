interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other' | ''
  size?: number
  className?: string
}

export default function DefaultAvatar({ gender, size = 80, className = '' }: DefaultAvatarProps) {
  const isFemale = gender === 'female'

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={isFemale ? 'Female profile avatar' : 'Male profile avatar'}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="male-avatar-bg" x1="16" y1="8" x2="86" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EAF5FF" />
            <stop offset="1" stopColor="#B9DCFF" />
          </linearGradient>
          <linearGradient id="male-avatar-shirt" x1="50" y1="55" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3487DB" />
            <stop offset="1" stopColor="#1459A3" />
          </linearGradient>
          <linearGradient id="female-avatar-bg" x1="16" y1="8" x2="86" y2="94" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F8EEFF" />
            <stop offset="1" stopColor="#E2C8F3" />
          </linearGradient>
          <linearGradient id="female-avatar-dress" x1="50" y1="57" x2="50" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B879D0" />
            <stop offset="1" stopColor="#7B4FA6" />
          </linearGradient>
          <filter id="avatar-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.16" />
          </filter>
        </defs>

        <circle cx="50" cy="50" r="50" fill={isFemale ? 'url(#female-avatar-bg)' : 'url(#male-avatar-bg)'} />
        <circle cx="82" cy="18" r="17" fill="#FFFFFF" fillOpacity="0.25" />
        <circle cx="17" cy="77" r="22" fill="#FFFFFF" fillOpacity="0.16" />

        {isFemale ? (
          <g filter="url(#avatar-shadow)">
            {/* Hair behind the face */}
            <path d="M30 43C30 24 38 15 50 15C63 15 71 25 70 44L68 61H32L30 43Z" fill="#62407F" />
            <path d="M28 78C30 62 38 55 50 55C63 55 71 63 73 78V100H27L28 78Z" fill="url(#female-avatar-dress)" />
            <path d="M43 51H57V63C53 67 47 67 43 63V51Z" fill="#EDBCA5" />
            <ellipse cx="50" cy="37" rx="15.5" ry="18" fill="#F2C7B2" />
            {/* Side-swept hair and soft facial details */}
            <path d="M34 35C34 22 41 17 51 17C61 17 67 24 67 34C59 34 51 29 47 24C44 30 39 33 34 35Z" fill="#724992" />
            <path d="M34 34C31 42 32 51 36 57" stroke="#62407F" strokeWidth="5" strokeLinecap="round" />
            <path d="M66 34C69 42 68 51 64 57" stroke="#62407F" strokeWidth="5" strokeLinecap="round" />
            <circle cx="44" cy="39" r="1.35" fill="#53334F" />
            <circle cx="56" cy="39" r="1.35" fill="#53334F" />
            <path d="M46 47C48.5 49 51.5 49 54 47" stroke="#B76578" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M42 61L50 69L58 61" stroke="#E9D1F3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : (
          <g filter="url(#avatar-shadow)">
            <path d="M27 79C29 63 37 55 50 55C63 55 71 63 73 79V100H27V79Z" fill="url(#male-avatar-shirt)" />
            <path d="M43 50H57V63C53 67 47 67 43 63V50Z" fill="#DDA88C" />
            <ellipse cx="50" cy="36" rx="16" ry="18.5" fill="#E7B395" />
            {/* Defined short hairstyle */}
            <path d="M33 35C31 25 37 16 48 15C59 13 68 21 67 33C59 31 52 26 48 22C45 28 39 33 33 35Z" fill="#183F6B" />
            <path d="M34 31C32 37 33 42 35 45" stroke="#183F6B" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M66 31C68 37 67 42 65 45" stroke="#183F6B" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="44" cy="38" r="1.35" fill="#263849" />
            <circle cx="56" cy="38" r="1.35" fill="#263849" />
            <path d="M46 47C48.5 48.5 51.5 48.5 54 47" stroke="#A45F52" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M41 60L50 69L59 60" fill="#F4F9FF" />
            <path d="M50 69V86" stroke="#0F4C8E" strokeWidth="2" />
          </g>
        )}

        <circle cx="50" cy="50" r="48.5" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="3" />
      </svg>
    </div>
  )
}
