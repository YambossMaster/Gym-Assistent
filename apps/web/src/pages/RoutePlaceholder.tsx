import type { ReactNode } from 'react'
import { Page } from '../shared/primitives'

export function RoutePlaceholder({
  title,
  text,
  icon
}: {
  title: string
  text: string
  icon: ReactNode
}) {
  return (
    <Page title={title}>
      <section className="empty-state">
        {icon}
        <h2>{text}</h2>
        <p>內容準備好後，會在這裡提供完整操作。</p>
      </section>
    </Page>
  )
}
