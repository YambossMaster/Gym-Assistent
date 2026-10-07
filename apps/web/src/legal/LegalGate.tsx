import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { signOutCurrentDevice } from '../account-auth'
import { acceptLegalTerms, readLegalAcceptance } from '../api'
import { Brand } from '../shared/primitives'
import { supabase } from '../supabase'

export const legalAcceptanceKey = (coachId: string) =>
  ['coach', coachId, 'legal-acceptance'] as const

export function LegalGate({ session, children }: { session: Session; children: ReactNode }) {
  const client = useQueryClient()
  const [acceptedDocuments, setAcceptedDocuments] = useState(false)
  const [exitError, setExitError] = useState('')
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
        <div className="auth-copy">
          <span className="eyebrow">FORM COACH DESK</span>
          <h1>
            專業，
            <br />
            始於<span>有跡可循。</span>
          </h1>
          <p>告別凌亂的備忘錄。系統化保留學員的完整軌跡，讓每一堂課都無縫接軌。</p>
        </div>
      </section>
      <section className="auth-panel">
        <form
          className="auth-card legal-acceptance-card"
          onSubmit={(event) => {
            event.preventDefault()
            if (acceptedDocuments) mutation.mutate()
          }}
        >
          <div>
            <span className="eyebrow legal-eyebrow">開始使用</span>
            <h2>請確認使用條款與隱私權政策</h2>
            <p>請閱讀以下文件後再繼續使用 Form Coach Desk。</p>
          </div>
          <label className="legal-check">
            <input
              type="checkbox"
              checked={acceptedDocuments}
              onChange={(event) => setAcceptedDocuments(event.target.checked)}
            />
            <span>
              我已閱讀並同意 <Link to="/terms">使用條款</Link> 與{' '}
              <Link to="/privacy">隱私權政策</Link>。
            </span>
          </label>
          {mutation.isError && (
            <p className="form-error" role="alert">
              接受狀態未儲存，請稍後再試。
            </p>
          )}
          {exitError && (
            <p className="form-error" role="alert">
              {exitError}
            </p>
          )}
          <button
            type="submit"
            className="primary-button"
            disabled={!acceptedDocuments || mutation.isPending}
          >
            <span>{mutation.isPending ? '儲存中…' : '同意並進入工作台'}</span>
            <ArrowRight aria-hidden="true" />
          </button>
          <div className="auth-links legal-gate-return">
            <button
              type="button"
              onClick={() => {
                setExitError('')
                void signOutCurrentDevice(supabase.auth).catch(() =>
                  setExitError('返回登入未完成，請稍後再試。')
                )
              }}
            >
              返回登入
            </button>
          </div>
          <p className="legal-support">
            有疑問請聯絡 <a href="mailto:support@formcoachdesk.com">support@formcoachdesk.com</a>
          </p>
        </form>
      </section>
    </main>
  )
}
