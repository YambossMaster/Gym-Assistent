import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  LoaderCircle,
  TriangleAlert
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { validateCheckoutUrl } from './lemon-overlay'
import {
  formatDate,
  formatMoney,
  intervalName,
  tierName,
  type BillingGateway,
  type CheckoutIntent,
  type OpenCheckout,
  type Quote
} from './types'
import './checkout.css'
import { planAccessKey } from '../../../beta-admission/usePlanAccess'

/** The intent is resumed, never recreated, after checkout has started. */
export function PaymentStatusPage({
  accountId,
  gateway,
  intent,
  quote,
  openCheckout,
  autoOpen = false,
  onComplete,
  onBack
}: {
  accountId: string
  gateway: BillingGateway
  intent: CheckoutIntent
  quote?: Quote
  openCheckout: OpenCheckout
  autoOpen?: boolean
  onComplete: () => void
  onBack: () => void
}) {
  const client = useQueryClient()
  const [windowError, setWindowError] = useState(false)
  const [opening, setOpening] = useState(false)
  const [checkedMessage, setCheckedMessage] = useState('')
  const attempted = useRef(false)
  const status = useQuery({
    queryKey: ['billing', accountId, 'intent', intent.id],
    queryFn: () => gateway.intent(intent.id),
    retry: false,
    refetchInterval: (query) => (query.state.data?.status === 'confirmed' ? false : 2500)
  })
  const current = status.data ?? intent
  const confirmed = current.status === 'confirmed' ? current : null
  let recoveryUrl: string | null = null
  if (current.status === 'open') {
    try {
      recoveryUrl = validateCheckoutUrl(current.url)
    } catch {
      // An invalid provider URL must never become a navigation target.
    }
  }
  const open = useCallback(
    async (next: CheckoutIntent) => {
      if (next.status !== 'open') return
      setWindowError(false)
      setOpening(true)
      try {
        await openCheckout(next.url, () => {
          void client.invalidateQueries({ queryKey: ['billing', accountId, 'intent', next.id] })
        })
      } catch {
        setWindowError(true)
      } finally {
        setOpening(false)
      }
    },
    [accountId, client, openCheckout]
  )
  useEffect(() => {
    if (!autoOpen || attempted.current || intent.status !== 'open') return
    attempted.current = true
    void open(intent)
  }, [autoOpen, intent, open])
  const finish = () => {
    void client.invalidateQueries({ queryKey: ['billing', accountId] })
    void client.invalidateQueries({ queryKey: planAccessKey(accountId) })
    onComplete()
  }
  const checkResult = async () => {
    setCheckedMessage('正在向付款服務查詢…')
    const result = await status.refetch()
    if (result.isError) {
      setCheckedMessage('這次查詢失敗，請稍後再試。')
    } else if (result.data?.status === 'confirmed') {
      setCheckedMessage('訂閱已確認。')
    } else {
      setCheckedMessage(
        result.data?.status === 'open'
          ? '已查詢：這筆付款尚未完成，可繼續原付款。'
          : '已查詢：付款結果尚未確認，請稍後再查詢。'
      )
    }
  }
  const title = confirmed
    ? `${tierName(quote?.tier ?? 'basic')} ${confirmed.activation === 'trial' ? '體驗已開始' : '訂閱已啟用'}`
    : windowError
      ? '付款視窗未能開啟'
      : current.status === 'open'
        ? '付款尚未完成'
        : '正在確認你的訂閱'
  return (
    <div className="checkout-page payment-status-page">
      <div className="checkout-topbar">
        <img src="/brand/form-horizontal-on-light.png" alt="FORM Coach Desk" />
        <button className="billing-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" /> 返回方案與帳單
        </button>
      </div>
      <main className="payment-status-main" aria-live="polite">
        <div
          className={`payment-status-mark${confirmed ? ' is-confirmed' : ''}${windowError ? ' is-error' : ''}`}
        >
          {confirmed ? (
            <Check aria-hidden="true" />
          ) : windowError ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <LoaderCircle aria-hidden="true" />
          )}
        </div>
        <span className="eyebrow dark">FORM MEMBERSHIP</span>
        <h1>{title}</h1>
        <p className="payment-status-lead">
          {confirmed
            ? '你的方案已啟用，可在方案與帳單管理續訂。'
            : windowError
              ? '訂閱尚未完成。請重新開啟同一筆付款，無須再次訂閱。'
              : current.status === 'pending'
                ? '付款已送出，正在等待確認。你可以在此查詢結果。'
                : '關閉付款視窗只會暫停操作。你可以繼續這筆付款；重新選方案不會取消它。'}
        </p>
        {quote && (
          <dl className="payment-status-facts">
            <div>
              <dt>訂閱方案</dt>
              <dd>
                {tierName(quote.tier)} · {intervalName(quote.interval)}繳
              </dd>
            </div>
            {confirmed && (
              <div>
                <dt>今天付款</dt>
                <dd>{formatMoney(quote.today)}</dd>
              </div>
            )}
            <div>
              <dt>{quote.trial ? '預計首次扣款' : '本次付款'}</dt>
              <dd>
                {quote.trial && quote.chargeAt ? `${formatDate(quote.chargeAt)} ` : ''}
                <small>{formatMoney(quote.trial ? quote.renewal : quote.today)}</small>
              </dd>
            </div>
          </dl>
        )}
        {status.isError && !confirmed && (
          <p className="payment-status-alert" role="alert">
            暫時無法查詢訂閱結果。這筆結帳仍可繼續，請稍後重新查詢。
          </p>
        )}
        <div className="payment-status-actions">
          {confirmed ? (
            <button className="primary-button" onClick={finish}>
              完成，查看我的方案 <ArrowRight aria-hidden="true" />
            </button>
          ) : current.status === 'open' ? (
            <button
              className="primary-button"
              disabled={opening || !recoveryUrl}
              onClick={() => void open(current)}
            >
              {opening ? '正在開啟付款視窗…' : windowError ? '重新開啟付款視窗' : '繼續付款'}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={status.isFetching}
              onClick={() => void checkResult()}
            >
              {status.isFetching ? '正在查詢…' : '查詢訂閱結果'} <ArrowRight aria-hidden="true" />
            </button>
          )}
          {!confirmed && current.status === 'open' && (
            <div
              className={`payment-status-secondary-actions${windowError && recoveryUrl ? ' has-fallback' : ''}`}
            >
              {windowError && recoveryUrl && (
                <a
                  className="payment-status-fallback"
                  href={recoveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="在新分頁完成這筆付款"
                >
                  新分頁付款 <ExternalLink aria-hidden="true" />
                </a>
              )}
              <button
                className="payment-status-refresh"
                disabled={status.isFetching}
                onClick={() => void checkResult()}
              >
                查詢付款結果
              </button>
            </div>
          )}
        </div>
        {!confirmed && checkedMessage && (
          <p className="payment-status-check" role="status">
            {checkedMessage}
          </p>
        )}
      </main>
    </div>
  )
}
