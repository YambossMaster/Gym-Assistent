import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  changePlanSubscription,
  readBetaGrant,
  redeemBetaCode,
  type BetaGrant,
  type PlanAccess
} from '../../api'
import { betaGrantKey } from '../../beta-admission/BetaGate'
import { planAccessKey, usePlanAccess } from '../../beta-admission/usePlanAccess'
import { Confirmation, Page } from '../../shared/primitives'
import { MobilePageAppBar } from '../../shared/MobilePageAppBar'

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

function periodDate(instant: string): string {
  return new Date(instant).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
}

function PlanPanel({
  session,
  grant,
  plan,
  loading,
  error,
  onRetry,
  offerCode,
  onOfferCodeChange,
  onRedeem,
  redeeming,
  offerError,
  offerSuccess
}: {
  session: Session
  grant: BetaGrant | undefined
  plan: PlanAccess | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  offerCode: string
  onOfferCodeChange: (value: string) => void
  onRedeem: (event: FormEvent<HTMLFormElement>) => void
  redeeming: boolean
  offerError: string
  offerSuccess: string
}) {
  const queryClient = useQueryClient()
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month')
  const [planAction, setPlanAction] = useState<
    | {
        kind: 'select'
        tier: 'basic' | 'advanced'
        interval: 'month' | 'year'
      }
    | { kind: 'cancel' }
    | null
  >(null)
  const [planMessage, setPlanMessage] = useState('')
  const changeMutation = useMutation({
    mutationFn: () => {
      if (!plan || !planAction) throw new Error('請重新讀取方案。')
      return changePlanSubscription(session.access_token, { ...planAction, version: plan.version })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(planAccessKey(session.user.id), updated)
      void queryClient.invalidateQueries()
      setPlanAction(null)
      setPlanMessage('方案已更新。')
    },
    onError: (reason) => {
      setPlanAction(null)
      setPlanMessage(
        reason instanceof ApiError && reason.status === 409
          ? '方案已在其他裝置更新，請確認目前狀態後再試。'
          : '目前無法變更方案，請稍後再試。'
      )
      void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
    }
  })
  const promotional = plan?.source === 'promotional'
  const permanent = plan?.source === 'permanent'
  const subscription = plan?.subscription
  useEffect(() => {
    if (subscription) setSelectedInterval(subscription.interval)
  }, [subscription?.interval])
  const scheduledSelection =
    planAction?.kind === 'select' &&
    subscription &&
    ((subscription.tier === 'advanced' && planAction.tier === 'basic') ||
      (subscription.tier === planAction.tier &&
        subscription.interval === 'year' &&
        planAction.interval === 'month'))
  const previouslyRedeemed = grant?.state === 'free' && Boolean(grant.startedAt)
  const canRedeem = grant?.state === 'free' && !grant.startedAt
  const currentBadge = (tier: PlanAccess['tier']) => {
    if (plan?.tier !== tier) return null
    if (plan.source === 'promotional') return '目前方案 · 優惠體驗'
    if (plan.source === 'permanent') return '目前方案 · 永久'
    if (subscription?.tier === tier) {
      return `目前方案 · ${subscription.interval === 'month' ? '月費' : '年費'}`
    }
    return '目前方案'
  }
  const isCurrentSelection = (tier: 'basic' | 'advanced') => {
    if (plan?.tier !== tier) return false
    if (plan.source !== 'subscription') return true
    return subscription?.tier === tier && subscription.interval === selectedInterval
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
        <div className="settings-plan-interval" role="group" aria-label="方案週期">
          <button
            type="button"
            aria-pressed={selectedInterval === 'month'}
            onClick={() => setSelectedInterval('month')}
          >
            月費方案
          </button>
          <button
            type="button"
            aria-pressed={selectedInterval === 'year'}
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
            {plan?.tier !== 'free' && subscription && (
              <div className="settings-plan-card-footer">
                {subscription.pendingTier === 'free' ? (
                  <span className="settings-plan-card-state">已安排下期使用</span>
                ) : (
                  <button
                    type="button"
                    className="settings-plan-select"
                    disabled={loading || error || changeMutation.isPending}
                    onClick={() => setPlanAction({ kind: 'cancel' })}
                  >
                    選擇 Free 方案
                  </button>
                )}
              </div>
            )}
          </article>
          <article className="settings-plan-card is-featured">
            <div className="settings-plan-card-heading">
              <span className="settings-plan-card-tag">最受歡迎</span>
              {currentBadge('basic') && (
                <span className="settings-plan-current-badge">{currentBadge('basic')}</span>
              )}
            </div>
            <h2>Pro</h2>
            <p className="settings-plan-card-subtitle">為成長中的教練工作台擴充空間</p>
            <div className="settings-plan-price">
              <span>NT$</span>
              <strong>{selectedInterval === 'month' ? '199' : '1,990'}</strong>
              <small>／{selectedInterval === 'month' ? '月' : '年'}</small>
              {selectedInterval === 'year' && <em>約 NT$166／月</em>}
            </div>
            <ul className="settings-plan-features">
              {['最多 15 名學員', '無限場地數量', '本月收支與成長軌跡'].map((feature) => (
                <li key={feature}>
                  <CircleCheck aria-hidden="true" /> {feature}
                </li>
              ))}
            </ul>
            {!isCurrentSelection('basic') && (
              <div className="settings-plan-card-footer">
                <button
                  type="button"
                  className="settings-plan-select"
                  disabled={loading || error || changeMutation.isPending}
                  onClick={() =>
                    setPlanAction({ kind: 'select', tier: 'basic', interval: selectedInterval })
                  }
                >
                  選擇 Pro 方案
                </button>
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
              <strong>{selectedInterval === 'month' ? '259' : '2,590'}</strong>
              <small>／{selectedInterval === 'month' ? '月' : '年'}</small>
              {selectedInterval === 'year' && <em>約 NT$216／月</em>}
            </div>
            <ul className="settings-plan-features">
              {['無限學員數量', '無限場地數量', '本月收支與成長軌跡', '工作台資料匯出'].map(
                (feature) => (
                  <li key={feature}>
                    <CircleCheck aria-hidden="true" /> {feature}
                  </li>
                )
              )}
            </ul>
            {!isCurrentSelection('advanced') && (
              <div className="settings-plan-card-footer">
                <button
                  type="button"
                  className="settings-plan-select"
                  disabled={loading || error || changeMutation.isPending}
                  onClick={() =>
                    setPlanAction({ kind: 'select', tier: 'advanced', interval: selectedInterval })
                  }
                >
                  選擇 Prime 方案
                </button>
              </div>
            )}
          </article>
        </div>
        {planMessage && (
          <p role="status" className="settings-plan-note">
            {planMessage}
          </p>
        )}
      </section>

      <section
        className="settings-plan-section settings-offer-section"
        aria-labelledby="offer-title"
      >
        <div className="settings-plan-section-heading">
          <h3 id="offer-title">優惠體驗</h3>
          <p>有優惠碼？在這裡套用 60 天 Prime 方案體驗。</p>
        </div>
        {canRedeem ? (
          <form className="settings-offer-form" onSubmit={onRedeem}>
            <label htmlFor="settings-offer-code">輸入優惠碼</label>
            <div className="settings-offer-controls">
              <input
                id="settings-offer-code"
                value={offerCode}
                onChange={(event) => onOfferCodeChange(event.target.value)}
                autoComplete="off"
                required
              />
              <button type="submit" disabled={redeeming || !offerCode.trim()}>
                {redeeming ? '套用中…' : '套用優惠碼'}
              </button>
            </div>
            {offerError && (
              <p role="alert" className="form-error">
                {offerError}
              </p>
            )}
          </form>
        ) : (
          <p className="settings-plan-note">
            {promotional
              ? `已套用優惠碼，優惠至 ${planDate(plan!.offerEndsAt!)}。`
              : permanent
                ? '你已具有永久 Prime 方案權限，不需套用優惠碼。'
                : previouslyRedeemed
                  ? '此帳號已使用過一次優惠體驗，無法重複兌換。'
                  : '方案資料讀取後可在此套用優惠碼。'}
          </p>
        )}
        {offerSuccess && (
          <p role="status" className="settings-plan-success">
            {offerSuccess}
          </p>
        )}
      </section>

      {planAction && (
        <Confirmation
          title="確認方案變更"
          text={
            planAction.kind === 'cancel'
              ? `目前方案會使用到 ${periodDate(subscription!.periodEndsAt)}，之後改用 Free 方案。本次不會扣款。`
              : scheduledSelection
                ? `目前方案會使用到 ${periodDate(subscription!.periodEndsAt)}，之後改用 ${planAction.tier === 'basic' ? 'Pro' : 'Prime'} 方案（${planAction.interval === 'month' ? '月費' : '年費'}）。本次不會扣款。`
                : `確認選擇 ${planAction.tier === 'basic' ? 'Pro' : 'Prime'} 方案（${planAction.interval === 'month' ? '月費' : '年費'}）。本次不會扣款。`
          }
          onCancel={() => setPlanAction(null)}
          onConfirm={() => changeMutation.mutate()}
          disabled={changeMutation.isPending}
          confirmLabel="確認選擇"
          tone="neutral"
        />
      )}
    </div>
  )
}

export function PlansPage({ session }: { session: Session }) {
  const queryClient = useQueryClient()
  const [offerCode, setOfferCode] = useState('')
  const [offerError, setOfferError] = useState('')
  const [offerSuccess, setOfferSuccess] = useState('')
  const grantQuery = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token)
  })
  const planQuery = usePlanAccess(session)
  const offerMutation = useMutation({
    mutationFn: () => redeemBetaCode(session.access_token, offerCode.trim()),
    onSuccess: (grant) => {
      queryClient.setQueryData(betaGrantKey(session.user.id), grant)
      void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      setOfferCode('')
      setOfferError('')
      setOfferSuccess('優惠碼已套用。')
    },
    onError: (reason) => {
      const messages: Record<string, string> = {
        invalid_code: '優惠碼無效，請確認後再試。',
        code_closed: '這組優惠碼已停止使用。',
        code_exhausted: '這組優惠碼的名額已用完。',
        already_used: '這組優惠碼已由此 Email 使用過。',
        already_eligible: '這個帳號已有優惠資格。',
        email_unverified: '請先完成電子信箱驗證。',
        rate_limited: '嘗試次數過多，請稍後再試。'
      }
      if (reason instanceof ApiError) {
        setOfferError(
          reason.details.error === 'rate_limited' && reason.details.retryAfter
            ? `嘗試次數過多，請於 ${reason.details.retryAfter} 秒後再試。`
            : (messages[reason.details.error ?? ''] ?? '暫時無法套用，請稍後再試。')
        )
      } else setOfferError('暫時無法套用，請稍後再試。')
    }
  })

  return (
    <Page
      title="選擇適合你的方案"
      eyebrow="FORM 方案"
      description="依照工作台規模與需要的功能，選擇月費或年費方案。"
      className="plans-page"
      beforeHeader={<MobilePageAppBar title="所有方案" />}
    >
      <Link className="plans-back-link" to="/settings?category=plans">
        <ArrowLeft aria-hidden="true" />
        返回方案與帳單
      </Link>
      <PlanPanel
        session={session}
        grant={grantQuery.data}
        plan={planQuery.data}
        loading={grantQuery.isPending || planQuery.isPending}
        error={grantQuery.isError || planQuery.isError}
        onRetry={() => {
          void grantQuery.refetch()
          void planQuery.refetch()
        }}
        offerCode={offerCode}
        onOfferCodeChange={setOfferCode}
        onRedeem={(event) => {
          event.preventDefault()
          setOfferError('')
          setOfferSuccess('')
          offerMutation.mutate()
        }}
        redeeming={offerMutation.isPending}
        offerError={offerError}
        offerSuccess={offerSuccess}
      />
    </Page>
  )
}
