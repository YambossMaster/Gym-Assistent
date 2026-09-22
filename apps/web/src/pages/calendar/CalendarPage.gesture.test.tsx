// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalendarPage } from './CalendarPage'

const calls = vi.hoisted(() => ({
  updateSession: vi.fn(),
  updateBlock: vi.fn(),
  deleteSession: vi.fn(),
  deleteBlock: vi.fn(),
  transitionSession: vi.fn(),
  includeItems: false,
  completed: false,
  recurring: false
}))

vi.mock('./queries', () => ({
  useCalendarRouteQuery: (_session: unknown, range: { start: string; end: string }) => ({
    data: {
      range,
      timeZone: 'Asia/Taipei',
      sessions: calls.includeItems
        ? [
            {
              session: {
                id: 'course-1',
                studentId: 'student-1',
                studentName: '學生甲',
                startsAt: `${range.start}T02:00:00.000Z`,
                endsAt: `${range.start}T03:00:00.000Z`,
                status: calls.completed ? 'completed' : 'scheduled',
                location: '教室',
                version: 4,
                seriesId: calls.recurring ? 'series-1' : null,
                completedAt: null,
                isLegacy: false
              },
              conflicts: []
            }
          ]
        : [],
      blocks: calls.includeItems
        ? [
            {
              id: 'block-1',
              startsAt: `${range.start}T06:00:00.000Z`,
              endsAt: `${range.start}T07:00:00.000Z`,
              note: '私人時段',
              recurrenceId: null,
              version: 2
            }
          ]
        : [],
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
    createSeries: { isPending: false, mutate: vi.fn() },
    updateSession: { isPending: false, mutate: calls.updateSession },
    createBlock: { isPending: false, mutate: vi.fn() },
    updateBlock: { isPending: false, mutate: calls.updateBlock },
    replaceAvailability: { isPending: false, mutate: vi.fn() },
    transitionSession: { isPending: false, mutate: calls.transitionSession },
    deleteSession: { isPending: false, mutate: calls.deleteSession },
    deleteBlock: { isPending: false, mutate: calls.deleteBlock }
  })
}))
vi.mock('../students/queries', () => ({
  useStudentsRouteQuery: () => ({
    students: {
      data: [
        { id: 'student-1', name: '學生甲', active: true },
        { id: 'student-2', name: '學生乙', active: true }
      ]
    }
  })
}))

class TestPointerEvent extends MouseEvent {
  pointerId = 1
  pointerType: string
  constructor(type: string, options: MouseEventInit & { pointerType?: string }) {
    super(type, options)
    this.pointerType = options.pointerType ?? 'mouse'
  }
}

function pointer(target: Element, type: string, x: number, y: number, pointerType = 'mouse') {
  target.dispatchEvent(
    new TestPointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType
    })
  )
}

async function mount(includeItems = false) {
  calls.includeItems = includeItems
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn()
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    if (this.classList.contains('calendar-time-grid')) {
      const grids = [...document.querySelectorAll('.calendar-time-grid')]
      const left = 54 + grids.indexOf(this) * 120
      return { left, right: left + 120, top: 54, bottom: 774, width: 120, height: 720 } as DOMRect
    }
    return { left: 0, right: 900, top: 0, bottom: 800, width: 900, height: 800 } as DOMRect
  })
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () =>
    root.render(
      <MemoryRouter>
        <CalendarPage session={{} as Session} timeZone="Asia/Taipei" />
      </MemoryRouter>
    )
  )
  return { host, root }
}

afterEach(() => {
  document.body.innerHTML = ''
  calls.updateSession.mockClear()
  calls.updateBlock.mockClear()
  calls.deleteSession.mockClear()
  calls.deleteBlock.mockClear()
  calls.transitionSession.mockClear()
  calls.includeItems = false
  calls.completed = false
  calls.recurring = false
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
})

