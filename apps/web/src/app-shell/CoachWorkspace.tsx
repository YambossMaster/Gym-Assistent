import type { Session } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Dumbbell, LayoutGrid, Settings, UsersRound } from 'lucide-react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { getWorkspaceSettings } from '../api'
import { RoutePlaceholder } from '../pages/RoutePlaceholder'
import { StudentDetailPage, StudentsPage } from '../pages/students/StudentsPage'
import { TodayPage } from '../pages/today/TodayPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { queryKeys } from '../query-keys'
import { Brand } from '../shared/primitives'

const navigation = [
  { to: '/today', label: '今日', icon: LayoutGrid },
  { to: '/calendar', label: '行事曆', icon: CalendarDays },
  { to: '/students', label: '學生', icon: UsersRound },
  { to: '/exercises', label: '動作庫', icon: Dumbbell },
  { to: '/settings', label: '設定', icon: Settings }
]

export function CoachWorkspace({ session }: { session: Session }) {
  const coachSettingsQuery = useQuery({
    queryKey: queryKeys.settings(session.user.id),
    queryFn: () => getWorkspaceSettings(session.access_token)
  })
  const coachName =
    coachSettingsQuery.data?.displayName || session.user.email?.split('@')[0] || '教練'
  const timeZone = coachSettingsQuery.data?.timeZone || 'Asia/Taipei'
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="主要導覽">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p className="sync-state">
            <span />
            已連線
          </p>
          <div className="coach-card">
            <div className="mini-avatar">{initials(session.user.email)}</div>
            <div>
              <strong>{coachName}</strong>
              <small>{session.user.email}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="mobile-header">
          <Brand />
          <nav aria-label="行動版主要導覽">
            <NavLink to="/settings" aria-label="設定">
              <Settings />
            </NavLink>
          </nav>
        </header>
        <Routes>
          <Route path="/today" element={<TodayPage timeZone={timeZone} />} />
          <Route
            path="/calendar"
            element={
              <RoutePlaceholder
                title="行事曆"
                text="在這裡安排每一堂課，並掌握可用時段。"
                icon={<CalendarDays />}
              />
            }
          />
          <Route path="/students" element={<StudentsPage session={session} />} />
          <Route path="/students/:studentId" element={<StudentDetailPage session={session} />} />
          <Route
            path="/sessions/:sessionId"
            element={
              <RoutePlaceholder
                title="課堂"
                text="選擇一堂課後，可在這裡整理訓練內容。"
                icon={<Dumbbell />}
              />
            }
          />
          <Route
            path="/exercises"
            element={
              <RoutePlaceholder
                title="動作庫"
                text="建立常用動作，讓每次訓練安排更順手。"
                icon={<Dumbbell />}
              />
            }
          />
          <Route path="/settings" element={<SettingsPage session={session} />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </main>
      <nav className="bottom-nav" aria-label="主要導覽">
        {navigation.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to}>
            <item.icon />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function initials(email: string | undefined) {
  return (email?.slice(0, 2) || 'CO').toUpperCase()
}
