import { expect, it } from 'vitest'
import {
  studentEligibleVenueIds,
  studentVenueLessonLabel,
  suggestedStudentVenue,
  type VenueData
} from './finance-api'

const venues = [
  { id: 'a', name: 'A', active: true },
  { id: 'b', name: 'B', active: true },
  { id: 'c', name: 'C', active: false }
] as VenueData['venues']

it('shows only a Student’s purchased Venues, while a general purchase allows any Venue', () => {
  const purchases: NonNullable<VenueData['purchases']> = [
    { studentId: 'student', venueId: 'b', lessonCount: 2 },
    { studentId: 'student', venueId: 'a', lessonCount: 3 },
    { studentId: 'other', venueId: 'c', lessonCount: 1 }
  ]
  const data: Pick<VenueData, 'venues' | 'purchases'> = {
    venues,
    purchases
  }
  expect(studentEligibleVenueIds(data, 'student')).toEqual(['b', 'a'])
  expect(suggestedStudentVenue(data, 'student')?.id).toBe('a')
  expect(studentEligibleVenueIds(data, 'none')).toEqual([])
  purchases.push({ studentId: 'student', venueId: null, lessonCount: 1 })
  expect(studentEligibleVenueIds(data, 'student')).toBeNull()
})

it('uses only the selected Venue and general lessons for the scheduling hint', () => {
  const studentVenueBalances: NonNullable<VenueData['studentVenueBalances']> = [
    { studentId: 'student', venueId: 'a', purchased: 2, completed: 0, remaining: 2 },
    { studentId: 'student', venueId: 'b', purchased: 1, completed: 1, remaining: 0 },
    { studentId: 'student', venueId: null, purchased: 1, completed: 0, remaining: 1 }
  ]
  const data = { studentVenueBalances }
  expect(studentVenueLessonLabel(data, 'student', null)).toBeNull()
  expect(studentVenueLessonLabel(data, 'student', 'a')).toBe('剩餘 3 堂')
  expect(studentVenueLessonLabel(data, 'student', 'b')).toBe('剩餘 1 堂')
  studentVenueBalances[2]!.remaining = 0
  expect(studentVenueLessonLabel(data, 'student', 'b')).toBe('單堂計費')
  expect(studentVenueLessonLabel(data, 'other', 'a')).toBe('單堂計費')
})
