// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import type { UseQueryResult } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionTraining } from '../../api'
import { TrainingWorkspace } from './TrainingWorkspace'
import * as startAnchorExperiment from './exercise-drag-start-anchor'

const calls = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('./queries', () => ({
  useTrainingMutations: () => ({ save: { mutateAsync: calls.save } }),
  useExerciseLibrary: () => ({ data: { definitions: [] } })
}))
vi.mock('../calendar/queries', () => ({ useSchedulingMutations: () => ({}) }))
vi.mock('../../local-resilience', async (original) => ({
  ...(await original<typeof import('../../local-resilience')>()),
  CoachLocalStore: class {
    async list() {
      return []
    }
    async put() {}
    async delete() {}
  }
}))

const training = {
  session: {
    id: 'gesture-session',
    studentId: 'student',
    studentName: '測試學生',
    startsAt: '2026-09-22T02:00:00Z',
    endsAt: '2026-09-22T03:00:00Z',
    location: '',
    version: 1,
    status: 'scheduled',
    isLegacy: false
  },
  record: {
    id: 'record',
    version: 1,
    privateNote: '',
    updatedAt: null,
    exercises: ['one', 'two', 'three', 'four', 'five'].map((id) => ({
      id,
      definitionId: id,
      definitionName: id,
      equipment: '徒手',
      bodyParts: [],
      movementType: '系統動作',
      performanceMetric: 'reps',
      sets: []
    }))
  },
  defaultDistanceUnit: 'km',
  defaultWeightUnit: 'kg',
  exerciseSummaries: [],
  allowedActions: { canEditTraining: true, canComplete: false, canReopen: false }
} as unknown as SessionTraining

let root: Root
let host: HTMLDivElement
let frames: Map<number, FrameRequestCallback>
let frameId: number
let frameTime: number
const order = () =>
  [...host.querySelectorAll<HTMLElement>('[data-exercise-id]')].map((el) => el.dataset.exerciseId)
const handle = (id: string) =>
  host.querySelector<HTMLElement>(`[data-exercise-id="${id}"] .exercise-drag-handle`)!
function pointer(
  target: EventTarget,
  type: string,
  y: number,
  pointerType = 'mouse',
  pointerId = 1
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 40,
    clientY: y,
    button: 0
  })
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType }
  })
  target.dispatchEvent(event)
}
async function frame() {
  await act(async () => {
    const batch = [...frames.values()]
    frames.clear()
    frameTime += 16
    batch.forEach((fn) => fn(frameTime))
  })
}
async function start(id: string, y: number, pointerType = 'mouse') {
  await act(async () => pointer(handle(id), 'pointerdown', y, pointerType))
  await act(async () => vi.advanceTimersByTimeAsync(125))
  await frame()
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  frames = new Map()
  frameId = frameTime = 0
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
    frames.set(++frameId, fn)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn()
  })
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    let top = 100,
      height = 322
    if (this.dataset.exerciseId) {
      top += order().indexOf(this.dataset.exerciseId) * 66
      height = 58
    }
    if (this.classList.contains('session-bottom')) {
      top = 760
      height = 40
    }
    if (this.classList.contains('session-topbar')) {
      top = 0
      height = 0
    }
    return {
      x: 0,
      y: top,
      top,
      bottom: top + height,
      left: 0,
      right: 390,
      width: 390,
      height,
      toJSON() {}
    }
  })
  calls.save.mockResolvedValue(training)
  localStorage.clear()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root.render(
      <MemoryRouter>
        <TrainingWorkspace
          session={{ user: { id: 'gesture-coach' } } as Session}
          query={
            { data: training, isLoading: false, isError: false } as UseQueryResult<
              SessionTraining,
              Error
            >
          }
          onBack={() => {}}
          timeZone="Asia/Taipei"
        />
      </MemoryRouter>
    )
  )
})
afterEach(async () => {
  await act(async () => root?.unmount())
  document.body.innerHTML = ''
  localStorage.clear()
  calls.save.mockClear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
  Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
  Reflect.deleteProperty(document.documentElement, 'scrollTop')
})

