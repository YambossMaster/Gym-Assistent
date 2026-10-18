import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Download } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlanComparisonBanner } from '../PlanComparisonBanner'
import { CurrentPlanCard } from '../CurrentPlanCard'
import { BillingSettingsPage } from './BillingSettingsPage'
import { BillingDialog } from './BillingDialog'
import { formatDate, formatMoney, tierName, intervalName, type BillingGateway } from './types'
import { InvoiceHistory, invoiceStatus } from './InvoiceHistory'
import type { PlanAccess } from '../../../api'
import './billing.css'

export function BillingPanel({
  accountId,
  gateway,
  onChoosePlan,
  onViewCheckout,
  embedded = false,
  planAccess
}: {
  accountId: string
  gateway: BillingGateway
  onChoosePlan: () => void
  onViewCheckout: () => void
  embedded?: boolean
  planAccess?: PlanAccess
}) {
  const client = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const closeCancelDialog = () => {
    setCancelOpen(false)
  }
  const query = useQuery({
    queryKey: ['billing', accountId, 'overview'],
    queryFn: ({ signal }) => gateway.billing(signal),
    retry: false
  })
  const subscription = query.data?.subscription
  const selected = query.data?.invoices.find((invoice) => invoice.id === selectedId)
  const cancel = useMutation({
    mutationFn: () => gateway.cancel(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['billing', accountId] })
      closeCancelDialog()
    }
  })
  const receipt = useMutation({
    mutationFn: async (id: string) => {
      const url = await gateway.receipt(id)
      const parsed = new URL(url)
      if (
        parsed.protocol !== 'https:' ||
        parsed.username ||
        parsed.password ||
        !(parsed.hostname === 'lemonsqueezy.com' || parsed.hostname.endsWith('.lemonsqueezy.com'))
      )
        throw new Error('invalid_receipt_url')
      return url
    }
  })
  const content = (
    <>
      {query.isPending ? (
        <div className="billing-empty" role="status">
          正在讀取方案與帳單…
        </div>
      ) : (
        <>
          {query.isError && (
            <div className="billing-error" role="alert">
              暫時無法更新帳單。
              <button className="billing-text-link" onClick={() => void query.refetch()}>
                重新讀取
              </button>
            </div>
          )}
          {query.data && (
            <>
              <CurrentPlanCard
                title={
                  subscription
                    ? tierName(subscription.tier) + ' 方案'
                    : planAccess?.source === 'permanent' || planAccess?.source === 'promotional'
                      ? 'Prime 方案'
                      : 'Free 方案'
                }
                status={
                  !subscription
                    ? planAccess?.source === 'permanent'
                      ? '永久資格'
                      : planAccess?.source === 'promotional'
                        ? '優惠體驗中'
                        : '使用中'
                    : {
                        trial: '免費體驗中',
                        active: '使用中',
                        cancelled: '已取消續訂',
                        past_due: '待處理付款'
                      }[subscription.status]
                }
                period={
                  subscription
                    ? intervalName(subscription.interval) + '繳方案'
                    : planAccess?.source === 'promotional'
                      ? '優惠體驗'
                      : planAccess?.source === 'permanent'
                        ? '永久方案'
                        : '免費方案'
                }
              >
                {subscription ? (
                  <dl className="settings-current-plan-facts">
                    <div>
                      <dt>
                        {subscription.status === 'cancelled'
                          ? '可使用至'
                          : subscription.status === 'trial'
                            ? '首次扣款'
                            : subscription.status === 'past_due'
                              ? '已付款權限至'
                              : '本期結束'}
                      </dt>
                      <dd>{formatDate(subscription.endsAt)}</dd>
                    </div>
                    <div>
                      <dt>{subscription.status === 'cancelled' ? '到期後' : '續訂費用'}</dt>
                      <dd>
                        {subscription.status === 'cancelled'
                          ? '回到 Free，不再扣款'
                          : `${formatMoney(subscription.renewal)}／${intervalName(subscription.interval)}`}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="billing-free-description">
                    {planAccess?.source === 'promotional' && planAccess.offerEndsAt
                      ? `優惠體驗至 ${formatDate(planAccess.offerEndsAt)}`
                      : planAccess?.source === 'permanent'
                        ? '永久 Prime 資格'
                        : '日常教學的基本功能，隨時可以開始使用。'}
                  </p>
                )}
                {(subscription || query.data.pendingCheckout) && (
                  <footer className="settings-current-plan-actions">
                    {subscription ? (
                      <span>
                        {subscription.status === 'cancelled'
                          ? '帳號與既有資料會保留。'
                          : subscription.status === 'past_due'
                            ? '續訂扣款未完成；到期前若未確認付款，將改用 Free。'
                            : '可隨時取消續訂，使用至目前期限。'}
                      </span>
                    ) : query.data.pendingCheckout ? (
                      <span>訂閱尚待確認，請勿重新付款。</span>
                    ) : null}
                    {query.data.pendingCheckout && (
                      <button className="billing-progress-link" onClick={onViewCheckout}>
                        查看訂閱進度 <ArrowRight aria-hidden="true" />
                      </button>
                    )}
                    {subscription && subscription.status !== 'cancelled' && (
                      <button
                        className="settings-plan-cancel"
                        onClick={() => {
                          cancel.reset()
                          setCancelOpen(true)
                        }}
                      >
                        取消續訂
                      </button>
                    )}
                  </footer>
                )}
              </CurrentPlanCard>
              <PlanComparisonBanner onOpen={onChoosePlan} />
              <InvoiceHistory
                invoices={query.data.invoices}
                refreshing={query.isFetching}
                onRefresh={() => void query.refetch()}
                onSelect={(id) => {
                  receipt.reset()
                  setSelectedId(id)
                }}
              />
              <div className="billing-help">
                <Link to="/settings?category=feedback#help-contact">帳單有疑問？聯絡我們</Link>
              </div>
            </>
          )}
        </>
      )}
      {cancelOpen && subscription && (
        <BillingDialog
          title="取消自動續訂？"
          onClose={() => {
            if (!cancel.isPending) closeCancelDialog()
          }}
          actions={
            <>
              <button
                className="secondary-button"
                onClick={closeCancelDialog}
                disabled={cancel.isPending}
              >
                保留訂閱
              </button>
              <button
                className="primary-button compact"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                {cancel.isPending ? '處理中…' : '確認取消續訂'}
              </button>
            </>
          }
        >
          <p>
            你仍可使用 {tierName(subscription.tier)} 至{' '}
            <strong>{formatDate(subscription.endsAt)}</strong>，之後不再續訂扣款。
          </p>
          <p>
            到期後回到 Free，既有資料會保留。若超過 Free 的 5 名學員或 1
            個場地額度，部分儲存操作會受限。
          </p>
          {cancel.isError && (
            <p role="alert" className="billing-error">
              {cancel.error instanceof Error && cancel.error.message === 'cancellation_pending'
                ? '正在確認取消結果，請稍後再確認；確認完成前仍會顯示原訂閱狀態。'
                : '取消尚未完成，請重試；目前訂閱仍以原狀態為準。'}
            </p>
          )}
        </BillingDialog>
      )}
      {selected && (
        <BillingDialog
          title="帳單明細"
          onClose={() => setSelectedId(null)}
          actions={
            receipt.data ? (
              <a
                className="primary-button compact"
                href={receipt.data}
                target="_blank"
                rel="noopener noreferrer"
              >
                開啟付款憑證 <ArrowRight aria-hidden="true" />
              </a>
            ) : (
              <button
                className="primary-button compact"
                disabled={!selected.receiptAvailable || receipt.isPending}
                onClick={() => receipt.mutate(selected.id)}
              >
                <Download aria-hidden="true" />
                {receipt.isPending
                  ? '正在取得…'
                  : selected.receiptAvailable
                    ? '取得付款憑證'
                    : '尚未提供付款憑證'}
              </button>
            )
          }
        >
          <p className="billing-muted">
            {selected.number} · {formatDate(selected.createdAt)}
          </p>
          <h3>{selected.description}</h3>
          {selected.period && <p>{selected.period}</p>}
          <span className="billing-invoice-state">{invoiceStatus[selected.status]}</span>
          <dl className="billing-invoice-totals">
            <div>
              <dt>原始金額</dt>
              <dd>{formatMoney(selected.total)}</dd>
            </div>
            {selected.refunded.amount > 0 && (
              <>
                <div>
                  <dt>已退款</dt>
                  <dd>−{formatMoney(selected.refunded)}</dd>
                </div>
                <div>
                  <dt>退款後金額</dt>
                  <dd>
                    {formatMoney({
                      ...selected.total,
                      amount: selected.total.amount - selected.refunded.amount
                    })}
                  </dd>
                </div>
              </>
            )}
          </dl>
          {receipt.isError && (
            <p role="alert" className="billing-error">
              暫時無法取得憑證，請稍後再試。
            </p>
          )}
        </BillingDialog>
      )}
    </>
  )
  return embedded ? (
    <div className="billing-content">{content}</div>
  ) : (
    <BillingSettingsPage title="方案與帳單" description="查看目前方案、續訂時間與付款紀錄。">
      {content}
    </BillingSettingsPage>
  )
}
