import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Dumbbell, LayoutGrid, Settings, UsersRound } from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { getWorkspaceSettings } from '../api'
import { ExercisesPage } from '../pages/exercises/ExercisesPage'
import { StudentDetailPage, StudentsPage } from '../pages/students/StudentsPage'
import { IncomePage } from '../pages/students/IncomePage'
import { financeReturnPath } from '../pages/students/finance-api'
import { VenuePage } from '../pages/students/VenuePage'
import { TodayPage } from '../pages/today/TodayPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { PlansPage } from '../pages/settings/PlansPage'
import { FinanceCurrencyProvider } from '../pages/settings/finance-currency'
import { CalendarPage } from '../pages/calendar/CalendarPage'
import { SessionPage } from '../pages/sessions/SessionPage'
import { queryKeys } from '../query-keys'
import { Brand } from '../shared/primitives'
import { MobileSettingsLink } from '../shared/MobilePageAppBar'
import { resolveCoachIdentity } from './coach-identity'
import { ResilienceStatus } from './ResilienceStatus'
import { prefetchPrimaryCoachRoutes } from '../route-prefetch'
import {
  createMobileChromeScrollState,
  shouldAutoHideMobileChrome,
  updateMobileChromeScrollState
} from './mobile-chrome'

const navigation = [
  { to: '/today', label: '今日', icon: LayoutGrid },
  { to: '/calendar', label: '行事曆', icon: CalendarDays },
  { to: '/students', label: '學生', icon: UsersRound },
  { to: '/exercises', label: '動作庫', icon: Dumbbell },
  { to: '/settings', label: '設定', icon: Settings }
]

export function CoachWorkspace({ session }: { session: Session }) {
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const isPlansPage = location.pathname === '/plans'
  const isStudentDetail =
    /^\/students\/[^/]+$/.test(location.pathname) &&
    !['/students/finances', '/students/venues'].includes(location.pathname)
  const isMobileSubpage =
    isStudentDetail ||
    isPlansPage ||
    ['/students/finances', '/students/venues'].includes(location.pathname) ||
    /^\/sessions\/[^/]+$/.test(location.pathname)
  const returnParams = new URLSearchParams(location.search)
  const mobileBackPath = isPlansPage
    ? '/settings?category=plans'
    : location.pathname === '/students/finances'
      ? '/students'
      : returnParams.get('from') === 'finances'
        ? financeReturnPath(returnParams)
        : '/students'
  const mobileRouteTitle =
    location.pathname === '/students'
      ? '學生'
      : location.pathname === '/calendar'
        ? '行事曆'
        : location.pathname === '/exercises'
          ? '動作庫'
          : location.pathname === '/settings'
            ? '設定'
            : null
  const queryClient = useQueryClient()
  const mobileChromeEnabled = shouldAutoHideMobileChrome(location.pathname)
  const [mobileChromeHidden, setMobileChromeHidden] = useState(false)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!window.matchMedia('(max-width: 720px)').matches)
      mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])
  useEffect(() => {
    setMobileChromeHidden(false)
    if (!mobileChromeEnabled) return

    const mobileQuery = window.matchMedia('(max-width: 720px)')
    let scrollState = createMobileChromeScrollState(window.scrollY)
    const resetScrollState = () => {
      scrollState = createMobileChromeScrollState(window.scrollY)
      setMobileChromeHidden(false)
    }
    const onScroll = () => {
      if (!mobileQuery.matches) {
        resetScrollState()
        return
      }
      scrollState = updateMobileChromeScrollState(scrollState, window.scrollY)
      setMobileChromeHidden((hidden) =>
        hidden === scrollState.hidden ? hidden : scrollState.hidden
      )
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    mobileQuery.addEventListener('change', resetScrollState)
    return () => {
      window.removeEventListener('scroll', onScroll)
      mobileQuery.removeEventListener('change', resetScrollState)
    }
  }, [location.pathname, mobileChromeEnabled])
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
    <div
      className={`app-shell${isPlansPage ? ' plans-shell' : ''}`}
      data-route={location.pathname}
      data-mobile-chrome={
        mobileChromeEnabled ? (mobileChromeHidden ? 'hidden' : 'visible') : 'pinned'
      }
    >
      {!isPlansPage && (
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
      )}
      <main
        className="main-content"
        ref={mainRef}
        tabIndex={window.matchMedia('(max-width: 720px)').matches ? undefined : -1}
      >
        <header className="mobile-header">
          {isMobileSubpage ? (
            <div className="mobile-subpage-header">
              {location.pathname.startsWith('/sessions/') ? (
                <button
                  type="button"
                  className="mobile-subpage-back"
                  onClick={() => {
                    if (document.documentElement.classList.contains('is-session-note-focused')) {
                      window.dispatchEvent(new Event('session-note-focus-exit'))
                      return
                    }
                    navigate(-1)
                  }}
                >
                  <ArrowLeft aria-hidden="true" />
                  <span>返回</span>
                </button>
              ) : (
                <Link className="mobile-subpage-back" to={mobileBackPath}>
                  <ArrowLeft aria-hidden="true" />
                  <span>返回</span>
                </Link>
              )}
              <nav className="mobile-subpage-actions" aria-label="行動版主要導覽">
                <span id="mobile-header-action-slot" />
                <MobileSettingsLink />
              </nav>
            </div>
          ) : mobileRouteTitle ? (
            <div className="mobile-route-header-slot" id="mobile-route-header-slot">
              <span className="mobile-route-header-fallback">{mobileRouteTitle}</span>
            </div>
          ) : (
            <>
              <Brand />
              <nav aria-label="行動版主要導覽">
                <span id="mobile-header-action-slot" />
                <MobileSettingsLink />
              </nav>
            </>
          )}
        </header>
        <ResilienceStatus session={session} queryClient={queryClient} />
        <FinanceCurrencyProvider currency={coachSettingsQuery.data?.defaultCurrency ?? 'TWD'}>
          <Routes>
            <Route path="/today" element={<TodayPage session={session} coachName={coach.name} />} />
            <Route
              path="/calendar"
              element={
                <CalendarPage
                  session={session}
                  timeZone={timeZone}
                  settings={coachSettingsQuery.data}
                />
              }
            />
            <Route
              path="/students"
              element={<StudentsPage session={session} timeZone={timeZone} />}
            />
            <Route path="/students/finances" element={<IncomePage session={session} />} />
            <Route path="/students/venues" element={<VenuePage session={session} />} />
            <Route
              path="/students/:studentId"
              element={
                <StudentDetailPage
                  session={session}
                  timeZone={timeZone}
                  defaultSessionMinutes={coachSettingsQuery.data?.defaultSessionMinutes ?? 60}
                />
              }
            />
            <Route
              path="/sessions/:sessionId"
              element={<SessionPage session={session} timeZone={timeZone} />}
            />
            <Route path="/exercises" element={<ExercisesPage session={session} />} />
            <Route path="/settings" element={<SettingsPage session={session} />} />
            <Route path="/plans" element={<PlansPage session={session} />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </FinanceCurrencyProvider>
      </main>
      {!isPlansPage && (
        <nav className="bottom-nav" aria-label="主要導覽">
          {navigation.slice(0, 4).map((item) => (
            <NavLink key={item.to} to={item.to} viewTransition>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