describe('Calendar Day and Week gestures', () => {
  it('opens the composer with the dragged range and selected student', async () => {
    const { host, root } = await mount()
    try {
      const grid = host.querySelector('.calendar-time-grid')!
      await act(async () => pointer(grid, 'pointerdown', 100, 234)) // 10:00
      await act(async () => pointer(grid, 'pointermove', 100, 290)) // 11:15
      expect(grid.querySelector('.calendar-drag-preview')?.textContent).toContain('10:00—11:30')
      await act(async () => pointer(grid, 'pointerup', 100, 290))
      const dialog = host.querySelector('.scheduling-dialog')!
      expect(
        dialog.querySelector<HTMLButtonElement>('.form-select-trigger[aria-label="學生"]')
          ?.textContent
      ).toContain('學生甲')
      const times = [...dialog.querySelectorAll<HTMLInputElement>('.scheduling-time-field input')]
      expect(times.map((input) => input.value)).toEqual(['10:00', '11:30'])
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('moves a scheduled course across Week columns directly with its version and original duration', async () => {
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-session.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 245)) // grab at 10:15
      await act(async () => pointer(item, 'pointermove', 220, 335)) // next day at 12:15
      await act(async () => pointer(item, 'pointerup', 220, 335))
      const input = calls.updateSession.mock.lastCall?.[0]
      expect(input).toMatchObject({
        sessionId: 'course-1',
        input: { version: 4, location: '教室' }
      })
      expect(Date.parse(input.input.endsAt) - Date.parse(input.input.startsAt)).toBe(60 * 60 * 1000)
      expect(input.input.startsAt).toContain('T04:00:00.000Z')
      expect(host.querySelector('.scheduling-dialog')).toBeNull()
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('lets a held touch draw a range on the time grid', async () => {
    const { host, root } = await mount()
    try {
      const grid = host.querySelector('.calendar-time-grid')!
      await act(async () => pointer(grid, 'pointerdown', 100, 234, 'touch'))
      await act(async () => new Promise((resolve) => setTimeout(resolve, 320)))
      expect(grid.querySelector('.calendar-drag-preview')?.textContent).toContain('10:00—10:15')
      await act(async () => pointer(grid, 'pointermove', 100, 290, 'touch'))
      expect(grid.querySelector('.calendar-drag-preview')?.textContent).toContain('10:00—11:30')
      await act(async () => pointer(grid, 'pointerup', 100, 290, 'touch'))
      expect(
        [
          ...host.querySelectorAll<HTMLInputElement>(
            '.scheduling-dialog .scheduling-time-field input'
          )
        ].map((input) => input.value)
      ).toEqual(['10:00', '11:30'])
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('treats a short touch on blank time as an ordinary single-slot tap', async () => {
    const { host, root } = await mount()
    try {
      const grid = host.querySelector('.calendar-time-grid')!
      await act(async () => pointer(grid, 'pointerdown', 100, 234, 'touch'))
      await act(async () => pointer(grid, 'pointerup', 100, 234, 'touch'))
      expect(
        [
          ...host.querySelectorAll<HTMLInputElement>(
            '.scheduling-dialog .scheduling-time-field input'
          )
        ].map((input) => input.value)
      ).toEqual(['10:00', '11:00'])
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('holds a touch before moving a block, preserving the proposed range on failure', async () => {
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-block.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 425, 'touch')) // 14:15
      await act(async () => pointer(item, 'pointermove', 100, 470, 'touch')) // pan, not drag
      expect(calls.updateBlock).not.toHaveBeenCalled()
      await act(async () => pointer(item, 'pointerup', 100, 470, 'touch'))

      await act(async () => pointer(item, 'pointerdown', 100, 425, 'touch'))
      await act(async () => new Promise((resolve) => setTimeout(resolve, 320)))
      await act(async () => pointer(item, 'pointermove', 100, 470, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 470, 'touch'))
      expect(calls.updateBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'block-1',
          input: expect.objectContaining({ version: 2, scope: 'single' })
        }),
        expect.any(Object)
      )
      await act(async () => calls.updateBlock.mock.lastCall![1].onError(new Error('暫時無法連線')))
      expect(host.querySelector('.scheduling-dialog')?.textContent).toContain('暫時無法連線')
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('pans from a completed course on touch and still opens it on tap', async () => {
    calls.completed = true
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-session.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 245, 'touch'))
      await act(async () => pointer(item, 'pointermove', 100, 290, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 290, 'touch'))
      expect(host.querySelector('.scheduling-dialog')).toBeNull()
      expect(calls.updateSession).not.toHaveBeenCalled()

      await act(async () => pointer(item, 'pointerdown', 100, 245, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 245, 'touch'))
      expect(host.querySelector('.scheduling-dialog')?.textContent).toContain('學生甲')
      expect(host.querySelector('.scheduling-dialog')?.textContent).toContain('10:00–11:00')
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('opens the quick course view and confirms Delete outside editable fields', async () => {
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-session.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 245, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 245, 'touch'))
      const dialog = host.querySelector('.scheduling-dialog')!
      expect(dialog.querySelector('.calendar-quick-time')?.textContent).toContain('教室')
      await act(async () =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      expect(calls.deleteSession).not.toHaveBeenCalled()
      expect(document.body.textContent).toContain('是否確認刪除此課堂？')
      await act(async () =>
        [...document.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('取消'))!
          .click()
      )
      const restoredDialog = host.querySelector('.scheduling-dialog')!
      await act(async () =>
        restoredDialog.querySelector<HTMLButtonElement>('.calendar-quick-edit')!.click()
      )
      const input = restoredDialog.querySelector<HTMLInputElement>('input[type="date"]')!
      input.focus()
      calls.deleteSession.mockClear()
      await act(async () =>
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      expect(calls.deleteSession).not.toHaveBeenCalled()
      await act(async () =>
        restoredDialog
          .querySelector<HTMLButtonElement>('.scheduling-form-actions .secondary-button')!
          .click()
      )
      await act(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      })
      expect(restoredDialog.contains(document.activeElement)).toBe(true)
      await act(async () =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      await act(async () =>
        [...document.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('確認刪除'))!
          .click()
      )
      expect(calls.deleteSession).toHaveBeenCalledWith(
        { sessionId: 'course-1', version: 4 },
        expect.any(Object)
      )
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('returns from editing to preview and can save a different Student for a standalone course', async () => {
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-session.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 245, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 245, 'touch'))
      expect(host.querySelector('.calendar-session-quickview')?.textContent).not.toContain(
        '取消課程'
      )
      await act(async () => host.querySelector<HTMLButtonElement>('.calendar-quick-edit')!.click())
      const selector = host.querySelector<HTMLButtonElement>(
        '.scheduling-dialog .form-select-trigger[aria-label="學生"]'
      )!
      expect(selector.disabled).toBe(false)
      await act(async () => selector.click())
      await act(async () =>
        [...document.querySelectorAll<HTMLButtonElement>('.form-select-menu [role="option"]')]
          .find((option) => option.textContent?.includes('學生乙'))!
          .click()
      )
      await act(async () =>
        host.querySelector<HTMLButtonElement>('.scheduling-form-actions .secondary-button')!.click()
      )
      expect(host.querySelector('.calendar-session-quickview')).not.toBeNull()
      await act(async () => host.querySelector<HTMLButtonElement>('.calendar-quick-edit')!.click())
      expect(
        host.querySelector<HTMLButtonElement>(
          '.scheduling-dialog .form-select-trigger[aria-label="學生"]'
        )?.textContent
      ).toContain('學生甲')
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(
            '.scheduling-dialog .form-select-trigger[aria-label="學生"]'
          )!
          .click()
      )
      await act(async () =>
        [...document.querySelectorAll<HTMLButtonElement>('.form-select-menu [role="option"]')]
          .find((option) => option.textContent?.includes('學生乙'))!
          .click()
      )
      await act(async () =>
        host
          .querySelector<HTMLFormElement>('.scheduling-form')!
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      )
      expect(calls.updateSession).toHaveBeenCalledWith(
        {
          sessionId: 'course-1',
          previousStudentId: 'student-1',
          input: expect.objectContaining({ studentId: 'student-2', version: 4 })
        },
        expect.any(Object)
      )
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('deletes a selected block with Delete but leaves text editing alone', async () => {
    const { host, root } = await mount(true)
    try {
      const block = host.querySelector('.calendar-block.positioned')!
      await act(async () => pointer(block, 'pointerdown', 100, 425, 'touch'))
      await act(async () => pointer(block, 'pointerup', 100, 425, 'touch'))
      const dialog = host.querySelector<HTMLElement>('.scheduling-dialog')!
      const note = dialog.querySelector<HTMLInputElement>('input[maxlength="1000"]')!
      note.focus()
      await act(async () =>
        note.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      expect(calls.deleteBlock).not.toHaveBeenCalled()
      dialog.focus()
      await act(async () =>
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      expect(calls.deleteBlock).not.toHaveBeenCalled()
      expect(host.textContent).toContain('是否確認刪除此封鎖時段？')
      expect(host.querySelector('.scheduling-dialog')).toBeNull()
      expect(host.querySelector('.danger-confirmation')).not.toBeNull()
      await act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('確認刪除'))!
          .click()
      )
      expect(calls.deleteBlock).toHaveBeenCalledWith(
        { blockId: 'block-1', input: { version: 2, scope: 'single' } },
        expect.any(Object)
      )
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('uses the supported cancellation for a recurring scheduled course shortcut', async () => {
    calls.recurring = true
    const { host, root } = await mount(true)
    try {
      const item = host.querySelector('.calendar-session.positioned')!
      await act(async () => pointer(item, 'pointerdown', 100, 245, 'touch'))
      await act(async () => pointer(item, 'pointerup', 100, 245, 'touch'))
      const dialog = host.querySelector<HTMLElement>('.scheduling-dialog')!
      expect(dialog.textContent).toContain('刪除')
      expect(dialog.textContent).not.toContain('取消課程')
      dialog.focus()
      await act(async () =>
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
      )
      expect(calls.transitionSession).not.toHaveBeenCalled()
      expect(host.textContent).toContain('是否確認刪除此課堂？')
      expect(host.querySelector('.scheduling-dialog')).toBeNull()
      expect(host.querySelector('.danger-confirmation')).not.toBeNull()
      await act(async () =>
        [...host.querySelectorAll<HTMLButtonElement>('button')]
          .find((button) => button.textContent?.includes('確認刪除'))!
          .click()
      )
      expect(calls.transitionSession).toHaveBeenCalledWith(
        { sessionId: 'course-1', input: { action: 'cancel', version: 4 } },
        expect.any(Object)
      )
      expect(calls.deleteSession).not.toHaveBeenCalled()
    } finally {
      await act(async () => root.unmount())
    }
  })
})
