import type { ReactNode } from 'react'
import { Page } from '../shared/primitives'

export function RoutePlaceholder({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <Page title={title}>
      <section className="empty-state">
        {icon}
        <h2>此功能尚未提供。</h2>
      </section>
    </Page>
  )
}
