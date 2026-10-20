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
import {
  clearProviderSubmitted,
  markProviderSubmitted,
  validateCheckoutUrl,
  wasProviderSubmitted
} from './lemon-overlay'
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
  assumeSubmitted = false,
  onComplete,
  onBack
}: {
  accountId: string
  gateway: BillingGateway
  intent: CheckoutIntent
  quote?: Quote
  openCheckout: OpenCheckout
  autoOpen?: boolean
  assumeSubmitted?: boolean
  onComplete: () => void
  onBack: () => void
}) {
  const client = useQueryClient()
  const [windowError, setWindowError] = useState(false)
  const [opening, setOpening] = useState(false)
  const [providerSubmitted, setProviderSubmitted] = useState(
    () => assumeSubmitted || wasProviderSubmitted(accountId, intent.id)
  )
  const attempted = useRef(false)
  const status = useQuery({
    queryKey: ['billing', accountId, 'intent', intent.id],
    queryFn: () => gateway.intent(intent.id),
    retry: false,
    refetchInterval: (query) =>
      ['confirmed', 'abandoned'].includes(query.state.data?.status ?? '') ? false : 2500
  })
  const current = status.data ?? intent
  const confirmed = current.status === 'confirmed' ? current : null
  const abandoned = current.status === 'abandoned'
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
        await openCheckout(
          next.url,
          () => {
            markProviderSubmitted(accountId, next.id)
            void gateway.submitted(next.id).catch(() => {
              // Provider reconciliation remains authoritative.
            })
            setProviderSubmitted(true)
            void client.invalidateQueries({ queryKey: ['billing', accountId, 'intent', next.id] })
          },
          undefined,
          { accountId, intentId: next.id }
        )
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
    clearProviderSubmitted(accountId, intent.id)
    void client.invalidateQueries({ queryKey: ['billing', accountId] })
    void client.invalidateQueries({ queryKey: planAccessKey(accountId) })
    onComplete()
  }
  const awaitingConfirmation = current.status === 'pending' || providerSubmitted
  const title = confirmed
    ? `${tierName(quote?.tier ?? 'basic')} ${confirmed.activation === 'trial' ? '體驗已開始' : '訂閱已啟用'}`
    : abandoned
      ? '這筆結帳已逾期'
      : status.isError
        ? '暫時無法確認付款狀態'
        : windowError && !providerSubmitted
          ? '付款視窗未能開啟'
          : !awaitingConfirmation
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
        <p
          className="payment-status-lead"
          role={status.isError && !confirmed ? 'alert' : undefined}
        >
          {confirmed
            ? '你的方案已啟用，可在方案與帳單管理續訂。'
            : abandoned
              ? '這筆 Lemon 結帳已失效，沒有完成訂閱。可返回方案重新選擇。'
              : status.isError
                ? '目前無法讀取最新結果。若已完成 Lemon 結帳，請勿再次付款。'
                : windowError && !providerSubmitted
                  ? '訂閱尚未完成。請重新開啟同一筆付款，無須再次訂閱。'
                  : awaitingConfirmation
                    ? '正在確認這筆結帳，結果會自動更新。請勿再次付款。'
                    : '若尚未完成 Lemon 結帳，可返回同一筆付款。若已完成，請勿再次付款；結果會自動更新。'}
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
        <div className="payment-status-actions">
          {confirmed ? (
            <button className="primary-button" onClick={finish}>
              完成，查看我的方案 <ArrowRight aria-hidden="true" />
            </button>
          ) : abandoned ? (
            <button className="primary-button" onClick={onBack}>
              返回方案選擇 <ArrowRight aria-hidden="true" />
            </button>
          ) : status.isError ? (
            <button
              className="primary-button"
              disabled={status.isFetching}
              onClick={() => void status.refetch()}
            >
              {status.isFetching ? '正在查詢…' : '重試查詢'} <ArrowRight aria-hidden="true" />
            </button>
          ) : current.status === 'open' && !providerSubmitted ? (
            <button
              className="primary-button"
              disabled={opening || !recoveryUrl}
              onClick={() => void open(current)}
            >
              {opening ? '正在開啟付款視窗…' : windowError ? '重新開啟付款視窗' : '返回同一筆結帳'}
              <ArrowRight aria-hidden="true" />
            </button>
          ) : null}
          {!confirmed && !status.isError && current.status === 'open' && !providerSubmitted && (
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
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
