import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
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
  type ExerciseDefinition,
  type ExerciseLibrary,
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
    enabled: Boolean(sessionId),
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
  const libraryKey = queryKeys.exerciseLibrary(session.user.id)
  const favoriteJobs = useRef(
    new Map<
      string,
      { accepted: ExerciseDefinition; desired: boolean; running: boolean; onError?: () => void }
    >()
  )
  const reviseLibrary = (revise: (items: ExerciseDefinition[]) => ExerciseDefinition[]) => {
    client.setQueryData<ExerciseLibrary>(libraryKey, (library) => {
      if (!library) return library
      const definitions = revise(library.definitions)
      const equipment = new Set(definitions.map((item) => item.equipment))
      const bodyParts = new Set(definitions.flatMap((item) => item.bodyParts))
      return {
        ...library,
        definitions,
        totals: {
          all: definitions.length,
          favorite: definitions.filter((item) => item.favorite).length,
          custom: definitions.filter((item) => !item.isSystem).length
        },
        filters: {
          ...library.filters,
          equipment: [
            ...library.filters.equipment.filter((item) => equipment.delete(item)),
            ...equipment
          ],
          bodyParts: [
            ...library.filters.bodyParts.filter((item) => bodyParts.delete(item)),
            ...bodyParts
          ]
        }
      }
    })
  }
  const restore = (definition: ExerciseDefinition | undefined) => {
    if (definition)
      reviseLibrary((items) => items.map((item) => (item.id === definition.id ? definition : item)))
  }
  const settleLibrary = () => {
    if (client.isMutating({ mutationKey: libraryKey }) === 1 && favoriteJobs.current.size === 0)
      void client.invalidateQueries({ queryKey: libraryKey })
  }
  const alignFavorite = (id: string, job: { accepted: ExerciseDefinition; desired: boolean }) => {
    reviseLibrary((items) =>
      items.map((item) =>
        item.id === id ? { ...item, version: job.accepted.version, favorite: job.desired } : item
      )
    )
  }
  const syncFavorite = async (
    id: string,
    job: {
      accepted: ExerciseDefinition
      desired: boolean
      running: boolean
      onError?: () => void
    }
  ) => {
    let conflictRetries = 0
    while (job.desired !== job.accepted.favorite) {
      const desired = job.desired
      try {
        job.accepted = await setExerciseFavorite(session.access_token, id, {
          favorite: desired,
          version: job.accepted.version,
          operationId: crypto.randomUUID()
        })
        alignFavorite(id, job)
        conflictRetries = 0
      } catch (error) {
        if ((error as { status?: number }).status === 409 && conflictRetries < 2) {
          try {
            const latest = await getExerciseLibrary(session.access_token)
            const current = latest.definitions.find((item) => item.id === id)
            if (current) {
              job.accepted = current
              alignFavorite(id, job)
              conflictRetries++
              continue
            }
          } catch {
            // Fall through to the visible rollback when the refresh also fails.
          }
        }
        const unmetChoice = job.desired !== job.accepted.favorite
        job.desired = job.accepted.favorite
        alignFavorite(id, job)
        if (unmetChoice) job.onError?.()
        break
      }
    }
    job.running = false
    if (favoriteJobs.current.get(id) === job) favoriteJobs.current.delete(id)
    if (favoriteJobs.current.size === 0 && client.isMutating({ mutationKey: libraryKey }) === 0)
      void client.invalidateQueries({ queryKey: libraryKey })
  }
  const toggleFavorite = (id: string, onError?: () => void) => {
    const current = client
      .getQueryData<ExerciseLibrary>(libraryKey)
      ?.definitions.find((item) => item.id === id)
    if (!current || current.version === 0) return
    const desired = !current.favorite
    let job = favoriteJobs.current.get(id)
    if (!job) {
      job = { accepted: current, desired, running: false, onError }
      favoriteJobs.current.set(id, job)
    } else {
      job.desired = desired
      job.onError = onError
    }
    void client.cancelQueries({ queryKey: libraryKey })
    reviseLibrary((items) =>
      items.map((item) => (item.id === id ? { ...item, favorite: desired } : item))
    )
    if (!job.running) {
      job.running = true
      void syncFavorite(id, job)
    }
  }
  return {
    createExercise: useMutation({
      mutationKey: libraryKey,
      mutationFn: (input: Parameters<typeof createExercise>[1]) =>
        createExercise(session.access_token, input),
      onMutate: async (input) => {
        await client.cancelQueries({ queryKey: libraryKey })
        const id = `pending:${input.operationId}`
        const { operationId: _operationId, ...fields } = input
        reviseLibrary((items) => [
          {
            ...fields,
            id,
            catalogKey: null,
            isSystem: false,
            favorite: false,
            version: 0
          },
          ...items
        ])
        return { id }
      },
      onSuccess: (definition, _input, context) =>
        reviseLibrary((items) =>
          items.map((item) => (item.id === context?.id ? definition : item))
        ),
      onError: (_error, _input, context) =>
        reviseLibrary((items) => items.filter((item) => item.id !== context?.id)),
      onSettled: settleLibrary
    }),
    updateExercise: useMutation({
      mutationKey: libraryKey,
      mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateExercise>[2] }) =>
        updateExercise(session.access_token, id, input),
      onMutate: async ({ id, input }) => {
        await client.cancelQueries({ queryKey: libraryKey })
        const original = client
          .getQueryData<ExerciseLibrary>(libraryKey)
          ?.definitions.find((item) => item.id === id)
        const { operationId: _operationId, ...fields } = input
        reviseLibrary((items) =>
          items.map((item) => (item.id === id ? { ...item, ...fields } : item))
        )
        return { original }
      },
      onSuccess: (definition) =>
        reviseLibrary((items) =>
          items.map((item) => (item.id === definition.id ? definition : item))
        ),
      onError: (_error, _variables, context) => restore(context?.original),
      onSettled: settleLibrary
    }),
    favorite: { toggle: toggleFavorite },
    remove: useMutation({
      mutationKey: libraryKey,
      mutationFn: ({ id, version }: { id: string; version: number }) =>
        removeExercise(session.access_token, id, version),
      onMutate: async ({ id }) => {
        await client.cancelQueries({ queryKey: libraryKey })
        const items = client.getQueryData<ExerciseLibrary>(libraryKey)?.definitions ?? []
        const index = items.findIndex((item) => item.id === id)
        const original = items[index]
        reviseLibrary((definitions) => definitions.filter((item) => item.id !== id))
        return { original, index }
      },
      onError: (_error, _variables, context) => {
        if (!context?.original) return
        reviseLibrary((items) => {
          if (items.some((item) => item.id === context.original!.id)) return items
          const next = [...items]
          next.splice(context.index, 0, context.original!)
          return next
        })
      },
      onSettled: settleLibrary
    }),
    preference: useMutation({
      mutationFn: ({
        unit,
        version,
        ...units
      }: {
        unit: 'kg' | 'lb'
        version: number
        defaultDistanceUnit: 'km' | 'mi'
      }) => setTrainingPreference(session.access_token, unit, version, units),
      onSuccess: (accepted) => {
        client.setQueryData(queryKeys.trainingPreference(session.user.id), accepted)
        void client.invalidateQueries({ queryKey: ['training-preference', session.user.id] })
        void client.invalidateQueries({ queryKey: ['session-training', session.user.id] })
        void client.invalidateQueries({ queryKey: ['training-defaults', session.user.id] })
        void client.invalidateQueries({ queryKey: ['student-performance', session.user.id] })
        void client.invalidateQueries({ queryKey: ['student-trend', session.user.id] })
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
