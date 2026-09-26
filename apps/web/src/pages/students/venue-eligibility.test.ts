import { expect, it } from 'vitest'
import { studentEligibleVenueIds, suggestedStudentVenue, type VenueData } from './finance-api'

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
