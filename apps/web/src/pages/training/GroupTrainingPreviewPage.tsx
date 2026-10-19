import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider, type UseQueryResult } from '@tanstack/react-query'
import { CalendarDays, Dumbbell, LayoutGrid, Settings, UsersRound } from 'lucide-react'
import { useReducer, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  ExerciseDefinition,
  ExerciseLibrary,
  SessionTraining,
  TrainingExercise,
  TrainingSet
} from '../../api'
import { createAppQueryClient } from '../../query-client'
import { queryKeys } from '../../query-keys'
import { TrainingWorkspace } from './TrainingWorkspace'
import {
  createGroupTrainingDraft,
  groupTrainingReducer,
  GroupModeControl,
  GroupTrainingModesPrototype,
  type GroupMode
} from './GroupTrainingModesPrototype'

const previewCoach = { user: { id: 'group-training-preview' }, access_token: '' } as Session
const groupName = '週二三人私教'
const navigation = [
  { label: '今日', icon: LayoutGrid },
  { label: '行事曆', icon: CalendarDays },
  { label: '學生', icon: UsersRound },
  { label: '動作庫', icon: Dumbbell },
  { label: '設定', icon: Settings }
]
const previewDefinitions: ExerciseDefinition[] = [
  {
    id: 'definition-squat-a',
    catalogKey: null,
    name: '槓鈴前蹲',
    equipment: '槓鈴',
    bodyParts: ['腿', '臀'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
    isSystem: true,
    favorite: false,
    version: 1
  },
  {
    id: 'definition-squat-b',
    catalogKey: null,
    name: '高背槓深蹲',
    equipment: '槓鈴',
    bodyParts: ['腿', '臀'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
    isSystem: true,
    favorite: false,
    version: 1
  },
  {
    id: 'definition-press',
    catalogKey: null,
    name: '啞鈴肩推',
    equipment: '啞鈴',
    bodyParts: ['肩'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
    isSystem: true,
    favorite: false,
    version: 1
  }
]
const previewLibrary: ExerciseLibrary = {
  definitions: previewDefinitions,
  filters: {
    equipment: ['槓鈴', '啞鈴'],
    bodyParts: ['腿', '臀', '肩'],
    movementTypes: ['系統動作']
  },
  totals: { all: previewDefinitions.length, favorite: 0, custom: 0 }
}

function set(id: string, weight: number, reps: number, rpe: number): TrainingSet {
  return {
    id,
    measurements: {
      weight,
      reps,
      duration: null,
      distance: null,
      rounds: null,
      weightUnit: 'kg',
      durationUnit: 'sec',
      distanceUnit: 'm'
    },
    plannedWeight: weight,
    plannedReps: reps,
    actualReps: null,
    rpe,
    result: null,
    unit: 'kg'
  }
}

function exercise(id: string, name: string, sets: TrainingSet[]): TrainingExercise {
  return {
    id,
    definitionId: `definition-${id}`,
    definitionName: name,
    equipment: '槓鈴',
    bodyParts: ['腿', '臀'],
    movementType: '系統動作',
    performanceMetric: 'weight',
    recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
    sets
  }
}

function previewTraining(memberId: string, present: boolean): SessionTraining {
  const exercises = !present
    ? []
    : memberId === 'student-a'
      ? [
          exercise('squat-a', '槓鈴前蹲', []),
          exercise('squat-b', '高背槓深蹲', [
            set('set-a', 700, 2, 5),
            set('set-b', 701, 2, 6),
            set('set-c', 702, 2, 8)
          ])
        ]
      : memberId === 'student-b'
        ? [exercise('squat-c', '高背槓深蹲', [set('set-d', 60, 8, 7)])]
        : []
  return {
    session: {
      id: `preview-${memberId}-${present ? 'present' : 'absent'}`,
      studentId: memberId,
      studentName: groupName,
      startsAt: '2026-10-18T01:00:00.000Z',
      endsAt: '2026-10-18T02:00:00.000Z',
      location: '台積電',
      status: 'scheduled',
      version: 1,
      isLegacy: false
    } as SessionTraining['session'],
    lessonSummary: {} as SessionTraining['lessonSummary'],
    record: { id: null, version: 0, privateNote: '', exercises, updatedAt: null },
    defaultDistanceUnit: 'km',
    defaultWeightUnit: 'kg',
    exerciseSummaries: exercises.map((item) => ({
      occurrenceId: item.id,
      definitionId: item.definitionId,
      metric: 'weight',
      unit: 'kg',
      current: null,
      previous: null,
      personal: null,
      history: []
    })),
    allowedActions: { canEditTraining: true, canComplete: true, canReopen: false }
  }
}

export default function GroupTrainingPreviewPage() {
  const [client] = useState(() => {
    const next = createAppQueryClient()
    const key = queryKeys.exerciseLibrary(previewCoach.user.id)
    next.setQueryDefaults(key, { staleTime: Infinity, refetchOnWindowFocus: false })
    next.setQueryData(key, previewLibrary)
    return next
  })
  const [state, dispatch] = useReducer(
    groupTrainingReducer,
    previewDefinitions,
    createGroupTrainingDraft
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: GroupMode = searchParams.get('mode') === 'B' ? 'B' : 'A'
  const changeMode = (nextMode: GroupMode) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('mode', nextMode)
        return next
      },
      { replace: true }
    )
  }
  const data = previewTraining('student-a', true)
  const query = {
    isLoading: false,
    isError: false,
    data,
    refetch: async () => ({ data })
  } as unknown as UseQueryResult<SessionTraining, Error>

  return (
    <QueryClientProvider client={client}>
      <div className="app-shell" data-route="/sessions/preview">
        <aside className="sidebar">
          <img
            className="sidebar-brand-logo"
            src="/brand/form-horizontal.png"
            alt="FORM Coach Desk"
          />
          <nav aria-label="主要導覽">
            {navigation.map((item) => (
              <a
                href="/__review/group-training"
                key={item.label}
                onClick={(event) => event.preventDefault()}
              >
                <item.icon />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="coach-card">
              <div className="mini-avatar">預</div>
              <div className="coach-card-identity">
                <strong>訓練紀錄預覽</strong>
              </div>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <TrainingWorkspace
            key="group-mode-preview"
            session={previewCoach}
            query={query}
            timeZone="Asia/Taipei"
            onBack={() => history.back()}
            groupPreview={{
              name: groupName,
              members: state.members,
              selectedId: 'student-a',
              onSelect: () => {},
              onToggleAttendance: (studentId) => dispatch({ type: 'toggleAttendance', studentId }),
              onDraftChange: () => {},
              onAddExerciseToOthers: () => {},
              modeContent: (
                <GroupTrainingModesPrototype
                  session={previewCoach}
                  state={state}
                  mode={mode}
                  dispatch={dispatch}
                />
              ),
              modeControl: <GroupModeControl mode={mode} onModeChange={changeMode} />,
              modeActionNames: state.actions.map((action) => action.definition.name),
              modeCounts: {
                completed: state.sets.filter(
                  (entry) =>
                    state.members.some(
                      (member) => member.id === entry.studentId && member.present
                    ) && entry.value.result === 'completed'
                ).length,
                total: state.sets.filter((entry) =>
                  state.members.some((member) => member.id === entry.studentId && member.present)
                ).length
              }
            }}
          />
        </main>
      </div>
    </QueryClientProvider>
  )
}
