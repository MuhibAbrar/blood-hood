import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export const NOTIFICATION_RETENTION_DAYS = 30
export const CANCELLED_REQUEST_RETENTION_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

const cutoff = (days: number) => Timestamp.fromMillis(Date.now() - days * DAY_MS)

export async function getRetentionPreview(limit = 500) {
  const db = adminDb()
  const notificationCutoff = cutoff(NOTIFICATION_RETENTION_DAYS)
  const requestCutoff = cutoff(CANCELLED_REQUEST_RETENTION_DAYS)

  const [notificationCount, cancelledSnap] = await Promise.all([
    db.collection('notifications').where('createdAt', '<', notificationCutoff).count().get(),
    db.collection('bloodRequests').where('status', '==', 'cancelled').limit(limit).get(),
  ])

  const oldCancelledRequests = cancelledSnap.docs.filter((doc) => {
    const createdAt = doc.data().createdAt as Timestamp | undefined
    return Boolean(createdAt && createdAt.toMillis() < requestCutoff.toMillis())
  }).length

  return {
    oldNotifications: notificationCount.data().count,
    oldCancelledRequests,
    requestPreviewLimited: cancelledSnap.size === limit,
  }
}

export async function cleanupExpiredData(limit = 400) {
  const db = adminDb()
  const notificationCutoff = cutoff(NOTIFICATION_RETENTION_DAYS)
  const requestCutoff = cutoff(CANCELLED_REQUEST_RETENTION_DAYS)

  const [notificationSnap, cancelledSnap] = await Promise.all([
    db.collection('notifications').where('createdAt', '<', notificationCutoff).limit(limit).get(),
    db.collection('bloodRequests').where('status', '==', 'cancelled').limit(limit).get(),
  ])

  const expiredRequests = cancelledSnap.docs.filter((doc) => {
    const createdAt = doc.data().createdAt as Timestamp | undefined
    return Boolean(createdAt && createdAt.toMillis() < requestCutoff.toMillis())
  })

  const refs = [
    ...notificationSnap.docs.map((doc) => doc.ref),
    ...expiredRequests.map((doc) => doc.ref),
  ].slice(0, limit)

  if (refs.length > 0) {
    const batch = db.batch()
    refs.forEach((ref) => batch.delete(ref))
    await batch.commit()
  }

  return {
    deletedNotifications: Math.min(notificationSnap.size, refs.length),
    deletedCancelledRequests: Math.max(0, refs.length - notificationSnap.size),
    hasMore: notificationSnap.size === limit || cancelledSnap.size === limit,
  }
}
