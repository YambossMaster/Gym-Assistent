import { expect, it } from 'vitest'
import { isStudentArchiveOnly, isVenueArchiveOnly, routePolicy } from './route-policy.js'

it('classifies premium reads, recovery actions, and operational writes', () => {
  expect(routePolicy('GET', '/v1/finances/current')).toBe('premium')
  expect(routePolicy('GET', '/v1/students/:studentId/performance')).toBe('premium')
  expect(routePolicy('POST', '/v1/finances/entries')).toBe('premium')
  expect(routePolicy('POST', '/v1/students')).toBe('create-student')
  expect(routePolicy('PATCH', '/v1/venues/:venueId')).toBe('update-venue')
  expect(routePolicy('POST', '/v1/sessions/:sessionId/training')).toBe('operational-write')
  expect(routePolicy('DELETE', '/v1/sessions/:sessionId')).toBe('operational-write')
  expect(routePolicy('POST', '/v1/beta/redeem')).toBe('allow')
  expect(routePolicy('POST', '/v1/public/reschedule/redeem')).toBe('allow')
  expect(routePolicy('POST', '/v1/capability-links/:linkId/revoke')).toBe('allow')
})

it('allows only a versioned archive to recover from over-capacity', () => {
  const student = {
    active: true,
    version: 3,
    name: 'Coach',
    phone: null,
    goal: '',
    privateNote: '',
    ageRange: null,
    defaultVenueId: null,
    lineLinked: false,
  }
  expect(isStudentArchiveOnly({ ...student, active: false }, student)).toBe(true)
  expect(isStudentArchiveOnly({ ...student, active: false, name: 'Changed' }, student)).toBe(false)
  expect(isStudentArchiveOnly({ ...student, active: false, version: 2 }, student)).toBe(false)

  const venue = { active: true, version: 2, name: 'Gym', address: 'Address' }
  expect(isVenueArchiveOnly({ active: false, version: 2, name: 'Gym' }, venue)).toBe(true)
  expect(isVenueArchiveOnly({ active: false, version: 2, name: 'Other' }, venue)).toBe(false)
})
