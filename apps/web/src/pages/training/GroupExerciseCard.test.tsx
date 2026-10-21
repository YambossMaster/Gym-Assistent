// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import type { SessionTraining, TrainingDraftPayload } from '../../api'
import { GroupExerciseCard } from './TrainingWorkspace'

const people = [
  { studentId: 'person-a', name: '吳佳蓉', status: 'present' as const },
  { studentId: 'person-b', name: '周子晴', status: 'present' as const },
  { studentId: 'person-c', name: '王同學', status: 'present' as const }
]
const exercise = {
  id: 'exercise-one',
  definitionId: 'squat',
  definitionName: '低背槓深蹲',
  recording: { type: 'weight_reps', metrics: ['weight', 'reps'] },
  sets: [
    {
      id: 'set-a',
      studentId: 'person-a',
      plannedWeight: 40,
      plannedReps: 5,
      actualReps: 5,
      rpe: 7,
      result: 'completed',
      unit: 'kg'
    },
    {
      id: 'set-b',
      studentId: 'person-b',
      plannedWeight: 30,
      plannedReps: 5,
      actualReps: null,
      rpe: null,
      result: 'incomplete',
      unit: 'kg'
    }
  ]
} as TrainingDraftPayload['exercises'][number]
const preference = {
  defaultWeightUnit: 'kg',
  defaultDistanceUnit: 'km',
  record: { exercises: [] }
} as unknown as SessionTraining
const summaries = [
  {
    studentId: 'person-a',
    occurrenceId: 'exercise-one',
    definitionId: 'squat',
    metric: 'weight',
    unit: 'kg',
    previous: 90,
    current: null,
    personal: null,
    history: [],
    series: [{ metric: 'weight', unit: 'kg', direction: 'higher', points: [], previous: 90 }]
  },
  {
    studentId: 'person-b',
    occurrenceId: 'exercise-one',
    definitionId: 'squat',
    metric: 'weight',
    unit: 'kg',
    previous: 60,
    current: null,
    personal: null,
    history: [],
    series: [{ metric: 'weight', unit: 'kg', direction: 'higher', points: [], previous: 60 }]
  },
  {
    studentId: 'person-c',
    occurrenceId: 'exercise-one',
    definitionId: 'squat',
    metric: 'weight',
    unit: 'kg',
    previous: 70,
    current: null,
    personal: null,
    history: [],
    series: [{ metric: 'weight', unit: 'kg', direction: 'higher', points: [], previous: 70 }]
  }
] as NonNullable<SessionTraining['groupExerciseSummaries']>

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

it('shows separate last bests and routes each trajectory to the matching student in both modes', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onShowTrend = vi.fn()
  const render = async (mode: 'timeline' | 'student') => {
    await act(async () =>
      root.render(
        <GroupExerciseCard
          exercise={exercise}
          index={0}
          mode={mode}
          participants={people}
          attendance={people.map((person) => ({ studentId: person.studentId, status: 'present' }))}
          preference={preference}
          summaries={summaries}
          onShowTrend={onShowTrend}
          onChange={vi.fn()}
          onRemove={vi.fn()}
        />
      )
    )
  }

  await render('timeline')
  expect(
    [...host.querySelectorAll('.group-exercise-best')].map((item) => item.textContent)
  ).toEqual(['吳上次最佳90 kg', '周上次最佳60 kg', '王上次最佳70 kg'])
  expect(
    [...host.querySelectorAll('.group-exercise-best')].map((item) =>
      item.getAttribute('aria-label')
    )
  ).toEqual(['吳佳蓉的上次最佳', '周子晴的上次最佳', '王同學的上次最佳'])
  expect(host.querySelector('.group-exercise-count')).toBeNull()
  expect(host.querySelector('.exercise-identity .group-exercise-bests')).toBeNull()
  expect(host.querySelector('.training-set-card.group-tone-0.completed')).not.toBeNull()
  expect(host.querySelector('.training-set-card.group-tone-1.incomplete')).not.toBeNull()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.group-exercise-trend-trigger')!.click()
  })
  expect(host.querySelector('.group-exercise-trend-options')).not.toBeNull()
  await act(async () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  })
  expect(host.querySelector('.group-exercise-trend-options')).toBeNull()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.group-exercise-trend-trigger')!.click()
  })
  await act(async () => {
    document.dispatchEvent(
      new globalThis.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
  })
  expect(host.querySelector('.group-exercise-trend-options')).toBeNull()
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.group-exercise-trend-trigger')!.click()
  })
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.group-exercise-trend-options button.tone-1')!.click()
  })
  expect(onShowTrend).toHaveBeenLastCalledWith('person-b')
  expect(host.querySelector('.group-exercise-trend-options')).toBeNull()

  await render('student')
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.group-exercise-trend-one.tone-0')!.click()
  })
  expect(onShowTrend).toHaveBeenLastCalledWith('person-a')
  await act(async () => root.unmount())
})
