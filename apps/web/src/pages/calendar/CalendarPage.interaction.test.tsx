// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalendarPage } from './CalendarPage'

const createSeriesMutate = vi.hoisted(() => vi.fn())
const createBlockMutate = vi.hoisted(() => vi.fn())
vi.mock('./queries', () => ({
  useCalendarRouteQuery: (_session: unknown, range: { start: string; end: string }) => ({
    data: {
      range,
      timeZone: 'Asia/Taipei',
      sessions: [],
      blocks: [],
      availabilityByDate: {},
      availabilityRulesByWeekday: {},
      availabilityVersionsByDate: {}
    },
    isLoading: false,
    isFetching: false,
    error: null
  }),
  useSchedulingMutations: () => ({
    createSession: { isPending: false, mutate: vi.fn() },
    createSeries: { isPending: false, mutate: createSeriesMutate },
    updateSession: { isPending: false, mutate: vi.fn() },
    createBlock: { isPending: false, mutate: createBlockMutate },
    updateBlock: { isPending: false, mutate: vi.fn() },
    replaceAvailability: { isPending: false, mutate: vi.fn() },
    transitionSession: { isPending: false, mutate: vi.fn() },
    deleteSession: { isPending: false, mutate: vi.fn() },
    deleteBlock: { isPending: false, mutate: vi.fn() }
  })
}))
vi.mock('../students/queries', () => ({
  useStudentsRouteQuery: () => ({
    students: {
      data: [{ id: 'student-1', name: '學生甲', active: true, lessonSummary: { remaining: 8 } }]
    }
  })
}))

describe('Calendar scheduling surface', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
    createSeriesMutate.mockClear()
    createBlockMutate.mockClear()
  })

  it('keeps its header collapsed across view switches', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(<CalendarPage session={{} as Session} timeZone="Asia/Taipei" />)
      )
      const page = host.querySelector('.calendar-page')!
      await act(async () =>
        page.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 80 }))
      )
      expect(page.classList.contains('calendar-focus-mode')).toBe(true)
      for (const view of ['月', '日', '課表', '週']) {
        await act(async () => {
          ;[...host.querySelectorAll<HTMLButtonElement>('.calendar-view-switch button')]
            .find((button) => button.textContent?.trim() === view)!
            .click()
        })
        expect(page.classList.contains('calendar-focus-mode')).toBe(true)
      }
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('shows Demo-aligned course, availability, and block modes without the acknowledgement gate', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(<CalendarPage session={{} as Session} timeZone="Asia/Taipei" />)
      )
      await act(async () => host.querySelector<HTMLButtonElement>('.page-header button')!.click())
      const dialog = host.querySelector('.scheduling-dialog')!
      expect(dialog.textContent).toContain('安排這個時段')
      expect(dialog.textContent).toContain('重複')
      expect(dialog.textContent).not.toContain('安排提醒')
      expect(dialog.querySelector<HTMLInputElement>('input[type="checkbox"]')).toBeNull()
      expect(
        dialog.querySelector<HTMLButtonElement>('.scheduling-form-actions .primary-button')!
          .disabled
      ).toBe(false)
      const start = dialog.querySelector<HTMLInputElement>('.scheduling-time-field input')!
      await act(async () => start.focus())
      expect(document.body.querySelector('.scheduling-time-menu[role="listbox"]')).not.toBeNull()
      expect(dialog.querySelector('.scheduling-time-menu')).toBeNull()
      await act(async () => {
        ;[...dialog.querySelectorAll<HTMLButtonElement>('.composer-kind button')][1]!.click()
      })
      expect(dialog.textContent).toContain('加入可排課')
      expect(dialog.textContent).toContain('從可排課移除')
      expect(dialog.textContent).toContain('只改這一天')
      expect(dialog.textContent).toContain('每週這一天')
      await act(async () => {
        ;[...dialog.querySelectorAll<HTMLButtonElement>('.composer-kind button')][2]!.click()
      })
      expect(dialog.textContent).toContain('備註（選填）')
      expect(
        dialog.querySelector<HTMLInputElement>('input[placeholder="不填也可以封鎖"]')
      ).toBeNull()
      expect(dialog.textContent).toContain('重複')
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('sends a weekly course repeat through the existing Schedule Series operation', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(<CalendarPage session={{} as Session} timeZone="Asia/Taipei" />)
      )
      await act(async () => host.querySelector<HTMLButtonElement>('.page-header button')!.click())
      const form = host.querySelector<HTMLFormElement>('.scheduling-form')!
      const repeat = [...form.querySelectorAll<HTMLButtonElement>('.form-select-trigger')].find(
        (button) => button.getAttribute('aria-label') === '重複'
      )!
      await act(async () => repeat.click())
      const weekly = [
        ...document.querySelectorAll<HTMLButtonElement>('.form-select-menu button')
      ].find((button) => button.textContent?.trim() === '每週')!
      await act(async () => weekly.click())
      expect(form.querySelector<HTMLInputElement>('input[name="repeat"]')?.value).toBe('1')
      await act(async () =>
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      )
      expect(form.querySelector('.notice.error')?.textContent).toBeFalsy()
      expect(createSeriesMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'student-1',
          input: expect.objectContaining({ intervalWeeks: 1, autoScheduleHorizon: 'NONE' })
        }),
        expect.any(Object)
      )
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('closes a successful block creation without adding a redundant success banner', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () =>
        root.render(<CalendarPage session={{} as Session} timeZone="Asia/Taipei" />)
      )
      await act(async () => host.querySelector<HTMLButtonElement>('.page-header button')!.click())
      await act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('.composer-kind button')][2]!.click()
      )
      await act(async () =>
        host
          .querySelector<HTMLFormElement>('.scheduling-form')!
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      )
      expect(createBlockMutate).toHaveBeenCalled()
      await act(async () => createBlockMutate.mock.lastCall![1].onSuccess([{}]))
      expect(host.querySelector('.scheduling-dialog')).toBeNull()
      expect(host.querySelector('.form-notice')).toBeNull()
    } finally {
      await act(async () => root.unmount())
    }
  })
})
