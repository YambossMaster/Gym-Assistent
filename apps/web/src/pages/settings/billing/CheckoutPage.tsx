import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CircleCheck, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { localBillingServiceEnabled } from '../../../config'
import { paymentFeeNotice } from './payment-copy'
import { catalogPrice } from './catalog'
import { billingQuoteKey, billingQuoteStaleTime } from './quote-query'
import {
  formatDate,
  formatMoney,
  intervalName,
  tierName,
  type BillingGateway,
  type CheckoutIntent,
  type Quote,
  type Selection
} from './types'
import './billing.css'
import './checkout.css'

const messages: Record<string, string> = {
  billing_unavailable: '付款服務尚未就緒，請稍後再試。',
  terms_changed: '條款已更新，請重新讀取並確認。',
  checkout_pending: '已有一筆結帳正在處理，請重新讀取以繼續原結帳。',
  existing_offer: '目前的體驗資格仍有效，請到方案與帳單查看。',
  permanent_access: '你的帳號已有永久資格，無須另行訂閱。',
  quote_expired: '金額或條件已更新，請重新確認後再繼續。',
  already_subscribed: '你已有訂閱，請返回方案與帳單查看。'
}
function readableError(error: unknown) {
  return error instanceof Error && messages[error.message]
    ? messages[error.message]
    : '暫時無法完成，請稍後再試。'
}

