import { useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { CheckoutPage } from './CheckoutPage'
import { PaymentStatusPage } from './PaymentStatusPage'
import { formatDate, intervalName, tierName, type CheckoutIntent, type Quote } from './types'
import { createHttpBillingGateway } from './http-gateway'
import { openLemonCheckout } from './lemon-overlay'
import { localBillingServiceEnabled } from '../../../config'

/** Authenticated checkout; the build and API each require an explicit Live switch. */
export default function LocalCheckoutPage({ session }: { session: Session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [started, setStarted] = useState<{ intent: CheckoutIntent; quote: Quote } | null>(null)
  const [search] = useSearchParams()
  const gateway = useMemo(
    () => createHttpBillingGateway(session.access_token),
    [session.access_token]
  )
  const current = useQuery({
    queryKey: ['billing', session.user.id, 'current'],
    queryFn: ({ signal }) => gateway.current(signal),
    retry: false,
    staleTime: 30_000,
    enabled: localBillingServiceEnabled
  })
  const billing = useQuery({
    queryKey: ['billing', session.user.id, 'overview'],
    queryFn: ({ signal }) => gateway.billing(signal),
    retry: false,
    staleTime: 30_000,
    enabled: localBillingServiceEnabled
  })
  if (
    localBillingServiceEnabled &&
    (current.isPending || current.isError || billing.isPending || billing.isError)
  )
    return (
      <div className="checkout-page">
        <h1>訂閱方案</h1>
        <p role="status">
          {current.isPending || billing.isPending
            ? '正在讀取訂閱狀態…'
            : '目前無法讀取付款服務，請稍後再試。'}
        </p>
        {(current.isError || billing.isError) && (
          <button
            className="primary-button compact"
            onClick={() => {
              void current.refetch()
              void billing.refetch()
            }}
          >
            重新讀取
          </button>
        )}
        <Link className="billing-back" to="/plans">
          返回方案選擇
        </Link>
      </div>
    )
  const restored = localBillingServiceEnabled ? current.data?.current : undefined
  const activeIntent = started?.intent ?? restored?.intent
  const activeQuote = started?.quote ?? restored?.quote
  const isStatus = location.pathname === '/settings/checkout/status'
  const subscription = billing.data?.subscription
  if (subscription && !isStatus) return <Navigate to="/settings?category=plans" replace />
  if (subscription && isStatus)
    return (
      <div className="checkout-page payment-status-page">
        <main className="payment-status-main" aria-live="polite">
          <div className="payment-status-mark is-confirmed">
            <Check aria-hidden="true" />
          </div>
          <span className="eyebrow dark">FORM MEMBERSHIP</span>
          <h1>{tierName(subscription.tier)} 訂閱已啟用</h1>
          <p className="payment-status-lead">
            {subscription.status === 'trial'
              ? '你的試用已開始，方案權益可以使用。'
              : '你的訂閱已確認，方案權益可以使用。'}
          </p>
          <dl className="payment-status-facts">
            <div>
              <dt>訂閱方案</dt>
              <dd>
                {tierName(subscription.tier)} · {intervalName(subscription.interval)}繳
              </dd>
            </div>
            <div>
              <dt>{subscription.status === 'trial' ? '首次扣款' : '本期結束'}</dt>
              <dd>{formatDate(subscription.endsAt)}</dd>
            </div>
          </dl>
          <div className="payment-status-actions">
            <Link className="primary-button" to="/settings?category=plans">
              查看我的方案與帳單 <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </main>
      </div>
    )
  if (isStatus && !activeIntent)
    return (
      <div className="checkout-page payment-status-page">
        <main className="payment-status-main" aria-live="polite">
          <span className="eyebrow dark">FORM MEMBERSHIP</span>
          <h1>正在確認訂閱結果</h1>
          <p className="payment-status-lead">目前尚未取得已確認的訂閱資訊。請勿重新付款。</p>
          <div className="payment-status-actions">
            <button
              className="primary-button"
              onClick={() => {
                void current.refetch()
                void billing.refetch()
              }}
            >
              重新查詢結果 <ArrowRight aria-hidden="true" />
            </button>
            <Link className="billing-back" to="/settings?category=plans">
              查看方案與帳單
            </Link>
          </div>
        </main>
      </div>
    )
  if (!isStatus && activeIntent) return <Navigate to="/settings/checkout/status" replace />
  return (
    <>
      {import.meta.env.DEV && (
        <div className="billing-local-preview-entry">
          <span>{localBillingServiceEnabled ? 'Test Mode' : '本地開發'}</span>
          {!localBillingServiceEnabled && (
            <Link to="/__review/payments/plans">操作完整測試流程</Link>
          )}
          <small>
            {localBillingServiceEnabled
              ? '測試付款會建立 Lemon 測試訂閱並更新此開發帳號方案；請勿使用真卡。'
              : '使用獨立測試資料，不會扣款或變更帳號方案。'}
          </small>
        </div>
      )}
      {isStatus && activeIntent ? (
        <PaymentStatusPage
          accountId={session.user.id}
          gateway={gateway}
          intent={activeIntent}
          quote={activeQuote}
          openCheckout={openLemonCheckout}
          autoOpen={Boolean(started)}
          onBack={() => navigate('/settings?category=plans')}
          onComplete={() => navigate('/settings?category=plans', { replace: true })}
        />
      ) : (
        <CheckoutPage
          key={`${session.user.id}-${search.get('tier')}-${search.get('interval')}`}
          preparationOnly={!localBillingServiceEnabled}
          accountId={session.user.id}
          email={session.user.email ?? ''}
          gateway={gateway}
          initialSelection={
            restored?.quote
              ? {
                  tier: restored.quote.tier,
                  interval: restored.quote.interval
                }
              : {
                  tier: search.get('tier') === 'advanced' ? 'advanced' : 'basic',
                  interval: search.get('interval') === 'year' ? 'year' : 'month'
                }
          }
          initialIntent={restored?.intent}
          initialQuote={restored?.quote}
          termsHref="/billing/terms"
          privacyHref="/billing/privacy"
          noticeHref="/payment-notice"
          onStarted={(intent, quote) => {
            setStarted({ intent, quote })
            navigate('/settings/checkout/status', { replace: true })
          }}
          onBack={() => navigate('/plans')}
        />
      )}
    </>
  )
}
