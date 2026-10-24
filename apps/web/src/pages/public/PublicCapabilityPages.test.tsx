// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { PublicTrainingResult } from '../../api'
import { PublicCapabilityApp } from './PublicCapabilityPages'

const api = vi.hoisted(() => ({ training: vi.fn() }))
vi.mock('../../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api')>()),
  getPublicTrainingResult: api.training
}))

const result: PublicTrainingResult = {
  coachDisplayName: '林教練',
  studentDisplayName: '晨練組',
  participants: [
    { studentId: 'a', name: '王大明', attendance: 'present' },
    { studentId: 'b', name: '林小華', attendance: 'present' },
    { studentId: 'c', name: '陳同學', attendance: 'absent' }
  ],
  session: {
    startsAt: '2026-10-22T01:00:00Z',
    endsAt: '2026-10-22T02:00:00Z',
    timeZone: 'Asia/Taipei',
    durationMinutes: 60
  },
  exercises: [
    {
      position: 1,
      definitionName: '深蹲',
      sets: [
        {
          position: 1,
          studentId: 'a',
          plannedWeight: 100,
          actualReps: 12,
          unit: 'kg',
          rpe: 8,
          result: 'completed'
        }
      ]
    }
  ],
  trainingNote: '  '
}

it('identifies each group set through the compact avatar and omits an empty shared note', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  api.training.mockResolvedValue(result)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <MemoryRouter initialEntries={['/t/token']}>
          <Routes>
            <Route path="/t/:token" element={<PublicCapabilityApp purpose="training" />} />
          </Routes>
        </MemoryRouter>
      )
    )
    await vi.waitFor(() => expect(host.querySelectorAll('.public-person')).toHaveLength(3))
    const people = [...host.querySelectorAll('.public-person')]
    expect(people).toHaveLength(3)
    expect(people[2]?.className).toContain('is-absent')
    expect(people[2]?.textContent).toContain('缺席')
    const row = host.querySelector('.public-set.is-group')!
    expect(row.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('王大明')
    expect(row.textContent).toContain('100 kg × 12 次')
    expect(row.textContent).not.toContain('王大明')
    expect(host.querySelector('.public-note')).toBeNull()
    expect(host.querySelector('.public-coach-seal')?.textContent).toContain('林教練')
  } finally {
    await act(async () => root.unmount())
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
