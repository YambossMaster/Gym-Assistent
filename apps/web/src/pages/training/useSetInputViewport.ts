import { useLayoutEffect, useRef, type RefObject } from 'react'
import { getSetInputFocusAdjustment } from './set-input-navigation'
import { settleSetInputDismissal } from './set-input-dismissal'
import { createSetInputCoordinates, reconcileSetInputGeometry } from './set-input-geometry'

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
    hold: () => void
  } | null>(null)
  const prepared = useRef<HTMLInputElement | null>(null)
  const restingHeight = useRef(document.documentElement.clientHeight || window.innerHeight)
  const restingSpace = useRef<{ workspace: HTMLElement; margin: string } | null>(null)
  const stopDismissal = useRef<(() => void) | null>(null)
  const touchOrigin = useRef<{ x: number; y: number } | null>(null)
  const enabled = input !== null && window.matchMedia('(max-width: 720px)').matches

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    const start = (event: TouchEvent) => {
      const touch = event.touches[0]
      touchOrigin.current = touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    workspace?.addEventListener('touchstart', start, { passive: true })
    return () => workspace?.removeEventListener('touchstart', start)
  }, [workspaceRef])

  useLayoutEffect(() => {
    const workspace = workspaceRef.current
    if (!enabled || !workspace) return
    stopDismissal.current?.()
    stopDismissal.current = null
    const viewport = window.visualViewport
    const root = document.documentElement
    const body = document.body
    const coordinates = createSetInputCoordinates()
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
    let frame = 0
    let disposed = false
    let placementHeight = Infinity
    let placementTop: number | null = null
    let holding = false
    let lastVisible: { input: HTMLInputElement; top: number } | null = null
    let blurCheck: ReturnType<typeof setTimeout> | undefined
    let height = viewport?.height ?? window.innerHeight
    let top = viewport?.offsetTop ?? 0
    const align = (target: HTMLInputElement) => {
      if (!keyboardSeen || layoutHeight - height <= 120) return
      const clientTop = coordinates.clientTop(top)
      const rect = target.getBoundingClientRect()
      const dockTop = workspace
        .querySelector('.set-input-advance-dock')
        ?.getBoundingClientRect().top
      const proposed = getSetInputFocusAdjustment({
        inputTop: rect.top,
        inputBottom: rect.bottom,
        visibleTop: clientTop + 12,
        visibleBottom: dockTop && dockTop > clientTop ? dockTop - 24 : clientTop + height - 88
      })
      // Shrinking the keyboard's available area can require a new anchor.
      // Expansion (including the first frames of native Done) must not push a
      // correctly placed row down and then save that shifted dismissal position.
      if (placementTop === null || height < placementHeight) {
        placementTop = rect.top - clientTop - proposed
        placementHeight = height
      }
      const delta = Math.round(rect.top - clientTop - placementTop)
      if (Math.abs(delta) > 2) workspace.scrollTop += delta
    }
    // Native reveal and viewport properties can commit after their event, or
    // without another event. Observe the active session at paint time, reading
    // fresh geometry; an old event snapshot plus a delayed align is insufficient.
    const recheck = () => {
      const clientTop = coordinates.clientTop(top)
      reconcileSetInputGeometry(workspace, clientTop, height)
      if (pending && document.activeElement === pending && !holding) align(pending)
      else if (
        pending &&
        lastVisible?.input === pending &&
        (holding || !workspace.querySelector('.training-set-card input:focus'))
      ) {
        // Native Done and native Next both pass through a null-focus gap.
        // Preserve the last visible row during that gap without ending the
        // session; an actual manual gesture has already cleared pending.
        const delta = pending.getBoundingClientRect().top - clientTop - lastVisible.top
        if (Math.abs(delta) > 1) workspace.scrollTop += delta
      }
      // Capture while still editing. Native blur can move the scroller before
      // React's cleanup runs; reading for the first time there saves the jump.
      if (lastInput && document.activeElement === lastInput)
        lastVisible = { input: lastInput, top: lastInput.getBoundingClientRect().top - clientTop }
    }
    const place = (target: HTMLInputElement) => {
      holding = false
      if (target.closest('.training-set-card') !== lastInput?.closest('.training-set-card')) {
        placementTop = null
        placementHeight = Infinity
      }
      lastInput = target
      pending = target
      align(target)
      recheck()
    }
    const cancel = () => {
      pending = null
      holding = false
    }
    const hold = () => {
      if (!lastInput?.isConnected) return
      // A dock press is an input action, not a manual scroll. Keep the row
      // where the user sees it throughout pointerdown -> pointerup -> blur.
      // In particular, do not record a late native reveal as the new resting
      // position. A previous manual scroll may have cleared pending, so capture
      // its current position without running focus placement again.
      lastVisible = {
        input: lastInput,
        top: lastInput.getBoundingClientRect().top - coordinates.clientTop(top)
      }
      pending = lastInput
      holding = true
    }
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches?.[0]
      const origin = touchOrigin.current
      // A tap can contain a tiny touchmove. Only intentional movement gives
      // scrolling to the user; otherwise a late keyboard reveal loses its owner.
      if (!touch || !origin || Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > 8)
        cancel()
    }
    const setProperty = (property: string, value: string) => {
      if (workspace.style.getPropertyValue(property) !== value)
        workspace.style.setProperty(property, value)
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
        // React may commit the close after this paint. Apply the closing sample
        // and preserve the row before requesting that state transition.
        height = nextHeight
        top = nextTop
        setProperty('--session-input-top', `${top}px`)
        setProperty('--session-input-height', `${height}px`)
        recheck()
        close.current()
        return
      }
      // A focused full-height sample during handoff is not a new keyboard edge.
      // Keep the last open geometry until blur or a real open-keyboard sample.
      if (keyboardSeen && !open && setInputFocused) {
        top = nextTop
        setProperty('--session-input-top', `${top}px`)
        recheck()
        return
      }
      height = nextHeight
      top = nextTop
      keyboardSeen ||= open
      setProperty('--session-input-top', `${top}px`)
      setProperty('--session-input-height', `${height}px`)
      // Internal padding, never document padding; the final row can reach the
      // same anchor as the first without moving the keyboard's containing page.
      setProperty('--session-keyboard-space', `${Math.ceil(height)}px`)
      recheck()
    }
    update()
    root.classList.add('is-session-set-editing')
    body.style.position = 'fixed'
    body.style.top = `${-originalY}px`
    body.style.width = '100%'
    // Preserve the content position while changing the scroll owner.
    workspace.scrollTop = Math.max(0, -originalTop + coordinates.clientTop(top))
    controller.current = { place, cancel, hold }
    const observe = () => {
      if (disposed) return
      update()
      frame = requestAnimationFrame(observe)
    }
    frame = requestAnimationFrame(observe)
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    const checkAfterBlur = () => {
      // Manual scrolling suspends focus placement, but does not surrender the
      // closing handoff to native reveal. lastVisible already tracks the user's
      // chosen position while focused; preserve that position through the blur
      // gap rather than reading a potentially shifted rectangle after blur.
      if (!pending && lastVisible?.input === lastInput) pending = lastInput
      clearTimeout(blurCheck)
      // focusout precedes focusin. Inspect the settled DOM focus, including
      // native dismissal whose viewport resize arrived before this blur.
      blurCheck = setTimeout(update, 0)
    }
    workspace.addEventListener('focusout', checkAfterBlur)
    workspace.addEventListener('scroll', recheck, { passive: true })
    workspace.addEventListener('touchmove', onTouchMove, { passive: true })
    workspace.addEventListener('wheel', cancel, { passive: true })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
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
      workspace.removeEventListener('touchmove', onTouchMove)
      workspace.removeEventListener('wheel', cancel)
      // The viewport lock belongs to this effect, not React's focused class.
      // Read the last content position before releasing it. Otherwise removing
      // overflow resets scrollTop before cleanup and jumps back to the entry row.
      const anchor = workspace.querySelector<HTMLInputElement>('input:focus') ?? lastInput
      const anchorTop = anchor?.isConnected
        ? lastVisible?.input === anchor
          ? lastVisible.top
          : anchor.getBoundingClientRect().top - coordinates.clientTop(top)
        : null
      const restoreY = originalY + workspace.scrollTop + originalTop - coordinates.clientTop(top)
      // Dismissal must not bring a sticky heading back over the row that was
      // just edited. It remains in normal flow and can be reached by scrolling up.
      workspace.dataset.setInputResting = 'true'
      let released = false
      const release = () => {
        if (released) return
        released = true
        root.classList.remove('is-session-set-editing')
        Object.assign(body.style, bodyStyles)
        workspace.scrollTop = 0
        for (const property of [
          '--session-input-top',
          '--session-input-height',
          '--session-input-shift',
          '--session-dock-shift',
          '--session-keyboard-space'
        ])
          workspace.style.removeProperty(property)
      }
      const restore = () => {
        if (!workspace.isConnected || (anchor && !anchor.isConnected)) return false
        // Keep the current scroll owner while the keyboard is animating away.
        // Releasing fixed layout at blur exposes the document to native reveal,
        // which can paint a jump before its delayed scroll event is delivered.
        if (!released) {
          const closingHeight = viewport?.height ?? window.innerHeight
          const closingTop = viewport?.offsetTop ?? 0
          if (
            anchorTop !== null &&
            anchor &&
            layoutHeight - closingHeight > 2 &&
            !workspace.classList.contains('is-note-tab')
          ) {
            setProperty('--session-input-top', `${closingTop}px`)
            setProperty('--session-input-height', `${closingHeight}px`)
            const clientTop = coordinates.clientTop(closingTop)
            reconcileSetInputGeometry(workspace, clientTop, closingHeight)
            const delta = anchor.getBoundingClientRect().top - clientTop - anchorTop
            if (Math.abs(delta) > 1) workspace.scrollTop += delta
            return true
          }
          release()
        }
        const destination = Math.max(
          0,
          anchorTop !== null && anchor?.isConnected
            ? window.scrollY +
                anchor.getBoundingClientRect().top -
                anchorTop -
                coordinates.clientTop(viewport?.offsetTop ?? 0)
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
        stopDismissal.current = settleSetInputDismissal(
          viewport,
          layoutHeight,
          restore,
          () => {
            if (!released) {
              release()
              restore()
            }
            coordinates.dispose()
          },
          coordinates.originTop
        )
      else {
        release()
        coordinates.dispose()
      }
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
    holdPosition: () => controller.current?.hold(),
    prepareFocus: (next: HTMLInputElement) => {
      controller.current?.place(next)
      prepared.current = next
    },
    cancelPlacement: () => controller.current?.cancel()
  }
}
