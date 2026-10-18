import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { localBillingEnabled, localBillingServiceEnabled } from '../../config'
import { readBetaGrant, type PlanAccess } from '../../api'
import { betaGrantKey } from '../../beta-admission/BetaGate'
import { planAccessKey, usePlanAccess } from '../../beta-admission/usePlanAccess'
import { Page } from '../../shared/primitives'
import { MobilePageAppBar } from '../../shared/MobilePageAppBar'
import { createHttpBillingGateway } from './billing/http-gateway'
import { BillingDialog } from './billing/BillingDialog'
import { tierName, type PaidChangePreview } from './billing/types'
import { billingQuoteKey, billingQuoteStaleTime } from './billing/quote-query'
import './billing/billing.css'
import type { BillingSnapshot } from './billing/types'

function planDate(instant: string): string {
  return new Date(instant).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function PlanPanel({
  plan,
  loading,
  error,
  onRetry,
  onChoosePlan,
  canChoosePlan,
  onChooseFree,
  subscription,
  preparationOnly = false,
  preparing = false,
  preparationError = ''
}: {
  plan: PlanAccess | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  onChoosePlan?: (selection: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }) => void
  canChoosePlan?: (selection: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }) => boolean
  onChooseFree?: () => void
  subscription?: BillingSnapshot['subscription']
  preparationOnly?: boolean
  preparing?: boolean
  preparationError?: string
}) {
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>(
    subscription?.interval ?? 'month'
  )
  useEffect(() => {
    if (subscription) setSelectedInterval(subscription.interval)
  }, [subscription?.interval])
  const currentBadge = (tier: PlanAccess['tier']) => {
    if (subscription && tier === 'free') return null
    if (plan?.tier !== tier) return null
    if (subscription && subscription.tier === tier)
      return `目前方案 · ${tier === 'advanced' ? 'Prime' : 'Pro'} ${subscription.interval === 'month' ? '月繳' : '年繳'}`
    if (plan.source === 'promotional') return '目前方案 · 優惠體驗'
    if (plan.source === 'permanent') return '目前方案 · 永久'
    return '目前方案'
  }
  const isCurrentSelection = (tier: 'basic' | 'advanced') =>
    subscription
      ? (subscription.tier === tier && subscription.interval === selectedInterval) ||
        (subscription.scheduledChange?.tier === tier &&
          subscription.scheduledChange.interval === selectedInterval)
      : plan?.tier === tier
  const selectionReady = !loading && !error
  const canChoose = (tier: 'basic' | 'advanced') =>
    !canChoosePlan || canChoosePlan({ tier, interval: selectedInterval })
  const paidChoiceLabel = (tier: 'basic' | 'advanced') => {
    if (!subscription)
      return preparationOnly ? `查看 ${tierName(tier)} 訂閱` : `選擇 ${tierName(tier)}`
    if (subscription.tier === 'basic' && tier === 'advanced')
      return `立即改用 Prime ${selectedInterval === 'month' ? '月繳' : '年繳'}`
    return `改為${selectedInterval === 'month' ? '月繳' : '年繳'}`
  }

  return (
    <div className="settings-plan-page">
      <section className="settings-plan-section settings-pricing-section" aria-label="方案比較">
        {error && (
          <p role="alert" className="settings-plan-note">
            暫時無法讀取方案。
            <button type="button" className="settings-plan-details-toggle" onClick={onRetry}>
              重新讀取
            </button>
          </p>
        )}
        {preparationError && (
          <p role="alert" className="settings-plan-note">
            {preparationError}
          </p>
        )}
        <div className="settings-plan-interval" role="group" aria-label="方案週期">
          <button
            type="button"
            aria-pressed={selectedInterval === 'month'}
            disabled={preparing}
            onClick={() => setSelectedInterval('month')}
          >
            月費方案
          </button>
          <button
            type="button"
            aria-pressed={selectedInterval === 'year'}
            disabled={preparing}
            onClick={() => setSelectedInterval('year')}
          >
            年費方案 <span className="settings-plan-discount">（省約 17%）</span>
          </button>
        </div>
        <div
          className="settings-plan-grid"
          role="region"
          aria-label="方案卡片，可左右滑動瀏覽"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            const row = event.currentTarget
            const cards = Array.from(row.querySelectorAll<HTMLElement>('.settings-plan-card'))
            const positions = cards.map(
              (card) => card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2
            )
            const currentIndex = positions.reduce(
              (nearest, position, index) =>
                Math.abs(position - row.scrollLeft) < Math.abs(positions[nearest]! - row.scrollLeft)
                  ? index
                  : nearest,
              0
            )
            const nextIndex = Math.max(
              0,
              Math.min(cards.length - 1, currentIndex + (event.key === 'ArrowRight' ? 1 : -1))
            )
            row.scrollTo({
              left: positions[nextIndex],
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth'
            })
          }}
        >
          <article className="settings-plan-card">
            <div className="settings-plan-card-heading">
              <span className="settings-plan-card-tag">入門</span>
              {currentBadge('free') && (
                <span className="settings-plan-current-badge">{currentBadge('free')}</span>
              )}
            </div>
            <h2>Free</h2>
            <p className="settings-plan-card-subtitle">開始管理日常教練工作</p>
            <div className="settings-plan-price">
              <strong>免費</strong>
            </div>
            <ul className="settings-plan-features">
              {['最多 5 名學員', '1 個場地', '課程、排程與訓練紀錄'].map((feature) => (
                <li key={feature}>
                  <CircleCheck aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
            {subscription &&
              subscription.status !== 'cancelled' &&
              onChooseFree &&
              selectionReady && (
                <div className="settings-plan-card-footer">
                  <button className="secondary-button" type="button" onClick={onChooseFree}>
                    期滿改用 Free
                  </button>
                </div>
              )}
          </article>
          <article className="settings-plan-card is-featured">
            <div className="settings-plan-card-heading">
              {currentBadge('basic') && (
                <span className="settings-plan-current-badge">{currentBadge('basic')}</span>
              )}
            </div>
            <h2>Pro</h2>
            <p className="settings-plan-card-subtitle">為成長中的教練工作台擴充空間</p>
            <div className="settings-plan-price">
              <span>NT$</span>
              <strong>{selectedInterval === 'month' ? '115' : '1,150'}</strong>
              <small>／{selectedInterval === 'month' ? '月' : '年'}</small>
              {selectedInterval === 'year' && <em>約 NT$96／月</em>}
            </div>
            <ul className="settings-plan-features">
              {['最多 15 名學員', '無限場地數量', '本月收支與成長軌跡'].map((feature) => (
                <li key={feature}>
                  <CircleCheck aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
            {(!subscription ||
              subscription.status === 'trial' ||
              subscription.status === 'active') &&
              (preparationOnly || !isCurrentSelection('basic')) && (
                <div className="settings-plan-card-footer">
                  {onChoosePlan && selectionReady && canChoose('basic') ? (
                    <button
                      className="primary-button compact billing-pro-button"
                      disabled={preparing}
                      onClick={() => onChoosePlan({ tier: 'basic', interval: selectedInterval })}
                    >
                      {preparing ? '正在準備方案…' : paidChoiceLabel('basic')}
                    </button>
                  ) : (
                    <span className="settings-plan-card-state">
                      {loading
                        ? '正在確認訂閱…'
                        : error
                          ? '請重新讀取方案與帳單'
                          : subscription?.status === 'active'
                            ? '此方案變更尚未開放'
                            : '支付功能上線後開放'}
                    </span>
                  )}
                </div>
              )}
          </article>
          <article className="settings-plan-card is-prime">
            <div className="settings-plan-card-heading">
              <span className="settings-plan-card-tag">完整功能</span>
              {currentBadge('advanced') && (
                <span className="settings-plan-current-badge">{currentBadge('advanced')}</span>
              )}
            </div>
            <h2>Prime</h2>
            <p className="settings-plan-card-subtitle">完整掌握營運、成長與資料</p>
            <div className="settings-plan-price">
              <span>NT$</span>
              <strong>{selectedInterval === 'month' ? '145' : '1,450'}</strong>
              <small>／{selectedInterval === 'month' ? '月' : '年'}</small>
              {selectedInterval === 'year' && <em>約 NT$121／月</em>}
            </div>
            <ul className="settings-plan-features">
              {[
                '無限學員數量',
                '無限場地數量',
                '本月收支與成長軌跡',
                '收支報表',
                '行事曆整合',
                '收支明細匯出'
              ].map((feature) => (
                <li key={feature}>
                  <CircleCheck aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
            {(!subscription ||
              subscription.status === 'trial' ||
              subscription.status === 'active') &&
              (preparationOnly || !isCurrentSelection('advanced')) && (
                <div className="settings-plan-card-footer">
                  {onChoosePlan && selectionReady && canChoose('advanced') ? (
                    <button
                      className="primary-button compact"
                      disabled={preparing}
                      onClick={() => onChoosePlan({ tier: 'advanced', interval: selectedInterval })}
                    >
                      {preparing ? '正在準備方案…' : paidChoiceLabel('advanced')}
                    </button>
                  ) : (
                    <span className="settings-plan-card-state">
                      {loading
                        ? '正在確認訂閱…'
                        : error
                          ? '請重新讀取方案與帳單'
                          : subscription?.status === 'active'
                            ? '此方案變更尚未開放'
                            : '支付功能上線後開放'}
                    </span>
                  )}
                </div>
              )}
          </article>
        </div>
      </section>
    </div>
  )
}

export function FreeChangeDialog({
  subscription,
  pending,
  error,
  onConfirm,
  onClose
}: {
  subscription: NonNullable<BillingSnapshot['subscription']>
  pending: boolean
  error: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <BillingDialog
      title="期滿改用 Free？"
      onClose={() => {
        if (!pending) onClose()
      }}
      actions={
        <>
          <button className="secondary-button" disabled={pending} onClick={onClose}>
            保留訂閱
          </button>
          <button className="primary-button compact" disabled={pending} onClick={onConfirm}>
            {pending ? '處理中…' : '確認期滿改用 Free'}
          </button>
        </>
      }
    >
      <p>
        {tierName(subscription.tier)} 可使用至 <strong>{planDate(subscription.endsAt)}</strong>
        ；之後轉為 Free，停止續訂扣款。
      </p>
      <p>既有資料會保留；超過 Free 額度時，部分儲存操作會受限。</p>
      {error && (
        <p role="alert" className="billing-error">
          變更尚未確認，請稍後重試並查看目前訂閱狀態。
        </p>
      )}
    </BillingDialog>
  )
}

export function TrialChangeDialog({
  subscription,
  selection,
  pending,
  error,
  onConfirm,
  onClose
}: {
  subscription: NonNullable<BillingSnapshot['subscription']>
  selection: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }
  pending: boolean
  error: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <BillingDialog
      title="變更試用方案？"
      onClose={() => {
        if (!pending) onClose()
      }}
      actions={
        <>
          <button className="secondary-button" disabled={pending} onClick={onClose}>
            保留目前方案
          </button>
          <button className="primary-button compact" disabled={pending} onClick={onConfirm}>
            {pending ? '確認中…' : '確認變更'}
          </button>
        </>
      }
    >
      <p>
        變更為{' '}
        <strong>
          {tierName(selection.tier)} {selection.interval === 'month' ? '月繳' : '年繳'}
        </strong>
        ，免費試用仍於 <strong>{planDate(subscription.endsAt)}</strong> 結束，現在不扣款。
      </p>
      <p>
        {selection.tier === 'advanced' && subscription.tier === 'basic'
          ? '供應商確認後立即開放 Prime 功能，第一筆扣款日期不變。'
          : '第一筆扣款日期不變，將依新的付款週期續訂。'}
      </p>
      {error && (
        <p role="alert" className="billing-error">
          變更尚未確認，請稍後重試；系統不會把未確認的結果當成成功。
        </p>
      )}
    </BillingDialog>
  )
}

export function PaidChangeDialog({
  preview,
  loading,
  error,
  submitted,
  onConfirm,
  onClose
}: {
  preview?: PaidChangePreview
  loading: boolean
  error: boolean
  submitted: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const amount =
    preview && preview.estimate.currency === 'TWD'
      ? new Intl.NumberFormat('zh-TW').format(Math.round(preview.estimate.amount / 100))
      : null
  return (
    <BillingDialog
      title="確認升級並付款？"
      onClose={onClose}
      actions={
        <>
          <button className="secondary-button" onClick={onClose}>
            返回
          </button>
          <button
            className="primary-button compact"
            disabled={!amount || loading || error || submitted}
            onClick={onConfirm}
          >
            {submitted ? '處理中…' : '確認變更並付款'}
          </button>
        </>
      }
    >
      {loading && <p>正在核對目前帳單與預估費用…</p>}
      {amount && (
        <p>
          預估升級費用約 NT${amount}
          。按下『確認變更並付款』後，系統會送出變更並嘗試立即扣款；實際金額、稅額及續訂日期以 Lemon
          Squeezy 完成後的帳單為準。
        </p>
      )}
      {error && (
        <p role="alert" className="billing-error">
          目前無法核對預估費用，請返回並重新讀取方案。
        </p>
      )}
      {submitted && (
        <p role="status">變更請求已送出或正在確認；請查看目前訂閱與帳單，避免重複付款。</p>
      )}
    </BillingDialog>
  )
}

export function PlansPage({ session }: { session: Session }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [freeChangeOpen, setFreeChangeOpen] = useState(false)
  const [trialSelection, setTrialSelection] = useState<{
    tier: 'basic' | 'advanced'
    interval: 'month' | 'year'
  } | null>(null)
  const [paidSelection, setPaidSelection] = useState<{
    tier: 'basic' | 'advanced'
    interval: 'month' | 'year'
  } | null>(null)
  const [paidSubmitted, setPaidSubmitted] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [preparationError, setPreparationError] = useState('')
  const paidSubmitting = useRef(false)
  const billingGateway = createHttpBillingGateway(session.access_token)
  const grantQuery = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token)
  })
  const planQuery = usePlanAccess(session)
  const billingQuery = useQuery({
    queryKey: ['billing', session.user.id, 'overview'],
    queryFn: ({ signal }) => createHttpBillingGateway(session.access_token).billing(signal),
    enabled: localBillingServiceEnabled,
    retry: false
  })
  const changeToFree = useMutation({
    mutationFn: () => billingGateway.cancel(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['billing', session.user.id] })
      setFreeChangeOpen(false)
    }
  })
  const changeTrial = useMutation({
    mutationFn: (selection: { tier: 'basic' | 'advanced'; interval: 'month' | 'year' }) =>
      billingGateway.changeTrial(selection),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing', session.user.id] }),
        queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      ])
      setTrialSelection(null)
    }
  })
  const paidPreview = useQuery({
    queryKey: ['billing', session.user.id, 'paid-preview', paidSelection],
    queryFn: () => billingGateway.previewPaid(paidSelection!),
    enabled: paidSelection !== null,
    retry: false,
    staleTime: 0
  })
  const changePaid = useMutation({
    mutationFn: (previewId: string) => billingGateway.confirmPaid(previewId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billing', session.user.id, 'overview'] }),
        queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      ])
    }
  })

  return (
    <Page
      title={localBillingEnabled ? '比較方案與價格' : '比較方案與 Beta 權益'}
      eyebrow="FORM 方案"
      description={
        localBillingEnabled
          ? '選擇適合你的方案與付款週期。'
          : 'Beta 期間開放 Free 方案；Pro 與 Prime 將於支付功能上線後開放選購。'
      }
      className="plans-page"
      beforeHeader={<MobilePageAppBar title="所有方案" />}
    >
      <Link className="plans-back-link" to="/settings?category=plans">
        <ArrowLeft aria-hidden="true" />
        返回方案與帳單
      </Link>
      <PlanPanel
        preparing={preparing}
        preparationError={preparationError}
        preparationOnly={localBillingEnabled && !localBillingServiceEnabled}
        subscription={localBillingServiceEnabled ? billingQuery.data?.subscription : undefined}
        onChooseFree={
          localBillingServiceEnabled && billingQuery.isSuccess && !planQuery.isError
            ? () => {
                changeToFree.reset()
                setFreeChangeOpen(true)
              }
            : undefined
        }
        onChoosePlan={
          localBillingEnabled &&
          (!localBillingServiceEnabled || billingQuery.isSuccess) &&
          !grantQuery.isPending &&
          !grantQuery.isError &&
          !planQuery.isPending &&
          !planQuery.isError
            ? async (selection) => {
                if (preparing) return
                setPreparationError('')
                if (billingQuery.data?.subscription?.status === 'trial') {
                  changeTrial.reset()
                  setTrialSelection(selection)
                } else if (billingQuery.data?.subscription?.status === 'active') {
                  paidSubmitting.current = false
                  setPaidSubmitted(false)
                  changePaid.reset()
                  void queryClient.removeQueries({
                    queryKey: ['billing', session.user.id, 'paid-preview']
                  })
                  setPaidSelection(selection)
                } else {
                  if (localBillingServiceEnabled) {
                    setPreparing(true)
                    try {
                      const [current, overview] = await Promise.all([
                        queryClient.fetchQuery({
                          queryKey: ['billing', session.user.id, 'current'],
                          queryFn: ({ signal }) => billingGateway.current(signal)
                        }),
                        queryClient.fetchQuery({
                          queryKey: ['billing', session.user.id, 'overview'],
                          queryFn: ({ signal }) => billingGateway.billing(signal)
                        })
                      ])
                      if (current.current) {
                        setPreparing(false)
                        navigate('/settings/checkout/status')
                        return
                      }
                      if (overview.subscription || overview.pendingCheckout) {
                        setPreparationError('訂閱狀態已更新，請重新讀取方案與帳單。')
                        void queryClient.invalidateQueries({
                          queryKey: planAccessKey(session.user.id)
                        })
                        setPreparing(false)
                        return
                      }
                      await queryClient.fetchQuery({
                        queryKey: billingQuoteKey(session.user.id, selection),
                        queryFn: ({ signal }) => billingGateway.quote(selection, signal),
                        staleTime: billingQuoteStaleTime
                      })
                    } catch {
                      setPreparationError('目前無法取得這個方案的完整付款資訊，請再試一次。')
                      setPreparing(false)
                      return
                    }
                    setPreparing(false)
                  }
                  navigate(
                    `/settings/checkout?tier=${selection.tier}&interval=${selection.interval}`
                  )
                }
              }
            : undefined
        }
        canChoosePlan={(selection) => {
          const current = billingQuery.data?.subscription
          if (!current) return true
          if (current.status === 'trial')
            return !(
              (current.tier === 'advanced' && selection.tier === 'basic') ||
              (current.interval === 'year' && selection.interval === 'month')
            )
          if (current.status !== 'active' || billingQuery.data?.pendingPaidChange) return false
          return (
            (current.tier === 'basic' &&
              current.interval === 'month' &&
              selection.tier === 'advanced' &&
              selection.interval === 'month') ||
            (current.tier === 'advanced' &&
              current.interval === 'month' &&
              selection.tier === 'advanced' &&
              selection.interval === 'year')
          )
        }}
        plan={planQuery.data}
        loading={
          grantQuery.isPending ||
          planQuery.isPending ||
          (localBillingServiceEnabled && billingQuery.isPending)
        }
        error={
          grantQuery.isError ||
          planQuery.isError ||
          (localBillingServiceEnabled && billingQuery.isError)
        }
        onRetry={() => {
          void grantQuery.refetch()
          void planQuery.refetch()
          if (localBillingServiceEnabled) void billingQuery.refetch()
        }}
      />
      {freeChangeOpen && billingQuery.data?.subscription && (
        <FreeChangeDialog
          subscription={billingQuery.data.subscription}
          pending={changeToFree.isPending}
          error={changeToFree.isError}
          onConfirm={() => changeToFree.mutate()}
          onClose={() => setFreeChangeOpen(false)}
        />
      )}
      {trialSelection && billingQuery.data?.subscription?.status === 'trial' && (
        <TrialChangeDialog
          subscription={billingQuery.data.subscription}
          selection={trialSelection}
          pending={changeTrial.isPending}
          error={changeTrial.isError}
          onConfirm={() => changeTrial.mutate(trialSelection)}
          onClose={() => setTrialSelection(null)}
        />
      )}
      {paidSelection && billingQuery.data?.subscription?.status === 'active' && (
        <PaidChangeDialog
          preview={paidPreview.data}
          loading={paidPreview.isPending}
          error={paidPreview.isError || changePaid.isError}
          submitted={paidSubmitted}
          onConfirm={() => {
            if (
              !paidPreview.data ||
              paidSubmitting.current ||
              Date.parse(paidPreview.data.expiresAt) <= Date.now()
            )
              return
            paidSubmitting.current = true
            setPaidSubmitted(true)
            changePaid.mutate(paidPreview.data.id)
          }}
          onClose={() => {
            if (!changePaid.isPending) setPaidSelection(null)
          }}
        />
      )}
    </Page>
  )
}
