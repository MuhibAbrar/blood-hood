importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

// Service Worker-এ env vars কাজ করে না, তাই hardcode করতে হয়
firebase.initializeApp({
  apiKey: 'AIzaSyBvjuVfrvTQynZE5CP1GfALbWmnekfJow0',
  authDomain: 'blood-hood-f4e66.firebaseapp.com',
  projectId: 'blood-hood-f4e66',
  storageBucket: 'blood-hood-f4e66.firebasestorage.app',
  messagingSenderId: '213153511112',
  appId: '1:213153511112:web:29d42995ab973a9cdc57fd',
})

const messaging = firebase.messaging()

// Background notification (app বন্ধ থাকলে)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  if (!title) return
  self.registration.showNotification(title, {
    body: body ?? '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data ?? {},
    vibrate: [200, 100, 200],
  })
})

// Notification click → app খুলবে
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.link ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
