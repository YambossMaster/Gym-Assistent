import type { ReactNode } from 'react'
import { useDialogBehavior } from './useDialogBehavior'

export function Page({
  title,
  eyebrow,
  description,
  actions,
  className,
  children
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`page${className ? ` ${className}` : ''}`}>
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
  disabled,
  requiredWord = 'DELETE',
  confirmLabel = '永久刪除'
}: {
  title: string
  text: string
  confirmation?: string
  onConfirmationChange?: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  disabled: boolean
  requiredWord?: string
  confirmLabel?: string
}) {
  const requiresText = onConfirmationChange !== undefined
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onCancel, {
    focusDialog: true,
    submitOnEnter: true
  })
  return (
    <div className="danger-confirmation" onPointerDown={onBackdropPointerDown}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="danger-confirmation-card"
        role="alertdialog"
        aria-modal="true"
      >
        <h2>{title}</h2>
        <p>{text}</p>
        {requiresText && (
          <label>
            輸入 {requiredWord} 以確認
            <input
              value={confirmation}
              onChange={(event) => onConfirmationChange(event.target.value)}
            />
          </label>
        )}
        <div className="danger-confirmation-actions">
          <button className="secondary-button" disabled={disabled} onClick={onCancel}>
            取消
          </button>
          <button
            className="danger-confirm-button"
            disabled={disabled || (requiresText && confirmation !== requiredWord)}
            onClick={onConfirm}
          >
            {confirmLabel}
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
