import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { seedData } from './seed'
import {
  migrateCalendarFields,
  migrateCapabilityLinks,
  migrateCoachSettings,
  mergeExerciseDefinitions,
  migrateTrainingRecords
} from './storeMigration'
import {
  moveSession as moveSessionDomain,
  reconcileAllSchedules,
  reconcileSchedule,
  applyAvailabilityWindowChange,
  availabilityWindowsForDate,
  isRescheduleSlotAvailable,
  setSessionStatus,
  sessionIssues
} from './domain'
import { scheduleSession as scheduleSessionDomain } from './domain'
import type {
  AppData,
  CalendarBlock,
  CoachSettings,
  CourseSession,
  ExerciseDefinition,
  AvailabilityRule,
  Purchase,
  ScheduleSeries,
  Student,
  TrainingRecord
} from './types'

const STORAGE_KEY = 'form-coach-mvp-v1'

interface StoreValue {
  data: AppData
  addStudent: (input: Omit<Student, 'id' | 'createdAt' | 'active' | 'lineLinked'>) => string
  updateStudent: (studentId: string, updates: Partial<Omit<Student, 'id' | 'createdAt'>>) => void
  deleteStudent: (studentId: string) => void
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void
  updatePurchase: (purchaseId: string, updates: Partial<Omit<Purchase, 'id' | 'studentId'>>) => void
  deletePurchase: (purchaseId: string) => void
  addSeries: (series: Omit<ScheduleSeries, 'id'>) => void
  updateSeries: (
    seriesId: string,
    updates: Partial<Omit<ScheduleSeries, 'id' | 'studentId'>>
  ) => void
  deleteSeries: (seriesId: string) => void
  addSession: (
    session: Omit<CourseSession, 'id' | 'status'>
  ) => ReturnType<typeof scheduleSessionDomain>['issues']
  addRecurringSession: (
    session: Omit<CourseSession, 'id' | 'status' | 'seriesId'>,
    intervalWeeks: number
  ) => ReturnType<typeof sessionIssues>
  updateSession: (
    sessionId: string,
    updates: Partial<Omit<CourseSession, 'id' | 'studentId' | 'status' | 'completedAt'>>
  ) => ReturnType<typeof sessionIssues>
  updateRecurringSession: (
    sessionId: string,
    updates: Pick<CourseSession, 'startsAt' | 'endsAt' | 'location'>
  ) => ReturnType<typeof sessionIssues>
  deleteSession: (sessionId: string) => void
  addBlock: (block: Omit<CalendarBlock, 'id'>) => void
  addRecurringBlocks: (block: Omit<CalendarBlock, 'id' | 'recurrenceId'>, count: number) => void
  updateBlock: (blockId: string, updates: Partial<Omit<CalendarBlock, 'id'>>) => void
  updateRecurringBlock: (
    blockId: string,
    updates: Omit<CalendarBlock, 'id' | 'recurrenceId'>,
    scope: 'future' | 'all'
  ) => void
  deleteBlock: (blockId: string) => void
  deleteRecurringBlock: (blockId: string, scope: 'future' | 'all') => void
  setAvailabilityForWeekdays: (
    weekdays: number[],
    window: Pick<AvailabilityRule, 'startTime' | 'endTime'>
  ) => void
  changeAvailability: (input: {
    day: string
    startTime: string
    endTime: string
    scope: 'day' | 'weekly'
    mode: 'add' | 'remove'
  }) => void
  updateStatus: (sessionId: string, status: CourseSession['status']) => void
  moveSession: (sessionId: string, startsAt: string) => CourseSession[]
  saveRecord: (record: TrainingRecord) => void
  issueLink: (
    sessionId: string,
    capability: 'reschedule_session' | 'read_training_session',
    options?: { includeNote?: boolean }
  ) => string
  redeemReschedule: (token: string, startsAt: string) => boolean
  addExercise: (exercise: Omit<ExerciseDefinition, 'id' | 'isSystem' | 'favorite'>) => string
  updateExercise: (
    exerciseId: string,
    updates: Partial<Omit<ExerciseDefinition, 'id' | 'isSystem'>>
  ) => void
  deleteExercise: (exerciseId: string) => void
  toggleFavoriteExercise: (exerciseId: string) => void
  saveSettings: (settings: CoachSettings) => void
  resetDemo: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

const load = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return reconcileAllSchedules(seedData())
    const parsed = JSON.parse(saved) as Partial<AppData>
    const fallback = seedData()
    const exercises = mergeExerciseDefinitions(fallback.exercises, parsed.exercises)
    const calendarFields = migrateCalendarFields(parsed, fallback)
    return reconcileAllSchedules({
      ...fallback,
      ...parsed,
      ...calendarFields,
      exercises,
      links: migrateCapabilityLinks(parsed.links),
      records: migrateTrainingRecords(parsed.records, exercises),
      settings: migrateCoachSettings(parsed, fallback)
    })
  } catch {
    return reconcileAllSchedules(seedData())
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(load)
  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setDataState(load())
    }
    window.addEventListener('storage', syncFromAnotherTab)
    return () => window.removeEventListener('storage', syncFromAnotherTab)
  }, [])

  const commit = (next: AppData | ((current: AppData) => AppData)) => {
    setDataState((current) => {
      const result = typeof next === 'function' ? next(current) : next
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      return result
    })
  }

  const value = useMemo<StoreValue>(
    () => ({
      data,
      addStudent: (input) => {
        const id = crypto.randomUUID()
        commit((current) => ({
          ...current,
          students: [
            ...current.students,
            { ...input, id, active: true, lineLinked: false, createdAt: new Date().toISOString() }
          ]
        }))
        return id
      },
      updateStudent: (studentId, updates) =>
        commit((current) => ({
          ...current,
          students: current.students.map((student) =>
            student.id === studentId ? { ...student, ...updates } : student
          )
        })),
      deleteStudent: (studentId) =>
        commit((current) => {
          const sessionIds = new Set(
            current.sessions
              .filter((session) => session.studentId === studentId)
              .map((session) => session.id)
          )
          return {
            ...current,
            students: current.students.filter((student) => student.id !== studentId),
            purchases: current.purchases.filter((purchase) => purchase.studentId !== studentId),
            series: current.series.filter((series) => series.studentId !== studentId),
            sessions: current.sessions.filter((session) => session.studentId !== studentId),
            records: current.records.filter((record) => !sessionIds.has(record.sessionId)),
            links: current.links.filter((link) => !sessionIds.has(link.sessionId))
          }
        }),
      addPurchase: (purchase) =>
        commit((current) =>
          reconcileSchedule(
            {
              ...current,
              purchases: [...current.purchases, { ...purchase, id: crypto.randomUUID() }]
            },
            purchase.studentId
          )
        ),
      updatePurchase: (purchaseId, updates) =>
        commit((current) => {
          const purchase = current.purchases.find((item) => item.id === purchaseId)
          const next = {
            ...current,
            purchases: current.purchases.map((item) =>
              item.id === purchaseId ? { ...item, ...updates } : item
            )
          }
          return purchase ? reconcileSchedule(next, purchase.studentId) : next
        }),
      deletePurchase: (purchaseId) =>
        commit((current) => ({
          ...current,
          purchases: current.purchases.filter((purchase) => purchase.id !== purchaseId)
        })),
      addSeries: (series) =>
        commit((current) =>
          reconcileSchedule(
            { ...current, series: [...current.series, { ...series, id: crypto.randomUUID() }] },
            series.studentId
          )
        ),
      updateSeries: (seriesId, updates) =>
        commit((current) => ({
          ...current,
          series: current.series.map((series) =>
            series.id === seriesId ? { ...series, ...updates } : series
          )
        })),
      deleteSeries: (seriesId) =>
        commit((current) => ({
          ...current,
          series: current.series.filter((series) => series.id !== seriesId)
        })),
      addSession: (session) => {
        const result = scheduleSessionDomain(data, session)
        commit(result.data)
        return result.issues
      },
      addRecurringSession: (session, intervalWeeks) => {
        const seriesId = crypto.randomUUID()
        const candidate: CourseSession = {
          ...session,
          id: crypto.randomUUID(),
          seriesId,
          status: 'scheduled'
        }
        const issues = sessionIssues(data, candidate)
        const startsAt = new Date(session.startsAt)
        const series: ScheduleSeries = {
          id: seriesId,
          studentId: session.studentId,
          weekday: startsAt.getDay(),
          localStartTime: `${String(startsAt.getHours()).padStart(2, '0')}:${String(startsAt.getMinutes()).padStart(2, '0')}`,
          durationMinutes: Math.round(
            (new Date(session.endsAt).getTime() - startsAt.getTime()) / 60000
          ),
          intervalWeeks,
          active: true
        }
        commit((current) =>
          reconcileSchedule(
            {
              ...current,
              series: [...current.series, series],
              sessions: [...current.sessions, candidate]
            },
            session.studentId
          )
        )
        return issues
      },
      updateSession: (sessionId, updates) => {
        const original = data.sessions.find((session) => session.id === sessionId)
        if (!original) return { sessionOverlap: [], blockedBy: [], hasIssues: false }
        const candidate = { ...original, ...updates }
        const issues = sessionIssues(data, candidate)
        commit((current) => ({
          ...current,
          sessions: current.sessions.map((session) =>
            session.id === sessionId ? candidate : session
          )
        }))
        return issues
      },
      updateRecurringSession: (sessionId, updates) => {
        const original = data.sessions.find((session) => session.id === sessionId)
        if (!original?.seriesId) return { sessionOverlap: [], blockedBy: [], hasIssues: false }
        const candidate = { ...original, ...updates }
        const issues = sessionIssues(data, candidate)
        const originalStart = new Date(original.startsAt)
        const newStart = new Date(updates.startsAt)
        const shiftMs = newStart.getTime() - originalStart.getTime()
        const durationMs = new Date(updates.endsAt).getTime() - newStart.getTime()
        commit((current) => ({
          ...current,
          series: current.series.map((series) =>
            series.id === original.seriesId
              ? {
                  ...series,
                  weekday: newStart.getDay(),
                  localStartTime: `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`,
                  durationMinutes: Math.round(durationMs / 60000)
                }
              : series
          ),
          sessions: current.sessions.map((session) => {
            if (
              session.seriesId !== original.seriesId ||
              session.status !== 'scheduled' ||
              new Date(session.startsAt) < originalStart
            )
              return session
            const startsAt = new Date(new Date(session.startsAt).getTime() + shiftMs)
            return {
              ...session,
              startsAt: startsAt.toISOString(),
              endsAt: new Date(startsAt.getTime() + durationMs).toISOString(),
              location: updates.location
            }
          })
        }))
        return issues
      },
      deleteSession: (sessionId) =>
        commit((current) => {
          const studentId = current.sessions.find((session) => session.id === sessionId)?.studentId
          const next = {
            ...current,
            sessions: current.sessions.filter((session) => session.id !== sessionId),
            records: current.records.filter((record) => record.sessionId !== sessionId),
            links: current.links.filter((link) => link.sessionId !== sessionId)
          }
          return studentId ? reconcileSchedule(next, studentId) : next
        }),
      addBlock: (block) =>
        commit((current) => ({
          ...current,
          blocks: [...current.blocks, { ...block, id: crypto.randomUUID() }]
        })),
      addRecurringBlocks: (block, count) =>
        commit((current) => {
          const recurrenceId = crypto.randomUUID()
          const start = new Date(block.startsAt)
          const end = new Date(block.endsAt)
          const blocks = Array.from({ length: Math.max(1, count) }, (_, index) => ({
            ...block,
            id: crypto.randomUUID(),
            recurrenceId,
            startsAt: new Date(start.getTime() + index * 7 * 24 * 60 * 60 * 1000).toISOString(),
            endsAt: new Date(end.getTime() + index * 7 * 24 * 60 * 60 * 1000).toISOString()
          }))
          return { ...current, blocks: [...current.blocks, ...blocks] }
        }),
      updateBlock: (blockId, updates) =>
        commit((current) => ({
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === blockId ? { ...block, ...updates } : block
          )
        })),
      updateRecurringBlock: (blockId, updates, scope) =>
        commit((current) => {
          const original = current.blocks.find((block) => block.id === blockId)
          if (!original?.recurrenceId) return current
          const originalStart = new Date(original.startsAt)
          const newStart = new Date(updates.startsAt)
          const shiftMs = newStart.getTime() - originalStart.getTime()
          const durationMs = new Date(updates.endsAt).getTime() - newStart.getTime()
          return {
            ...current,
            blocks: current.blocks.map((block) => {
              const inScope =
                block.recurrenceId === original.recurrenceId &&
                (scope === 'all' || new Date(block.startsAt) >= originalStart)
              if (!inScope) return block
              const startsAt = new Date(new Date(block.startsAt).getTime() + shiftMs)
              return {
                ...block,
                note: updates.note,
                startsAt: startsAt.toISOString(),
                endsAt: new Date(startsAt.getTime() + durationMs).toISOString()
              }
            })
          }
        }),
      deleteBlock: (blockId) =>
        commit((current) => ({
          ...current,
          blocks: current.blocks.filter((block) => block.id !== blockId)
        })),
      deleteRecurringBlock: (blockId, scope) =>
        commit((current) => {
          const original = current.blocks.find((block) => block.id === blockId)
          if (!original?.recurrenceId) return current
          const originalStart = new Date(original.startsAt)
          return {
            ...current,
            blocks: current.blocks.filter(
              (block) =>
                block.recurrenceId !== original.recurrenceId ||
                (scope === 'future' && new Date(block.startsAt) < originalStart)
            )
          }
        }),
      setAvailabilityForWeekdays: (weekdays, window) =>
        commit((current) => ({
          ...current,
          availability: [
            ...current.availability.filter((rule) => !weekdays.includes(rule.weekday)),
            ...weekdays.map((weekday) => ({
              id: crypto.randomUUID(),
              weekday,
              startTime: window.startTime,
              endTime: window.endTime,
              active: true
            }))
          ]
        })),
      changeAvailability: (input) =>
        commit((current) => {
          const day = new Date(`${input.day}T12:00:00`)
          const target = { startTime: input.startTime, endTime: input.endTime }
          if (input.scope === 'day') {
            const windows = applyAvailabilityWindowChange(
              availabilityWindowsForDate(current, day),
              target,
              input.mode
            )
            return {
              ...current,
              availabilityOverrides: [
                ...current.availabilityOverrides.filter((item) => item.date !== input.day),
                { id: crypto.randomUUID(), date: input.day, windows }
              ]
            }
          }
          const weekday = day.getDay()
          const weekly = current.availability
            .filter((rule) => rule.active && rule.weekday === weekday)
            .map((rule) => ({ startTime: rule.startTime, endTime: rule.endTime }))
          const windows = applyAvailabilityWindowChange(weekly, target, input.mode)
          return {
            ...current,
            availability: [
              ...current.availability.filter((rule) => rule.weekday !== weekday),
              ...windows.map((window) => ({
                id: crypto.randomUUID(),
                weekday,
                ...window,
                active: true
              }))
            ]
          }
        }),
      updateStatus: (sessionId, status) =>
        commit((current) => {
          const studentId = current.sessions.find((s) => s.id === sessionId)?.studentId
          const next = setSessionStatus(current, sessionId, status)
          return studentId && status === 'cancelled' ? reconcileSchedule(next, studentId) : next
        }),
      moveSession: (sessionId, startsAt) => {
        const result = moveSessionDomain(data, sessionId, startsAt)
        commit(result.data)
        return result.conflicts
      },
      saveRecord: (record) =>
        commit((current) => ({
          ...current,
          records: [...current.records.filter((r) => r.sessionId !== record.sessionId), record]
        })),
      issueLink: (sessionId, capability, options) => {
        const token = crypto.randomUUID().replaceAll('-', '').slice(0, 20)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        commit((current) => ({
          ...current,
          links: [
            ...current.links.filter(
              (l) => !(l.sessionId === sessionId && l.capability === capability)
            ),
            {
              token,
              sessionId,
              capability,
              expiresAt,
              includeNote: capability === 'read_training_session' && Boolean(options?.includeNote)
            }
          ]
        }))
        return token
      },
      redeemReschedule: (token, startsAt) => {
        const link = data.links.find(
          (l) =>
            l.token === token &&
            l.capability === 'reschedule_session' &&
            !l.usedAt &&
            new Date(l.expiresAt) > new Date()
        )
        if (!link) return false
        const session = data.sessions.find((item) => item.id === link.sessionId)
        if (!session || !isRescheduleSlotAvailable(data, session, startsAt)) return false
        const result = moveSessionDomain(data, link.sessionId, startsAt)
        if (result.conflicts.length) return false
        commit({
          ...result.data,
          links: result.data.links.map((l) =>
            l.token === token ? { ...l, usedAt: new Date().toISOString() } : l
          )
        })
        return true
      },
      addExercise: (exercise) => {
        const id = crypto.randomUUID()
        commit((current) => ({
          ...current,
          exercises: [...current.exercises, { ...exercise, id, isSystem: false, favorite: false }]
        }))
        return id
      },
      updateExercise: (exerciseId, updates) =>
        commit((current) => ({
          ...current,
          exercises: current.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, ...updates } : exercise
          )
        })),
      deleteExercise: (exerciseId) =>
        commit((current) => ({
          ...current,
          exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId)
        })),
      toggleFavoriteExercise: (exerciseId) =>
        commit((current) => ({
          ...current,
          exercises: current.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, favorite: !exercise.favorite } : exercise
          )
        })),
      saveSettings: (settings) => commit((current) => ({ ...current, settings })),
      resetDemo: () => commit(reconcileAllSchedules(seedData()))
    }),
    [data]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const value = useContext(StoreContext)
  if (!value) throw new Error('StoreProvider missing')
  return value
}
