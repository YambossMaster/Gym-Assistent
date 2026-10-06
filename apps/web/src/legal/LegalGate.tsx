import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { acceptLegalTerms, readLegalAcceptance } from '../api'
import { Brand } from '../shared/primitives'

export const legalAcceptanceKey = (coachId: string) =>
  ['coach', coachId, 'legal-acceptance'] as const

export function LegalGate({ session, children }: { session: Session; children: ReactNode }) {
  const client = useQueryClient()
  const [acceptedDocuments, setAcceptedDocuments] = useState(false)
  const [acceptedRisk, setAcceptedRisk] = useState(false)
  const query = useQuery({
    queryKey: legalAcceptanceKey(session.user.id),
    queryFn: () => readLegalAcceptance(session.access_token),
    retry: 1
  })
  const mutation = useMutation({
    mutationFn: () =>
      acceptLegalTerms(session.access_token, {
        termsVersion: query.data!.termsVersion,
        privacyVersion: query.data!.privacyVersion
      }),
    onSuccess: (legal) => client.setQueryData(legalAcceptanceKey(session.user.id), legal)
  })

  if (query.isPending)
    return (
      <main className="auth-layout" role="status">
        正在確認使用條款…
      </main>
    )
  if (query.isError)
    return (
      <main className="auth-layout" role="alert">
        <div className="auth-card">
          <h2>暫時無法載入使用條款</h2>
          <button type="button" className="primary-button" onClick={() => void query.refetch()}>
            重試
          </button>
        </div>
      </main>
    )
  if (query.data.accepted) return children

  return (
    <main className="auth-layout auth-entry-form">
      <section className="auth-story">
        <Brand />
      </section>
      <section className="auth-panel">
        <form
          className="auth-card legal-acceptance-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (acceptedDocuments && acceptedRisk) mutation.mutate()
          }}
        >
          <div>
            <span className="eyebrow">內部測試</span>
            <h2>開始前，請確認測試規則</h2>
            <p>這個環境目前只使用合成測試資料。</p>
          </div>
          <label className="legal-check">
            <input
              type="checkbox"
              checked={acceptedDocuments}
              onChange={(event) => setAcceptedDocuments(event.target.checked)}
            />
            <span>
              我已閱讀並同意 <Link to="/terms">使用條款</Link> 與{' '}
              <Link to="/privacy">隱私聲明</Link>。
            </span>
          </label>
          <label className="legal-check legal-risk-check">
            <input
              type="checkbox"
              checked={acceptedRisk}
              onChange={(event) => setAcceptedRisk(event.target.checked)}
            />
            <span>我知道目前沒有定期資料庫備份，測試資料損毀或遺失時可能無法還原。</span>
          </label>
          {mutation.isError && (
            <p className="form-error" role="alert">
              接受狀態未儲存，請稍後再試。
            </p>
          )}
          <button
            type="submit"
            className="primary-button"
            disabled={!acceptedDocuments || !acceptedRisk || mutation.isPending}
          >
            {mutation.isPending ? '儲存中…' : '同意並進入工作台'}
          </button>
          <p className="legal-support">
            有疑問請聯絡 <a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
          </p>
        </form>
      </section>
    </main>
  )
}
