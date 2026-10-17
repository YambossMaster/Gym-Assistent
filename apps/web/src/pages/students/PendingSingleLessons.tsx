import type { Session } from '@supabase/supabase-js'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../../api'
import { useDefaultFinanceCurrency } from '../settings/finance-currency'
import { financeKey, moneyFactor, singleLessonMinor, useFinanceMutation } from './finance-api'

type Pending = {
  sessionId: string
  sessionVersion: number
  sourceVersion: number
  studentName: string
  venueName: string | null
  date: string
  suggestedAmountMinor: number | null
  suggestedCurrency: string | null
}

export function PendingSingleLessons({ session }: { session: Session }) {
  const defaultCurrency = useDefaultFinanceCurrency()
  const query = useInfiniteQuery({
    queryKey: [...financeKey(session.user.id), 'pending-single-lessons'],
    initialPageParam: '' as string,
    queryFn: ({ pageParam }) =>
      request<{ items: Pending[]; nextCursor: string | null }>(
        `/api/v1/finances/pending-single-lessons${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
        session.access_token
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined
  })
  const mutation = useFinanceMutation(session)
  const [selected, setSelected] = useState<string[]>([])
  const [commonAmount, setCommonAmount] = useState('')
  const [commonCurrency, setCommonCurrency] = useState<string>(defaultCurrency)
  const [overrides, setOverrides] = useState<Record<string, { amount: string; currency: string }>>(
    {}
  )
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [switching, setSwitching] = useState<string | null>(null)
  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const chosen = items.filter((item) => selected.includes(item.sessionId))
  const change = () => {
    setRequestId(crypto.randomUUID())
    mutation.reset()
  }
  const amountFor = (item: Pending) =>
    overrides[item.sessionId]?.amount ??
    (commonAmount ||
      (item.suggestedAmountMinor === null
        ? ''
        : String(
            item.suggestedAmountMinor / moneyFactor(item.suggestedCurrency ?? defaultCurrency)
          )))
  const currencyFor = (item: Pending) =>
    overrides[item.sessionId]?.currency ??
    (commonAmount ? commonCurrency : (item.suggestedCurrency ?? defaultCurrency))
  const save = () => {
    const payload = chosen.map((item) => {
      const amount = amountFor(item)
      const currency = currencyFor(item)
      const amountMinor = singleLessonMinor(amount, currency)
      return {
        sessionId: item.sessionId,
        expectedVersion: item.sessionVersion,
        amountMinor,
        currency,
        valid: amountMinor !== null
      }
    })
    if (!payload.length || payload.some((item) => !item.valid)) return
    mutation.mutate(
      {
        path: '/finances/pending-single-lessons/settle',
        body: { requestId, items: payload.map(({ valid: _valid, ...item }) => item) }
      },
      {
        onSuccess: () => {
          setSelected([])
          setOverrides({})
          setCommonAmount('')
          setRequestId(crypto.randomUUID())
          void query.refetch()
        }
      }
    )
  }
  return (
    <section
      className="finance-section-card pending-single-lessons"
      aria-labelledby="pending-single-title"
    >
      <header className="finance-section-heading">
        <h2 id="pending-single-title">待處理單堂紀錄</h2>
        {items.length > 0 && <span>{items.length} 堂</span>}
      </header>
      {query.isPending ? (
        <p aria-busy="true">正在讀取待處理紀錄…</p>
      ) : query.isError && !query.data ? (
        <p role="alert" className="notice error">
          暫時無法讀取。
          <button type="button" onClick={() => void query.refetch()}>
            重試
          </button>
        </p>
      ) : !items.length ? (
        <p className="finance-context">目前沒有待補金額的課堂。</p>
      ) : (
        <>
          {query.isFetching && <span className="finance-context">正在更新紀錄…</span>}
          {query.isError && (
            <p role="alert" className="notice error">
              更新失敗，目前顯示先前資料。
              <button type="button" onClick={() => void query.refetch()}>
                重試
              </button>
            </p>
          )}
          <div className="pending-single-common">
            <label>
              選取課堂共用金額
              <input
                type="number"
                min="0"
                step={1 / moneyFactor(commonCurrency)}
                value={commonAmount}
                onChange={(event) => {
                  setCommonAmount(event.target.value)
                  change()
                }}
                placeholder="可留空，逐堂輸入"
              />
            </label>
            <label>
              幣別
              <select
                value={commonCurrency}
                onChange={(event) => {
                  setCommonCurrency(event.target.value)
                  change()
                }}
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="JPY">JPY</option>
                <option value="EUR">EUR</option>
                <option value="HKD">HKD</option>
              </select>
            </label>
          </div>
          <div className="pending-single-list">
            {items.map((item) => (
              <div className="pending-single-item" key={item.sessionId}>
                <label className="pending-single-choice">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.sessionId)}
                    onChange={(event) => {
                      setSelected((prior) =>
                        event.target.checked
                          ? [...prior, item.sessionId]
                          : prior.filter((id) => id !== item.sessionId)
                      )
                      change()
                    }}
                  />
                  <span>
                    <strong>{item.studentName}</strong>
                    <small>
                      {item.date} · {item.venueName ?? '未指定場地'}
                    </small>
                  </span>
                </label>
                <div className="pending-single-links">
                  <Link to={`/sessions/${item.sessionId}`}>查看課堂</Link>
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => setSwitching(item.sessionId)}
                  >
                    改用既有堂數
                  </button>
                </div>
                <label>
                  本堂金額
                  <input
                    type="number"
                    min="0"
                    step={1 / moneyFactor(currencyFor(item))}
                    value={amountFor(item)}
                    onChange={(event) => {
                      setOverrides((prior) => ({
                        ...prior,
                        [item.sessionId]: {
                          amount: event.target.value,
                          currency: currencyFor(item)
                        }
                      }))
                      change()
                    }}
                    placeholder="輸入金額"
                  />
                </label>
                <label>
                  幣別
                  <select
                    value={currencyFor(item)}
                    onChange={(event) => {
                      setOverrides((prior) => ({
                        ...prior,
                        [item.sessionId]: { amount: amountFor(item), currency: event.target.value }
                      }))
                      change()
                    }}
                  >
                    <option value="TWD">TWD</option>
                    <option value="USD">USD</option>
                    <option value="JPY">JPY</option>
                    <option value="EUR">EUR</option>
                    <option value="HKD">HKD</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
          {query.hasNextPage && (
            <button
              type="button"
              className="secondary-button"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              載入更多
            </button>
          )}
          <div className="pending-single-footer">
            <span>{chosen.length ? `已選 ${chosen.length} 堂` : '選擇要結算的課堂'}</span>
            <button
              type="button"
              className="primary-button compact"
              disabled={!chosen.length || mutation.isPending}
              onClick={save}
            >
              {mutation.isPending ? '儲存中…' : '儲存單堂金額'}
            </button>
          </div>
          {switching && (
            <div className="notice" role="dialog" aria-label="改用既有堂數">
              <p>改用既有堂數後，這堂課的待補金額會移除。若沒有可用堂數，紀錄會保留。</p>
              <button type="button" className="secondary-button" onClick={() => setSwitching(null)}>
                取消
              </button>
              <button
                type="button"
                className="primary-button compact"
                disabled={mutation.isPending}
                onClick={() => {
                  const item = items.find((entry) => entry.sessionId === switching)
                  if (!item) return
                  mutation.mutate(
                    {
                      path: `/sessions/${item.sessionId}/billing/re-evaluate`,
                      body: {
                        expectedSessionVersion: item.sessionVersion,
                        expectedSourceVersion: item.sourceVersion
                      }
                    },
                    {
                      onSuccess: () => {
                        setSwitching(null)
                        void query.refetch()
                      }
                    }
                  )
                }}
              >
                確認改用
              </button>
            </div>
          )}
          {mutation.isError && (
            <p role="alert" className="notice error">
              紀錄已變更或儲存失敗；輸入仍保留。
              <button type="button" onClick={() => void query.refetch()}>
                更新紀錄
              </button>
            </p>
          )}
        </>
      )}
    </section>
  )
}
