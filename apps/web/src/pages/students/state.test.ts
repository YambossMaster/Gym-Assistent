import { describe, expect, it } from 'vitest'
import type { Student } from '../../api'
import { selectStudentRosterResult } from './state'

const student = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  name: '品妤',
  phone: '',
  goal: '提升肌力',
  privateNote: '',
  lineLinked: false,
  active: true,
  version: 1,
  createdAt: '2026-09-13T00:00:00.000Z',
  updatedAt: '2026-09-13T00:00:00.000Z',
  lessonSummary: { purchased: 10, completed: 8, remaining: 2 },
  ...overrides
})

describe('Student roster result selection', () => {
  it('distinguishes the first Student empty state', () => {
    expect(selectStudentRosterResult({ students: [], view: 'active', query: '' }).state).toBe(
      'first-empty'
    )
  })

  it('distinguishes an empty active/archive filter', () => {
    expect(
      selectStudentRosterResult({ students: [student()], view: 'archived', query: '' }).state
    ).toBe('filter-empty')
  })

  it('distinguishes a search with no match in the selected view', () => {
    expect(
      selectStudentRosterResult({ students: [student()], view: 'active', query: '不存在' }).state
    ).toBe('search-empty')
  })

  it('returns only matching Students from the selected view', () => {
    const result = selectStudentRosterResult({
      students: [student(), student({ id: 'student-2', name: '家豪', active: false })],
      view: 'active',
      query: '肌力'
    })
    expect(result).toMatchObject({ state: 'ready', students: [{ id: 'student-1' }] })
  })
})
