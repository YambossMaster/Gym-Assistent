import { useEffect, useState } from 'react'
import { MOBILE_CHROME_PIN_FOR_SHORTCUT } from '../shared/MobilePwaScrollShortcut'
import {
  createMobileChromeScrollState,
  shouldAutoHideMobileChrome,
  updateMobileChromeScrollState
} from './mobile-chrome'

export function useMobileChromeScroll(pathname: string) {
  const enabled = shouldAutoHideMobileChrome(pathname)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(false)
    if (!enabled) return

    const mobileQuery = window.matchMedia('(max-width: 720px)')
    let scrollState = createMobileChromeScrollState(window.scrollY)
    let pinnedForShortcut = false
    const reset = () => {
      pinnedForShortcut = false
      scrollState = createMobileChromeScrollState(window.scrollY)
      setHidden(false)
    }
    const pinForShortcut = () => {
      pinnedForShortcut = true
      scrollState = createMobileChromeScrollState(window.scrollY)
      setHidden(false)
    }
    const releaseShortcutPin = () => {
      if (!pinnedForShortcut) return
      pinnedForShortcut = false
      scrollState = createMobileChromeScrollState(window.scrollY)
    }
    const onScroll = () => {
      if (!mobileQuery.matches) {
        reset()
        return
      }
      if (pinnedForShortcut) {
        scrollState = createMobileChromeScrollState(window.scrollY)
        setHidden(false)
        return
      }
      scrollState = updateMobileChromeScrollState(scrollState, window.scrollY)
      setHidden((current) => (current === scrollState.hidden ? current : scrollState.hidden))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener(MOBILE_CHROME_PIN_FOR_SHORTCUT, pinForShortcut)
    window.addEventListener('pointerdown', releaseShortcutPin, true)
    window.addEventListener('touchstart', releaseShortcutPin, { passive: true })
    window.addEventListener('wheel', releaseShortcutPin, { passive: true })
    window.addEventListener('keydown', releaseShortcutPin)
    mobileQuery.addEventListener('change', reset)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener(MOBILE_CHROME_PIN_FOR_SHORTCUT, pinForShortcut)
      window.removeEventListener('pointerdown', releaseShortcutPin, true)
      window.removeEventListener('touchstart', releaseShortcutPin)
      window.removeEventListener('wheel', releaseShortcutPin)
      window.removeEventListener('keydown', releaseShortcutPin)
      mobileQuery.removeEventListener('change', reset)
    }
  }, [pathname, enabled])

  return enabled ? (hidden ? 'hidden' : 'visible') : 'pinned'
}
