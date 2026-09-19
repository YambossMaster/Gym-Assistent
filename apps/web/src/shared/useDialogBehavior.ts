import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

const dialogStack: symbol[] = []

export function useDialogBehavior(
  onClose: () => void,
  { submitOnEnter = false, focusDialog = false, lockScroll = true } = {}
) {
  const dialogRef = useRef<HTMLElement>(null)
  const tokenRef = useRef(Symbol('dialog'))
  const lastFormRef = useRef<HTMLFormElement | null>(null)
  const restoreFocusFrameRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    if (restoreFocusFrameRef.current !== null) {
      cancelAnimationFrame(restoreFocusFrameRef.current)
      restoreFocusFrameRef.current = null
    }
    const token = tokenRef.current
    dialogStack.push(token)
    const priorOverflow = document.body.style.overflow
    if (lockScroll) document.body.style.overflow = 'hidden'
    if (focusDialog) dialogRef.current?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== token || event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Enter' || !submitOnEnter) return
      const target = event.target
      if (
        target instanceof HTMLInputElement &&
        !['button', 'submit', 'checkbox', 'radio'].includes(target.type)
      ) {
        event.preventDefault()
        lastFormRef.current = target.form
        target.blur()
      } else if (
        !(target instanceof HTMLElement && target.closest('a, textarea, [contenteditable="true"]'))
      ) {
        const form =
          (lastFormRef.current?.isConnected ? lastFormRef.current : null) ??
          dialogRef.current?.querySelector('form')
        if (form) {
          event.preventDefault()
          form.requestSubmit()
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      const index = dialogStack.indexOf(token)
      if (index !== -1) dialogStack.splice(index, 1)
      if (lockScroll) document.body.style.overflow = priorOverflow
      window.removeEventListener('keydown', keydown)
      restoreFocusFrameRef.current = requestAnimationFrame(() => {
        if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true })
        restoreFocusFrameRef.current = null
      })
    }
  }, [focusDialog, lockScroll, submitOnEnter])

  return {
    dialogRef,
    onBackdropPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.target === event.currentTarget && dialogStack.at(-1) === tokenRef.current)
        onCloseRef.current()
    }
  }
}
