import type { ReactNode } from 'react'
import { Page } from '../../../shared/primitives'
import { MobilePageAppBar } from '../../../shared/MobilePageAppBar'
import { SettingsLayout } from '../SettingsLayout'

export function BillingSettingsPage({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Page
      title="設定"
      eyebrow="帳號與工作台"
      className="settings-page"
      beforeHeader={<MobilePageAppBar title="設定" />}
    >
      <SettingsLayout category="plans" title={title} description={description}>
        <div className="billing-content">{children}</div>
      </SettingsLayout>
    </Page>
  )
}
