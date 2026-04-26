import { getMessagingInstance } from './firebase'
import { getToken, onMessage } from 'firebase/messaging'

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })
    return token
  } catch {
    return null
  }
}

export const onForegroundMessage = async (callback: (payload: unknown) => void) => {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
