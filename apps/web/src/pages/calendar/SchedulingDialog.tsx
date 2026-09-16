import { useEffect, useRef, type ReactNode } from 'react'

export function SchedulingDialog({
  title,
  description,
  onClose,
  children
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const first = dialog?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]'
    )
    requestAnimationFrame(() => first?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        requestAnimationFrame(() => openerRef.current?.focus())
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
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      requestAnimationFrame(() => openerRef.current?.focus())
    }
  }, [])

  return (
    <div
      className="scheduling-dialog-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className="scheduling-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scheduling-dialog-title"
      >
        <header>
          <div>
            <span className="eyebrow dark">課程安排</span>
            <h2 id="scheduling-dialog-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
