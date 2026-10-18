import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { useDialogBehavior } from '../../../shared/useDialogBehavior'
import { paymentFeeNotice, paymentRules } from './payment-copy'

export function BillingDialog({
  title,
  children,
  onClose,
  actions,
  className = '',
  headerIcon
}: {
  title: string
  children: ReactNode
  onClose: () => void
  actions?: ReactNode
  className?: string
  headerIcon?: ReactNode
}) {
  const titleId = useId()
  const { dialogRef, onBackdropPointerDown } = useDialogBehavior(onClose, { focusDialog: true })
  return (
    <div className="billing-backdrop" onPointerDown={onBackdropPointerDown}>
      <section
        className={`billing-dialog ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        <header>
          {headerIcon}
          <h2 id={titleId}>{title}</h2>
          <button className="billing-icon-button" aria-label="關閉" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="billing-dialog-body" data-dialog-scroll-region>
          {children}
        </div>
        <footer>
          {actions ?? (
            <button className="primary-button compact" onClick={onClose}>
              我知道了
            </button>
          )}
        </footer>
      </section>
    </div>
  )
}

export function PaymentNoticeContent() {
  return (
    <>
      <div className="billing-rules">
        <section>
          <h3>帳單金額可能略有不同</h3>
          <p>{paymentFeeNotice}實際金額以信用卡帳單為準。</p>
        </section>
        {paymentRules.map((rule) => (
          <section key={rule.title}>
            <h3>{rule.title}</h3>
            <p>{rule.text}</p>
          </section>
        ))}
        <section>
          <h3>手續費與換匯說明</h3>
          <p>
            Lemon Squeezy
            將交易換算為美元處理。信用卡帳單依發卡行匯率與國外交易費計算，本站不另加收訂閱處理費。
          </p>
        </section>
      </div>
    </>
  )
}

export function PaymentNotice({ onClose }: { onClose: () => void }) {
  return (
    <BillingDialog title="付款須知" onClose={onClose}>
      <PaymentNoticeContent />
    </BillingDialog>
  )
}
