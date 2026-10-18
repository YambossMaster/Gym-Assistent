import type { ReactNode, Ref } from 'react'
import {
  ArrowRight,
  CreditCard,
  Database,
  MessageSquare,
  SlidersHorizontal,
  Shield,
  UserRound
} from 'lucide-react'
export const settingsCategories = [
  {
    id: 'profile',
    label: '教練與工作台',
    icon: UserRound,
    description: '管理教練名稱與工作時區。'
  },
  {
    id: 'preferences',
    label: '工作偏好',
    icon: SlidersHorizontal,
    description: '調整新增紀錄時使用的預設值。'
  },
  {
    id: 'plans',
    label: '方案與帳單',
    icon: CreditCard,
    description: '查看目前方案與管理選項。'
  },
  { id: 'security', label: '帳號與安全', icon: Shield, description: '管理登入方式與帳號狀態。' },
  {
    id: 'data',
    label: '資料與裝置',
    icon: Database,
    description: '匯出收支、設定日曆整合與管理裝置暫存。'
  },
  {
    id: 'feedback',
    label: '協助與回饋',
    icon: MessageSquare,
    description: '查看使用教學、回報問題或聯絡我們。'
  }
] as const

export type SettingsCategory = (typeof settingsCategories)[number]['id']
export function SettingsLayout({
  category,
  onCategoryChange,
  trackRef,
  title,
  description,
  children
}: {
  category: SettingsCategory
  onCategoryChange?: (category: SettingsCategory) => void
  trackRef?: Ref<HTMLDivElement>
  title?: string
  description?: string
  children: ReactNode
}) {
  const selected = settingsCategories.find((item) => item.id === category)!
  return (
    <section className="settings-layout">
      <nav className="settings-category-nav" aria-label="設定分類">
        <span className="settings-category-nav-label">分類</span>
        <div ref={trackRef} className="settings-category-track">
          {settingsCategories.map((item) => (
            <button
              type="button"
              key={item.id}
              className={category === item.id ? 'is-active' : ''}
              aria-current={category === item.id ? 'page' : undefined}
              disabled={!onCategoryChange && item.id !== category}
              onClick={() => onCategoryChange?.(item.id)}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label}</span>
              <ArrowRight aria-hidden="true" className="settings-category-arrow" />
            </button>
          ))}
        </div>
      </nav>
      <div className={`settings-detail${category === 'data' ? ' settings-detail-data' : ''}`}>
        <header className="settings-detail-heading">
          <span className="eyebrow dark">SETTINGS</span>
          <h2>{title ?? selected.label}</h2>
          <p>{description ?? selected.description}</p>
        </header>
        {children}
      </div>
    </section>
  )
}
