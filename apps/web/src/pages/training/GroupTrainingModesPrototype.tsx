import type { Session } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import { useState, type Dispatch } from 'react'
import type { ExerciseDefinition, TrainingSet } from '../../api'
import { emptyMeasurements, metricLabels, recordingTypes, type RecordingConfig } from './recording'
import { ExercisePicker, SetCard } from './TrainingWorkspace'

export type GroupMode = 'A' | 'B'
type Member = { id: string; name: string; present: boolean }
type SharedAction = {
  id: string
  definition: ExerciseDefinition
  skippedStudentIds: string[]
}
type MemberSet = {
  actionId: string
  studentId: string
  sequence: number
  value: TrainingSet
}
export type GroupTrainingDraft = {
  members: Member[]
  actions: SharedAction[]
  sets: MemberSet[]
  nextSequence: number
}
export type GroupTrainingEvent =
  | { type: 'toggleAttendance'; studentId: string }
  | { type: 'addAction'; definition: ExerciseDefinition }
  | { type: 'toggleSkipped'; actionId: string; studentId: string }
  | { type: 'addSet'; actionId: string; studentId: string }
  | { type: 'updateSet'; setId: string; value: TrainingSet }
  | { type: 'removeSet'; setId: string }

const fallbackRecording: RecordingConfig = { type: 'weight_reps', metrics: ['weight', 'reps'] }

function MemberAvatar({ member, index }: { member: Member; index: number }) {
  const suffix = member.name.match(/\b[A-C]\b/)?.[0]
  return (
    <span className={`group-prototype-avatar tone-${index % 3}`} aria-hidden="true">
      {suffix ?? member.name.slice(0, 1)}
    </span>
  )
}

export function GroupModeControl({
  mode,
  onModeChange
}: {
  mode: GroupMode
  onModeChange: (mode: GroupMode) => void
}) {
  return (
    <div className="group-prototype-mode-switch" role="group" aria-label="訓練紀錄顯示方式">
      <button type="button" aria-pressed={mode === 'A'} onClick={() => onModeChange('A')}>
        時間序
      </button>
      <button type="button" aria-pressed={mode === 'B'} onClick={() => onModeChange('B')}>
        學生分區
      </button>
    </div>
  )
}

function FieldHead({ recording, mode }: { recording: RecordingConfig; mode: GroupMode }) {
  return (
    <div className={`group-prototype-field-head is-${mode}`} aria-hidden="true">
      <span>{mode === 'A' ? '學生' : '組'}</span>
      <span className="group-prototype-measure-head">
        {recordingTypes[recording.type].dimensions.map((dimension) => (
          <span key={dimension}>{metricLabels[dimension]}</span>
        ))}
      </span>
      <span>RPE</span>
      <span>結果</span>
      <span />
    </div>
  )
}

