import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createCalendarBlock,
  createScheduleSeries,
  createSession,
  deleteCalendarBlock,
  deleteSession,
  getCalendar,
  reconcileScheduleSeries,
  replaceAvailability,
  transitionSession,
  updateCalendarBlock,
  updateScheduleSeries,
  updateSession
} from '../../api'
import { queryKeys } from '../../query-keys'

export function useCalendarRouteQuery(session: Session, range: { start: string; end: string }) {
  return useQuery({
    queryKey: queryKeys.calendar(session.user.id, range.start, range.end),
    queryFn: () => getCalendar(session.access_token, range)
  })
}

/** Every accepted M4 write affects calendar ranges, Today, Student schedule, and Session detail. */
export function invalidateSchedulingQueries(
  queryClient: QueryClient,
  coachId: string,
  studentId?: string,
  sessionId?: string
) {
  void queryClient.invalidateQueries({ queryKey: ['calendar', coachId] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.today(coachId) })
  if (studentId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.student(coachId, studentId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.scheduleSeries(coachId, studentId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.students(coachId) })
  }
  if (sessionId)
    void queryClient.invalidateQueries({ queryKey: queryKeys.session(coachId, sessionId) })
}

export function useSchedulingMutations(session: Session) {
  const queryClient = useQueryClient()
  const invalidate = (studentId?: string, sessionId?: string) =>
    invalidateSchedulingQueries(queryClient, session.user.id, studentId, sessionId)
  return {
    createSession: useMutation({
      mutationFn: (input: Parameters<typeof createSession>[1]) =>
        createSession(session.access_token, input),
      onSuccess: (accepted) => invalidate(accepted.session.studentId, accepted.session.id)
    }),
    updateSession: useMutation({
      mutationFn: ({
        sessionId,
        input
      }: {
        sessionId: string
        input: Parameters<typeof updateSession>[2]
      }) => updateSession(session.access_token, sessionId, input),
      onSuccess: (accepted) => invalidate(accepted.session.studentId, accepted.session.id)
    }),
    transitionSession: useMutation({
      mutationFn: ({
        sessionId,
        input
      }: {
        sessionId: string
        input: Parameters<typeof transitionSession>[2]
      }) => transitionSession(session.access_token, sessionId, input),
      onSuccess: (accepted) => invalidate(accepted.session.studentId, accepted.session.id)
    }),
    deleteSession: useMutation({
      mutationFn: ({ sessionId, version }: { sessionId: string; version: number }) =>
        deleteSession(session.access_token, sessionId, version),
      onSuccess: (_result, variables) => invalidate(undefined, variables.sessionId)
    }),
    createSeries: useMutation({
      mutationFn: ({
        studentId,
        input
      }: {
        studentId: string
        input: Parameters<typeof createScheduleSeries>[2]
      }) => createScheduleSeries(session.access_token, studentId, input),
      onSuccess: (_accepted, variables) => invalidate(variables.studentId)
    }),
    updateSeries: useMutation({
      mutationFn: ({
        seriesId,
        input
      }: {
        seriesId: string
        input: Parameters<typeof updateScheduleSeries>[2]
      }) => updateScheduleSeries(session.access_token, seriesId, input),
      onSuccess: (accepted) => invalidate(accepted.series.studentId)
    }),
    reconcileSeries: useMutation({
      mutationFn: (studentId: string) => reconcileScheduleSeries(session.access_token, studentId),
      onSuccess: (_accepted, studentId) => invalidate(studentId)
    }),
    createBlock: useMutation({
      mutationFn: (input: Parameters<typeof createCalendarBlock>[1]) =>
        createCalendarBlock(session.access_token, input),
      onSuccess: () => invalidate()
    }),
    updateBlock: useMutation({
      mutationFn: ({
        blockId,
        input
      }: {
        blockId: string
        input: Parameters<typeof updateCalendarBlock>[2]
      }) => updateCalendarBlock(session.access_token, blockId, input),
      onSuccess: () => invalidate()
    }),
    deleteBlock: useMutation({
      mutationFn: ({
        blockId,
        input
      }: {
        blockId: string
        input: Parameters<typeof deleteCalendarBlock>[2]
      }) => deleteCalendarBlock(session.access_token, blockId, input),
      onSuccess: () => invalidate()
    }),
    replaceAvailability: useMutation({
      mutationFn: ({
        target,
        input
      }: {
        target: Parameters<typeof replaceAvailability>[1]
        input: Parameters<typeof replaceAvailability>[2]
      }) => replaceAvailability(session.access_token, target, input),
      onSuccess: () => invalidate()
    })
  }
}
