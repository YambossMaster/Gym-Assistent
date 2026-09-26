import { expect, it, vi } from 'vitest'
import { FinanceModule } from './finance-module.js'
import type { FinanceSnapshot } from './finance.js'

it('derives Workspace from identity and paginates all historical months without truncation', async () => {
  const data: FinanceSnapshot = {
    timeZone: 'Asia/Taipei',
    venues: [],
    rules: [],
    credits: [],
    sessions: [],
    payouts: [],
    purchases: Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      studentId: 's',
      studentName: 'S',
      purchasedOn: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
      lessonCount: 1,
      amountMinor: 100,
      currency: 'TWD',
      collectionMode: 'coach',
      venueId: null,
    })),
  }
  const snapshot = vi.fn(async (w: string) => (w === 'own' ? data : { ...data, purchases: [] }))
  const command = vi.fn(
    async (
      _w: string,
      _op: string,
      _v: string | undefined,
      _id: string | undefined,
      _input: unknown,
    ) => ({}),
  )
  const module = new FinanceModule(
    { resolveWorkspace: async (id) => (id.userId === 'a' ? 'own' : 'other') },
    { snapshot, command },
    () => new Date('2026-08-31T16:00:00Z'),
  )
  const current = (await module.read({ userId: 'a' }, 'current')) as { month: string }
  expect(current.month).toBe('2026-09')
  const first = (await module.read({ userId: 'a' }, 'months')) as {
    months: string[]
    nextCursor: string
  }
  const second = (await module.read({ userId: 'a' }, 'months', first.nextCursor)) as {
    months: string[]
    nextCursor: null
  }
  expect(new Set([...first.months, ...second.months]).size).toBe(30)
  expect(second.nextCursor).toBeNull()
  expect(((await module.read({ userId: 'b' }, 'months')) as { months: string[] }).months).toEqual(
    [],
  )
  await module.command({ userId: 'b' }, 'create', undefined, undefined, {
    name: 'test',
    workspaceId: 'own',
  })
  expect(command.mock.calls[0]?.[0]).toBe('other')
})
