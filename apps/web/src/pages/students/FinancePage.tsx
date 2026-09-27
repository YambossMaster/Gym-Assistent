import type { Session } from '@supabase/supabase-js'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { request } from '../../api'
import { FormSelect } from '../../shared/FormSelect'
import { financeKey, financeMoney, financeReadRecovery, type MonthlyFinance } from './finance-api'
import { FinanceLedger } from './FinanceLedger'

const monthLabel = (value: string) => {
  const [year, month] = value.split('-')
  return `${year} 年 ${Number(month)} 月`
}

export function FinancePage({ session }: { session: Session }) {
  const [params, setParams] = useSearchParams(),
    month = params.get('month')
  const selectMonth = (value?: string) => {
    setParams(value ? { month: value } : {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const query = useQuery({
    queryKey: [...financeKey(session.user.id), 'detail', month ?? 'current'],
    queryFn: () =>
      request<MonthlyFinance>(
        `/api/v1/finances/${month ? `months/${encodeURIComponent(month)}` : 'current'}`,
        session.access_token
      ),
    ...financeReadRecovery
  })
  const history = useInfiniteQuery({
    queryKey: [...financeKey(session.user.id), 'months'],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) =>
      request<{ months: string[]; nextCursor: string | null }>(
        `/api/v1/finances/months${pageParam ? `?cursor=${pageParam}` : ''}`,
        session.access_token
      ),
    ...financeReadRecovery,
    getNextPageParam: (p) => p.nextCursor ?? undefined
  })
  const data = query.data,
    tracked = data?.coverage !== 'none',
    displayedMonth = data?.month ?? month,
    monthOptions = [
      { value: '', label: !month && data ? monthLabel(data.month) : '返回' },
      ...[...new Set(history.data?.pages.flatMap((page) => page.months) ?? [])]
        .filter((value) => month || value !== data?.month)
        .map((value) => ({ value, label: monthLabel(value) })),
      ...(month && !history.data?.pages.some((page) => page.months.includes(month))
        ? [{ value: month, label: monthLabel(month) }]
        : []),
      ...(history.hasNextPage
        ? [{ value: '__more__', label: history.isFetchingNextPage ? '載入中…' : '載入更早月份' }]
        : [])
    ]
  return (
    <section className="page income-page finance-page">
      <Link className="student-detail-back" to="/students">
        <ArrowLeft aria-hidden="true" />
        返回
      </Link>
      <section
        className="finance-overview finance-section-card"
        aria-labelledby="finance-overview-title"
      >
        <header className="finance-section-heading">
          <h1 id="finance-overview-title">
            {displayedMonth ? `${monthLabel(displayedMonth)} 收支概覽` : '收支概覽'}
          </h1>
          <div className="finance-month-picker">
            <FormSelect
              label="選擇收支月份"
              displayValue={displayedMonth ? `${monthLabel(displayedMonth)} 收支概覽` : '收支概覽'}
              options={monthOptions}
              value={month ?? ''}
              onChange={(value) => {
                if (value === '__more__') void history.fetchNextPage()
                else selectMonth(value || undefined)
              }}
            />
            {history.isError && (
              <span role="alert" className="finance-month-error">
                月份讀取失敗。<button onClick={() => void history.refetch()}>重試</button>
              </span>
            )}
          </div>
        </header>
        {query.isPending ? (
          <div className="finance-loading" aria-busy="true">
            正在讀取收支…
          </div>
        ) : query.isError && !data ? (
          <div className="notice error" role="alert">
            暫時無法讀取收支。<button onClick={() => void query.refetch()}>重試</button>
          </div>
        ) : (
          data && (
            <>
              {query.isError && (
                <p role="alert" className="notice error">
                  更新失敗，目前顯示先前資料。
                  <button onClick={() => void query.refetch()}>重試</button>
                </p>
              )}
              <div className={`finance-totals ${tracked ? '' : 'income-only'}`}>
                {data.totals.length ? (
                  data.totals.map((t) => (
                    <div key={t.currency} className="finance-currency-totals">
                      <div className="finance-total income">
                        <span>{month ? '已記錄收入' : '本月已記錄收入'}</span>
                        <strong>{financeMoney(t.incomeMinor, t.currency)}</strong>
                        {data.hasManualAdjustments && <small>含手動調整</small>}
                      </div>
                      {tracked && (
                        <>
                          <span className="finance-operator" aria-hidden="true">
                            −
                          </span>
                          <div className="finance-total">
                            <span>已記錄場地支出</span>
                            <strong>{financeMoney(t.expenseMinor, t.currency)}</strong>
                          </div>
                          <span className="finance-operator equals" aria-hidden="true">
                            =
                          </span>
                          <div className="finance-total difference">
                            <span>已記錄試算差額</span>
                            <span className="finance-result-value">
                              <span className="finance-mobile-equals" aria-hidden="true">
                                =
                              </span>
                              <strong>{financeMoney(t.differenceMinor, t.currency)}</strong>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="finance-empty">
                    <h2>這個月尚無收支紀錄</h2>
                    <Link to="/students">
                      前往學生資料登錄購課 <ArrowUpRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
              {!tracked && (
                <Link className="finance-setup-invitation" to="/students/venues">
                  需要一併記錄場地費用？
                  <span>
                    設定場地 <ChevronRight size={16} />
                  </span>
                </Link>
              )}
            </>
          )
        )}
      </section>
      {data && !query.isPending && (
        <>
          {data.missing.length > 0 && (
            <section className="finance-missing finance-section-card">
              <h2>待補資料</h2>
              {data.missing.map((m) => (
                <Link key={m.sessionId} to={`/sessions/${m.sessionId}`}>
                  {m.label} ·{' '}
                  {m.reason === 'price'
                    ? '尚無可歸屬的購課價格'
                    : m.reason === 'source'
                      ? '尚未選擇客源'
                      : '尚無適用費率'}
                  <ChevronRight size={16} />
                </Link>
              ))}
            </section>
          )}
          <FinanceLedger key={data.month} session={session} data={data} />
        </>
      )}
    </section>
  )
}
