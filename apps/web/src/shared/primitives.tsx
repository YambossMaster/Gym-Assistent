import type { ReactNode } from 'react'
import { useDialogBehavior } from './useDialogBehavior'
import { RequiredFieldLabel } from './FormFieldLabel'

export function Page({
  title,
  eyebrow,
  description,
  actions,
  beforeHeader,
  className,
  children
}: {
  title: string
  eyebrow?: string
  description?: string
  actions?: ReactNode
  beforeHeader?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`page${className ? ` ${className}` : ''}`}>
      {beforeHeader}
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
    <div className="brand" aria-label="FORM Coach Desk">
      <img className="brand-logo" src="/brand/form-horizontal.png" alt="" />
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
  confirmLabel = '永久刪除',
  confirmOnDelete = false,
  tone = 'danger'
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
  confirmOnDelete?: boolean
  tone?: 'danger' | 'neutral'
}) {
  const requiresText = onConfirmationChange !== undefined
  const canConfirm = !disabled && (!requiresText || confirmation === requiredWord)
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onCancel, {
    focusDialog: true,
    onDeleteShortcut: canConfirm && (confirmOnDelete || requiresText) ? onConfirm : undefined
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
            <RequiredFieldLabel>輸入 {requiredWord} 以確認</RequiredFieldLabel>
            <input
              value={confirmation}
              onChange={(event) => onConfirmationChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Delete' || event.nativeEvent.isComposing || !canConfirm) return
                event.preventDefault()
                event.stopPropagation()
                onConfirm()
              }}
            />
          </label>
        )}
        <div className="danger-confirmation-actions">
          <button
            className="secondary-button ui-action-cancel"
            disabled={disabled}
            onClick={onCancel}
            aria-keyshortcuts="Escape"
          >
            取消
          </button>
          <button
            className={
              tone === 'neutral'
                ? 'primary-button compact'
                : 'danger-confirm-button ui-action-delete'
            }
            disabled={!canConfirm}
            onClick={onConfirm}
            aria-keyshortcuts={requiresText || confirmOnDelete ? 'Delete' : undefined}
          >
            {disabled ? '處理中…' : confirmLabel}
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
