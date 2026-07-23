'use client'

import { useEffect } from 'react'

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [data-allow-context-menu]'))
}

export default function NativeAppGuards() {
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      || document.referrer.startsWith('android-app://')

    if (!isStandalone) return

    document.body.classList.add('native-app')

    const preventContextMenu = (event: MouseEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault()
    }
    const preventDrag = (event: DragEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault()
    }

    document.addEventListener('contextmenu', preventContextMenu)
    document.addEventListener('dragstart', preventDrag)

    return () => {
      document.body.classList.remove('native-app')
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('dragstart', preventDrag)
    }
  }, [])

  return null
}
