import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'

const dialogStack: symbol[] = []
let scrollLockCount = 0
let scrollLockPriorOverflow = ''
let rootScrollLockPriorOverflow = ''

function lockPageScroll() {
  if (scrollLockCount === 0) {
    scrollLockPriorOverflow = document.body.style.overflow
    rootScrollLockPriorOverflow = document.documentElement.style.overflow
    // `hidden` creates a scroll container and breaks the desktop sidebar's sticky position.
    document.body.style.overflow = 'clip'
    document.documentElement.style.overflow = 'clip'
  }
  scrollLockCount += 1
}

function unlockPageScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = scrollLockPriorOverflow
    document.documentElement.style.overflow = rootScrollLockPriorOverflow
  }
}

function updateDialogScrollCue(dialog: HTMLElement) {
  const preferred = dialog.querySelector<HTMLElement>('[data-dialog-scroll-region]')
  const candidates = preferred
    ? [preferred]
    : [
        ...dialog.querySelectorAll<HTMLElement>(
          '.scheduling-form-body, .settings-export-form-body, .finance-form-fields, .finance-ledger-fields, .student-series-fields, .purchase-edit-fields, .venue-course-edit-fields, .definition-editor-fields, .ui-settings-dialog-content'
        )
      ]
  if (dialog.scrollHeight > dialog.clientHeight + 2) candidates.push(dialog)
  const region = candidates.find((candidate) => candidate.scrollHeight > candidate.clientHeight + 2)
  if (!region) {
    dialog.classList.remove('ui-dialog-has-more')
    return
  }
  const hasMore = region.scrollHeight - region.scrollTop - region.clientHeight > 2
  dialog.classList.toggle('ui-dialog-has-more', hasMore)
  const dialogRect = dialog.getBoundingClientRect()
  const regionRect = region.getBoundingClientRect()
  dialog.style.setProperty(
    '--ui-scroll-cue-left',
    `${Math.max(0, regionRect.left - dialogRect.left)}px`
  )
  dialog.style.setProperty(
    '--ui-scroll-cue-right',
    `${Math.max(0, dialogRect.right - regionRect.right)}px`
  )
  dialog.style.setProperty(
    '--ui-scroll-cue-bottom',
    `${Math.max(0, dialogRect.bottom - regionRect.bottom)}px`
  )
}

export function useModalScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lockPageScroll()
    return unlockPageScroll
  }, [active])
}

export function useDialogBehavior(
  onClose: () => void,
  {
    submitOnEnter = false,
    focusDialog = false,
    lockScroll = true,
    onDeleteShortcut
  }: {
    submitOnEnter?: boolean
    focusDialog?: boolean
    lockScroll?: boolean
    onDeleteShortcut?: () => void
  } = {}
) {
  const dialogRef = useRef<HTMLElement>(null)
  const tokenRef = useRef(Symbol('dialog'))
  const lastFormRef = useRef<HTMLFormElement | null>(null)
  const restoreFocusFrameRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  const onDeleteShortcutRef = useRef(onDeleteShortcut)
  onCloseRef.current = onClose
  onDeleteShortcutRef.current = onDeleteShortcut
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
    if (lockScroll) lockPageScroll()
    if (focusDialog) dialogRef.current?.focus()
    const dialog = dialogRef.current
    const updateCue = () => {
      if (dialog) updateDialogScrollCue(dialog)
    }
    const cueFrame = requestAnimationFrame(updateCue)
    dialog?.addEventListener('scroll', updateCue, true)
    window.addEventListener('resize', updateCue)
    const cueResizeObserver =
      dialog && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCue) : null
    if (dialog) {
      cueResizeObserver?.observe(dialog)
      dialog
        .querySelectorAll<HTMLElement>('[data-dialog-scroll-region], .ui-settings-dialog-content')
        .forEach((region) => cueResizeObserver?.observe(region))
    }
    const cueMutationObserver =
      dialog && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => requestAnimationFrame(updateCue))
        : null
    if (dialog) cueMutationObserver?.observe(dialog, { childList: true, subtree: true })
    const keydown = (event: KeyboardEvent) => {
      if (dialogStack.at(-1) !== token || event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key === 'Delete' && onDeleteShortcutRef.current) {
        const target = event.target
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement &&
            target.closest('button, [role="listbox"], [contenteditable="true"]'))
        )
          return
        event.preventDefault()
        onDeleteShortcutRef.current()
        return
      }
      if (event.key === 'Enter' && submitOnEnter && (event.ctrlKey || event.metaKey)) {
        const form = dialogRef.current?.querySelector('form')
        if (form) {
          event.preventDefault()
          form.requestSubmit()
        }
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
      if (lockScroll) unlockPageScroll()
      window.removeEventListener('keydown', keydown)
      cancelAnimationFrame(cueFrame)
      dialog?.removeEventListener('scroll', updateCue, true)
      window.removeEventListener('resize', updateCue)
      cueResizeObserver?.disconnect()
      cueMutationObserver?.disconnect()
      restoreFocusFrameRef.current = requestAnimationFrame(() => {
        // A replacement dialog may already own focus when this deferred cleanup runs.
        if (
          !(
            document.activeElement instanceof HTMLElement &&
            document.activeElement.closest('[role="dialog"]')
          ) &&
          openerRef.current?.isConnected
        )
          openerRef.current.focus({ preventScroll: true })
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
