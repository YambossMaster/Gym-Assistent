import { CalendarDays, Dumbbell, LayoutGrid, Settings, UsersRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
export const navigation = [
  { to: '/today', label: '今日', icon: LayoutGrid },
  { to: '/calendar', label: '行事曆', icon: CalendarDays },
  { to: '/students', label: '學生', icon: UsersRound },
  { to: '/exercises', label: '動作庫', icon: Dumbbell },
  { to: '/settings', label: '設定', icon: Settings }
]

export function WorkspaceSidebar({
  coach,
  settingsHref = '/settings',
  activeSettings = false
}: {
  coach: { initials: string; name: string; email?: string | null }
  settingsHref?: string
  activeSettings?: boolean
}) {
  return (
    <aside className="sidebar">
      <img className="sidebar-brand-logo" src="/brand/form-horizontal.png" alt="FORM Coach Desk" />
      <nav aria-label="主要導覽">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to === '/settings' ? settingsHref : item.to}
            className={({ isActive }) =>
              isActive || (activeSettings && item.to === '/settings') ? 'active' : undefined
            }
          >
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="coach-card">
          <div className="mini-avatar">{coach.initials}</div>
          <div className="coach-card-identity">
            <strong>{coach.name}</strong>
            {coach.email && <small>{coach.email}</small>}
          </div>
        </div>
      </div>
    </aside>
  )
}
