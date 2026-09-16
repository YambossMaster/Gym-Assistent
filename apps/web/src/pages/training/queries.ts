import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createExercise,
  getExerciseLibrary,
  getSessionTraining,
  getStudentPerformance,
  getStudentTrend,
  getTrainingPreference,
  removeExercise,
  saveSessionTraining,
  setExerciseFavorite,
  setTrainingPreference,
  updateExercise,
  type PerformanceMetric,
  type TrainingDraftPayload
} from '../../api'
import { queryKeys } from '../../query-keys'
import { invalidateSchedulingQueries } from '../calendar/queries'

export function useExerciseLibrary(session: Session) {
  return useQuery({
    queryKey: queryKeys.exerciseLibrary(session.user.id),
    queryFn: () => getExerciseLibrary(session.access_token)
  })
}
export function useSessionTraining(session: Session, sessionId: string) {
  return useQuery({
    queryKey: queryKeys.sessionTraining(session.user.id, sessionId),
    queryFn: () => getSessionTraining(session.access_token, sessionId),
    retry: (count, error: any) => (error?.status === 404 ? false : count < 2)
  })
}
export function useTrainingPreference(session: Session) {
  return useQuery({
    queryKey: queryKeys.trainingPreference(session.user.id),
    queryFn: () => getTrainingPreference(session.access_token)
  })
}
export function useStudentPerformance(session: Session, studentId: string) {
  return useQuery({
    queryKey: queryKeys.studentPerformance(session.user.id, studentId),
    queryFn: () => getStudentPerformance(session.access_token, studentId)
  })
}
export function useStudentTrend(
  session: Session,
  studentId: string,
  definitionId: string,
  metric: PerformanceMetric
) {
  return useQuery({
    queryKey: queryKeys.studentTrend(session.user.id, studentId, definitionId, metric),
    queryFn: () => getStudentTrend(session.access_token, studentId, definitionId, metric),
    enabled: Boolean(definitionId)
  })
}

export function useTrainingMutations(session: Session) {
  const client = useQueryClient()
  const invalidateLibrary = () =>
    client.invalidateQueries({ queryKey: ['exercise-library', session.user.id] })
  return {
    createExercise: useMutation({
      mutationFn: (input: Parameters<typeof createExercise>[1]) =>
        createExercise(session.access_token, input),
      onSuccess: invalidateLibrary
    }),
    updateExercise: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateExercise>[2] }) =>
        updateExercise(session.access_token, id, input),
      onSuccess: invalidateLibrary
    }),
    favorite: useMutation({
      mutationFn: ({
        id,
        input
      }: {
        id: string
        input: Parameters<typeof setExerciseFavorite>[2]
      }) => setExerciseFavorite(session.access_token, id, input),
      onSuccess: invalidateLibrary
    }),
    remove: useMutation({
      mutationFn: ({ id, version }: { id: string; version: number }) =>
        removeExercise(session.access_token, id, version),
      onSuccess: invalidateLibrary
    }),
    preference: useMutation({
      mutationFn: ({ unit, version }: { unit: 'kg' | 'lb'; version: number }) =>
        setTrainingPreference(session.access_token, unit, version),
      onSuccess: () => {
        void client.invalidateQueries({ queryKey: ['training-preference', session.user.id] })
        void client.invalidateQueries({ queryKey: ['training-defaults', session.user.id] })
        void client.invalidateQueries({ queryKey: ['student-performance', session.user.id] })
      }
    }),
    save: useMutation({
      mutationFn: ({
        sessionId,
        payload,
        complete = false
      }: {
        sessionId: string
        payload: TrainingDraftPayload
        complete?: boolean
      }) => saveSessionTraining(session.access_token, sessionId, payload, complete),
      onSuccess: (accepted) => {
        client.setQueryData(
          queryKeys.sessionTraining(session.user.id, accepted.session.id),
          accepted
        )
        void client.invalidateQueries({ queryKey: ['training-defaults', session.user.id] })
        void client.invalidateQueries({
          queryKey: queryKeys.studentPerformance(session.user.id, accepted.session.studentId)
        })
        invalidateSchedulingQueries(
          client,
          session.user.id,
          accepted.session.studentId,
          accepted.session.id
        )
      }
    })
  }
}
