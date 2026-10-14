import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'

type ShortcutState = 'hidden' | 'down' | 'up'

export const MOBILE_CHROME_PIN_FOR_SHORTCUT = 'mobile-chrome-pin-for-shortcut'

export function MobilePwaScrollShortcut({
  itemCount,
  bottomTargetRef
}: {
  itemCount: number
  bottomTargetRef?: RefObject<HTMLElement | null>
}) {
  const [state, setState] = useState<ShortcutState>('hidden')

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 720px)')
    const standalone = window.matchMedia('(display-mode: standalone)')
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
    const localPreview =
      import.meta.env.DEV ||
      (import.meta.env.PROD && ['localhost', '127.0.0.1'].includes(window.location.hostname))
    let frame = 0

    const update = () => {
      const scrollRange =
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
        window.innerHeight
      if (
        itemCount < 5 ||
        !compact.matches ||
        (!standalone.matches && !iosStandalone && !localPreview) ||
        scrollRange < window.innerHeight / 2
      ) {
        setState('hidden')
        return
      }
      const pastMiddle = window.scrollY >= scrollRange / 2
      setState(
        bottomTargetRef ? (pastMiddle ? 'up' : 'down') : window.scrollY > 120 ? 'up' : 'hidden'
      )
    }
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    const mediaCleanups = [compact, standalone].map((media) => {
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', scheduleUpdate)
        return () => media.removeEventListener('change', scheduleUpdate)
      }
      if (typeof media.addListener === 'function') {
        media.addListener(scheduleUpdate)
        return () => media.removeListener(scheduleUpdate)
      }
      return () => undefined
    })
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      mediaCleanups.forEach((cleanup) => cleanup())
      observer.disconnect()
    }
  }, [bottomTargetRef, itemCount])

  if (state === 'hidden') return null

  const label = state === 'down' ? '直達本月收支與場地管理' : '回到頁面頂部'
  return (
    <button
      className="mobile-pwa-scroll-shortcut"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        if (state === 'down') window.dispatchEvent(new Event(MOBILE_CHROME_PIN_FOR_SHORTCUT))
        const target = bottomTargetRef?.current
        const headerHeight =
          document.querySelector('.mobile-header')?.getBoundingClientRect().height ?? 0
        const top =
          state === 'down' && target
            ? target.getBoundingClientRect().top + window.scrollY - headerHeight - 12
            : 0
        window.scrollTo({
          top,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth'
        })
      }}
    >
      {state === 'down' ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
    </button>
  )
}
