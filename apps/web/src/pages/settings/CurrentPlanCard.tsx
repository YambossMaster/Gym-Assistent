import { Sparkles } from 'lucide-react'
import { useId, type ReactNode } from 'react'

/** Shared presentation for the existing Settings plan and future paid subscriptions. */
export function CurrentPlanCard({
  title,
  status,
  period,
  description,
  headerAction,
  children
}: {
  title: string
  status?: string
  period?: string
  description?: string
  headerAction?: ReactNode
  children?: ReactNode
}) {
  const titleId = useId()
  return (
    <section className="settings-current-plan-card" aria-labelledby={titleId}>
      <header className="settings-current-plan-heading">
        <div className="settings-current-plan-heading-copy">
          <span className="settings-plan-kicker">目前方案</span>
          <div className="settings-current-plan-title-row">
            {status && (
              <span className="settings-current-plan-icon" aria-hidden="true">
                <Sparkles />
              </span>
            )}
            <h3 id={titleId}>{title}</h3>
            {status && (
              <>
                <span className="settings-plan-status">{status}</span>
                <span className="settings-current-plan-title-break" aria-hidden="true" />
              </>
            )}
            {period && <span className="settings-current-plan-period">{period}</span>}
          </div>
          {description && <p>{description}</p>}
        </div>
        {headerAction}
      </header>
      {children}
    </section>
  )
}
