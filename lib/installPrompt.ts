// Shared install prompt — captured as early as possible in the root layout and
// consumed from every install button in the app.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __bloodHoodInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

let _prompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _prompt = e as BeforeInstallPromptEvent
    window.__bloodHoodInstallPrompt = _prompt
    window.dispatchEvent(new Event('bloodhood:installprompt'))
  })
  window.addEventListener('appinstalled', () => {
    _prompt = null
    window.__bloodHoodInstallPrompt = null
  })
}

export const getInstallPrompt = () => {
  if (typeof window === 'undefined') return null
  return window.__bloodHoodInstallPrompt ?? _prompt
}

function showInstallFallback(): void {
  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isFacebookBrowser = /FBAN|FBAV|Instagram/i.test(ua)

  if (isAndroid && isFacebookBrowser) {
    const fallbackUrl = encodeURIComponent(window.location.href)
    const path = `${window.location.host}${window.location.pathname}${window.location.search}`
    window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallbackUrl};end`
    return
  }

  if (isIOS) {
    window.alert('iPhone-এ ইনস্টল করতে Safari-তে খুলুন, তারপর Share (□↑) চাপুন এবং “Add to Home Screen” নির্বাচন করুন।')
    return
  }

  if (isAndroid) {
    window.alert('Browser-এর ⋮ মেনু চাপুন, তারপর “Install app” অথবা “Add to Home screen” নির্বাচন করুন।')
    return
  }

  window.alert('Browser-এর address bar-এর Install icon অথবা menu থেকে “Install Blood Hood” নির্বাচন করুন।')
}

export const triggerInstall = async (): Promise<boolean> => {
  if (isStandalonePWA()) return true

  const prompt = getInstallPrompt()
  if (!prompt) {
    showInstallFallback()
    return false
  }

  try {
    await prompt.prompt()
    const result = await prompt.userChoice
    return result.outcome === 'accepted'
  } catch {
    showInstallFallback()
    return false
  } finally {
    // A BeforeInstallPromptEvent can only be prompted once, even when the user
    // dismisses it. Keeping it makes later buttons look broken.
    if (_prompt === prompt) _prompt = null
    if (window.__bloodHoodInstallPrompt === prompt) {
      window.__bloodHoodInstallPrompt = null
    }
  }
}

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}
