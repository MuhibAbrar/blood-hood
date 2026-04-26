export function DonorCardSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="skeleton w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="skeleton w-16 h-8 rounded-full" />
    </div>
  )
}

export function RequestCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-3 w-20" />
        </div>
      </div>
      <div className="skeleton h-10 rounded-xl" />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card p-4 space-y-2">
      <div className="skeleton h-8 w-12" />
      <div className="skeleton h-3 w-24" />
    </div>
  )
}
