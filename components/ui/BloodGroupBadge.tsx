import type { BloodGroup } from '@/types'
import { BLOOD_GROUP_COLORS } from '@/lib/bloodCompatibility'

interface Props {
  group: BloodGroup
  size?: 'sm' | 'md' | 'lg'
}

export default function BloodGroupBadge({ group, size = 'md' }: Props) {
  const color = BLOOD_GROUP_COLORS[group]
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-xs' : size === 'lg' ? 'badge-blood-lg' : 'badge-blood'
  return (
    <span className={`${sizeClass} ${color} inline-flex items-center justify-center rounded-full font-bold shadow-md`}>
      {group}
    </span>
  )
}