function seededSet(id: string, weight: number, reps: number, rpe: number): TrainingSet {
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

export function createGroupTrainingDraft(definitions: ExerciseDefinition[]): GroupTrainingDraft {
  const squat = definitions.find((item) => item.id === 'definition-squat-b')!
  const frontSquat = definitions.find((item) => item.id === 'definition-squat-a')!
  return {
    members: [
      { id: 'student-a', name: '科比牢二', present: true },
      { id: 'student-b', name: '學生 B', present: true },
      { id: 'student-c', name: '學生 C', present: false }
    ],
    actions: [
      { id: 'shared-squat', definition: squat, skippedStudentIds: [] },
      { id: 'shared-front-squat', definition: frontSquat, skippedStudentIds: [] }
    ],
    sets: [
      {
        actionId: 'shared-squat',
        studentId: 'student-a',
        sequence: 1,
        value: seededSet('set-a-1', 50, 8, 6)
      },
      {
        actionId: 'shared-squat',
        studentId: 'student-b',
        sequence: 2,
        value: seededSet('set-b-1', 60, 8, 7)
      },
      {
        actionId: 'shared-squat',
        studentId: 'student-a',
        sequence: 3,
        value: seededSet('set-a-2', 55, 6, 7)
      }
    ],
    nextSequence: 4
  }
}

export function groupTrainingReducer(
  state: GroupTrainingDraft,
  event: GroupTrainingEvent
): GroupTrainingDraft {
  switch (event.type) {
    case 'toggleAttendance':
      return {
        ...state,
        members: state.members.map((member) =>
          member.id === event.studentId ? { ...member, present: !member.present } : member
        )
      }
    case 'addAction':
      return {
        ...state,
        actions: [
          ...state.actions,
          { id: crypto.randomUUID(), definition: event.definition, skippedStudentIds: [] }
        ]
      }
    case 'toggleSkipped': {
      if (
        state.sets.some(
          (entry) => entry.actionId === event.actionId && entry.studentId === event.studentId
        )
      )
        return state
      return {
        ...state,
        actions: state.actions.map((action) =>
          action.id === event.actionId
            ? {
                ...action,
                skippedStudentIds: action.skippedStudentIds.includes(event.studentId)
                  ? action.skippedStudentIds.filter((id) => id !== event.studentId)
                  : [...action.skippedStudentIds, event.studentId]
              }
            : action
        )
      }
    }
    case 'addSet': {
      const member = state.members.find((item) => item.id === event.studentId)
      const action = state.actions.find((item) => item.id === event.actionId)
      if (!member?.present || !action || action.skippedStudentIds.includes(member.id)) return state
      const previous = state.sets
        .filter((entry) => entry.actionId === action.id && entry.studentId === member.id)
        .at(-1)?.value
      const recording = action.definition.recording ?? fallbackRecording
      const value: TrainingSet = {
        id: crypto.randomUUID(),
        measurements: previous?.measurements
          ? { ...previous.measurements }
          : emptyMeasurements(
              { defaultWeightUnit: 'kg', defaultDistanceUnit: 'km' },
              recording.type
            ),
        plannedWeight: previous?.plannedWeight ?? null,
        plannedReps: previous?.plannedReps ?? null,
        actualReps: null,
        rpe: null,
        result: null,
        unit: previous?.unit ?? 'kg'
      }
      return {
        ...state,
        sets: [
          ...state.sets,
          { actionId: action.id, studentId: member.id, sequence: state.nextSequence, value }
        ],
        nextSequence: state.nextSequence + 1
      }
    }
    case 'updateSet':
      return {
        ...state,
        sets: state.sets.map((entry) =>
          entry.value.id === event.setId ? { ...entry, value: event.value } : entry
        )
      }
    case 'removeSet':
      return { ...state, sets: state.sets.filter((entry) => entry.value.id !== event.setId) }
  }
}

function MemberSetRow({
  entry,
  member,
  memberIndex,
  studentSetIndex,
  isLastSet,
  recording,
  mode,
  dispatch
}: {
  entry: MemberSet
  member: Member
  memberIndex: number
  studentSetIndex: number
  isLastSet: boolean
  recording: RecordingConfig
  mode: GroupMode
  dispatch: Dispatch<GroupTrainingEvent>
}) {
  return (
    <div className={`group-prototype-set ${mode === 'A' ? 'is-sequential' : 'is-grouped'}`}>
      {mode === 'A' ? (
        <div className="group-prototype-set-person">
          <MemberAvatar member={member} index={memberIndex} />
          <span className="group-prototype-set-person-label">
            <strong title={member.name}>{member.name}</strong>
            <small>第 {studentSetIndex + 1} 組</small>
          </span>
        </div>
      ) : null}
      <SetCard
        set={entry.value}
        recording={recording}
        values={entry.value.measurements!}
        index={studentSetIndex}
        hideIndex={mode === 'A'}
        isLastSet={isLastSet}
        onChange={(value) => dispatch({ type: 'updateSet', setId: entry.value.id, value })}
        onRemove={() => dispatch({ type: 'removeSet', setId: entry.value.id })}
      />
    </div>
  )
}

function SharedActionCard({
  action,
  index,
  state,
  mode,
  dispatch
}: {
  action: SharedAction
  index: number
  state: GroupTrainingDraft
  mode: GroupMode
  dispatch: Dispatch<GroupTrainingEvent>
}) {
  const present = state.members.filter((member) => member.present)
  const active = present.filter((member) => !action.skippedStudentIds.includes(member.id))
  const entries = state.sets
    .filter(
      (entry) =>
        entry.actionId === action.id && present.some((member) => member.id === entry.studentId)
    )
    .sort((a, b) => a.sequence - b.sequence)
  const recordedStudentCount = new Set(entries.map((entry) => entry.studentId)).size
  const recording = action.definition.recording ?? fallbackRecording
  const studentEntries = (studentId: string) =>
    entries.filter((entry) => entry.studentId === studentId)
  const renderSet = (entry: MemberSet) => {
    const member = state.members.find((item) => item.id === entry.studentId)!
    const own = studentEntries(member.id)
    const ownIndex = own.findIndex((item) => item.value.id === entry.value.id)
    return (
      <MemberSetRow
        key={entry.value.id}
        entry={entry}
        member={member}
        memberIndex={state.members.findIndex((item) => item.id === member.id)}
        studentSetIndex={ownIndex}
        isLastSet={ownIndex === own.length - 1}
        recording={recording}
        mode={mode}
        dispatch={dispatch}
      />
    )
  }
  return (
    <article className="training-exercise-card recording-v2 group-prototype-action">
      <header className="group-prototype-action-header">
        <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
        <div className="exercise-identity">
          <h3>{action.definition.name}</h3>
          <small>
            {action.definition.bodyParts.join('、')} · {action.definition.equipment}
          </small>
        </div>
        {recordedStudentCount > 0 ? (
          <span className="group-prototype-count">{recordedStudentCount} 人有紀錄</span>
        ) : null}
      </header>
      {mode === 'A' ? (
        <div className="group-prototype-sequence">
          <FieldHead recording={recording} mode={mode} />
          {entries.map(renderSet)}
          <div
            className="group-prototype-split-add"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, active.length)}, minmax(0, 1fr))` }}
          >
            {active.map((member) => (
              <button
                key={member.id}
                type="button"
                className={`tone-${state.members.findIndex((item) => item.id === member.id) % 3}`}
                onClick={() =>
                  dispatch({ type: 'addSet', actionId: action.id, studentId: member.id })
                }
              >
                <MemberAvatar
                  member={member}
                  index={state.members.findIndex((item) => item.id === member.id)}
                />
                <Plus aria-hidden="true" /> {member.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="group-prototype-subgroups">
          <FieldHead recording={recording} mode={mode} />
          {active.map((member) => {
            const own = studentEntries(member.id)
            return (
              <section
                className="group-prototype-subgroup"
                key={member.id}
                aria-label={`${member.name}的組數`}
              >
                <header>
                  <div>
                    <MemberAvatar
                      member={member}
                      index={state.members.findIndex((item) => item.id === member.id)}
                    />
                    <strong>{member.name}</strong>
                    <span>{own.length} 組</span>
                  </div>
                  <button
                    type="button"
                    className={`group-prototype-add-one tone-${state.members.findIndex((item) => item.id === member.id) % 3}`}
                    aria-label={`新增${member.name}的一組`}
                    onClick={() =>
                      dispatch({ type: 'addSet', actionId: action.id, studentId: member.id })
                    }
                  >
                    <Plus aria-hidden="true" /> 新增一組
                  </button>
                </header>
                {own.map(renderSet)}
              </section>
            )
          })}
        </div>
      )}
      {!active.length ? (
        <p className="group-prototype-empty">目前沒有參與此動作的出席學生。</p>
      ) : null}
    </article>
  )
}

export function GroupTrainingModesPrototype({
  session,
  state,
  mode,
  dispatch
}: {
  session: Session
  state: GroupTrainingDraft
  mode: GroupMode
  dispatch: Dispatch<GroupTrainingEvent>
}) {
  const [picker, setPicker] = useState(false)
  return (
    <div className="group-prototype-view">
      <div className="group-prototype-controls">
        <div className="group-prototype-roster" aria-label="本堂學生出缺勤">
          <span>今日出席</span>
          {state.members.map((member, index) => (
            <button
              className={`group-prototype-roster-member${member.present ? '' : ' is-absent'}`}
              key={member.id}
              type="button"
              aria-pressed={member.present}
              aria-label={`${member.name}，${member.present ? '出席' : '缺席'}，點擊切換`}
              onClick={() => dispatch({ type: 'toggleAttendance', studentId: member.id })}
            >
              <MemberAvatar member={member} index={index} />
              <span>{member.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="group-prototype-actions" role="list">
        {state.actions.map((action, index) => (
          <SharedActionCard
            key={action.id}
            action={action}
            index={index}
            state={state}
            mode={mode}
            dispatch={dispatch}
          />
        ))}
      </div>
      <button
        type="button"
        className="training-add-exercise ui-action-add"
        onClick={() => setPicker(true)}
      >
        <Plus aria-hidden="true" /> 加入動作
      </button>
      {picker ? (
        <ExercisePicker
          session={session}
          previewOnly
          onClose={() => setPicker(false)}
          onPick={(definition) => {
            dispatch({ type: 'addAction', definition })
            setPicker(false)
          }}
        />
      ) : null}
    </div>
  )
}
