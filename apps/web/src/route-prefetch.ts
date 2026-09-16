import type { Session } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import {
  getAccountLifecycle,
  getCalendar,
  getExerciseLibrary,
  getLessonPurchaseIncome,
  getToday,
  getTrainingPreference,
  listStudents
} from './api'
import { queryKeys } from './query-keys'

export async function prefetchPrimaryCoachRoutes(
  queryClient: QueryClient,
  session: Session,
  timeZone: string,
  now = new Date()
) {
  const coachId = session.user.id
  const accessToken = session.access_token
  const range = currentWeekRange(now, timeZone)
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: queryKeys.today(coachId),
      queryFn: () => getToday(accessToken)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar(coachId, range.start, range.end),
      queryFn: () => getCalendar(accessToken, range)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.students(coachId),
      queryFn: () => listStudents(accessToken)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.income(coachId),
      queryFn: () => getLessonPurchaseIncome(accessToken)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.exerciseLibrary(coachId),
      queryFn: () => getExerciseLibrary(accessToken)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.lifecycle(coachId),
      queryFn: () => getAccountLifecycle(accessToken)
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.trainingPreference(coachId),
      queryFn: () => getTrainingPreference(accessToken)
    })
  ])
}

function currentWeekRange(now: Date, timeZone: string) {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  const date = new Date(`${localDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  const start = date.toISOString().slice(0, 10)
  date.setUTCDate(date.getUTCDate() + 7)
  return { start, end: date.toISOString().slice(0, 10) }
}
