import type { Session } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Page } from '../../shared/primitives'
import { useIncomeRouteQuery } from './queries'

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'TWD' ? 0 : undefined
  }).format(amountMinor)
}

export function IncomePage({ session }: { session: Session }) {
  const income = useIncomeRouteQuery(session)
  return (
    <Page
      className="income-page"
      eyebrow="學生"
      title="每月收支"
      actions={
        <Link className="secondary-button" to="/students">
          <ArrowLeft />
          返回學生
        </Link>
      }
    >
      <section className="income-summary" aria-label="累計實收">
        <span>累計實收</span>
        {income.isPending ? (
          <strong>讀取中…</strong>
        ) : income.isError ? (
          <div className="notice error" role="alert">
            暫時無法讀取實收金額。
            <button type="button" onClick={() => void income.refetch()}>
              重試
            </button>
          </div>
        ) : (
          <div>
            {income.data.length ? (
              income.data.map((item) => (
                <strong key={item.currency}>{formatMoney(item.amountMinor, item.currency)}</strong>
              ))
            ) : (
              <strong>尚無紀錄</strong>
            )}
          </div>
        )}
        <small>依購課時登錄的實收金額整理。</small>
      </section>
    </Page>
  )
}
