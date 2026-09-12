import { useEffect, useRef, type ReactNode } from 'react'

export function Page({
  title,
  eyebrow,
  description,
  actions,
  children
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="page">
      <header className="page-header reveal">
        <div>
          {eyebrow && <span className="eyebrow dark">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">F</span>
      <span>
        FORM<small>COACH DESK</small>
      </span>
    </div>
  )
}

export function Confirmation({
  title,
  text,
  confirmation,
  onConfirmationChange,
  onCancel,
  onConfirm,
  disabled
}: {
  title: string
  text: string
  confirmation?: string
  onConfirmationChange?: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
}) {
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        requestAnimationFrame(() => openerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])
  const cancel = () => {
    onCancel()
    requestAnimationFrame(() => openerRef.current?.focus())
  }
  const requiresText = onConfirmationChange !== undefined
  return (
    <div className="danger-confirmation">
      <section className="danger-confirmation-card" role="alertdialog" aria-modal="true">
        <h2>{title}</h2>
        <p>{text}</p>
        {requiresText && (
          <label>
            輸入 DELETE 以確認
            <input
              value={confirmation}
              onChange={(event) => onConfirmationChange(event.target.value)}
              autoFocus
            />
          </label>
        )}
        <div className="danger-confirmation-actions">
          <button className="secondary-button" disabled={disabled} onClick={cancel}>
            取消
          </button>
          <button
            className="danger-confirm-button"
            disabled={disabled || (requiresText && confirmation !== 'DELETE')}
            onClick={onConfirm}
          >
            永久刪除
          </button>
        </div>
      </section>
    </div>
  )
}

export function SettingsPanelHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="settings-panel-heading">
      <span className="eyebrow dark">{eyebrow}</span>
      <h2>{title}</h2>
    </header>
  )
}
