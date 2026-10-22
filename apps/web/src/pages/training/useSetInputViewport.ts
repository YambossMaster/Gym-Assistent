import { useLayoutEffect, useRef, type RefObject } from 'react'
import {
  getSetInputDockInset,
  getSetInputFocusAdjustment,
  getSetInputScrollAdjustment
} from './set-input-navigation'

/** Own one keyboard session, including focus handoff before the browser focuses a hidden field. */
export function useSetInputViewport(
  workspaceRef: RefObject<HTMLElement | null>,
  input: HTMLInputElement | null
) {
  const geometry = useRef<{
    layoutHeight: number
    visualHeight: number
    scrollSpace: number
  } | null>(null)
  const preparedInput = useRef<HTMLInputElement | null>(null)
  const prepareFocus = useRef<(next: HTMLInputElement) => void>(() => {})
  const cancelPlacement = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    if (!input || !window.matchMedia('(max-width: 720px)').matches) {
      geometry.current = null
      preparedInput.current = null
      prepareFocus.current = () => {}
      cancelPlacement.current = () => {}
      workspace.style.setProperty('--session-keyboard-inset', '0px')
      workspace.style.setProperty('--session-keyboard-space', '0px')
      return
    }
    const viewport = window.visualViewport
    let firstFocus = geometry.current === null
    geometry.current ??= {
      layoutHeight: document.documentElement.clientHeight || window.innerHeight,
      visualHeight: viewport?.height ?? window.innerHeight,
      scrollSpace: 88
    }
    const session = geometry.current
    let aligned = preparedInput.current === input
    preparedInput.current = null
    let dockFrame = 0
    let alignmentFrame = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const positionDock = () => {
      cancelAnimationFrame(dockFrame)
      dockFrame = requestAnimationFrame(() => {
        if (!input.isConnected) return
        // clientHeight describes the CSS layout viewport. iOS innerHeight can
        // temporarily shrink to visualViewport.height during a scroll gesture.
        const layoutHeight = document.documentElement.clientHeight || session.layoutHeight
        // The installed PWA has no collapsing browser toolbar. Retain the open
        // keyboard's smallest height instead of treating drag transients as closure.
        session.visualHeight = Math.min(session.visualHeight, viewport?.height ?? layoutHeight)
        const inset = getSetInputDockInset({
          layoutHeight,
          visualHeight: session.visualHeight,
          visualOffsetTop: viewport?.offsetTop ?? 0
        })
        workspace.style.setProperty('--session-keyboard-inset', `${inset}px`)
        if (session.layoutHeight - session.visualHeight > 120) {
          session.scrollSpace = Math.max(
            session.scrollSpace,
            Math.ceil(session.layoutHeight - Math.min(180, session.visualHeight * 0.4) + 48)
          )
        }
        workspace.style.setProperty('--session-keyboard-space', `${session.scrollSpace}px`)
      })
    }
    const scrollInput = (target: HTMLInputElement, align: boolean) => {
      const dock = workspace.querySelector<HTMLElement>('.set-input-advance-dock')
      const rect = target.getBoundingClientRect()
      const top = viewport?.offsetTop ?? 0
      const bottom = top + session.visualHeight
      const bounds = {
        inputTop: rect.top,
        inputBottom: rect.bottom,
        visibleTop: top + 12,
        visibleBottom: Math.min(bottom, dock?.getBoundingClientRect().top ?? bottom) - 12
      }
      const delta = align ? getSetInputFocusAdjustment(bounds) : getSetInputScrollAdjustment(bounds)
      if (delta) window.scrollBy({ top: delta, behavior: 'instant' })
    }
    const scheduleAlignment = () => {
      if (aligned) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        alignmentFrame = requestAnimationFrame(() => {
          if (!input.isConnected || document.activeElement !== input) return
          aligned = true
          scrollInput(input, firstFocus)
        })
      }, 160)
    }
    // Reveal before focus. The next field is already clear of the keyboard when
    // WebKit focuses/selects it, so there is no delayed second page correction.
    prepareFocus.current = (next) => {
      clearTimeout(timer)
      cancelAnimationFrame(alignmentFrame)
      aligned = true
      scrollInput(next, false)
      preparedInput.current = next
    }
    const onViewportChange = () => {
      positionDock()
      scheduleAlignment()
    }
    const onManualScroll = () => {
      aligned = true
      clearTimeout(timer)
      cancelAnimationFrame(alignmentFrame)
    }
    cancelPlacement.current = onManualScroll
    const onOrientationChange = () => {
      session.layoutHeight = document.documentElement.clientHeight || window.innerHeight
      session.visualHeight = viewport?.height ?? session.layoutHeight
      session.scrollSpace = 88
      firstFocus = true
      aligned = false
      onViewportChange()
    }
    positionDock()
    scheduleAlignment()
    viewport?.addEventListener('resize', onViewportChange)
    viewport?.addEventListener('scroll', onViewportChange)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', positionDock)
    window.addEventListener('orientationchange', onOrientationChange)
    workspace.addEventListener('touchmove', onManualScroll, { passive: true })
    workspace.addEventListener('wheel', onManualScroll, { passive: true })
    return () => {
      prepareFocus.current = () => {}
      cancelPlacement.current = () => {}
      cancelAnimationFrame(dockFrame)
      cancelAnimationFrame(alignmentFrame)
      clearTimeout(timer)
      viewport?.removeEventListener('resize', onViewportChange)
      viewport?.removeEventListener('scroll', onViewportChange)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', positionDock)
      window.removeEventListener('orientationchange', onOrientationChange)
      workspace.removeEventListener('touchmove', onManualScroll)
      workspace.removeEventListener('wheel', onManualScroll)
    }
  }, [input, workspaceRef])

  return {
    prepareFocus: (next: HTMLInputElement) => prepareFocus.current(next),
    cancelPlacement: () => cancelPlacement.current()
  }
}
