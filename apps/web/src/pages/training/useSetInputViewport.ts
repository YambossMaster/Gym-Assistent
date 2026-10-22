import { useLayoutEffect, useRef, type RefObject } from 'react'
import { getSetInputFocusAdjustment } from './set-input-navigation'
import { settleSetInputDismissal } from './set-input-dismissal'

// One scroll owner for the entire keyboard session. Field changes never release
// the document lock or recreate the viewport listeners.
export function useSetInputViewport(
  workspaceRef: RefObject<HTMLElement | null>,
  input: HTMLInputElement | null,
  onKeyboardClose: () => void
) {
  const activeInput = useRef(input)
  activeInput.current = input
  const close = useRef(onKeyboardClose)
  close.current = onKeyboardClose
  const controller = useRef<{
    place: (target: HTMLInputElement) => void
    cancel: () => void
  } | null>(null)
  const prepared = useRef<HTMLInputElement | null>(null)
  const restingHeight = useRef(document.documentElement.clientHeight || window.innerHeight)
  const restingSpace = useRef<{ workspace: HTMLElement; margin: string } | null>(null)
  const stopDismissal = useRef<(() => void) | null>(null)
  const enabled = input !== null && window.matchMedia('(max-width: 720px)').matches

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!enabled || !workspace) return
    stopDismissal.current?.()
    stopDismissal.current = null
    const viewport = window.visualViewport
    const root = document.documentElement
    const body = document.body
    if (!restingSpace.current)
      restingSpace.current = { workspace, margin: workspace.style.marginBottom }
    const originalY = window.scrollY
    const originalTop = workspace.getBoundingClientRect().top
    const bodyStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width
    }
    const layoutHeight = restingHeight.current
    let keyboardSeen = false
    let pending: HTMLInputElement | null = activeInput.current
    let lastInput = activeInput.current
    let settle: ReturnType<typeof setTimeout> | undefined
    let blurCheck: ReturnType<typeof setTimeout> | undefined
    let height = viewport?.height ?? window.innerHeight
    let top = viewport?.offsetTop ?? 0
    const align = (target: HTMLInputElement) => {
      if (!keyboardSeen || layoutHeight - height <= 120) return
      const rect = target.getBoundingClientRect()
      const dockTop = workspace
        .querySelector('.set-input-advance-dock')
        ?.getBoundingClientRect().top
      const delta = getSetInputFocusAdjustment({
        inputTop: rect.top,
        inputBottom: rect.bottom,
        visibleTop: top + 12,
        visibleBottom: dockTop && dockTop > top ? dockTop - 24 : top + height - 88
      })
      if (Math.abs(delta) > 2) workspace.scrollTop += delta
    }
    // Native focus can scroll *after* focus()/click, including after the first
    // keyboard resize. Retain the focus intent until a manual scroll cancels it;
    // recheck on geometry/scroll events and once after settling, never in a polling loop.
    const recheck = () => {
      clearTimeout(settle)
      if (!pending) return
      if (document.activeElement === pending) align(pending)
      settle = setTimeout(() => {
        if (pending && document.activeElement === pending) align(pending)
      }, 100)
    }
    const place = (target: HTMLInputElement) => {
      lastInput = target
      pending = target
      align(target)
      recheck()
    }
    const cancel = () => {
      pending = null
      clearTimeout(settle)
    }
    const update = () => {
      const nextHeight = viewport?.height ?? window.innerHeight
      const nextTop = viewport?.offsetTop ?? 0
      const open = layoutHeight - nextHeight > 120
      // Geometry alone does not end an editing session. A viewport expansion
      // can arrive while the next field still owns focus. Dropping React's
      // target here leaves that input focused with no way to reopen the dock.
      const focused = document.activeElement
      const setInputFocused =
        focused instanceof HTMLInputElement &&
        workspace.contains(focused) &&
        focused.matches('.training-set-card input')
      if (keyboardSeen && !open && !setInputFocused) {
        close.current()
        return
      }
      // A focused full-height sample during handoff is not a new keyboard edge.
      // Keep the last open geometry until blur or a real open-keyboard sample.
      if (keyboardSeen && !open && setInputFocused) {
        top = nextTop
        workspace.style.setProperty('--session-input-top', `${top}px`)
        recheck()
        return
      }
      height = nextHeight
      top = nextTop
      keyboardSeen ||= open
      workspace.style.setProperty('--session-input-top', `${top}px`)
      workspace.style.setProperty('--session-input-height', `${height}px`)
      // Internal padding, never document padding; the final row can reach the
      // same anchor as the first without moving the keyboard's containing page.
      workspace.style.setProperty('--session-keyboard-space', `${Math.ceil(height)}px`)
      recheck()
    }
    update()
    root.classList.add('is-session-set-editing')
    body.style.position = 'fixed'
    body.style.top = `${-originalY}px`
    body.style.width = '100%'
    // Preserve the content position while changing the scroll owner.
    workspace.scrollTop = Math.max(0, -originalTop + top)
    controller.current = { place, cancel }
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    const checkAfterBlur = () => {
      clearTimeout(blurCheck)
      // focusout precedes focusin. Inspect the settled DOM focus, including
      // native dismissal whose viewport resize arrived before this blur.
      blurCheck = setTimeout(update, 0)
    }
    workspace.addEventListener('focusout', checkAfterBlur)
    workspace.addEventListener('scroll', recheck, { passive: true })
    workspace.addEventListener('touchmove', cancel, { passive: true })
    workspace.addEventListener('wheel', cancel, { passive: true })
    return () => {
      cancel()
      clearTimeout(blurCheck)
      controller.current = null
      prepared.current = null
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
      workspace.removeEventListener('focusout', checkAfterBlur)
      workspace.removeEventListener('scroll', recheck)
      workspace.removeEventListener('touchmove', cancel)
      workspace.removeEventListener('wheel', cancel)
      // The viewport lock belongs to this effect, not React's focused class.
      // Read the last content position before releasing it. Otherwise removing
      // overflow resets scrollTop before cleanup and jumps back to the entry row.
      const anchor = workspace.querySelector<HTMLInputElement>('input:focus') ?? lastInput
      const anchorTop = anchor?.isConnected ? anchor.getBoundingClientRect().top - top : null
      const restoreY = originalY + workspace.scrollTop + originalTop - top
      // Dismissal must not bring a sticky heading back over the row that was
      // just edited. It remains in normal flow and can be reached by scrolling up.
      workspace.dataset.setInputResting = 'true'
      root.classList.remove('is-session-set-editing')
      Object.assign(body.style, bodyStyles)
      workspace.scrollTop = 0
      for (const property of [
        '--session-input-top',
        '--session-input-height',
        '--session-keyboard-space'
      ])
        workspace.style.removeProperty(property)
      const restore = () => {
        if (!workspace.isConnected || (anchor && !anchor.isConnected)) return false
        const destination = Math.max(
          0,
          anchorTop !== null && anchor?.isConnected
            ? window.scrollY +
                anchor.getBoundingClientRect().top -
                anchorTop -
                (viewport?.offsetTop ?? 0)
            : restoreY
        )
        // Keep the existing minimum tail range; this is not space reclamation.
        const missing = Math.max(0, destination + layoutHeight - root.scrollHeight)
        if (missing > 0)
          workspace.style.marginBottom = `${(parseFloat(getComputedStyle(workspace).marginBottom) || 0) + missing}px`
        if (Math.abs(window.scrollY - destination) > 1)
          window.scrollTo({ top: destination, behavior: 'instant' })
        return true
      }
      restore()
      if (anchorTop !== null && !workspace.classList.contains('is-note-tab'))
        stopDismissal.current = settleSetInputDismissal(viewport, layoutHeight, restore)
    }
  }, [enabled, workspaceRef])

  useLayoutEffect(
    () => () => {
      stopDismissal.current?.()
      if (restingSpace.current) {
        restingSpace.current.workspace.style.marginBottom = restingSpace.current.margin
        delete restingSpace.current.workspace.dataset.setInputResting
      }
    },
    []
  )
  useLayoutEffect(() => {
    if (!input) return
    if (prepared.current === input) prepared.current = null
    else controller.current?.place(input)
  }, [input])

  return {
    placeInput: (target: HTMLInputElement) => controller.current?.place(target),
    prepareFocus: (next: HTMLInputElement) => {
      controller.current?.place(next)
      prepared.current = next
    },
    cancelPlacement: () => controller.current?.cancel()
  }
}
