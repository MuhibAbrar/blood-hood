'use client'

import TopBar from '@/components/layout/TopBar'
import EmptyState from '@/components/shared/EmptyState'

export default function NotificationsPage() {
  return (
    <div>
      <TopBar title="নোটিফিকেশন" back />
      <div className="px-4 py-4">
        <EmptyState
          icon="🔔"
          title="কোনো নোটিফিকেশন নেই"
          description="নতুন রক্তের অনুরোধ বা আপডেট হলে এখানে দেখাবে"
        />
      </div>
    </div>
  )
}
