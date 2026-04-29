// Shared install prompt — captured once at module load, used everywhere

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let _prompt: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _prompt = e as BeforeInstallPromptEvent
  })
}

export const getInstallPrompt = () => _prompt

export const triggerInstall = async (): Promise<boolean> => {
  if (!_prompt) return false
  _prompt.prompt()
  const result = await _prompt.userChoice
  if (result.outcome === 'accepted') _prompt = null
  return result.outcome === 'accepted'
}

export const isStandalonePWA = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}
