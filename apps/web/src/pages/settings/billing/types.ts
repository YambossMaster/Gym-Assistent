export type PaidTier = 'basic' | 'advanced'
export type BillingInterval = 'month' | 'year'
export type Selection = { tier: PaidTier; interval: BillingInterval }
export type Money = { amount: number; currency: string }
export type Quote = {
  id: string
  expiresAt: string
  termsVersion: string
  tier: PaidTier
  interval: BillingInterval
  today: Money
  renewal: Money
  trial: 'one_month' | null
  chargeAt: string | null
}
export type CheckoutIntent =
  | { id: string; status: 'open'; url: string }
  | { id: string; status: 'pending' }
  | { id: string; status: 'confirmed'; activation: 'trial' | 'paid' }
export type Invoice = {
  id: string
  number: string
  createdAt: string
  description: string
  period: string | null
  status: 'paid' | 'pending' | 'void' | 'refunded' | 'partial_refund'
  total: Money
  refunded: Money
  receiptAvailable: boolean
}
export type BillingSnapshot = {
  pendingCheckout?: boolean
  pendingPaidChange?: boolean
  subscription: null | {
    tier: PaidTier
    interval: BillingInterval
    status: 'trial' | 'active' | 'cancelled' | 'past_due'
    endsAt: string
    renewal: Money
    scheduledChange?: {
      tier: PaidTier
      interval: BillingInterval
      effectiveAt: string
    }
  }
  invoices: Invoice[]
}
export type PaidChangePreview = {
  id: string
  tier: PaidTier
  interval: BillingInterval
  estimate: Money
  expiresAt: string
}
/** Implement with authenticated HTTP; never use browser facts as payment authority. */
export interface BillingGateway {
  quote(selection: Selection & { code?: string }, signal: AbortSignal): Promise<Quote>
  begin(input: { quoteId: string; termsVersion: string }): Promise<CheckoutIntent>
  intent(id: string): Promise<CheckoutIntent>
  billing(signal: AbortSignal): Promise<BillingSnapshot>
  cancel(): Promise<void>
  changeTrial(selection: Selection): Promise<{ status: 'confirmed' | 'unchanged' }>
  previewPaid(selection: Selection): Promise<PaidChangePreview>
  confirmPaid(previewId: string): Promise<{ status: 'pending' }>
  receipt(invoiceId: string): Promise<string>
}
export type OpenCheckout = (url: string, onProviderSuccess: () => void) => Promise<void>
export const tierName = (tier: PaidTier) => (tier === 'basic' ? 'Pro' : 'Prime')
export const intervalName = (interval: BillingInterval) => (interval === 'month' ? '月' : '年')
export const formatMoney = (money: Money) =>
  `${money.currency === 'TWD' ? 'NT$' : money.currency === 'USD' ? 'US$' : money.currency + ' '}${new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 }).format(money.amount / 100)}`
export const formatDate = (instant: string) =>
  new Date(instant).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
