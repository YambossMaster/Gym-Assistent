import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleUserRound,
  Dumbbell,
  LayoutGrid,
  Menu,
  Settings,
  UsersRound,
  X
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { shouldHandleDeleteShortcut } from '../modalShortcuts'
import { useStore } from '../store'

export { FormSelect, type FormSelectOption } from './FormSelect'

const nav = [
  { to: '/today', label: '今日', icon: LayoutGrid },
  { to: '/calendar', label: '行事曆', icon: CalendarDays },
  { to: '/students', label: '學生', icon: UsersRound },
  { to: '/exercises', label: '動作庫', icon: Dumbbell },
  { to: '/settings', label: '設定', icon: Settings }
]

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { data } = useStore()
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>
            FORM<small>COACH DESK</small>
          </span>
        </div>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="關閉選單"
        >
          <X />
        </button>
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <item.icon />
              <span>{item.label}</span>
              <ChevronRight className="nav-arrow" />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-state">
            <span /> 已同步・剛剛
          </div>
          <div className="coach-card">
            <div className="coach-avatar">
              {data.settings.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{data.settings.displayName}</strong>
              <small>台北・GMT+8</small>
            </div>
            <CircleUserRound />
          </div>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <div className="brand compact">
            <span className="brand-mark">F</span>
            <span>FORM</span>
          </div>
          <button className="icon-button">
            <Bell />
          </button>
        </header>
        {children}
      </main>
      <nav className="bottom-nav">
        {nav.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-header reveal">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  onDelete,
  wide = false,
  className = ''
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onDelete?: () => void
  wide?: boolean
  className?: string
}) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      const target = event.target instanceof HTMLElement ? event.target : null
      if (
        shouldHandleDeleteShortcut(
          event.key,
          target?.tagName ?? '',
          target?.isContentEditable ?? false,
          Boolean(onDelete)
        )
      ) {
        event.preventDefault()
        onDelete?.()
        return
      }
      if (
        event.key === 'Enter' &&
        !event.defaultPrevented &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !(event.target instanceof HTMLButtonElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLSelectElement)
      ) {
        const form = cardRef.current?.querySelector('form')
        if (form) {
          event.preventDefault()
          form.requestSubmit()
        }
      }
    }
    window.addEventListener('keydown', handleKeyboardShortcut)
    return () => window.removeEventListener('keydown', handleKeyboardShortcut)
  }, [onClose, onDelete])

  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <div ref={cardRef} className={`modal-card ${wide ? 'wide' : ''} ${className} reveal`}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">FORM / ACTION</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="關閉">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Badge = ({
  tone = 'neutral',
  children
}: {
  tone?: 'neutral' | 'lime' | 'red' | 'amber'
  children: ReactNode
}) => <span className={`badge ${tone}`}>{children}</span>

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-glyph">○</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
