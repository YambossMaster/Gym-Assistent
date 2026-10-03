import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, readBetaGrant, redeemBetaCode, deleteAccountImmediately } from '../api'
import { signOutCurrentDevice } from '../account-auth'
import { supabase } from '../supabase'

export const betaGrantKey = (coachId: string) => ['coach', coachId, 'beta-grant'] as const

export function BetaGate({
  session,
  initialCode,
  children
}: {
  session: Session
  initialCode: string
  children: ReactNode
}) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: betaGrantKey(session.user.id),
    queryFn: () => readBetaGrant(session.access_token),
    retry: 1
  })
  const grant = query.data
  useEffect(() => {
    if (grant?.state !== 'promotional') return
    const remaining = new Date(grant.endsAt).getTime() - Date.now()
    const timeout = window.setTimeout(
      () => void client.invalidateQueries({ queryKey: betaGrantKey(session.user.id) }),
      Math.max(0, Math.min(remaining + 1000, 2_147_483_647))
    )
    return () => window.clearTimeout(timeout)
  }, [client, grant, session.user.id])

  if (query.isPending)
    return (
      <main className="beta-gate-message" role="status">
        正在確認使用資格…
      </main>
    )
  if (query.isError)
    return (
      <main className="beta-gate-message" role="alert">
        <p>暫時無法確認使用資格。</p>
        <button type="button" onClick={() => void query.refetch()}>
          重試
        </button>
      </main>
    )
  if (grant?.state === 'unactivated')
    return <BetaActivation key={session.user.id} session={session} initialCode={initialCode} />
  return <>{children}</>
}

function BetaActivation({ session, initialCode }: { session: Session; initialCode: string }) {
  const client = useQueryClient()
  const [code, setCode] = useState(initialCode)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const redeem = useMutation({
    mutationFn: () => redeemBetaCode(session.access_token, code.trim(), acknowledged),
    onSuccess: (grant) => {
      setCode('')
      client.setQueryData(betaGrantKey(session.user.id), grant)
    },
    onError: (reason) => {
      if (reason instanceof ApiError) {
        const message: Record<string, string> = {
          invalid_code: '邀請碼無效，請確認後再試。',
          code_closed: '這組邀請碼已停止兌換。',
          code_exhausted: '這組邀請碼的名額已用完。',
          already_used: '這組邀請碼已由此 Email 使用過。',
          email_unverified: '請先完成電子信箱驗證。',
          acknowledgment_required: '請先確認資料備份告知。',
          rate_limited: '嘗試次數過多，請稍後再試。'
        }
        setError(
          reason.details.error === 'rate_limited' && reason.details.retryAfter
            ? `嘗試次數過多，請於 ${reason.details.retryAfter} 秒後再試。`
            : (message[reason.details.error ?? ''] ?? '暫時無法啟用，請稍後再試。')
        )
      } else setError('暫時無法啟用，請稍後再試。')
    }
  })
  const deleteAccount = useMutation({
    mutationFn: () => deleteAccountImmediately(session.access_token),
    onSuccess: () => void signOutCurrentDevice(supabase.auth),
    onError: () => setError('暫時無法刪除帳號，請稍後再試。')
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    redeem.mutate()
  }
  return (
    <main className="beta-activation">
      <form className="beta-activation-card" onSubmit={submit}>
        <p className="eyebrow">FORM COACH DESK</p>
        <h1>啟用教練工作台</h1>
        <p>
          輸入收到的邀請碼，即可開始使用。90 天體驗期結束後，你仍可使用免費方案的現有功能與資料。
        </p>
        <label>
          邀請碼
          <input
            autoComplete="off"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </label>
        <label className="beta-disclosure">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            required
          />
          <span>
            目前沒有定期資料庫備份；若服務或資料庫發生故障，學員與訓練紀錄可能無法還原。我已閱讀並理解這項風險。
          </span>
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={redeem.isPending}>
          {redeem.isPending ? '正在啟用…' : '啟用工作台'}
        </button>
        <div className="beta-activation-actions">
          <button type="button" onClick={() => void signOutCurrentDevice(supabase.auth)}>
            登出
          </button>
          <button type="button" onClick={() => setDeleteConfirm(true)}>
            刪除未啟用帳號
          </button>
        </div>
        {deleteConfirm && (
          <div className="beta-delete-confirm">
            <p>刪除帳號後，這組邀請碼不會因此恢復名額。</p>
            <button type="button" onClick={() => setDeleteConfirm(false)}>
              返回
            </button>
            <button
              type="button"
              disabled={deleteAccount.isPending}
              onClick={() => deleteAccount.mutate()}
            >
              確定刪除帳號
            </button>
          </div>
        )}
      </form>
    </main>
  )
}