export function CheckoutPage({
  accountId,
  email,
  gateway,
  initialSelection,
  initialIntent,
  initialQuote,
  preparationOnly = false,
  onStarted,
  onBack,
  termsHref = '/terms',
  privacyHref = '/privacy',
  noticeHref = '/payment-notice'
}: {
  accountId: string
  email: string
  gateway: BillingGateway
  initialSelection: Selection
  initialIntent?: CheckoutIntent
  initialQuote?: Quote
  preparationOnly?: boolean
  onStarted: (intent: CheckoutIntent, quote: Quote) => void
  onBack: () => void
  termsHref?: string
  privacyHref?: string
  noticeHref?: string
}) {
  const [selection, setSelection] = useState(initialSelection)
  const [consentQuote, setConsentQuote] = useState<string | null>(null)
  const [intent, setIntent] = useState<CheckoutIntent | null>(
    preparationOnly ? null : (initialIntent ?? null)
  )
  const [expired, setExpired] = useState(false)
  const starting = useRef(false)
  const quoteQuery = useQuery({
    queryKey: billingQuoteKey(accountId, selection),
    queryFn: ({ signal }) => gateway.quote(selection, signal),
    retry: false,
    staleTime: billingQuoteStaleTime,
    refetchOnWindowFocus: false,
    enabled: !preparationOnly && !intent
  })
  const lastQuote = useRef<Quote | undefined>(initialQuote)
  if (quoteQuery.data) lastQuote.current = quoteQuery.data
  const quote = preparationOnly ? undefined : (quoteQuery.data ?? lastQuote.current)
  const displayedTier = quote?.tier ?? selection.tier
  const displayPrice = preparationOnly ? catalogPrice(selection) : quote?.renewal
  useEffect(() => {
    if (!quote) return
    const ms = Date.parse(quote.expiresAt) - Date.now()
    setExpired(ms <= 0)
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, ms))
    return () => window.clearTimeout(timer)
  }, [quote])
  const begin = useMutation({
    mutationFn: (input: { quoteId: string; termsVersion: string }) => gateway.begin(input),
    onSuccess: (next) => {
      setIntent(next)
      if (quote) onStarted(next, quote)
    },
    onError: () => {
      starting.current = false
      setConsentQuote(null)
    }
  })
  const change = (next: Selection) => {
    if (intent || begin.isPending) return
    setConsentQuote(null)
    begin.reset()
    if (next.tier !== selection.tier || next.interval !== selection.interval)
      lastQuote.current = undefined
    setSelection(next)
  }
  const refreshQuote = () => {
    setConsentQuote(null)
    void quoteQuery.refetch()
  }
  const checkoutIssue = preparationOnly
    ? '目前不會扣款或變更你的方案。'
    : intent
      ? '訂閱正在確認中，請勿重複付款。'
      : quoteQuery.isFetching
        ? '正在更新金額，完成後即可繼續。'
        : quoteQuery.isError
          ? readableError(quoteQuery.error)
          : expired
            ? '訂閱金額已逾時，請更新後重新確認。'
            : !quote
              ? '正在取得訂閱金額…'
              : ''
  const canStart = Boolean(
    quote &&
      !preparationOnly &&
      consentQuote === quote.id &&
      !quoteQuery.isFetching &&
      !quoteQuery.isError &&
      !expired &&
      !intent &&
      !begin.isPending &&
      quote.tier === selection.tier &&
      quote.interval === selection.interval
  )
  const subscribe = () => {
    if (!canStart || !quote || starting.current) return
    if (Date.parse(quote.expiresAt) <= Date.now()) {
      setExpired(true)
      setConsentQuote(null)
      return
    }
    starting.current = true
    begin.mutate({ quoteId: quote.id, termsVersion: quote.termsVersion })
  }
  return (
    <div className="checkout-page">
      <div className="checkout-topbar">
        <img src="/brand/form-horizontal-on-light.png" alt="FORM Coach Desk" />
        <button className="billing-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          返回方案選擇
        </button>
      </div>
      <header className="checkout-heading">
        <span className="eyebrow dark">FORM MEMBERSHIP</span>
        <h1>確認你的訂閱</h1>
        <p>
          {preparationOnly
            ? '支付功能尚未開放，可先查看方案與付款須知。'
            : '確認方案與收費安排，接著完成付款設定。'}
        </p>
      </header>
      <div className="billing-checkout-grid">
        <div className="billing-checkout-main">
          <section
            className="settings-plan-card is-prime checkout-selected-plan"
            aria-label="選定方案"
          >
            <div className="settings-plan-card-heading">
              <span className="settings-plan-card-tag">你的方案</span>
              <span className="settings-plan-current-badge">
                {intervalName(selection.interval)}繳方案
              </span>
            </div>
            <h2>{tierName(displayedTier)}</h2>
            <p className="settings-plan-card-subtitle">
              {displayedTier === 'basic'
                ? '為成長中的教練工作台擴充空間'
                : '讓完整的教練工作流程，集中在同一個地方'}
            </p>
            <div className="settings-plan-price">
              {displayPrice ? (
                <>
                  <strong>{formatMoney(displayPrice)}</strong>
                  <small>／{intervalName(selection.interval)}</small>
                </>
              ) : (
                <strong>讀取中…</strong>
              )}
            </div>
            <div className="checkout-period" role="group" aria-label="付款週期">
              {(['month', 'year'] as const).map((interval) => (
                <button
                  key={interval}
                  aria-pressed={selection.interval === interval}
                  onClick={() => change({ ...selection, interval })}
                  disabled={begin.isPending || Boolean(intent)}
                >
                  {interval === 'month' ? '月繳' : '年繳'}
                  {interval === 'year' && <span>省 2 個月</span>}
                </button>
              ))}
            </div>
            <ul className="settings-plan-features">
              {(displayedTier === 'basic'
                ? ['最多 15 名學員', '無限場地數量', '本月收支與成長軌跡']
                : ['不限學員與場地', '包含 Pro 的所有功能', '收支報表', '行事曆整合']
              ).map((feature) => (
                <li key={feature}>
                  <CircleCheck aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            {!intent && (
              <>
                <button
                  className="checkout-change-plan"
                  onClick={onBack}
                  disabled={begin.isPending}
                >
                  變更方案 <ArrowRight aria-hidden="true" />
                </button>
              </>
            )}
          </section>
          <div className="checkout-renewal-note">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>可隨時取消續訂</strong>
              <p>
                {quote?.trial || preparationOnly
                  ? '可於體驗期間取消續訂，將保留體驗資格至期限結束。期限結束後將不進行扣款。'
                  : '取消後不再續訂扣款，方案可使用至目前期限結束。'}
              </p>
            </div>
          </div>
        </div>
        <aside
          className="billing-summary checkout-confirmation"
          aria-label="訂閱摘要"
          aria-busy={quoteQuery.isFetching}
        >
          <header>
            <h2>訂閱明細</h2>
            <p>
              {tierName(quote?.tier ?? selection.tier)} ·{' '}
              {intervalName(quote?.interval ?? selection.interval)}繳
            </p>
          </header>
          <div className="billing-summary-body">
            <div>
              <div className="checkout-account-fields">
                <section className="billing-section">
                  <div className="billing-section-title">
                    <h2>訂閱帳號</h2>
                  </div>
                  <p className="billing-account">{email}</p>
                  <p className="billing-muted">方案將啟用於這個帳號。</p>
                </section>
              </div>
              {preparationOnly ? (
                <>
                  <dl>
                    <div>
                      <dt>訂閱費用</dt>
                      <dd>
                        {formatMoney(catalogPrice(selection))}／{intervalName(selection.interval)}
                      </dd>
                    </div>
                    <div>
                      <dt>付款週期</dt>
                      <dd>{selection.interval === 'year' ? '每年一次' : '每月一次'}</dd>
                    </div>
                  </dl>
                  <div className="billing-due checkout-unavailable">
                    <span>付款狀態</span>
                    <strong>尚未開放</strong>
                  </div>
                  <p className="billing-schedule">
                    首次訂閱可享 1 個月免費體驗；實際扣款日期與金額會在正式結帳時確認。
                  </p>
                </>
              ) : quote ? (
                <>
                  <dl>
                    <div>
                      <dt>訂閱費用</dt>
                      <dd>
                        {formatMoney(quote.renewal)}／{intervalName(quote.interval)}
                      </dd>
                    </div>
                    {quote.trial && (
                      <div>
                        <dt>免費體驗</dt>
                        <dd>1 個月</dd>
                      </div>
                    )}
                    <div>
                      <dt>{quote.trial ? '預計首次扣款' : '本次扣款'}</dt>
                      <dd>
                        {quote.trial && quote.chargeAt ? `${formatDate(quote.chargeAt)} · ` : ''}
                        {formatMoney(quote.renewal)}
                      </dd>
                    </div>
                  </dl>
                  <div className="billing-due">
                    <span>今天應付</span>
                    <strong>{formatMoney(quote.today)}</strong>
                  </div>
                </>
              ) : (
                <p role="status">
                  {quoteQuery.isError ? '請先重新取得訂閱資訊。' : '正在取得訂閱資訊…'}
                </p>
              )}
              <div className="billing-consent">
                <input
                  id="billing-consent"
                  type="checkbox"
                  checked={
                    preparationOnly
                      ? consentQuote === 'preparation'
                      : Boolean(quote && consentQuote === quote.id)
                  }
                  disabled={(!preparationOnly && !quote) || Boolean(intent) || begin.isPending}
                  aria-describedby="checkout-feedback"
                  onChange={(event) =>
                    setConsentQuote(
                      event.target.checked
                        ? preparationOnly
                          ? 'preparation'
                          : (quote?.id ?? null)
                        : null
                    )
                  }
                />
                <label htmlFor="billing-consent">
                  我已閱讀並同意
                  <Link to={noticeHref} target="_blank" rel="noopener">
                    付款須知
                  </Link>
                  、
                  <Link to={privacyHref} target="_blank" rel="noopener">
                    隱私權政策
                  </Link>
                  以及
                  <Link to={termsHref} target="_blank" rel="noopener">
                    服務條款
                  </Link>
                  。
                </label>
              </div>
              {import.meta.env.DEV && localBillingServiceEnabled && !preparationOnly && (
                <p className="billing-schedule" role="note">
                  測試付款請使用測試卡 4242 4242 4242 4242、未來到期日與任意三位安全碼。
                  請勿輸入真實信用卡。付款視窗由 Lemon Squeezy 提供，欄位會顯示簡體中文。
                </p>
              )}
              <button
                className="primary-button billing-submit"
                disabled={!canStart}
                onClick={subscribe}
              >
                {preparationOnly
                  ? '訂閱尚未開放'
                  : begin.isPending
                    ? '正在準備結帳…'
                    : quote?.trial
                      ? '設定付款方式，開始體驗'
                      : '付款並訂閱'}
                <ArrowRight aria-hidden="true" />
              </button>
              <div className="checkout-feedback" id="checkout-feedback" aria-live="polite">
                {begin.isError ? (
                  <span role="alert">{readableError(begin.error)}</span>
                ) : (
                  checkoutIssue
                )}
                {!intent && (expired || quoteQuery.isError) && (
                  <button
                    className="billing-text-link"
                    onClick={refreshQuote}
                    disabled={quoteQuery.isFetching}
                  >
                    更新資訊
                  </button>
                )}
              </div>
              <p className="billing-fee-copy">{paymentFeeNotice}詳情請查看付款須知。</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
