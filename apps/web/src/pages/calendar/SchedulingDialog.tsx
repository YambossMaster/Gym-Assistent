import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useDialogBehavior } from '../../shared/useDialogBehavior'

export function SchedulingDialog({
  title,
  description,
  eyebrow = 'FORM / ACTION',
  titleAction,
  onClose,
  onDelete,
  variant,
  children
}: {
  title: string
  description?: string
  eyebrow?: string
  titleAction?: ReactNode
  onClose: () => void
  onDelete?: () => void
  variant?: 'quick' | 'block' | 'session-edit' | 'series' | 'performance' | 'profile'
  children: ReactNode
}) {
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, {
    submitOnEnter: true,
    focusDialog: true
  })
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
  }, [title])

  useEffect(() => {
    const dialog = dialogRef.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Delete' &&
        !event.defaultPrevented &&
        !event.isComposing &&
        onDeleteRef.current &&
        dialog?.contains(document.activeElement) &&
        !(
          event.target instanceof HTMLElement &&
          event.target.closest(
            'input, textarea, select, button, [role="listbox"], [contenteditable="true"]'
          )
        )
      ) {
        event.preventDefault()
        onDeleteRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'
        )
      ]
      if (!focusable.length) return
      const firstItem = focusable[0]!
      const lastItem = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="scheduling-dialog-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`scheduling-dialog ui-settings-dialog${variant ? ` ${variant}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduling-dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">{eyebrow}</span>
            {titleAction ? (
              <div className="scheduling-dialog-title-line">
                <h2 id="scheduling-dialog-title">{title}</h2>
                {titleAction}
              </div>
            ) : (
              <h2 id="scheduling-dialog-title">{title}</h2>
            )}
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
