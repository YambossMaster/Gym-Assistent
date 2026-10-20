import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { SessionTraining, TrainingDraftPayload } from '../../api'
import { GroupExerciseCard } from './TrainingWorkspace'

const people = [
  { studentId: 'preview-person-a', name: '陳同學', status: 'present' as const },
  { studentId: 'preview-person-b', name: '林同學', status: 'present' as const },
  { studentId: 'preview-person-c', name: '王同學', status: 'present' as const }
]

const seed: TrainingDraftPayload['exercises'] = [
  {
    id: 'preview-occurrence-a',
    definitionId: 'preview-definition-a',
    definitionName: '槓鈴深蹲',
    recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
    formatVersion: 2,
    sets: [
      {
        id: 'preview-set-a',
        studentId: people[0]!.studentId,
        plannedWeight: 45,
        plannedReps: 8,
        actualReps: 8,
        rpe: 7,
        result: 'completed',
        unit: 'kg'
      },
      {
        id: 'preview-set-b',
        studentId: people[1]!.studentId,
        plannedWeight: 30,
        plannedReps: 10,
        actualReps: null,
        rpe: null,
        result: null,
        unit: 'kg'
      },
      {
        id: 'preview-set-c',
        studentId: people[2]!.studentId,
        plannedWeight: 20,
        plannedReps: 12,
        actualReps: null,
        rpe: null,
        result: null,
        unit: 'kg'
      }
    ]
  }
]

const preference = {
  defaultWeightUnit: 'kg',
  defaultDistanceUnit: 'km',
  record: { exercises: [] }
} as unknown as SessionTraining

export default function GroupTrainingSolPreview() {
  const [mode, setMode] = useState<'timeline' | 'student'>('timeline')
  const [attendance, setAttendance] = useState<NonNullable<TrainingDraftPayload['attendance']>>(
    people.map((person) => ({ studentId: person.studentId, status: 'present' }))
  )
  const [exercises, setExercises] = useState(seed)
  return (
    <div className="session-workspace m11-sol-preview">
      <div className="m11-sol-preview-top">
        <span>FORM COACH DESK / M11</span>
        <strong>多人共課 · 本機排版預覽</strong>
        <small>此開發路由使用隔離範例；正式資料與儲存由 /sessions/:id API 負責。</small>
      </div>
      <main className="training-editor">
        <header className="training-heading">
          <div>
            <span>TRAINING LOG</span>
            <h2>訓練紀錄</h2>
            <p>晨練組 · 3 位學生 · 一堂共用動作</p>
          </div>
        </header>
        <section className="group-training-controls" aria-label="共課出席與檢視">
          <div className="group-training-attendance">
            {people.map((person) => {
              const absent =
                attendance.find((item) => item.studentId === person.studentId)?.status === 'absent'
              return (
                <button
                  key={person.studentId}
                  aria-pressed={!absent}
                  onClick={() =>
                    setAttendance((current) =>
                      current.map((item) =>
                        item.studentId === person.studentId
                          ? { ...item, status: absent ? 'present' : 'absent' }
                          : item
                      )
                    )
                  }
                >
                  {person.name} · {absent ? '缺席' : '出席'}
                </button>
              )
            })}
          </div>
          <div className="group-training-view" role="group" aria-label="組數檢視">
            <button aria-pressed={mode === 'timeline'} onClick={() => setMode('timeline')}>
              按時序
            </button>
            <button aria-pressed={mode === 'student'} onClick={() => setMode('student')}>
              按學生
            </button>
          </div>
        </section>
        <div className="group-training-exercises">
          {exercises.map((exercise, index) => (
            <GroupExerciseCard
              key={exercise.id}
              exercise={exercise}
              index={index}
              mode={mode}
              participants={people}
              attendance={attendance}
              preference={preference}
              onChange={(next) =>
                setExercises((current) =>
                  current.map((item) => (item.id === next.id ? next : item))
                )
              }
              onRemove={() =>
                setExercises((current) => current.filter((item) => item.id !== exercise.id))
              }
            />
          ))}
          <button
            className="training-add-exercise ui-action-add"
            onClick={() =>
              setExercises((current) => [
                ...current,
                { ...seed[0]!, id: crypto.randomUUID(), sets: [] }
              ])
            }
          >
            <Plus />
            再加入一個槓鈴深蹲
          </button>
        </div>
      </main>
    </div>
  )
}