describe('Training editor pointer lifecycle', () => {
  function scrollGeometry(documentTop = 200, clampOnShrink = false) {
    let scroll = 0
    let lastPadding = 0
    Object.defineProperty(document.documentElement, 'scrollTop', {
      configurable: true,
      get: () => {
        const padding = parseFloat(
          host.querySelector<HTMLElement>('.exercise-stack-shell')?.style.paddingTop || '0'
        )
        if (clampOnShrink && padding < lastPadding)
          scroll = Math.max(0, scroll - lastPadding + padding)
        lastPadding = padding
        return scroll
      },
      set: (value: number) => {
        scroll = Math.max(0, value)
        lastPadding = parseFloat(
          host.querySelector<HTMLElement>('.exercise-stack-shell')?.style.paddingTop || '0'
        )
      }
    })
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
      this: HTMLElement
    ) {
      const shell = host.querySelector<HTMLElement>('.exercise-stack-shell')
      const compact = shell?.classList.contains('is-reordering')
      const padding = parseFloat(shell?.style.paddingTop || '0')
      let top = documentTop - scroll,
        height = compact ? 322 : 1300
      if (this.classList.contains('exercise-stack')) top += padding
      if (this.classList.contains('training-heading')) {
        top -= 100
        height = 78
      }
      if (this.dataset.exerciseId) {
        top += padding + order().indexOf(this.dataset.exerciseId) * (compact ? 66 : 260)
        height = compact ? 58 : 244
      }
      if (this.classList.contains('session-topbar')) {
        top = 0
        height = 120
      }
      if (this.classList.contains('session-bottom')) {
        top = clampOnShrink ? 400 : 700
        height = 68
      }
      return {
        top,
        bottom: top + height,
        x: 0,
        y: top,
        left: 0,
        right: 390,
        width: 390,
        height,
        toJSON() {}
      }
    })
    return {
      get scroll() {
        return scroll
      },
      set scroll(value: number) {
        scroll = value
      }
    }
  }

  it.each([true, false])(
    'keeps the dropped expanded card visible with start anchoring %s',
    async (enabled) => {
      const plan = startAnchorExperiment.startAnchorSpace
      vi.spyOn(startAnchorExperiment, 'startAnchorSpace').mockImplementation((remaining) =>
        plan(remaining, enabled)
      )
      scrollGeometry()
      await start('two', 480)
      await act(async () => pointer(document.body, 'pointermove', 650))
      await frame()
      await act(async () => pointer(window, 'pointerup', 650))
      const card = handle('two').closest<HTMLElement>('[data-exercise-id]')!
      expect(order()[4]).toBe('two')
      expect(card.getBoundingClientRect().top).toBeGreaterThanOrEqual(120)
      expect(card.getBoundingClientRect().top).toBeLessThanOrEqual(642)
      expect(card.getBoundingClientRect().bottom).toBeLessThanOrEqual(700)
      Reflect.deleteProperty(document.documentElement, 'scrollTop')
    }
  )

  it('starts upward scrolling below the sticky header instead of at the screen edge', async () => {
    const geometry = scrollGeometry()
    await start('one', 220)
    geometry.scroll = 150
    await act(async () => pointer(document.body, 'pointermove', 160))
    await frame()
    expect(geometry.scroll).toBeLessThan(150)
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('stops downward scrolling at the last row even if the page has footer padding', async () => {
    const geometry = scrollGeometry(500)
    await start('one', 520)
    geometry.scroll = 122 // last compact row bottom is exactly at the footer's top
    await act(async () => pointer(document.body, 'pointermove', 695))
    await frame()
    expect(geometry.scroll).toBe(122)
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('initially keeps the held second row between its original neighbours', async () => {
    scrollGeometry()
    await start('two', 480)
    const card = handle('two').closest<HTMLElement>('[data-exercise-id]')!
    expect(card.getBoundingClientRect().top).toBe(460)
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    Reflect.deleteProperty(document.documentElement, 'scrollTop')
  })

  it('retires leading space without a reverse jump when shrinking clamps native scroll', async () => {
    const geometry = scrollGeometry(200, true)
    await start('two', 480)
    const shell = host.querySelector<HTMLElement>('.exercise-stack-shell')!
    const leading = parseFloat(shell.style.paddingTop)
    expect(leading).toBeGreaterThan(0)
    geometry.scroll = 200 + leading - 121
    await act(async () => pointer(document.body, 'pointermove', 695))
    await frame()
    expect(parseFloat(shell.style.paddingTop)).toBe(0)
    const firstTop = shell.getBoundingClientRect().top
    expect(firstTop).toBeLessThanOrEqual(121)
    expect(firstTop).toBeGreaterThanOrEqual(121 - 480 * 0.016)
  })

  it('leaves eight pixels between the first row and the sticky header at the upper bound', async () => {
    const geometry = scrollGeometry()
    await start('one', 220)
    geometry.scroll = 84
    await act(async () => pointer(document.body, 'pointermove', 160))
    for (let i = 0; i < 30; i++) await frame()
    expect(
      host.querySelector<HTMLElement>('.exercise-stack-shell')!.getBoundingClientRect().top
    ).toBe(128)
  })

  it.each(['pointerup', 'pointercancel'])(
    'keeps the heading out after it leaves the viewport, until %s',
    async (endEvent) => {
      const geometry = scrollGeometry()
      await start('two', 480)
      const heading = host.querySelector<HTMLElement>('.training-heading')!
      expect(getComputedStyle(heading).visibility).toBe('visible')
      geometry.scroll = 100 // heading bottom is now above the sticky header
      await act(async () => pointer(document.body, 'pointermove', 400))
      await frame()
      expect(getComputedStyle(heading).visibility).toBe('hidden')
      geometry.scroll = 0 // removing initial space compensates scrollTop
      await act(async () => pointer(document.body, 'pointermove', 410))
      await frame()
      expect(getComputedStyle(heading).visibility).toBe('hidden')
      await act(async () => pointer(window, endEvent, 410))
      expect(getComputedStyle(heading).visibility).toBe('visible')
    }
  )

  it.each(['mouse', 'touch'])(
    'keeps following %s movement outside the moved handle',
    async (pointerType) => {
      await start('three', 252, pointerType)
      await act(async () => pointer(handle('three'), 'pointermove', 200, pointerType))
      await frame()
      expect(order()).toEqual(['one', 'three', 'two', 'four', 'five'])
      // A DOM move can release capture. The next event is then hit-tested outside the handle.
      await frame()
      await act(async () => pointer(document.body, 'pointermove', 135, pointerType))
      await frame()
      expect(order()).toEqual(['three', 'one', 'two', 'four', 'five'])
      expect(calls.save).not.toHaveBeenCalled()
      await act(async () => pointer(window, 'pointerup', 135, pointerType))
      await act(async () => vi.advanceTimersByTimeAsync(2100))
      expect(calls.save).toHaveBeenCalledTimes(1)
      expect(
        calls.save.mock.calls[0]![0].payload.exercises.map((e: { id: string }) => e.id)
      ).toEqual(order())
      expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    }
  )

  it('catches up when one pointer event crosses several rows, then rests without a frame loop', async () => {
    await start('one', 120)
    await act(async () => pointer(handle('one'), 'pointermove', 380))
    for (let i = 0; i < 10; i++) await frame()
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    expect(frames.size).toBe(0)
  })

  it('coalesces 100 pointer events into one geometry read and one batched exchange animation', async () => {
    await start('one', 120)
    const geometry = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    geometry.mockClear()
    await act(async () => {
      for (let i = 1; i <= 100; i++) pointer(document.body, 'pointermove', 120 + i * 2.6)
    })
    expect(frames.size).toBe(1)
    expect(geometry).not.toHaveBeenCalled()
    await frame()
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    expect(frames.size).toBe(1)
    await frame()
    expect(geometry).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
    expect(calls.save).not.toHaveBeenCalled()
  })

  it('cancels rather than saving a partly rearranged gesture on pointercancel', async () => {
    await start('one', 120)
    await act(async () => pointer(handle('one'), 'pointermove', 185))
    await frame()
    expect(order()[0]).toBe('two')
    await act(async () => pointer(window, 'pointercancel', 185))
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
  })

  it('includes the final release position even before the pending frame runs', async () => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 185))
    await act(async () => pointer(window, 'pointerup', 380))
    expect(order()).toEqual(['two', 'three', 'four', 'five', 'one'])
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).toHaveBeenCalledTimes(1)
    await frame()
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    expect(frames.size).toBe(0)
  })

  it('reverses within the same gesture and makes no save when back at the original order', async () => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 380))
    await frame()
    expect(order()[4]).toBe('one')
    await act(async () => pointer(document.body, 'pointermove', 120))
    await frame()
    expect(order()[0]).toBe('one')
    await act(async () => pointer(window, 'pointerup', 120))
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
  })

  it.each(['blur', 'Escape'])('restores the draft and stops work after %s', async (reason) => {
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 185))
    await frame()
    await act(async () =>
      window.dispatchEvent(
        reason === 'blur' ? new Event('blur') : new KeyboardEvent('keydown', { key: 'Escape' })
      )
    )
    expect(order()).toEqual(['one', 'two', 'three', 'four', 'five'])
    await act(async () => pointer(window, 'pointerup', 380))
    await frame()
    await act(async () => vi.advanceTimersByTimeAsync(2100))
    expect(calls.save).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
    expect(document.body.classList.contains('is-reordering-exercise')).toBe(false)
  })

  it('ignores a second pointer and cleans up when released before activation', async () => {
    await act(async () => pointer(handle('one'), 'pointerdown', 120))
    await act(async () => pointer(handle('three'), 'pointerdown', 252, 'touch', 2))
    await act(async () => pointer(window, 'pointerup', 120))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
    expect(frames.size).toBe(0)
    await start('one', 120)
    await act(async () => pointer(document.body, 'pointermove', 380, 'touch', 2))
    await frame()
    expect(order()[0]).toBe('one')
    await act(async () => pointer(window, 'pointerup', 380, 'touch', 2))
    expect(host.querySelector('.exercise-drag-overlay')).not.toBeNull()
    await act(async () => pointer(window, 'pointerup', 120))
    expect(host.querySelector('.exercise-drag-overlay')).toBeNull()
  })
})
