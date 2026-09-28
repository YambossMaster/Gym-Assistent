// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import type { CapabilityLinkMetadata } from '../../api'
import {
  clearOtherCoachCapabilityLinks,
  readCapabilityLink,
  saveCapabilityLink
} from './capability-link-session'

const link: CapabilityLinkMetadata = {
  id: 'link-1',
  purpose: 'training_result',
  status: 'active',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  includeTrainingNote: false,
  createdAt: new Date().toISOString(),
  version: 1,
  allowedActions: { canReissue: true, canRevoke: true }
}

it('limits a retained URL to the same Coach, Session, purpose, and unexpired link', () => {
  saveCapabilityLink('coach-a', 'session-a', { link, token: 'secret-a' })
  expect(readCapabilityLink('coach-a', 'session-a', 'training_result')?.token).toBe('secret-a')
  expect(readCapabilityLink('coach-b', 'session-a', 'training_result')).toBeNull()
  expect(readCapabilityLink('coach-a', 'session-b', 'training_result')).toBeNull()
  expect(readCapabilityLink('coach-a', 'session-a', 'reschedule_session')).toBeNull()

  clearOtherCoachCapabilityLinks('coach-b')
  expect(sessionStorage.length).toBe(0)

  saveCapabilityLink('coach-a', 'session-a', {
    link: { ...link, expiresAt: new Date(Date.now() - 1000).toISOString() },
    token: 'expired-secret'
  })
  expect(readCapabilityLink('coach-a', 'session-a', 'training_result')).toBeNull()
  expect(sessionStorage.length).toBe(0)
})

afterEach(() => sessionStorage.clear())
