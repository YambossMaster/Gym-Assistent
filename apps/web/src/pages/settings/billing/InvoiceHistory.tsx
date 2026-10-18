import { ArrowRight, FileText, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { formatDate, formatMoney, type Invoice } from './types'
import './billing.css'

export const invoiceStatus = {
  paid: '已付款',
  pending: '待付款',
  void: '已作廢',
  refunded: '已退款',
  partial_refund: '部分退款'
}

/** Presentation shared by the real Settings panel and the isolated review harness. */
export function InvoiceHistory({
  invoices,
  onSelect,
  onRefresh,
  refreshing = false,
  unavailable = false
}: {
  invoices: Invoice[]
  onSelect?: (id: string) => void
  onRefresh?: () => void
  refreshing?: boolean
  unavailable?: boolean
}) {
  const [filter, setFilter] = useState('all')
  const hasRefunds = invoices.some((invoice) => invoice.refunded.amount > 0)
  const activeFilter = filter === 'refund' && !hasRefunds ? 'all' : filter
  const visible = invoices.filter(
    (invoice) =>
      activeFilter === 'all' ||
      (activeFilter === 'refund'
        ? ['refunded', 'partial_refund'].includes(invoice.status)
        : invoice.status === activeFilter)
  )
  return (
    <section
      className="settings-billing-card billing-invoices"
      aria-labelledby="billing-invoices-title"
    >
      <header>
        <div>
          <h3 id="billing-invoices-title">帳單紀錄</h3>
          <p>{hasRefunds ? '費用與退款皆保留在原始帳單中。' : '查看每筆訂閱付款紀錄。'}</p>
        </div>
        {onRefresh && (
          <button
            className="billing-icon-button"
            aria-label="更新帳單"
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshCw aria-hidden="true" />
          </button>
        )}
      </header>
      <div className="billing-filters" role="group" aria-label="篩選帳單">
        {(
          [
            ['all', '全部'],
            ['paid', '已付款'],
            ['refund', '退款'],
            ['pending', '待付款']
          ] as const
        )
          .filter(([value]) => value !== 'refund' || hasRefunds)
          .map(([value, label]) => (
            <button
              key={value}
              aria-pressed={activeFilter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
      </div>
      {unavailable ? (
        <div className="billing-empty">
          <FileText aria-hidden="true" />
          <h3>帳單服務尚未開放</h3>
          <p>訂閱開放後，可在這裡查看付款紀錄。</p>
        </div>
      ) : visible.length ? (
        <ul className="billing-invoice-list">
          {visible.map((invoice) => (
            <li key={invoice.id}>
              <FileText aria-hidden="true" />
              <div className="billing-invoice-description">
                <strong>{invoice.description}</strong>
                <span>
                  {formatDate(invoice.createdAt)} · {invoice.number}
                </span>
              </div>
              <span className={`billing-invoice-state is-${invoice.status}`}>
                {invoiceStatus[invoice.status]}
              </span>
              <div className="billing-invoice-amount">
                <strong>{formatMoney(invoice.total)}</strong>
                {invoice.refunded.amount > 0 && <small>已退 {formatMoney(invoice.refunded)}</small>}
              </div>
              {onSelect && (
                <button
                  className="billing-invoice-hit"
                  aria-label={`查看 ${invoice.number} 明細`}
                  onClick={() => onSelect(invoice.id)}
                >
                  <span className="sr-only">查看 {invoice.number} 明細</span>
                </button>
              )}
              {onSelect && <ArrowRight className="billing-invoice-arrow" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      ) : (
        <div className="billing-empty">
          <FileText aria-hidden="true" />
          <h3>{filter === 'all' ? '尚無帳單' : '沒有符合的帳單'}</h3>
          <p>{filter === 'all' ? '完成首次付款後，帳單會顯示在這裡。' : '試著切換其他狀態。'}</p>
        </div>
      )}
    </section>
  )
}
