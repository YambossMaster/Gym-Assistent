import { LegalLayout } from '../../../legal/LegalPages'
import { billingLiveBuildEnabled } from '../../../config'
import { PaymentNoticeContent } from './BillingDialog'
import './billing.css'

export function PaymentNoticePage() {
  return (
    <LegalLayout
      title="付款須知"
      englishTitle="Payment information"
      draft={!billingLiveBuildEnabled}
      billingLive={billingLiveBuildEnabled}
    >
      <PaymentNoticeContent />
    </LegalLayout>
  )
}
