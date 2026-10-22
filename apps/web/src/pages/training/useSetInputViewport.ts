import { useLayoutEffect, useRef, type RefObject } from 'react'
import { getSetInputFocusAdjustment } from './set-input-navigation'

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
  const enabled = input !== null && window.matchMedia('(max-width: 720px)').matches

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!enabled || !workspace) return
    const viewport = window.visualViewport
    const root = document.documentElement
    const body = document.body
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
    let settle: ReturnType<typeof setTimeout> | undefined
    let blurCheck: ReturnType<typeof setTimeout> | undefined
    let height = viewport?.height ?? window.innerHeight
    let top = viewport?.offsetTop ?? 0
    const place = (target: HTMLInputElement) => {
      pending = target
      if (!keyboardSeen) return
      clearTimeout(settle)
      pending = null
      const rect = target.getBoundingClientRect()
      const delta = getSetInputFocusAdjustment({
        inputTop: rect.top,
        inputBottom: rect.bottom,
        visibleTop: top + 12,
        visibleBottom: top + height - 88
      })
      if (Math.abs(delta) > 2) workspace.scrollTop += delta
    }
    const cancel = () => {
      pending = null
      clearTimeout(settle)
    }
    const update = () => {
      height = viewport?.height ?? window.innerHeight
      top = viewport?.offsetTop ?? 0
      const open = layoutHeight - height > 120
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
      keyboardSeen ||= open
      workspace.style.setProperty('--session-input-top', `${top}px`)
      workspace.style.setProperty('--session-input-height', `${height}px`)
      // Internal padding, never document padding; the final row can reach the
      // same anchor as the first without moving the keyboard's containing page.
      workspace.style.setProperty('--session-keyboard-space', `${Math.ceil(height)}px`)
      if (pending && keyboardSeen) {
        clearTimeout(settle)
        settle = setTimeout(() => {
          if (pending && document.activeElement === pending) place(pending)
        }, 100)
      }
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
    const checkAfterBlur = () => {
      clearTimeout(blurCheck)
      // focusout precedes focusin. Inspect the settled DOM focus, including
      // native dismissal whose viewport resize arrived before this blur.
      blurCheck = setTimeout(update, 0)
    }
    workspace.addEventListener('focusout', checkAfterBlur)
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
      workspace.removeEventListener('focusout', checkAfterBlur)
      workspace.removeEventListener('touchmove', cancel)
      workspace.removeEventListener('wheel', cancel)
      const restoreY = originalY + workspace.scrollTop + originalTop - top
      root.classList.remove('is-session-set-editing')
      Object.assign(body.style, bodyStyles)
      workspace.scrollTop = 0
      for (const property of [
        '--session-input-top',
        '--session-input-height',
        '--session-keyboard-space'
      ])
        workspace.style.removeProperty(property)
      window.scrollTo({ top: Math.max(0, restoreY), behavior: 'instant' })
    }
  }, [enabled, workspaceRef])

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
