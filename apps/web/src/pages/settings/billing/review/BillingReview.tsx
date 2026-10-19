import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { WorkspaceSidebar } from '../../../../app-shell/WorkspaceSidebar'
import { TermsPage, PrivacyPage } from '../../../../legal/LegalPages'
import { CheckoutPage } from '../CheckoutPage'
import { PaymentStatusPage } from '../PaymentStatusPage'
import { BillingPanel } from '../BillingPanel'
import { PaymentNoticePage } from '../PaymentNoticePage'
import { BillingDialog } from '../BillingDialog'
import { billingQuoteKey, billingQuoteStaleTime } from '../quote-query'
import { createReviewGateway, type ReviewScenario } from './review-gateway'
import { readReviewProgress, saveReviewProgress, reviewSessionKey } from './review-session'
import { FreeChangeDialog, PlanPanel, TrialChangeDialog } from '../../PlansPage'
import { Page } from '../../../../shared/primitives'
import type { CheckoutIntent, Quote, Selection } from '../types'
import './review.css'

export default function BillingReview() {
  const navigate = useNavigate()
  const location = useLocation()
  const [restored, setRestored] = useState(() => readReviewProgress(window.sessionStorage))
  const [scenario, setScenario] = useState<ReviewScenario>(restored?.scenario ?? 'first')
  const [revision, setRevision] = useState(0)
  const fixture = useMemo(
    () =>
      createReviewGateway(scenario, {
        restored,
        save: (progress) => saveReviewProgress(window.sessionStorage, progress)
      }),
    [scenario, revision, restored]
  )
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
      }),
    [fixture]
  )
  const [provider, setProvider] = useState<{ notify: () => void } | null>(null)
  const [freeChangeOpen, setFreeChangeOpen] = useState(false)
  const [freeChangePending, setFreeChangePending] = useState(false)
  const [freeChangeError, setFreeChangeError] = useState(false)
  const [trialSelection, setTrialSelection] = useState<Selection | null>(null)
  const [trialChangePending, setTrialChangePending] = useState(false)
  const [trialChangeError, setTrialChangeError] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [preparationError, setPreparationError] = useState('')
  const [settled, setSettled] = useState(restored?.confirmed ?? false)
  const [selection, setSelection] = useState<Selection>(
    restored?.selection ?? { tier: 'basic', interval: 'month' }
  )
  const [started, setStarted] = useState<{ intent: CheckoutIntent; quote: Quote } | null>(null)
  const reviewSubscription = fixture.currentSubscription()
  const base = '/__review/payments'
  const standalone = !location.pathname.endsWith('/billing')
  const complete = () => {
    setSettled(true)
    navigate(`${base}/billing`, { replace: true })
  }
  return (
    <QueryClientProvider client={client} key={`${scenario}-${revision}`}>
      <div className="billing-review-toolbar">
        <span>本機開發預覽 · 不會扣款</span>
        <button onClick={() => navigate(`${base}/plans`)}>方案</button>
        <button onClick={() => navigate(`${base}/billing`)}>帳單</button>
        <label>
          情境{' '}
          <select
            aria-label="開發預覽情境"
            value={scenario}
            onChange={(event) => {
              const next = event.target.value as ReviewScenario
              setScenario(next)
              setRestored(undefined)
              setSelection({ tier: 'basic', interval: 'month' })
              setProvider(null)
              setFreeChangeOpen(false)
              setTrialSelection(null)
              setPreparationError('')
              setStarted(null)
              setSettled(false)
              navigate(
                `${base}/${next === 'permanent' ? 'plans' : ['invoices', 'cancel_error', 'past_due', 'expired'].includes(next) ? 'billing' : 'checkout'}`,
                { replace: true }
              )
            }}
          >
            <option value="first">首次訂閱</option>
            <option value="returning">再次訂閱</option>
            <option value="invoices">帳單與退款</option>
            <option value="pending">確認延遲</option>
            <option value="overlay_error">視窗載入失敗</option>
            <option value="cancel_error">取消待確認／重試</option>
            <option value="past_due">續訂付款待處理</option>
            <option value="expired">已到期／Free</option>
            <option value="permanent">永久 Prime</option>
          </select>
        </label>
        <button
          onClick={() => {
            setRevision((value) => value + 1)
            setRestored(undefined)
            window.sessionStorage.removeItem(reviewSessionKey)
            setSelection({ tier: 'basic', interval: 'month' })
            setProvider(null)
            setStarted(null)
            setTrialSelection(null)
            setPreparationError('')
            setSettled(false)
            navigate(`${base}/${scenario === 'permanent' ? 'plans' : 'checkout'}`, {
              replace: true
            })
          }}
        >
          重設
        </button>
        {scenario === 'pending' && fixture.current().intent?.status === 'pending' && (
          <button
            onClick={() => {
              fixture.confirm()
              void client.invalidateQueries({ queryKey: ['billing', 'local-review'] })
            }}
          >
            送達確認結果
          </button>
        )}
        <small>重新整理保留進度</small>
      </div>
      <div
        className={`app-shell billing-review-shell${standalone ? ' plans-shell' : ''}`}
        data-mobile-chrome="pinned"
      >
        {!standalone && (
          <WorkspaceSidebar
            activeSettings
            coach={{ initials: 'DE', name: '預覽帳號', email: 'coach@example.com' }}
            settingsHref={base + '/billing'}
          />
        )}
        <main className="main-content">
          {(!standalone || location.pathname.endsWith('/plans')) && (
            <header className="mobile-header">
              <div className="mobile-route-header-slot" id="mobile-route-header-slot">
                <span className="mobile-route-header-fallback">
                  {standalone ? '所有方案' : '設定'}
                </span>
              </div>
            </header>
          )}
          <Routes>
            <Route
              path="plans"
              element={
                <Page title="比較方案與價格" eyebrow="FORM 方案" className="plans-page">
                  <button className="billing-back" onClick={() => navigate(`${base}/billing`)}>
                    返回方案與帳單
                  </button>
                  <PlanPanel
                    preparing={preparing}
                    preparationError={preparationError}
                    plan={{
                      tier:
                        scenario === 'permanent'
                          ? 'advanced'
                          : (reviewSubscription?.tier ?? 'free'),
                      source:
                        scenario === 'permanent'
                          ? 'permanent'
                          : reviewSubscription
                            ? 'subscription'
                            : 'free',
                      activeStudents: 0,
                      activeVenues: 0,
                      studentLimit:
                        scenario === 'permanent' || reviewSubscription?.tier === 'advanced'
                          ? null
                          : reviewSubscription
                            ? 15
                            : 5,
                      venueLimit: scenario === 'permanent' || reviewSubscription ? null : 1,
                      overCapacity: false
                    }}
                    subscription={reviewSubscription}
                    loading={false}
                    error={false}
                    onRetry={() => {}}
                    onChooseFree={
                      reviewSubscription?.status !== 'cancelled' && reviewSubscription
                        ? () => {
                            setFreeChangeError(false)
                            setFreeChangeOpen(true)
                          }
                        : undefined
                    }
                    canChoosePlan={(next) =>
                      !reviewSubscription ||
                      (reviewSubscription.status === 'trial' &&
                        !(reviewSubscription.tier === 'advanced' && next.tier === 'basic') &&
                        !(reviewSubscription.interval === 'year' && next.interval === 'month'))
                    }
                    onChoosePlan={async (next) => {
                      if (preparing) return
                      setPreparationError('')
                      if (reviewSubscription?.status === 'trial') {
                        setTrialChangeError(false)
                        setTrialSelection(next)
                        return
                      }
                      setPreparing(true)
                      try {
                        await client.fetchQuery({
                          queryKey: billingQuoteKey('local-review', next),
                          queryFn: ({ signal }) => fixture.gateway.quote(next, signal),
                          staleTime: billingQuoteStaleTime
                        })
                      } catch {
                        setPreparationError('目前無法取得這個方案的完整付款資訊，請再試一次。')
                        setPreparing(false)
                        return
                      }
                      setSelection(next)
                      setPreparing(false)
                      navigate(`${base}/checkout`)
                    }}
                  />
                </Page>
              }
            />
            <Route path="terms" element={<TermsPage billingDraft />} />
            <Route path="privacy" element={<PrivacyPage billingDraft />} />
            <Route path="payment-notice" element={<PaymentNoticePage />} />
            <Route
              path="checkout"
              element={
                settled || (fixture.hasSubscription() && !fixture.current().intent) ? (
                  <Navigate to={`${base}/billing`} replace />
                ) : fixture.current().intent || started ? (
                  <Navigate to={`${base}/status`} replace />
                ) : (
                  <CheckoutPage
                    key={`${scenario}-${revision}`}
                    accountId="local-review"
                    email="coach@example.com"
                    gateway={fixture.gateway}
                    initialSelection={selection}
                    initialIntent={fixture.current().intent}
                    initialQuote={fixture.current().quote}
                    termsHref={`${base}/terms`}
                    privacyHref={`${base}/privacy`}
                    noticeHref={`${base}/payment-notice`}
                    onBack={() => navigate(`${base}/plans`)}
                    onStarted={(intent, quote) => {
                      setStarted({ intent, quote })
                      navigate(`${base}/status`, { replace: true })
                    }}
                  />
                )
              }
            />
            <Route
              path="status"
              element={
                (started?.intent ?? fixture.current().intent) ? (
                  <PaymentStatusPage
                    accountId="local-review"
                    gateway={fixture.gateway}
                    intent={(started?.intent ?? fixture.current().intent)!}
                    quote={started?.quote ?? fixture.current().quote}
                    autoOpen={Boolean(started)}
                    onBack={() => navigate(`${base}/billing`)}
                    onComplete={complete}
                    openCheckout={async () => {
                      if (scenario === 'overlay_error') throw new Error('preview_failure')
                      setProvider({
                        notify: () => {
                          fixture.markPending()
                          fixture.confirm()
                          void client.invalidateQueries({ queryKey: ['billing', 'local-review'] })
                        }
                      })
                    }}
                  />
                ) : (
                  <Navigate to={`${base}/checkout`} replace />
                )
              }
            />
            <Route
              path="billing"
              element={
                <BillingPanel
                  accountId="local-review"
                  gateway={fixture.gateway}
                  planAccess={
                    scenario === 'permanent'
                      ? {
                          tier: 'advanced',
                          source: 'permanent',
                          activeStudents: 0,
                          activeVenues: 0,
                          studentLimit: null,
                          venueLimit: null,
                          overCapacity: false
                        }
                      : undefined
                  }
                  onChoosePlan={() => navigate(`${base}/plans`)}
                  onViewCheckout={() => navigate(`${base}/status`)}
                />
              }
            />
            <Route path="*" element={<Navigate to={`${base}/checkout`} replace />} />
          </Routes>
        </main>
      </div>
      {provider && (
        <BillingDialog
          title="Lemon Squeezy 結帳區域"
          onClose={() => setProvider(null)}
          actions={
            <button
              className="primary-button compact"
              onClick={() => {
                if (scenario === 'pending') {
                  fixture.markPending()
                  void client.invalidateQueries({ queryKey: ['billing', 'local-review'] })
                } else provider.notify()
                setProvider(null)
              }}
            >
              模擬完成授權
            </button>
          }
        >
          <p>此開發預覽使用模擬結果，不接受付款資料，也不會連線至商店。</p>
          <p>正式版本會在原頁開啟 Lemon Squeezy 官方結帳視窗。</p>
        </BillingDialog>
      )}
      {freeChangeOpen && reviewSubscription && (
        <FreeChangeDialog
          subscription={reviewSubscription}
          pending={freeChangePending}
          error={freeChangeError}
          onClose={() => setFreeChangeOpen(false)}
          onConfirm={() => {
            setFreeChangePending(true)
            void fixture.gateway
              .cancel()
              .then(
                () => {
                  setRestored(readReviewProgress(window.sessionStorage))
                  setFreeChangeOpen(false)
                },
                () => setFreeChangeError(true)
              )
              .finally(() => setFreeChangePending(false))
          }}
        />
      )}
      {trialSelection && reviewSubscription?.status === 'trial' && (
        <TrialChangeDialog
          subscription={reviewSubscription}
          selection={trialSelection}
          pending={trialChangePending}
          error={trialChangeError}
          onClose={() => setTrialSelection(null)}
          onConfirm={() => {
            setTrialChangePending(true)
            void fixture.gateway
              .changeTrial(trialSelection)
              .then(
                () => {
                  setRestored(readReviewProgress(window.sessionStorage))
                  setTrialSelection(null)
                },
                () => setTrialChangeError(true)
              )
              .finally(() => setTrialChangePending(false))
          }}
        />
      )}
    </QueryClientProvider>
  )
}
