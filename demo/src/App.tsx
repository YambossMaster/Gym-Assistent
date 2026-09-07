import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components'
import { CalendarPage } from './pages/CalendarPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { ReschedulePage, TrainingSharePage } from './pages/PublicPages'
import { SessionPage } from './pages/SessionPage'
import { SettingsPage } from './pages/SettingsPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { StudentsPage } from './pages/StudentsPage'
import { TodayPage } from './pages/TodayPage'

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <ScrollReset />
      <Routes>
        <Route path="/t/:token" element={<TrainingSharePage />} />
        <Route path="/r/:token" element={<ReschedulePage />} />
        <Route
          path="*"
          element={
            <AppShell>
              <Routes>
                <Route path="/today" element={<TodayPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentDetailPage />} />
                <Route path="/sessions/:id" element={<SessionPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </>
  )
}

export default App
