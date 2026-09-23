import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { CalendarDays, Dumbbell, LayoutGrid, Settings, UsersRound } from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getWorkspaceSettings } from '../api'
import { ExercisesPage } from '../pages/exercises/ExercisesPage'
import { StudentDetailPage, StudentsPage } from '../pages/students/StudentsPage'
import { IncomePage } from '../pages/students/IncomePage'
import { TodayPage } from '../pages/today/TodayPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { CalendarPage } from '../pages/calendar/CalendarPage'
import { SessionPage } from '../pages/sessions/SessionPage'
import { queryKeys } from '../query-keys'
import { Brand } from '../shared/primitives'
import { resolveCoachIdentity } from './coach-identity'
import { ResilienceStatus } from './ResilienceStatus'
import { prefetchPrimaryCoachRoutes } from '../route-prefetch'

const navigation = [
  { to: '/today', label: '今日', icon: LayoutGrid },
  { to: '/calendar', label: '行事曆', icon: CalendarDays },
  { to: '/students', label: '學生', icon: UsersRound },
  { to: '/exercises', label: '動作庫', icon: Dumbbell },
  { to: '/settings', label: '設定', icon: Settings }
]

export function CoachWorkspace({ session }: { session: Session }) {
  const location = useLocation()
  const queryClient = useQueryClient()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])
  const coachSettingsQuery = useQuery({
    queryKey: queryKeys.settings(session.user.id),
    queryFn: () => getWorkspaceSettings(session.access_token)
  })
  const coach = resolveCoachIdentity({
    displayName: coachSettingsQuery.data?.displayName,
    email: session.user.email
  })
  const timeZone = coachSettingsQuery.data?.timeZone || 'Asia/Taipei'
  useEffect(() => {
    if (!coachSettingsQuery.data) return
    void prefetchPrimaryCoachRoutes(queryClient, session, timeZone)
  }, [coachSettingsQuery.data, queryClient, session, timeZone])
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <img
          className="sidebar-brand-logo"
          src="/brand/form-horizontal.png"
          alt="FORM Coach Desk"
        />
        <nav aria-label="主要導覽">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to}>
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
      <main className="main-content">
        <header className="mobile-header">
          <Brand />
          <nav aria-label="行動版主要導覽">
            <NavLink to="/settings" aria-label="設定">
              <Settings />
            </NavLink>
          </nav>
        </header>
        <ResilienceStatus session={session} queryClient={queryClient} />
        <Routes>
          <Route path="/today" element={<TodayPage session={session} coachName={coach.name} />} />
          <Route
            path="/calendar"
            element={<CalendarPage session={session} timeZone={timeZone} />}
          />
          <Route
            path="/students"
            element={<StudentsPage session={session} timeZone={timeZone} />}
          />
          <Route path="/students/finances" element={<IncomePage session={session} />} />
          <Route
            path="/students/:studentId"
            element={<StudentDetailPage session={session} timeZone={timeZone} />}
          />
          <Route
            path="/sessions/:sessionId"
            element={<SessionPage session={session} timeZone={timeZone} />}
          />
          <Route path="/exercises" element={<ExercisesPage session={session} />} />
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
