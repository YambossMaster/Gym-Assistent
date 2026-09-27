import type { Session } from '@supabase/supabase-js'
import { ArrowLeft } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Page } from '../../shared/primitives'
import { VenueManager } from './VenueManager'
import { financeReturnPath } from './finance-api'

export function VenuePage({ session }: { session: Session }) {
  const [params] = useSearchParams()
  const fromFinance = params.get('from') === 'finances'
  return (
    <Page
      className="finance-page venue-page"
      eyebrow="學生"
      title="場地管理"
      beforeHeader={
        <Link
          className="student-detail-back"
          to={fromFinance ? financeReturnPath(params) : '/students'}
        >
          <ArrowLeft aria-hidden="true" />
          返回
        </Link>
      }
    >
      <VenueManager session={session} />
    </Page>
  )
}
