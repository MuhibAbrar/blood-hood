interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon = '🩸', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-[#111111] mb-2">{title}</h3>
      {description && <p className="text-[#555555] text-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}
